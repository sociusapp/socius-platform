import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useResponsive } from '../../../utils/responsive';
import MotionPressable from '../../../components/common/MotionPressable';
import MotionTextInput from '../../../components/common/MotionTextInput';
import MotionView from '../../../components/common/MotionView';

const CATEGORY_TITLES = {
  calm_presence: 'Need Calm Presence',
  care_support: 'Care or Support',
  right_help: 'Need Right Help',
  prevent_fix: 'Prevent or Fix',
};

const CreateAwarenessScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const category = route?.params?.category || 'calm_presence';
  const fromHelpFlow = route?.params?.from === 'helpFlow';
  const helpType = route?.params?.helpType;
  const [query, setQuery] = useState('');
  const [selectedChip, setSelectedChip] = useState(null);

  const chips = [
    { id: 'unsafe_walk', label: 'Unsafe walk', icon: 'shoe-print' },
    { id: 'being_followed', label: 'Being followed', icon: 'eye' },
    { id: 'night_travel', label: 'Night travel', icon: 'moon-waning-crescent' },
    { id: 'public_intimidation', label: 'Public space', icon: 'chat-processing' },
  ];

  const items = [
    {
      id: 'unsafe_walk',
      title: 'Feeling unsafe while walking',
      desc: 'Someone nearby is making me uncomfortable.',
    },
    {
      id: 'being_followed',
      title: 'Being followed',
      desc: 'I feel someone may be following me.',
    },
    {
      id: 'public_intimidation',
      title: 'Public intimidation',
      desc: 'Someone is acting aggressively or intimidating.',
    },
    {
      id: 'shop_tension',
      title: 'Shop or workplace tension',
      desc: 'A situation at my shop or workplace feels tense.',
    },
    {
      id: 'night_travel',
      title: 'Late-night travel unease',
      desc: 'I don’t feel safe traveling alone right now.',
    },
  ];

  const handleSelect = (item) => {
    if (fromHelpFlow) {
      navigation.navigate('AddDetails', {
        helpType,
        category,
        reason: item.id,
        query,
      });
    } else {
      navigation.navigate('ShareLocation', { category, reason: item.id });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingHorizontal: spacing(16), paddingVertical: vscale(12), borderBottomWidth: scale(1) }]}>
        <MotionPressable onPress={() => navigation.goBack()} style={[styles.headerBtn, { padding: scale(8) }]}>
          <Icon name="arrow-left" size={scale(24)} color="#A83A30" />
        </MotionPressable>
        <Text style={[styles.headerTitle, { fontSize: ms(20) }]}>Socius</Text>
        <MotionPressable onPress={() => navigation.navigate('Settings')} style={[styles.headerBtn, { padding: scale(8) }]} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: spacing(20), paddingTop: vscale(10), paddingBottom: vscale(60) }]} showsVerticalScrollIndicator={false}>
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          <MotionView preset="fadeUp" delay={100}>
            <Text style={[styles.title, { fontSize: ms(20), marginBottom: vscale(10) }]}>{CATEGORY_TITLES[category] || 'Need Calm Presence'}</Text>
          </MotionView>

          <MotionView preset="fadeUp" delay={200}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[styles.chipsScroll, { marginBottom: vscale(1) }]}
              contentContainerStyle={[styles.chipsRow, { gap: spacing(12), paddingVertical: vscale(2), paddingHorizontal: spacing(4) }]}
              bounces={false}
              alwaysBounceHorizontal={false}
              overScrollMode="never"
            >
              {chips.map((chip) => (
                <MotionPressable
                  key={chip.id}
                  style={[
                    styles.chip,
                    selectedChip === chip.id && styles.chipActive,
                    {
                      borderRadius: scale(999),
                      paddingHorizontal: spacing(12),
                      paddingVertical: vscale(6),
                      minHeight: vscale(36),
                      shadowRadius: scale(3),
                      elevation: scale(2),
                    },
                  ]}
                  onPress={() => setSelectedChip(chip.id)}
                  pressScale={0.98}
                >
                  <Icon name={chip.icon} size={scale(18)} color="#C94444" style={{ marginRight: spacing(6) }} />
                  <Text style={[styles.chipText, selectedChip === chip.id && styles.chipTextActive, { fontSize: ms(13) }]}>{chip.label}</Text>
                </MotionPressable>
              ))}
            </ScrollView>
          </MotionView>

          <MotionView preset="fadeUp" delay={300}>
            <View style={[styles.searchWrap, { borderRadius: scale(12), paddingHorizontal: spacing(16), paddingVertical: vscale(2), marginTop: vscale(10), marginBottom: vscale(16), shadowRadius: scale(6), elevation: scale(2) }]}>
              <Icon name="magnify" size={scale(22)} color="#999999" />
              <MotionTextInput
                containerStyle={{ flex: 1, marginLeft: spacing(8), borderRadius: scale(12), paddingVertical: 0, paddingHorizontal: 0, borderWidth: 0, backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0 }}
                inputStyle={[styles.searchInput, { fontSize: ms(15) }]}
                placeholder="Search within this category"
                placeholderTextColor="#9AA1A9"
                value={query}
                onChangeText={setQuery}
              />
            </View>
          </MotionView>

          {items.map((item, index) => (
            <MotionView key={item.id} preset="fadeUp" delay={400 + index * 50}>
              <MotionPressable
                style={[
                  styles.listCard,
                  {
                    borderRadius: scale(16),
                    paddingHorizontal: spacing(16),
                    paddingVertical: vscale(16),
                    marginBottom: vscale(12),
                    shadowRadius: scale(8),
                    elevation: scale(3),
                  },
                ]}
                onPress={() => handleSelect(item)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listTitle, { fontSize: ms(15), marginBottom: vscale(4) }]}>{item.title}</Text>
                  <Text style={[styles.listDesc, { fontSize: ms(12) }]}>{item.desc}</Text>
                </View>
                <Icon name="chevron-right" size={scale(22)} color="#9AA1A9" />
              </MotionPressable>
            </MotionView>
          ))}

          <MotionView preset="fadeUp" delay={700}>
            <View style={[styles.footerNoteWrap, { marginTop: vscale(6) }]}>
              <View style={[styles.sectionDivider, { height: scale(1), marginVertical: vscale(10) }]} />
              <Text style={[styles.footerNote, { fontSize: ms(12) }]}>You can cancel anytime before sharing.</Text>
            </View>
          </MotionView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  headerBtn: {
  },
  headerTitle: {
    fontWeight: '700',
    color: '#C94444',
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'stretch',
  },
  title: {
    fontWeight: '600',
    color: '#666666',
    textAlign: 'center',
  },
  chipsScroll: {
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexGrow: 0,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
  },
  chipActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#2F80ED',
  },
  chipText: {
    color: '#C94444',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#2F80ED',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
  },
  searchInput: {
    flex: 1,
    color: '#2C3E50',
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
  },
  listTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  listDesc: {
    color: '#666666',
  },
  sectionDivider: {
    backgroundColor: '#E8EAED',
  },
  footerNoteWrap: {
    alignItems: 'center',
  },
  footerNote: {
    color: '#999999',
    textAlign: 'center',
  },
});

export default CreateAwarenessScreen;
