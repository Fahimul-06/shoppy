const DEFAULT_ADMIN_PORTAL_SLUG = 'secure-shoppy-admin';
const DEFAULT_SELLER_PORTAL_SLUG = 'secure-shoppy-seller';
const DEFAULT_DELIVERY_PORTAL_SLUG = 'secure-shoppy-delivery';

function cleanSlug(value: unknown, fallback: string) {
  const raw = String(value || '').trim();
  const withoutSlash = raw.replace(/^\/+|\/+$/g, '');
  return withoutSlash || fallback;
}

export const ADMIN_PORTAL_SLUG = cleanSlug(import.meta.env.VITE_ADMIN_PORTAL_SLUG, DEFAULT_ADMIN_PORTAL_SLUG);
export const ADMIN_PORTAL_PATH = `/${ADMIN_PORTAL_SLUG}`;
export const ADMIN_LOGIN_PATH = `${ADMIN_PORTAL_PATH}/login`;

export const SELLER_PORTAL_SLUG = cleanSlug(import.meta.env.VITE_SELLER_PORTAL_SLUG, DEFAULT_SELLER_PORTAL_SLUG);
export const SELLER_PORTAL_PATH = `/${SELLER_PORTAL_SLUG}`;
export const SELLER_LOGIN_PATH = `${SELLER_PORTAL_PATH}/login`;
export const SELLER_REGISTER_PATH = `${SELLER_PORTAL_PATH}/register`;
export const SELLER_DASHBOARD_PATH = `${SELLER_PORTAL_PATH}/dashboard`;

export const DELIVERY_PORTAL_SLUG = cleanSlug(import.meta.env.VITE_DELIVERY_PORTAL_SLUG, DEFAULT_DELIVERY_PORTAL_SLUG);
export const DELIVERY_PORTAL_PATH = `/${DELIVERY_PORTAL_SLUG}`;
export const DELIVERY_LOGIN_PATH = `${DELIVERY_PORTAL_PATH}/login`;
export const DELIVERY_DASHBOARD_PATH = DELIVERY_PORTAL_PATH;
export const DELIVERY_ORDERS_PATH = `${DELIVERY_PORTAL_PATH}/orders`;
export const DELIVERY_SUPPORT_PATH = `${DELIVERY_PORTAL_PATH}/support`;

export function isAdminPortalPath(pathname: string) {
  return pathname === ADMIN_PORTAL_PATH || pathname.startsWith(`${ADMIN_PORTAL_PATH}/`);
}

export function isSellerPortalPath(pathname: string) {
  return pathname === SELLER_PORTAL_PATH || pathname.startsWith(`${SELLER_PORTAL_PATH}/`);
}

export function isDeliveryPortalPath(pathname: string) {
  return pathname === DELIVERY_PORTAL_PATH || pathname.startsWith(`${DELIVERY_PORTAL_PATH}/`);
}
