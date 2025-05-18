const express = require('express');
const router = express.Router();
const db = require('../db');
const isAuthenticated = require('../middleware/isAuthenticated');
const isAdmin = require('../middleware/isAdmin');
// Listele
router.get('/', isAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT b.*, m.full_name AS member_name, s.session_date
      FROM bookings b
      LEFT JOIN members m ON b.member_id = m.id
      LEFT JOIN sessions s ON b.session_id = s.id
      ORDER BY b.booking_id DESC
    `);
    res.render('bookings', { bookings: rows });
  } catch (err) {
    console.error('Booking list error:', err.message);
    res.status(500).send('Failed to load bookings');
  }
});


// Form
// GET /bookings/add
router.get('/add', isAuthenticated, async (req, res) => {
  try {
    const [sessions] = await db.query(`
      SELECT s.id, s.session_date, s.location, t.name AS trainer_name
      FROM sessions s
      LEFT JOIN trainers t ON s.trainer_id = t.id
      JOIN (
        SELECT DISTINCT DATE(session_date) AS session_day
        FROM sessions
        ORDER BY session_day DESC
        LIMIT 7
      ) recent_days
      ON DATE(s.session_date) = recent_days.session_day
      ORDER BY s.session_date ASC
    `);

    res.render('add-booking', { sessions, selectedSessionId: null });
  } catch (err) {
    console.error('Form error:', err.message);
    res.status(500).send('Failed to load form');
  }
});


router.get('/add/:sessionId', isAuthenticated, async (req, res) => {
  const selectedSessionId = req.params.sessionId;

  try {
   const [sessions] = await db.query(`
  SELECT s.id, s.session_date, s.location, t.name AS trainer_name
      FROM sessions s
      LEFT JOIN trainers t ON s.trainer_id = t.id
      JOIN (
        SELECT DISTINCT DATE(session_date) AS session_day
        FROM sessions
        ORDER BY session_day DESC
        LIMIT 7
      ) recent_days
      ON DATE(s.session_date) = recent_days.session_day
      ORDER BY s.session_date ASC
`);


    res.render('add-booking', { sessions, selectedSessionId });
  } catch (err) {
    console.error('Add booking (session-specific) error:', err.message);
    res.status(500).send('Failed to load booking form');
  }
});

router.get('/cancel/:id', async (req, res) => {
  const bookingId = req.params.id;
  const userId = req.session.userId;

  try {
    // Kendi rezervasyonunu iptal etmesine izin ver
    await db.query(`
      UPDATE bookings 
      SET status = 'Cancelled'
      WHERE booking_id = ? AND member_id = ?
    `, [bookingId, userId]);

    res.redirect('/bookings/mybookings');
  } catch (err) {
    console.error('Cancel error:', err.message);
    res.status(500).send('Failed to cancel booking');
  }
});

router.get('/admin/add', isAdmin, async (req, res) => {
  try {
    const [members] = await db.query('SELECT id, full_name FROM members');
  const [sessions] = await db.query(`
  SELECT s.id, s.session_date, s.location, t.name AS trainer_name
  FROM sessions s
  LEFT JOIN trainers t ON s.trainer_id = t.id
  JOIN (
    SELECT DISTINCT DATE(session_date) AS date_only
    FROM sessions
    ORDER BY DATE(session_date) DESC
    LIMIT 7
  ) recent_dates
  ON DATE(s.session_date) = recent_dates.date_only
  ORDER BY s.session_date ASC
`);



    res.render('add-booking-admin', {
      members,
      sessions,
      selectedSessionId: null
    });
  } catch (err) {
    console.error('Admin add booking form error:', err.message);
    res.status(500).send('Failed to load admin booking form');
  }
});


router.post('/admin/add', isAdmin, async (req, res) => {
  const { member_id, session_id, booking_date } = req.body;
  await db.query(
    `INSERT INTO bookings (member_id, session_id, booking_date, status)
     VALUES (?, ?, ?, ?)`,
    [member_id, session_id, booking_date, 'Booked']
  );
  res.redirect('/bookings');
});



// Oluştur
router.post('/add', isAuthenticated, async (req, res) => {
  const member_id = req.session.userId;
  const { session_id, booking_date } = req.body;

  try {
    await db.query(
      `INSERT INTO bookings (member_id, session_id, booking_date, status)
       VALUES (?, ?, ?, ?)`,
      [member_id, session_id, booking_date, 'Booked'] // 👈 sabit ACTIVE olarak gönder
    );
    res.redirect('/bookings/mybookings');
  } catch (err) {
    console.error('Insert error:', err.message);
    res.status(500).send('Failed to create booking');
  }
});



router.get('/mybookings', async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.redirect('/login');
  }

  try {
   const [rows] = await db.query(`
  SELECT b.*, s.session_date, s.location
  FROM bookings b
  LEFT JOIN sessions s ON b.session_id = s.id
  WHERE b.member_id = ?
 ORDER BY b.booking_id DESC
`, [userId]);

res.render('my-bookings', { bookings: rows });

  } catch (err) {
    console.error('MyBookings error:', err.message);
    res.status(500).send('Failed to load your bookings');
  }
});

// Düzenleme formu
router.get('/edit/:id', isAdmin, async (req, res) => {
  const bookingId = req.params.id;
  try {
    const [[booking]] = await db.query('SELECT * FROM bookings WHERE booking_id = ?', [bookingId]);
    const [members] = await db.query('SELECT id, full_name FROM members');
    const [sessions] = await db.query('SELECT id, session_date FROM sessions');

    if (!booking) return res.status(404).send('Booking not found');
    res.render('edit-booking', { booking, members, sessions });
  } catch (err) {
    console.error('Edit form error:', err.message);
    res.status(500).send('Failed to load edit form');
  }
});

// Güncelle
router.post('/edit/:id', isAdmin, async (req, res) => {
  const bookingId = req.params.id;
  const { member_id, session_id, booking_date, status } = req.body;
  try {
    await db.query(
      `UPDATE bookings SET member_id = ?, session_id = ?, booking_date = ?, status = ?
       WHERE booking_id = ?`,
      [member_id, session_id, booking_date, status, bookingId]
    );
    res.redirect('/bookings');
  } catch (err) {
    console.error('Update error:', err.message);
    res.status(500).send('Failed to update booking');
  }
});

// Sil
router.get('/delete/:id', isAdmin, async (req, res) => {
  const bookingId = req.params.id;
  try {
    await db.query('DELETE FROM bookings WHERE booking_id = ?', [bookingId]);
    res.redirect('/bookings');
  } catch (err) {
    console.error('Delete error:', err.message);
    res.status(500).send('Failed to delete booking');
  }
});

module.exports = router;
