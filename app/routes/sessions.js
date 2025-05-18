const express = require('express');
const router = express.Router();
const db = require('../db');
// Seansları listele
router.get('/', async (req, res) => {
  try {
    let sessions;
    if (req.session.isAdmin) {

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
    const [conflicts] = await db.query(`
      SELECT *
      FROM sessions
      WHERE location = ?
        AND session_date < DATE_ADD(?, INTERVAL ? MINUTE)
        AND DATE_ADD(session_date, INTERVAL duration_min MINUTE) > ?
    `, [location, session_date, duration_min, session_date]);

    if (conflicts.length > 0) {
      const [trainers] = await db.query('SELECT id, name FROM trainers');
      return res.render('add-session', {
        error: 'A session already exists during this time at this location.',
        trainers
      });
    }

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


module.exports = router;
