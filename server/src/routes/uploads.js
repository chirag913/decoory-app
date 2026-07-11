import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { saveUpload } from "../services/storage.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB — covers phone photos and short site videos
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("Only image or video files are allowed"));
  },
});

router.post("/", requireAuth, (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    try {
      const { url, kind } = await saveUpload({
        buffer: req.file.buffer, originalName: req.file.originalname, mimetype: req.file.mimetype,
      });
      res.status(201).json({ filePath: url, kind });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
});

export default router;
