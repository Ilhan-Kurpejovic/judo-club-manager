const express = require("express");
const router = express.Router();
const db = require("../db");

const verifyToken = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");

const allowedAttendanceStatuses = new Set(["prisutan", "odsutan", "opravdano"]);

function isValidAttendanceStatus(status) {
  return allowedAttendanceStatuses.has(status || "prisutan");
}

function normalizeDateOnly(dateValue) {
  if (!dateValue) {
    return "";
  }

  if (dateValue instanceof Date) {
    const localDate = new Date(
      dateValue.getTime() - dateValue.getTimezoneOffset() * 60000,
    );

    return localDate.toISOString().slice(0, 10);
  }

  return String(dateValue).slice(0, 10);
}

function getTodayDate() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

  return localDate.toISOString().slice(0, 10);
}

function ensureTrainingCanBeEdited(trainingId, res, next) {
  db.query(
    "SELECT DATE_FORMAT(training_date, '%Y-%m-%d') AS training_date FROM trainings WHERE id = ?",
    [trainingId],
    (err, results) => {
      if (err) {
        console.error("Greska pri provjeri datuma treninga:", err);
        return res.status(500).json({
          message: "Greska na serveru.",
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          message: "Trening nije pronadjen.",
        });
      }

      const trainingDate = normalizeDateOnly(results[0].training_date);

      if (trainingDate !== getTodayDate()) {
        return res.status(400).json({
          message: "Prisustvo se moze mijenjati samo na dan treninga.",
        });
      }

      return next();
    },
  );
}

router.get("/", (req, res) => {
  const sql = `
    SELECT
      a.id,
      a.member_id,
      a.training_id,
      a.status,
      m.first_name AS member_first_name,
      m.last_name AS member_last_name,
      DATE_FORMAT(t.training_date, '%Y-%m-%d') AS training_date,
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
      DATE_FORMAT(t.training_date, '%Y-%m-%d') AS training_date,
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

// POST cuvanje prisustva za vise clanova odjednom.
// Prvo brise staru evidenciju za trening, pa upisuje novu.
router.post("/bulk", verifyToken, checkRole("admin", "trener"), (req, res) => {
  const { training_id, attendance } = req.body;

  if (!training_id || !Array.isArray(attendance) || attendance.length === 0) {
    return res.status(400).json({
      message: "Trening i lista prisustva su obavezni.",
    });
  }

  const hasInvalidStatus = attendance.some(
    (item) => !isValidAttendanceStatus(item.status),
  );

  if (hasInvalidStatus) {
    return res.status(400).json({
      message: "Status prisustva nije ispravan.",
    });
  }

  ensureTrainingCanBeEdited(training_id, res, () => {
    const values = attendance.map((item) => [
      item.member_id,
      training_id,
      item.status || "prisutan",
    ]);

    db.beginTransaction((err) => {
    if (err) {
      console.error("Greska pri pokretanju transakcije za prisustvo:", err);
      return res.status(500).json({
        message: "Greska na serveru.",
      });
    }

    db.query("DELETE FROM attendance WHERE training_id = ?", [training_id], (err) => {
      if (err) {
        return db.rollback(() => {
          console.error("Greska pri brisanju stare evidencije prisustva:", err);
          return res.status(500).json({
            message: "Greska na serveru.",
          });
        });
      }

      const sql = `
        INSERT INTO attendance
        (member_id, training_id, status)
        VALUES ?
      `;

      db.query(sql, [values], (err, result) => {
        if (err) {
          return db.rollback(() => {
            console.error("Greska pri dodavanju prisustva:", err);
            return res.status(500).json({
              message: "Greska na serveru.",
            });
          });
        }

        db.commit((err) => {
          if (err) {
            return db.rollback(() => {
              console.error("Greska pri cuvanju evidencije prisustva:", err);
              return res.status(500).json({
                message: "Greska na serveru.",
              });
            });
          }

          return res.status(201).json({
            message: "Prisustvo za trening je uspjesno sacuvano.",
            insertedRows: result.affectedRows,
          });
        });
      });
    });
    });
  });
});

// POST dodavanje prisustva
router.post("/", verifyToken, checkRole("admin", "trener"), (req, res) => {
  const { member_id, training_id, status } = req.body;

  if (!member_id || !training_id) {
    return res.status(400).json({
      message: "Član i trening su obavezni.",
    });
  }

  if (!isValidAttendanceStatus(status)) {
    return res.status(400).json({
      message: "Status prisustva nije ispravan.",
    });
  }

  ensureTrainingCanBeEdited(training_id, res, () => {
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
});

// PUT izmjena prisustva
router.put("/:id", verifyToken, checkRole("admin", "trener"), (req, res) => {
  const { id } = req.params;
  const { member_id, training_id, status } = req.body;

  if (!member_id || !training_id || !status) {
    return res.status(400).json({
      message: "Član, trening i status su obavezni.",
    });
  }

  if (!isValidAttendanceStatus(status)) {
    return res.status(400).json({
      message: "Status prisustva nije ispravan.",
    });
  }

  ensureTrainingCanBeEdited(training_id, res, () => {
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
});

// DELETE brisanje prisustva
router.delete("/:id", verifyToken, checkRole("admin", "trener"), (req, res) => {
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
