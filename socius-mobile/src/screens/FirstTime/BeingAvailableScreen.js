import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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

          {/* Bottom Text with lines */}
          <View style={[styles.bottomTextContainer, { marginBottom: vscale(24) }]}>
            <View style={[styles.textLine, { flex: 1, height: 1, backgroundColor: '#E8EAED' }]} />
            <Text style={[styles.bottomText, { fontSize: ms(14), lineHeight: ms(21), marginHorizontal: spacing(12) }]}>
              Your safety and comfort come first.
            </Text>
            <View style={[styles.textLine, { flex: 1, height: 1, backgroundColor: '#E8EAED' }]} />
          </View>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Understand Button - gradient primary */}
          <Button
            title="I Understand"
            onPress={handleUnderstand}
            variant="gradient"
            fullWidth
          />

          {/* Cancel Text Link */}
          <TouchableOpacity onPress={handleCancel} style={{ alignItems: 'center', marginTop: vscale(16) }}>
            <Text style={[styles.cancelText, { fontSize: ms(16), color: '#666666' }]}>
              Cancel
            </Text>
          </TouchableOpacity>
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
    backgroundColor: '#FFE4E8',
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
    backgroundColor: '#FFF0F3',
    borderColor: '#FFD1D9',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
  },

  importantText: {
    fontWeight: '500',
    color: '#2C3E50',
    textAlign: 'center',
  },

  // ===== BOTTOM TEXT =====
  bottomTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textLine: {
    height: 1,
  },
  bottomText: {
    fontWeight: '400',
    color: '#888888',
    textAlign: 'center',
  },
  cancelText: {
    fontWeight: '400',
    textDecorationLine: 'underline',
  },

  spacer: {
    flex: 1,
  },
});

export default BeingAvailableScreen;
