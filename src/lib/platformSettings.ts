import { api } from './api';

export type PlatformSettings = {
  id?: string;
  deliveryCharge: number;
  freeDeliveryMin: number;
  platformFeeType: 'fixed' | 'percent';
  platformFee: number;
  vatPercent: number;
  flashSaleStartsAt?: string | null;
  flashSaleEndsAt?: string | null;
};

export const defaultPlatformSettings: PlatformSettings = {
  deliveryCharge: 120,
  freeDeliveryMin: 2000,
  platformFeeType: 'fixed',
  platformFee: 0,
  vatPercent: 0,
  flashSaleStartsAt: null,
  flashSaleEndsAt: null,
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
