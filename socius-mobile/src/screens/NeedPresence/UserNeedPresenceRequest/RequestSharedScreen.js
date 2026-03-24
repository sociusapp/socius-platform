import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withDelay,
  Easing 
} from 'react-native-reanimated';
import { useResponsive } from '../../../utils/responsive';
import { cancelPresenceRequest, getActivePresenceRequest } from '../../../services/api/incident.api';
import { loadAuth } from '../../../services/storage/asyncStorage.service';
import CustomAlert from '../../../components/common/CustomAlert';
import PulseDot from '../../../components/common/PulseDot';
import MotionView from '../../../components/common/MotionView';
import MotionPressable from '../../../components/common/MotionPressable';

const PulseRing = ({ delay, size }) => {
  const pulseScale = useSharedValue(0.8);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    pulseScale.value = withDelay(
      delay,
      withRepeat(
        withTiming(1.5, {
          duration: 2000,
          easing: Easing.out(Easing.ease),
        }),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(0, {
          duration: 2000,
          easing: Easing.out(Easing.ease),
        }),
        -1,
        false
      )
    );
  }, [delay, opacity, pulseScale]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        animatedStyle,
      ]}
    />
  );
};

const CANCEL_REASONS = {
  NO_HELPERS_NEARBY: 'no_helpers_nearby',
  NO_ONE_ACCEPTED: 'no_one_accepted',
};

const getRequestIdFromResponse = (response) => {
  const container = response?.data || response;
  const data =
    container?.request ||
    container?.presence ||
    container?.activeRequest ||
    container?.data ||
    container;
  return (
    data?._id ||
    data?.id ||
    data?.requestId ||
    data?.request?._id ||
    data?.request?.id ||
    data?.presenceRequestId
  );
};

const getNearbyCountFromResponse = (response) => {
  const container = response?.data || response;
  const data =
    container?.request ||
    container?.presence ||
    container?.activeRequest ||
    container?.data ||
    container;

  const candidates = [
    data?.nearbyCount,
    data?.nearbyUsersCount,
    data?.nearbyHelpersCount,
    data?.availableHelpersCount,
    data?.helpersNearbyCount,
    data?.notifiedCount,
    data?.recipientsCount,
    data?.viewedByCount,
    data?.stats?.nearbyCount,
    data?.stats?.notifiedCount,
  ];

  const found = candidates.find((value) => typeof value === 'number');
  return typeof found === 'number' ? found : undefined;
};

const isAcceptedFromResponse = (response) => {
  const container = response?.data || response;
  const data =
    container?.request ||
    container?.presence ||
    container?.activeRequest ||
    container?.data ||
    container;
  const status = `${data?.status || ''}`.toLowerCase().trim();
  const acceptedStatuses = [
    'accepted',
    'matched',
    'assigned',
    'in_progress',
    'en_route',
    'arrived',
    'active_with_helper',
    'active',
  ];
  if (acceptedStatuses.includes(status)) {
    return true;
  }

  const isNonEmptyArray = (v) => Array.isArray(v) && v.length > 0;
  const isNonEmptyObject = (v) =>
    v && typeof v === 'object' && !Array.isArray(v) && (v._id || v.id || Object.keys(v).length > 0);
  const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

  const arrays = [
    data?.acceptedBy,
    data?.acceptedHelpers,
    data?.acceptedUsers,
    data?.acceptedVolunteers,
    data?.responders,
    data?.helpers,
    data?.accepted,
  ];
  if (arrays.some(isNonEmptyArray)) {
    return true;
  }

  const singleRefs = [
    data?.volunteer,
    data?.volunteerId,
    data?.helper,
    data?.helperId,
    data?.responder,
    data?.responderId,
    data?.assignedTo,
    data?.assignedUser,
    data?.assignedHelper,
    data?.assignedVolunteer,
    data?.acceptedBy,
  ];
  if (singleRefs.some(isNonEmptyObject) || singleRefs.some(isNonEmptyString)) {
    return true;
  }

  const numericSignals = [
    data?.acceptedCount,
    data?.acceptedUsersCount,
    data?.acceptedHelpersCount,
    data?.stats?.acceptedCount,
  ];
  if (numericSignals.some((n) => typeof n === 'number' && Number.isFinite(n) && n > 0)) {
    return true;
  }

  if (status.includes('accept') || status.includes('match') || status.includes('assign') || status.includes('en_route') || status.includes('arriv')) {
    return true;
  }

  return false;
};

const RequestSharedScreen = ({ navigation, route }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('choose_reason');
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS.NO_ONE_ACCEPTED);
  const [activeRequestId, setActiveRequestId] = useState(route?.params?.requestId);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const requestAcceptedRef = useRef(false);
  const modalVisibleRef = useRef(false);
  const navigatedOnAcceptedRef = useRef(false);
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();

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

  const refreshActiveRequest = useCallback(async () => {
    try {
      const auth = await loadAuth();
      const token = auth?.accessToken;
      if (!token) {
        return;
      }

      const response = await getActivePresenceRequest(token);
      const requestId = getRequestIdFromResponse(response);
      if (requestId) {
        setActiveRequestId(requestId);
      }

      const nearbyCount = getNearbyCountFromResponse(response);
      const accepted = isAcceptedFromResponse(response);
      requestAcceptedRef.current = accepted;

      if (accepted && requestId && !navigatedOnAcceptedRef.current) {
        navigatedOnAcceptedRef.current = true;
        navigation.reset({
          index: 0,
          routes: [{ name: 'NearbyMap', params: { requestId, mode: 'requester' } }],
        });
        return;
      }

      if (!accepted && nearbyCount === 0 && !modalVisibleRef.current) {
        setCancelReason(CANCEL_REASONS.NO_HELPERS_NEARBY);
        setModalMode('no_helpers_nearby');
        setModalVisible(true);
      }
    } catch (error) {
      if (error?.response?.status === 404) {
        // Request closed or not found, navigate away
        navigation.navigate('RequestClosed');
      }
    }
  }, [navigation]);

  useEffect(() => {
    refreshActiveRequest();

    const intervalId = setInterval(() => {
      refreshActiveRequest();
    }, 15000);

    const timeoutId = setTimeout(() => {
      if (modalVisibleRef.current) {
        return;
      }
      if (requestAcceptedRef.current) {
        return;
      }
      setCancelReason(CANCEL_REASONS.NO_ONE_ACCEPTED);
      setModalMode('no_one_accepted');
      setModalVisible(true);
    }, 120000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [refreshActiveRequest]);

  useEffect(() => {
    modalVisibleRef.current = modalVisible;
  }, [modalVisible]);

  const handleCancelPress = () => {
    setCancelReason(CANCEL_REASONS.NO_ONE_ACCEPTED);
    setModalMode('choose_reason');
    setModalVisible(true);
  };

  const confirmCancel = async () => {
    if (cancelSubmitting) {
      return;
    }

    try {
      setCancelSubmitting(true);
      const auth = await loadAuth();
      const token = auth?.accessToken;

      if (!token) {
        showAlert('Not signed in', 'Please sign in again.', [{ text: 'OK', onPress: closeAlert }]);
        return;
      }

      const requestId = route?.params?.requestId || activeRequestId;
      if (!requestId) {
        showAlert('Request missing', 'Unable to find active request to cancel.', [{ text: 'OK', onPress: closeAlert }]);
        return;
      }

      const response = await cancelPresenceRequest(token, requestId, { reason: cancelReason });
      if (!response?.success) {
        showAlert('Unable to cancel', response?.message || 'Something went wrong. Please try again.', [{ text: 'OK', onPress: closeAlert }]);
        return;
      }

      setModalVisible(false);
      navigation.navigate('RequestClosed');
    } catch (error) {
      showAlert('Error', error?.message || 'Something went wrong. Please try again.', [{ text: 'OK', onPress: closeAlert }]);
    } finally {
      setCancelSubmitting(false);
    }
  };

  const keepActive = () => {
    setModalVisible(false);
  };

  const getModalCopy = () => {
    if (modalMode === 'no_helpers_nearby') {
      return {
        title: 'No helpers nearby',
        description: 'Is location par abhi koi helper available nahi hai.\nAap request cancel kar sakte ho.',
      };
    }

    if (modalMode === 'no_one_accepted') {
      return {
        title: 'No one accepted yet',
        description: 'Abhi tak kisi ne accept nahi kiya.\nAap wait kar sakte ho ya cancel kar sakte ho.',
      };
    }

    return {
      title: 'Cancel Request?',
      description: 'Cancel karne ka reason select karo.',
    };
  };

  const modalCopy = getModalCopy();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={keepActive}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: contentWidth, padding: spacing(24), borderRadius: scale(20) }]}>
            <Text style={[styles.modalTitle, { fontSize: ms(20), marginBottom: vscale(16) }]}>{modalCopy.title}</Text>
            
            <Text style={[styles.modalDescription, { fontSize: ms(15), marginBottom: vscale(24), lineHeight: vscale(22) }]}>
              {modalCopy.description}
            </Text>

            {modalMode === 'choose_reason' && (
              <View style={{ width: '100%', marginBottom: vscale(16) }}>
                <TouchableOpacity
                  style={[
                    styles.reasonOption,
                    { borderRadius: scale(14), paddingVertical: vscale(12), paddingHorizontal: spacing(14), marginBottom: vscale(10) },
                    cancelReason === CANCEL_REASONS.NO_HELPERS_NEARBY && styles.reasonOptionSelected,
                  ]}
                  onPress={() => setCancelReason(CANCEL_REASONS.NO_HELPERS_NEARBY)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.reasonOptionText,
                      { fontSize: ms(14) },
                      cancelReason === CANCEL_REASONS.NO_HELPERS_NEARBY && styles.reasonOptionTextSelected,
                    ]}
                  >
                    Is location par helper nahi mila
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.reasonOption,
                    { borderRadius: scale(14), paddingVertical: vscale(12), paddingHorizontal: spacing(14) },
                    cancelReason === CANCEL_REASONS.NO_ONE_ACCEPTED && styles.reasonOptionSelected,
                  ]}
                  onPress={() => setCancelReason(CANCEL_REASONS.NO_ONE_ACCEPTED)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.reasonOptionText,
                      { fontSize: ms(14) },
                      cancelReason === CANCEL_REASONS.NO_ONE_ACCEPTED && styles.reasonOptionTextSelected,
                    ]}
                  >
                    Kisi ne accept nahi kiya
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.modalKeepButton, { paddingVertical: vscale(14), borderRadius: scale(25), marginBottom: vscale(12) }]} 
              onPress={keepActive}
              activeOpacity={0.8}
            >
              <Text style={[styles.modalKeepButtonText, { fontSize: ms(16) }]}>Keep Request Active</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modalCancelButton, { paddingVertical: vscale(14), borderRadius: scale(25), marginBottom: vscale(20) }]} 
              onPress={confirmCancel}
              activeOpacity={0.8}
              disabled={cancelSubmitting}
            >
              <Text style={[styles.modalCancelButtonText, { fontSize: ms(16) }]}>
                {cancelSubmitting ? 'Cancelling...' : 'Cancel Request'}
              </Text>
            </TouchableOpacity>

            <View style={[styles.modalDivider, { height: scale(1), marginBottom: vscale(16) }]} />
            
            <Text style={[styles.modalFooterText, { fontSize: ms(13) }]}>
              You can request awareness again anytime.
            </Text>
          </View>
        </View>
      </Modal>

      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
        onClose={closeAlert}
      />
      
      <View style={[styles.header, { paddingHorizontal: spacing(16), paddingVertical: vscale(12) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { padding: scale(4) }]}>
          <Icon name="arrow-left" size={scale(24)} color="#5A5A5A" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: ms(18) }]}>Socius</Text>
        <View style={[styles.headerRight, { width: scale(32) }]} />
      </View>

      <View style={[styles.content, { paddingHorizontal: spacing(24), paddingTop: vscale(30), paddingBottom: vscale(20) }]}>
        <View style={{ width: contentWidth, alignSelf: 'center', alignItems: 'center' }}>
          <MotionView preset="fadeUp" delay={100} style={[styles.pulseContainer, { width: scale(120), height: scale(120), marginBottom: vscale(20) }]}>
            <PulseRing delay={0} size={scale(100)} />
            <PulseRing delay={500} size={scale(100)} />
            <PulseRing delay={1000} size={scale(100)} />
            <View style={[styles.centerDot, { width: scale(32), height: scale(32), borderRadius: scale(16) }]} />
          </MotionView>

          <MotionView preset="fadeUp" delay={200}>
            <Text style={[styles.mainTitle, { fontSize: ms(22), marginBottom: vscale(8) }]}>Your request has been shared.</Text>
            <Text style={[styles.subTitle, { fontSize: ms(15), marginBottom: vscale(30) }]}>People nearby may choose to view it.</Text>
          </MotionView>

          <MotionView preset="fadeUp" delay={300} style={[styles.card, { borderRadius: scale(16), marginBottom: vscale(24) }]}>
            <View style={[styles.cardHeader, { paddingHorizontal: spacing(16), paddingVertical: vscale(12) }]}>
              <Text style={[styles.cardHeaderTitle, { fontSize: ms(16) }]}>What this means</Text>
            </View>
            <View style={[styles.cardBody, { padding: spacing(16) }]}>
              <View style={[styles.bulletItem, { marginBottom: vscale(10) }]}>
                <View style={[styles.bullet, { width: scale(6), height: scale(6), borderRadius: scale(3), marginRight: spacing(10) }]} />
                <Text style={[styles.bulletText, { fontSize: ms(14) }]}>
                  This is <Text style={{fontWeight: '700'}}>not</Text> an emergency dispatch.
                </Text>
              </View>
              <View style={[styles.bulletItem, { marginBottom: vscale(10) }]}>
                <View style={[styles.bullet, { width: scale(6), height: scale(6), borderRadius: scale(3), marginRight: spacing(10) }]} />
                <Text style={[styles.bulletText, { fontSize: ms(14) }]}>No one is required to respond.</Text>
              </View>
              <View style={[styles.bulletItem, { marginBottom: vscale(10) }]}>
                <View style={[styles.bullet, { width: scale(6), height: scale(6), borderRadius: scale(3), marginRight: spacing(10) }]} />
                <Text style={[styles.bulletText, { fontSize: ms(14) }]}>You can cancel at any time.</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={[styles.bullet, { width: scale(6), height: scale(6), borderRadius: scale(3), marginRight: spacing(10) }]} />
                <Text style={[styles.bulletText, { fontSize: ms(14) }]}>You can contact authorities anytime.</Text>
              </View>
            </View>
          </MotionView>

          <MotionView preset="fadeUp" delay={400} style={[styles.viewCountContainer, { marginBottom: vscale(12) }]}>
            <Icon name="eye" size={scale(20)} color="#78909C" />
            <Text style={[styles.viewCountText, { fontSize: ms(14), marginLeft: spacing(8) }]}>Viewed by people nearby</Text>
          </MotionView>
          
          <MotionView preset="fadeUp" delay={500} style={[styles.divider, { height: scale(1), marginBottom: vscale(24) }]} />

          <MotionView preset="fadeUp" delay={600} style={{ width: '100%' }}>
            <MotionPressable 
              style={[styles.waitingButton, { height: vscale(52), borderRadius: scale(26), marginBottom: vscale(16) }]} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('AwarenessShared')}
            >
              <Text style={[styles.waitingButtonText, { fontSize: ms(16) }]}>Continue waiting</Text>
            </MotionPressable>
          </MotionView>

          <MotionView preset="fadeUp" delay={700} style={{ width: '100%' }}>
            <MotionPressable 
              style={[styles.cancelButton, { height: vscale(52), borderRadius: scale(26) }]} 
              activeOpacity={0.8}
              onPress={handleCancelPress}
            >
              <Text style={[styles.cancelButtonText, { fontSize: ms(16) }]}>Cancel request</Text>
            </MotionPressable>
          </MotionView>

          <View style={{ flex: 1 }} />

          <MotionView preset="fadeUp" delay={800} style={[styles.emergencyBar, {marginTop:scale(40), borderRadius: scale(24), paddingVertical: vscale(12), paddingHorizontal: spacing(8) }]}>
            <TouchableOpacity style={styles.emergencyItem} onPress={() => navigation.navigate('EmergencyHelp')}>
              <Icon name="shield-account" size={scale(20)} color="#78909C" />
              <Text style={[styles.emergencyText, { fontSize: ms(13) }]}>Police</Text>
            </TouchableOpacity>
            
            <View style={[styles.verticalDivider, { width: scale(1), height: vscale(20) }]} />
            
            <TouchableOpacity style={styles.emergencyItem} onPress={() => navigation.navigate('EmergencyHelp')}>
              <Icon name="ambulance" size={scale(20)} color="#78909C" />
              <Text style={[styles.emergencyText, { fontSize: ms(13) }]}>Ambulance</Text>
            </TouchableOpacity>
            
            <View style={[styles.verticalDivider, { width: scale(1), height: vscale(20) }]} />
            
            <TouchableOpacity style={styles.emergencyItem} onPress={() => navigation.navigate('EmergencyHelp')}>
              <Icon name="phone" size={scale(20)} color="#78909C" />
              <Text style={[styles.emergencyText, { fontSize: ms(13) }]}>Local Helpline</Text>
            </TouchableOpacity>
          </MotionView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
  },
  headerTitle: {
    fontWeight: '600',
    color: '#333333',
  },
  headerRight: {
  },
  content: {
    flex: 1,
  },
  pulseContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerDot: {
    backgroundColor: '#EF5350',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#EF9A9A',
  },
  reasonOption: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
  },
  reasonOptionSelected: {
    borderColor: '#D84D42',
    backgroundColor: '#FFF2F0',
  },
  reasonOptionText: {
    color: '#444444',
    fontWeight: '600',
  },
  reasonOptionTextSelected: {
    color: '#B93A30',
  },
  mainTitle: {
    fontWeight: '700',
    color: '#333333',
    textAlign: 'center',
  },
  subTitle: {
    color: '#666666',
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  cardHeaderTitle: {
    fontWeight: '700',
    color: '#333333',
  },
  cardBody: {
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bullet: {
    backgroundColor: '#EF5350',
  },
  bulletText: {
    color: '#555555',
    flex: 1,
  },
  viewCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewCountText: {
    color: '#78909C',
  },
  divider: {
    width: '100%',
    backgroundColor: '#E0E0E0',
  },
  waitingButton: {
    width: '100%',
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingButtonText: {
    color: '#333333',
    fontWeight: '600',
  },
  cancelButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E57373',
  },
  cancelButtonText: {
    color: '#E53935',
    fontWeight: '600',
  },
  emergencyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F5F5F5',
  },
  emergencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  emergencyText: {
    color: '#78909C',
    marginLeft: 6,
  },
  verticalDivider: {
    backgroundColor: '#E0E0E0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontWeight: '700',
    color: '#333333',
  },
  modalDescription: {
    color: '#555555',
  },
  modalKeepButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  modalKeepButtonText: {
    color: '#333333',
    fontWeight: '600',
  },
  modalCancelButton: {
    backgroundColor: '#E53935',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalDivider: {
    width: '100%',
    backgroundColor: '#E0E0E0',
  },
  modalFooterText: {
    color: '#777777',
    textAlign: 'center',
  },
});

export default RequestSharedScreen;
