const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const users = [
  {
    id: 1,
    fullName: 'Admin User',
    email: 'admin@gmail.com',
    password: '123456',
  },
];

const events = [
  {
    id: 'sontung-2026',
    title: 'Son Tung M-TP Live Concert',
    artist: 'Son Tung M-TP',
    venue: 'My Dinh National Stadium',
    city: 'Ha Noi',
    date: '2026-10-20',
    time: '19:30',
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80',
    description: 'A high-energy stadium show with LED stages, live band arrangements, and fan-favorite hits.',
    tiers: [
      { id: 'standing', name: 'Standing Zone', price: 1500000, available: 120 },
      { id: 'vip', name: 'VIP Seated', price: 2800000, available: 40 },
      { id: 'platinum', name: 'Platinum Lounge', price: 4500000, available: 18 },
    ],
  },
  {
    id: 'hoang-dung-2026',
    title: 'Hoang Dung Acoustic Night',
    artist: 'Hoang Dung',
    venue: 'Ho Chi Minh City Opera House',
    city: 'Ho Chi Minh City',
    date: '2026-11-05',
    time: '20:00',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
    description: 'An intimate acoustic concert for listeners who love warm vocals and carefully arranged ballads.',
    tiers: [
      { id: 'early', name: 'Early Bird', price: 850000, available: 80 },
      { id: 'standard', name: 'Standard Seat', price: 1150000, available: 100 },
      { id: 'premium', name: 'Premium Seat', price: 1700000, available: 35 },
    ],
  },
  {
    id: 'sayhi-2026',
    title: 'Anh Trai Say Hi Festival',
    artist: 'Various Artists',
    venue: 'Nguyen Hue Walking Street',
    city: 'Ho Chi Minh City',
    date: '2026-12-12',
    time: '18:00',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
    description: 'A festival-style concert with multiple performers, outdoor stages, food areas, and fan zones.',
    tiers: [
      { id: 'free-standing', name: 'Free Standing', price: 300000, available: 250 },
      { id: 'fan-zone', name: 'Fan Zone', price: 750000, available: 90 },
      { id: 'meetup', name: 'Meet-up Package', price: 1900000, available: 24 },
    ],
  },
  {
    id: 'indie-wave-2027',
    title: 'Indie Wave Weekend',
    artist: 'Indie Collective',
    venue: 'Da Nang Beach Stage',
    city: 'Da Nang',
    date: '2027-01-17',
    time: '17:30',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80',
    description: 'A seaside weekend show featuring indie pop, alternative bands, and sunset DJ sessions.',
    tiers: [
      { id: 'general', name: 'General Admission', price: 650000, available: 180 },
      { id: 'front', name: 'Front Stage', price: 1250000, available: 65 },
      { id: 'weekend', name: 'Weekend Pass', price: 2100000, available: 55 },
    ],
  },
];

const bookings = [];

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: 'music_ticket_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
    },
  }),
);

app.use(express.static(path.join(__dirname, 'frontend')));

function publicUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
  };
}

function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
    return;
  }

  if (req.path.startsWith('/api/')) {
    res.status(401).json({ message: 'Please login before continuing.' });
    return;
  }

  res.redirect('/login.html?error=login_required');
}

function getCurrentUser(req) {
  return users.find((user) => user.id === req.session.userId);
}

function formatBooking(booking) {
  const event = events.find((item) => item.id === booking.eventId);
  const tier = event?.tiers.find((item) => item.id === booking.tierId);

  return {
    ...booking,
    eventTitle: event?.title,
    venue: event?.venue,
    city: event?.city,
    date: event?.date,
    time: event?.time,
    tierName: tier?.name,
  };
}

app.get('/', (req, res) => {
  res.redirect(req.session.userId ? '/index.html' : '/login.html');
});

app.get('/login.html', (req, res) => {
  if (req.session.userId) {
    res.redirect('/index.html');
    return;
  }
  res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

app.get('/register.html', (req, res) => {
  if (req.session.userId) {
    res.redirect('/index.html');
    return;
  }
  res.sendFile(path.join(__dirname, 'frontend', 'register.html'));
});

app.post('/api/register', (req, res) => {
  const { fullName, email, password, confirmPassword } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!fullName || !normalizedEmail || !password || password.length < 6) {
    res.status(400).json({ message: 'Please enter all fields and use a password of at least 6 characters.' });
    return;
  }

  if (password !== confirmPassword) {
    res.status(400).json({ message: 'Password confirmation does not match.' });
    return;
  }

  if (users.some((user) => user.email === normalizedEmail)) {
    res.status(409).json({ message: 'This email is already registered.' });
    return;
  }

  const user = {
    id: users.length + 1,
    fullName: String(fullName).trim(),
    email: normalizedEmail,
    password,
  };

  users.push(user);
  req.session.userId = user.id;
  res.status(201).json({ user: publicUser(user), redirect: '/index.html' });
});

app.post('/api/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const { password } = req.body;
  const user = users.find((item) => item.email === email && item.password === password);

  if (!user) {
    res.status(401).json({ message: 'Invalid email or password.' });
    return;
  }

  req.session.userId = user.id;
  res.json({ user: publicUser(user), redirect: '/index.html' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ redirect: '/login.html' });
  });
});

app.get('/api/me', (req, res) => {
  const user = getCurrentUser(req);
  res.json({ user: user ? publicUser(user) : null });
});

app.get('/api/events', requireAuth, (req, res) => {
  res.json({ events });
});

app.get('/api/events/:id', requireAuth, (req, res) => {
  const event = events.find((item) => item.id === req.params.id);
  if (!event) {
    res.status(404).json({ message: 'Event not found.' });
    return;
  }
  res.json({ event });
});

app.get('/api/bookings', requireAuth, (req, res) => {
  res.json({
    bookings: bookings
      .filter((booking) => booking.userId === req.session.userId)
      .map(formatBooking)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  });
});

app.post('/api/bookings', requireAuth, (req, res) => {
  const { eventId, tierId, quantity, buyerName, phone } = req.body;
  const ticketQuantity = Number(quantity);
  const event = events.find((item) => item.id === eventId);
  const tier = event?.tiers.find((item) => item.id === tierId);

  if (!event || !tier) {
    res.status(400).json({ message: 'Please choose a valid event and ticket tier.' });
    return;
  }

  if (!Number.isInteger(ticketQuantity) || ticketQuantity < 1 || ticketQuantity > 10) {
    res.status(400).json({ message: 'Ticket quantity must be between 1 and 10.' });
    return;
  }

  if (ticketQuantity > tier.available) {
    res.status(409).json({ message: 'Not enough tickets are available for this tier.' });
    return;
  }

  if (!buyerName || !phone) {
    res.status(400).json({ message: 'Please enter buyer name and phone number.' });
    return;
  }

  tier.available -= ticketQuantity;

  const booking = {
    id: `BK${Date.now()}`,
    userId: req.session.userId,
    eventId,
    tierId,
    quantity: ticketQuantity,
    buyerName: String(buyerName).trim(),
    phone: String(phone).trim(),
    total: ticketQuantity * tier.price,
    status: 'Confirmed',
    createdAt: new Date().toISOString(),
  };

  bookings.push(booking);
  res.status(201).json({ booking: formatBooking(booking) });
});

app.use(requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
