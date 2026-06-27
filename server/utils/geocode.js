function normalizeAddressText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function fromNominatim(data, lat, lng) {
  const a = data?.address || {};
  return {
    latitude: lat,
    longitude: lng,
    address: normalizeAddressText(data?.display_name),
    division: a.state || a.division || '',
    district: a.city || a.town || a.village || a.county || a.municipality || '',
    area: a.suburb || a.neighbourhood || a.quarter || a.road || '',
  };
}

function fromBigDataCloud(data, lat, lng) {
  const locality = data?.locality || data?.city || data?.principalSubdivision || '';
  const area = data?.localityInfo?.administrative?.[3]?.name || data?.localityInfo?.administrative?.[4]?.name || '';
  const parts = [
    data?.locality,
    data?.city,
    data?.principalSubdivision,
    data?.countryName,
  ].filter(Boolean);
  return {
    latitude: lat,
    longitude: lng,
    address: normalizeAddressText(data?.displayName || parts.join(', ')),
    division: data?.principalSubdivision || '',
    district: locality,
    area,
  };
}

export async function reverseGeocode(lat, lng) {
  const attempts = [];

  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('addressdetails', '1');
    const response = await fetch(url, {
      headers: {
        'User-Agent': `${process.env.APP_NAME || 'Shoppy'} address-reverse-geocoder/1.0 (${process.env.SMTP_FROM || 'no-email-configured'})`,
        'Accept': 'application/json',
      },
    });
    attempts.push(`nominatim:${response.status}`);
    if (response.ok) {
      const data = await response.json();
      const parsed = fromNominatim(data, lat, lng);
      if (parsed.address || parsed.district || parsed.area || parsed.division) return { address: parsed };
    }
  } catch (error) {
    attempts.push(`nominatim:${error.message}`);
  }

  try {
    const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lng));
    url.searchParams.set('localityLanguage', 'en');
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    attempts.push(`bigdatacloud:${response.status}`);
    if (response.ok) {
      const data = await response.json();
      const parsed = fromBigDataCloud(data, lat, lng);
      if (parsed.address || parsed.district || parsed.area || parsed.division) return { address: parsed };
    }
  } catch (error) {
    attempts.push(`bigdatacloud:${error.message}`);
  }

  return {
    address: { latitude: lat, longitude: lng, address: '', division: '', district: '', area: '' },
    warning: 'Location captured. Address text could not be detected automatically. Please type the address name before saving.',
    debug: process.env.NODE_ENV === 'production' ? undefined : attempts,
  };
}
