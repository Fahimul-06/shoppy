import type { CSSProperties } from 'react';
import { api } from './api';

export type FlashSaleSlot = {
  title: string;
  startsAt?: string | null;
  endsAt?: string | null;
  active?: boolean;
};

export type SaleBannerSettings = {
  mode: 'color' | 'image';
  colorFrom: string;
  colorTo: string;
  image?: string;
};

export type ProductFrameSettings = {
  dailySaleFrame: string;
  flashSaleFrame: string;
  freeDeliveryFrame: string;
};

export type DailySaleFreeDeliveryRule = {
  enabled: boolean;
  type: 'product_count' | 'amount';
  productCount: number;
  amount: number;
};

export type PlatformSettings = {
  id?: string;
  deliveryCharge: number;
  freeDeliveryMin: number;
  platformFeeType: 'fixed' | 'percent';
  platformFee: number;
  vatPercent: number;
  flashSaleStartsAt?: string | null;
  flashSaleEndsAt?: string | null;
  flashSaleSlots?: FlashSaleSlot[];
  dailySaleBanner: SaleBannerSettings;
  flashSaleBanner: SaleBannerSettings;
  productFrames: ProductFrameSettings;
  dailySaleFreeDeliveryRule: DailySaleFreeDeliveryRule;
  categoryBanners: Record<string, string>;
};

export const defaultDailySaleBanner: SaleBannerSettings = {
  mode: 'color',
  colorFrom: '#f97316',
  colorTo: '#ef4444',
  image: '',
};

export const defaultFlashSaleBanner: SaleBannerSettings = {
  mode: 'color',
  colorFrom: '#dc2626',
  colorTo: '#f97316',
  image: '',
};

export const defaultProductFrames: ProductFrameSettings = {
  dailySaleFrame: '',
  flashSaleFrame: '',
  freeDeliveryFrame: '',
};

export const defaultDailySaleFreeDeliveryRule: DailySaleFreeDeliveryRule = {
  enabled: false,
  type: 'amount',
  productCount: 3,
  amount: 1500,
};

export const defaultPlatformSettings: PlatformSettings = {
  deliveryCharge: 120,
  freeDeliveryMin: 2000,
  platformFeeType: 'fixed',
  platformFee: 0,
  vatPercent: 0,
  flashSaleStartsAt: null,
  flashSaleEndsAt: null,
  flashSaleSlots: Array.from({ length: 6 }, (_, index) => ({
    title: `Slot ${index + 1}`,
    startsAt: null,
    endsAt: null,
    active: index === 0,
  })),
  dailySaleBanner: defaultDailySaleBanner,
  flashSaleBanner: defaultFlashSaleBanner,
  productFrames: defaultProductFrames,
  dailySaleFreeDeliveryRule: defaultDailySaleFreeDeliveryRule,
  categoryBanners: {},
};


function normalizeProductFrames(frames?: Partial<ProductFrameSettings> | null): ProductFrameSettings {
  return {
    dailySaleFrame: String(frames?.dailySaleFrame || '').trim(),
    flashSaleFrame: String(frames?.flashSaleFrame || '').trim(),
    freeDeliveryFrame: String(frames?.freeDeliveryFrame || '').trim(),
  };
}

function normalizeDailySaleFreeDeliveryRule(rule?: Partial<DailySaleFreeDeliveryRule> | null): DailySaleFreeDeliveryRule {
  return {
    enabled: rule?.enabled === true,
    type: rule?.type === 'product_count' ? 'product_count' : 'amount',
    productCount: Math.max(1, Math.floor(Number(rule?.productCount ?? defaultDailySaleFreeDeliveryRule.productCount))),
    amount: Math.max(0, Number(rule?.amount ?? defaultDailySaleFreeDeliveryRule.amount)),
  };
}

function normalizeCategoryBanners(banners?: Record<string, string> | Map<string, string> | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!banners) return out;
  const entries = banners instanceof Map ? Array.from(banners.entries()) : Object.entries(banners as Record<string, string>);
  entries.forEach(([key, value]) => {
    const slug = String(key || '').trim();
    const image = String(value || '').trim();
    if (slug && image) out[slug] = image;
  });
  return out;
}

function normalizeSaleBanner(banner: Partial<SaleBannerSettings> | undefined | null, defaults: SaleBannerSettings): SaleBannerSettings {
  const colorPattern = /^#[0-9a-fA-F]{6}$/;
  const colorFrom = typeof banner?.colorFrom === 'string' && colorPattern.test(banner.colorFrom) ? banner.colorFrom : defaults.colorFrom;
  const colorTo = typeof banner?.colorTo === 'string' && colorPattern.test(banner.colorTo) ? banner.colorTo : defaults.colorTo;
  const image = String(banner?.image || '').trim();
  return {
    mode: banner?.mode === 'image' && image ? 'image' : 'color',
    colorFrom,
    colorTo,
    image,
  };
}

export function normalizePlatformSettings(settings?: Partial<PlatformSettings> | null): PlatformSettings {
  return {
    ...defaultPlatformSettings,
    ...(settings || {}),
    deliveryCharge: Number(settings?.deliveryCharge ?? defaultPlatformSettings.deliveryCharge),
    freeDeliveryMin: Number(settings?.freeDeliveryMin ?? defaultPlatformSettings.freeDeliveryMin),
    platformFeeType: settings?.platformFeeType === 'percent' ? 'percent' : 'fixed',
    platformFee: Number(settings?.platformFee ?? defaultPlatformSettings.platformFee),
    vatPercent: Number(settings?.vatPercent ?? defaultPlatformSettings.vatPercent),
    flashSaleSlots: normalizeFlashSaleSlots(settings?.flashSaleSlots, settings?.flashSaleStartsAt, settings?.flashSaleEndsAt),
    dailySaleBanner: normalizeSaleBanner(settings?.dailySaleBanner, defaultDailySaleBanner),
    flashSaleBanner: normalizeSaleBanner(settings?.flashSaleBanner, defaultFlashSaleBanner),
    productFrames: normalizeProductFrames(settings?.productFrames),
    dailySaleFreeDeliveryRule: normalizeDailySaleFreeDeliveryRule(settings?.dailySaleFreeDeliveryRule),
    categoryBanners: normalizeCategoryBanners(settings?.categoryBanners as any),
  };
}

export function getSaleBannerStyle(banner: SaleBannerSettings): CSSProperties {
  if (banner.mode === 'image' && banner.image) {
    return {
      backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.58), rgba(0,0,0,.26)), url(${banner.image})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  return {
    backgroundImage: `linear-gradient(90deg, ${banner.colorFrom}, ${banner.colorTo})`,
  };
}

export function calculateCharges(subtotalAfterDiscount: number, settings: PlatformSettings, items: Array<{ product?: any; quantity?: number }> = []) {
  const amount = Math.max(0, Number(subtotalAfterDiscount || 0));
  const normalizedItems = Array.isArray(items) ? items : [];
  const hasManualFreeDeliveryProduct = normalizedItems.some((item) => Boolean(item?.product?.freeDelivery));
  const dailyRule = settings.dailySaleFreeDeliveryRule || defaultDailySaleFreeDeliveryRule;
  const dailyItems = normalizedItems.filter((item) => {
    const product = item?.product || {};
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

export async function fetchPublicPlatformSettings(): Promise<PlatformSettings> {
  const { settings } = await api.get<{ settings: PlatformSettings }>('/settings/public');
  return normalizePlatformSettings(settings);
}

export function normalizeFlashSaleSlots(slots?: FlashSaleSlot[] | null, legacyStart?: string | null, legacyEnd?: string | null): FlashSaleSlot[] {
  const source = Array.isArray(slots) && slots.length
    ? slots
    : [{ title: 'Slot 1', startsAt: legacyStart || null, endsAt: legacyEnd || null, active: true }];

  return Array.from({ length: 6 }, (_, index) => {
    const slot = source[index] || {} as FlashSaleSlot;
    return {
      title: slot.title || `Slot ${index + 1}`,
      startsAt: slot.startsAt || null,
      endsAt: slot.endsAt || null,
      active: slot.active !== false && Boolean(slot.startsAt || slot.endsAt || index === 0),
    };
  });
}

export type FlashSaleTiming = {
  slot: FlashSaleSlot | null;
  status: 'active' | 'upcoming' | 'ended';
  targetAt: string | null;
};

export function getFlashSaleTiming(settings: PlatformSettings, now = new Date()): FlashSaleTiming {
  const slots = normalizeFlashSaleSlots(settings.flashSaleSlots, settings.flashSaleStartsAt, settings.flashSaleEndsAt)
    .filter((slot) => slot.active !== false && slot.startsAt && slot.endsAt)
    .map((slot) => ({ ...slot, start: new Date(String(slot.startsAt)), end: new Date(String(slot.endsAt)) }))
    .filter((slot) => !Number.isNaN(slot.start.getTime()) && !Number.isNaN(slot.end.getTime()) && slot.end > slot.start);

  const activeNow = slots
    .filter((slot) => slot.start <= now && slot.end > now)
    .sort((a, b) => a.end.getTime() - b.end.getTime())[0];

  if (activeNow) {
    return {
      slot: { title: activeNow.title, startsAt: activeNow.startsAt, endsAt: activeNow.endsAt, active: activeNow.active },
      status: 'active',
      targetAt: activeNow.endsAt || null,
    };
  }

  const next = slots
    .filter((slot) => slot.start > now)
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0];

  if (next) {
    return {
      slot: { title: next.title, startsAt: next.startsAt, endsAt: next.endsAt, active: next.active },
      status: 'upcoming',
      targetAt: next.startsAt || null,
    };
  }

  const legacyEnd = settings.flashSaleEndsAt ? new Date(settings.flashSaleEndsAt) : null;
  if (legacyEnd && !Number.isNaN(legacyEnd.getTime()) && legacyEnd > now) {
    return {
      slot: { title: 'Flash Sale', startsAt: settings.flashSaleStartsAt || null, endsAt: settings.flashSaleEndsAt, active: true },
      status: 'active',
      targetAt: settings.flashSaleEndsAt || null,
    };
  }

  return { slot: null, status: 'ended', targetAt: null };
}

export function getCurrentFlashSaleSlot(settings: PlatformSettings, now = new Date()): FlashSaleSlot | null {
  return getFlashSaleTiming(settings, now).slot;
}


export function getProductFrameImage(product: any, settings: PlatformSettings): string {
  const tags = Array.isArray(product?.saleTags) ? product.saleTags : [];
  const currentSaleType = product?.currentSaleType;
  if ((currentSaleType === 'flash' || tags.includes('flash')) && settings.productFrames.flashSaleFrame) {
    return settings.productFrames.flashSaleFrame;
  }
  if ((currentSaleType === 'daily' || tags.includes('daily')) && settings.productFrames.dailySaleFrame) {
    return settings.productFrames.dailySaleFrame;
  }
  if (product?.freeDelivery === true && settings.productFrames.freeDeliveryFrame) {
    return settings.productFrames.freeDeliveryFrame;
  }
  return '';
}
