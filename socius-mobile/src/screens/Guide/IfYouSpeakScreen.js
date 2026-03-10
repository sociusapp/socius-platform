import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image } from 'react-native';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';

const IfYouSpeakScreen = ({ navigation }) => {
  const maySayPoints = [
    'Are you okay?',
    'Do you want authorities contacted?'
  ];

  const avoidSayingPoints = [
    'Advice',
    'Accusations',
    'Judgments'
  ];

  const handleNext = () => {
    navigation.navigate('IfPolice');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="If You Speak" 
        onBackPress={() => navigation.goBack()}
        style={{ borderBottomWidth: 1, borderBottomColor: '#E8EAED' }}
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Subtitle */}
        <Text style={styles.subtitle}>Keep it minimal</Text>

        {/* Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={require('../../assets/images/guide/IfYouSpeakScreen.png')}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Main Text */}
        <Text style={styles.mainText}>
          You are not required to speak.
        </Text>

        {/* Secondary Text */}
        <Text style={styles.secondaryText}>
          If you choose to, keep it brief and respectful.
        </Text>

        {/* Two Column Cards */}
        <View style={styles.cardsRow}>
          {/* You May Say Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitleBlue}>You May Say</Text>

            <View style={styles.bulletContainer}>
              {maySayPoints.map((point, index) => (
                <View key={index} style={styles.bulletRow}>
                  <View style={styles.bulletPointBlue} />
                  <Text style={styles.bulletText}>{point}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Avoid Saying Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitleRed}>Avoid Saying</Text>

            <View style={styles.bulletContainer}>
              {avoidSayingPoints.map((point, index) => (
                <View key={index} style={styles.bulletRow}>
                  <View style={styles.bulletPointRed} />
                  <Text style={styles.bulletText}>{point}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Footer Text */}
        <Text style={styles.footerText}>
          You do not need to explain yourself to anyone.
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

  // ===== SUBTITLE =====
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#888888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },

  // ===== IMAGE CONTAINER =====
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    height: 160,
  },

  image: {
    width: '100%',
    height: '100%',
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

  // ===== SECONDARY TEXT =====
  secondaryText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#888888',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },

  // ===== CARDS ROW =====
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },

  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  cardTitleBlue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4A7BA7',
    textAlign: 'center',
    marginBottom: 12,
  },

  cardTitleRed: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC5C69',
    textAlign: 'center',
    marginBottom: 12,
  },

  bulletContainer: {
    marginTop: 0,
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  bulletPointBlue: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4A7BA7',
    marginRight: 10,
    marginTop: 6,
  },

  bulletPointRed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC5C69',
    marginRight: 10,
    marginTop: 6,
  },

  bulletText: {
    fontSize: 13,
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

export default IfYouSpeakScreen;
