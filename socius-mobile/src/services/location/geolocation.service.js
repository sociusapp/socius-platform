import * as Location from 'expo-location';
import Constants from 'expo-constants';

const bundledGoogleApiKey = Constants.expoConfig?.android?.config?.googleMaps?.apiKey ?? null;

const requestLocationPermission = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
};

const getCurrentPosition = async ({
  timeoutMs = 7000,
  fallbackToLastKnown = true,
  accuracy = Location.Accuracy.High,
} = {}) => {
  const getPos = Location.getCurrentPositionAsync({ accuracy });
  if (!timeoutMs || timeoutMs <= 0) {
    return await getPos;
  }

  const withTimeout = new Promise((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error('Location timeout'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([getPos, withTimeout]);
  } catch (e) {
    if (fallbackToLastKnown) {
      try {
        const last = await Location.getLastKnownPositionAsync({});
        if (last) return last;
      } catch (e2) { }
    }
    throw e;
  }
};

const reverseGeocode = async ({ latitude, longitude }) => {
  const results = await Location.reverseGeocodeAsync({
    latitude,
    longitude,
  });
  if (!results || results.length === 0) {
    return null;
  }
  return results[0];
};

const nearbyPlaceCache = new Map();

const getGooglePlacesApiKey = () => {
  return (
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    bundledGoogleApiKey ||
    null
  );
};

const getNearbyPlaceName = async ({ latitude, longitude }) => {
  const key = getGooglePlacesApiKey();
  if (!key) return null;

  const cacheKey = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
  if (nearbyPlaceCache.has(cacheKey)) {
    return nearbyPlaceCache.get(cacheKey) || null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${encodeURIComponent(
      `${latitude},${longitude}`
    )}&rankby=distance&type=point_of_interest&key=${encodeURIComponent(key)}`;

    const res = await fetch(url);
    const body = await res.json();

    if (!body || body.status !== 'OK' || !Array.isArray(body.results)) {
      if (__DEV__) {
        console.log('[Location] placesNearby status', body?.status, body?.error_message);
      }
      nearbyPlaceCache.set(cacheKey, null);
      return null;
    }

    const first = body.results[0];
    const name = typeof first?.name === 'string' ? first.name.trim() : '';
    const out = name || null;
    nearbyPlaceCache.set(cacheKey, out);
    return out;
  } catch (e) {
    if (__DEV__) {
      console.log('[Location] placesNearby error', e?.message || e);
    }
    nearbyPlaceCache.set(cacheKey, null);
    return null;
  }
};

const formatLocationLabel = (
  place,
  { preferPoi = true, fallback = 'Location on' } = {}
) => {
  if (!place) {
    return fallback;
  }

  const clean = (value) => (typeof value === 'string' ? value.trim() : '');
  const dedupePush = (arr, value) => {
    const v = clean(value);
    if (!v) return;
    if (arr.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    arr.push(v);
  };

  const splitAddress = (value) => {
    const v = clean(value);
    if (!v) return [];
    return v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const city = clean(place.city || place.subLocality || place.subregion || place.locality);
  const district = clean(place.district || place.subregion || place.county);
  const region = clean(place.region || place.state);
  const country = clean(place.country);

  const poi = clean(place.name);
  const formattedParts = splitAddress(place.formattedAddress);
  const formattedLandmark =
    formattedParts.length >= 2 ? clean(formattedParts[1]) : '';

  const isGenericPoi =
    !poi ||
    /unnamed/i.test(poi) ||
    poi.length < 3 ||
    [city, district, region, country].some(
      (x) => x && x.toLowerCase() === poi.toLowerCase()
    );

  const parts = [];

  if (preferPoi) {
    if (!isGenericPoi) {
      dedupePush(parts, poi);
    } else {
      const candidate = formattedLandmark;
      const isBadCandidate =
        !candidate ||
        candidate.length < 4 ||
        [poi, city, district, region, country].some(
          (x) => x && x.toLowerCase() === candidate.toLowerCase()
        );
      if (!isBadCandidate) {
        dedupePush(parts, candidate);
      }
    }
  }

  dedupePush(parts, city);
  dedupePush(parts, district);

  if (!district) {
    dedupePush(parts, region);
  }

  if (parts.length) {
    return parts.join(', ');
  }

  return fallback;
};

export {
  requestLocationPermission,
  getCurrentPosition,
  reverseGeocode,
  getNearbyPlaceName,
  formatLocationLabel,
};
