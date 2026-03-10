import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image } from 'react-native';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';

const AfterYouLeaveScreen = ({ navigation }) => {
  const whatHappensPoints = [
    'The request will close automatically.',
    'No further action is expected.',
    'You won\'t receive follow-ups.'
  ];

  const ifConcernPoints = [
    'Use emergency contacts.',
    'Report later if needed.',
    'Prioritize your safety.'
  ];

  const handleFinish = () => {
    navigation.navigate('IfYouSpeak');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="After you leave" 
        onBackPress={() => navigation.goBack()}
        style={{ borderBottomWidth: 1, borderBottomColor: '#E8EAED' }}
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Subtitle */}
        <Text style={styles.subtitle}>Close and move on</Text>

        {/* Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={require('../../assets/images/guide/AfterYouLeaveScreen.png')}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Main Text */}
        <Text style={styles.mainText}>
          You've done enough.
        </Text>

        {/* Secondary Text */}
        <Text style={styles.secondaryText}>
          Staying longer is not required.
        </Text>

        {/* What Happens Next Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>What happens next</Text>
          <View style={styles.cardDivider} />

          <View style={styles.bulletContainer}>
            {whatHappensPoints.map((point, index) => (
              <View key={index} style={styles.bulletRow}>
                <View style={styles.bulletPoint} />
                <Text style={styles.bulletText}>{point}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* If Something Still Concerns Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>If something still concerns you</Text>
          <View style={styles.cardDivider} />

          <View style={styles.bulletContainer}>
            {ifConcernPoints.map((point, index) => (
              <View key={index} style={styles.bulletRow}>
                <View style={styles.bulletPoint} />
                <Text style={styles.bulletText}>{point}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer Text */}
        <Text style={styles.footerText}>
          Helping does not mean carrying the situation with you.
        </Text>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Finish Button */}
        <Button
          title="Finish"
          onPress={handleFinish}
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

  // ===== SUBTITLE =====
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#888888',
    textAlign: 'center',
    lineHeight: 22,
  },

  // ===== IMAGE CONTAINER =====
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 8,
  },

  // ===== SECONDARY TEXT =====
  secondaryText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#888888',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },

  // ===== INFO CARDS =====
  infoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
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
    marginBottom: 11,
  },

  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC5C69',
    marginRight: 12,
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

  // ===== FINISH BUTTON =====
  finishButton: {
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

  finishButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default AfterYouLeaveScreen;
