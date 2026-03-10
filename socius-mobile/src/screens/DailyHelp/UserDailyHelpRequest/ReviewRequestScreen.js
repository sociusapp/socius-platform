import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../../components/common/Header';
import Button from '../../../components/common/Button';
import CustomAlert from '../../../components/common/CustomAlert';
import { useResponsive } from '../../../utils/responsive';
import { createHelpRequest } from '../../../services/api/incident.api';
import { requestLocationPermission, getCurrentPosition, reverseGeocode } from '../../../services/location/geolocation.service';
import { loadAuth } from '../../../services/storage/asyncStorage.service';

const ReviewRequestScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const { description, time, helpType, location } = route?.params || {};
  const [submitting, setSubmitting] = useState(false);
  const [locationLabel, setLocationLabel] = useState('');
  
  // Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: 'alert-circle-outline',
    iconColor: '#DC5C69'
  });

  const showAlert = (title, message, buttons = [], icon = 'alert-circle-outline', iconColor = '#DC5C69') => {
    setAlertConfig({
      title,
      message,
      buttons,
      icon,
      iconColor
    });
    setAlertVisible(true);
  };

  const closeAlert = () => {
    setAlertVisible(false);
  };

  const requestText = description && description.trim().length > 0
    ? description
    : 'Need a quick printout near the bus stop';
  const timeText = time && time.trim().length > 0 ? time : '10–15 minutes';
  const helpTypeLabel = helpType?.label || 'Everyday Help';
  const helpTypeIcon = helpType?.icon || 'flower';
  const helpTypeColor = helpType?.color || '#DC5C69';

  const mapHelpTypeToCategory = () => {
    const id = helpType?.id;
    switch (id) {
      case 1: return 'print_document';
      case 2: return 'tool_repair';
      case 3: return 'carry_lift';
      case 4: return 'transport_help';
      case 5: return 'household_help';
      case 6: return 'study_office_help';
      case 7: return 'language_support';
      case 8: return 'elder_assistance';
      case 9: return 'tech_help';
      case 10: return 'general_help';
      default: return 'community_upkeep';
    }
  };

  useEffect(() => {
    const hasDbLocation =
      location &&
      typeof location.lat === 'number' &&
      typeof location.lng === 'number';

    if (!hasDbLocation) {
      setLocationLabel('Current location (shared temporarily)');
      return;
    }

    const loadLabel = async () => {
      let label = `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`;

      try {
        const place = await reverseGeocode({
          latitude: location.lat,
          longitude: location.lng,
        });

        if (place) {
          const parts = [];
          if (place.subLocality) {
            parts.push(place.subLocality);
          } else if (place.district) {
            parts.push(place.district);
          } else if (place.city) {
            parts.push(place.city);
          }
          if (place.region) {
            parts.push(place.region);
          }
          if (parts.length) {
            label = parts.join(', ');
          }
        }
      } catch (e) {
      }

      setLocationLabel(label);
    };

    loadLabel();
  }, [location?.lat, location?.lng]);

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleShareRequest = async () => {
    if (submitting) {
      return;
    }

    setSubmitting(true);

    try {
      const auth = await loadAuth();
      const token = auth?.accessToken;

      if (!token) {
        showAlert(
          'Not signed in',
          'Please sign in again to share a request.',
          [{ text: 'OK', onPress: closeAlert, type: 'primary' }],
          'account-alert',
          '#DC5C69'
        );
        return;
      }

      const hasDbLocation =
        location &&
        typeof location.lat === 'number' &&
        typeof location.lng === 'number';

      let latitude;
      let longitude;

      if (hasDbLocation) {
        latitude = location.lat;
        longitude = location.lng;
      } else {
        const hasPermission = await requestLocationPermission();

        if (!hasPermission) {
          showAlert(
            'Location required',
            'Please enable location access to share this request.',
            [{ text: 'OK', onPress: closeAlert, type: 'primary' }],
            'map-marker-off',
            '#DC5C69'
          );
          return;
        }

        const position = await getCurrentPosition();
        latitude = position?.coords?.latitude;
        longitude = position?.coords?.longitude;
      }

      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        showAlert(
          'Location unavailable',
          'Unable to read your current location. Please try again.',
          [{ text: 'OK', onPress: closeAlert, type: 'primary' }],
          'map-marker-alert',
          '#DC5C69'
        );
        return;
      }

      const payload = {
        category: mapHelpTypeToCategory(),
        description: requestText,
        location: {
          lng: longitude,
          lat: latitude,
        },
        itemReturnRequired: false,
      };

      const response = await createHelpRequest(token, payload);

      if (response?.success && response?.data?.showNudge) {
        navigation.navigate('CommunityBalanceNudge');
        return;
      }

      if (response?.success) {
        navigation.navigate('RequestActive');
        return;
      }

      showAlert(
        'Unable to share',
        response?.message || 'Something went wrong. Please try again.',
        [{ text: 'OK', onPress: closeAlert, type: 'destructive' }],
        'alert-circle',
        '#DC5C69'
      );
    } catch (error) {
      console.log(
        'createHelpRequest error',
        error?.message,
        error?.response?.status,
        error?.response?.data
      );

      if (!error?.response) {
        showAlert(
          'Network error',
          error?.message || 'Unable to reach the server. Please check your connection and try again.',
          [{ text: 'OK', onPress: closeAlert, type: 'destructive' }],
          'wifi-off',
          '#DC5C69'
        );
        return;
      }

      const status = error.response.status;
      const messageFromServer =
        error.response.data?.message ||
        error.response.data?.errors?.[0]?.message;

      if (status === 404 && error.response.data?.code === 'NO_HELPERS_FOUND') {
        const requestData = error.response.data?.data?.request;
        navigation.navigate('RequestActive', { 
          initialRequest: requestData, 
          initialNoHelpers: true 
        });
        return;
      }

      if (status === 409) {
        showAlert(
          'Request already active',
          messageFromServer || 'You already have an active request.',
          [{ text: 'View Request', onPress: () => { closeAlert(); navigation.navigate('RequestActive'); }, type: 'primary' }],
          'information',
          '#2196F3'
        );
        return;
      }

      showAlert(
        status ? `Error (${status})` : 'Error',
        messageFromServer || 'Something went wrong. Please try again.',
        [{ text: 'OK', onPress: closeAlert, type: 'destructive' }],
        'alert-octagon',
        '#DC5C69'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditDetails = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity onPress={handleSettings} style={{ padding: scale(8) }}>
            <Icon name="cog" size={scale(24)} color="#999999" />
          </TouchableOpacity>
        }
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { alignItems: 'center' }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth }}>
          {/* Title Section */}
          <View style={[styles.titleSection, { marginBottom: vscale(15) }]}>
            <Text style={[styles.mainTitle, { fontSize: ms(22), marginBottom: vscale(8) }]}>Review your request</Text>
            <Text style={[styles.subtitle, { fontSize: ms(16) }]}>This is what nearby people will see.</Text>
          </View>

          {/* Your request card */}
          <View
            style={[
              styles.requestCard,
              {
                borderRadius: scale(18),
                borderWidth: scale(1),
                paddingHorizontal: spacing(18),
                paddingVertical: vscale(16),
                marginBottom: vscale(16),
                shadowOffset: { width: 0, height: vscale(2) },
                shadowRadius: scale(6),
                elevation: scale(2),
              },
            ]}
          >
            <View
              style={[
                styles.requestHeaderRow,
                { marginBottom: vscale(10), paddingBottom: vscale(8), borderBottomWidth: scale(1) },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text
                  style={[
                    styles.requestLabel,
                    { fontSize: ms(14), marginLeft: spacing(8) },
                  ]}
                >
                  Your request
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.requestRow,
                { paddingVertical: vscale(6), borderBottomWidth: scale(1) },
              ]}
            >
              <View style={[styles.requestRowLeft, { marginRight: spacing(12) }]}>
                <Icon name={helpTypeIcon} size={scale(20)} color={helpTypeColor} />
                <Text
                  style={[
                    styles.requestRowLabel,
                    { fontSize: ms(13), marginLeft: spacing(8) },
                  ]}
                >
                  Category
                </Text>
              </View>
              <Text
                style={[
                  styles.requestRowValue,
                  { fontSize: ms(14), maxWidth: '60%' },
                ]}
              >
                {helpTypeLabel}
              </Text>
            </View>

            <View
              style={[
                styles.requestRow,
                { paddingVertical: vscale(6), borderBottomWidth: scale(1) },
              ]}
            >
              <View style={[styles.requestRowLeft, { marginRight: spacing(12) }]}>
                <Icon name="note-text-outline" size={scale(20)} color="#4B5563" />
                <Text
                  style={[
                    styles.requestRowLabel,
                    { fontSize: ms(13), marginLeft: spacing(8) },
                  ]}
                >
                  Description
                </Text>
              </View>
              <Text
                style={[
                  styles.requestRowValue,
                  { fontSize: ms(14), lineHeight: ms(20), maxWidth: '60%' },
                ]}
              >
                {requestText}
              </Text>
            </View>

            <View
              style={[
                styles.requestRow,
                { paddingVertical: vscale(6), borderBottomWidth: scale(1) },
              ]}
            >
              <View style={[styles.requestRowLeft, { marginRight: spacing(12) }]}>
                <Icon name="map-marker" size={scale(20)} color="#DC5C69" />
                <Text
                  style={[
                    styles.requestRowLabel,
                    { fontSize: ms(13), marginLeft: spacing(8) },
                  ]}
                >
                  Location
                </Text>
              </View>
              <Text
                style={[
                  styles.requestRowValue,
                  { fontSize: ms(14), lineHeight: ms(20), maxWidth: '60%' },
                ]}
              >
                {locationLabel || 'Current location (shared temporarily)'}
              </Text>
            </View>

            <View style={[styles.requestRow, { paddingVertical: vscale(6) }]}>
              <View style={[styles.requestRowLeft, { marginRight: spacing(12) }]}>
                <Icon name="clock-outline" size={scale(20)} color="#DC5C69" />
                <Text
                  style={[
                    styles.requestRowLabel,
                    { fontSize: ms(13), marginLeft: spacing(8) },
                  ]}
                >
                  Time needed
                </Text>
              </View>
              <Text
                style={[
                  styles.requestRowValue,
                  { fontSize: ms(14), maxWidth: '60%' },
                ]}
              >
                {timeText}
              </Text>
            </View>
          </View>

          {/* Info Box 1 */}
          <View style={[styles.infoBox, { 
            borderRadius: scale(16),
            borderWidth: scale(1),
            paddingHorizontal: spacing(16),
            paddingVertical: vscale(16),
            marginBottom: vscale(10),
            shadowOffset: { width: 0, height: vscale(2) },
            shadowRadius: scale(6),
            elevation: scale(2)
          }]}>
            <Text style={[styles.infoText, { fontSize: ms(14), lineHeight: ms(22) }]}>This request will be visible only to nearby available people. You can cancel it anytime.</Text>
          </View>

          {/* Info Box 2 */}
          <View style={[styles.infoBox, { 
            borderRadius: scale(16),
            borderWidth: scale(1),
            paddingHorizontal: spacing(16),
            paddingVertical: vscale(16),
            marginBottom: vscale(10),
            shadowOffset: { width: 0, height: vscale(2) },
            shadowRadius: scale(6),
            elevation: scale(2)
          }]}>
            <Text style={[styles.infoText, { fontSize: ms(14), lineHeight: ms(22) }]}>This is for small, everyday help. For emergencies, use <Text style={styles.emergencyLink}>Emergency Contacts</Text>.</Text>
          </View>

          {/* Spacer */}
          <View style={[styles.spacer, { height: vscale(20) }]} />

          {/* Buttons Container */}
          <View style={[styles.buttonsContainer, { gap: vscale(12), marginBottom: vscale(20) }]}>
            <Button
              title="Share Request"
              onPress={handleShareRequest}
              variant="gradient"
            loading={submitting}
            />

            <Button
              title="Edit Details"
              onPress={handleEditDetails}
              variant="white"
            />
          </View>

          <View style={[styles.bottomSpacer, { height: vscale(20) }]} />
        </View>
      </ScrollView>

      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
        onClose={closeAlert}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  scrollContent: {
    flexGrow: 1,
    paddingTop: 24,
    paddingBottom: 100,
  },

  // ===== TITLE SECTION =====
  titleSection: {
    alignItems: 'center',
  },

  mainTitle: {
    fontWeight: '500',
    color: '#2C3E50',
    textAlign: 'center',
  },

  subtitle: {
    fontWeight: '400',
    color: '#999999',
    textAlign: 'center',
  },

  // ===== REQUEST CARD =====
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },

  requestHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomColor: '#E8EAED',
  },

  requestLabel: {
    fontWeight: '600',
    color: '#4B5563',
  },

  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: '#E8EAED',
  },

  requestRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },

  requestRowLabel: {
    fontWeight: '500',
    color: '#4B5563',
  },

  requestRowValue: {
    fontWeight: '400',
    color: '#111827',
  },

  // ===== INFO BOXES =====
  infoBox: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },

  infoText: {
    fontWeight: '400',
    color: '#4B5563',
  },

  emergencyLink: {
    color: '#DC5C69',
    textDecorationLine: 'underline',
  },

  spacer: {
  },

  buttonsContainer: {
  },

  bottomSpacer: {
  },
});

export default ReviewRequestScreen;
