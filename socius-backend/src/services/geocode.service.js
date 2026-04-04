/**
 * Geocoding Service
 * Converts coordinates to human-readable address using OpenStreetMap Nominatim API
 */
const logger = require('../utils/logger');

/**
 * Reverse geocode - get address from coordinates
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<Object>} Address object
 */
const reverseGeocode = async (latitude, longitude) => {
  try {
    // OpenStreetMap Nominatim API (free, no API key needed for small usage)
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SociusLocationTracker/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || !data.address) {
      return null;
    }
    
    const addr = data.address;
    
    // Build display address
    const parts = [];
    if (addr.road) parts.push(addr.road);
    if (addr.suburb) parts.push(addr.suburb);
    if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
    if (addr.state) parts.push(addr.state);
    if (addr.country) parts.push(addr.country);
    
    return {
      displayAddress: data.display_name || parts.join(', '),
      city: addr.city || addr.town || addr.village || addr.suburb || null,
      state: addr.state || addr.state_district || null,
      country: addr.country || null,
      zipCode: addr.postcode || null,
    };
    
  } catch (error) {
    logger.error('Reverse geocoding failed:', error.message);
    return null;
  }
};

module.exports = {
  reverseGeocode,
};
