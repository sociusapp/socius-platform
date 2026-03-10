import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image } from 'react-native';
import Button from '../../components/common/Button';
 
const IfSomethingFeelsWrongScreen = ({ navigation }) => {
  const signsToStepBackPoints = [
    'You feel uneasy or pressured.',
    'The situation is unclear.',
    'Others are not around.'
  ];

  const whatToDoInsteadPoints = [
    'Move to a safer place.',
    'Use emergency contacts.',
    'Let authorities handle it.'
  ];

  const handleNext = () => {
    navigation.navigate('EmergencyContacted');
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
          <Text style={styles.mainTitle}>If something feels wrong</Text>
          <Text style={styles.subtitle}>Step away</Text>
        </View>

        {/* Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={require('../../assets/images/guide/IfSomethingFeelsWrongScreen.png')}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Main Message */}
        <Text style={styles.mainMessage}>Trust your instincts.</Text>
        <Text style={styles.subMessage}>
          Disengaging early is a responsible choice.
        </Text>

        {/* Signs to step back Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitleRed}>Signs to step back</Text>
          <View style={styles.bulletContainer}>
            {signsToStepBackPoints.map((point, index) => (
              <View key={index} style={styles.bulletRow}>
                <View style={styles.bulletPointRed} />
                <Text style={styles.bulletText}>{point}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* What to do instead Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitleRed}>What to do instead</Text>
          <View style={styles.bulletContainer}>
            {whatToDoInsteadPoints.map((point, index) => (
              <View key={index} style={styles.bulletRow}>
                <View style={styles.bulletPointRed} />
                <Text style={styles.bulletText}>{point}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer Text */}
        <Text style={styles.footerText}>
          You don't owe anyone an explanation.
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
    paddingVertical: 0,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'center',
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
    fontSize: 23,
    fontWeight: '700',
    color: '#DC5C69',
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
  },

  // ===== MAIN MESSAGE =====
  mainMessage: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
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
    paddingVertical: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  cardTitleRed: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC5C69',
    marginBottom: 10,
  },

  bulletContainer: {
    marginTop: 0,
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
  },

  bulletPointRed: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#DC5C69',
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

export default IfSomethingFeelsWrongScreen;
