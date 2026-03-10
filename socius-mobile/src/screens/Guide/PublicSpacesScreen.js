import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image } from 'react-native';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';

const StayInPublicScreen = ({ navigation }) => {
  const goodPlaces = [
    'Open roads',
    'Shops or cafés',
    'Well-lit areas'
  ];

  const avoidPlaces = [
    'Isolated spots',
    'Enclosed spaces',
    'Private property'
  ];

  const handleNext = () => {
    navigation.navigate('AfterLeave');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Socius" 
        onBackPress={() => navigation.goBack()}
        style={{ borderBottomWidth: 1, borderBottomColor: '#E8EAED' }}
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
 
        {/* Main Title */}
        <Text style={styles.mainTitle}>Stay in Public, Visible Spaces</Text>

        {/* Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={require('../../assets/images/guide/StayInPublicScreen.png')}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Description */}
        <Text style={styles.description}>
          Always remain in public, visible areas.
        </Text>

        <Text style={styles.descriptionSub}>
          Visibility protects everyone.
        </Text>

        {/* Two Column Cards */}
        <View style={styles.cardsRow}>
          {/* Good Places Card */}
          <View style={styles.card}>
            <View style={styles.cardDivider} />
            <Text style={styles.cardTitle}>Good Places</Text>
            <View style={styles.cardDivider} />

            <View style={styles.bulletContainer}>
              {goodPlaces.map((place, index) => (
                <View key={index} style={styles.bulletRow}>
                  <View style={styles.bulletPoint} />
                  <Text style={styles.bulletText}>{place}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Avoid Card */}
          <View style={styles.card}>
            <View style={styles.cardDivider} />
            <Text style={styles.cardTitleRed}>Avoid</Text>
            <View style={styles.cardDivider} />

            <View style={styles.bulletContainer}>
              {avoidPlaces.map((place, index) => (
                <View key={index} style={styles.bulletRow}>
                  <View style={styles.bulletPointRed} />
                  <Text style={styles.bulletText}>{place}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Footer Text */}
        <Text style={styles.footerText}>
          If a situation moves elsewhere, you should not follow.
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

  // ===== LOGO TITLE =====
  logoTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#DC5C69',
    textAlign: 'center',
    marginBottom: 8,
  },

  // ===== MAIN TITLE =====
  mainTitle: {
    fontSize: 24,
    fontWeight: '500',
    color: '#DC5C69',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 20,
  },

  // ===== IMAGE CONTAINER =====
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
  },

  image: {
    width: '100%',
  },

  // ===== DESCRIPTION =====
  description: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 6,
  },

  descriptionSub: {
    fontSize: 14,
    fontWeight: '400',
    color: '#888888',
    textAlign: 'center',
    lineHeight: 21,
    fontStyle: 'italic',
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

  cardDivider: {
    height: 1,
    backgroundColor: '#E8EAED',
    marginBottom: 10,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC5C69',
    textAlign: 'center',
    marginBottom: 10,
  },

  cardTitleRed: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC5C69',
    textAlign: 'center',
    marginBottom: 10,
  },

  bulletContainer: {
    marginTop: 0,
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC5C69',
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

export default StayInPublicScreen;
