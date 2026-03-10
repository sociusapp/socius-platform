import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useResponsive } from '../../utils/responsive';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';

const BeingAvailableScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const points = [
    'Available means you may see awareness requests nearby.',
    'You are never required to act or respond.',
    'You can turn this off at any time.'
  ];

  const handleUnderstand = () => {
    navigation.navigate('Permission');
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Being Available" 
        onBackPress={() => navigation.goBack()}
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
        titleColor="#DC5C69"
      />
      
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { alignItems: 'center', paddingHorizontal: spacing(16), paddingTop: vscale(24), paddingBottom: vscale(30) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth }}>
          {/* Points List */}
          <View style={[styles.pointsContainer, { marginBottom: vscale(24) }]}>
            {points.map((point, index) => (
              <View key={index} style={[styles.pointRow, { marginBottom: vscale(16) }]}>
                <View style={[styles.iconContainer, { width: scale(40), height: scale(40), borderRadius: scale(20), marginRight: spacing(14), marginTop: vscale(2) }]}>
                  <Icon name="heart" size={scale(18)} color="#DC5C69" />
                </View>
                <Text style={[styles.pointText, { fontSize: ms(15), lineHeight: ms(22), paddingTop: vscale(6) }]}>{point}</Text>
              </View>
            ))}
          </View>

          {/* Divider */}
          <View style={[styles.divider, { height: scale(1), marginBottom: vscale(24) }]} />

          {/* Important Card */}
          <View style={[styles.importantCard, { 
            borderRadius: scale(24), 
            paddingHorizontal: spacing(20), 
            paddingVertical: vscale(24), 
            marginBottom: vscale(20),
            borderWidth: scale(1),
            shadowOffset: { width: 0, height: vscale(4) },
            shadowRadius: scale(12),
            elevation: scale(4)
          }]}>
            <Text style={[styles.importantText, { fontSize: ms(16), lineHeight: ms(24) }]}>
              It's okay to observe, ignore, or step away. Participation is always your choice.
            </Text>
          </View>

          {/* Bottom Text */}
          <Text style={[styles.bottomText, { fontSize: ms(14), lineHeight: ms(21), marginBottom: vscale(24) }]}>
            Your safety and comfort come first.
          </Text>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Understand Button - gradient primary */}
          <Button
            title="I Understand"
            onPress={handleUnderstand}
            variant="gradient"
            fullWidth
          />

          {/* Cancel Button - link style */}
          <View style={{ alignItems: 'center' }}>
            <Button
              title="Cancel"
              onPress={handleCancel}
              variant="link"
              fullWidth={false}
            />
          </View>
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

  // ===== POINTS CONTAINER =====
  pointsContainer: {
  },

  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  iconContainer: {
    backgroundColor: '#FEE8EA',
    justifyContent: 'center',
    alignItems: 'center',
  },

  pointText: {
    fontWeight: '400',
    color: '#2C3E50',
    flex: 1,
  },

  // ===== DIVIDER =====
  divider: {
    backgroundColor: '#E8EAED',
  },

  // ===== IMPORTANT CARD =====
  importantCard: {
    backgroundColor: '#FFF5F6',
    borderColor: '#FEE8EA',
    shadowColor: '#000000',
    shadowOpacity: 0.1,
  },

  importantText: {
    fontWeight: '500',
    color: '#2C3E50',
    textAlign: 'center',
  },

  // ===== BOTTOM TEXT =====
  bottomText: {
    fontWeight: '400',
    color: '#888888',
    textAlign: 'center',
  },

  spacer: {
    flex: 1,
  },
});

export default BeingAvailableScreen;
