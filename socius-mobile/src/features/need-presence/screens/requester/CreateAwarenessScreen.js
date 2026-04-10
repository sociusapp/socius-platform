import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useResponsive } from '../../../../utils/responsive';
import MotionPressable from '../../../../components/common/MotionPressable';
import MotionTextInput from '../../../../components/common/MotionTextInput';
import MotionView from '../../../../components/common/MotionView';
import { getPresenceCategories, getPresenceItems } from '../../../../services/api/needPresence.api';
import { loadAuth } from '../../../../services/storage/asyncStorage.service';
import { api } from '../../../../services/api/client';

const CATEGORY_TITLES = {
  calm_presence: 'Need Calm Presence',
};

const buildAssetUrl = (value) => {
  if (!value) return null;
  const src = String(value).trim();
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  const base = String(api?.defaults?.baseURL || '').replace(/\/api\/?$/, '');
  const normalized = src.startsWith('/') ? src : `/${src}`;
  return `${base}${normalized}`;
};

const CreateAwarenessScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const category = route?.params?.category || 'calm_presence';
  const [query, setQuery] = useState('');
  const [selectedChip, setSelectedChip] = useState(null);
  const [token, setToken] = useState(null);
  const [categories, setCategories] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(route?.params?.categoryId || null);
  const [apiItems, setApiItems] = useState([]);

  const fallbackItems = [
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
    navigation.navigate('ShareLocation', { category, reason: item.id || item._id });
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const auth = await loadAuth();
        if (mounted) setToken(auth?.accessToken || null);
      } catch {
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadCategories = async () => {
      try {
        const res = await getPresenceCategories(token, { cacheTtlMs: 60000 });
        const data = Array.isArray(res?.data?.items) ? res.data.items : Array.isArray(res?.items) ? res.items : [];
        if (!mounted) return;
        setCategories(data);
        if (!activeCategoryId && data.length) {
          const legacy = data.find((c) => String(c.slug || '').toLowerCase() === String(category).toLowerCase());
          setActiveCategoryId((legacy?._id || data[0]?._id || null));
        }
      } catch {
      }
    };
    loadCategories();
    return () => {
      mounted = false;
    };
  }, [token, category, activeCategoryId]);

  useEffect(() => {
    if (!activeCategoryId) return;
    let mounted = true;
    const loadItems = async () => {
      try {
        const res = await getPresenceItems(token, activeCategoryId, { cacheTtlMs: 30000 });
        const data = Array.isArray(res?.data?.items) ? res.data.items : Array.isArray(res?.items) ? res.items : [];
        if (mounted) setApiItems(data);
      } catch {
        if (mounted) setApiItems([]);
      }
    };
    loadItems();
    return () => {
      mounted = false;
    };
  }, [token, activeCategoryId]);

  const dynamicTitle = useMemo(() => {
    const activeCategory = categories.find((c) => c._id === activeCategoryId);
    return activeCategory?.title || CATEGORY_TITLES[category] || 'Need Calm Presence';
  }, [categories, activeCategoryId, category]);

  const items = useMemo(() => {
    const source = apiItems.length ? apiItems : fallbackItems;
    const q = query.trim().toLowerCase();
    const filteredByChip =
      selectedChip && apiItems.length > 0
        ? source.filter((it) => (it.tags || []).includes(selectedChip))
        : source;
    if (!q) return filteredByChip;
    return filteredByChip.filter((it) =>
      `${it.title || ''} ${it.desc || ''} ${it.description || ''}`.toLowerCase().includes(q)
    );
  }, [apiItems, query, selectedChip]);

  const chips = useMemo(() => {
    if (!apiItems.length) {
      return [
        { id: 'unsafe_walk', label: 'Unsafe walk', icon: 'shoe-print' },
        { id: 'being_followed', label: 'Being followed', icon: 'eye' },
        { id: 'night_travel', label: 'Night travel', icon: 'moon-waning-crescent' },
        { id: 'public_intimidation', label: 'Public space', icon: 'chat-processing' },
      ];
    }
    const tagMap = new Map();
    apiItems.forEach((it) => {
      const iconName = it?.iconName || 'tag';
      const iconUrl = buildAssetUrl(it?.iconPath);
      (it.tags || []).forEach((tag) => {
        const key = String(tag);
        if (!tagMap.has(key)) {
          tagMap.set(key, { id: key, label: key.replace(/_/g, ' '), icon: iconName, iconUrl });
        }
      });
    });
    return Array.from(tagMap.values())
      .slice(0, 12)
      .map((tag) => tag);
  }, [apiItems]);

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
            <Text style={[styles.title, { fontSize: ms(20), marginBottom: vscale(10) }]}>{dynamicTitle}</Text>
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
                  onPress={() => setSelectedChip((prev) => (prev === chip.id ? null : chip.id))}
                  pressScale={0.98}
                >
                  {chip.iconUrl ? (
                    <Image
                      source={{ uri: chip.iconUrl }}
                      style={{ width: scale(18), height: scale(18), marginRight: spacing(6), borderRadius: scale(9) }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Icon name={chip.icon} size={scale(18)} color="#C94444" style={{ marginRight: spacing(6) }} />
                  )}
                  <Text style={[styles.chipText, selectedChip === chip.id && styles.chipTextActive, { fontSize: ms(13) }]}>{chip.label}</Text>
                </MotionPressable>
              ))}
            </ScrollView>
          </MotionView>

          <MotionView preset="fadeUp" delay={300}>
            <View style={[styles.searchWrap, { borderRadius: scale(12), paddingHorizontal: spacing(16), paddingVertical: vscale(6), minHeight: vscale(50), marginTop: vscale(10), marginBottom: vscale(16), shadowRadius: scale(6), elevation: scale(2) }]}>
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
            <MotionView key={item.id || item._id || String(index)} preset="fadeUp" delay={400 + index * 50}>
              <MotionPressable
                style={[
                  styles.listCard,
                  {
                    borderRadius: scale(16),
                    paddingHorizontal: spacing(16),
                    paddingVertical: vscale(12),
                    marginBottom: vscale(8),
                    shadowRadius: scale(8),
                    elevation: scale(3),
                  },
                ]}
                onPress={() => handleSelect(item)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listTitle, { fontSize: ms(15), marginBottom: vscale(4) }]}>{item.title}</Text>
                  <Text style={[styles.listDesc, { fontSize: ms(12) }]}>{item.desc || item.description}</Text>
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
