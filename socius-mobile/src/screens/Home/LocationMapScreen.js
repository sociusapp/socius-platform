import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import { useResponsive } from '../../utils/responsive';
import { loadAuth, loadLastKnownLocation, saveLastKnownLocation } from '../../services/storage/asyncStorage.service';
import { requestLocationPermission, getCurrentPosition, reverseGeocode, formatLocationLabel } from '../../services/location/geolocation.service';
import { getNearbyUsers } from '../../services/api/user.api';

const DEFAULT_DELTA = 0.01;
const FALLBACK_REGION = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 5,
  longitudeDelta: 5,
};
const INSIDE_RADIUS_METERS = 500;
const FETCH_RADIUS_METERS = 5000;
const COLORS = {
  availableIn: { fill: '#22C55E', stroke: '#15803D' },
  availableOut: { fill: '#86EFAC', stroke: '#22C55E' },
  notIn: { fill: '#EF4444', stroke: '#B91C1C' },
  notOut: { fill: '#FCA5A5', stroke: '#EF4444' },
};

const LocationMapScreen = ({ navigation }) => {
  const { ms, spacing, vscale, scale } = useResponsive();
  const mapRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [coords, setCoords] = useState(null);
  const [label, setLabel] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [useWebMap, setUseWebMap] = useState(false);
  const [nearbyUsers, setNearbyUsers] = useState([]);

  const region = useMemo(() => {
    if (!coords) return null;
    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      latitudeDelta: DEFAULT_DELTA,
      longitudeDelta: DEFAULT_DELTA,
    };
  }, [coords]);

  const mapInitialRegion = region || FALLBACK_REGION;

  const leafletHtml = useMemo(() => {
    const centerLat = region?.latitude ?? FALLBACK_REGION.latitude;
    const centerLng = region?.longitude ?? FALLBACK_REGION.longitude;
    const safeLat = Number.isFinite(centerLat) ? centerLat : FALLBACK_REGION.latitude;
    const safeLng = Number.isFinite(centerLng) ? centerLng : FALLBACK_REGION.longitude;
    const zoom = region ? 15 : 5;
    const circleRadius = INSIDE_RADIUS_METERS;
    const points = Array.isArray(nearbyUsers)
      ? nearbyUsers
          .map((u) => ({
            latitude: Number(u?.latitude),
            longitude: Number(u?.longitude),
            isAvailable: !!u?.isAvailable,
            distanceMeters: Number(u?.distanceMeters),
          }))
          .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
      : [];
    const pointsJson = JSON.stringify(points);
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; }
      .leaflet-control-attribution { display: none; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>
    <script>
      const center = [${safeLat}, ${safeLng}];
      const map = L.map('map', { zoomControl: true }).setView(center, ${zoom});
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);
      L.marker(center).addTo(map);
      L.circle(center, { radius: ${circleRadius}, color: '#DC5C69', weight: 2, fillColor: '#DC5C69', fillOpacity: 0.12 }).addTo(map);
      const users = ${pointsJson};
      users.forEach((p) => {
        const inside = Number.isFinite(p.distanceMeters) ? p.distanceMeters <= ${INSIDE_RADIUS_METERS} : false;
        const isAvailable = !!p.isAvailable;
        const fillColor = isAvailable ? (inside ? '${COLORS.availableIn.fill}' : '${COLORS.availableOut.fill}') : (inside ? '${COLORS.notIn.fill}' : '${COLORS.notOut.fill}');
        const strokeColor = isAvailable ? (inside ? '${COLORS.availableIn.stroke}' : '${COLORS.availableOut.stroke}') : (inside ? '${COLORS.notIn.stroke}' : '${COLORS.notOut.stroke}');
        L.circleMarker([p.latitude, p.longitude], {
          radius: inside ? 5 : 4,
          color: strokeColor,
          weight: 2,
          fillColor: fillColor,
          fillOpacity: inside ? 0.9 : 0.75
        }).addTo(map);
      });
    </script>
  </body>
</html>`;
  }, [region, nearbyUsers]);

  const classified = useMemo(() => {
    const list = Array.isArray(nearbyUsers) ? nearbyUsers : [];
    const out = { inAvailable: 0, inNot: 0, outAvailable: 0, outNot: 0 };
    list.forEach((u) => {
      const d = Number(u?.distanceMeters);
      const inside = Number.isFinite(d) ? d <= INSIDE_RADIUS_METERS : false;
      const isAvailable = !!u?.isAvailable;
      if (inside && isAvailable) out.inAvailable += 1;
      else if (inside && !isAvailable) out.inNot += 1;
      else if (!inside && isAvailable) out.outAvailable += 1;
      else out.outNot += 1;
    });
    return out;
  }, [nearbyUsers]);

  const getDotColors = useCallback((u) => {
    const d = Number(u?.distanceMeters);
    const inside = Number.isFinite(d) ? d <= INSIDE_RADIUS_METERS : false;
    const isAvailable = !!u?.isAvailable;
    if (isAvailable && inside) return COLORS.availableIn;
    if (isAvailable && !inside) return COLORS.availableOut;
    if (!isAvailable && inside) return COLORS.notIn;
    return COLORS.notOut;
  }, []);

  const openExternalMap = useCallback(() => {
    const lat = region?.latitude;
    const lng = region?.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent('My location')}@${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent('My location')})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  }, [region]);

  const refreshLocation = useCallback(async () => {
    setErrorText('');
    setLoading(true);
    try {
      const ok = await requestLocationPermission();
      if (!ok) {
        setErrorText('Location permission is required to show the map.');
        return;
      }

      const position = await getCurrentPosition({ timeoutMs: 7000, fallbackToLastKnown: true });
      const latitude = position?.coords?.latitude;
      const longitude = position?.coords?.longitude;
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        setErrorText('Unable to get your current location.');
        return;
      }

      let nextLabel = '';
      try {
        const geo = await reverseGeocode({ latitude, longitude });
        nextLabel = formatLocationLabel(geo);
      } catch (e) { }

      setCoords({ latitude, longitude });
      setLabel(nextLabel);
      setMapReady(false);
      setUseWebMap(false);
      saveLastKnownLocation({ label: nextLabel, latitude, longitude, updatedAt: Date.now() }).catch(() => {});
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.animateToRegion(
            {
              latitude,
              longitude,
              latitudeDelta: DEFAULT_DELTA,
              longitudeDelta: DEFAULT_DELTA,
            },
            220
          );
        }
      }, 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const cached = await loadLastKnownLocation();
        if (typeof cached?.latitude === 'number' && typeof cached?.longitude === 'number') {
          setCoords({ latitude: cached.latitude, longitude: cached.longitude });
        }
        if (cached?.label) {
          setLabel(cached.label);
        }
        const stale = !cached?.updatedAt || Date.now() - cached.updatedAt > 2 * 60 * 1000;
        if (stale) {
          await refreshLocation();
          return;
        }
      } catch (e) {
        setErrorText('Unable to load location.');
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshLocation]);

  useEffect(() => {
    if (!region) return;
    if (useWebMap) return;
    if (mapReady) return;
    const t = setTimeout(() => {
      if (!mapReady) {
        setUseWebMap(true);
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [region, mapReady, useWebMap]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!region) {
        setNearbyUsers([]);
        return;
      }
      try {
        const auth = await loadAuth();
        const token = auth?.accessToken;
        if (!token) {
          setNearbyUsers([]);
          return;
        }
        const res = await getNearbyUsers(token, {
          latitude: region.latitude,
          longitude: region.longitude,
          radiusMeters: FETCH_RADIUS_METERS,
        });
        const users = res?.data?.users ?? res?.users ?? [];
        if (!cancelled) {
          setNearbyUsers(Array.isArray(users) ? users : []);
        }
      } catch (e) {
        if (!cancelled) {
          setNearbyUsers([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [region]);

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header onBackPress={() => navigation.goBack()} />
        <View style={[styles.webCard, { padding: spacing(18), borderRadius: scale(16) }]}>
          <Icon name="map-outline" size={scale(26)} color="#94A3B8" />
          <Text style={[styles.webTitle, { fontSize: ms(16), marginTop: vscale(10) }]}>Map view</Text>
          <Text style={[styles.webBody, { fontSize: ms(13), marginTop: vscale(6) }]}>
            This map screen is available on mobile devices.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={{ padding: scale(8) }}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <Icon name="cog" size={scale(24)} color="#999999" />
          </TouchableOpacity>
        }
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />

      <View style={styles.body}>
        <View style={styles.mapWrap}>
          {useWebMap ? (
            <WebView
              originWhitelist={['*']}
              source={{ html: leafletHtml }}
              style={styles.map}
              onLoadEnd={() => setMapReady(true)}
            />
          ) : (
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={mapInitialRegion}
              showsUserLocation
              showsMyLocationButton={false}
              loadingEnabled
              onMapReady={() => setMapReady(true)}
              scrollEnabled
              zoomEnabled
              rotateEnabled
              pitchEnabled
            >
              {region ? (
                <>
                  <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} />
                  <Circle
                    center={{ latitude: region.latitude, longitude: region.longitude }}
                    radius={INSIDE_RADIUS_METERS}
                    strokeWidth={2}
                    strokeColor="#DC5C69"
                    fillColor="rgba(220, 92, 105, 0.12)"
                  />
                  {nearbyUsers.map((u, idx) => {
                    const lat = Number(u?.latitude);
                    const lng = Number(u?.longitude);
                    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
                    const c = getDotColors(u);
                    return (
                      <Marker
                        key={String(u?.id || idx)}
                        coordinate={{ latitude: lat, longitude: lng }}
                        anchor={{ x: 0.5, y: 0.5 }}
                      >
                        <View style={[styles.userDot, { backgroundColor: c.fill, borderColor: c.stroke }]} />
                      </Marker>
                    );
                  })}
                </>
              ) : null}
            </MapView>
          )}

          {(!mapReady || loading) && (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <ActivityIndicator color="#DC5C69" />
            </View>
          )}

          <View style={[styles.topOverlay, { paddingHorizontal: spacing(16), paddingTop: vscale(12) }]} pointerEvents="box-none">
            <View style={[styles.locationCard, { borderRadius: scale(16), paddingVertical: vscale(10), paddingHorizontal: spacing(12) }]}>
              <View style={styles.locationRow}>
                <Icon name="map-marker" size={scale(16)} color="#DC5C69" />
                <Text style={[styles.locationTitle, { fontSize: ms(13), marginLeft: spacing(8) }]} numberOfLines={2}>
                  {label || 'Your current area'}
                </Text>
              </View>
              <View style={[styles.metaRow, { marginTop: vscale(8) }]}>
                <View style={[styles.chip, { borderRadius: scale(999), paddingVertical: vscale(6), paddingHorizontal: spacing(10) }]}>
                  <Icon name="radius-outline" size={scale(16)} color="#6B7280" />
                  <Text style={[styles.chipText, { fontSize: ms(12), marginLeft: spacing(6) }]}>{INSIDE_RADIUS_METERS}m</Text>
                </View>
                <View style={[styles.chip, { borderRadius: scale(999), paddingVertical: vscale(6), paddingHorizontal: spacing(10), marginLeft: spacing(10) }]}>
                  <Icon name="account-multiple-outline" size={scale(16)} color="#6B7280" />
                  <Text style={[styles.chipText, { fontSize: ms(12), marginLeft: spacing(6) }]}>{nearbyUsers.length} in {FETCH_RADIUS_METERS / 1000}km</Text>
                </View>
                <View style={[styles.chip, { borderRadius: scale(999), paddingVertical: vscale(6), paddingHorizontal: spacing(10), marginLeft: spacing(10) }]}>
                  <Icon name={useWebMap ? "map-outline" : "google-maps"} size={scale(16)} color="#6B7280" />
                  <Text style={[styles.chipText, { fontSize: ms(12), marginLeft: spacing(6) }]}>{useWebMap ? 'OSM' : 'Google'}</Text>
                </View>
              </View>
              <View style={[styles.countRow, { marginTop: vscale(8) }]}>
                <Text style={[styles.countText, { fontSize: ms(12) }]}>
                  Inside {INSIDE_RADIUS_METERS}m: <Text style={styles.countStrong}>{classified.inAvailable + classified.inNot}</Text>
                </Text>
                <Text style={[styles.countText, { fontSize: ms(12), marginLeft: spacing(12) }]}>
                  Outside: <Text style={styles.countStrong}>{classified.outAvailable + classified.outNot}</Text>
                </Text>
              </View>
            </View>
          </View>
        </View>

        {errorText ? (
          <View style={[styles.errorCard, { borderRadius: scale(16), paddingVertical: vscale(10), paddingHorizontal: spacing(12), marginHorizontal: spacing(16), marginTop: vscale(10) }]}>
            <View style={styles.errorRow}>
              <Icon name="alert-circle-outline" size={scale(18)} color="#DC5C69" />
              <Text style={[styles.errorText, { fontSize: ms(13), marginLeft: spacing(8) }]}>{errorText}</Text>
            </View>
          </View>
        ) : null}

        <View style={[styles.bottomSheet, { paddingHorizontal: spacing(16), paddingTop: vscale(12), paddingBottom: vscale(16) }]}>
          <View style={[styles.sheetHandle, { width: scale(44), height: vscale(4), borderRadius: scale(2), marginBottom: vscale(10) }]} />
          <View style={[styles.legendRow, { marginBottom: vscale(10) }]}>
            <View style={styles.legendItem}>
              <View style={styles.legendYouDot} />
              <Text style={[styles.legendText, { fontSize: ms(12), marginLeft: spacing(8) }]}>You</Text>
            </View>
            <View style={[styles.legendItem, { marginLeft: spacing(16) }]}>
              <View style={styles.legendCircle} />
              <Text style={[styles.legendText, { fontSize: ms(12), marginLeft: spacing(8) }]}>{INSIDE_RADIUS_METERS}m radius</Text>
            </View>
          </View>
          <View style={[styles.legendRow, { marginBottom: vscale(10) }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendOtherDot, { backgroundColor: COLORS.availableIn.fill, borderColor: COLORS.availableIn.stroke }]} />
              <Text style={[styles.legendText, { fontSize: ms(12), marginLeft: spacing(8) }]}>Available (in)</Text>
            </View>
            <View style={[styles.legendItem, { marginLeft: spacing(16) }]}>
              <View style={[styles.legendOtherDot, { backgroundColor: COLORS.availableOut.fill, borderColor: COLORS.availableOut.stroke }]} />
              <Text style={[styles.legendText, { fontSize: ms(12), marginLeft: spacing(8) }]}>Available (out)</Text>
            </View>
          </View>
          <View style={[styles.legendRow, { marginBottom: vscale(10) }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendOtherDot, { backgroundColor: COLORS.notIn.fill, borderColor: COLORS.notIn.stroke }]} />
              <Text style={[styles.legendText, { fontSize: ms(12), marginLeft: spacing(8) }]}>Not available (in)</Text>
            </View>
            <View style={[styles.legendItem, { marginLeft: spacing(16) }]}>
              <View style={[styles.legendOtherDot, { backgroundColor: COLORS.notOut.fill, borderColor: COLORS.notOut.stroke }]} />
              <Text style={[styles.legendText, { fontSize: ms(12), marginLeft: spacing(8) }]}>Not available (out)</Text>
            </View>
          </View>

          <View style={[styles.sheetButtons, { gap: vscale(10) }]}>
            <Button
              title="Open in Maps"
              onPress={openExternalMap}
              variant="white"
              fullWidth
              disabled={!region}
              icon={<Icon name="navigation-variant-outline" size={scale(18)} color="#2C3E50" />}
              accessibilityLabel="Open in external maps app"
            />
            <Button
              title="Update location"
              onPress={refreshLocation}
              variant="gradient"
              fullWidth
              disabled={loading}
              icon={<Icon name="crosshairs-gps" size={scale(18)} color="#FFFFFF" />}
              accessibilityLabel="Update location"
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  body: {
    flex: 1,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  locationCard: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationTitle: {
    color: '#2C3E50',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipText: {
    color: '#4B5563',
    fontWeight: '600',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  countText: {
    color: '#6B7280',
  },
  countStrong: {
    color: '#111827',
    fontWeight: '700',
  },
  mapWrap: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  userDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#6B7280',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  errorCard: {
    backgroundColor: '#FFF5F4',
    borderWidth: 1,
    borderColor: '#F4C2C2',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: '#DC5C69',
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 10,
    elevation: 6,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: '#E5E7EB',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  legendYouDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC5C69',
    borderWidth: 2,
    borderColor: '#B93A30',
  },
  legendOtherDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  legendCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#DC5C69',
    backgroundColor: 'rgba(220, 92, 105, 0.12)',
  },
  sheetButtons: {
    width: '100%',
  },
  webCard: {
    margin: 16,
    borderWidth: 1,
    borderColor: '#E8EAED',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  webTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  webBody: {
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default LocationMapScreen;
