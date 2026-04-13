/**
 * Profile `cityArea` is stored as: "line1, city, state pincode"
 * State may contain spaces (e.g. "मधेश प्रदेश", "New York"). Pincode is digits at the end.
 */
export function parseCityAreaFromProfile(cityArea) {
  if (!cityArea || typeof cityArea !== 'string') {
    return { addressLine1: '', addressCity: '', addressState: '', addressPincodeZip: '' };
  }

  const parts = cityArea.split(',').map((p) => p.trim()).filter(Boolean);
  const addressLine1 = parts[0] || '';
  const addressCity = parts[1] || '';
  const rest = parts.slice(2).join(', ').trim();

  if (!rest) {
    return { addressLine1, addressCity, addressState: '', addressPincodeZip: '' };
  }

  const trailingPin = rest.match(/^(.+)\s+([0-9]{4,10})$/);
  if (trailingPin) {
    return {
      addressLine1,
      addressCity,
      addressState: trailingPin[1].trim(),
      addressPincodeZip: trailingPin[2],
    };
  }

  if (/^[0-9]{4,10}$/.test(rest)) {
    return { addressLine1, addressCity, addressState: '', addressPincodeZip: rest };
  }

  return {
    addressLine1,
    addressCity,
    addressState: rest,
    addressPincodeZip: '',
  };
}
