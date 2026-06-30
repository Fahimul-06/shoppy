import express from 'express';
import PlatformSetting from '../models/PlatformSetting.js';

const router = express.Router();

const defaults = {
  key: 'default',
  deliveryCharge: 120,
  freeDeliveryMin: 2000,
  platformFeeType: 'fixed',
  platformFee: 0,
  vatPercent: 0,
  flashSaleStartsAt: null,
  flashSaleEndsAt: null,
  flashSaleSlots: [],
  dailySaleBanner: { mode: 'color', colorFrom: '#f97316', colorTo: '#ef4444', image: '' },
  flashSaleBanner: { mode: 'color', colorFrom: '#dc2626', colorTo: '#f97316', image: '' },
  productFrames: { dailySaleFrame: '', flashSaleFrame: '', freeDeliveryFrame: '' },
  dailySaleFreeDeliveryRule: { enabled: false, type: 'amount', productCount: 3, amount: 1500 },
  categoryBanners: {},
};

export async function getPlatformSettings() {
  const settings = await PlatformSetting.findOneAndUpdate(
    { key: 'default' },
    { $setOnInsert: defaults },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return settings;
}

export function calculateOrderCharges(subtotalAfterDiscount, settings, items = []) {
  const amount = Math.max(0, Number(subtotalAfterDiscount || 0));
  const normalizedItems = Array.isArray(items) ? items : [];
  const hasManualFreeDeliveryProduct = normalizedItems.some((item) => Boolean(item?.product?.freeDelivery || item?.productSnapshot?.freeDelivery));
  const dailyRule = settings?.dailySaleFreeDeliveryRule || {};
  const dailyItems = normalizedItems.filter((item) => {
    const product = item?.product || item?.productSnapshot || {};
    const tags = Array.isArray(product.saleTags) ? product.saleTags : [];
    return tags.includes('daily') || product.currentSaleType === 'daily';
  });
  const dailyQty = dailyItems.reduce((sum, item) => sum + Math.max(1, Number(item?.quantity || 1)), 0);
  const dailyRuleMatched = dailyRule.enabled === true && (
    dailyRule.type === 'product_count'
      ? dailyQty >= Number(dailyRule.productCount || 0)
      : amount >= Number(dailyRule.amount || 0)
  );
  const minFreeDeliveryMatched = amount >= Number(settings.freeDeliveryMin || 0);
  const deliveryCharge = (hasManualFreeDeliveryProduct || dailyRuleMatched || minFreeDeliveryMatched) ? 0 : Number(settings.deliveryCharge || 0);
  const platformFee = settings.platformFeeType === 'percent'
    ? Math.round((amount * Number(settings.platformFee || 0)) / 100)
    : Number(settings.platformFee || 0);
  const vatAmount = Math.round(((amount + deliveryCharge + platformFee) * Number(settings.vatPercent || 0)) / 100);
  const total = Math.max(0, amount + deliveryCharge + platformFee + vatAmount);
  return { deliveryCharge, platformFee, vatAmount, total };
}

router.get('/public', async (_req, res) => {
  const settings = await getPlatformSettings();
  res.json({ settings });
});

export default router;
