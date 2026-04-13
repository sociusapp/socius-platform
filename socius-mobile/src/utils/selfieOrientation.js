import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Front-camera preview is usually mirrored; the saved JPEG is often in sensor
 * orientation, so left/right look swapped vs what the user saw. Flip once so
 * the stored image matches the mirrored preview (and matches ID comparison).
 */
export async function normalizeFrontCameraSelfieUri(uri) {
  if (!uri) return uri;
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ flip: ImageManipulator.FlipType.Horizontal }],
      { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (e) {
    console.warn('[selfieOrientation] horizontal flip failed', e?.message || e);
    return uri;
  }
}
