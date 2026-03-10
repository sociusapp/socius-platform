import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, BackHandler, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../../components/common/Header';
import Button from '../../../components/common/Button';
import { useResponsive } from '../../../utils/responsive';
import { getMyActiveHelpRequest, cancelHelpRequest } from '../../../services/api/incident.api';
import { loadAuth } from '../../../services/storage/asyncStorage.service';
import { connectSocket, disconnectSocket } from '../../../services/socket/socket.service';
import CustomAlert from '../../../components/common/CustomAlert';

const RequestSuccessScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const { initialRequest, initialNoHelpers } = route?.params || {};
  const [loading, setLoading] = useState(!initialRequest);
  const [request, setRequest] = useState(initialRequest || null);
  
  // No Helpers Modal State
  const [noHelpersModalVisible, setNoHelpersModalVisible] = useState(initialNoHelpers || false);
  const [cancelling, setCancelling] = useState(false);
  const requestRef = React.useRef(null);

  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const currentRequest = requestRef.current;
      // Check if request is loaded and active
      if (currentRequest) {
        // Status checks for active/pending request
        const isWaiting = ['PENDING', 'SEARCHING', 'open', 'matching'].includes(currentRequest.status);
        // Check if no helpers have been notified (radius check proxy)
        const noHelpersFound = (currentRequest?.stats?.notificationSentCount || 0) === 0;

        if (isWaiting && noHelpersFound) {
          setNoHelpersModalVisible(true);
        }
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleNoHelpersCancel = async () => {
    if (cancelling || !request) return;
    setCancelling(true);
    try {
      const auth = await loadAuth();
      const token = auth?.accessToken;
      if (token) {
        // Use 'no_helpers_nearby' as the reason
        const response = await cancelHelpRequest(token, request.id || request._id, { reason: 'no_helpers_nearby' });
        
        if (response?.success) {
           setNoHelpersModalVisible(false);
           navigation.reset({
             index: 0,
             routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
           });
           return;
        }
      }
      // If failed or no token
      setNoHelpersModalVisible(false);
      showAlert('Error', 'Failed to cancel request. Please try again.');
    } catch (error) {
      console.log('Error cancelling:', error);
      setNoHelpersModalVisible(false);
      showAlert('Error', 'Failed to cancel request.');
    } finally {
      setCancelling(false);
    }
  };


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

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleEditRequest = () => {
    if (!request) {
      return;
    }

    navigation.navigate('AddDetails', {
      description: request.description || '',
      time: '',
      helpType: {
        id: null,
        label: request.category || 'Everyday Help',
        icon: 'flower',
        color: '#DC5C69',
      },
    });
  };

  const handleBackToHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
    });
  };

  const handleCancelRequest = () => {
    if (!request) {
      return;
    }

    navigation.navigate('CancelRequest', {
      requestId: request.id || request._id,
    });
  };

  const handleCloseRequest = () => {
    if (!request) {
      return;
    }

    navigation.navigate('ClosingRequest', {
      requestId: request.id || request._id,
    });
  };

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (request) {
           showAlert('Active Request', 'Your request is currently active. You must cancel the request to leave this screen.', [
             { text: 'Stay Here', style: 'cancel', onPress: closeAlert },
             { text: 'Cancel Request', style: 'destructive', onPress: () => {
                closeAlert();
                handleCancelRequest();
             }}
           ]);
           return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [request])
  );

  useEffect(() => {
    let intervalId;
    let socket;

    const loadActiveRequest = async () => {
      try {
        const auth = await loadAuth();
        const token = auth?.accessToken;

        if (!token) {
          showAlert('Not signed in', 'Please sign in again to view your request.', [{
            text: 'OK',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
              });
            }
          }]);
          return;
        }

        const response = await getMyActiveHelpRequest(token);
        if (response?.success && response?.data) {
          // Handle new response structure { activeRequest, activeHelp }
          // If response.data has activeRequest property, use it. Otherwise assume it's the request object itself (backward compatibility)
          const activeRequest = response.data.activeRequest !== undefined ? response.data.activeRequest : response.data;
          
          if (activeRequest) {
            setRequest(activeRequest);
          } else {
             // No active request found
             if (loading) {
                showAlert('No active request', 'You do not have an active request right now.', [
                  {
                    text: 'Go Back',
                    onPress: () => {
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
                      setLoading(true);
                      loadActiveRequest();
                    }
                  }
                ]);
             }
          }
        } else {
           if (loading) {
              showAlert('No active request', 'You do not have an active request right now.', [
                {
                  text: 'Go Back',
                  onPress: () => {
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
                    setLoading(true);
                    loadActiveRequest();
                  }
                }
              ]);
           }
        }
      } catch (error) {
        console.log('Error loading active request:', error);
        
        const status = error?.response?.status;
        
        if (status === 401) {
             showAlert('Session Expired', 'Please sign in again.', [{
               text: 'OK',
               onPress: () => {
                 navigation.reset({
                    index: 0,
                    routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
                 });
               }
             }]);
             return;
        }

        if (loading) {
            const messageFromServer =
            error?.response?.data?.message ||
            error?.response?.data?.errors?.[0]?.message;

            showAlert(
            status ? `Error (${status})` : 'Error',
            messageFromServer || 'Unable to load your active request.'
            );
        }
      } finally {
        setLoading(false);
      }
    };

    const setupSocket = async () => {
      socket = await connectSocket();
      if (socket) {
        // Listen for help accepted event
        socket.on('help:accepted', (data) => {
          console.log('Socket event: help:accepted', data);
          loadActiveRequest();
        });

        // Listen for stats updates (viewed, declined, etc.)
        socket.on('help:request_updated', (data) => {
          console.log('Socket event: help:request_updated', data);
          loadActiveRequest();
        });
      }
    };

    // Initial load
    loadActiveRequest();
    setupSocket();
    
    intervalId = setInterval(loadActiveRequest, 30000);

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (socket) {
        socket.off('help:accepted');
        // We might not want to disconnect globally if other screens use it, 
        // but for now this screen is the main user. 
        // Better to leave connection open or manage globally.
        // disconnectSocket(); 
      }
    };
  }, [navigation]);

  useEffect(() => {
    if (['accepted', 'in_progress', 'matched', 'en_route', 'arrived', 'active'].includes(String(request?.status).toLowerCase())) {
       navigation.reset({
          index: 1,
          routes: [
            { name: 'MainApp', params: { screen: 'HomeTab' } },
            { name: 'RequesterMatchingMap', params: { requestId: request.id || request._id } }
          ]
       });
    }
  }, [request?.status, navigation]);

  const renderContent = () => {
    if (['accepted', 'in_progress', 'matched', 'en_route', 'arrived', 'active'].includes(String(request?.status).toLowerCase())) {
         return (
            <View style={{ width: contentWidth }}>
                <View style={[styles.successContainer, { height: vscale(120), marginBottom: vscale(18) }]}>
                    <View style={[styles.pulseRing1, { width: scale(90), height: scale(90), borderRadius: scale(45), backgroundColor: '#E7F9F0', shadowColor: '#28C76F' }]} />
                    <View style={[styles.pulseRing2, { width: scale(68), height: scale(68), borderRadius: scale(34), backgroundColor: '#D0F4E2', shadowColor: '#28C76F' }]} />
                    <View style={[styles.successCircle, { width: scale(48), height: scale(48), borderRadius: scale(24), backgroundColor: '#28C76F' }]}>
                         <Icon name="check" size={scale(24)} color="#FFFFFF" />
                    </View>
                </View>

                <View style={[styles.messageSection, { marginBottom: vscale(28) }]}>
                    <Text style={[styles.successTitle, { fontSize: ms(22), marginBottom: vscale(6), lineHeight: ms(28) }]}>Match Found!</Text>
                    <Text style={[styles.successSubtitle, { fontSize: ms(15), lineHeight: ms(22) }]}>A volunteer is on their way.</Text>
                </View>

                 <View style={[styles.requestDetailsCard, { 
                    borderRadius: scale(22),
                    borderWidth: scale(1),
                    paddingHorizontal: spacing(20),
                    paddingVertical: vscale(18),
                    marginBottom: vscale(20),
                    shadowOffset: { width: 0, height: vscale(3) },
                    shadowRadius: scale(8),
                    elevation: scale(3)
                }]}>
                    <Text style={[styles.cardLabel, { fontSize: ms(13), marginBottom: vscale(10), paddingBottom: vscale(10), borderBottomWidth: scale(1) }]}>Volunteer Details</Text>
                     {request.volunteer ? (
                        <>
                             <Text style={[styles.requestTitle, { fontSize: ms(17), marginTop: vscale(12), marginBottom: vscale(8), lineHeight: ms(26) }]}>
                                {request.volunteer.fullName || 'A Volunteer'}
                            </Text>
                            <Text style={[styles.requestSubtitle, { fontSize: ms(14), lineHeight: ms(21) }]}>
                                is coming to help you.
                            </Text>
                        </>
                     ) : (
                        <Text style={[styles.requestTitle, { fontSize: ms(17), marginTop: vscale(12) }]}>
                            Fetching details...
                        </Text>
                     )}
                </View>

                <Button
                    title="View Map"
                    onPress={() => {
                        const isAccepted = ['accepted', 'in_progress', 'matched', 'en_route', 'arrived', 'active'].includes(String(request.status).toLowerCase()) || request.volunteer;
                        if (isAccepted) {
                             navigation.navigate('RequesterMatchingMap', { requestId: request.id || request._id });
                        } else {
                             showAlert('Not Accepted', 'Your request has not been accepted yet. Please wait for a volunteer.', [{ text: 'OK', onPress: closeAlert }]);
                        }
                    }}
                    variant="outline"
                    fullWidth
                    style={{ marginBottom: vscale(12) }}
                    disabled={!request.volunteer && !['accepted', 'in_progress', 'matched', 'en_route', 'arrived', 'active'].includes(String(request.status).toLowerCase())}
                />
          <Button
            title="Close Request"
                    onPress={handleCloseRequest}
                    variant="gradient"
                    fullWidth
                    style={{ marginBottom: vscale(12) }}
                />
                 <Button
                    title="Emergency"
                    onPress={() => navigation.navigate('EmergencyHelp')}
                    variant="white"
                    fullWidth
                    textStyle={{ color: '#FF3B30' }}
                />
            </View>
         );
    }

    return (
        <View style={{ width: contentWidth }}>
          {/* Success Animation Circle */}
          <View style={[styles.successContainer, { height: vscale(120), marginBottom: vscale(18) }]}>
            <View style={[styles.pulseRing1, { width: scale(90), height: scale(90), borderRadius: scale(45), shadowRadius: scale(14), elevation: scale(5) }]} />
            <View style={[styles.pulseRing2, { width: scale(68), height: scale(68), borderRadius: scale(34), shadowRadius: scale(8), elevation: scale(4) }]} />
            <LinearGradient
              colors={['#FF8A7A', '#D84D42']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.successCircle, { width: scale(36), height: scale(36), borderRadius: scale(18), shadowRadius: scale(8), elevation: scale(6) }]}
            >
              <View style={[styles.highlightDot, { width: scale(8), height: scale(8), borderRadius: scale(4) }]} />
            </LinearGradient>
          </View>

          {/* Success Message */}
          <View style={[styles.messageSection, { marginBottom: vscale(28) }]}>
            <Text style={[styles.successTitle, { fontSize: ms(22), marginBottom: vscale(6), lineHeight: ms(28) }]}>Your request has been shared.</Text>
            <Text style={[styles.successSubtitle, { fontSize: ms(15), lineHeight: ms(22) }]}>People nearby can now see it.</Text>
          </View>

          {/* Request Details Card */}
          <View style={[styles.requestDetailsCard, { 
            borderRadius: scale(22),
            borderWidth: scale(1),
            paddingHorizontal: spacing(20),
            paddingVertical: vscale(18),
            marginBottom: vscale(20),
            shadowOffset: { width: 0, height: vscale(3) },
            shadowRadius: scale(8),
            elevation: scale(3)
          }]}>
            <Text style={[styles.cardLabel, { fontSize: ms(13), marginBottom: vscale(10), paddingBottom: vscale(10), borderBottomWidth: scale(1) }]}>Your request</Text>
            <Text style={[styles.requestTitle, { fontSize: ms(17), marginTop: vscale(12), marginBottom: vscale(8), lineHeight: ms(26) }]}>
              {request?.description || 'Your help request'}
            </Text>
            <Text style={[styles.requestSubtitle, { fontSize: ms(14), lineHeight: ms(21) }]}>Shared with nearby available people</Text>
          </View>

          {/* Notification Info */}
          <View style={[styles.infoSection, { marginBottom: vscale(18) }]}>
            <Text style={[styles.infoTitle, { fontSize: ms(15), marginBottom: vscale(4), lineHeight: ms(23) }]}>You'll be notified if someone chooses to be nearby.</Text>
            <Text style={[styles.infoSubtitle, { fontSize: ms(14), lineHeight: ms(21) }]}>There's no obligation for anyone to respond.</Text>
          </View>

          {/* Real-time Stats */}
          <View style={[styles.statsCard, { 
            backgroundColor: '#F8F9FA',
            borderRadius: scale(16),
            padding: spacing(16),
            marginBottom: vscale(20),
            borderWidth: scale(1),
            borderColor: '#E9ECEF'
          }]}>
            <Text style={[styles.statsTitle, { fontSize: ms(14), fontWeight: '600', color: '#495057', marginBottom: vscale(12) }]}>Live Updates:</Text>
            
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { fontSize: ms(18), fontWeight: '700', color: '#343A40' }]}>
                  {request?.stats?.notificationSentCount || 0}
                </Text>
                <Text style={[styles.statLabel, { fontSize: ms(12), color: '#6C757D' }]}>Notified</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <Text style={[styles.statValue, { fontSize: ms(18), fontWeight: '700', color: '#343A40' }]}>
                  {request?.stats?.viewedCount || 0}
                </Text>
                <Text style={[styles.statLabel, { fontSize: ms(12), color: '#6C757D' }]}>Viewed</Text>
              </View>

              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { fontSize: ms(18), fontWeight: '700', color: '#343A40' }]}>
                  {request?.stats?.declinedCount || 0}
                </Text>
                <Text style={[styles.statLabel, { fontSize: ms(12), color: '#6C757D' }]}>Unavailable</Text>
              </View>
            </View>
          </View>

          {/* Wait Card */}
          <View style={[styles.actionCard, { 
            borderRadius: scale(18),
            borderWidth: scale(1),
            paddingHorizontal: spacing(18),
            paddingVertical: vscale(16),
            marginBottom: vscale(12),
            shadowOffset: { width: 0, height: vscale(2) },
            shadowRadius: scale(6),
            elevation: scale(2)
          }]}>
            <Text style={[styles.actionTitle, { fontSize: ms(16), marginBottom: vscale(4) }]}>Wait</Text>
            <Text style={[styles.actionSubtitle, { fontSize: ms(13), lineHeight: ms(20) }]}>You can stay on this screen or continue using your phone.</Text>
          </View>

          {/* Edit Request Card */}
          <TouchableOpacity 
            style={[styles.actionCard, { 
              borderRadius: scale(18),
              borderWidth: scale(1),
              paddingHorizontal: spacing(18),
              paddingVertical: vscale(16),
              marginBottom: vscale(12),
              shadowOffset: { width: 0, height: vscale(2) },
              shadowRadius: scale(6),
              elevation: scale(2)
            }]} 
            onPress={handleEditRequest} 
            activeOpacity={0.85}
          >
            <Text style={[styles.actionTitle, { fontSize: ms(16), marginBottom: vscale(4) }]}>Edit Request</Text>
            <Text style={[styles.actionSubtitle, { fontSize: ms(13), lineHeight: ms(20) }]}>Change details if needed.</Text>
          </TouchableOpacity>

          {/* Cancel Request Card */}
          <TouchableOpacity 
            style={[styles.actionCard, { 
              borderRadius: scale(18),
              borderWidth: scale(1),
              paddingHorizontal: spacing(18),
              paddingVertical: vscale(16),
              marginBottom: vscale(12),
              shadowOffset: { width: 0, height: vscale(2) },
              shadowRadius: scale(6),
              elevation: scale(2)
            }]} 
            onPress={handleCancelRequest} 
            activeOpacity={0.85}
          >
            <Text style={[styles.actionTitle, { fontSize: ms(16), marginBottom: vscale(4) }]}>Cancel Request</Text>
            <Text style={[styles.actionSubtitle, { fontSize: ms(13), lineHeight: ms(20) }]}>End this request at any time.</Text>
          </TouchableOpacity>

          {/* Close Request Card */}
          <TouchableOpacity 
            style={[styles.actionCard, { 
              borderRadius: scale(18),
              borderWidth: scale(1),
              paddingHorizontal: spacing(18),
              paddingVertical: vscale(16),
              marginBottom: vscale(12),
              shadowOffset: { width: 0, height: vscale(2) },
              shadowRadius: scale(6),
              elevation: scale(2)
            }]} 
            onPress={handleCloseRequest} 
            activeOpacity={0.85}
          >
            <Text style={[styles.actionTitle, { fontSize: ms(16), marginBottom: vscale(4) }]}>Close Request</Text>
            <Text style={[styles.actionSubtitle, { fontSize: ms(13), lineHeight: ms(20) }]}>Mark this request as finished and share feedback.</Text>
          </TouchableOpacity>

          {/* Location Notice */}
          <Text style={[styles.locationNotice, { fontSize: ms(14), marginVertical: vscale(24), lineHeight: ms(22) }]}>Your location is shared only while this request is active.</Text>

          {/* Cancel Request Button */}
          <Button
            title="Cancel Request"
            onPress={handleCancelRequest}
            variant="gradient"
            size="large"
            fullWidth
          />

          <View style={[styles.bottomSpacer, { height: vscale(20) }]} />
        </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        onBackPress={() => {
            showAlert('Active Request', 'Your request is currently active. You must cancel the request to leave this screen.', [
             { text: 'Stay Here', style: 'cancel', onPress: closeAlert },
             { text: 'Cancel Request', style: 'destructive', onPress: () => {
                closeAlert();
                handleCancelRequest();
             }}
           ]);
        }}
        rightComponent={
          <TouchableOpacity onPress={handleSettings} style={{ padding: scale(8) }}>
            <Icon name="cog" size={scale(24)} color="#999999" />
          </TouchableOpacity>
        }
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC5C69" />
        </View>
      ) : (
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { alignItems: 'center' }]}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>
      )}
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
        onClose={closeAlert}
      />

      {/* No Helpers Found Modal */}
      <Modal
        visible={noHelpersModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setNoHelpersModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { 
            borderRadius: scale(20),
            padding: spacing(24),
            width: contentWidth * 0.85
          }]}>
            <View style={[styles.modalIconContainer, { 
              width: scale(60), 
              height: scale(60), 
              borderRadius: scale(30),
              marginBottom: vscale(16)
            }]}>
              <Icon name="account-search-outline" size={scale(32)} color="#DC5C69" />
            </View>
            
            <Text style={[styles.modalTitle, { fontSize: ms(20), marginBottom: vscale(12) }]}>
              No Helpers Found Nearby
            </Text>
            
            <Text style={[styles.modalMessage, { fontSize: ms(15), lineHeight: ms(22), marginBottom: vscale(24) }]}>
              We couldn't find any available helpers within a 500m radius right now. Would you like to keep waiting or cancel the request?
            </Text>
            
            <View style={styles.modalButtons}>
              <View style={{ width: '100%', marginBottom: vscale(12) }}>
                <Button
                  title={cancelling ? "Cancelling..." : "Cancel Request"}
                  onPress={handleNoHelpersCancel}
                  variant="gradient"
                  fullWidth
                  disabled={cancelling}
                />
              </View>
              <View style={{ width: '100%' }}>
                <Button
                  title="Keep Waiting"
                  onPress={() => setNoHelpersModalVisible(false)}
                  variant="outline"
                  fullWidth
                />
              </View>
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

  scrollContent: {
    flexGrow: 1,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ===== SUCCESS ANIMATION =====
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  pulseRing1: {
    position: 'absolute',
    backgroundColor: '#FFF0F2',
    opacity: 0.45,
    shadowColor: '#DC5C69',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.16,
  },

  pulseRing2: {
    position: 'absolute',
    backgroundColor: '#FFDBDF',
    opacity: 0.38,
    shadowColor: '#DC5C69',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
  },

  successCircle: {
    shadowColor: '#DC5C69',
    shadowOpacity: 0.25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightDot: {
    backgroundColor: '#FFFFFF',
    opacity: 0.5,
  },

  // ===== MESSAGE SECTION =====
  messageSection: {
    alignItems: 'center',
  },

  successTitle: {
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
  },

  successSubtitle: {
    fontWeight: '400',
    color: '#999999',
    textAlign: 'center',
  },

  // ===== REQUEST DETAILS CARD =====
  requestDetailsCard: {
    backgroundColor: '#F9F9F9',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
  },

  cardLabel: {
    fontWeight: '500',
    color: '#999999',
    borderBottomColor: '#E8EAED',
    letterSpacing: 0.2,
  },

  requestTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },

  requestSubtitle: {
    fontWeight: '400',
    color: '#999999',
  },

  // ===== INFO SECTION =====
  infoSection: {
  },

  infoTitle: {
    fontWeight: '500',
    color: '#2C3E50',
  },

  infoSubtitle: {
    color: '#666666',
  },

  // ===== ACTION CARDS =====
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },

  actionTitle: {
    fontWeight: '600',
    color: '#111827',
  },

  actionSubtitle: {
    color: '#4B5563',
  },

  locationNotice: {
    color: '#4B5563',
    textAlign: 'center',
  },

  bottomSpacer: {
  },

  // ===== STATS CARD =====
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#DEE2E6',
  },

  // ===== MODAL STYLES =====
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalIconContainer: {
    backgroundColor: '#FFF0F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },
  modalMessage: {
    color: '#666666',
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'column',
    width: '100%',
    alignItems: 'center',
  },
});

export default RequestSuccessScreen;
