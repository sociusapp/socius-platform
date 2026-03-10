import * as Location from 'expo-location';

const requestLocationPermission = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
};

const getCurrentPosition = async () => {
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return position;
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

export { requestLocationPermission, getCurrentPosition, reverseGeocode };
