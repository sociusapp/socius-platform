import { getHelpRequestById } from '../../../services/api/incident.api';
import { declineHelpAsVolunteer } from '../../../services/api/volunteer.api';
import { loadAuth } from '../../../services/storage/asyncStorage.service';
import { getSocket } from '../../../services/socket/socket.service';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../../components/common/Header';
import Button from '../../../components/common/Button';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import CustomAlert from '../../../components/common/CustomAlert';
import { useResponsive } from '../../../utils/responsive';

const SomeoneNeedsHelpScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();

  const { requestId: paramRequestId, category: paramCategory, description: paramDescription, distanceMeters: paramDistance, area: paramArea } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [requestData, setRequestData] = useState({
    category: paramCategory,
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
        showAlert(
          'Request Closed',
          'Someone else has accepted this request.',
          [{
            text: 'OK',
            onPress: () => {
              closeAlert();
              setTimeout(() => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
                });
              }, 100);
            }
          }]
        );
      }
    };

    const handleRequestCancelled = (data) => {
      if (data.requestId === requestId) {
        showAlert(
          'Request Cancelled',
          'The user has cancelled this request.',
          [{
            text: 'OK',
            onPress: () => {
              closeAlert();
              setTimeout(() => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
                });
              }, 100);
            }
          }]
        );
      }
    };

    const handleRequestExpired = (data) => {
      if (data.requestId === requestId) {
        showAlert(
          'Request Expired',
          'This request has expired.',
          [{
            text: 'OK',
            onPress: () => {
              closeAlert();
              setTimeout(() => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
                });
              }, 100);
            }
          }]
        );
      }
    };

    if (socket) {
      socket.on('help:request_taken', handleRequestTaken);
      socket.on('help:request_cancelled', handleRequestCancelled);
      socket.on('help:request_expired', handleRequestExpired);
    }

    return () => {
      if (socket) {
        socket.off('help:request_taken', handleRequestTaken);
        socket.off('help:request_cancelled', handleRequestCancelled);
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

    navigation.navigate('SafetyComesFirst', {
      requestId,
      category: requestData.category,
      description: requestData.description,
      distanceMeters: requestData.distanceMeters,
      area: requestData.area
    });
  };

  const [isDeclining, setIsDeclining] = useState(false);
  const handleNotAvailable = async () => {
    if (isDeclining) return;
    try {
      setIsDeclining(true);
      const auth = await loadAuth();
      const token = auth?.accessToken;
      if (token && requestId) {
        await declineHelpAsVolunteer(token, requestId);
      }
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
            <View style={{ marginBottom: vscale(20) }}>
              <LoadingSpinner visible={loading} delayMs={300} message="Loading request…" />
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
                <Icon name="tag-outline" size={scale(25)} color="#5A6F7D" />
                <Text
                  style={[
                    styles.summaryText,
                    { fontSize: ms(15), marginLeft: spacing(12) },
                  ]}
                >
                  {requestData.category ? requestData.category.replace('_', ' ') : 'General Help'}
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
              <View style={[styles.trustIconContainer, { width: scale(56), height: scale(56), borderRadius: scale(28) }]}>
                <Icon name="handshake-outline" size={scale(32)} color={trustSignals.closes_properly ? '#28C76F' : '#E0E0E0'} />
              </View>
              <View style={[styles.trustIconContainer, { width: scale(56), height: scale(56), borderRadius: scale(28) }]}>
                <Icon name="clock-check-outline" size={scale(32)} color={trustSignals.returns_on_time ? '#28C76F' : '#E0E0E0'} />
              </View>
              <View style={[styles.trustIconContainer, { width: scale(56), height: scale(56), borderRadius: scale(28) }]}>
                <Icon name="account-group-outline" size={scale(32)} color={trustSignals.helps_others ? '#007BFF' : '#E0E0E0'} />
              </View>
              <View style={[styles.trustIconContainer, { width: scale(56), height: scale(56), borderRadius: scale(28) }]}>
                <Icon name="calendar-blank-outline" size={scale(32)} color={trustSignals.occasional_requester ? '#FFC107' : '#E0E0E0'} />
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
            <Icon
              name="information-outline"
              size={scale(18)}
              color="#9CA3AF"
              style={{ marginLeft: spacing(8) }}
            />
          </View>

          <View style={[styles.divider, { marginBottom: vscale(20) }]} />

          <View style={{ marginBottom: vscale(10) }}>
            <Button
              title="Open Details"
              onPress={handleOpenDetails}
              variant="gradient"
              fullWidth
              loading={isProcessing}
              disabled={isProcessing}
            />
          </View>

          <Button
            title="Not Available"
            onPress={handleNotAvailable}
            variant="white"
            fullWidth
            loading={isDeclining}
            disabled={isDeclining || isProcessing}
          />
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
  trustIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
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
});

export default SomeoneNeedsHelpScreen;
