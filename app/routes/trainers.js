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

// Eğitmen dashboard — sadece giriş yapmış eğitmenler görür
router.get('/dashboard', async (req, res) => {
  const trainerId = req.session.trainerId;

  if (!trainerId) return res.redirect('/trainer/login');

  try {
    // Eğitmene ait session sayısı
    const [sessionCountRows] = await db.query(
  'SELECT COUNT(*) AS count FROM sessions WHERE trainer_id = ?', [trainerId]
);


    // Bu eğitmenin seanslarına yapılan toplam rezervasyon sayısı
    const [bookingCountRows] = await db.query(
  `SELECT COUNT(*) AS count
   FROM bookings b
   JOIN sessions s ON b.session_id = s.id
   WHERE s.trainer_id = ?`, [trainerId]
);


    res.render('trainer-dashboard', {
      sessionCount: sessionCountRows[0].count,
      bookingCount: bookingCountRows[0].count,
    });

  } catch (err) {
    console.error('Trainer dashboard error:', err);
    res.status(500).send('Dashboard yüklenemedi.');
  }
});

router.get('/bookings', async (req, res) => {
  const trainerId = req.session.trainerId;

  if (!trainerId) return res.redirect('/trainer/login');

  try {
    const [rows] = await db.query(`
  SELECT b.*, m.full_name AS member_name, s.session_date, s.location
  FROM bookings b
  JOIN sessions s ON b.session_id = s.id
  JOIN members m ON b.member_id = m.id
  WHERE s.trainer_id = ?
  ORDER BY s.session_date DESC
`, [trainerId]);



    res.render('trainer-bookings', { bookings: rows });

  } catch (err) {
    console.error('Booking görüntüleme hatası:', err);
    res.status(500).send('Eğitmen rezervasyonları yüklenemedi.');
  }
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

  const { date, start_time, end_time, capacity } = req.body;

  try {
   const { session_date, duration_min, location } = req.body;

    await db.query(`
      INSERT INTO sessions (trainer_id, session_date, duration_min, location)
      VALUES (?, ?, ?, ?)`,
      [trainerId, session_date, duration_min, location]
    );

    res.redirect('/trainers/dashboard');
  } catch (err) {
    console.error('Seans ekleme hatası:', err);
    res.status(500).send('Seans eklenemedi.');
  }
});


// Ekleme işlemi
router.post('/add', isAdmin, async (req, res) => {
  const { name, email, specialty, hire_date, salary } = req.body;

  try {
    await db.query(
      'INSERT INTO trainers (name, email, specialty, hire_date, salary) VALUES (?, ?, ?, ?, ?)',
      [name, email, specialty, hire_date || null, salary || null]
    );
    res.redirect('/trainers');
  } catch (err) {
    console.error('Trainer insert error:', err.message);
    res.status(500).send('Could not add trainer');
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

router.get('/signup', (req, res) => {
  res.render('trainer-signup', { error: null });
});


router.post('/signup', async (req, res) => {
  res.render('trainer-signup', { error: null });
  const { name, email, specialty, password } = req.body;

  try {
    const [existing] = await db.query('SELECT * FROM trainers WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.render('trainer-signup', {
        error: 'This email is already registered.'
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    await db.query(`
      INSERT INTO trainers (name, email, specialty, password)
      VALUES (?, ?, ?, ?)`,
      [name, email, specialty, hashed]
    );

    res.redirect('/trainers/login'); // 📝 NOT: '/trainer/login' → '/trainers/login' ile uyumlu mu kontrol et
  } catch (err) {
    console.error('Trainer signup error:', err);
    res.render('trainer-signup', { error: 'An unexpected error occurred.' });
  }
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
      return res.status(403).send('Bu rezervasyonu iptal etme yetkiniz yok.');
    }

    // Rezervasyonu iptal et (status = 'Cancelled')
    await db.query(`
      UPDATE bookings SET status = 'Cancelled' WHERE booking_id = ?
    `, [bookingId]);

    res.redirect('/trainers/bookings');
  } catch (err) {
    console.error('Rezervasyon iptal hatası:', err);
    res.status(500).send('Rezervasyon iptal edilemedi.');
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

    // Başarılı giriş
    req.session.trainerId = trainer.id;
    req.session.isTrainer = true;

    res.redirect('/trainers/dashboard');
  } catch (err) {
    console.error('Trainer login error:', err);
  res.render('trainer-login', { error: 'wrongpass' }); // veya 'noaccount'
  }
});

module.exports = router;
