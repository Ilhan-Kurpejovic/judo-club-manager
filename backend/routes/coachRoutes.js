const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  const sql = "SELECT * FROM coaches";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Greska pri citanju trenera!", err);
      return res.status(500).json({ message: "Greška na serveru." });
    }
    res.json(results);
  });
});

router.get("/:id", (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT * from coaches
    WHERE id = ?
  `;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Greška pri pretrazi trenera:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    res.json(result);
  });
});

router.post("/", (req, res) => {
  const { first_name, last_name, phone, email, specialization } = req.body;

  if (!first_name || !last_name) {
    return res.status(400).json({
      message: "Ime i prezime trenera su obavezni.",
    });
  }

  const sql = `
    INSERT INTO coaches 
    (first_name, last_name, phone, email, specialization)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [first_name, last_name, phone, email, specialization],
    (err, result) => {
      if (err) {
        console.error("Greška pri dodavanju trenera:", err);
        return res.status(500).json({
          message: "Greška na serveru.",
        });
      }

      res.status(201).json({
        message: "Trener je uspješno dodat.",
        coachId: result.insertId,
      });
    },
  );
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, phone, email, specialization } = req.body;

  if (!first_name || !last_name) {
    return res.status(400).json({
      message: "Ime i prezime trenera su obavezni.",
    });
  }

  const sql = `
    UPDATE coaches
    SET first_name = ?, last_name = ?, phone = ?, email = ?, specialization = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [first_name, last_name, phone, email, specialization, id],
    (err, result) => {
      if (err) {
        console.error("Greška pri izmjeni trenera:", err);
        return res.status(500).json({
          message: "Greška na serveru.",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Trener nije pronađen.",
        });
      }

      res.json({
        message: "Podaci o treneru su uspješno izmijenjeni.",
      });
    },
  );
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM coaches WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Greška pri brisanju trenera:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Trener nije pronađen.",
      });
    }

    res.json({
      message: "Trener je uspješno obrisan.",
    });
  });
});

module.exports = router;
