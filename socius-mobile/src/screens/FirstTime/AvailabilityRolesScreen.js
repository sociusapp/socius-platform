import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useResponsive } from '../../utils/responsive';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AvailabilityRolesScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const cards = [
    {
      title: 'You can use Socius in different ways',
      description: 'You may use Socius to ask for awareness or choose to be available for others — or both.'
    },
    {
      title: 'Availability is optional',
      description: 'You decide when you are available. There is no obligation to respond to any request.'
    },
    {
      title: 'You stay in control',
      description: 'You can switch availability on or off at any time, without explanation or penalty.'
    }
  ];

  const bulletPoints = [
    'No obligation',
    'No penalties',
    'No expectations'
  ];

  const [isLoading, setIsLoading] = useState(false);
  const handleUnderstand = async () => {
    try {
      setIsLoading(true);
      await AsyncStorage.setItem('HAS_COMPLETED_ONBOARDING', 'true');
    } catch (e) {
      // ignore storage errors and proceed
    } finally {
      setIsLoading(false);
    }
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { alignItems: 'center', paddingHorizontal: spacing(16), paddingTop: vscale(35), paddingBottom: vscale(30) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth }}>
          {/* Logo Header */}
          <View style={[styles.headerSection, { marginBottom: vscale(28) }]}>
            <Image
              source={require('../../assets/icons/icon-03.png')}
              style={{ width: scale(32), height: scale(32), resizeMode: 'contain', marginRight: spacing(8) }}
            />
            <Text style={[styles.logoText, { fontSize: ms(28) }]}>Socius</Text>
          </View>

          {/* Title Section */}
          <View style={[styles.titleSection, { marginBottom: vscale(28) }]}>
            <Text style={[styles.mainTitle, { fontSize: ms(26), lineHeight: ms(32), marginBottom: vscale(8) }]}>Availability & Roles</Text>
            <Text style={[styles.subtitle, { fontSize: ms(15), lineHeight: ms(22) }]}>How participation works on Socius</Text>
          </View>

          {/* Cards Container */}
          <View style={[styles.cardsContainer, { marginBottom: vscale(16), gap: vscale(12) }]}>
            {cards.map((card, index) => (
              <View key={index} style={[styles.card, {
                borderRadius: scale(20),
                paddingHorizontal: spacing(16),
                paddingVertical: vscale(16),
                borderWidth: scale(1),
                shadowOffset: { width: 0, height: vscale(2) },
                shadowRadius: scale(8),
                elevation: scale(3)
              }]}>
                <Text style={[styles.cardTitle, { fontSize: ms(15), lineHeight: ms(20), marginBottom: vscale(12) }]}>{card.title}</Text>
                <View style={[styles.cardDivider, { height: scale(1), marginBottom: vscale(12) }]} />
                <Text style={[styles.cardDescription, { fontSize: ms(14), lineHeight: ms(20) }]}>{card.description}</Text>
              </View>
            ))}
          </View>

          {/* Bullet Points Card */}
          <View style={[styles.bulletCard, {
            borderRadius: scale(20),
            paddingHorizontal: spacing(16),
            paddingVertical: vscale(16),
            marginBottom: vscale(24),
            shadowOffset: { width: 0, height: vscale(2) },
            shadowRadius: scale(8),
            elevation: scale(3)
          }]}>
            {bulletPoints.map((point, index) => (
              <View key={index} style={[styles.bulletRow, { marginBottom: vscale(12) }]}>
                <View style={[styles.bulletPoint, { width: scale(6), height: scale(6), borderRadius: scale(3), marginRight: spacing(12) }]} />
                <Text style={[styles.bulletText, { fontSize: ms(14), lineHeight: ms(20) }]}>{point}</Text>
              </View>
            ))}
          </View>

          {/* Understand Button */}
          <Button
            title="I Understand"
            onPress={handleUnderstand}
            variant="primary"
            fullWidth
            loading={isLoading}
            disabled={isLoading}
          />

          {/* Footer Text */}
          <Text style={[styles.footerText, { fontSize: ms(13), lineHeight: ms(20) }]}>
            Socius never assigns responsibility or expects action.
          </Text>
        </View>
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
  },

  // ===== HEADER SECTION =====
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoIcon: {
  },

  logoText: {
    fontWeight: '600',
    color: '#DC5C69',
  },

  // ===== TITLE SECTION =====
  titleSection: {
    alignItems: 'center',
  },

  mainTitle: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },

  subtitle: {
    fontWeight: '400',
    color: '#888888',
    textAlign: 'center',
  },

  // ===== CARDS CONTAINER =====
  cardsContainer: {
  },

  card: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },

  cardTitle: {
    fontWeight: '600',
    color: '#2C3E50',
  },

  cardDivider: {
    backgroundColor: '#E8EAED',
  },

  cardDescription: {
    fontWeight: '400',
    color: '#555555',
  },

  // ===== BULLET POINTS CARD =====
  bulletCard: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  bulletPoint: {
    backgroundColor: '#2C3E50',
  },

  bulletText: {
    fontWeight: '400',
    color: '#555555',
  },

  // ===== FOOTER TEXT =====
  footerText: {
    fontWeight: '400',
    color: '#888888',
    textAlign: 'center',
  },
});

export default AvailabilityRolesScreen;
