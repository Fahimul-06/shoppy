import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
const router = express.Router();
const dir = path.join(process.cwd(), 'server', 'uploads');
fs.mkdirSync(dir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${path.extname(file.originalname)}`),
});
const upload = multer({ storage });
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  res.json({ url: `/uploads/${req.file.filename}` });
});
export default router;
