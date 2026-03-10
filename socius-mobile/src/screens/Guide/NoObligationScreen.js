import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image } from 'react-native';
import Button from '../../components/common/Button';
 
const NoObligationScreen = ({ navigation }) => {
  const doNotPoints = [
    'Stop someone',
    'Question someone',
    'Physically assist without consent'
  ];

  const mayPoints = [
    'Stay nearby',
    'Observe',
    'Contact authorities if you personally feel it is needed'
  ];

  const handleNext = () => {
    navigation.navigate('SafetyFirst');
  };

  return (
    <SafeAreaView style={styles.container}>
 
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{fontWeight:"400", textAlign:"center", fontSize:25}}>
        No Obligation
        </Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          What you are NOT expected to do
        </Text>

        {/* Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={require('../../assets/images/guide/NoObligationScreen.png')}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Main Text */}
        <Text style={styles.mainText}>
          You are never expected to intervene, {'\n'} confront, or handle a situation.
        </Text>

        {/* Do NOT Card */}
        <View style={styles.doNotCard}>
          <View style={styles.cardHeader}>
            <View style={styles.dividerLeft} />
            <Text style={styles.doNotTitle}>Do NOT</Text>
            <View style={styles.dividerRight} />
          </View>

          <View style={styles.bulletContainer}>
            {doNotPoints.map((point, index) => (
              <View key={index} style={styles.bulletRow}>
                <View style={styles.bulletPointRed} />
                <Text style={styles.bulletText}>{point}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* You MAY Card */}
        <View style={styles.mayCard}>
          <View style={styles.cardHeader}>
            <View style={styles.dividerLeftGreen} />
            <Text style={styles.mayTitle}>You MAY</Text>
            <View style={styles.dividerRightGreen} />
          </View>

          <View style={styles.bulletContainer}>
            {mayPoints.map((point, index) => (
              <View key={index} style={styles.bulletRow}>
                <View style={styles.bulletPointGreen} />
                <Text style={styles.bulletTextMay}>{point}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer Text */}
        <Text style={styles.footerText}>
          Choosing not to act is always acceptable.
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
    paddingTop: 35,
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
  },

  // ===== MAIN TEXT =====
  mainText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C3E50',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 10,
  },

  // ===== DO NOT CARD =====
  doNotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 10,
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
    backgroundColor: '#DC5C69',
  },

  dividerRight: {
    flex: 1,
    height: 1,
    backgroundColor: '#DC5C69',
  },

  dividerLeftGreen: {
    flex: 1,
    height: 1,
    backgroundColor: '#4CAF50',
  },

  dividerRightGreen: {
    flex: 1,
    height: 1,
    backgroundColor: '#4CAF50',
  },

  doNotTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC5C69',
    marginHorizontal: 12,
  },

  mayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
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

  bulletPointRed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC5C69',
    marginRight: 12,
    marginTop: 6,
  },

  bulletPointGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
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

  bulletTextMay: {
    fontSize: 15,
    fontWeight: '400',
    color: '#2C3E50',
    lineHeight: 22,
    flex: 1,
  },

  // ===== YOU MAY CARD =====
  mayCard: {
    backgroundColor: '#FFFFFF',
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

export default NoObligationScreen;
