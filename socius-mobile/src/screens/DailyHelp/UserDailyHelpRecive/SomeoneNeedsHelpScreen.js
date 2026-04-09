import { getHelpRequestById, acceptHelpRequest } from '../../../services/api/dailyHelp.api';
import { loadAuth, loadDailyHelpSafetyGuideSeen } from '../../../services/storage/asyncStorage.service';
import { getSocket } from '../../../services/socket/socket.service';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../../components/common/Header';
import Button from '../../../components/common/Button';
import { SkeletonBox, SkeletonCircle, SkeletonSpacer } from '../../../components/common/Skeleton';
import CustomAlert from '../../../components/common/CustomAlert';
import { useResponsive } from '../../../utils/responsive';
import { baseURL } from '../../../services/api/client';
import { sociusRefreshProps } from '../../../utils/sociusRefreshControl';

const SomeoneNeedsHelpScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();

  const {
    requestId: paramRequestId,
    category: paramCategory,
    categoryName: paramCategoryName,
    categoryIcon: paramCategoryIcon,
    description: paramDescription,
    distanceMeters: paramDistance,
    area: paramArea,
  } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const requestDataRef = useRef(null);
  const [requestData, setRequestData] = useState({
    category: paramCategory,
    categoryName: paramCategoryName,
    categoryIcon: paramCategoryIcon,
    description: paramDescription,
    distanceMeters: paramDistance,
    area: paramArea,
    requesterTrustSignals: route?.params?.requesterTrustSignals || null,
  });

  const trustSignals = requestData?.requesterTrustSignals || {};

  const requestId = paramRequestId || requestData?.id || requestData?._id;

  // Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: 'alert-circle-outline',
    iconColor: '#DC5C69'
  });

  // Trust Signals Modal State
  const [trustModalVisible, setTrustModalVisible] = useState(false);
  const [acceptConfirmVisible, setAcceptConfirmVisible] = useState(false);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  useEffect(() => {
    requestDataRef.current = requestData;
  }, [requestData]);

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

  useEffect(() => {
    const socket = getSocket();
    const handleRequestTaken = (data) => {
      if (data.requestId === requestId) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
        });
      }
    };

    const handleRequestClosed = (data) => {
      if (data.requestId === requestId) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
        });
      }
    };

    const handleRequestExpired = (data) => {
      if (data.requestId === requestId) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
        });
      }
    };

    if (socket) {
      socket.on('help:request_taken', handleRequestTaken);
      socket.on('help:request_closed', handleRequestClosed);
      socket.on('help:request_expired', handleRequestExpired);
    }

    return () => {
      if (socket) {
        socket.off('help:request_taken', handleRequestTaken);
        socket.off('help:request_closed', handleRequestClosed);
        socket.off('help:request_expired', handleRequestExpired);
      }
    };
  }, [requestId, navigation]);

  const fetchRequestDetails = useCallback(
    async ({ force = false, quiet = false } = {}) => {
      if (!requestId) return;
      const rd = requestDataRef.current;
      if (!force && rd?.description && rd?.category) return;

      if (!quiet) setLoading(true);
      try {
        const auth = await loadAuth();
        const token = auth?.accessToken;
        if (!token) return;

        const response = await getHelpRequestById(token, requestId);
        if (response?.success && response?.data?.request) {
          const req = response.data.request;
          const status = String(req.status || '').toLowerCase();

          // Check for closed statuses instead of allowing only specific ones
          // This prevents issues if 'status' is undefined or a new 'open' status is added
          const closedStatuses = ['accepted', 'matched', 'assigned', 'in_progress', 'cancelled', 'expired', 'completed', 'closed'];

          if (closedStatuses.includes(status)) {
            let title = 'Request Closed';
            let message = 'This request is no longer active.';

            if (status === 'cancelled') {
              title = 'Request Cancelled';
              message = 'The user has cancelled this request.';
            } else if (status === 'expired') {
              title = 'Request Expired';
              message = 'This request has expired.';
            } else if (['accepted', 'matched', 'assigned', 'in_progress'].includes(status)) {
              message = 'Someone else has accepted this request.';
            }

            showAlert(
              title,
              message,
              [
                {
                  text: 'Go Back',
                  onPress: () => {
                    closeAlert();
                    setTimeout(() => {
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
                      });
                    }, 100);
                  }
                },
                {
                  text: 'Retry',
                  onPress: () => {
                    closeAlert();
                    fetchRequestDetails({ force: true });
                  }
                }
              ]
            );
            return;
          }

          setRequestData({
            category: req.category,
            categoryName: req.categoryName,
            categoryIcon: req.categoryIcon,
            description: req.description,
            distanceMeters: req.distanceMeters || paramDistance, // Keep param distance if available (might be calculated locally)
            area: req.location?.address || 'Nearby',
            requesterTrustSignals: req.requesterTrustSignals || null,
          });
        }
      } catch (error) {
        console.error('Failed to fetch request details', error);
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [requestId, paramDistance, navigation]
  );

  useEffect(() => {
    fetchRequestDetails({ force: false });
  }, [fetchRequestDetails]);

  const onPullRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await fetchRequestDetails({ force: true, quiet: true });
    } finally {
      setPullRefreshing(false);
    }
  }, [fetchRequestDetails]);

  const handleOpenDetails = async () => {
    // Check request status before navigating
    if (loading || isProcessing) return;

    try {
      setIsProcessing(true);
      const auth = await loadAuth();
      const token = auth?.accessToken;
      if (!token) return;

      const response = await getHelpRequestById(token, requestId);
      if (response?.success && response?.data?.request) {
        const req = response.data.request;
        const status = String(req.status || '').toLowerCase();

        const closedStatuses = ['accepted', 'matched', 'assigned', 'in_progress', 'cancelled', 'expired', 'completed', 'closed'];

        if (closedStatuses.includes(status)) {
          let title = 'Request Closed';
          let message = 'This request is no longer active.';

          if (status === 'cancelled') {
            title = 'Request Cancelled';
            message = 'The user has cancelled this request.';
          } else if (status === 'expired') {
            title = 'Request Expired';
            message = 'This request has expired.';
          } else if (['accepted', 'matched', 'assigned', 'in_progress'].includes(status)) {
            message = 'Someone else has accepted this request.';
          }

          showAlert(
            title,
            message,
            [{
              text: 'Go Back',
              onPress: () => {
                closeAlert();
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
                });
              }
            },
            {
              text: 'Retry',
              onPress: () => {
                closeAlert();
                handleOpenDetails();
              }
            }]
          );
          return;
        }
      }
    } catch (error) {
      console.log('Error checking request status:', error);
      const status = error?.response?.status;
      const msg = error?.response?.data?.message?.toLowerCase() || '';

      if (status === 409 || status === 404 || msg.includes('taken') || msg.includes('accepted') || msg.includes('assigned') || msg.includes('no longer')) {
        showAlert(
          'Request Closed',
          'Someone else has accepted this request.',
          [{
            text: 'OK',
            onPress: () => {
              closeAlert();
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
              });
            }
          }]
        );
        return;
      }
    } finally {
      setIsProcessing(false);
    }

    try {
      const authForGuide = await loadAuth();
      const uid = authForGuide?.userId;
      if (uid && (await loadDailyHelpSafetyGuideSeen(uid))) {
        setAcceptConfirmVisible(true);
        return;
      }
    } catch (_) {}

    navigation.navigate('DailyHelpSafety', {
      requestId,
      prefillRequest: requestDataRef.current || requestData,
    });
  };

  const handleAcceptFromConfirmModal = async () => {
    if (!requestId) {
      Alert.alert('Error', 'Missing Request ID');
      return;
    }

    setAcceptLoading(true);
    try {
      const auth = await loadAuth();
      const token = auth?.accessToken;
      if (!token) {
        Alert.alert('Error', 'Session expired. Please sign in again.');
        return;
      }

      const response = await acceptHelpRequest(token, requestId);
      if (response?.success) {
        setAcceptConfirmVisible(false);
        navigation.reset({
          index: 0,
          routes: [{ name: 'MatchingMap', params: { requestId, mode: 'helper' } }],
        });
      } else {
        Alert.alert('Error', response?.message || 'Failed to accept request');
      }
    } catch (error) {
      const msg = error?.response?.data?.message || 'Something went wrong. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setAcceptLoading(false);
    }
  };

  const handleNotAvailable = async () => {
    if (isDeclining) return;
    try {
      setIsDeclining(true);
    } catch (error) {
      console.error('Failed to decline request:', error);
    } finally {
      setIsDeclining(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        onBackPress={() => navigation.goBack()}
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, {
          paddingHorizontal: spacing(20),
          paddingTop: vscale(20),
          paddingBottom: vscale(60),
          alignItems: 'center'
        }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={pullRefreshing} onRefresh={onPullRefresh} {...sociusRefreshProps} />}
      >
        <View style={{ width: contentWidth }}>
          <Text
            style={[
              styles.pageTitle,
              { fontSize: ms(22), marginBottom: vscale(20), textAlign: 'center' },
            ]}
          >
            Local Help Request
          </Text>

          {loading ? (
            <View
              style={[
                styles.summaryCard,
                {
                  borderRadius: scale(16),
                  paddingHorizontal: spacing(16),
                  paddingVertical: vscale(14),
                  marginBottom: vscale(24),
                  borderWidth: scale(1),
                  borderColor: '#E2E8F0',
                  backgroundColor: '#FFFFFF',
                  shadowOffset: { width: 0, height: vscale(2) },
                  shadowRadius: scale(8),
                  elevation: scale(2),
                },
              ]}
            >
              <View style={[styles.summaryRow, { paddingVertical: vscale(4) }]}>
                <SkeletonCircle size={scale(25)} />
                <View style={{ flex: 1, marginLeft: spacing(12) }}>
                  <SkeletonBox height={12} radius={10} width="45%" style={{ marginBottom: 8 }} />
                  <SkeletonBox height={10} radius={10} width="35%" />
                </View>
              </View>

              <View style={[styles.summaryDivider, { marginVertical: vscale(6) }]} />

              <View style={[styles.summaryRow, { paddingVertical: vscale(4) }]}>
                <SkeletonCircle size={scale(25)} />
                <View style={{ flex: 1, marginLeft: spacing(12) }}>
                  <SkeletonBox height={12} radius={10} style={{ marginBottom: 8 }} />
                  <SkeletonBox height={12} radius={10} width="70%" />
                </View>
              </View>
              <SkeletonSpacer height={vscale(6)} />
            </View>
          ) : (
            <View
              style={[
                styles.summaryCard,
                {
                  borderRadius: scale(16),
                  paddingHorizontal: spacing(16),
                  paddingVertical: vscale(14),
                  marginBottom: vscale(24),
                  borderWidth: scale(1),
                  shadowOffset: { width: 0, height: vscale(2) },
                  shadowRadius: scale(8),
                  elevation: scale(2),
                },
              ]}
            >
              <View style={[styles.summaryRow, { paddingVertical: vscale(4) }]}>
                {requestData?.categoryIcon ? (
                  <Image
                    source={{ uri: `${baseURL.replace(/\/api\/?$/, '')}${requestData.categoryIcon}` }}
                    style={{ width: scale(25), height: scale(25), borderRadius: scale(7) }}
                    resizeMode="cover"
                  />
                ) : (
                  <Icon name="tag-outline" size={scale(25)} color="#5A6F7D" />
                )}
                <Text
                  style={[
                    styles.summaryText,
                    { fontSize: ms(15), marginLeft: spacing(12), flex: 1 },
                  ]}
                >
                  {String(requestData?.categoryName || requestData?.category || 'General Help').replace(/_/g, ' ').toUpperCase()}
                </Text>
              </View>

              <View style={[styles.summaryDivider, { marginVertical: vscale(6) }]} />

              <View style={[styles.summaryRow, { paddingVertical: vscale(4) }]}>
                <Icon name="hand-heart" size={scale(25)} color="#5A6F7D" />
                <Text
                  style={[
                    styles.summaryText,
                    { fontSize: ms(15), marginLeft: spacing(12), flex: 1 },
                  ]}
                  numberOfLines={2}
                >
                  {requestData.description || 'Someone needs help nearby'}
                </Text>
              </View>

              <View style={[styles.summaryDivider, { marginVertical: vscale(6) }]} />

              <View style={[styles.summaryRow, { paddingVertical: vscale(4) }]}>
                <Icon name="map-marker" size={scale(25)} color="#5A6F7D" />
                <Text
                  style={[
                    styles.summaryText,
                    { fontSize: ms(15), marginLeft: spacing(12) },
                  ]}
                >
                  {requestData.area || 'Nearby'} · {requestData.distanceMeters ? `${Math.round(requestData.distanceMeters)}m away` : 'exact location shown after acceptance'}
                </Text>
              </View>
            </View>
          )}

          <Text
            style={[
              styles.sectionTitle,
              { fontSize: ms(16), marginBottom: vscale(10), textAlign: 'center' },
            ]}
          >
            Community Trust Signals
          </Text>

          <View
            style={[
              styles.trustCard,
              {
                borderRadius: scale(16),
                paddingHorizontal: spacing(16),
                paddingVertical: vscale(12),
                marginBottom: vscale(12),
                shadowOffset: { width: 0, height: vscale(2) },
                shadowRadius: scale(8),
                elevation: scale(2),
              },
            ]}
          >
            <View style={[styles.trustRow, { justifyContent: 'space-around' }]}>
              <View style={{ alignItems: 'center', opacity: trustSignals?.closes_properly ? 1 : 0.45 }}>
                <Icon name="check-decagram" size={scale(24)} color={trustSignals?.closes_properly ? '#16A34A' : '#9CA3AF'} />
                <Text style={{ marginTop: vscale(4), fontSize: ms(11), color: '#64748B' }}>Closes</Text>
              </View>
              <View style={{ alignItems: 'center', opacity: trustSignals?.returns_on_time ? 1 : 0.45 }}>
                <Icon name="clock-check-outline" size={scale(24)} color={trustSignals?.returns_on_time ? '#16A34A' : '#9CA3AF'} />
                <Text style={{ marginTop: vscale(4), fontSize: ms(11), color: '#64748B' }}>Returns</Text>
              </View>
              <View style={{ alignItems: 'center', opacity: trustSignals?.also_helps_others ? 1 : 0.45 }}>
                <Icon name="hand-heart" size={scale(24)} color={trustSignals?.also_helps_others ? '#F59E0B' : '#9CA3AF'} />
                <Text style={{ marginTop: vscale(4), fontSize: ms(11), color: '#64748B' }}>Helps</Text>
              </View>
              <View style={{ alignItems: 'center', opacity: trustSignals?.occasional_requester ? 1 : 0.45 }}>
                <Icon name="calendar-check-outline" size={scale(24)} color={trustSignals?.occasional_requester ? '#F59E0B' : '#9CA3AF'} />
                <Text style={{ marginTop: vscale(4), fontSize: ms(11), color: '#64748B' }}>Occasional</Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: vscale(24) }}>
            <Text
              style={[
                styles.trustInfoText,
                { fontSize: ms(13), flex: 1, lineHeight: vscale(18) },
              ]}
            >
              These signals reflect past local interactions — not ratings or scores.
            </Text>
            <TouchableOpacity
              onPress={() => setTrustModalVisible(true)}
              activeOpacity={0.7}
              style={{ marginLeft: spacing(8), padding: scale(4) }}
            >
              <Icon
                name="information-outline"
                size={scale(18)}
                color="#9CA3AF"
              />
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { marginBottom: vscale(20) }]} />

          <View style={{ marginBottom: vscale(12) }}>
            <TouchableOpacity
              style={[styles.openDetailsBtn, { borderRadius: scale(28), paddingVertical: vscale(16) }]}
              onPress={handleOpenDetails}
              disabled={isProcessing}
              activeOpacity={0.9}
            >
              <Text style={[styles.openDetailsText, { fontSize: ms(16) }]}>Open Details</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.notAvailableBtn, { borderRadius: scale(28), paddingVertical: vscale(16), borderWidth: 1 }]}
            onPress={handleNotAvailable}
            disabled={isDeclining || isProcessing}
            activeOpacity={0.9}
          >
            <Text style={[styles.notAvailableText, { fontSize: ms(16) }]}>Not Available</Text>
          </TouchableOpacity>
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

      {/* Trust Signals Modal */}
      <Modal
        transparent
        visible={trustModalVisible}
        animationType="fade"
        onRequestClose={() => setTrustModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { borderRadius: scale(20), padding: spacing(20) }]}>
            <Text style={[styles.modalTitle, { fontSize: ms(18), marginBottom: vscale(16) }]}>
              Community Trust Signals
            </Text>

            <View style={[styles.modalItem, { marginBottom: vscale(12) }]}>
              <Icon name="check-decagram" size={scale(28)} color={trustSignals?.closes_properly ? '#16A34A' : '#9CA3AF'} style={{ marginRight: spacing(12) }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalItemTitle, { fontSize: ms(14) }]}>Closes requests properly</Text>
                <Text style={[styles.modalItemDesc, { fontSize: ms(12) }]}>This person properly completes requests</Text>
              </View>
            </View>

            <View style={[styles.modalItem, { marginBottom: vscale(12) }]}>
              <Icon name="clock-check-outline" size={scale(28)} color={trustSignals?.returns_on_time ? '#16A34A' : '#9CA3AF'} style={{ marginRight: spacing(12) }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalItemTitle, { fontSize: ms(14) }]}>Returns items on time</Text>
                <Text style={[styles.modalItemDesc, { fontSize: ms(12) }]}>This person returns borrowed items promptly</Text>
              </View>
            </View>

            <View style={[styles.modalItem, { marginBottom: vscale(12) }]}>
              <Icon name="hand-heart" size={scale(28)} color={trustSignals?.also_helps_others ? '#F59E0B' : '#9CA3AF'} style={{ marginRight: spacing(12) }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalItemTitle, { fontSize: ms(14) }]}>Also helps others</Text>
                <Text style={[styles.modalItemDesc, { fontSize: ms(12) }]}>This person actively helps others in community</Text>
              </View>
            </View>

            <View style={[styles.modalItem, { marginBottom: vscale(20) }]}>
              <Icon name="calendar-check-outline" size={scale(28)} color={trustSignals?.occasional_requester ? '#F59E0B' : '#9CA3AF'} style={{ marginRight: spacing(12) }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalItemTitle, { fontSize: ms(14) }]}>Occasional requester</Text>
                <Text style={[styles.modalItemDesc, { fontSize: ms(12) }]}>This person requests help occasionally, not frequently</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.modalCloseBtn, { borderRadius: scale(12), paddingVertical: vscale(14) }]}
              onPress={() => setTrustModalVisible(false)}
              activeOpacity={0.9}
            >
              <Text style={[styles.modalCloseText, { fontSize: ms(16) }]}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={acceptConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !acceptLoading && setAcceptConfirmVisible(false)}
      >
        <View style={styles.acceptModalOverlay}>
          <View style={[styles.acceptModalContainer, { padding: spacing(24) }]}>
            <View style={styles.acceptModalIconWrap}>
              <Icon name="hand-heart" size={scale(40)} color="#FFFFFF" />
            </View>
            <Text style={[styles.acceptModalTitle, { fontSize: ms(22), marginBottom: vscale(12) }]}>
              Accept Request?
            </Text>
            <Text style={[styles.acceptModalMessage, { fontSize: ms(15), marginBottom: vscale(24), lineHeight: vscale(22) }]}>
              Are you sure you want to help? You should be nearby and able to assist.
            </Text>
            <View style={styles.acceptModalActions}>
              <TouchableOpacity
                style={[styles.acceptModalCancelBtn, { paddingVertical: vscale(14), borderRadius: scale(12) }]}
                onPress={() => setAcceptConfirmVisible(false)}
                disabled={acceptLoading}
                activeOpacity={0.8}
              >
                <Text style={[styles.acceptModalCancelText, { fontSize: ms(16) }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.acceptModalAcceptBtn,
                  { paddingVertical: vscale(14), borderRadius: scale(12), opacity: acceptLoading ? 0.7 : 1 },
                ]}
                onPress={handleAcceptFromConfirmModal}
                disabled={acceptLoading}
                activeOpacity={0.8}
              >
                <Text style={[styles.acceptModalAcceptText, { fontSize: ms(16) }]}>
                  {acceptLoading ? 'Processing...' : 'Accept'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  pageTitle: {
    fontFamily: 'Inter-Bold',
    color: '#1A1C1E',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F0F2F5',
    shadowColor: '#000',
    shadowOpacity: 0.05,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryText: {
    fontFamily: 'Inter-Medium',
    color: '#495057',
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E8EAED',
    width: '100%',
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    color: '#2C3E50',
  },
  trustCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F2F5',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trustInfoText: {
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    width: '100%',
  },
  openDetailsBtn: {
    backgroundColor: '#D84D42',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  openDetailsText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  notAvailableBtn: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notAvailableText: {
    color: '#374151',
    fontWeight: '500',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalItemTitle: {
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  modalItemDesc: {
    color: '#6B7280',
    lineHeight: 18,
  },
  modalCloseBtn: {
    backgroundColor: '#D84D42',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  acceptModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  acceptModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  acceptModalIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D84D42',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#D84D42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  acceptModalTitle: {
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  acceptModalMessage: {
    color: '#64748B',
    textAlign: 'center',
  },
  acceptModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  acceptModalCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  acceptModalCancelText: {
    fontWeight: '600',
    color: '#64748B',
  },
  acceptModalAcceptBtn: {
    flex: 1,
    backgroundColor: '#D84D42',
    alignItems: 'center',
    shadowColor: '#D84D42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  acceptModalAcceptText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default SomeoneNeedsHelpScreen;
