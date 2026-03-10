import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image } from 'react-native';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';

const YourSafetyComesFirstScreen = ({ navigation }) => {
  const rememberPoints = [
    'Trust your instinct',
    'You can exit anytime',
    'There is no penalty'
  ];

  const handleNext = () => {
    navigation.navigate('PublicSpaces');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Your Safety Comes First" 
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
            source={require('../../assets/images/guide/YourSafetyComesFirstScreen.png')}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Main Text */}
        <Text style={styles.mainText}>
          If something feels unsafe, {'\n'} you should leave immediately.
        </Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          You do not need a reason to step away.
        </Text>

        {/* Remember Card */}
        <View style={styles.rememberCard}>
          <View style={styles.cardHeader}>
            <View style={styles.dividerLeft} />
            <Text style={styles.cardTitle}>Remember</Text>
            <View style={styles.dividerRight} />
          </View>

          <View style={styles.bulletContainer}>
            {rememberPoints.map((point, index) => (
              <View key={index} style={styles.bulletRow}>
                <View style={styles.bulletPoint} />
                <Text style={styles.bulletText}>{point}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Leaving Early Text */}
        <Text style={styles.leavingText}>
          Leaving early is responsible.
        </Text>

        {/* Footer Text */}
        <Text style={styles.footerText}>
          Your well-being matters more than any request.
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
    paddingTop: 16,
    paddingBottom: 30,
  },

  // ===== IMAGE CONTAINER =====
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
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
    marginBottom: 10,
  },

  // ===== SUBTITLE =====
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#888888',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
    fontStyle: 'italic',
  },

  // ===== REMEMBER CARD =====
  rememberCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  dividerLeft: {
    flex: 1,
    height: 1,
    backgroundColor: '#D0D0D0',
  },

  dividerRight: {
    flex: 1,
    height: 1,
    backgroundColor: '#D0D0D0',
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginHorizontal: 12,
  },

  bulletContainer: {
    marginTop: 0,
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  bulletPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B9CA6',
    marginRight: 12,
    marginTop: 6,
  },

  bulletText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#2C3E50',
    lineHeight: 22,
    flex: 1,
  },

  // ===== LEAVING EARLY TEXT =====
  leavingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#DC5C69',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 12,
    fontStyle: 'italic',
  },

  // ===== FOOTER TEXT =====
  footerText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#888888',
    textAlign: 'center',
    lineHeight: 21,
    fontStyle: 'italic',
    marginBottom: 16,
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

export default YourSafetyComesFirstScreen;
