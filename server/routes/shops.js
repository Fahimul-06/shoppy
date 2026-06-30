import express from 'express';
import mongoose from 'mongoose';
import Seller from '../models/Seller.js';
import Product from '../models/Product.js';
import ProductReview from '../models/ProductReview.js';

const router = express.Router();

const publicSellerShop = (seller, stats = {}) => ({
  id: String(seller._id || seller.id),
  name: seller.name || '',
  shopName: seller.shopName || seller.name || 'Seller Shop',
  shopLogo: seller.shopLogo || '',
  shopBanner: seller.shopBanner || '',
  shopAddress: seller.shopAddress || '',
  businessType: seller.businessType || '',
  status: seller.status || '',
  rating: Number(stats.rating || 0),
  reviewCount: Number(stats.reviewCount || 0),
  productCount: Number(stats.productCount || 0),
  soldCount: Number(stats.soldCount || 0),
});

router.get('/:id', async (req, res) => {
  const sellerId = String(req.params.id || '').trim();
  if (!mongoose.Types.ObjectId.isValid(sellerId)) {
    return res.status(400).json({ message: 'Invalid seller shop id' });
  }

  const seller = await Seller.findById(sellerId).lean();
  if (!seller || seller.status === 'blocked' || seller.status === 'rejected') {
    return res.status(404).json({ message: 'Seller shop not found' });
  }

  const products = await Product.find({ seller: seller._id, active: { $ne: false } })
    .populate('seller', 'name shopName shopLogo shopBanner shopAddress status')
    .sort({ createdAt: -1 })
    .lean();

  const productIds = products.map((p) => p._id);
  const reviewAgg = productIds.length
    ? await ProductReview.aggregate([
        { $match: { product: { $in: productIds } } },
        { $group: { _id: null, rating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
      ])
    : [];

  const rating = reviewAgg[0]?.rating || products.reduce((sum, p) => sum + Number(p.rating || 0), 0) / Math.max(products.filter((p) => Number(p.rating || 0) > 0).length, 1);
  const reviewCount = reviewAgg[0]?.reviewCount || products.reduce((sum, p) => sum + Number(p.reviewCount || 0), 0);

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
  res.json({
    seller: publicSellerShop(seller, {
      rating: Number.isFinite(rating) ? Number(rating.toFixed(1)) : 0,
      reviewCount,
      productCount: products.length,
      soldCount: products.reduce((sum, p) => sum + Number(p.soldCount || 0), 0),
    }),
    products,
    categories,
  });
});

export default router;
