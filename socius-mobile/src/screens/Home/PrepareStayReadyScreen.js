import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../components/common/Header';
import { useResponsive } from '../../utils/responsive';

const PrepareStayReadyScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const items = [
    {
      icon: { name: 'message-outline', color: '#5A6F7D', bg: '#EEF3F6' },
      title: 'When to ask for presence',
      subtitle: "Early signs that it's okay to share awareness.",
      route: 'WhenToAskPresence',
    },
    {
      icon: { name: 'block-helper', color: '#C94D4D', bg: '#F8EAEA' },
      title: 'When not to use Socius',
      subtitle: 'Situations better handled by authorities or trusted contacts.',
      route: 'SafetyTips',
    },
    {
      icon: { name: 'shield-check', color: '#8B6F47', bg: '#F1EEE8' },
      title: 'Staying safe while helping',
      subtitle: 'Boundaries, distance, and personal safety.',
      route: 'SafetyTips',
    },
    {
      icon: { name: 'hand-peace', color: '#5A6F7D', bg: '#EEF3F6' },
      title: 'De-escalation basics',
      subtitle: 'How calm presence can reduce tension.',
      route: 'SafetyTips',
    },
    {
      icon: { name: 'medical-bag', color: '#C94D4D', bg: '#F8EAEA' },
      title: 'Emergency first steps',
      subtitle: 'What to do before professional help arrives.',
      route: 'SafetyTips',
    },
  ];

  const chips = [
    { label: 'Understanding stress & fear', icon: 'brain' },
    { label: 'Cultural sensitivity & respect', icon: 'earth' },
    { label: 'Helping without overstepping', icon: 'handshake' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="" 
        onBackPress={() => navigation.goBack()} 
        style={{ borderBottomWidth: 0 }}
      />

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing(20), paddingBottom: vscale(30) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          {/* Title */}
          <Text style={[styles.pageTitle, { fontSize: ms(24), marginBottom: vscale(6) }]}>Prepare & Stay Ready</Text>
          <Text style={[styles.pageSubtitle, { fontSize: ms(14), marginBottom: vscale(18) }]}>
            Knowing what to do — and when not to.
          </Text>

          {/* List Cards */}
          <View style={[styles.listContainer, { marginBottom: vscale(20), gap: vscale(10) }]}>
            {items.map((item, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={[styles.listCard, { borderRadius: scale(16), paddingHorizontal: spacing(14), paddingVertical: vscale(12), borderWidth: scale(1), shadowOffset: { width: 0, height: vscale(2) }, shadowRadius: scale(8), elevation: scale(2) }]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate(item.route)}
              >
                <View style={[styles.iconCircle, { backgroundColor: item.icon.bg, width: scale(36), height: scale(36), borderRadius: scale(18), marginRight: spacing(12) }]}>
                  <Icon name={item.icon.name} size={scale(24)} color={item.icon.color} />
                </View>
                <View style={styles.listText}>
                  <Text style={[styles.listTitle, { fontSize: ms(15), marginBottom: vscale(4) }]}>{item.title}</Text>
                  <Text style={[styles.listSubtitle, { fontSize: ms(13), lineHeight: ms(20) }]}>{item.subtitle}</Text>
                </View>
                <Icon name="chevron-right" size={scale(24)} color="#999999" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Learn more */}
          <Text style={[styles.learnTitle, { fontSize: ms(14), marginTop: vscale(6) }]}>Learn more</Text>
          <View style={[styles.divider, { height: scale(1), marginVertical: vscale(12) }]} />

          <View style={[styles.chipsRow, { gap: spacing(10), marginBottom: vscale(12) }]}>
            {chips.map((chip, idx) => (
              <View key={idx} style={[styles.chip, { gap: spacing(8), borderRadius: scale(18), paddingHorizontal: spacing(12), paddingVertical: vscale(8), borderWidth: scale(1), shadowOffset: { width: 0, height: vscale(2) }, shadowRadius: scale(6), elevation: scale(2) }]}>
                <Icon name={chip.icon} size={scale(18)} color="#2C3E50" />
                <Text style={[styles.chipText, { fontSize: ms(13) }]}>{chip.label}</Text>
              </View>
            ))}
          </View>

          {/* Footer text */}
          <Text style={[styles.footerText, { fontSize: ms(13), marginTop: vscale(6) }]}>
            Preparation reduces harm and misunderstanding.
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
  pageTitle: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },
  pageSubtitle: {
    color: '#666666',
    textAlign: 'center',
  },
  listContainer: {
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },
  iconCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listText: {
    flex: 1,
  },
  listTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  listSubtitle: {
    color: '#666666',
  },
  learnTitle: {
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
  },
  divider: {
    backgroundColor: '#E8EAED',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent:"center"
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F1ED',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },
  chipText: {
    color: '#2C3E50',
  },
  footerText: {
    color: '#888888',
    textAlign: 'center',
  },
});

export default PrepareStayReadyScreen;
