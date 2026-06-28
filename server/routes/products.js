import express from 'express';
import multer from 'multer';
import Product from '../models/Product.js';
import ProductReview from '../models/ProductReview.js';

const router = express.Router();
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const compact = (items) => [...new Set(items.map((x) => String(x || '').trim()).filter(Boolean))];
const textOfProduct = (product) => [
  product.name,
  product.brand,
  product.category,
  product.subcategory,
  product.childCategory,
  product.description,
  ...(Array.isArray(product.features) ? product.features : []),
  product.seller?.name,
  product.seller?.shopName,
].filter(Boolean).join(' ').toLowerCase();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  },
});

async function detectImageLabels(file) {
  const labels = [];

  // Filename terms are useful for uploaded product screenshots such as "red-shoes.jpg".
  const filenameTerms = String(file.originalname || '')
    .replace(/\.[a-z0-9]+$/i, '')
    .split(/[^a-zA-Z0-9]+/)
    .filter((word) => word.length >= 3 && !['image', 'photo', 'capture', 'camera', 'screenshot'].includes(word.toLowerCase()));
  labels.push(...filenameTerms);

  // Optional real visual search. Add GOOGLE_VISION_API_KEY on Render Web Service to enable label detection.
  if (process.env.GOOGLE_VISION_API_KEY) {
    try {
      const body = {
        requests: [{
          image: { content: file.buffer.toString('base64') },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 12 },
            { type: 'WEB_DETECTION', maxResults: 8 },
            { type: 'OBJECT_LOCALIZATION', maxResults: 8 },
          ],
        }],
      };
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        const data = await response.json();
        const result = data.responses?.[0] || {};
        labels.push(...(result.labelAnnotations || []).map((item) => item.description));
        labels.push(...(result.localizedObjectAnnotations || []).map((item) => item.name));
        labels.push(...(result.webDetection?.webEntities || []).map((item) => item.description));
        labels.push(...(result.webDetection?.bestGuessLabels || []).map((item) => item.label));
      } else {
        console.warn('Google Vision image search failed:', response.status, await response.text());
      }
    } catch (error) {
      console.warn('Google Vision image search error:', error.message);
    }
  }

  return compact(labels).slice(0, 24);
}

function normalizeCategoryValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugToName(slug) {
  return normalizeCategoryValue(slug).split(' ').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

const CATEGORY_ALIASES = {
  'mens-fashion': ["Men's Fashion", 'mens fashion', 'men fashion'],
  'womens-fashion': ["Women's Fashion", 'womens fashion', 'women fashion'],
  'computer-gaming': ['Computer & Gaming', 'computer and gaming'],
  'home-living': ['Home & Living', 'home and living'],
  'groceries-pet': ['Groceries & Pet Supplies', 'groceries and pet supplies', 'groceries pet'],
  'health-beauty': ['Health & Beauty', 'health and beauty'],
  'tv-appliances': ['TV & Home Appliances', 'tv and home appliances'],
  'lifestyle-hobbies': ['Lifestyle & Hobbies', 'lifestyle and hobbies'],
  'electronic-accessories': ['Electronic Accessories'],
  'watches-bags': ['Watches & Bags', 'watches and bags'],
  'sports-outdoors': ['Sports & Outdoors', 'sports and outdoors'],
  'mother-baby': ['Mother & Baby', 'mother and baby'],
  'automotive': ['Automotives & Motorbikes', 'automotive', 'automotives and motorbikes'],
  'phones': ['Phones & Accessories', 'phones and accessories', 'phones'],
};

function categoryRegexes(category) {
  const raw = String(category || '').trim();
  const normalized = normalizeCategoryValue(raw);
  const hyphenSlug = normalized.replace(/\s+/g, '-');
  const aliases = compact([
    raw,
    normalized,
    hyphenSlug,
    slugToName(raw),
    ...(CATEGORY_ALIASES[hyphenSlug] || []),
  ]);
  return aliases.map((alias) => new RegExp(`^${esc(alias).replace(/\\ /g, '[\\s-]+')}$`, 'i'));
}

function buildPublicProductFilter(query) {
  const { category, subcategory, childCategory, badge, saleTag, search, includeInactive } = query;
  const filter = includeInactive === 'true' ? {} : { active: { $ne: false } };
  if (category && category !== 'all') {
    const regexes = categoryRegexes(category);
    filter.$or = [
      ...(filter.$or || []),
      ...regexes.map((rx) => ({ category: rx })),
    ];
  }
  if (subcategory) {
    const regexes = categoryRegexes(subcategory);
    filter.$and = [
      ...(filter.$and || []),
      { $or: regexes.flatMap((rx) => [{ subcategory: rx }, { subCategory: rx }]) },
    ];
  }
  if (childCategory) {
    const regexes = categoryRegexes(childCategory);
    filter.$and = [
      ...(filter.$and || []),
      { $or: regexes.flatMap((rx) => [{ childCategory: rx }, { subSubCategory: rx }]) },
    ];
  }
  if (badge) filter.badge = badge;
  if (saleTag) filter.saleTags = String(saleTag).trim();
  if (search) {
    const terms = compact(String(search).split(/\s+/)).slice(0, 8);
    const regexes = terms.length ? terms.map((term) => new RegExp(esc(term), 'i')) : [new RegExp(esc(search), 'i')];
    filter.$or = regexes.flatMap((rx) => [
      { name: rx },
      { brand: rx },
      { description: rx },
      { category: rx },
      { subcategory: rx },
      { childCategory: rx },
      { features: rx },
    ]);
  }
  return filter;
}

router.get('/', async (req, res) => {
  const filter = buildPublicProductFilter(req.query);
  let products = await Product.find(filter).populate('seller', 'name shopName shopLogo shopBanner shopAddress status').sort({ createdAt: -1 });

  // Search seller/shop names too, after populate, because those fields live in the Seller collection.
  if (req.query.search) {
    const q = String(req.query.search).toLowerCase();
    const terms = compact(q.split(/\s+/));
    products = products.filter((product) => {
      const haystack = textOfProduct(product);
      return terms.every((term) => haystack.includes(term)) || haystack.includes(q);
    });
  }

  res.json({ products });
});

router.post('/image-search', imageUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Please upload or capture a product photo first.' });

  const labels = await detectImageLabels(req.file);
  const products = await Product.find({ active: { $ne: false } })
    .populate('seller', 'name shopName shopLogo shopBanner shopAddress status')
    .sort({ createdAt: -1 })
    .limit(300);

  const normalizedLabels = labels.map((label) => label.toLowerCase());
  const scored = products.map((product) => {
    const haystack = textOfProduct(product);
    let score = 0;
    for (const label of normalizedLabels) {
      if (!label) continue;
      if (haystack.includes(label)) score += label.length > 6 ? 8 : 5;
      for (const part of label.split(/\s+/).filter((x) => x.length >= 3)) {
        if (haystack.includes(part)) score += 2;
      }
    }
    return { product, score };
  }).sort((a, b) => b.score - a.score || new Date(b.product.createdAt || 0) - new Date(a.product.createdAt || 0));

  const matched = scored.filter((item) => item.score > 0).slice(0, 30).map((item) => item.product);
  const fallback = scored.slice(0, 20).map((item) => item.product);

  res.json({
    products: matched.length ? matched : fallback,
    labels,
    message: matched.length
      ? `Matched from photo: ${labels.slice(0, 6).join(', ')}`
      : 'Photo captured successfully. Add GOOGLE_VISION_API_KEY on backend for stronger visual matching; showing popular/recent products for now.',
  });
});

router.get('/:id/related', async (req, res) => {
  const id = req.params.id;
  const limit = Math.min(Number(req.query.limit || 10), 20);
  const product = id.match(/^[a-f\d]{24}$/i)
    ? await Product.findById(id)
    : await Product.findOne({ legacyId: id });

  if (!product) return res.json({ products: [] });

  const currentSellerId = product.seller ? String(product.seller) : '';
  const candidates = await Product.find({
    active: { $ne: false },
    _id: { $ne: product._id },
  })
    .populate('seller', 'name shopName shopLogo shopBanner shopAddress status')
    .sort({ createdAt: -1 })
    .limit(200);

  const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  const scored = candidates
    .map((candidate) => {
      const candidateSellerId = candidate.seller?._id ? String(candidate.seller._id) : String(candidate.seller || '');
      let score = 0;
      if (same(candidate.childCategory, product.childCategory)) score += 50;
      if (same(candidate.subcategory, product.subcategory)) score += 40;
      if (same(candidate.category, product.category)) score += 30;
      if (currentSellerId && candidateSellerId === currentSellerId) score += 20;
      if (same(candidate.brand, product.brand)) score += 10;
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score || new Date(b.candidate.createdAt || 0) - new Date(a.candidate.createdAt || 0));

  res.json({ products: scored.slice(0, limit).map((item) => item.candidate) });
});


router.get('/:id/reviews', async (req, res) => {
  const id = req.params.id;
  const product = id.match(/^[a-f\d]{24}$/i)
    ? await Product.findById(id)
    : await Product.findOne({ legacyId: id });

  if (!product) return res.status(404).json({ message: 'Product not found' });

  const reviews = await ProductReview.find({ product: product._id })
    .populate('user', 'fullName email profilePhoto')
    .sort({ createdAt: -1 })
    .lean();

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const review of reviews) {
    const rating = Math.max(1, Math.min(5, Math.round(Number(review.rating || 0))));
    distribution[rating] += 1;
  }

  res.json({ reviews, distribution });
});

router.get('/:id', async (req, res) => {
  const id = req.params.id;
  const product = id.match(/^[a-f\d]{24}$/i)
    ? await Product.findById(id).populate('seller', 'name shopName shopLogo shopBanner shopAddress status')
    : await Product.findOne({ legacyId: id }).populate('seller', 'name shopName shopLogo shopBanner shopAddress status');
  res.json({ product });
});

router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'Image size must be less than 15 MB. Please choose a smaller image.' });
  }
  if (err instanceof multer.MulterError) return res.status(400).json({ message: err.message || 'Image search failed' });
  return res.status(400).json({ message: err.message || 'Image search failed' });
});

export default router;
