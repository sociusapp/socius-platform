import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image } from 'react-native';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';

const YourRoleScreen = ({ navigation }) => {
  const bulletPoints = [
    'You are not assigned',
    'You are not required',
    'You are not responsible for outcomes'
  ];

  const handleNext = () => {
    navigation.navigate('NoObligation');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Your Role on Socius" 
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
            source={require('../../assets/images/guide/YourRoleScreen.png')}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Main Text */}
        <Text style={styles.mainText}>
          You are not a responder, officer, or authority.
        </Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          You are an individual choosing to stay aware.
        </Text>

        {/* Bullet Points */}
        <View style={styles.bulletContainer}>
          {bulletPoints.map((point, index) => (
            <View key={index} style={styles.bulletRow}>
              <View style={styles.bulletPoint} />
              <Text style={styles.bulletText}>{point}</Text>
            </View>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Footer Text */}
        <Text style={styles.footerText}>
          All participation on Socius is voluntary.
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
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 30,
  },

  // ===== IMAGE CONTAINER =====
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    height: 180,
  },

  image: {
    width: '100%',
  },

  // ===== MAIN TEXT =====
  mainText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 12,
  },

  // ===== SUBTITLE =====
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#888888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },

  // ===== BULLET POINTS =====
  bulletContainer: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2C3E50',
    marginRight: 12,
    marginTop: 7,
  },

  bulletText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#2C3E50',
    lineHeight: 22,
    flex: 1,
  },

  // ===== DIVIDER =====
  divider: {
    height: 1,
    backgroundColor: '#E8EAED',
    marginBottom: 10,
  },

  // ===== FOOTER TEXT =====
  footerText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#888888',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },

  // ===== SPACER =====
  spacer: {
    flex: 1,
    minHeight: 20,
  },

  // ===== NEXT BUTTON =====
  nextButton: {
    paddingVertical: 15,
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

export default YourRoleScreen;
