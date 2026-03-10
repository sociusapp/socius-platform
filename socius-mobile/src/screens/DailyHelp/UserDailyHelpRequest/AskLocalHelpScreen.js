import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../../components/common/Header';
import Button from '../../../components/common/Button';
import { useResponsive } from '../../../utils/responsive';

const AskLocalHelpScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const handleRequestHelp = () => {
    navigation.navigate('HelpType');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{ padding: scale(8) }}>
            <Icon name="cog" size={scale(24)} color="#999999" />
          </TouchableOpacity>
        }
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { alignItems: 'center' }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth }}>
          {/* Title */}
          <Text style={[styles.title, { fontSize: ms(26), marginBottom: vscale(4) }]}>Community</Text>
          <Text style={[styles.subtitle, { fontSize: ms(14), marginBottom: vscale(20) }]}>Small help, close by.</Text>

          {/* Ask for Local Help Card */}
          <View style={[styles.card, { 
            borderRadius: scale(20),
            borderWidth: scale(1),
            paddingHorizontal: spacing(20),
            paddingVertical: vscale(20),
            marginBottom: vscale(20),
            shadowOffset: { width: 0, height: vscale(2) },
            shadowRadius: scale(10),
            elevation: scale(3)
          }]}>
            <View style={[styles.iconBadge, { 
              width: scale(64), 
              height: scale(64), 
              borderRadius: scale(32),
              marginBottom: vscale(14)
            }]}>
              <Icon name="handshake" size={scale(36)} color="#DC5C69" />
            </View>
            <Text style={[styles.cardTitle, { fontSize: ms(18), marginBottom: vscale(8) }]}>Ask for Local Help</Text>
            <Text style={[styles.cardSubtext, { fontSize: ms(14), lineHeight: ms(22), marginBottom: vscale(12) }]}>
              Request small, everyday help from people nearby. No money. No obligation.
            </Text>

            <Button
              title="Request Help"
              onPress={handleRequestHelp}
              variant="gradient"
              fullWidth
              style={{ borderRadius: scale(28), marginTop: vscale(8) }}
            />
          </View>

          {/* Local Improvements Card */}
          <View style={[styles.slimCard, { 
            borderRadius: scale(18),
            borderWidth: scale(1),
            paddingHorizontal: spacing(18),
            paddingVertical: vscale(14),
            marginBottom: vscale(20),
            shadowOffset: { width: 0, height: vscale(2) },
            shadowRadius: scale(8),
            elevation: scale(2)
          }]}>
            <View style={styles.slimHeaderRow}>
              <Text style={[styles.slimTitle, { fontSize: ms(16) }]}>Local Improvements</Text>
            </View>
            <View style={[styles.slimDivider, { height: scale(1), marginVertical: vscale(10) }]} />
            <Text style={[styles.slimSubtext, { fontSize: ms(13) }]}>
              Community cleanups and shared fixes. Coming soon.
            </Text>
          </View>

          <View style={[styles.spacer, { height: vscale(20) }]} />
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
  title: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'left',
  },
  subtitle: {
    fontWeight: '400',
    color: '#666666',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F0F2F5',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    alignItems: 'center',
  },
  iconBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDECEE',
  },
  cardTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  cardSubtext: {
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
  },

  slimCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F0F2F5',
    shadowColor: '#000000',
    shadowOpacity: 0.10,
  },
  slimHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slimTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  slimDivider: {
    backgroundColor: '#E8EAED',
  },
  slimSubtext: {
    fontWeight: '400',
    color: '#999999',
  },

  spacer: {
  },
});

export default AskLocalHelpScreen;
