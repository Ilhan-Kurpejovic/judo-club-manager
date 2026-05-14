const express = require("express");
const router = express.Router();
const db = require("../db");

const verifyToken = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");

//GET pretraga clanova po filterima

router.get(
  "/members",
  verifyToken,
  checkRole("admin", "trener", "clan"),
  (req, res) => {
    const { name, age_category, belt, training_group_id, status } = req.query;

    let sql = `
    SELECT
      m.id,
      m.first_name,
      m.last_name,
      m.date_of_birth,
      m.gender,
      m.age_category,
      m.belt,
      m.weight_category,
      m.phone,
      m.parent_phone,
      m.email,
      m.address,
      m.photo,
      m.training_group_id,
      m.status,
      tg.name AS training_group_name
    FROM members m
    LEFT JOIN training_groups tg ON m.training_group_id = tg.id
    WHERE 1 = 1
  `;

    const values = [];

    if (name) {
      sql += `
      AND (
        m.first_name LIKE ?
        OR m.last_name LIKE ?
        OR CONCAT(m.first_name, ' ', m.last_name) LIKE ?
      )
    `;
      values.push(`%${name}%`, `%${name}%`, `%${name}%`);
    }

    if (age_category) {
      sql += `AND m.age_category = ?`;
      values.push(age_category);
    }

    if (belt) {
      sql += " AND m.belt = ?";
      values.push(belt);
    }

    if (training_group_id) {
      sql += " AND m.training_group_id = ?";
      values.push(training_group_id);
    }

    if (status) {
      sql += " AND m.status = ?";
      values.push(status);
    }

    sql += " ORDER BY m.last_name ASC, m.first_name ASC";

    db.query(sql, values, (err, results) => {
      if (err) {
        console.error("Greška pri pretrazi članova:", err);
        return res.status(500).json({
          message: "Greška na serveru.",
        });
      }

      res.json(results);
    });
  },
);

// GET pretraga clanarina
router.get(
  "/memberships",
  verifyToken,
  checkRole("admin", "trener"),
  (req, res) => {
    const { name, status, month, year, training_group_id } = req.query;

    let sql = `
    SELECT
      ms.id,
      ms.member_id,
      ms.month,
      ms.year,
      ms.amount,
      ms.status,
      ms.payment_date,
      m.first_name AS member_first_name,
      m.last_name AS member_last_name,
      m.age_category,
      m.training_group_id,
      tg.name AS training_group_name
    FROM memberships ms
    LEFT JOIN members m ON ms.member_id = m.id
    LEFT JOIN training_groups tg ON m.training_group_id = tg.id
    WHERE 1 = 1
  `;

    const values = [];

    if (name) {
      sql += `
      AND (
        m.first_name LIKE ?
        OR m.last_name LIKE ?
        OR CONCAT(m.first_name, ' ', m.last_name) LIKE ?
      )
    `;
      values.push(`%${name}%`, `%${name}%`, `%${name}%`);
    }

    if (status) {
      sql += " AND ms.status = ?";
      values.push(status);
    }

    if (month) {
      sql += " AND ms.month = ?";
      values.push(month);
    }

    if (year) {
      sql += " AND ms.year = ?";
      values.push(year);
    }

    if (training_group_id) {
      sql += " AND m.training_group_id = ?";
      values.push(training_group_id);
    }

    sql +=
      " ORDER BY ms.year DESC, ms.month DESC, m.last_name ASC, m.first_name ASC";

    db.query(sql, values, (err, results) => {
      if (err) {
        console.error("Greška pri pretrazi članarina:", err);
        return res.status(500).json({
          message: "Greška na serveru.",
        });
      }

      res.json(results);
    });
  },
);

// GET pretraga takmicenja
router.get(
  "/competitions",
  verifyToken,
  checkRole("admin", "trener", "clan"),
  (req, res) => {
    const { name, city, country, year } = req.query;

    let sql = `
    SELECT
      id,
      name,
      city,
      country,
      competition_date,
      organizer
    FROM competitions
    WHERE 1 = 1
  `;

    const values = [];

    if (name) {
      sql += " AND name LIKE ?";
      values.push(`%${name}%`);
    }

    if (city) {
      sql += " AND city LIKE ?";
      values.push(`%${city}%`);
    }

    if (country) {
      sql += " AND country LIKE ?";
      values.push(`%${country}%`);
    }

    if (year) {
      sql += " AND YEAR(competition_date) = ?";
      values.push(year);
    }

    sql += " ORDER BY competition_date DESC";

    db.query(sql, values, (err, results) => {
      if (err) {
        console.error("Greška pri pretrazi takmičenja:", err);
        return res.status(500).json({
          message: "Greška na serveru.",
        });
      }

      res.json(results);
    });
  },
);

module.exports = router;
