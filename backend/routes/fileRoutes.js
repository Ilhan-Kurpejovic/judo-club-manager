const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../db");

const verifyToken = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");

const maxFileSizeInBytes = 10 * 1024 * 1024;
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

// podesavanje gdje se cuvaju fajlovi i kako se zovu
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSizeInBytes,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(
        new Error("Dozvoljeni su samo PDF, DOC, DOCX, JPG i PNG fajlovi."),
      );
    }

    return cb(null, true);
  },
});

function handleFileUpload(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (!err) {
      return next();
    }

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "Fajl je prevelik. Maksimalna velicina je 10 MB.",
      });
    }

    return res.status(400).json({
      message: err.message || "Upload fajla nije uspio.",
    });
  });
}

// GET svi fajlovi
router.get("/", (req, res) => {
  const sql = `
    SELECT
      f.id,
      f.member_id,
      f.file_name,
      f.file_path,
      f.file_type,
      f.uploaded_at,
      m.first_name AS member_first_name,
      m.last_name AS member_last_name
    FROM files f
    LEFT JOIN members m ON f.member_id = m.id
    ORDER BY f.uploaded_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Greška pri čitanju fajlova:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    res.json(results);
  });
});

// GET koji vraca sve fajlove jednog clana
router.get("/member/:memberId", (req, res) => {
  const { memberId } = req.params;

  const sql = `
    SELECT
      id,
      member_id,
      file_name,
      file_path,
      file_type,
      uploaded_at
    FROM files
    WHERE member_id = ?
    ORDER BY uploaded_at DESC
  `;

  db.query(sql, [memberId], (err, results) => {
    if (err) {
      console.error("Greška pri čitanju fajlova člana:", err);
      return res.status(500).json({
        message: "Greška na serveru.",
      });
    }

    res.json(results);
  });
});

// POST upload fajla za clana
router.post(
  "/upload",
  verifyToken,
  checkRole("admin"),
  handleFileUpload,
  (req, res) => {
    const { member_id, file_type } = req.body;

    if (!member_id) {
      return res.status(400).json({
        message: "Član je obavezan.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Fajl je obavezan.",
      });
    }

    const fileName = req.file.originalname;
    const filePath = req.file.filename;

    const sql = `
    INSERT INTO files
    (member_id, file_name, file_path, file_type)
    VALUES (?, ?, ?, ?)
  `;

    db.query(sql, [member_id, fileName, filePath, file_type], (err, result) => {
      if (err) {
        console.error("Greška pri čuvanju fajla:", err);
        return res.status(500).json({
          message: "Greška na serveru.",
        });
      }

      res.status(201).json({
        message: "Fajl je uspješno uploadovan.",
        fileId: result.insertId,
        fileName,
        filePath,
      });
    });
  },
);

// DELETE brisanje fajla iz baze i uploads foldera
router.delete("/:id", verifyToken, checkRole("admin"), (req, res) => {
  const { id } = req.params;

  const findFileSql = "SELECT file_path FROM files WHERE id = ?";

  db.query(findFileSql, [id], (err, results) => {
    if (err) {
      console.error("Greska pri citanju fajla za brisanje:", err);
      return res.status(500).json({
        message: "Greska na serveru.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Fajl nije pronadjen.",
      });
    }

    const filePath = results[0].file_path;
    const uploadsDir = path.resolve(__dirname, "..", "uploads");
    const absoluteFilePath = path.resolve(uploadsDir, path.basename(filePath));

    if (!absoluteFilePath.startsWith(uploadsDir)) {
      return res.status(400).json({
        message: "Putanja fajla nije validna.",
      });
    }

    const deleteSql = "DELETE FROM files WHERE id = ?";

    db.query(deleteSql, [id], (err, result) => {
      if (err) {
        console.error("Greska pri brisanju fajla iz baze:", err);
        return res.status(500).json({
          message: "Greska na serveru.",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Fajl nije pronadjen.",
        });
      }

      fs.unlink(absoluteFilePath, (err) => {
        if (err && err.code !== "ENOENT") {
          console.error("Greska pri brisanju fajla sa diska:", err);
          return res.status(500).json({
            message:
              "Fajl je obrisan iz baze, ali nije obrisan iz uploads foldera.",
          });
        }

        return res.json({
          message: "Fajl je uspjesno obrisan.",
        });
      });
    });
  });
});

module.exports = router;
