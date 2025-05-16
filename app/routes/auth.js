const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../db');

// GET: Kayıt formu
router.get('/signup', (req, res) => {
  res.render('signup', { error: null });
});

// SIGNUP
router.post('/signup', async (req, res) => {
  const { full_name, email, password } = req.body;

  try {
    const [existing] = await db.query('SELECT id FROM members WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.render('signup', { error: 'Email already registered.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO members (full_name, email, password, join_date) VALUES (?, ?, ?, CURDATE())',
      [full_name, email, hashed]
    );

    // ✅ OTO LOGIN
    req.session.userId = result.insertId;
    req.session.userName = full_name;
    req.session.isAdmin = false;

    res.redirect('/sessions');
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).send('Signup failed');
  }
});



// Hardcoded admin credentials (gelişmiş versiyonda DB'den gelir)
const ADMIN = {
  username: 'admin',
  password: '1234'
};

// GET /login → Giriş formu
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await db.query('SELECT * FROM members WHERE email = ?', [username]);
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.render('login', { error: 'Invalid email or password' });
    }

    req.session.userId = user.id;
    req.session.userName = user.full_name;
    req.session.isAdmin = false; // admin ayrı sistemde tutuluyor

    res.redirect('/bookings/mybookings');
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).send('Login failed');
  }
});

// GET /login/admin → Admin giriş formu
router.get('/admin-login', (req, res) => {
  res.render('admin-login', { error: null });
});

router.post('/admin-login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === '1234') {
    req.session.isAdmin = true;
    res.redirect('/dashboard');
  } else {
    res.render('admin-login', { error: 'Invalid admin credentials' });
  }
});

router.get('/trainer/login', (req, res) => {
  res.render('trainer-login', {
    query: req.query
  });
});


router.post('/trainer/login', async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await db.query('SELECT * FROM trainers WHERE email = ?', [email]);
  if (!rows.length) return res.redirect('/trainers/login?error=noaccount');

  const trainer = rows[0];

  const match = await bcrypt.compare(password, trainer.password); // ✅ doğru yöntem

  if (!match) {
    return res.redirect('/trainers/login?error=wrongpass');
  }

  // Giriş başarılı
  req.session.trainerId = trainer.id;
  req.session.isTrainer = true;
  res.redirect('/trainers/dashboard');
});




// GET /logout → Oturumu sonlandır
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    res.redirect('/login');
  });
});

module.exports = router;
