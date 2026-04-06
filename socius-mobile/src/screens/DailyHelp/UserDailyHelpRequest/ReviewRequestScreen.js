import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../../components/common/Header';
import Button from '../../../components/common/Button';
import CustomAlert from '../../../components/common/CustomAlert';
import MotionView from '../../../components/common/MotionView';
import { useResponsive } from '../../../utils/responsive';
import { createHelpRequest, updateHelpRequest, getMyActiveHelpRequest } from '../../../services/api/incident.api';
import { requestLocationPermission, getCurrentPosition, reverseGeocode, formatLocationLabel } from '../../../services/location/geolocation.service';
import { loadAuth, saveActiveHelpRequestId } from '../../../services/storage/asyncStorage.service';

const ReviewRequestScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const { description, time, helpType, location, category: explicitCategory } = route?.params || {};
  const requestId = route?.params?.requestId;
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
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
  
  // Calculate return time based on time needed
  const calculateReturnTime = () => {
    const now = new Date();
    let minutesToAdd = 30; // default 30 minutes
    
    // Parse timeText to extract minutes
    if (timeText) {
      // Check for hour format (e.g., "1 hour", "2 hours")
      const hourMatch = timeText.match(/(\d+)\s*hour/);
      if (hourMatch) {
        minutesToAdd = parseInt(hourMatch[1]) * 60;
      } else {
        // Check for minutes format (e.g., "30 minutes", "10–15 minutes")
        const minuteMatch = timeText.match(/(\d+)[^0-9]*(\d+)?\s*minute/);
        if (minuteMatch) {
          if (minuteMatch[2]) {
            // Range like "10–15 minutes" - use the higher value
            minutesToAdd = parseInt(minuteMatch[2]);
          } else {
            // Single value like "30 minutes"
            minutesToAdd = parseInt(minuteMatch[1]);
          }
        }
      }
    }
    
    const returnTime = new Date(now.getTime() + minutesToAdd * 60000);
    
    // Format the time
    const hours = returnTime.getHours();
    const minutes = returnTime.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    
    return `Return by today, ${displayHours}:${displayMinutes} ${ampm}`;
  };
  
  const returnByText = calculateReturnTime();
  const helpTypeLabel = helpType?.label || 'Everyday Help';
  const helpTypeIcon = helpType?.icon || 'flower';
  const helpTypeColor = helpType?.color || '#DC5C69';
  const helpTypeImage = helpType?.iconUrl || null;

  const mapHelpTypeToCategory = () => {
    if (typeof explicitCategory === 'string' && explicitCategory.length > 0) {
      return explicitCategory;
    }
    const direct =
      (typeof helpType?.category === 'string' && helpType.category) ||
      (typeof helpType?.slug === 'string' && helpType.slug) ||
      (typeof helpType?.id === 'string' && helpType.id) ||
      null;
    if (direct) return direct;

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
        label = formatLocationLabel(place, { fallback: label });
      } catch (e) {
      }

      setLocationLabel(label);
    };

    loadLabel();
  }, [location?.lat, location?.lng]);

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleShareRequest = useCallback(async () => {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    let isSuccess = false;
    let payload = null;

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

      let addressLabel = locationLabel;
      if (!addressLabel) {
        try {
          const place = await reverseGeocode({
            latitude,
            longitude,
          });
          addressLabel = formatLocationLabel(place, { fallback: '' });
        } catch (e) {
        }
      }

      payload = {
        category: mapHelpTypeToCategory(),
        description: requestText,
        time: timeText,
        location: {
          lng: longitude,
          lat: latitude,
          address: addressLabel || '',
        },
        itemReturnRequired: false,
      };

      const response = requestId
        ? await updateHelpRequest(token, requestId, payload)
        : await createHelpRequest(token, payload);

      if (response?.success) {
        isSuccess = true;
        setSuccess(true);
        // Do NOT set submitting to false here, to keep button in success state
        // and prevent multiple clicks during the animation delay
        
        // Wait for fly animation before navigating
        setTimeout(() => {
          const updatedOrCreatedRequest = response?.data?.request || response?.data;
          const showNudge = requestId ? false : !!response?.data?.showNudge;
          const noHelpersFound = !!response?.data?.noHelpersFound;
          const helperAvailabilityHint = response?.data?.helperAvailabilityHint || null;
          const attemptId = response?.data?.attemptId || null;
          console.log('[DailyHelp] helpRequest submit: success', response?.data);
          
          if (updatedOrCreatedRequest?._id || updatedOrCreatedRequest?.id) {
            saveActiveHelpRequestId(updatedOrCreatedRequest._id || updatedOrCreatedRequest.id).catch(() => {});
          }

          if (noHelpersFound) {
            const ref = attemptId ? `\n\nRef: ${attemptId}` : '';
            const title =
              helperAvailabilityHint === 'only_self_available'
                ? 'No One Else Nearby'
                : helperAvailabilityHint === 'helpers_busy_or_ineligible'
                  ? 'Nearby Helpers Are Busy'
                  : 'No Helpers Nearby';
            const message =
              helperAvailabilityHint === 'only_self_available'
                ? `No one else is available within 500m of your location right now. ${ref}`
                : helperAvailabilityHint === 'helpers_busy_or_ineligible' 
                  ? `There are people nearby, but they’re not available right now. Please try again in a few minutes.${ref}`
                  : `No available helpers were found within 500m right now. Please try again later.${ref}`;

            showAlert(
              title,
              message,
              [{
                text: 'Continue',
                onPress: () => {
                  closeAlert();
                  if (!requestId && showNudge) {
                    navigation.navigate('CommunityBalanceNudge', { requestId: updatedOrCreatedRequest?._id, initialRequest: updatedOrCreatedRequest });
                  } else if (requestId) {
                    navigation.navigate('RequestActive', { initialRequest: updatedOrCreatedRequest, updated: true });
                  } else {
                    navigation.navigate('RequestActive', { initialRequest: updatedOrCreatedRequest });
                  }
                },
                type: 'primary'
              }],
              'account-search-outline',
              '#DC5C69'
            );
            return;
          }

          if (!requestId && showNudge) {
            navigation.navigate('CommunityBalanceNudge', { requestId: updatedOrCreatedRequest?._id, initialRequest: updatedOrCreatedRequest });
            return;
          }

          if (requestId) {
            showAlert(
              'Request updated',
              'Your active request has been updated successfully.',
              [{
                text: 'OK',
                onPress: () => {
                  closeAlert();
                  navigation.navigate('RequestActive', { initialRequest: updatedOrCreatedRequest, updated: true });
                },
                type: 'primary'
              }],
              'check-circle',
              '#22C55E'
            );
            return;
          }

          navigation.navigate('RequestActive', { initialRequest: updatedOrCreatedRequest });
        }, 1500);
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
        'helpRequest submit error',
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
      console.log('[DailyHelp] helpRequest submit: error', status, messageFromServer, error.response?.data);

      const code = error.response.data?.code;
      const retryAfter = Number(error.response.headers?.['retry-after'] || 0) || 0;

      if (status === 429) {
        const suffix = retryAfter > 0 ? ` Please try again after ${retryAfter} seconds.` : '';
        showAlert(
          'Please wait',
          (messageFromServer || 'Too many requests. Please try again soon.') + suffix,
          [{ text: 'OK', onPress: closeAlert, type: 'primary' }],
          'clock-outline',
          '#DC5C69'
        );
        return;
      }

      if (status === 400 && code === 'SELF_HELP_NOT_ALLOWED') {
        const ref = error.response.data?.data?.attemptId ? `\n\nRef: ${error.response.data.data.attemptId}` : '';
        showAlert(
          'No One Else Nearby',
          messageFromServer || `No one else is available within 500m of your location right now. Ask a nearby user to be available and try again.${ref}`,
          [{ text: 'OK', onPress: closeAlert, type: 'primary' }],
          'account-search-outline',
          '#DC5C69'
        );
        return;
      }

      if (status === 404 && (code === 'NO_HELPERS_FOUND' || code === 'NO_HELPERS_AVAILABLE')) {
        const isBusy = code === 'NO_HELPERS_AVAILABLE';
        const attemptId = error.response.data?.data?.attemptId || null;
        const ref = attemptId ? `\n\nRef: ${attemptId}` : '';
        showAlert(
          isBusy ? 'Helpers are busy' : 'No helpers nearby',
          (messageFromServer ||
            (isBusy
              ? 'Nearby helpers are currently busy. Please try again in a few minutes.'
              : 'No available helpers were found within 500m right now. Please try again later.')) + ref,
          [{ text: 'OK', onPress: closeAlert, type: 'primary' }],
          isBusy ? 'account-clock-outline' : 'account-search-outline',
          '#DC5C69'
        );
        return;
      }

      if (!requestId && status === 409) {
        try {
          const auth = await loadAuth();
          const token = auth?.accessToken;
          if (token && payload) {
            const activeRes = await getMyActiveHelpRequest(token);
            const activeRequest =
              activeRes?.data?.activeRequest !== undefined
                ? activeRes?.data?.activeRequest
                : activeRes?.data;
            console.log('[DailyHelp] 409: activeRes', !!activeRequest, activeRes?.data);
            if (!activeRequest) {
              const retryRes = await createHelpRequest(token, payload);
              console.log('[DailyHelp] retry create after 409: ', retryRes?.success);
              if (retryRes?.success) {
                navigation.navigate('RequestActive');
                return;
              }
            }
          }
        } catch (e) {
          console.log('[DailyHelp] 409 handling failed', e?.message);
        }

        showAlert(
          'Request already active',
          messageFromServer || 'You already have an active request.',
          [{ text: 'View Request', onPress: () => { closeAlert(); navigation.navigate('RequestActive'); }, type: 'primary' }],
          'information',
          '#2196F3'
        );
        return;
      }

      if (requestId && status === 409) {
        showAlert(
          'Unable to update',
          messageFromServer || 'This request cannot be updated right now.',
          [{ text: 'OK', onPress: closeAlert, type: 'primary' }],
          'alert-circle',
          '#DC5C69'
        );
        return;
      }

      showAlert(
        'Unable to share',
        messageFromServer || 'Something went wrong. Please try again.',
        [{ text: 'OK', onPress: closeAlert, type: 'destructive' }],
        'alert-octagon',
        '#DC5C69'
      );
    } finally {
      if (!isSuccess) {
        setSubmitting(false);
      }
    }
  }, [
    submitting,
    location,
    locationLabel,
    mapHelpTypeToCategory,
    requestText,
    timeText,
    requestId,
    navigation,
    showAlert,
    closeAlert
  ]);

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
          <MotionView preset="fadeUp" duration={220}>
            <View style={[styles.titleSection, { marginBottom: vscale(15) }]}>
              <Text style={[styles.mainTitle, { fontSize: ms(22), marginBottom: vscale(8) }]}>Review & confirm</Text>
            </View>
          </MotionView>

          {/* Your request card */}
          <MotionView preset="fadeUp" duration={220} delay={50}>
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
                    { fontSize: ms(14), marginLeft: spacing(0) },
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
                {helpTypeImage ? (
                  <Image
                    source={{ uri: helpTypeImage }}
                    style={{ width: scale(20), height: scale(20), borderRadius: scale(6) }}
                    resizeMode="cover"
                  />
                ) : (
                  <Icon name="wrench-outline" size={scale(20)} color="#6B7280" />
                )}
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
                {String(helpTypeLabel || 'Local help · Tool / small assistance')}
              </Text>
            </View>

            <View
              style={[
                styles.requestRow,
                { paddingVertical: vscale(6), borderBottomWidth: scale(1) },
              ]}
            >
              <View style={[styles.requestRowLeft, { marginRight: spacing(12) }]}>
                <Icon name="message-text-outline" size={scale(20)} color="#6B7280" />
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
                "{requestText}"
              </Text>
            </View>

            <View
              style={[
                styles.requestRow,
                { paddingVertical: vscale(6), borderBottomWidth: scale(1) },
              ]}
            >
              <View style={[styles.requestRowLeft, { marginRight: spacing(12) }]}>
                <Icon name="map-marker-outline" size={scale(20)} color="#6B7280" />
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

            <View style={[styles.requestRow, { paddingVertical: vscale(6), borderBottomWidth: scale(1) }]}>
              <View style={[styles.requestRowLeft, { marginRight: spacing(12) }]}>
                <Icon name="clock-outline" size={scale(20)} color="#6B7280" />
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
                About {timeText}
              </Text>
            </View>

            <View style={[styles.requestRow, { paddingVertical: vscale(6) }]}>
              <View style={[styles.requestRowLeft, { marginRight: spacing(12) }]}>
                <Icon name="calendar-check" size={scale(20)} color="#6B7280" />
                <Text
                  style={[
                    styles.requestRowLabel,
                    { fontSize: ms(13), marginLeft: spacing(8) },
                  ]}
                >
                  Return by
                </Text>
              </View>
              <Text
                style={[
                  styles.requestRowValue,
                  { fontSize: ms(14), maxWidth: '60%' },
                ]}
              >
                {returnByText}
              </Text>
            </View>
            </View>
          </MotionView>

          {/* Who will see this Card */}
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
            <Text style={[styles.infoBoxTitle, { fontSize: ms(14), fontWeight: '600', color: '#374151', marginBottom: vscale(10) }]}>Who will see this</Text>
            <View style={{ width: '100%', height: 1, backgroundColor: '#E5E7EB', marginBottom: vscale(10) }} />
            <View style={styles.bulletRow}>
              <Icon name="circle-small" size={scale(16)} color="#6B7280" />
              <Text style={[styles.bulletText, { fontSize: ms(13), color: '#6B7280' }]}>Only nearby available people</Text>
            </View>
            <View style={styles.bulletRow}>
              <Icon name="circle-small" size={scale(16)} color="#6B7280" />
              <Text style={[styles.bulletText, { fontSize: ms(13), color: '#6B7280' }]}>Limited number, not public</Text>
            </View>
            <View style={styles.bulletRow}>
              <Icon name="circle-small" size={scale(16)} color="#6B7280" />
              <Text style={[styles.bulletText, { fontSize: ms(13), color: '#6B7280' }]}>No obligation to respond</Text>
            </View>
          </View>

          {/* You can cancel info */}
          <View style={[styles.cancelInfoBox, { 
            borderRadius: scale(16),
            borderWidth: scale(1),
            paddingHorizontal: spacing(16),
            paddingVertical: vscale(12),
            marginBottom: vscale(16),
          }]}>
            <Text style={[styles.cancelInfoText, { fontSize: ms(13), color: '#6B7280', textAlign: 'center' }]}>You can cancel this request at any time.</Text>
          </View>

          {/* Spacer */}
          <View style={[styles.spacer, { height: vscale(20) }]} />

          {/* Buttons Container */}
          <MotionView preset="fadeUp" duration={220} delay={90}>
          <View style={[styles.buttonsContainer, { gap: vscale(12), marginBottom: vscale(12) }]}>
            <TouchableOpacity
              style={[styles.shareButton, { borderRadius: scale(28), paddingVertical: vscale(16) }]}
              onPress={handleShareRequest}
              disabled={submitting}
              activeOpacity={0.9}
            >
              <Text style={[styles.shareButtonText, { fontSize: ms(16) }]}>Share request</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.editButton, { borderRadius: scale(28), paddingVertical: vscale(16), borderWidth: 1 }]}
              onPress={handleEditDetails}
              activeOpacity={0.9}
            >
              <Text style={[styles.editButtonText, { fontSize: ms(16) }]}>Edit details</Text>
            </TouchableOpacity>
          </View>
          </MotionView>

          {/* Bottom text */}
          <Text style={[styles.bottomText, { fontSize: ms(12), color: '#9CA3AF', textAlign: 'center', fontStyle: 'italic', marginBottom: vscale(20) }]}>
            Sharing is voluntary and temporary.
          </Text>
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
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  infoBoxTitle: {
    fontWeight: '600',
    color: '#374151',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bulletText: {
    fontWeight: '400',
    marginLeft: 4,
  },
  cancelInfoBox: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  cancelInfoText: {
    fontWeight: '400',
  },
  infoText: {
    fontWeight: '400',
    color: '#4B5563',
  },
  emergencyLink: {
    color: '#DC5C69',
    textDecorationLine: 'underline',
  },

  // ===== BUTTONS =====
  shareButton: {
    backgroundColor: '#B94A48',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    color: '#374151',
    fontWeight: '500',
  },

  spacer: {
  },

  buttonsContainer: {
  },

  bottomText: {
    fontStyle: 'italic',
  },
});

export default ReviewRequestScreen;
