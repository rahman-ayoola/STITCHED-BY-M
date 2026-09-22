const API_URL = 'http://localhost:3000/api';

// State
let state = {
    selectedDate: null,
    selectedTime: null,
    selectedServices: [],
    currentMonth: new Date(),
    services: [],
    allTimeSlots: []
};

// Load services from API
async function loadServices() {
    try {
        const response = await fetch(`${API_URL}/services`);
        if (!response.ok) throw new Error('Failed to load services');

        state.services = await response.json();
        renderServices();
    } catch (error) {
        showError('Failed to load services. Make sure the backend API is running on http://localhost:3000');
    }
}

// Render services grouped by category
function renderServices() {
    const container = document.getElementById('services-container');
    container.innerHTML = '';

    const grouped = {};
    state.services.forEach(service => {
        if (!grouped[service.category]) {
            grouped[service.category] = [];
        }
        grouped[service.category].push(service);
    });

    Object.entries(grouped).forEach(([category, services]) => {
        const group = document.createElement('div');
        group.className = 'service-group';

        const title = document.createElement('h3');
        title.textContent = category === 'main' ? 'Main services' : 'Add-ons';
        group.appendChild(title);

        services.forEach(service => {
            const item = document.createElement('div');
            item.className = 'service-item';

            const inputType = category === 'main' ? 'radio' : 'checkbox';
            const input = document.createElement('input');
            input.type = inputType;
            input.id = `service-${service.id}`;
            input.name = category === 'main' ? 'service' : 'addons';
            input.value = service.id;
            input.dataset.name = service.name;
            input.dataset.price = service.price;
            input.dataset.duration = service.duration;
            input.addEventListener('change', updateBookingSummary);

            const label = document.createElement('label');
            label.htmlFor = input.id;

            const name = document.createElement('span');
            name.className = 'service-name';
            name.textContent = service.name;
            label.appendChild(name);

            if (service.description) {
                const desc = document.createElement('span');
                desc.className = 'service-details';
                desc.textContent = service.description;
                label.appendChild(desc);
            }

            const price = document.createElement('span');
            price.className = 'service-price';
            const priceText = service.price > 0 ? `@ £${service.price.toFixed(2)}` :
                service.price < 0 ? `- £${Math.abs(service.price).toFixed(2)}` : 'Free';
            price.textContent = priceText;
            label.appendChild(price);

            item.appendChild(input);
            item.appendChild(label);
            group.appendChild(item);
        });

        container.appendChild(group);
    });
}

// Build calendar
function buildCalendar() {
    const calendar = document.getElementById('calendar');
    calendar.innerHTML = '';

    const year = state.currentMonth.getFullYear();
    const month = state.currentMonth.getMonth();

    // Day headers
    const dayHeaders = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'day-header';
        header.textContent = day;
        calendar.appendChild(header);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < adjustedFirstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendar.appendChild(emptyDay);
    }

    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = day;

        const dateObj = new Date(year, month, day);
        const dateStr = dateObj.toISOString().split('T')[0];

        if (dateObj.toDateString() === today.toDateString()) {
            dayEl.classList.add('today');
        }

        if (dateObj < today) {
            dayEl.classList.add('empty');
            dayEl.style.opacity = '0.3';
        } else {
            dayEl.addEventListener('click', () => selectDate(dateStr, dayEl));
        }

        if (state.selectedDate === dateStr) {
            dayEl.classList.add('selected');
        }

        calendar.appendChild(dayEl);
    }

    document.getElementById('month-display').textContent =
        state.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function selectDate(dateStr, element) {
    document.querySelectorAll('.calendar-day.selected').forEach(el => {
        el.classList.remove('selected');
    });

    state.selectedDate = dateStr;
    state.selectedTime = null;
    element.classList.add('selected');

    const date = new Date(dateStr + 'T00:00:00');
    const dateDisplay = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    document.getElementById('selected-date-text').textContent = dateDisplay;

    loadTimeSlots(dateStr);
    updateBookingSummary();
}

// Load available time slots from API
async function loadTimeSlots(date) {
    try {
        const response = await fetch(`${API_URL}/slots/${date}`);
        if (!response.ok) throw new Error('Failed to load slots');

        state.allTimeSlots = await response.json();
        renderTimeSlots();
    } catch (error) {
        showError('Failed to load available time slots');
    }
}

function renderTimeSlots() {
    const slotsContainer = document.getElementById('time-slots');
    slotsContainer.innerHTML = '';

    state.allTimeSlots.forEach(slot => {
        const slotEl = document.createElement('div');
        slotEl.className = 'time-slot';
        slotEl.textContent = slot.time;

        if (!slot.available) {
            slotEl.classList.add('disabled');
        } else {
            slotEl.addEventListener('click', () => selectTime(slot.time, slotEl));
        }

        if (state.selectedTime === slot.time) {
            slotEl.classList.add('selected');
        }

        slotsContainer.appendChild(slotEl);
    });
}

function selectTime(time, element) {
    document.querySelectorAll('.time-slot.selected').forEach(el => {
        el.classList.remove('selected');
    });

    state.selectedTime = time;
    element.classList.add('selected');
    updateBookingSummary();
}

function updateBookingSummary() {
    const summary = document.getElementById('summary-items');
    summary.innerHTML = '';

    state.selectedServices = [];
    let totalPrice = 0;

    // Main service
    const mainService = document.querySelector('input[name="service"]:checked');
    if (mainService) {
        const service = state.services.find(s => s.id == mainService.value);
        state.selectedServices.push({
            name: mainService.dataset.name,
            price: parseFloat(mainService.dataset.price),
            service
        });
        totalPrice += parseFloat(mainService.dataset.price);
    }

    // Add-ons
    document.querySelectorAll('input[name="addons"]:checked').forEach(checkbox => {
        state.selectedServices.push({
            name: checkbox.dataset.name,
            price: parseFloat(checkbox.dataset.price),
            id: checkbox.value
        });
        totalPrice += parseFloat(checkbox.dataset.price);
    });

    // Render summary
    state.selectedServices.forEach(service => {
        const item = document.createElement('div');
        item.className = 'summary-item';
        const priceDisplay = service.price === 0 ? 'Free' : `£${Math.abs(service.price).toFixed(2)}`;
        item.innerHTML = `
                    <span>${service.name}</span>
                    <span>${priceDisplay}</span>
                `;
        summary.appendChild(item);
    });

    if (state.selectedDate && state.selectedTime) {
        const item = document.createElement('div');
        item.className = 'summary-item';
        const date = new Date(state.selectedDate + 'T00:00:00');
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        item.innerHTML = `
                    <span>${dateStr} at ${state.selectedTime}</span>
                    <span>Free</span>
                `;
        summary.appendChild(item);
    }

    document.getElementById('total-price').textContent = `£${totalPrice.toFixed(2)}`;

    const isValid = state.selectedDate && state.selectedTime && state.selectedServices.length > 0;
    document.getElementById('book-btn').disabled = !isValid;
}

// Submit booking
document.getElementById('customer-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('customer-name').value;
    const email = document.getElementById('customer-email').value;
    const phone = document.getElementById('customer-phone').value || null;

    const btn = document.getElementById('book-btn');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date: state.selectedDate,
                time: state.selectedTime,
                customer_name: name,
                customer_email: email,
                customer_phone: phone,
                services: state.selectedServices,
                total_price: parseFloat(document.getElementById('total-price').textContent.slice(1))
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to book appointment');
        }

        const booking = await response.json();
        showSuccess(`Appointment booked! Confirmation sent to ${email}`);

        // Reset form
        document.getElementById('customer-form').reset();
        state.selectedDate = null;
        state.selectedTime = null;
        state.selectedServices = [];
        document.querySelectorAll('input[name="service"], input[name="addons"]').forEach(el => el.checked = false);
        buildCalendar();
        updateBookingSummary();
    } catch (error) {
        showError(error.message);
    } finally {
        btn.classList.remove('loading');
    }
});

// UI Helpers
function showError(message) {
    const container = document.getElementById('error-message');
    container.innerHTML = `<div class="error">${message}</div>`;
    setTimeout(() => container.innerHTML = '', 5000);
}

function showSuccess(message) {
    const container = document.getElementById('success-message');
    container.innerHTML = `<div class="success">${message}</div>`;
    setTimeout(() => container.innerHTML = '', 5000);
}

// Calendar navigation
document.getElementById('prev-month').addEventListener('click', () => {
    state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
    buildCalendar();
});

document.getElementById('next-month').addEventListener('click', () => {
    state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
    buildCalendar();
});

// Initialize
(async () => {
    await loadServices();
    buildCalendar();
})();

const carousel = document.querySelector(".depth-carousel");
const stage = carousel.querySelector(".depth-carousel__stage");
const cards = [...carousel.querySelectorAll(".depth-carousel__card")];

const prevButton = carousel.querySelector(".depth-carousel__arrow--prev");
const nextButton = carousel.querySelector(".depth-carousel__arrow--next");
const dotsContainer = carousel.querySelector(".depth-carousel__dots");

const settings = {
    depth: 220,
    spread: 125,
    tilt: 20,
    perspective: 1400,
    visibleCards: 4,
    falloff: 0.2,
    blur: 6,
    duration: 700,
    cardWidth: 250,
    cardHeight: 400,
    radius: 18,
    tint: "#05060a",
};

let position = 0;
let active = 0;
let animationFrame;
let isDragging = false;
let startX = 0;
let startPosition = 0;

carousel.style.setProperty(
    "--dc-perspective",
    `${settings.perspective}px`
);


cards.forEach((_, index) => {
    const dot = document.createElement("button");

    dot.className = "depth-carousel__dot";

    dot.setAttribute("aria-label", `Go to slide ${index + 1}`);

    dot.addEventListener("click", () => {
        goTo(index);
    });

    dotsContainer.appendChild(dot);
});

const dots = [...dotsContainer.children];


function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function normalizePosition(value) {
    const count = cards.length;

    return ((value % count) + count) % count;
}


function layout(pos) {

    const count = cards.length;

    const carouselWidth = carousel.clientWidth;

    const neededWidth =
        settings.cardWidth +
        Math.abs(settings.spread) * 2 +
        120;

    const scale = clamp(
        carouselWidth / neededWidth,
        0.4,
        1
    );

    cards.forEach((card, index) => {

        let d = index - pos;

        // Loop
        if (count > 1) {

            d = ((d % count) + count) % count;

            if (d > count / 2) {
                d -= count;
            }
        }

        const back = Math.max(0, d);
        const distance = Math.abs(d);

        const shown =
            distance <= settings.visibleCards + 0.5;

        const tz =
            -settings.depth * d;

        const tx =
            settings.spread * d;

        const rotation =
            settings.tilt * clamp(d, 0, 1);

        let opacity =
            d < 0
                ? Math.max(0, 1 + d)
                : 1;

        if (!shown) {
            opacity = 0;
        }

        const brightness =
            Math.max(
                0.15,
                1 - back * settings.falloff
            );

        const blur =
            settings.blur > 0
                ? Math.min(
                    settings.blur,
                    (back / Math.max(1, settings.visibleCards))
                    * settings.blur
                )
                : 0;

        const zIndex =
            Math.round(2000 - d * 20);

        card.style.width =
            `${settings.cardWidth}px`;

        card.style.height =
            `${settings.cardHeight}px`;

        card.style.borderRadius =
            `${settings.radius}px`;

        card.style.transform = `
            translate(-50%, -50%)
            scale(${scale})
            translateX(${tx}px)
            translateZ(${tz}px)
            rotateY(${rotation}deg)
        `;

        card.style.opacity = opacity;

        card.style.filter = `
            brightness(${brightness})
            blur(${blur}px)
        `;

        card.style.zIndex = zIndex;

        card.style.pointerEvents =
            shown && opacity > 0.05
                ? "auto"
                : "none";

        const tint =
            card.querySelector(".depth-carousel__tint");

        if (tint) {
            tint.style.background = settings.tint;

            tint.style.opacity =
                clamp(
                    back * settings.falloff * 1.25,
                    0,
                    0.86
                );
        }
    });

    updateDots();
}


function updateDots() {

    dots.forEach((dot, index) => {

        dot.classList.toggle(
            "is-active",
            index === active
        );
    });
}

function goTo(index) {

    const count = cards.length;

    index = normalizePosition(index);

    let target = index;

    let delta =
        index - position;

    if (delta > count / 2) {
        delta -= count;
    }

    if (delta < -count / 2) {
        delta += count;
    }

    target = position + delta;

    const start = position;

    const duration = settings.duration;

    const startTime = performance.now();

    cancelAnimationFrame(animationFrame);

    function animate(time) {

        const progress =
            Math.min(
                (time - startTime) / duration,
                1
            );

        // ease-out
        const eased =
            1 - Math.pow(1 - progress, 3);

        position =
            start +
            (target - start) * eased;

        layout(position);

        if (progress < 1) {

            animationFrame =
                requestAnimationFrame(animate);

        } else {

            position =
                normalizePosition(target);

            active = index;

            layout(position);
        }
    }

    animationFrame =
        requestAnimationFrame(animate);
}

prevButton.addEventListener("click", () => {
    goTo(active - 1);
});

nextButton.addEventListener("click", () => {
    goTo(active + 1);
});


carousel.addEventListener("keydown", event => {

    if (event.key === "ArrowLeft") {

        event.preventDefault();

        goTo(active - 1);
    }

    if (event.key === "ArrowRight") {

        event.preventDefault();

        goTo(active + 1);
    }
});

carousel.addEventListener("pointerdown", event => {

    isDragging = true;

    startX = event.clientX;
    startPosition = position;

    carousel.setPointerCapture(event.pointerId);
});


carousel.addEventListener("pointermove", event => {

    if (!isDragging) return;

    const dx =
        event.clientX - startX;

    const step =
        Math.max(
            settings.cardWidth * 0.55,
            40
        );

    position =
        startPosition -
        dx / step;

    layout(position);
});


carousel.addEventListener("pointerup", endDrag);
carousel.addEventListener("pointercancel", endDrag);

function endDrag() {

    if (!isDragging) return;

    isDragging = false;

    goTo(Math.round(position));
}

carousel.addEventListener(
    "wheel",
    event => {

        event.preventDefault();

        const delta =
            Math.abs(event.deltaX) >
            Math.abs(event.deltaY)
                ? event.deltaX
                : event.deltaY;

        if (delta > 0) {
            goTo(active + 1);
        } else {
            goTo(active - 1);
        }
    },
    { passive: false }
);


if (settings.autoplay) {

    setInterval(() => {

        if (!isDragging) {
            goTo(active + 1);
        }

    }, settings.autoplayDelay);
}
ventListener(
    "resize",
    () => layout(position)
);

layout(0);