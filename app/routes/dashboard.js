const express = require('express');
const router = express.Router();
const db = require('../db');
const isAdmin = require('../middleware/isAdmin');

router.get('/dashboard', isAdmin, async (req, res) => {
  try {
    const [[{ totalMembers }]] = await db.query('SELECT COUNT(*) AS totalMembers FROM members');

    const [genderCounts] = await db.query(`
      SELECT gender, COUNT(*) AS count FROM members GROUP BY gender
    `);

    const [membershipCounts] = await db.query(`
      SELECT membership_type, COUNT(*) AS count FROM members GROUP BY membership_type
    `);

    const [[{ joinedThisMonth }]] = await db.query(`
      SELECT COUNT(*) AS joinedThisMonth
      FROM members
      WHERE MONTH(join_date) = MONTH(CURRENT_DATE()) AND YEAR(join_date) = YEAR(CURRENT_DATE())
    `);
    // bookings dashboard eklemeleri
    const [[{ totalBookings }]] = await db.query('SELECT COUNT(*) AS totalBookings FROM bookings');

    const [bookingStatusCounts] = await db.query(`
      SELECT status, COUNT(*) AS count FROM bookings GROUP BY status
    `);

    const [topMembers] = await db.query(`
      SELECT m.full_name, COUNT(*) AS count
      FROM bookings b
      JOIN members m ON b.member_id = m.id
      GROUP BY b.member_id
      ORDER BY count DESC
      LIMIT 5
    `);

    res.render('dashboard', {
      totalMembers,
      genderCounts,
      membershipCounts,
      joinedThisMonth,
      totalBookings,
      bookingStatusCounts,
      topMembers
    });
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).send('Failed to load dashboard');
  }
});

module.exports = router;
