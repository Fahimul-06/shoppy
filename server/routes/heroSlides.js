import express from 'express';
import HeroSlide from '../models/HeroSlide.js';
const router = express.Router();
router.get('/', async (_req, res) => res.json({ heroSlides: await HeroSlide.find({ active: true }).sort({ sortOrder: 1 }) }));
export default router;
