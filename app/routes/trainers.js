const express = require('express');
const router = express.Router();
const db = require('../db');
const isAdmin = require('../middleware/isAdmin');

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

module.exports = router;
