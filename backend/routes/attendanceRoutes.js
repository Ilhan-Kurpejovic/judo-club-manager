const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  const sql = `
    SELECT
      a.id,
      a.member_id,
      a.training_id,
      a.status,
      m.first_name AS member_first_name,
      m.last_name AS member_last_name,
      t.training_date,
      t.start_time,
      t.end_time,
      t.location,
      t.description,
      tg.name AS training_group_name
    FROM attendance a
    LEFT JOIN members m ON a.member_id = m.id
    LEFT JOIN trainings t ON a.training_id = t.id
    LEFT JOIN training_groups tg ON t.training_group_id = tg.id
    ORDER BY t.training_date DESC, t.start_time ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Greška pri čitanju prisustva:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    res.json(results);
  });
});

router.get("/training/:trainingId", (req, res) => {
  const { trainingId } = req.params;

  const sql = `
    SELECT
      a.id,
      a.member_id,
      a.training_id,
      a.status,
      m.first_name AS member_first_name,
      m.last_name AS member_last_name,
      m.belt,
      m.weight_category
    FROM attendance a
    LEFT JOIN members m ON a.member_id = m.id
    WHERE a.training_id = ?
    ORDER BY m.last_name ASC, m.first_name ASC
  `;

  db.query(sql, [trainingId], (err, results) => {
    if (err) {
      console.error("Greška pri čitanju prisustva za trening:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    res.json(results);
  });
});

router.get("/:id", (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT
      a.id,
      a.member_id,
      a.training_id,
      a.status,
      m.first_name AS member_first_name,
      m.last_name AS member_last_name,
      t.training_date,
      t.start_time,
      t.end_time,
      t.location,
      t.description
    FROM attendance a
    LEFT JOIN members m ON a.member_id = m.id
    LEFT JOIN trainings t ON a.training_id = t.id
    WHERE a.id = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Greška pri čitanju prisustva:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Evidencija prisustva nije pronađena.",
      });
    }

    res.json(results[0]);
  });
});

// POST dodavanje prisustva za vise clanova odjednom!!!
router.post("/bulk", (req, res) => {
  const { training_id, attendance } = req.body;

  if (!training_id || !Array.isArray(attendance) || attendance.length === 0) {
    return res.status(400).json({
      message: "Trening i lista prisustva su obavezni.",
    });
  }

  const values = attendance.map((item) => [
    item.member_id,
    training_id,
    item.status || "prisutan",
  ]);

  const sql = `
    INSERT INTO attendance
    (member_id, training_id, status)
    VALUES ?
  `;

  db.query(sql, [values], (err, result) => {
    if (err) {
      console.error("Greška pri dodavanju prisustva:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    res.status(201).json({
      message: "Prisustvo za trening je uspješno sačuvano.",
      insertedRows: result.affectedRows,
    });
  });
});

// POST dodavanje prisustva
router.post("/", (req, res) => {
  const { member_id, training_id, status } = req.body;

  if (!member_id || !training_id) {
    return res.status(400).json({
      message: "Član i trening su obavezni.",
    });
  }

  const sql = `
    INSERT INTO attendance
    (member_id, training_id, status)
    VALUES (?, ?, ?)
  `;

  db.query(
    sql,
    [member_id, training_id, status || "prisutan"],
    (err, result) => {
      if (err) {
        console.error("Greška pri dodavanju prisustva:", err);
        return res.status(500).json({
          message: "Greška na serveru.",
        });
      }

      res.status(201).json({
        message: "Prisustvo je uspješno evidentirano.",
        attendanceId: result.insertId,
      });
    },
  );
});

// PUT izmjena prisustva
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { member_id, training_id, status } = req.body;

  if (!member_id || !training_id || !status) {
    return res.status(400).json({
      message: "Član, trening i status su obavezni.",
    });
  }

  const sql = `
    UPDATE attendance
    SET member_id = ?, training_id = ?, status = ?
    WHERE id = ?
  `;

  db.query(sql, [member_id, training_id, status, id], (err, result) => {
    if (err) {
      console.error("Greška pri izmjeni prisustva:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Evidencija prisustva nije pronađena.",
      });
    }

    res.json({
      message: "Prisustvo je uspješno izmijenjeno.",
    });
  });
});

// DELETE brisanje prisustva
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM attendance WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Greška pri brisanju prisustva:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Evidencija prisustva nije pronađena.",
      });
    }

    res.json({
      message: "Prisustvo je uspješno obrisano.",
    });
  });
});

module.exports = router;
