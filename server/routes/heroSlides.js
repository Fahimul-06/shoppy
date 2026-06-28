import express from 'express';
import HeroSlide from '../models/HeroSlide.js';
const router = express.Router();

router.get('/', async (req, res) => {
  const placement = ['hero', 'header'].includes(String(req.query.placement || '')) ? String(req.query.placement) : null;
  const filter = { active: true };
  if (placement) filter.placement = placement;
  const slides = await HeroSlide.find(filter).sort({ sortOrder: 1, createdAt: -1 });
  res.json({ heroSlides: slides, banners: slides, headerBanners: slides });
});

export default router;
