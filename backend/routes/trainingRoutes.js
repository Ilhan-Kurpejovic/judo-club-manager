const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  const sql = `
    SELECT 
      t.id,
      t.training_group_id,
      t.training_date,
      t.start_time,
      t.end_time,
      t.location,
      t.description,
      tg.name AS training_group_name,
      tg.age_category
    FROM trainings t
    LEFT JOIN training_groups tg ON t.training_group_id = tg.id
    ORDER BY t.training_date DESC, t.start_time ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Greška pri čitanju treninga:", err);
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
      t.id,
      t.training_group_id,
      t.training_date,
      t.start_time,
      t.end_time,
      t.location,
      t.description,
      tg.name AS training_group_name,
      tg.age_category
    FROM trainings t
    LEFT JOIN training_groups tg ON t.training_group_id = tg.id
    WHERE t.id = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Greška pri čitanju treninga:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Trening nije pronađen.",
      });
    }

    res.json(results[0]);
  });
});

router.post("/", (req, res) => {
  const {
    training_group_id,
    training_date,
    start_time,
    end_time,
    location,
    description,
  } = req.body;

  if (!training_group_id || !training_date || !start_time || !end_time) {
    return res.status(400).json({
      message:
        "Trening grupa, datum, vrijeme početka i vrijeme završetka su obavezni.",
    });
  }

  const sql = `
    INSERT INTO trainings
    (training_group_id, training_date, start_time, end_time, location, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      training_group_id,
      training_date,
      start_time,
      end_time,
      location,
      description,
    ],
    (err, result) => {
      if (err) {
        console.error("Greška pri dodavanju treninga:", err);
        return res.status(500).json({
          message: "Greška na serveru.",
        });
      }

      res.status(201).json({
        message: "Trening je uspješno dodat.",
        trainingId: result.insertId,
      });
    },
  );
});

router.put("/:id", (req, res) => {
  const { id } = req.params;

  const {
    training_group_id,
    training_date,
    start_time,
    end_time,
    location,
    description,
  } = req.body;

  if (!training_group_id || !training_date || !start_time || !end_time) {
    return res.status(400).json({
      message:
        "Trening grupa, datum, vrijeme početka i vrijeme završetka su obavezni.",
    });
  }

  const sql = `
    UPDATE trainings
    SET 
      training_group_id = ?,
      training_date = ?,
      start_time = ?,
      end_time = ?,
      location = ?,
      description = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      training_group_id,
      training_date,
      start_time,
      end_time,
      location,
      description,
      id,
    ],
    (err, result) => {
      if (err) {
        console.error("Greška pri izmjeni treninga:", err);
        return res.status(500).json({
          message: "Greška na serveru.",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Trening nije pronađen.",
        });
      }

      res.json({
        message: "Trening je uspješno izmijenjen.",
      });
    },
  );
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM trainings WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Greška pri brisanju treninga:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Trening nije pronađen.",
      });
    }

    res.json({
      message: "Trening je uspješno obrisan.",
    });
  });
});

module.exports = router;
