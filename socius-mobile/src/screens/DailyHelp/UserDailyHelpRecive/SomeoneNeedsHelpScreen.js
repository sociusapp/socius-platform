import { getHelpRequestById } from '../../../services/api/incident.api';
import { acceptHelpAsVolunteer } from '../../../services/api/volunteer.api';
import { loadAuth } from '../../../services/storage/asyncStorage.service';
import { getSocket } from '../../../services/socket/socket.service';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../../components/common/Header';
import Button from '../../../components/common/Button';
import { SkeletonBox, SkeletonCircle, SkeletonSpacer } from '../../../components/common/Skeleton';
import CustomAlert from '../../../components/common/CustomAlert';
import { useResponsive } from '../../../utils/responsive';
import { baseURL } from '../../../services/api/client';

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
  const [requestData, setRequestData] = useState({
    category: paramCategory,
    categoryName: paramCategoryName,
    categoryIcon: paramCategoryIcon,
    description: paramDescription,
    distanceMeters: paramDistance,
    area: paramArea
  });

  // Placeholder for trust signals
  const [trustSignals, setTrustSignals] = useState({
    closes_properly: true,
    returns_on_time: true,
    helps_others: true,
    occasional_requester: true,
  });

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

  useEffect(() => {
    const fetchRequestDetails = async () => {
      if (!requestId || (requestData.description && requestData.category)) return;

      setLoading(true);
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
                    setLoading(true);
                    fetchRequestDetails();
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
            area: req.location?.address || 'Nearby'
          });
        }
      } catch (error) {
        console.error('Failed to fetch request details', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequestDetails();
  }, [requestId]);

  const [isProcessing, setIsProcessing] = useState(false);
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

    navigation.navigate('DailyHelpSafety', {
      requestId,
      prefillRequest: requestData
    });
  };

  const [isDeclining, setIsDeclining] = useState(false);
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
                  <SkeletonBox height={12} radius={10} style={{ marginBottom: 8 }} />
                  <SkeletonBox height={12} radius={10} width="70%" />
                </View>
              </View>

              <View style={[styles.summaryDivider, { marginVertical: vscale(6) }]} />

              <View style={[styles.summaryRow, { paddingVertical: vscale(4) }]}>
                <SkeletonCircle size={scale(25)} />
                <View style={{ flex: 1, marginLeft: spacing(12) }}>
                  <SkeletonBox height={12} radius={10} width="45%" style={{ marginBottom: 8 }} />
                  <SkeletonBox height={10} radius={10} width="35%" />
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
                    { fontSize: ms(15), marginLeft: spacing(12) },
                  ]}
                >
                  {String(requestData?.categoryName || requestData?.category || 'General Help').replace(/_/g, ' ').toUpperCase()}
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
              <Image source={require('../../../assets/images/daily-4.png')} style={{ width: scale(48), height: scale(48) }} resizeMode="contain" />
              <Image source={require('../../../assets/images/daily-3.png')} style={{ width: scale(48), height: scale(48) }} resizeMode="contain" />
              <Image source={require('../../../assets/images/daily-2.png')} style={{ width: scale(48), height: scale(48) }} resizeMode="contain" />
              <Image source={require('../../../assets/images/daily-1.png')} style={{ width: scale(48), height: scale(48) }} resizeMode="contain" />
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
              <Image source={require('../../../assets/images/daily-4.png')} style={{ width: scale(32), height: scale(32), marginRight: spacing(12) }} resizeMode="contain" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalItemTitle, { fontSize: ms(14) }]}>Closes requests properly</Text>
                <Text style={[styles.modalItemDesc, { fontSize: ms(12) }]}>This person properly completes requests</Text>
              </View>
            </View>

            <View style={[styles.modalItem, { marginBottom: vscale(12) }]}>
              <Image source={require('../../../assets/images/daily-3.png')} style={{ width: scale(32), height: scale(32), marginRight: spacing(12) }} resizeMode="contain" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalItemTitle, { fontSize: ms(14) }]}>Returns items on time</Text>
                <Text style={[styles.modalItemDesc, { fontSize: ms(12) }]}>This person returns borrowed items promptly</Text>
              </View>
            </View>

            <View style={[styles.modalItem, { marginBottom: vscale(12) }]}>
              <Image source={require('../../../assets/images/daily-2.png')} style={{ width: scale(32), height: scale(32), marginRight: spacing(12) }} resizeMode="contain" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalItemTitle, { fontSize: ms(14) }]}>Also helps others</Text>
                <Text style={[styles.modalItemDesc, { fontSize: ms(12) }]}>This person actively helps others in community</Text>
              </View>
            </View>

            <View style={[styles.modalItem, { marginBottom: vscale(20) }]}>
              <Image source={require('../../../assets/images/daily-1.png')} style={{ width: scale(32), height: scale(32), marginRight: spacing(12) }} resizeMode="contain" />
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
});

export default SomeoneNeedsHelpScreen;
