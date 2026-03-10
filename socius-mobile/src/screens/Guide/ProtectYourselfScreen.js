import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image } from 'react-native';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';

const ProtectYourselfScreen = ({ navigation }) => {
  const goodPracticePoints = [
    'Arrive with others nearby',
    'Stay in open, public spaces',
    'Keep distance and visibility'
  ];

  const ifYouAreAlonePoints = [
    'Pause',
    'Step back',
    'Use emergency contacts instead'
  ];

  const handleNext = () => {
    navigation.navigate('FeelsWrong');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Text style={styles.logoText}>Socius</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Protect Yourself</Text>
          <Text style={styles.subtitle}>Avoid being alone</Text>
        </View>

        {/* Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={require('../../assets/images/guide/ProtectYourselfScreen.png')}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Main Message */}
        <Text style={styles.mainMessage}>Stay where others can see.</Text>
        <Text style={styles.subMessage}>
          Shared presence reduces risk for everyone.
        </Text>

        {/* Good Practice Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Good practice</Text>
          <View style={styles.bulletContainer}>
            {goodPracticePoints.map((point, index) => (
              <View key={index} style={styles.bulletRow}>
                <View style={styles.bulletPoint} />
                <Text style={styles.bulletText}>{point}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* If You're Alone Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>If you're alone</Text>
          <View style={styles.bulletContainer}>
            {ifYouAreAlonePoints.map((point, index) => (
              <View key={index} style={styles.bulletRow}>
                <View style={styles.bulletPoint} />
                <Text style={styles.bulletText}>{point}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer Text */}
        <Text style={styles.footerText}>
          You're allowed to disengage at any time.
        </Text>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Next Button */}
        <Button
          title="Next"
          onPress={handleNext}
        />
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
    paddingTop:35,
  },

  // ===== LOGO SECTION =====
  logoSection: {
    alignItems: 'center',
    marginBottom: 5,
  },

  logoText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#DC5C69',
  },

  divider: {
    height: 1,
    backgroundColor: '#E8EAED',
    marginBottom: 16,
  },

  // ===== TITLE SECTION =====
  titleSection: {
    alignItems: 'center',
  },

  mainTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#666666',
  },

  // ===== IMAGE CONTAINER =====
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },

  image: {
    width: '100%',
    height: '100%',
  },

  // ===== MAIN MESSAGE =====
  mainMessage: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 28,
  },

  subMessage: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 21,
  },

  // ===== CARDS =====
  card: {
    backgroundColor: '#F8F9FA',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    marginBottom: 12,
  },

  bulletContainer: {
    marginTop: 0,
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 7,
  },

  bulletPoint: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#5A6C7D',
    marginRight: 11,
    marginTop: 6,
  },

  bulletText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#2C3E50',
    lineHeight: 20,
    flex: 1,
  },

  // ===== FOOTER TEXT =====
  footerText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#888888',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 16,
  },

  // ===== SPACER =====
  spacer: {
    flex: 1,
    minHeight: 20,
  },

  // ===== NEXT BUTTON =====
  nextButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 26,
    backgroundColor: '#DC5C69',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC5C69',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },

  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ProtectYourselfScreen;
