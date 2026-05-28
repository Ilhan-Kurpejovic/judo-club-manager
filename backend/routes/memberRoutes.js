const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt");

const verifyToken = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");

router.get("/", (req, res) => {
  const sql = `SELECT 
      m.id,
      m.first_name,
      m.last_name,
      m.date_of_birth,
      m.gender,
      m.belt,
      m.weight_category,
      m.phone,
      m.parent_phone,
      m.email,
      m.address,
      m.photo,
      m.training_group_id,
      m.user_id,
      m.status,
      m.age_category,
      tg.name AS training_group_name
      FROM members m
      LEFT JOIN training_groups tg ON m.training_group_id = tg.id`;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Greska pri citanju clanova kluba!", err);
      return res.status(500).json({ message: "Greška na serveru." });
    }

    res.json(results);
  });
});

// GET svi clanovi jedne trening grupe
router.get("/group/:trainingGroupId", (req, res) => {
  const { trainingGroupId } = req.params;

  const sql = `
    SELECT 
      m.id,
      m.first_name,
      m.last_name,
      m.date_of_birth,
      m.gender,
      m.belt,
      m.weight_category,
      m.phone,
      m.parent_phone,
      m.email,
      m.address,
      m.photo,
      m.training_group_id,
      m.user_id,
      m.status,
      m.age_category,
      tg.name AS training_group_name
    FROM members m
    LEFT JOIN training_groups tg ON m.training_group_id = tg.id
    WHERE m.training_group_id = ?
    ORDER BY m.last_name ASC, m.first_name ASC
  `;

  db.query(sql, [trainingGroupId], (err, results) => {
    if (err) {
      console.error("Greška pri čitanju članova grupe:", err);
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
      m.id,
      m.first_name,
      m.last_name,
      m.date_of_birth,
      m.gender,
      m.belt,
      m.weight_category,
      m.phone,
      m.parent_phone,
      m.email,
      m.address,
      m.photo,
      m.training_group_id,
      m.user_id,
      m.status,
      m.age_category,
      tg.name AS training_group_name
    FROM members m
    LEFT JOIN training_groups tg ON m.training_group_id = tg.id
    WHERE m.id = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Greška pri čitanju člana:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Član nije pronađen.",
      });
    }

    res.json(results[0]);
  });
});

// POST dodavanje novog člana i automatsko kreiranje korisničkog naloga
router.post("/", verifyToken, checkRole("admin"), async (req, res) => {
  const {
    first_name,
    last_name,
    date_of_birth,
    gender,
    age_category,
    belt,
    weight_category,
    phone,
    parent_phone,
    email,
    address,
    photo,
    training_group_id,
    status,
    login_email,
    initial_password,
  } = req.body;

  if (!first_name || !last_name) {
    return res.status(400).json({
      message: "Ime i prezime člana su obavezni.",
    });
  }

  if (!login_email || !initial_password) {
    return res.status(400).json({
      message: "Email za login i početna lozinka su obavezni.",
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(initial_password, 10);
    const userName = `${first_name} ${last_name}`;

    db.beginTransaction((err) => {
      if (err) {
        console.error("Greška pri pokretanju transakcije:", err);
        return res.status(500).json({
          message: "Greška na serveru.",
        });
      }

      const createUserSql = `
        INSERT INTO users
        (name, email, password, role_id)
        VALUES (?, ?, ?, ?)
      `;

      // role_id = 3 je uloga 'clan'
      db.query(
        createUserSql,
        [userName, login_email, hashedPassword, 3],
        (err, userResult) => {
          if (err) {
            return db.rollback(() => {
              console.error("Greška pri kreiranju korisničkog naloga:", err);

              if (err.code === "ER_DUP_ENTRY") {
                return res.status(400).json({
                  message: "Korisnik sa ovim login emailom već postoji.",
                });
              }

              return res.status(500).json({
                message: "Greška na serveru.",
              });
            });
          }

          const userId = userResult.insertId;

          const createMemberSql = `
            INSERT INTO members
            (
              first_name,
              last_name,
              date_of_birth,
              gender,
              age_category,
              belt,
              weight_category,
              phone,
              parent_phone,
              email,
              address,
              photo,
              training_group_id,
              user_id,
              status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          db.query(
            createMemberSql,
            [
              first_name,
              last_name,
              date_of_birth,
              gender,
              age_category,
              belt,
              weight_category,
              phone,
              parent_phone,
              email,
              address,
              photo,
              training_group_id,
              userId,
              status || "aktivan",
            ],
            (err, memberResult) => {
              if (err) {
                return db.rollback(() => {
                  console.error("Greška pri dodavanju člana:", err);

                  return res.status(500).json({
                    message:
                      "Greška pri dodavanju člana. Korisnički nalog nije sačuvan.",
                  });
                });
              }

              db.commit((err) => {
                if (err) {
                  return db.rollback(() => {
                    console.error("Greška pri potvrđivanju transakcije:", err);

                    return res.status(500).json({
                      message: "Greška na serveru.",
                    });
                  });
                }

                res.status(201).json({
                  message: "Član i korisnički nalog su uspješno kreirani.",
                  memberId: memberResult.insertId,
                  userId: userId,
                  login_email: login_email,
                });
              });
            },
          );
        },
      );
    });
  } catch (error) {
    console.error("Greška pri hashovanju lozinke:", error);

    res.status(500).json({
      message: "Greška na serveru.",
    });
  }
});

router.put("/:id", verifyToken, checkRole("admin"), (req, res) => {
  const { id } = req.params;

  const {
    first_name,
    last_name,
    date_of_birth,
    gender,
    belt,
    weight_category,
    phone,
    parent_phone,
    email,
    address,
    photo,
    training_group_id,
    user_id,
    status,
    age_category,
  } = req.body;

  if (!first_name || !last_name) {
    return res.status(400).json({
      message: "Ime i prezime člana su obavezni.",
    });
  }

  const sql = `
    UPDATE members
    SET 
      first_name = ?,
      last_name = ?,
      date_of_birth = ?,
      gender = ?,
      belt = ?,
      weight_category = ?,
      phone = ?,
      parent_phone = ?,
      email = ?,
      address = ?,
      photo = ?,
      training_group_id = ?,
      user_id = ?,
      status = ?,
      age_category = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      first_name,
      last_name,
      date_of_birth,
      gender,
      belt,
      weight_category,
      phone,
      parent_phone,
      email,
      address,
      photo,
      training_group_id,
      user_id,
      status,
      age_category,
      id,
    ],
    (err, result) => {
      if (err) {
        console.error("Greška pri izmjeni člana:", err);
        return res.status(500).json({
          message: "Greška na serveru.",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Član nije pronađen.",
        });
      }

      res.json({
        message: "Podaci o članu su uspješno izmijenjeni.",
      });
    },
  );
});

router.delete("/:id", verifyToken, checkRole("admin"), (req, res) => {
  const { id } = req.params;

  db.beginTransaction((err) => {
    if (err) {
      console.error("Greska pri pokretanju transakcije:", err);
      return res.status(500).json({
        message: "Greska na serveru.",
      });
    }

    db.query("SELECT user_id FROM members WHERE id = ?", [id], (err, rows) => {
      if (err) {
        return db.rollback(() => {
          console.error("Greska pri citanju clana za brisanje:", err);
          return res.status(500).json({
            message: "Greska na serveru.",
          });
        });
      }

      if (rows.length === 0) {
        return db.rollback(() => {
          return res.status(404).json({
            message: "Clan nije pronadjen.",
          });
        });
      }

      const userId = rows[0].user_id;

      db.query("DELETE FROM members WHERE id = ?", [id], (err, result) => {
        if (err) {
          return db.rollback(() => {
            console.error("Greska pri brisanju clana:", err);
            return res.status(500).json({
              message: "Greska na serveru.",
            });
          });
        }

        if (result.affectedRows === 0) {
          return db.rollback(() => {
            return res.status(404).json({
              message: "Clan nije pronadjen.",
            });
          });
        }

        const finishDelete = () => {
          db.commit((err) => {
            if (err) {
              return db.rollback(() => {
                console.error("Greska pri potvrdi brisanja:", err);
                return res.status(500).json({
                  message: "Greska na serveru.",
                });
              });
            }

            return res.json({
              message: "Clan i korisnicki nalog su uspjesno obrisani.",
            });
          });
        };

        if (!userId) {
          return finishDelete();
        }

        db.query("DELETE FROM users WHERE id = ?", [userId], (err) => {
          if (err) {
            return db.rollback(() => {
              console.error("Greska pri brisanju korisnickog naloga:", err);
              return res.status(500).json({
                message: "Greska na serveru.",
              });
            });
          }

          return finishDelete();
        });
      });
    });
  });
});

router.delete("/legacy/:id", verifyToken, checkRole("admin"), (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM members WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Greška pri brisanju člana:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Član nije pronađen.",
      });
    }

    res.json({
      message: "Član je uspješno obrisan.",
    });
  });
});

module.exports = router;
