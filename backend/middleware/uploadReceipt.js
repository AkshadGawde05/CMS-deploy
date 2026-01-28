import multer from "multer";
import fs from "fs";
import path from "path";

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), "uploads", "receipts");
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, "_");
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});

const allowed = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp"]);

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.has(ext)) cb(null, true);
  else cb(new Error("Only PDF or image files are allowed"), false);
};

export const uploadReceipt = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});
