import express from 'express';
import Category from '../models/Category.js';
const router = express.Router();
router.get('/', async (_req, res) => res.json({ categories: await Category.find().sort({ sortOrder: 1, name: 1 }) }));
export default router;
