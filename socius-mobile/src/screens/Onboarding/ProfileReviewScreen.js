import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import { useResponsive } from '../../utils/responsive';

const ProfileReviewScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale, isTablet } = useResponsive();
  const [rotation] = useState(new Animated.Value(0));

  useEffect(() => {
    const startRotation = () => {
      Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start();
    };
    startRotation();
  }, [rotation]);

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const animatedStyle = {
    transform: [{ rotate: rotateInterpolate }],
  };

  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="" 
        onBackPress={() => {}}
        style={{ borderBottomWidth: 0 }}
      />
      
      <View style={[styles.content, { alignItems: 'center', paddingHorizontal: spacing(20), paddingTop: vscale(40) }]}>
        
        {/* Clock Icon with Animation */}
        <View style={[styles.clockContainer, { marginBottom: vscale(40), height: scale(120) }]}>
          <Animated.View style={[styles.clockIconWrapper, animatedStyle]}>
            <Icon name="clock-outline" size={scale(100)} color="#CCCCCC" />
          </Animated.View>
        </View>

        {/* Content Card */}
        <View style={[styles.contentCard, { 
          width: contentWidth, 
          padding: spacing(24), 
          borderRadius: scale(28), 
          shadowRadius: scale(16), 
          borderWidth: scale(1),
          shadowOffset: { width: 0, height: vscale(4) },
          elevation: scale(5)
        }]}>
          <Text style={[styles.mainTitle, { fontSize: ms(20), marginBottom: vscale(18), lineHeight: ms(32) }]}>Your profile is under review</Text>
          
          <Text style={[styles.description, { fontSize: ms(14), marginBottom: vscale(15), lineHeight: ms(24) }]}>
            Thank you for completing your details. Our team is reviewing your information to help keep Socius safe and trusted for everyone.
          </Text>
          
          <View style={[styles.spacer, { height: vscale(24) }]} />
          
          <Text style={[styles.italicText, { fontSize: ms(14), marginBottom: vscale(8) }]}>
            This usually takes a short time.
          </Text>
          
          <Text style={[styles.italicText, { fontSize: ms(14) }]}>
            You'll be notified once your account is ready.
          </Text>
        </View>
      </View>

      {/* Go to Home Button */}
      <View style={[styles.footer, { paddingHorizontal: spacing(20), paddingVertical: vscale(16), paddingBottom: vscale(24) }]}>
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          <Button
            title="Go to Home"
            onPress={handleGoHome}
            fullWidth
            variant="white"
          />
        </View>
      </View>

      {/* Dev Buttons removed */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  content: {
    flex: 1,
    alignItems: 'center',
  },

  // ===== CLOCK SECTION =====
  clockContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  clockIconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ===== CONTENT CARD =====
  contentCard: {
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
  },

  mainTitle: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },

  description: {
    fontWeight: '400',
    color: '#555555',
    textAlign: 'center',
  },

  spacer: {
  },

  italicText: {
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // ===== FOOTER BUTTON =====
  footer: {
  },

  homeButton: {
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  homeButtonText: {
    fontWeight: '600',
    color: '#2C3E50',
  },
});

export default ProfileReviewScreen;
