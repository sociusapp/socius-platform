import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../../../components/common/Header';
import { useResponsive } from '../../../../utils/responsive';
import MotionPressable from '../../../../components/common/MotionPressable';
import MotionTextInput from '../../../../components/common/MotionTextInput';
import MotionView from '../../../../components/common/MotionView';
import { getPresenceCategories } from '../../../../services/api/needPresence.api';
import { loadAuth } from '../../../../services/storage/asyncStorage.service';
import { api } from '../../../../services/api/client';

const buildAssetUrl = (value) => {
  if (!value) return null;
  const src = String(value).trim();
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  const base = String(api?.defaults?.baseURL || '').replace(/\/api\/?$/, '');
  const normalized = src.startsWith('/') ? src : `/${src}`;
  return `${base}${normalized}`;
};

const WhatsHappeningScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const colors = useMemo(
    () => ({
      screenBg: '#FFFFFF',
      cardBg: '#FFFFFF',
      cardBorder: '#F1F2F4',
      textPrimary: '#2C3E50',
      textSecondary: '#666666',
      searchBg: '#F3F4F6',
      searchText: '#111827',
      divider: '#E8EAED',
      iconMuted: '#999999',
      iconAccent: '#C94444',
    }),
    []
  );
  const [query, setQuery] = useState('');
  const [token, setToken] = useState(null);
  const [categories, setCategories] = useState([]);

  const navigateToCreate = (category) => {
    navigation.navigate('CreateAwareness', { category: category.slug, categoryId: category._id });
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
    const load = async () => {
      try {
        const res = await getPresenceCategories(token, { cacheTtlMs: 60000 });
        const data = Array.isArray(res?.data?.items) ? res.data.items : Array.isArray(res?.items) ? res.items : [];
        if (mounted && data.length) setCategories(data);
      } catch {
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [token]);

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = categories.length
      ? categories
      : [
          { _id: 'calm', slug: 'calm_presence', title: 'I need calm presence', description: 'Something feels off and I don’t want to be alone.', iconName: 'account-group' },
          { _id: 'care', slug: 'care_support', title: 'Someone needs care or support', description: 'This is about care, comfort, or assistance.', iconName: 'heart' },
          { _id: 'right', slug: 'right_help', title: 'We need the right help', description: 'Specific help or resources are needed.', iconName: 'link-variant' },
          { _id: 'fix', slug: 'prevent_fix', title: 'Let’s prevent or fix something', description: 'A local issue that could become a problem.', iconName: 'wrench' },
        ];
    if (!q) return source;
    return source.filter((item) => `${item.title || ''} ${item.description || ''}`.toLowerCase().includes(q));
  }, [categories, query]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenBg }]}>
      <Header 
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <MotionPressable onPress={() => navigation.navigate('Settings')} style={{ padding: spacing(8) }}>
            <Icon name="cog" size={scale(24)} color={colors.iconMuted} />
          </MotionPressable>
        }
        style={{ borderBottomWidth: scale(1), borderBottomColor: colors.divider }}
      />

      <ScrollView 
        contentContainerStyle={[styles.scroll, { 
          paddingHorizontal: spacing(20), 
          paddingTop: vscale(20), 
          paddingBottom: vscale(60),
          alignItems: 'center'
        }]} 
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth }}>
          <MotionView preset="fadeUp" delay={100}>
            <Text style={[styles.title, { fontSize: ms(22), marginBottom: vscale(6), color: colors.textPrimary }]}>What’s happening right now?</Text>
            <Text style={[styles.subtitle, { fontSize: ms(13), marginBottom: vscale(12), color: colors.textSecondary }]}>Choose the closest option or search directly.</Text>
          </MotionView>

          <MotionView preset="fadeUp" delay={200}>
            <View style={[styles.searchWrap, { 
              borderRadius: scale(24), 
              paddingHorizontal: spacing(12), 
              paddingVertical: vscale(10), 
              minHeight: vscale(50),
              marginBottom: vscale(12),
              shadowRadius: scale(4),
              elevation: scale(1)
            }, { backgroundColor: colors.searchBg, borderColor: colors.cardBorder, borderWidth: 1 }]}>
              <Icon name="magnify" size={scale(22)} color={colors.iconMuted} />
              <MotionTextInput
                containerStyle={{ flex: 1, marginLeft: spacing(8), borderRadius: scale(16), paddingVertical: 0, paddingHorizontal: 0, borderWidth: 0, backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0 }}
                inputStyle={[styles.searchInput, { fontSize: ms(14), color: colors.searchText }]}
                placeholder="Search (e.g. unsafe walk, blood, car issue)"
                placeholderTextColor={colors.iconMuted}
                value={query}
                onChangeText={setQuery}
              />
            </View>
          </MotionView>

          {filteredCategories.map((cat, idx) => (
          <MotionView preset="fadeUp" delay={300 + idx * 100} key={cat._id || cat.slug}>
            <MotionPressable 
              style={[styles.card, {
                borderRadius: scale(16), 
                borderWidth: scale(1), 
                paddingHorizontal: spacing(14), 
                paddingVertical: vscale(12), 
                marginBottom: vscale(12),
                shadowRadius: scale(6),
                elevation: scale(2)
              }, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
              onPress={() => navigateToCreate(cat)}
            >
              <View
                style={[
                  styles.iconPill,
                  {
                    width: scale(48),
                    height: scale(48),
                    borderRadius: scale(24),
                    marginRight: spacing(12),
                    backgroundColor: '#FFFFFF',
                  },
                ]}
              >
                {cat.iconPath ? (
                  <Image
                    source={{ uri: buildAssetUrl(cat.iconPath) }}
                    style={{ width: scale(28), height: scale(28), borderRadius: scale(14) }}
                    resizeMode="cover"
                  />
                ) : (
                  <Icon name={cat.iconName || 'account-group'} size={scale(28)} color={colors.iconAccent} />
                )}
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { fontSize: ms(15), marginBottom: vscale(4), color: colors.textPrimary }]}>{cat.title || 'Presence category'}</Text>
                <Text style={[styles.cardDesc, { fontSize: ms(12), color: colors.textSecondary }]}>{cat.description || 'Select to continue'}</Text>
              </View>
            </MotionPressable>
          </MotionView>
          ))}

          <View style={[styles.footerNoteWrap, { marginTop: vscale(6) }]}>
            <View style={[styles.sectionDivider, { height: scale(1), marginVertical: vscale(10), backgroundColor: colors.divider }]} />
            <Text style={[styles.footerNote, { fontSize: ms(12), color: colors.iconMuted }]}>Nothing is shared until you confirm.</Text>
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
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 60,
    alignItems: 'stretch',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 12,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F2F4',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  iconPill: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: '#666666',
  },
  footerNoteWrap: {
    alignItems: 'center',
  },
  sectionDivider: {
    width: '100%',
    backgroundColor: '#E8EAED',
  },
  footerNote: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
  },
});

export default WhatsHappeningScreen;
