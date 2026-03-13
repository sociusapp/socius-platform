import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

import { useResponsive } from '../../../utils/responsive';
import { createPresenceRequest } from '../../../services/api/incident.api';
import { requestLocationPermission, getCurrentPosition } from '../../../services/location/geolocation.service';
import { loadAuth } from '../../../services/storage/asyncStorage.service';
import CancelRequestModal from '../UserNeedPresenceRecive/CancelRequestModal';
import CustomAlert from '../../../components/common/CustomAlert';

const ShareLocationScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const { reason, category } = route.params || {};
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);

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

  const getTitle = () => {
    switch (reason) {
      case 'being_followed': return 'Being Followed';
      case 'unsafe_walk': return 'Unsafe Walk';
      case 'night_travel': return 'Night Travel';
      case 'public_intimidation': return 'Public Intimidation';
      default: return 'Share Location';
    }
  };

  const getSituationType = () => {
    if (reason === 'being_followed') {
      return 'being_followed';
    }
    if (
      reason === 'unsafe_walk' ||
      reason === 'night_travel' ||
      reason === 'public_intimidation'
    ) {
      return 'feeling_unsafe';
    }
    if (category === 'calm_presence' || category === 'care_support') {
      return 'need_calm_presence';
    }
    return 'other';
  };

  const buildDescription = () => {
    if (note && note.trim().length > 0) {
      return note.trim();
    }
    if (reason === 'being_followed') {
      return 'User reports being followed and wants nearby awareness.';
    }
    if (reason === 'unsafe_walk') {
      return 'User feels unsafe on their walk and is sharing presence.';
    }
    if (reason === 'night_travel') {
      return 'User is travelling at night and is sharing presence.';
    }
    if (reason === 'public_intimidation') {
      return 'User feels intimidated in a public space and is sharing presence.';
    }
    return 'User is sharing their presence with nearby people.';
  };

  const handleSharePresenceRequest = async () => {
    if (submitting) {
      return;
    }

    setSubmitting(true);

    try {
      const hasPermission = await requestLocationPermission();

      if (!hasPermission) {
        showAlert(
          'Location required',
          'Please enable location access to share this presence request.',
          [{ text: 'OK', onPress: closeAlert }]
        );
        return;
      }

      const auth = await loadAuth();
      const token = auth?.accessToken;

      if (!token) {
        showAlert(
          'Not signed in',
          'Please sign in again to share a presence request.',
          [{ text: 'OK', onPress: closeAlert }]
        );
        return;
      }

      const position = await getCurrentPosition();
      const latitude = position?.coords?.latitude;
      const longitude = position?.coords?.longitude;

      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        showAlert(
          'Location unavailable',
          'Unable to read your current location. Please try again.',
          [{ text: 'OK', onPress: closeAlert }]
        );
        return;
      }

      const payload = {
        situationType: getSituationType(),
        description: buildDescription(),
        location: {
          lng: longitude,
          lat: latitude,
        },
      };

      const response = await createPresenceRequest(token, payload);

      if (response?.success) {
        const requestId =
          response?.data?._id ||
          response?.data?.id ||
          response?.data?.requestId ||
          response?.data?.request?._id ||
          response?.data?.request?.id;
        navigation.navigate('RequestShared', requestId ? { requestId } : undefined);
        return;
      }

      showAlert(
        'Unable to share',
        response?.message || 'Something went wrong. Please try again.',
        [{ text: 'OK', onPress: closeAlert }]
      );
    } catch (error) {
      console.log(
        'createPresenceRequest error',
        error?.message,
        error?.response?.status,
        error?.response?.data
      );

      if (!error?.response) {
        showAlert(
          'Network error',
          error?.message || 'Unable to reach the server. Please check your connection and try again.',
          [{ text: 'OK', onPress: closeAlert }]
        );
        return;
      }

      const status = error.response.status;
      const messageFromServer =
        error.response.data?.message ||
        error.response.data?.errors?.[0]?.message;
      const code = error.response.data?.code;
      const retryAfter = Number(error.response.headers?.['retry-after'] || 0) || 0;

      if (status === 429) {
        const suffix = retryAfter > 0 ? ` Please try again after ${retryAfter} seconds.` : '';
        showAlert(
          'Please wait',
          (messageFromServer || 'Too many requests. Please try again soon.') + suffix,
          [{ text: 'OK', onPress: closeAlert }]
        );
        return;
      }

      if (status === 400 && code === 'SELF_HELP_NOT_ALLOWED') {
        showAlert(
          'Not possible',
          messageFromServer || 'You cannot send a request to your own account. Ask another nearby user to be available and try again.',
          [{ text: 'OK', onPress: closeAlert }]
        );
        return;
      }

      if (status === 404 && (code === 'NO_HELPERS_FOUND' || code === 'NO_HELPERS_AVAILABLE')) {
        const isBusy = code === 'NO_HELPERS_AVAILABLE';
        showAlert(
          isBusy ? 'Helpers are busy' : 'No helpers nearby',
          messageFromServer ||
            (isBusy
              ? 'Nearby helpers are currently busy. Please try again in a few minutes.'
              : 'No available helpers were found within 500m right now. Please try again later.'),
          [{ text: 'OK', onPress: closeAlert }]
        );
        return;
      }

      if (status === 409) {
        showAlert(
          'Request already active',
          messageFromServer || 'You already have an active presence request.',
          [{ text: 'Open request', onPress: () => { closeAlert(); navigation.navigate('RequestShared'); } }]
        );
        return;
      }

      showAlert(
        'Unable to share',
        messageFromServer || 'Something went wrong. Please try again.',
        [{ text: 'OK', onPress: closeAlert }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingHorizontal: spacing(16), paddingVertical: vscale(12), borderBottomWidth: scale(1) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.headerBtn, { padding: scale(8), width: scale(40) }]}>
          <Icon name="arrow-left" size={scale(24)} color="#666666" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: ms(18) }]}>{getTitle()}</Text>
        <View style={[styles.headerBtn, { width: scale(40) }]} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing(16), paddingBottom: vscale(40), alignItems: 'center' }]} showsVerticalScrollIndicator={false}>
        <View style={{ width: contentWidth }}>
          <View style={[styles.card, { borderRadius: scale(12), padding: spacing(16), marginBottom: vscale(16), shadowRadius: scale(6), elevation: scale(3), borderWidth: scale(1) }]}>
            <Text style={[styles.label, { fontSize: ms(14), marginBottom: vscale(8) }]}>Add one line <Text style={[styles.optional, { fontSize: ms(14) }]}>(optional)</Text></Text>
            <TextInput
              style={[styles.input, { borderRadius: scale(8), paddingHorizontal: spacing(12), paddingVertical: vscale(10), fontSize: ms(14), minHeight: vscale(48), marginBottom: vscale(8), borderWidth: scale(1) }]}
              placeholder="Anything helpful others should know (optional)"
              placeholderTextColor="#999999"
              value={note}
              onChangeText={setNote}
              multiline
            />
            <Text style={[styles.helperText, { fontSize: ms(11) }]}>Keep it short. Do not include names or accusations.</Text>
          </View>

          <View style={[styles.card, { borderRadius: scale(12), padding: spacing(16), marginBottom: vscale(16), shadowRadius: scale(6), elevation: scale(3), borderWidth: scale(1) }]}>
            <View style={[styles.cardHeader, { marginBottom: vscale(12) }]}>
              <Icon name="map-marker" size={scale(24)} color="#C94444" style={[styles.cardIcon, { marginRight: spacing(12) }]} />
              <View>
                <Text style={[styles.cardTitle, { fontSize: ms(15), marginBottom: vscale(2) }]}>Share your current location</Text>
                <Text style={[styles.cardSubtitle, { fontSize: ms(12), lineHeight: vscale(18) }]}>Only with people who choose to view this request.</Text>
              </View>
            </View>
            <View style={[styles.locationBox, { borderRadius: scale(8), padding: spacing(12), height: vscale(48), borderWidth: scale(1) }]}>
              <View style={[styles.mapLine, { height: scale(2) }]} />
              <Text style={[styles.locationText, { fontSize: ms(14), paddingHorizontal: spacing(8) }]}>Near Oakwood Ave</Text>
            </View>
          </View>

          <View style={[styles.card, { borderRadius: scale(12), padding: spacing(16), marginBottom: vscale(16), shadowRadius: scale(6), elevation: scale(3), borderWidth: scale(1) }]}>
            <View style={[styles.cardHeader, { marginBottom: vscale(12) }]}>
              <Icon name="file-document-outline" size={scale(24)} color="#7F8C8D" style={[styles.cardIcon, { marginRight: spacing(12) }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { fontSize: ms(15), marginBottom: vscale(2) }]}>You're sharing information voluntarily.</Text>
                <Text style={[styles.cardSubtitle, { fontSize: ms(12), lineHeight: vscale(18) }]}>Nothing is sent until you confirm. You can cancel at any time.</Text>
              </View>
            </View>
          </View>

          <Button
            title="Share Presence Request"
            onPress={handleSharePresenceRequest}
            variant="gradient"
            loading={submitting}
            disabled={submitting}
            style={[styles.actionButton, { marginTop: vscale(8), marginBottom: vscale(16), borderRadius: scale(30), shadowRadius: scale(8), elevation: scale(5) }]}
          />

          <TouchableOpacity onPress={() => setCancelModalVisible(true)} style={[styles.footerLink, { padding: scale(8) }]}>
            <Text style={[styles.footerText, { fontSize: ms(14) }]}>Cancel and go back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <CancelRequestModal
        visible={cancelModalVisible}
        onClose={() => setCancelModalVisible(false)}
        onConfirm={(reason) => {
          setCancelModalVisible(false);
          // Reason captured but not sent to server as request is not created yet
          console.log('Cancelled share location with reason:', reason);
          navigation.goBack();
        }}
      />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  headerBtn: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  scroll: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A4A4A',
    marginBottom: 8,
  },
  optional: {
    fontWeight: '400',
    color: '#999999',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E8EAED',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#2C3E50',
    minHeight: 48,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 11,
    color: '#666666',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 18,
  },
  locationBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8EAED',
    height: 48,
    flexDirection: 'row',
  },
  mapLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: '#E0E0E0',
    top: '50%',
    zIndex: -1,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C3E50',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
  },
  actionButton: {
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 30,
    shadowColor: '#D84D42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  gradientBtn: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footerLink: {
    alignItems: 'center',
    padding: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#666666',
    textDecorationLine: 'none',
  },
});

export default ShareLocationScreen;
