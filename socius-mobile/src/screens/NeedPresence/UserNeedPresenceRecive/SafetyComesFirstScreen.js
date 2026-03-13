import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../../components/common/Header';
import Button from '../../../components/common/Button';
import CustomAlert from '../../../components/common/CustomAlert';
import { getSocket } from '../../../services/socket/socket.service';
import { useResponsive } from '../../../utils/responsive';
import { getHelpRequestById } from '../../../services/api/incident.api';
import { loadAuth } from '../../../services/storage/asyncStorage.service';

const SafetyComesFirstScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const { requestId } = route.params || {};
  const cards = [
    {
      title: 'Observe Only',
      desc: 'Stay aware, keep distance.',
      image: require('../../../assets/images/safety-1.png'),
      icon: 'eye-outline',
      bg: '#EEF3F6',
      fg: '#5A6F7D',
    },
    {
      title: 'Leave Anytime',
      desc: 'You can exit without explanation.',
      image: require('../../../assets/images/safety-2.png'),
      icon: 'exit-run',
      bg: '#F1EEE8',
      fg: '#8B6F47',
    },
    {
      title: 'Call Authorities',
      desc: 'If anything feels unsafe.',
      image: require('../../../assets/images/safety-3.png'),
      icon: 'phone-alert-outline',
      bg: '#F8EAEA',
      fg: '#C94D4D',
    },
  ];

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

  const [isLoading, setIsLoading] = useState(false);
  const handleContinue = async () => {
    if (isLoading) return;
    try {
      setIsLoading(true);
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

          showAlert(title, message, [
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
                setTimeout(() => {
                  handleContinue();
                }, 100);
              }
            }
          ]);
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
    } finally {
      setIsLoading(false);
    }

    navigation.navigate('LocalRequest', { requestId });
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Header
        title=""
        onBackPress={() => navigation.goBack()}
        style={[styles.header, { borderBottomWidth: 0 }]}
        titleStyle={[styles.headerTitle, { fontSize: ms(20) }]}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, {
          paddingHorizontal: spacing(20),
          paddingTop: vscale(10),
          paddingBottom: vscale(40),
          alignItems: 'center'
        }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth, alignItems: 'center' }}>
          <Text style={[styles.mainTitle, { fontSize: ms(24), marginBottom: vscale(16), marginTop: vscale(10) }]}>Your Safety Comes First</Text>

          <Text style={[styles.subtitle, { fontSize: ms(14), marginBottom: vscale(24) }]}>
            You are choosing to be aware — not required to act.
          </Text>

          <View style={[styles.guidelinesContainer, { marginBottom: vscale(32) }]}>
            <View style={styles.guidelineItem}>
              <View style={[styles.guidelineLine, { height: scale(1), marginVertical: vscale(12) }]} />
              <Text style={[styles.guidelineText, { fontSize: ms(15), paddingHorizontal: spacing(10) }]}>Do not intervene or confront anyone.</Text>
              <View style={[styles.guidelineLine, { height: scale(1), marginVertical: vscale(12) }]} />
            </View>

            <View style={styles.guidelineItem}>
              <Text style={[styles.guidelineText, { fontSize: ms(15), paddingHorizontal: spacing(10) }]}>Leave immediately if you feel unsafe.</Text>
              <View style={[styles.guidelineLine, { height: scale(1), marginVertical: vscale(12) }]} />
            </View>

            <View style={styles.guidelineItem}>
              <Text style={[styles.guidelineText, { fontSize: ms(15), paddingHorizontal: spacing(10) }]}>Contact authorities if the situation escalates.</Text>
            </View>
          </View>

          {/* Action Cards */}
          <View style={[styles.cardsContainer, { gap: vscale(16), marginBottom: vscale(32) }]}>
            {cards.map((c) => (
              <View
                key={c.title}
                style={[
                  styles.card,
                  {
                    borderRadius: scale(16),
                    paddingVertical: vscale(14),
                    paddingHorizontal: spacing(16),
                    borderWidth: scale(1),
                    minHeight: vscale(74),
                    shadowRadius: scale(8),
                    elevation: scale(2),
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconContainer,
                    {
                      width: scale(52),
                      height: scale(52),
                      borderRadius: scale(26),
                      marginRight: spacing(14),
                      backgroundColor: c.bg,
                      borderWidth: scale(1),
                      borderColor: '#E8EAED',
                    },
                  ]}
                >
                  <Image
                    source={c.image}
                    style={{ width: scale(34), height: scale(34) }}
                    resizeMode="contain"
                  />
                  <View style={styles.iconFallback} pointerEvents="none">
                    <Icon name={c.icon} size={scale(20)} color={c.fg} />
                  </View>
                </View>
                <View style={styles.cardContent}>
                  <Text style={[styles.cardTitle, { fontSize: ms(16), marginBottom: vscale(4) }]}>{c.title}</Text>
                  <Text style={[styles.cardDescription, { fontSize: ms(13) }]}>{c.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Buttons */}
          <Button
            title="Continue"
            onPress={handleContinue}
            variant="primary"
            fullWidth
            loading={isLoading}
            disabled={isLoading}
            style={[styles.continueButton, { borderRadius: scale(30), marginBottom: vscale(12) }]}
          />

          <Button
            title="I'm Not Available"
            onPress={() => navigation.goBack()}
            variant="outline"
            fullWidth
            style={[styles.notAvailableButton, { marginBottom: vscale(12) }]}
            textStyle={styles.notAvailableText}
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
  header: {
    borderBottomWidth: 0,
  },
  headerTitle: {
    color: '#A83A30', // Red color for Socius
    fontSize: 20,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#5D6D7E',
    textAlign: 'center',
    marginBottom: 24,
  },
  guidelinesContainer: {
    width: '100%',
    marginBottom: 32,
  },
  guidelineItem: {
    alignItems: 'center',
    width: '100%',
  },
  guidelineLine: {
    height: 1,
    backgroundColor: '#F0F0F0',
    width: '100%',
    marginVertical: 12,
  },
  guidelineText: {
    fontSize: 15,
    color: '#4A5568',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  cardsContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F2F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconFallback: {
    position: 'absolute',
    right: 6,
    bottom: 6,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  continueButton: {
    backgroundColor: '#D3453D',
    borderRadius: 30,
    marginBottom: 12,
    shadowColor: '#D3453D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  notAvailableButton: {
    borderRadius: 30,
    borderColor: '#E0E0E0',
    backgroundColor: '#F8F9FA',
  },
  notAvailableText: {
    color: '#5D6D7E',
    fontWeight: '600',
  },
});

export default SafetyComesFirstScreen;
