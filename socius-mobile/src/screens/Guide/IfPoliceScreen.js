import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image } from 'react-native';
import Button from '../../components/common/Button';
 
const IfPoliceArriveScreen = ({ navigation }) => {
  const youMaySayPoints = [
    'I stayed nearby.',
    'I did not intervene.',
    'I am an app user.'
  ];

  const avoidPoints = [
    'Arguing',
    'Explaining motives',
    'Volunteering extra details'
  ];

  const handleNext = () => {
    navigation.navigate('ProtectYourself');
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
          <Text style={styles.mainTitle}>If Police Arrive</Text>
          <Text style={styles.subtitle}>Stay calm and factual</Text>
        </View>

        {/* Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={require('../../assets/images/guide/IfPoliceArriveScreen.png')}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Main Message */}
        <Text style={styles.mainMessage}>Remain calm. Speak simply.</Text>
        <Text style={styles.subMessage}>
          You are not required to explain or justify.
        </Text>

        {/* You may say Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>You may say</Text>
          <View style={styles.bulletContainer}>
            {youMaySayPoints.map((point, index) => (
              <View key={index} style={styles.bulletRow}>
                <View style={styles.bulletPoint} />
                <Text style={styles.bulletText}>{point}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Avoid Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Avoid</Text>
          <View style={styles.bulletContainer}>
            {avoidPoints.map((point, index) => (
              <View key={index} style={styles.bulletRow}>
                <View style={styles.bulletPoint} />
                <Text style={styles.bulletText}>{point}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer Text */}
        <Text style={styles.footerText}>
          Cooperation does not require explanation.
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
    paddingTop: 30,
    paddingBottom: 30,
  },

  // ===== LOGO SECTION =====
  logoSection: {
    alignItems: 'center',
    paddingVertical: 10,
  },

  logoText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#DC5C69',
  },

  divider: {
    height: 1,
    backgroundColor: '#E8EAED',
    marginBottom: 5,
  },

  // ===== TITLE SECTION =====
  titleSection: {
    alignItems: 'center',
  },

  mainTitle: {
    fontSize: 25,
    fontWeight: '500',
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
    marginBottom: 10,
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
    marginBottom: 11,
  },

  bulletPoint: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#2C3E50',
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
    fontStyle: 'italic',
    marginBottom: 1,
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

export default IfPoliceArriveScreen;
