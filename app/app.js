const express = require('express');
const path = require('path');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');

const dashboardRouter = require('./routes/dashboard');
const membersRouter = require('./routes/members');
const authRouter = require('./routes/auth'); // bu routes klasöründen gelmeli
const trainersRouter = require('./routes/trainers');
const sessionsRouter = require('./routes/sessions');
const bookingsRouter = require('./routes/bookings');

const app = express();

// Session middleware (OLMAZSA req.session undefined olur)
app.use(session({
  secret: 'gymprojectsecret',
  resave: false,
  saveUninitialized: true
}));

// res.locals'a session'dan isAdmin'i ekleyelim (şablonlarda kullanabilmek için)
app.use((req, res, next) => {
  res.locals.session = req.session;
  res.locals.isAdmin = !!req.session.isAdmin;
  res.locals.userId = req.session.userId || null;
  res.locals.userName = req.session.userName || null;
  next();
});

// Layout ve EJS ayarları
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Body parser ve static klasör
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routerlar
app.use('/', dashboardRouter); // ana sayfa
app.use('/trainers', trainersRouter); // antrenörler
app.use('/', authRouter); // login/logout routes
app.use('/members', membersRouter); // protected routes
app.use('/sessions', sessionsRouter); // seanslar
app.use('/bookings', bookingsRouter); // rezervasyonlar
// Ana yönlendirme
app.get('/', (req, res) => {
  res.redirect('/sessions');
});

// Server
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
