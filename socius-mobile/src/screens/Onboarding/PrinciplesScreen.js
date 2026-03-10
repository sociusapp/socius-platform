import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '../../utils/responsive';
import Button from '../../components/common/Button';
import Header from '../../components/common/Header';

const PrinciplesScreen = ({ navigation }) => {
  const features = [
    {
      icon: require('../../assets/icons/icon-09.png'),
      title: "Share what's happening",
      description: 'When something feels wrong, you can share information calmly and voluntarily.'
    },
    {
      icon: require('../../assets/icons/icon-10.png'),
      title: 'People nearby become aware',
      description: 'People in your area may see the information and decide for themselves how to respond.'
    },
    {
      icon: require('../../assets/icons/help-access-01.png'),
      title: 'Access help when needed',
      description: 'You always have the option to contact emergency services or local support.'
    }
  ];

  const { contentWidth, subtitleFont, bodyFont, scale, vscale, spacing, height } = useResponsive();
  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="" 
        onBackPress={() => navigation.goBack()} 
        style={{ borderBottomWidth: 0 }}
      />
      
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { alignItems: 'center', paddingHorizontal: spacing(20), paddingTop: vscale(10), paddingBottom: vscale(120) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', width: '100%', flex: 1, justifyContent: height > 700 ? 'center' : 'flex-start' }}>
          {/* Feature Cards */}
          <View style={[styles.cardsContainer, { width: contentWidth, marginVertical: vscale(10) }] }>
            {features.map((feature, index) => (
              <View key={index} style={[styles.card, { 
                paddingVertical: vscale(12), 
                paddingHorizontal: spacing(16), 
                marginBottom: vscale(12), 
                borderRadius: scale(20),
                borderWidth: scale(1),
                shadowOffset: { width: 0, height: vscale(2) },
                shadowRadius: scale(8),
                elevation: scale(3)
              }]}>
                <View style={styles.cardContent}>
                  {/* Icon */}
                  <View style={[styles.iconContainer, { width: scale(56), height: scale(56), marginRight: spacing(14), marginTop: vscale(2) }]}>
                    <Image 
                      source={feature.icon} 
                      style={{ width: scale(60), height: scale(60) }} 
                      resizeMode="contain"
                    />
                  </View>

                  {/* Text Content */}
                  <View style={styles.textContainer}>
                    <Text style={[styles.cardTitle, { fontSize: subtitleFont(16), marginBottom: vscale(4), lineHeight: subtitleFont(22) }] }>{feature.title}</Text>
                    <Text style={[styles.cardDescription, { fontSize: bodyFont(14), lineHeight: bodyFont(20) }] }>{feature.description}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Bottom Text */}
          <View style={[styles.bottomTextSection, { width: contentWidth, marginBottom: vscale(20), paddingHorizontal: spacing(12) }] }>
            <Text style={[styles.bottomText1, { fontSize: subtitleFont(16), marginBottom: vscale(4), lineHeight: subtitleFont(22) }]}>Socius shares information.</Text>
            <Text style={[styles.bottomText2, { fontSize: subtitleFont(16), lineHeight: subtitleFont(22) }]}>People choose their actions.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer Button */}
      <View style={[styles.footer, { paddingHorizontal: spacing(20), paddingVertical: vscale(12), paddingBottom: vscale(24), borderTopWidth: scale(1) }]}>
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          <Button 
            title="Continue" 
            onPress={() => navigation.navigate('CommunityPrinciples')}
            fullWidth
          />
        </View>
      </View>
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
  },
  
  // ===== CARDS CONTAINER =====
  cardsContainer: {
  },

  // ===== CARD SECTION =====
  card: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    borderColor: '#F1F3F5',
  },
  
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  // ===== ICON SECTION =====
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  iconImage: {
    resizeMode: 'contain',
  },

  // ===== TEXT CONTENT =====
  textContainer: {
    flex: 1,
  },

  cardTitle: {
    fontWeight: '700',
    color: '#1A1A1A',
  },
  
  cardDescription: {
    fontWeight: '400',
    color: '#495057',
  },

  // ===== BOTTOM TEXT =====
  bottomTextSection: {
  },

  bottomText1: {
    // fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
  },

  bottomText2: {
    // fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
  },

  // ===== FOOTER SECTION =====
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopColor: '#F1F3F5',
  },
});

export default PrinciplesScreen;