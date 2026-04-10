import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../../../components/common/Header';
import Button from '../../../../components/common/Button';
import { SkeletonBox, SkeletonCircle, SkeletonSpacer } from '../../../../components/common/Skeleton';
import { useResponsive } from '../../../../utils/responsive';
import { getHelpRequestById } from '../../../../services/api/dailyHelp.api';
import { acceptHelpAsVolunteer, declineHelpAsVolunteer } from '../../../../services/api/volunteer.api';
import { loadAuth } from '../../../../services/storage/asyncStorage.service';
import { getSocket } from '../../../../services/socket/socket.service';
import NativeCallService from '../../../../services/notifications/NativeCallService';
import CustomAlert from '../../../../components/common/CustomAlert';
import { baseURL } from '../../../../services/api/client';
import { sociusRefreshProps } from '../../../../utils/sociusRefreshControl';

const LocalRequestScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const requestId = route?.params?.requestId;
  const viewedMarkedRef = useRef(false);
  const baseRoot = useMemo(() => String(baseURL || '').replace(/\/api\/?$/, ''), []);

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
        // Stop the alarm/notification if it's still ringing
        NativeCallService.cancelCallNotification(requestId);
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
        });
      }
    };

    const handleRequestClosed = (data) => {
      if (data.requestId === requestId) {
        NativeCallService.cancelCallNotification(requestId);
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
        });
      }
    };

    const handleRequestExpired = (data) => {
      if (data.requestId === requestId) {
        NativeCallService.cancelCallNotification(requestId);
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

  const handleOpenDetails = async () => {
    if (submitting || !requestId) {
      return;
    }

    showAlert(
      'Accept Request',
      'By accepting, you agree to help this community member. Your location will be shared with them.',
      [
        { text: 'Cancel', style: 'cancel', onPress: closeAlert },
        {
          text: 'Accept & View Location',
          onPress: async () => {
            closeAlert();
            setSubmitting(true);
            try {
              const auth = await loadAuth();
              const token = auth?.accessToken;

              if (!token) {
                showAlert('Not signed in', 'Please sign in again to respond to this request.');
                return;
              }

              const response = await acceptHelpAsVolunteer(token, requestId);

              if (response?.success) {
                navigation.reset({
                  index: 1,
                  routes: [
                    { name: 'MainApp', params: { screen: 'HomeTab' } },
                    { name: 'MatchingMap', params: { requestId } },
                  ],
                });
                return;
              }

              const msg = response?.message?.toLowerCase() || '';
              if (msg.includes('taken') || msg.includes('accepted') || msg.includes('assigned') || msg.includes('no longer') || msg.includes('not pending')) {
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
                 return;
              }

              showAlert(
                'Unable to accept',
                response?.message || 'Something went wrong while accepting this request.'
              );
            } catch (error) {
              const status = error?.response?.status;
              const messageFromServer =
                error?.response?.data?.message ||
                error?.response?.data?.errors?.[0]?.message;
              
              const msg = messageFromServer?.toLowerCase() || '';
              if (status === 409 || status === 404 || msg.includes('taken') || msg.includes('accepted') || msg.includes('assigned') || msg.includes('no longer') || msg.includes('not pending')) {
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

              showAlert(
                status ? `Error (${status})` : 'Error',
                messageFromServer || 'Something went wrong while accepting this request.'
              );
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const handleStayAway = async () => {
    if (submitting || !requestId) {
      navigation.navigate('StayAway');
      return;
    }

    setSubmitting(true);

    try {
      const auth = await loadAuth();
      const token = auth?.accessToken;

      if (!token) {
        showAlert('Not signed in', 'Please sign in again to respond to this request.');
        return;
      }

      console.log('[LocalRequest] Not Available clicked', { requestId });
      const declineResponse = await declineHelpAsVolunteer(token, requestId);
      if (!declineResponse?.success) {
        throw new Error(declineResponse?.message || 'Unable to mark Not Available');
      }
      console.log('[LocalRequest] Not Available API success', { requestId });
      navigation.navigate('StayAway', { requestId });
    } catch (error) {
      console.error('[LocalRequest] Not Available API failed', error);
      showAlert(
        'Unable to update status',
        error?.response?.data?.message || error?.message || 'Please try again.',
        [
          { text: 'Retry', onPress: () => { closeAlert(); handleStayAway(); }, style: 'primary' },
          { text: 'Cancel', onPress: closeAlert, style: 'cancel' },
        ]
      );
    } finally {
      setSubmitting(false);
    }
  };

  const loadRequest = useCallback(async (opts = {}) => {
    const suppressLoading = Boolean(opts.suppressLoading);
    if (!requestId) {
      showAlert('Request not found', 'Unable to load this request.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      return;
    }

    if (!suppressLoading) setLoading(true);
    try {
      const auth = await loadAuth();
      const token = auth?.accessToken;

      if (!token) {
        showAlert('Not signed in', 'Please sign in again to view this request.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        return;
      }

      const response = await getHelpRequestById(token, requestId, { cacheTtlMs: 0 });
      console.log('[LocalRequest] Screen opened / request fetched', { requestId });

      if (response?.success && response?.data?.request) {
        const req = response.data.request;
        const status = String(req.status || '').toLowerCase();
        
        // Check if request is closed/taken
        // We use an exclusion list to allow 'pending', 'searching', and other potentially open statuses
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
           return;
        }
        setRequest(req);
      } else {
        showAlert(
          'Unable to load',
          response?.message || 'Unable to load request details.',
          [
            { text: 'Go Back', onPress: () => navigation.goBack() },
            { text: 'Retry', onPress: () => { closeAlert(); loadRequest(); } }
          ]
        );
      }
    } catch (error) {
      const status = error?.response?.status;
      const messageFromServer =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.[0]?.message;

      showAlert(
        status ? `Error (${status})` : 'Error',
        messageFromServer || 'Unable to load this request.',
        [
          { text: 'Go Back', onPress: () => navigation.goBack() },
          { text: 'Retry', onPress: () => { closeAlert(); loadRequest(); } }
        ]
      );
    } finally {
      if (!suppressLoading) setLoading(false);
    }
  }, [requestId, navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadRequest({ suppressLoading: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadRequest]);

  useEffect(() => {
    if (!requestId || viewedMarkedRef.current) return;
    viewedMarkedRef.current = true;
    // Force a network read once so backend can mark viewedAt immediately.
    loadRequest();
  }, [requestId, loadRequest]);

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{ padding: 8 }}>
            <Icon name="cog" size={24} color="#999999" />
          </TouchableOpacity>
        }
        style={{ borderBottomWidth: 1, borderBottomColor: '#E8EAED' }}
      />
      <ScrollView 
        contentContainerStyle={[styles.scroll, { 
          paddingHorizontal: spacing(20),
          paddingTop: vscale(20),
          paddingBottom: vscale(60),
          alignItems: 'center'
        }]} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...sociusRefreshProps} />}
      >
        {loading ? (
          <View style={{ width: contentWidth }}>
            <SkeletonBox height={20} radius={10} width="55%" style={{ marginBottom: vscale(10) }} />
            <SkeletonBox height={12} radius={10} width="70%" style={{ marginBottom: vscale(14) }} />

            <View style={[styles.requestCard, { 
              borderRadius: scale(18),
              borderWidth: scale(1),
              borderColor: '#E2E8F0',
              paddingHorizontal: spacing(18),
              paddingVertical: vscale(16),
              marginBottom: vscale(16),
              backgroundColor: '#FFFFFF'
            }]}>
              <SkeletonBox height={12} radius={10} width="35%" style={{ marginBottom: vscale(12) }} />
              <View style={[styles.requestRow, { marginTop: vscale(8), marginBottom: vscale(10), gap: spacing(10) }]}>
                <SkeletonCircle size={scale(22)} />
                <View style={{ flex: 1 }}>
                  <SkeletonBox height={12} radius={10} style={{ marginBottom: 8 }} />
                  <SkeletonBox height={12} radius={10} width="80%" />
                </View>
              </View>
              <View style={[styles.metaRow, { gap: spacing(6) }]}>
                <SkeletonCircle size={scale(18)} />
                <SkeletonBox height={10} radius={10} width="70%" />
              </View>
            </View>

            <SkeletonBox height={48} radius={12} style={{ marginBottom: vscale(12) }} />
            <SkeletonBox height={48} radius={12} />
            <SkeletonSpacer height={vscale(30)} />
          </View>
        ) : (
        <View style={{ width: contentWidth }}>
          <Text style={[styles.title, { fontSize: ms(22), marginBottom: vscale(6) }]}>Local help nearby?</Text>
          <Text style={[styles.subtitle, { fontSize: ms(14), marginBottom: vscale(14) }]}>A short request around your area.</Text>

          <View style={[styles.requestCard, { 
            borderRadius: scale(18),
            borderWidth: scale(1),
            paddingHorizontal: spacing(18),
            paddingVertical: vscale(16),
            marginBottom: vscale(16),
            shadowOffset: { width: 0, height: vscale(2) },
            shadowRadius: scale(6),
            elevation: scale(2)
          }]}>
            <Text style={[styles.requestLabel, { 
              fontSize: ms(14), 
              marginBottom: vscale(8),
              paddingBottom: vscale(8),
              borderBottomWidth: scale(1)
            }]}>Nearby request</Text>
            <View style={[styles.requestRow, { 
              marginTop: vscale(8),
              marginBottom: vscale(10),
              gap: spacing(10)
            }]}>
              {request?.categoryIcon ? (
                <Image
                  source={{ uri: `${baseRoot}${request.categoryIcon}` }}
                  style={{ width: scale(22), height: scale(22), borderRadius: scale(6) }}
                  resizeMode="cover"
                />
              ) : (
                <Icon name="printer" size={scale(22)} color="#DC5C69" />
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.requestText, { fontSize: ms(14), lineHeight: vscale(20), fontWeight: '700' }]} numberOfLines={1}>
                  {String(request?.categoryName || request?.category || 'General Help').replace(/_/g, ' ').toUpperCase()}
                </Text>
                <Text style={[styles.requestText, { fontSize: ms(15), lineHeight: vscale(22) }]} numberOfLines={2}>
                  {request?.description || 'Local help request'}
                </Text>
              </View>
            </View>
            <View style={[styles.metaRow, { gap: spacing(6) }]}>
              <Icon name="map-marker" size={scale(18)} color="#999999" />
              <Text style={[styles.metaText, { fontSize: ms(13) }]}>Approximate location, visible temporarily</Text>
            </View>
          </View>

          <View style={[styles.infoBox, { 
            gap: spacing(10),
            borderRadius: scale(16),
            borderWidth: scale(1),
            paddingHorizontal: spacing(16),
            paddingVertical: vscale(14),
            marginBottom: vscale(16)
          }]}>
            <Icon name="information" size={scale(20)} color="#999999" />
            <Text style={[styles.infoText, { fontSize: ms(14), lineHeight: vscale(22) }]}>
              You can choose to open details or stay away. There’s no obligation.
            </Text>
          </View>

          <Button
            title={submitting ? 'Processing...' : 'Open Details'}
            onPress={handleOpenDetails}
            fullWidth
            disabled={submitting}
            icon={<Icon name="clipboard-text-outline" size={scale(18)} color="#FFFFFF" />}
            accessibilityLabel="Open request details"
          />
          <Button
            title="Stay Away"
            onPress={handleStayAway}
            variant="white"
            fullWidth
            disabled={submitting}
            icon={<Icon name="shield-alert-outline" size={scale(18)} color="#2C3E50" />}
            accessibilityLabel="Stay away from this request"
          />
        </View>
        )}
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
  title: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },
  subtitle: {
    color: '#666666',
    textAlign: 'center',
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },
  requestLabel: {
    fontWeight: '500',
    color: '#999999',
    borderBottomColor: '#E8EAED',
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  requestText: {
    flex: 1,
    fontWeight: '600',
    color: '#2C3E50',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: '#666666',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9F9F9',
    borderColor: '#E8EAED',
  },
  infoText: {
    flex: 1,
    color: '#2C3E50',
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LocalRequestScreen;
