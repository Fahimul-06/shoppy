export type GeoAddress = {
  address?: string;
  division?: string;
  district?: string;
  area?: string;
};

const clean = (value: unknown) => String(value || '').replace(/\s+/g, ' ').trim();

function parseNominatim(data: any): GeoAddress {
  const a = data?.address || {};
  return {
    address: clean(data?.display_name),
    division: clean(a.state || a.division),
    district: clean(a.city || a.town || a.village || a.county || a.municipality),
    area: clean(a.suburb || a.neighbourhood || a.quarter || a.road || a.hamlet),
  };
}

function parseBigDataCloud(data: any): GeoAddress {
  const parts = [data?.locality, data?.city, data?.principalSubdivision, data?.countryName].filter(Boolean);
  const admin = data?.localityInfo?.administrative || [];
  return {
    address: clean(data?.displayName || parts.join(', ')),
    division: clean(data?.principalSubdivision),
    district: clean(data?.city || data?.locality || data?.principalSubdivision),
    area: clean(admin?.[4]?.name || admin?.[3]?.name || data?.locality),
  };
}

// Last-resort approximation so the UI never exposes raw latitude/longitude to users.
function approximateBangladeshAddress(lat: number, lng: number): GeoAddress {
  const points = [
    { name: 'Mirpur, Dhaka, Bangladesh', area: 'Mirpur', district: 'Dhaka', division: 'Dhaka', lat: 23.8223, lng: 90.3654 },
    { name: 'Dhanmondi, Dhaka, Bangladesh', area: 'Dhanmondi', district: 'Dhaka', division: 'Dhaka', lat: 23.7465, lng: 90.3760 },
    { name: 'Gulshan, Dhaka, Bangladesh', area: 'Gulshan', district: 'Dhaka', division: 'Dhaka', lat: 23.7925, lng: 90.4078 },
    { name: 'Uttara, Dhaka, Bangladesh', area: 'Uttara', district: 'Dhaka', division: 'Dhaka', lat: 23.8759, lng: 90.3795 },
    { name: 'Banani, Dhaka, Bangladesh', area: 'Banani', district: 'Dhaka', division: 'Dhaka', lat: 23.7937, lng: 90.4066 },
    { name: 'Mohammadpur, Dhaka, Bangladesh', area: 'Mohammadpur', district: 'Dhaka', division: 'Dhaka', lat: 23.7662, lng: 90.3589 },
    { name: 'Bashundhara R/A, Dhaka, Bangladesh', area: 'Bashundhara R/A', district: 'Dhaka', division: 'Dhaka', lat: 23.8103, lng: 90.4244 },
    { name: 'Motijheel, Dhaka, Bangladesh', area: 'Motijheel', district: 'Dhaka', division: 'Dhaka', lat: 23.7330, lng: 90.4172 },
    { name: 'Chattogram, Bangladesh', area: 'Chattogram', district: 'Chattogram', division: 'Chattogram', lat: 22.3569, lng: 91.7832 },
    { name: 'Sylhet, Bangladesh', area: 'Sylhet', district: 'Sylhet', division: 'Sylhet', lat: 24.8949, lng: 91.8687 },
    { name: 'Rajshahi, Bangladesh', area: 'Rajshahi', district: 'Rajshahi', division: 'Rajshahi', lat: 24.3745, lng: 88.6042 },
    { name: 'Khulna, Bangladesh', area: 'Khulna', district: 'Khulna', division: 'Khulna', lat: 22.8456, lng: 89.5403 },
  ];
  const nearest = points
    .map((p) => ({ ...p, d: Math.hypot(lat - p.lat, lng - p.lng) }))
    .sort((a, b) => a.d - b.d)[0];
  if (nearest && nearest.d < 0.35) {
    return { address: nearest.name, area: nearest.area, district: nearest.district, division: nearest.division };
  }
  return { address: 'Current location address selected', area: '', district: '', division: '' };
}

export async function reverseGeocodeInBrowser(lat: number, lng: number): Promise<GeoAddress> {
  const controllers: AbortController[] = [];
  const timeout = (controller: AbortController) => setTimeout(() => controller.abort(), 7000);

  try {
    const c = new AbortController(); controllers.push(c); const t = timeout(c);
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&localityLanguage=en`;
    const response = await fetch(url, { signal: c.signal }); clearTimeout(t);
    if (response.ok) {
      const parsed = parseBigDataCloud(await response.json());
      if (parsed.address || parsed.district || parsed.area) return parsed;
    }
  } catch {}

  try {
    const c = new AbortController(); controllers.push(c); const t = timeout(c);
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&addressdetails=1`;
    const response = await fetch(url, { signal: c.signal, headers: { Accept: 'application/json' } }); clearTimeout(t);
    if (response.ok) {
      const parsed = parseNominatim(await response.json());
      if (parsed.address || parsed.district || parsed.area) return parsed;
    }
  } catch {}

  return approximateBangladeshAddress(lat, lng);
}
