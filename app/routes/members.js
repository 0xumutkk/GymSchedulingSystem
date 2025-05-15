const express = require('express');
const router = express.Router();
const db = require('../db');
const isAdmin = require('../middleware/isAdmin');

// GET: list members
router.get('/', isAdmin, async (req, res) => {
  const {
    search,
    gender,
    membership_type,
    join_min,
    join_max,
    page = 1 // varsayılan: 1. sayfa
  } = req.query;

  const limit = 50;
  const offset = (page - 1) * limit;

  try {
    let baseQuery = 'FROM members WHERE 1=1';
    let values = [];

    if (search) {
      baseQuery += ' AND (full_name LIKE ? OR email LIKE ?)';
      const term = `%${search}%`;
      values.push(term, term);
    }

    if (gender && gender !== 'Any') {
      baseQuery += ' AND gender = ?';
      values.push(gender);
    }

    if (membership_type && membership_type !== 'Any') {
      baseQuery += ' AND membership_type = ?';
      values.push(membership_type);
    }

    if (join_min) {
      baseQuery += ' AND join_date >= ?';
      values.push(join_min);
    }

    if (join_max) {
      baseQuery += ' AND join_date <= ?';
      values.push(join_max);
    }

    // 🔢 Toplam kayıt sayısını al
    const [countResult] = await db.query(`SELECT COUNT(*) as count ${baseQuery}`, values);
    const totalMembers = countResult[0].count;
    const totalPages = Math.ceil(totalMembers / limit);

    // 🔢 Sayfa verilerini al
    const [rows] = await db.query(
      `SELECT * ${baseQuery} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    res.render('index', {
      members: rows,
      search,
      gender,
      membership_type,
      join_min,
      join_max,
      page: Number(page),
      totalPages
    });
  } catch (err) {
    console.error('Pagination error:', err.message);
    res.status(500).send('Error fetching paginated results');
  }
});




// GET: form page
router.get('/add', isAdmin, (req, res) => {
  res.render('add-member');
});
// ✅ GET /members/delete/:id
router.get('/delete/:id', isAdmin, async (req, res) => {
  const memberId = req.params.id;

  try {
    await db.query('DELETE FROM members WHERE id = ?', [memberId]);
    res.redirect('/members');
  } catch (err) {
    console.error('Delete error:', err.message);
    res.status(500).send('Member could not be deleted');
  }
});
// GET /members/edit/:id — Üyeyi düzenleme formuna getir
router.get('/edit/:id', isAdmin, async (req, res) => {
  const memberId = req.params.id;

  try {
    const [rows] = await db.query('SELECT * FROM members WHERE id = ?', [memberId]);
    if (rows.length === 0) return res.status(404).send('Member not found');

    res.render('edit-member', { member: rows[0] });
  } catch (err) {
    console.error('Edit GET error:', err.message);
    res.status(500).send('Error fetching member');
  }
});

// POST /members/edit/:id — Güncelleme işlemi
router.post('/edit/:id', isAdmin, async (req, res) => {
  const memberId = req.params.id;
  const { full_name, email, phone, gender, date_of_birth, join_date, membership_type } = req.body;

  try {
    await db.query(
      `UPDATE members
       SET full_name = ?, email = ?, phone = ?, gender = ?, date_of_birth = ?, join_date = ?, membership_type = ?
       WHERE id = ?`,
      [full_name, email, phone, gender, date_of_birth || null, join_date || null, membership_type, memberId]
    );
    res.redirect('/members');
  } catch (err) {
    console.error('Edit POST error:', err.message);
    res.status(500).send('Member could not be updated');
  }
});

// POST: form submission
router.post('/add', isAdmin, async (req, res) => {
  console.log('Form verisi:', req.body);
  console.log('Kayit basarili:', req.body);


  const { full_name, email, phone, gender, date_of_birth, join_date, membership_type } = req.body;

  const safeDOB = date_of_birth === '' ? null : date_of_birth;
  const safeJoinDate = join_date === '' ? null : join_date;

  try {
    await db.query(
      'INSERT INTO members (full_name, email, phone, gender, date_of_birth, join_date, membership_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [full_name, email, phone, gender, safeDOB, safeJoinDate, membership_type]
    );
    res.redirect('/members');
  } catch (err) {
    console.error('Insert error:', err.message);
    res.status(500).send('Member could not be added');
  }
});

module.exports = router;
