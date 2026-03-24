import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useResponsive } from '../../../utils/responsive';
import Header from '../../../components/common/Header';
import { acceptHelpRequest } from '../../../services/api/incident.api';
import { loadAuth } from '../../../services/storage/asyncStorage.service';

const SafetyComesFirstScreen = ({ navigation, route }) => {
  const { requestId } = route.params || {};
  const { ms, scale, spacing, vscale } = useResponsive();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!requestId) {
      Alert.alert('Error', 'Missing Request ID');
      return;
    }

    setLoading(true);
    try {
      const auth = await loadAuth();
      const token = auth?.accessToken;
      
      if (!token) {
        Alert.alert('Error', 'Session expired. Please sign in again.');
        return;
      }

      const response = await acceptHelpRequest(token, requestId);
      
      if (response?.success) {
        navigation.reset({
          index: 0,
          routes: [
            { 
              name: 'MatchingMap', 
              params: { 
                requestId,
                mode: 'helper'
              } 
            }
          ],
        });
      } else {
        Alert.alert('Error', response?.message || 'Failed to accept request');
      }
    } catch (error) {
      const msg = error?.response?.data?.message || 'Something went wrong. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const showAcceptConfirmation = () => {
    Alert.alert(
      'Accept Request?',
      'Are you sure you want to help? You should be nearby and able to assist.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Accept', onPress: handleAccept }
      ]
    );
  };

  const handleNotAvailable = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainApp', { screen: 'HomeTab' });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={{ paddingTop: 40 }}>
        <Header 
          title="Socius" 
          onBackPress={handleNotAvailable}
          titleStyle={{ color: '#DC5C69', fontWeight: '700' }}
        />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={[styles.title, { fontSize: ms(24), marginTop: vscale(20) }]}>
            Your Safety Comes First
          </Text>
          
          <Text style={[styles.subtitle, { fontSize: ms(14), marginTop: vscale(12) }]}>
            You are choosing to be aware — not required to act.
          </Text>

          <View style={styles.guidelines}>
            <Text style={styles.guideText}>• Do not intervene or confront anyone.</Text>
            <Text style={styles.guideText}>• Leave immediately if you feel unsafe.</Text>
            <Text style={styles.guideText}>• Contact authorities if the situation escalates.</Text>
          </View>

          <View style={styles.pointsContainer}>
            {[
              { icon: 'eye-outline', title: 'Observe Only', desc: 'Stay aware, keep distance.' },
              { icon: 'door-open', title: 'Leave Anytime', desc: 'You can exit without explanation.' },
              { icon: 'phone-outline', title: 'Call Authorities', desc: 'If anything feels unsafe.' },
            ].map((point, index) => (
              <View key={index} style={[styles.pointCard, { marginBottom: vscale(12) }]}>
                <View style={styles.pointIconBg}>
                  <Icon name={point.icon} size={scale(24)} color="#455A64" />
                </View>
                <View style={styles.pointText}>
                  <Text style={styles.pointTitle}>{point.title}</Text>
                  <Text style={styles.pointDesc}>{point.desc}</Text>
                </View>
              </View>
            ))}
          </View>
          {/* Spacer for scroll */}
          <View style={{ height: vscale(20) }} />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => {
            console.log('Continue pressed');
            showAcceptConfirmation();
          }}
          style={[styles.continueBtn, { backgroundColor: loading ? '#E2E8F0' : '#D84D42' }]}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.continueBtnText}>
            {loading ? 'Processing...' : 'Continue'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => {
            console.log('Not Available pressed');
            handleNotAvailable();
          }}
          style={styles.notAvailableBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.notAvailableText}>I'm Not Available</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  content: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  subtitle: {
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  guidelines: {
    marginTop: 20,
    width: '100%',
    paddingHorizontal: 10,
  },
  guideText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 6,
    textAlign: 'center',
  },
  pointsContainer: {
    marginTop: 30,
    width: '100%',
  },
  pointCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  pointIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  pointText: {
    flex: 1,
  },
  pointTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  pointDesc: {
    fontSize: 13,
    color: '#64748B',
  },
  footer: {
    padding: 24,
    paddingBottom: 34,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  continueBtn: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    marginBottom: 12,
  },
  continueBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notAvailableBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  notAvailableText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
});

export default SafetyComesFirstScreen;
