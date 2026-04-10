import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../components/common/Header';
import { useResponsive } from '../../utils/responsive';
import PrepareStayReadyCard from '../../components/Prepare/PrepareStayReadyCard';
import { SkeletonBox, SkeletonCircle } from '../../components/common/Skeleton';
import {
  fetchPrepareCards,
  savePrepareCardsCache,
  loadPrepareCardsCache,
} from '../../services/api/prepareCards.api';
import { fetchPrepareLearn } from '../../services/api/prepareLearn.api';

const FALLBACK_LEARN = {
  section_title: 'Learn more',
  footer_text: 'Preparation reduces harm and misunderstanding.',
  items: [
    { id: 'fb-0', label: 'Understanding stress & fear', icon: 'brain', navigate_to: 'SafetyTips', content: '' },
    { id: 'fb-1', label: 'Cultural sensitivity & respect', icon: 'earth', navigate_to: 'SafetyTips', content: '' },
    { id: 'fb-2', label: 'Helping without overstepping', icon: 'handshake', navigate_to: 'SafetyTips', content: '' },
  ],
};

const navigateLearnChip = (navigation, chip) => {
  const article = typeof chip?.content === 'string' ? chip.content.trim() : '';
  if (article) {
    try {
      navigation.navigate('PrepareLearnArticle', {
        title: chip.label || 'Learn more',
        content: chip.content || '',
      });
      return;
    } catch {
      /* fall through to named screen */
    }
  }
  const name =
    typeof chip?.navigate_to === 'string' && chip.navigate_to.trim()
      ? chip.navigate_to.trim()
      : 'SafetyTips';
  try {
    navigation.navigate(name);
  } catch {
    try {
      navigation.navigate('SafetyTips');
    } catch {
      /* ignore */
    }
  }
};

const PrepareStayReadyScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const colors = useMemo(
    () => ({
      screenBg: '#FFFFFF',
      pageTitle: '#2C3E50',
      pageSubtitle: '#666666',
      learnTitle: '#2C3E50',
      divider: '#E8EAED',
      chipBg: '#F5F1ED',
      chipBorder: '#E8EAED',
      chipText: '#2C3E50',
      footerText: '#888888',
      cardBg: '#FFFFFF',
      cardBorder: '#E8EAED',
      title: '#2C3E50',
      desc: '#666666',
      chevron: '#999999',
      shadowOpacity: 0.06,
      iconImageBg: '#F1F5F9',
      empty: '#666666',
      err: '#B91C1C',
    }),
    []
  );

  const [cards, setCards] = useState([]);
  const [learnBlock, setLearnBlock] = useState(FALLBACK_LEARN);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadCards = useCallback(async (opts = {}) => {
    const { isRefresh = false, showCacheFirst = false } = opts;
    if (showCacheFirst) {
      const cached = await loadPrepareCardsCache();
      if (cached?.data?.length) {
        setCards(cached.data);
        setError(null);
      }
    }

    if (!isRefresh) setLoading(true);
    setError(null);

    try {
      try {
        const list = await fetchPrepareCards();
        setCards(list);
        await savePrepareCardsCache(list);
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || 'Could not load topics.';
        setError(msg);
        const cached = await loadPrepareCardsCache();
        if (cached?.data?.length) {
          setCards(cached.data);
        } else {
          setCards([]);
        }
      }

      try {
        const learn = await fetchPrepareLearn();
        if (learn && Array.isArray(learn.items) && learn.items.length > 0) {
          setLearnBlock({
            section_title: learn.section_title || FALLBACK_LEARN.section_title,
            footer_text: learn.footer_text != null ? learn.footer_text : FALLBACK_LEARN.footer_text,
            items: learn.items.map((it, i) => ({
              id: it.id != null ? String(it.id) : `learn-${i}`,
              label: it.label || '',
              icon: it.icon || 'help-circle-outline',
              navigate_to: it.navigate_to || 'SafetyTips',
              content: it.content != null ? String(it.content) : '',
            })),
          });
        } else if (learn && Array.isArray(learn.items) && learn.items.length === 0) {
          setLearnBlock({
            section_title: learn.section_title || FALLBACK_LEARN.section_title,
            footer_text: learn.footer_text != null ? learn.footer_text : '',
            items: [],
          });
        } else {
          setLearnBlock(FALLBACK_LEARN);
        }
      } catch {
        setLearnBlock(FALLBACK_LEARN);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadCards({ showCacheFirst: true });
    })();
  }, [loadCards]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCards({ isRefresh: true });
  }, [loadCards]);

  const openDetail = useCallback(
    (item) => {
      navigation.navigate('CardDetailScreen', { card: item, id: item.id });
    },
    [navigation]
  );

  const renderShimmer = () => (
    <View style={{ paddingBottom: vscale(8) }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={[
            styles.shimmerRow,
            {
              borderRadius: scale(16),
              padding: spacing(14),
              marginBottom: vscale(10),
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.cardBorder,
              backgroundColor: colors.cardBg,
            },
          ]}
        >
          <SkeletonCircle size={scale(56)} style={{ marginRight: spacing(14) }} backgroundColor="#E5E7EB" />
          <View style={{ flex: 1 }}>
            <SkeletonBox height={14} radius={8} style={{ marginBottom: 8 }} backgroundColor="#E5E7EB" />
            <SkeletonBox height={10} radius={8} width="80%" backgroundColor="#E5E7EB" />
          </View>
        </View>
      ))}
    </View>
  );

  const ListHeader = useMemo(
    () => (
      <>
        <Text style={[styles.pageTitle, { fontSize: ms(24), marginBottom: vscale(6), color: colors.pageTitle }]}>
          Prepare & Stay Ready
        </Text>
        <Text style={[styles.pageSubtitle, { fontSize: ms(14), marginBottom: vscale(18), color: colors.pageSubtitle }]}>
          Knowing what to do — and when not to.
        </Text>
        {error ? (
          <Text style={[styles.errorBanner, { fontSize: ms(13), marginBottom: vscale(10), color: colors.err }]}>
            {error}
            {' — '}
            showing saved copy if available.
          </Text>
        ) : null}
      </>
    ),
    [colors, error, ms, vscale]
  );

  const ListFooter = useMemo(
    () => (
      <View style={{ marginTop: vscale(8) }}>
        <Text style={[styles.learnTitle, { fontSize: ms(14), marginTop: vscale(6), color: colors.learnTitle }]}>
          {learnBlock.section_title || 'Learn more'}
        </Text>
        <View style={[styles.divider, { height: scale(1), marginVertical: vscale(12), backgroundColor: colors.divider }]} />

        <View style={[styles.chipsRow, { gap: spacing(10), marginBottom: vscale(12) }]}>
          {(learnBlock.items || []).map((chip) => (
            <TouchableOpacity
              key={chip.id}
              style={[
                styles.chip,
                {
                  gap: spacing(8),
                  borderRadius: scale(18),
                  paddingHorizontal: spacing(12),
                  paddingVertical: vscale(8),
                  borderWidth: scale(1),
                  backgroundColor: colors.chipBg,
                  borderColor: colors.chipBorder,
                  shadowOpacity: colors.shadowOpacity,
                },
              ]}
              onPress={() => navigateLearnChip(navigation, chip)}
              activeOpacity={0.85}
            >
              <Icon name={chip.icon} size={scale(22)} color={colors.chipText} />
              <Text style={[styles.chipText, { fontSize: ms(13), color: colors.chipText }]}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {learnBlock.footer_text ? (
          <Text style={[styles.footerText, { fontSize: ms(13), marginTop: vscale(6), color: colors.footerText }]}>
            {learnBlock.footer_text}
          </Text>
        ) : null}
      </View>
    ),
    [colors, learnBlock, ms, navigation, scale, spacing, vscale]
  );

  if (loading && cards.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.screenBg }]}>
        <Header title="" onBackPress={() => navigation.goBack()} style={{ borderBottomWidth: 0 }} />
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <View style={{ width: contentWidth, alignSelf: 'center', paddingHorizontal: spacing(20) }}>
              {ListHeader}
              {renderShimmer()}
            </View>
          }
          contentContainerStyle={{ paddingBottom: vscale(30) }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DC5C69" colors={['#DC5C69']} />
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenBg }]}>
      <Header title="" onBackPress={() => navigation.goBack()} style={{ borderBottomWidth: 0 }} />

      <FlatList
        data={cards}
        keyExtractor={(item, index) => (item.id != null ? String(item.id) : `c-${index}`)}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingHorizontal: spacing(20),
            paddingBottom: vscale(30),
            flexGrow: 1,
          },
        ]}
        style={{ flex: 1 }}
        ListHeaderComponent={<View style={{ width: contentWidth, alignSelf: 'center' }}>{ListHeader}</View>}
        ListFooterComponent={<View style={{ width: contentWidth, alignSelf: 'center' }}>{ListFooter}</View>}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DC5C69" colors={['#DC5C69']} />
        }
        renderItem={({ item, index }) => (
          <View style={{ width: contentWidth, alignSelf: 'center', marginBottom: vscale(10) }}>
            <PrepareStayReadyCard
              item={item}
              index={index}
              scale={scale}
              ms={ms}
              spacing={spacing}
              vscale={vscale}
              colors={{
                cardBg: colors.cardBg,
                cardBorder: colors.cardBorder,
                title: colors.title,
                desc: colors.desc,
                chevron: colors.chevron,
                shadowOpacity: colors.shadowOpacity,
                iconImageBg: colors.iconImageBg,
              }}
              onPress={() => openDetail(item)}
            />
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={{ paddingVertical: vscale(40), alignItems: 'center', width: contentWidth, alignSelf: 'center' }}>
              <Icon name="playlist-remove" size={scale(40)} color={colors.empty} />
              <Text style={{ marginTop: vscale(12), fontSize: ms(15), color: colors.empty, textAlign: 'center' }}>
                No topics available yet.
              </Text>
            </View>
          ) : (
            <ActivityIndicator style={{ marginTop: vscale(24) }} color="#DC5C69" />
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {},
  pageTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  pageSubtitle: {
    textAlign: 'center',
  },
  errorBanner: {
    textAlign: 'center',
  },
  learnTitle: {
    fontWeight: '600',
    textAlign: 'center',
  },
  divider: {},
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  chipText: {},
  footerText: {
    textAlign: 'center',
  },
  shimmerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default PrepareStayReadyScreen;
