const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'music_ticket_secret_key',
    resave: false,
    saveUninitialized: false
}));


app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'style.css'));
});

app.get('/login.html', (req, res) => {
    if (req.session.isLoggedIn) {
        return res.redirect('/index.html');
    }
    res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

app.get('/register.html', (req, res) => {
    if (req.session.isLoggedIn) {
        return res.redirect('/index.html');
    }
    res.sendFile(path.join(__dirname, 'frontend', 'register.html'));
});


app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (email === "admin@gmail.com" && password === "123456") {
        req.session.isLoggedIn = true;
        req.session.userEmail = email;
        res.redirect('/index.html');
    } else {
        res.redirect('/login.html?error=invalid');
    }
});


app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login.html');
});


const requireAuth = (req, res, next) => {
    if (req.session.isLoggedIn) {
        next(); 
    } else {
        res.redirect('/login.html?error=login_required'); 
    }
};


app.use(requireAuth);

app.get('/', (req, res) => {
    res.redirect('/index.html');
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.get('/events.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'events.html'));
});


app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại địa chỉ: http://localhost:${PORT}`);
});