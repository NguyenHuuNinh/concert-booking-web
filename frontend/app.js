const state = {
  events: [],
  user: null,
  activeEvent: null,
};

const currency = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupAuthForms();
  setupModal();
  await loadCurrentUser();

  const page = document.body.dataset.page;

  if (page === 'home') {
    await loadEvents();
    renderEventsPreview();
    await renderBookings();
  }

  if (page === 'events') {
    await loadEvents();
    setupFilters();
    renderEventsList();
  }
});

function setupNavigation() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('is-open'));
  }

  document.querySelector('[data-logout]')?.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login.html';
  });
}

async function loadCurrentUser() {
  try {
    const response = await fetch('/api/me');
    const data = await response.json();
    state.user = data.user;
    document.querySelectorAll('[data-user-name]').forEach((node) => {
      node.textContent = data.user ? `Hi, ${data.user.fullName}` : '';
    });
  } catch (error) {
    state.user = null;
  }
}

function setupAuthForms() {
  const loginForm = document.querySelector('[data-login-form]');
  const registerForm = document.querySelector('[data-register-form]');
  const authMessage = document.querySelector('[data-auth-message]');

  const params = new URLSearchParams(window.location.search);
  if (params.get('error') === 'login_required' && authMessage) {
    showMessage(authMessage, 'Please login before booking tickets.');
  }

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await submitAuth('/api/login', loginForm, authMessage);
  });

  registerForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await submitAuth('/api/register', registerForm, authMessage);
  });
}

async function submitAuth(url, form, messageNode) {
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Please wait...';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const data = await response.json();

    if (!response.ok) {
      showMessage(messageNode, data.message || 'Something went wrong.');
      return;
    }

    window.location.href = data.redirect || '/index.html';
  } catch (error) {
    showMessage(messageNode, 'Cannot connect to server. Please try again.');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = url.includes('register') ? 'Register Account' : 'Login';
  }
}

function showMessage(node, message) {
  if (!node) return;
  node.hidden = false;
  node.textContent = message;
}

async function loadEvents() {
  const response = await fetch('/api/events');
  if (response.status === 401) {
    window.location.href = '/login.html?error=login_required';
    return;
  }
  const data = await response.json();
  state.events = data.events || [];
}

function renderEventsPreview() {
  const target = document.querySelector('[data-events-preview]');
  if (!target) return;
  target.innerHTML = state.events.slice(0, 3).map(renderEventCard).join('');
  bindEventButtons(target);
}

function renderEventsList() {
  const target = document.querySelector('[data-events-list]');
  if (!target) return;

  const search = document.querySelector('[data-search]')?.value.trim().toLowerCase() || '';
  const city = document.querySelector('[data-city-filter]')?.value || '';
  const filtered = state.events.filter((event) => {
    const text = `${event.title} ${event.artist} ${event.venue} ${event.city}`.toLowerCase();
    return (!search || text.includes(search)) && (!city || event.city === city);
  });

  target.innerHTML = filtered.length
    ? filtered.map(renderEventCard).join('')
    : '<div class="empty-state">No events match your search.</div>';
  bindEventButtons(target);
}

function renderEventCard(event) {
  const minPrice = Math.min(...event.tiers.map((tier) => tier.price));
  const date = formatDate(event.date);

  return `
    <article class="concert-card">
      <img src="${event.image}" alt="${event.title}">
      <div class="concert-info">
        <span class="city-pill">${event.city}</span>
        <h3>${event.title}</h3>
        <p>${event.artist}</p>
        <p>${event.venue}</p>
        <p>${date} · ${event.time}</p>
        <div class="price">From ${currency.format(minPrice)}</div>
        <div class="button-group">
          <button class="btn-buy" type="button" data-book="${event.id}">Buy Ticket</button>
          <button class="btn-detail" type="button" data-detail="${event.id}">Details</button>
        </div>
      </div>
    </article>
  `;
}

function bindEventButtons(container) {
  container.querySelectorAll('[data-detail]').forEach((button) => {
    button.addEventListener('click', () => openDetail(button.dataset.detail));
  });

  container.querySelectorAll('[data-book]').forEach((button) => {
    button.addEventListener('click', () => openBooking(button.dataset.book));
  });
}

function setupFilters() {
  const cityFilter = document.querySelector('[data-city-filter]');
  if (cityFilter) {
    const cities = [...new Set(state.events.map((event) => event.city))];
    cityFilter.innerHTML += cities.map((city) => `<option value="${city}">${city}</option>`).join('');
    cityFilter.addEventListener('change', renderEventsList);
  }

  document.querySelector('[data-search]')?.addEventListener('input', renderEventsList);
}

function setupModal() {
  document.querySelector('[data-close-modal]')?.addEventListener('click', closeModal);
  document.querySelector('[data-modal]')?.addEventListener('click', (event) => {
    if (event.target.matches('[data-modal]')) closeModal();
  });
}

function openDetail(eventId) {
  const event = state.events.find((item) => item.id === eventId);
  if (!event) return;

  openModal(`
    <div class="event-detail">
      <img src="${event.image}" alt="${event.title}">
      <div>
        <p class="eyebrow">${event.city} · ${formatDate(event.date)}</p>
        <h2 id="modal-title">${event.title}</h2>
        <p>${event.description}</p>
        <div class="tier-list">
          ${event.tiers.map((tier) => `
            <div class="tier-row">
              <span>${tier.name}</span>
              <strong>${currency.format(tier.price)}</strong>
              <small>${tier.available} left</small>
            </div>
          `).join('')}
        </div>
        <button class="btn-submit" type="button" data-book="${event.id}">Book this event</button>
      </div>
    </div>
  `);

  document.querySelector('[data-modal-content] [data-book]')?.addEventListener('click', () => openBooking(event.id));
}

function openBooking(eventId) {
  const event = state.events.find((item) => item.id === eventId);
  if (!event) return;
  state.activeEvent = event;

  openModal(`
    <form class="booking-form" data-booking-form>
      <p class="eyebrow">${event.city} · ${formatDate(event.date)}</p>
      <h2 id="modal-title">Book ${event.title}</h2>
      <div class="form-group">
        <label for="tierId">Ticket Tier</label>
        <select id="tierId" name="tierId" required>
          ${event.tiers.map((tier) => `
            <option value="${tier.id}">${tier.name} - ${currency.format(tier.price)} (${tier.available} left)</option>
          `).join('')}
        </select>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label for="quantity">Quantity</label>
          <input id="quantity" name="quantity" type="number" min="1" max="10" value="1" required>
        </div>
        <div class="form-group">
          <label for="phone">Phone</label>
          <input id="phone" name="phone" type="tel" placeholder="0901234567" required>
        </div>
      </div>
      <div class="form-group">
        <label for="buyerName">Buyer Name</label>
        <input id="buyerName" name="buyerName" value="${state.user?.fullName || ''}" required>
      </div>
      <div class="alert" data-booking-message hidden></div>
      <button class="btn-submit" type="submit">Confirm Booking</button>
    </form>
  `);

  document.querySelector('[data-booking-form]')?.addEventListener('submit', submitBooking);
}

async function submitBooking(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const messageNode = form.querySelector('[data-booking-message]');
  const payload = {
    eventId: state.activeEvent.id,
    ...Object.fromEntries(new FormData(form)),
  };

  const response = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (!response.ok) {
    showMessage(messageNode, data.message || 'Could not create booking.');
    return;
  }

  await loadEvents();
  closeModal();
  renderEventsList();
  renderEventsPreview();
  await renderBookings();
  openModal(`
    <div class="success-state">
      <p class="eyebrow">Booking confirmed</p>
      <h2 id="modal-title">${data.booking.eventTitle}</h2>
      <p>Booking code <strong>${data.booking.id}</strong> has been created successfully.</p>
      <p>Total: <strong>${currency.format(data.booking.total)}</strong></p>
      <button class="btn-submit" type="button" data-close-success>Done</button>
    </div>
  `);
  document.querySelector('[data-close-success]')?.addEventListener('click', closeModal);
}

async function renderBookings() {
  const target = document.querySelector('[data-booking-list]');
  if (!target) return;

  const response = await fetch('/api/bookings');
  if (!response.ok) {
    target.innerHTML = '<div class="empty-state">Login to view your bookings.</div>';
    return;
  }

  const data = await response.json();
  target.innerHTML = data.bookings.length
    ? data.bookings.map((booking) => `
      <article class="booking-card">
        <div>
          <span class="city-pill">${booking.status}</span>
          <h3>${booking.eventTitle}</h3>
          <p>${booking.tierName} · ${booking.quantity} ticket(s)</p>
          <p>${formatDate(booking.date)} · ${booking.time} · ${booking.venue}</p>
        </div>
        <strong>${currency.format(booking.total)}</strong>
      </article>
    `).join('')
    : '<div class="empty-state">No bookings yet. Your confirmed tickets will appear here.</div>';
}

function openModal(content) {
  const modal = document.querySelector('[data-modal]');
  const target = document.querySelector('[data-modal-content]');
  if (!modal || !target) return;
  target.innerHTML = content;
  modal.hidden = false;
  document.body.classList.add('modal-open');
}

function closeModal() {
  const modal = document.querySelector('[data-modal]');
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove('modal-open');
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}
