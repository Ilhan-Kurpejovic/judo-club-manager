const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  const sql = `
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
    ORDER BY ms.year DESC, ms.month DESC, m.last_name ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Greška pri čitanju članarina:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    res.json(results);
  });
});

// GET clanarine jednog clana
router.get("/member/:memberId", (req, res) => {
  const { memberId } = req.params;

  const sql = `
    SELECT
      ms.id,
      ms.member_id,
      ms.month,
      ms.year,
      ms.amount,
      ms.status,
      ms.payment_date,
      m.first_name AS member_first_name,
      m.last_name AS member_last_name
    FROM memberships ms
    LEFT JOIN members m ON ms.member_id = m.id
    WHERE ms.member_id = ?
    ORDER BY ms.year DESC, ms.month DESC
  `;

  db.query(sql, [memberId], (err, results) => {
    if (err) {
      console.error("Greška pri čitanju članarina člana:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    res.json(results);
  });
});

// GET jedna clanarina izdvojena po ID-u
router.get("/:id", (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT
      ms.id,
      ms.member_id,
      ms.month,
      ms.year,
      ms.amount,
      ms.status,
      ms.payment_date,
      m.first_name AS member_first_name,
      m.last_name AS member_last_name
    FROM memberships ms
    LEFT JOIN members m ON ms.member_id = m.id
    WHERE ms.id = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Greška pri čitanju članarine:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Članarina nije pronađena.",
      });
    }

    res.json(results[0]);
  });
});

// POST dodavanje clanarine
router.post("/", (req, res) => {
  const { member_id, month, year, amount, status, payment_date } = req.body;

  if (!member_id || !month || !year || !amount) {
    return res.status(400).json({
      message: "Član, mjesec, godina i iznos su obavezni.",
    });
  }

  const sql = `
    INSERT INTO memberships
    (member_id, month, year, amount, status, payment_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      member_id,
      month,
      year,
      amount,
      status || "nije plaćeno",
      payment_date || null,
    ],
    (err, result) => {
      if (err) {
        console.error("Greška pri dodavanju članarine:", err);

        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({
            message: "Članarina za ovog člana, mjesec i godinu već postoji.",
          });
        }

        return res.status(500).json({
          message: "Greška na serveru.",
        });
      }

      res.status(201).json({
        message: "Članarina je uspješno dodata.",
        membershipId: result.insertId,
      });
    },
  );
});

// PUT izmjena clanarine
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { member_id, month, year, amount, status, payment_date } = req.body;

  if (!member_id || !month || !year || !amount || !status) {
    return res.status(400).json({
      message: "Član, mjesec, godina, iznos i status su obavezni.",
    });
  }

  const sql = `
    UPDATE memberships
    SET
      member_id = ?,
      month = ?,
      year = ?,
      amount = ?,
      status = ?,
      payment_date = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [member_id, month, year, amount, status, payment_date || null, id],
    (err, result) => {
      if (err) {
        console.error("Greška pri izmjeni članarine:", err);
        return res.status(500).json({
          message: "Greška na serveru.",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Članarina nije pronađena.",
        });
      }

      res.json({
        message: "Članarina je uspješno izmijenjena.",
      });
    },
  );
});

// DELETE brisanje clanarine
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM memberships WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Greška pri brisanju članarine:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Članarina nije pronađena.",
      });
    }

    res.json({
      message: "Članarina je uspješno obrisana.",
    });
  });
});

module.exports = router;
