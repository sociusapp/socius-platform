import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../components/common/Header';
import { useResponsive } from '../../utils/responsive';
import { getPresenceCategories } from '../../services/api/needPresence.api';
import { loadAuth } from '../../services/storage/asyncStorage.service';
import { sociusRefreshProps } from '../../utils/sociusRefreshControl';

const CommunityAroundScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const [token, setToken] = useState(null);
  const [apiCategories, setApiCategories] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const presenceTypesFallback = [
    { label: 'Calm presence', icon: 'meditation', color: '#5A6F7D', bg: '#EEF3F6' },
    { label: 'Care & support', icon: 'hand-heart', color: '#8B6F47', bg: '#F1EEE8' },
    { label: 'Medical awareness', icon: 'medical-bag', color: '#C94D4D', bg: '#F8EAEA' },
    { label: 'Language support', icon: 'translate', color: '#5A6F7D', bg: '#EEF3F6' },
    { label: 'Elder assistance', icon: 'human-greeting-proximity', color: '#C94D4D', bg: '#F8EAEA' },
    { label: 'Community upkeep', icon: 'home-heart', color: '#8B6F47', bg: '#F1EEE8' },
  ];
  const iconFallbacks = ['meditation', 'hand-heart', 'medical-bag', 'translate', 'human-greeting-proximity', 'home-heart'];

  const guidelines = [
    'Voluntary participation',
    'No public activity',
    'No confrontation',
    'Respect and restraint',
  ];

  const handleReadGuidelines = () => {
    navigation.navigate('CommunityPrinciples');
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

  const loadCategories = useCallback(
    async ({ useCache = true } = {}) => {
      if (!token) return;
      try {
        const res = await getPresenceCategories(token, { cacheTtlMs: useCache ? 60000 : 0 });
        const items = Array.isArray(res?.data?.items) ? res.data.items : Array.isArray(res?.items) ? res.items : [];
        if (items.length > 0) setApiCategories(items);
      } catch {
        // Keep fallback static list if API fails.
      }
    },
    [token]
  );

  useEffect(() => {
    loadCategories({ useCache: true });
  }, [loadCategories]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCategories({ useCache: false });
    } finally {
      setRefreshing(false);
    }
  }, [loadCategories]);

  const presenceTypes = useMemo(() => {
    if (!apiCategories.length) return presenceTypesFallback;
    return apiCategories.map((cat, idx) => ({
      label: cat?.title || 'Presence',
      icon: cat?.iconName || iconFallbacks[idx % iconFallbacks.length],
      color: '#5A6F7D',
      bg: '#EEF3F6',
    }));
  }, [apiCategories]);

  return (
    <SafeAreaView style={styles.container}>
      <Header title="" onBackPress={() => navigation.goBack()} style={{ borderBottomWidth: 0 }} />

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { 
          paddingHorizontal: spacing(20),
          paddingTop: vscale(12),
          paddingBottom: vscale(30),
          alignItems: 'center'
        }]} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...sociusRefreshProps} />}
      >
        <View style={{ width: contentWidth }}>
          <Text style={[styles.pageTitle, { fontSize: ms(24), marginBottom: vscale(6) }]}>Community Around You</Text>
          <Text style={[styles.pageSubtitle, { fontSize: ms(14), marginBottom: vscale(18) }]}>Awareness without exposure.</Text>

          <View style={[styles.infoCard, { 
            borderRadius: scale(16),
            paddingHorizontal: spacing(16),
            paddingVertical: vscale(14),
            borderWidth: scale(1),
            shadowOffset: { width: 0, height: vscale(2) },
            shadowRadius: scale(8),
            elevation: scale(2),
            marginBottom: vscale(16)
          }]}>
            <Text style={[styles.cardTitle, { fontSize: ms(15) }]}>Local awareness network</Text>
            <View style={[styles.cardDivider, { height: scale(1), marginVertical: vscale(10) }]} />
            <Text style={[styles.cardText, { fontSize: ms(13), lineHeight: vscale(20) }]}>
              Socius helps people stay aware and supportive without public feeds, groups, or coordination.
            </Text>
          </View>

          <Text style={[styles.sectionTitle, { fontSize: ms(15), marginBottom: vscale(12) }]}>Types of presence nearby</Text>
          <View style={[styles.grid, { rowGap: vscale(12), marginBottom: vscale(16) }]}>
            {presenceTypes.map((item, idx) => (
              <View key={idx} style={[styles.gridItem, { 
                borderRadius: scale(16),
                paddingVertical: vscale(12),
                borderWidth: scale(1),
                shadowOffset: { width: 0, height: vscale(2) },
                shadowRadius: scale(6),
                elevation: scale(2)
              }]}>
                <View style={[styles.iconCircle, { 
                  backgroundColor: item.bg,
                  width: scale(42),
                  height: scale(42),
                  borderRadius: scale(21),
                  marginBottom: vscale(8)
                }]}>
                  <Icon name={item.icon} size={scale(24)} color={item.color} />
                </View>
                <Text style={[styles.gridLabel, { fontSize: ms(13) }]}>{item.label}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.guidelinesCard, { 
            borderRadius: scale(14),
            padding: spacing(14),
            borderWidth: scale(1),
            shadowOffset: { width: 0, height: vscale(2) },
            shadowRadius: scale(6),
            elevation: scale(1),
            marginBottom: vscale(16)
          }]}>
            <Text style={[styles.guidelinesTitle, { fontSize: ms(14), marginBottom: vscale(8) }]}>Community principles</Text>
            {guidelines.map((item, idx) => (
              <View key={idx} style={[styles.guidelineRow, { marginBottom: vscale(4) }]}>
                <Icon name="check-circle-outline" size={scale(16)} color="#34C759" />
                <Text style={[styles.guidelineText, { fontSize: ms(13), marginLeft: spacing(8) }]}>{item}</Text>
              </View>
            ))}
            <TouchableOpacity onPress={handleReadGuidelines} style={{ marginTop: vscale(8) }}>
              <Text style={[styles.linkText, { fontSize: ms(13) }]}>Read full guidelines</Text>
            </TouchableOpacity>
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
  pageTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  pageSubtitle: {
    color: '#7F8C8D',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E9F0',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
  },
  cardTitle: {
    fontWeight: '600',
    color: '#2C3E50',
  },
  cardDivider: {
    backgroundColor: '#ECEFF4',
  },
  cardText: {
    color: '#546E7A',
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#2C3E50',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E9F0',
    alignItems: 'center',
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLabel: {
    color: '#2C3E50',
    fontWeight: '500',
  },
  guidelinesCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E9F0',
  },
  guidelinesTitle: {
    fontWeight: '600',
    color: '#2C3E50',
  },
  guidelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guidelineText: {
    color: '#546E7A',
  },
  linkText: {
    color: '#007AFF',
    fontWeight: '500',
  },
});

export default CommunityAroundScreen;

