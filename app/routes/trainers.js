const express = require('express');
const router = express.Router();
const db = require('../db');
const isAdmin = require('../middleware/isAdmin');
const bcrypt = require('bcrypt');

// Listeleme
router.get('/', isAdmin,  async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM trainers ORDER BY id DESC');
    res.render('trainers', { trainers: rows });
  } catch (err) {
    console.error('Trainer list error:', err.message);
    res.status(500).send('Could not fetch trainers');
  }
});

// Ekleme formu
router.get('/add', isAdmin, (req, res) => {
  res.render('add-trainer');
});

// Eğitmen dashboard 
router.get('/dashboard', async (req, res) => {
  const trainerId = req.session.trainerId;
  if (!trainerId) return res.redirect('/trainer/login');

  try {
    // Gelecekteki session sayısı
    const [sessionCountRows] = await db.query(`
      SELECT COUNT(*) AS count
      FROM sessions
      WHERE trainer_id = ? AND session_date >= NOW()
    `, [trainerId]);

    // Cancelled olmayan booking sayısı
    const [bookingCountRows] = await db.query(`
      SELECT COUNT(*) AS count
      FROM bookings b
      JOIN sessions s ON b.session_id = s.id
      WHERE s.trainer_id = ? AND b.status != 'Cancelled'
    `, [trainerId]);

    // Booking detayları
   const [bookingRows] = await db.query(`
  SELECT b.*, m.full_name AS member_name, s.session_date, s.location
  FROM bookings b
  JOIN sessions s ON b.session_id = s.id
  JOIN members m ON b.member_id = m.id
  WHERE s.trainer_id = ?
  ORDER BY b.booking_id DESC
`, [trainerId]);


    res.render('trainer-dashboard', {
      sessionCount: sessionCountRows[0].count,
      bookingCount: bookingCountRows[0].count,
      bookings: bookingRows
    });
  } catch (err) {
    console.error('Trainer dashboard error:', err);
    res.status(500).send('Dashboard yüklenemedi.');
  }
});


router.get('/bookings', (req, res) => {
  res.redirect('/trainers/dashboard');
});



// GET: Seans ekleme formunu göster
router.get('/sessions/add', (req, res) => {
  if (!req.session.trainerId) return res.redirect('/trainer/login');
  res.render('trainer-add-session');
});

router.get('/signup', (req, res) => {
  res.render('trainer-signup');
});

// POST: Yeni seansı veritabanına kaydet
router.post('/sessions/add', async (req, res) => {
  const trainerId = req.session.trainerId;
  if (!trainerId) return res.redirect('/trainer/login');

  const { session_date, duration_min, location } = req.body;

  try {
    const [conflicts] = await db.query(`
      SELECT *
      FROM sessions
      WHERE location = ?
        AND session_date < DATE_ADD(?, INTERVAL ? MINUTE)
        AND DATE_ADD(session_date, INTERVAL duration_min MINUTE) > ?
    `, [location, session_date, duration_min, session_date]);

    if (conflicts.length > 0) {
      return res.render('trainer-add-session', {
        error: 'Another session already exists at this time and location.'
      });
    }

    await db.query(
      `INSERT INTO sessions (trainer_id, session_date, duration_min, location)
       VALUES (?, ?, ?, ?)`,
      [trainerId, session_date, duration_min, location]
    );

    res.redirect('/trainers/dashboard');
  } catch (err) {
    console.error('Trainer session insert error:', err.message);
    res.status(500).send('Failed to add session.');
  }
});


// GET: Trainer düzenleme formu
router.get('/edit/:id', isAdmin, async (req, res) => {
  const trainerId = req.params.id;
  const [rows] = await db.query('SELECT * FROM trainers WHERE id = ?', [trainerId]);

  if (!rows.length) return res.status(404).send('Trainer not found');
  res.render('edit-trainer', { trainer: rows[0] });
});

// POST: Trainer güncelle
router.post('/edit/:id', isAdmin, async (req, res) => {
  const trainerId = req.params.id;
  const { name, email, specialty, hire_date, salary } = req.body;

  await db.query(
    'UPDATE trainers SET name = ?, email = ?, specialty = ?, hire_date = ?, salary = ? WHERE id = ?',
    [name, email, specialty, hire_date || null, salary || null, trainerId]
  );

  res.redirect('/trainers');
});

// POST: Trainer sil
router.post('/delete/:id', isAdmin, async (req, res) => {
  const trainerId = req.params.id;

  await db.query('DELETE FROM trainers WHERE id = ?', [trainerId]);
  res.redirect('/trainers');
});

router.post('/bookings/cancel/:id', async (req, res) => {
  const bookingId = req.params.id;
  const trainerId = req.session.trainerId;

  try {
    // Eğitmenin bu rezervasyonu iptal etmeye yetkisi var mı?
    const [rows] = await db.query(`
      SELECT b.booking_id
      FROM bookings b
      JOIN sessions s ON b.session_id = s.id
      WHERE b.booking_id = ? AND s.trainer_id = ?
    `, [bookingId, trainerId]);

    if (!rows.length) {
      return res.status(403).send('you have no permission to cancel this booking');
    }

    // Rezervasyonu iptal et (status = 'Cancelled')
    await db.query(`
      UPDATE bookings SET status = 'Cancelled' WHERE booking_id = ?
    `, [bookingId]);

    res.redirect('/trainers/bookings');
  } catch (err) {
    console.error('occur error during cancelling booking', err);
    res.status(500).send(' Booking cancellation failed'); 
  }
});

router.get('/login', (req, res) => {
  res.render('trainer-login', { error: null });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query('SELECT * FROM trainers WHERE email = ?', [email]);
    if (!rows.length) {
      return res.render('trainer-login', { error: 'Trainer not found.' });
    }

    const trainer = rows[0];
    const isMatch = await bcrypt.compare(password, trainer.password);

    if (!isMatch) {
      return res.render('trainer-login', { error: 'Incorrect password.' });
    }
    // Giriş başarılı
    req.session.trainerId = trainer.id;
    req.session.isTrainer = true;
    req.session.userName = trainer.name;

    res.redirect('/trainers/dashboard');
  } catch (err) {
    console.error('Trainer login error:', err);
  res.render('trainer-login', { error: 'wrongpass' }); 
  }
});


router.post('/add', isAdmin, async (req, res) => {
  const { name, email, specialty, hire_date, salary } = req.body;
  const defaultPassword = await bcrypt.hash('changeme', 10);

  try {
    await db.query(
      `INSERT INTO trainers (name, email, specialty, hire_date, salary, password)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, specialty, hire_date, salary, defaultPassword]
    );
    res.redirect('/trainers');
  } catch (err) {
    console.error('Trainer creation error:', err.message);
    res.status(500).send('Failed to add trainer');
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
