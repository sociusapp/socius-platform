import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

import { useResponsive } from '../../../../utils/responsive';
import MotionView from '../../../../components/common/MotionView';
import CustomAlert from '../../../../components/common/CustomAlert';
import { loadAuth } from '../../../../services/storage/asyncStorage.service';
import { getPresenceById, cancelPresenceRequest } from '../../../../services/api/needPresence.api';
import { baseURL as apiBaseURL } from '../../../../services/api/client';
import { isCurrentUserPresenceRequester } from '../../../../utils/presenceRole';

const AwarenessSharedScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const requestId = route?.params?.requestId;

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: 'alert-circle-outline',
    iconColor: '#DC5C69',
  });

  const showAlert = (title, message, buttons = [], icon = 'alert-circle-outline', iconColor = '#DC5C69') => {
    setAlertConfig({ title, message, buttons, icon, iconColor });
    setAlertVisible(true);
  };

  const closeAlert = () => setAlertVisible(false);

  const mapHelpersToMembers = useCallback((data, myId) => {
    const apiRoot = (apiBaseURL || '').replace(/\/api\/?$/, '');
    const acceptedMatches = data?.helpers || [];
    return acceptedMatches.map((h) => {
      const photoPath = h.helperId?.profileImage || h.helperId?.avatarUrl;
      let photoUrl = null;
      if (photoPath) {
        photoUrl = photoPath.startsWith('http')
          ? photoPath
          : `${apiRoot}${photoPath.startsWith('/') ? '' : '/'}${photoPath}`;
      }
      return {
        id: h.helperId?._id || h.helperId?.id,
        name: h.helperId?.firstName || h.helperId?.fullName || h.helperId?.name || 'Community member',
        photo: photoUrl,
        isMe: String(h.helperId?._id || h.helperId?.id) === String(myId),
      };
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!requestId) {
      setLoading(false);
      return;
    }
    try {
      const auth = await loadAuth();
      const token = auth?.accessToken;
      const myId = auth?.user?._id || auth?.user?.id || auth?.userId;
      if (!token) {
        setLoading(false);
        return;
      }
      const response = await getPresenceById(token, requestId);
      if (response?.success) {
        const data = response?.data || response;
        const req = data?.request || data?.presence;
        if (req && myId && !isCurrentUserPresenceRequester(req, myId)) {
          navigation.replace('NearbyMap', { requestId, mode: 'helper' });
          return;
        }
        setMembers(mapHelpersToMembers(data, myId));
      }
    } catch (e) {
      if (e?.response?.status === 404) {
        navigation.replace('RequestClosed');
      }
    } finally {
      setLoading(false);
    }
  }, [requestId, navigation, mapHelpersToMembers]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  const openLiveMap = () => {
    if (!requestId) {
      showAlert('Missing request', 'Unable to open the live view. Please try again from home.', [{ text: 'OK', onPress: closeAlert }]);
      return;
    }
    navigation.navigate('NearbyMap', { requestId, mode: 'requester' });
  };

  const confirmCancel = () => {
    showAlert(
      'Cancel awareness?',
      'People nearby will stop seeing this request. You can share again anytime.',
      [
        { text: 'Keep active', style: 'cancel', onPress: closeAlert },
        {
          text: 'Cancel awareness',
          style: 'destructive',
          onPress: async () => {
            closeAlert();
            if (cancelSubmitting || !requestId) return;
            try {
              setCancelSubmitting(true);
              const auth = await loadAuth();
              const token = auth?.accessToken;
              if (!token) {
                showAlert('Not signed in', 'Please sign in again.', [{ text: 'OK', onPress: closeAlert }]);
                return;
              }
              const response = await cancelPresenceRequest(token, requestId, { reason: 'user_cancelled' });
              if (!response?.success) {
                showAlert(
                  'Unable to cancel',
                  response?.message || 'Something went wrong. Please try again.',
                  [{ text: 'OK', onPress: closeAlert }]
                );
                return;
              }
              navigation.reset({
                index: 0,
                routes: [{ name: 'RequestClosed' }],
              });
            } catch (e) {
              showAlert('Error', e?.message || 'Please try again.', [{ text: 'OK', onPress: closeAlert }]);
            } finally {
              setCancelSubmitting(false);
            }
          },
        },
      ],
      'help-circle-outline',
      '#C94444'
    );
  };

  if (!requestId) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={[styles.centered, { padding: spacing(24) }]}>
          <Text style={[styles.fallbackTitle, { fontSize: ms(18) }]}>Something went wrong</Text>
          <TouchableOpacity
            style={[styles.secondaryBtn, { marginTop: vscale(16), paddingVertical: vscale(14), borderRadius: scale(28) }]}
            onPress={() => navigation.navigate('MainApp', { screen: 'HomeTab' })}
          >
            <Text style={[styles.secondaryBtnText, { fontSize: ms(16) }]}>Go home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
        onClose={closeAlert}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: spacing(24), paddingBottom: vscale(32) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          <MotionView preset="fadeUp" delay={80}>
            <Text style={[styles.screenTitle, { fontSize: ms(26), marginTop: vscale(12), marginBottom: vscale(8) }]}>
              Awareness Shared
            </Text>
            <Text style={[styles.screenSubtitle, { fontSize: ms(15), marginBottom: vscale(28) }]}>
              People nearby may choose to stay aware.
            </Text>
          </MotionView>

          <MotionView preset="fadeUp" delay={120} style={[styles.card, { borderRadius: scale(20), marginBottom: vscale(24) }]}>
            <Text style={[styles.cardLead, { fontSize: ms(17), marginBottom: vscale(8) }]}>Some people nearby have seen this.</Text>
            <Text style={[styles.cardSub, { fontSize: ms(14) }]}>They may or may not choose to come.</Text>
          </MotionView>

          <MotionView preset="fadeUp" delay={160}>
            <View style={styles.dividerLabelRow}>
              <View style={[styles.hr, { height: scale(1) }]} />
              <Text style={[styles.dividerLabel, { fontSize: ms(12), marginHorizontal: spacing(12) }]}>
                Nearby community members
              </Text>
              <View style={[styles.hr, { height: scale(1) }]} />
            </View>
          </MotionView>

          <MotionView preset="fadeUp" delay={200} style={[styles.avatarRow, { marginTop: vscale(20), marginBottom: vscale(24) }]}>
            {loading ? (
              <ActivityIndicator color="#C94444" />
            ) : members.length ? (
              members.slice(0, 6).map((m) => (
                <View key={String(m.id || m.name)} style={styles.avatarItem}>
                  {m.photo ? (
                    <Image source={{ uri: m.photo }} style={[styles.avatar, { width: scale(56), height: scale(56), borderRadius: scale(28) }]} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder, { width: scale(56), height: scale(56), borderRadius: scale(28) }]}>
                      <Icon name="account" size={scale(28)} color="#94A3B8" />
                    </View>
                  )}
                  <Text style={[styles.avatarName, { fontSize: ms(11), marginTop: vscale(6) }]} numberOfLines={1}>
                    {m.name}
                  </Text>
                </View>
              ))
            ) : (
              <View style={[styles.waitingPill, { borderRadius: scale(999), paddingVertical: vscale(10), paddingHorizontal: spacing(16) }]}>
                <Icon name="eye-outline" size={scale(18)} color="#64748B" style={{ marginRight: spacing(8) }} />
                <Text style={[styles.waitingText, { fontSize: ms(14) }]}>Waiting for people nearby to respond</Text>
              </View>
            )}
          </MotionView>

          <MotionView preset="fadeUp" delay={240} style={[styles.card, { borderRadius: scale(20), marginBottom: vscale(28) }]}>
            <Text style={[styles.infoLine, { fontSize: ms(14), marginBottom: vscale(10) }]}>You can cancel this at any time.</Text>
            <Text style={[styles.infoLine, { fontSize: ms(14) }]}>You can also contact emergency services whenever needed.</Text>
          </MotionView>

          <MotionView preset="fadeUp" delay={280}>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={openLiveMap}
              style={[styles.primaryWrap, { borderRadius: scale(28), marginBottom: vscale(14), shadowRadius: scale(8) }]}
            >
              <LinearGradient
                colors={['#D84D42', '#C63F34']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[styles.primaryGradient, { paddingVertical: vscale(16) }]}
              >
                <Text style={[styles.primaryText, { fontSize: ms(17) }]}>View live map & updates</Text>
              </LinearGradient>
            </TouchableOpacity>
          </MotionView>

          <MotionView preset="fadeUp" delay={300}>
            <TouchableOpacity
              style={[
                styles.cancelOutline,
                {
                  borderRadius: scale(28),
                  borderWidth: scale(1),
                  paddingVertical: vscale(16),
                  marginBottom: vscale(12),
                },
              ]}
              onPress={confirmCancel}
              disabled={cancelSubmitting}
              activeOpacity={0.85}
            >
              <Text style={[styles.cancelOutlineText, { fontSize: ms(16) }]}>
                {cancelSubmitting ? 'Cancelling…' : 'Cancel awareness'}
              </Text>
            </TouchableOpacity>
          </MotionView>

          <MotionView preset="fadeUp" delay={320}>
            <TouchableOpacity
              style={[styles.emergencyBtn, { borderRadius: scale(28), paddingVertical: vscale(14), marginBottom: vscale(8) }]}
              onPress={() => navigation.navigate('EmergencyHelp')}
              activeOpacity={0.85}
            >
              <Icon name="phone-in-talk" size={scale(20)} color="#374151" style={{ marginRight: spacing(8) }} />
              <Text style={[styles.emergencyBtnText, { fontSize: ms(15) }]}>Contact emergency services</Text>
            </TouchableOpacity>
            <Text style={[styles.footerNote, { fontSize: ms(12) }]}>If this is urgent or dangerous</Text>
          </MotionView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'stretch',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackTitle: {
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },
  screenTitle: {
    ...Platform.select({
      ios: { fontFamily: 'Georgia' },
      android: { fontFamily: 'serif' },
      default: {},
    }),
    fontWeight: '700',
    color: '#1E293B',
  },
  screenSubtitle: {
    color: '#64748B',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardLead: {
    fontWeight: '700',
    color: '#1E293B',
  },
  cardSub: {
    color: '#64748B',
    lineHeight: 20,
  },
  dividerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hr: {
    flex: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerLabel: {
    color: '#94A3B8',
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  avatarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  avatarItem: {
    alignItems: 'center',
    width: 72,
  },
  avatar: {
    backgroundColor: '#F1F5F9',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarName: {
    color: '#475569',
    textAlign: 'center',
    maxWidth: 72,
  },
  waitingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  waitingText: {
    color: '#475569',
    flexShrink: 1,
  },
  infoLine: {
    color: '#475569',
    lineHeight: 22,
  },
  primaryWrap: {
    overflow: 'hidden',
    shadowColor: '#D84D42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
  },
  primaryGradient: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cancelOutline: {
    alignItems: 'center',
    borderColor: '#E57373',
    backgroundColor: '#FFFFFF',
  },
  cancelOutlineText: {
    color: '#C62828',
    fontWeight: '600',
  },
  emergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emergencyBtnText: {
    color: '#334155',
    fontWeight: '600',
  },
  footerNote: {
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  secondaryBtn: {
    paddingHorizontal: 24,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryBtnText: {
    fontWeight: '600',
    color: '#334155',
  },
});

export default AwarenessSharedScreen;
