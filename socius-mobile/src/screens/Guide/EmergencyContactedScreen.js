import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EmergencyContactedScreen = ({ navigation }) => {
  const whatThisMeansPoints = [
    { icon: 'account', text: 'Socius did not place the call.' },
    { icon: 'email', text: 'No instructions were issued.' },
    { icon: 'phone-off', text: 'No coordination occurred.' }
  ];

  const whatHappensNextPoints = [
    { icon: 'account', text: 'Authorities manage the situation.' },
    { icon: 'check-circle', text: 'Socius involvement ends here.' },
    { icon: 'account', text: 'You may disengage safely.' }
  ];

  const handleReturnHome = async () => {
    try {
      // Mark Availability Guide as seen (so we don't show it again when user clicks Not Available)
      await AsyncStorage.setItem('HAS_SEEN_AVAILABILITY_GUIDE', 'true');
    } catch (e) {
      // ignore storage errors and proceed
    }
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Emergency Contacted" 
        onBackPress={() => navigation.goBack()}
        style={{ borderBottomWidth: 1, borderBottomColor: '#E8EAED' }}
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={require('../../assets/images/guide/EmergencyContactedIcon.png')}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Main Info Card */}
        <View style={styles.mainCard}>
          <Text style={styles.mainCardTitle}>
            Emergency services were contacted independently.
          </Text>
          <Text style={styles.mainCardSubtitle}>
            This action was taken outside the Socius platform.
          </Text>
        </View>

        {/* What this means Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>What this means</Text>
          <View style={styles.cardDivider} />
          
          <View style={styles.bulletContainer}>
            {whatThisMeansPoints.map((point, index) => (
              <View key={index} style={styles.bulletRow}>
                <View style={styles.bulletIconWrapper}>
                  <Icon name={point.icon} size={18} color="#6B7A8F" />
                </View>
                <Text style={styles.bulletText}>{point.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* What happens next Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>What happens next</Text>
          <View style={styles.cardDivider} />
          
          <View style={styles.bulletContainer}>
            {whatHappensNextPoints.map((point, index) => (
              <View key={index} style={styles.bulletRow}>
                <View style={styles.bulletIconWrapper}>
                  <Icon name={point.icon} size={18} color="#6B7A8F" />
                </View>
                <Text style={styles.bulletText}>{point.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Disclaimer Text */}
        <Text style={styles.disclaimerText}>
          Sharing information does not make you responsible for outcomes.
        </Text>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Return Home Button */}
        <Button
          title="Return Home"
          onPress={handleReturnHome}
          variant="primary"
          fullWidth
        />

        {/* Footer Text */}
        <Text style={styles.footerText}>
          Socius does not monitor, influence, or track authority response.
        </Text>
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  // ===== IMAGE CONTAINER =====
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
  },

  image: {
    width: '100%',
  },

  // ===== MAIN CARD =====
  mainCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8EAED',
    alignItems: 'center',
  },

  mainCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
  },

  mainCardSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 13,
  },

  // ===== INFO CARDS =====
  infoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 10,
  },

  cardDivider: {
    height: 1,
    backgroundColor: '#E8EAED',
    marginBottom: 12,
  },

  bulletContainer: {
    marginTop: 0,
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 9,
  },

  bulletIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E8EAED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },

  bulletText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#2C3E50',
    lineHeight: 20,
    flex: 1,
    paddingTop: 6,
  },

  // ===== DISCLAIMER TEXT =====
  disclaimerText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 16,
    paddingHorizontal: 4,
  },

  // ===== SPACER =====
  spacer: {
    height: 12,
  },

  // ===== RETURN BUTTON =====
  returnButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 26,
    backgroundColor: '#DC5C69',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#DC5C69',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },

  returnButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // ===== FOOTER TEXT =====
  footerText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#888888',
    textAlign: 'center',
    lineHeight: 19,
  },
});

export default EmergencyContactedScreen;
