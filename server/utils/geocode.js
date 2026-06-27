function normalizeAddressText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function withTimeout(ms = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function fetchJson(url, options = {}, timeoutMs = 3500) {
  const timeout = withTimeout(timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: timeout.signal });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    return { response, data };
  } finally {
    timeout.clear();
  }
}

function fromNominatim(data, lat, lng) {
  const a = data?.address || {};
  const roadParts = [a.house_number, a.road].filter(Boolean).join(' ');
  const area = a.suburb || a.neighbourhood || a.quarter || a.road || a.hamlet || '';
  const district = a.city || a.town || a.village || a.county || a.municipality || a.state_district || '';
  const division = a.state || a.division || '';
  const landmark = a.amenity || a.shop || a.building || roadParts || area || '';
  return {
    latitude: lat,
    longitude: lng,
    address: normalizeAddressText(data?.display_name || [landmark, area, district, division, a.country].filter(Boolean).join(', ')),
    landmark,
    division,
    district,
    area,
  };
}

function fromBigDataCloud(data, lat, lng) {
  const locality = data?.locality || data?.city || data?.principalSubdivision || '';
  const admin = data?.localityInfo?.administrative || [];
  const informative = data?.localityInfo?.informative || [];
  const road = informative.find((x) => /road|street|route/i.test(x?.description || ''))?.name || '';
  const area = admin[3]?.name || admin[4]?.name || data?.locality || '';
  const parts = [road, data?.locality, data?.city, data?.principalSubdivision, data?.countryName].filter(Boolean);
  return {
    latitude: lat,
    longitude: lng,
    address: normalizeAddressText(data?.displayName || parts.join(', ')),
    landmark: road || area || locality,
    division: data?.principalSubdivision || '',
    district: locality,
    area,
  };
}

function fromGoogle(data, lat, lng) {
  const result = data?.results?.[0];
  const components = result?.address_components || [];
  const find = (type) => components.find((c) => c.types?.includes(type))?.long_name || '';
  const landmark = find('premise') || find('point_of_interest') || find('route') || find('neighborhood') || '';
  return {
    latitude: lat,
    longitude: lng,
    address: normalizeAddressText(result?.formatted_address),
    landmark,
    division: find('administrative_area_level_1'),
    district: find('locality') || find('administrative_area_level_2') || find('sublocality'),
    area: find('sublocality_level_1') || find('neighborhood') || find('route'),
  };
}

function hasUsefulAddress(parsed) {
  return Boolean(parsed?.address || parsed?.district || parsed?.area || parsed?.landmark || parsed?.division);
}

export async function reverseGeocode(lat, lng) {
  const attempts = [];

  const googleKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_GEOCODING_API_KEY;
  if (googleKey) {
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
      url.searchParams.set('latlng', `${lat},${lng}`);
      url.searchParams.set('key', googleKey);
      const { response, data } = await fetchJson(url, { headers: { Accept: 'application/json' } }, 4000);
      attempts.push(`google:${response.status}:${data?.status || 'unknown'}`);
      if (response.ok && data?.status === 'OK') {
        const parsed = fromGoogle(data, lat, lng);
        if (hasUsefulAddress(parsed)) return { address: parsed, provider: 'google' };
      }
    } catch (error) {
      attempts.push(`google:${error.name || error.message}`);
    }
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('zoom', '18');
    const { response, data } = await fetchJson(url, {
      headers: {
        'User-Agent': `${process.env.APP_NAME || 'Shoppy'} address-reverse-geocoder/1.0 (${process.env.SMTP_FROM || 'no-email-configured'})`,
        Accept: 'application/json',
      },
    }, 3500);
    attempts.push(`nominatim:${response.status}`);
    if (response.ok) {
      const parsed = fromNominatim(data, lat, lng);
      if (hasUsefulAddress(parsed)) return { address: parsed, provider: 'nominatim' };
    }
  } catch (error) {
    attempts.push(`nominatim:${error.name || error.message}`);
  }

  try {
    const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lng));
    url.searchParams.set('localityLanguage', 'en');
    const { response, data } = await fetchJson(url, { headers: { Accept: 'application/json' } }, 3500);
    attempts.push(`bigdatacloud:${response.status}`);
    if (response.ok) {
      const parsed = fromBigDataCloud(data, lat, lng);
      if (hasUsefulAddress(parsed)) return { address: parsed, provider: 'bigdatacloud' };
    }
  } catch (error) {
    attempts.push(`bigdatacloud:${error.name || error.message}`);
  }

  return {
    address: {
      latitude: lat,
      longitude: lng,
      address: 'Current location selected. Please type house/road/landmark for exact delivery.',
      landmark: '',
      division: '',
      district: '',
      area: '',
    },
    warning: 'Exact landmark could not be detected automatically. Please type house/road/landmark for exact delivery.',
    debug: process.env.NODE_ENV === 'production' ? undefined : attempts,
  };
}
