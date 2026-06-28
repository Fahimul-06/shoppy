import { api } from './api';

export type FlashSaleSlot = {
  title: string;
  startsAt?: string | null;
  endsAt?: string | null;
  active?: boolean;
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
};

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
  };
}

export function calculateCharges(subtotalAfterDiscount: number, settings: PlatformSettings) {
  const amount = Math.max(0, Number(subtotalAfterDiscount || 0));
  const deliveryCharge = amount >= Number(settings.freeDeliveryMin || 0) ? 0 : Number(settings.deliveryCharge || 0);
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

export function getCurrentFlashSaleSlot(settings: PlatformSettings, now = new Date()): FlashSaleSlot | null {
  const slots = normalizeFlashSaleSlots(settings.flashSaleSlots, settings.flashSaleStartsAt, settings.flashSaleEndsAt)
    .filter((slot) => slot.active !== false && slot.startsAt && slot.endsAt)
    .map((slot) => ({ ...slot, start: new Date(String(slot.startsAt)), end: new Date(String(slot.endsAt)) }))
    .filter((slot) => !Number.isNaN(slot.start.getTime()) && !Number.isNaN(slot.end.getTime()) && slot.end > now);

  const activeNow = slots
    .filter((slot) => slot.start <= now && slot.end > now)
    .sort((a, b) => a.end.getTime() - b.end.getTime())[0];
  if (activeNow) return { title: activeNow.title, startsAt: activeNow.startsAt, endsAt: activeNow.endsAt, active: activeNow.active };

  const next = slots
    .filter((slot) => slot.start > now)
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
  if (next) return { title: next.title, startsAt: next.startsAt, endsAt: next.endsAt, active: next.active };

  return null;
}
