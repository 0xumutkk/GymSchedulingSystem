const express = require('express');
const router = express.Router();
const db = require('../db');
// Seansları listele
router.get('/', async (req, res) => {
  try {
    let sessions;
    if (req.session.isAdmin) {
      // Admin → tüm session'ları görsün
      [sessions] = await db.query(`
        SELECT s.*, t.name AS trainer_name
        FROM sessions s
        LEFT JOIN trainers t ON s.trainer_id = t.id
        ORDER BY s.session_date DESC
      `);
    } else {
      // Üye → sadece son 7 günün session'ları (önceki çözüm)
      [sessions] = await db.query(`
        SELECT s.*, t.name AS trainer_name
        FROM sessions s
        JOIN (
          SELECT DISTINCT DATE(session_date) AS session_day
          FROM sessions
          ORDER BY session_day DESC
          LIMIT 7
        ) AS latest_days
          ON DATE(s.session_date) = latest_days.session_day
        LEFT JOIN trainers t ON s.trainer_id = t.id
        ORDER BY s.session_date DESC
      `);
    }

    res.render('sessions', { sessions });
  } catch (err) {
    console.error('Session list error:', err.message);
    res.status(500).send('Failed to fetch sessions');
  }
});


// Seans ekleme formu
router.get('/add', async (req, res) => {
  try {
    const [trainers] = await db.query('SELECT id, name FROM trainers');
    res.render('add-session', { trainers });
  } catch (err) {
    console.error('Trainer fetch error:', err.message);
    res.status(500).send('Could not load session form');
  }
});

// Seans oluştur
router.post('/add', async (req, res) => {
  const { session_date, duration_min, location, trainer_id } = req.body;

  try {
    await db.query(
      `INSERT INTO sessions (session_date, duration_min, location, trainer_id)
       VALUES (?, ?, ?, ?)`,
      [session_date, duration_min, location, trainer_id]
    );
    res.redirect('/sessions');
  } catch (err) {
    console.error('Session insert error:', err.message);
    res.status(500).send('Could not add session');
  }
});

router.post('/trainer/sessions/add', async (req, res) => {
  const trainerId = req.session.trainerId;
  const { date, time, capacity } = req.body;

  await db.query(`
    INSERT INTO Session (trainer_id, date, start_time, capacity)
    VALUES (?, ?, ?, ?)
  `, [trainerId, date, time, capacity]);

  res.redirect('/trainer/sessions');
});

module.exports = router;
