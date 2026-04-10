import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../components/common/Header';
import { useResponsive } from '../../utils/responsive';
import { fetchPrepareCardById } from '../../services/api/prepareCards.api';
import { api } from '../../services/api/client';

const buildAssetUrl = (value) => {
  const src = String(value || '').trim();
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  if (!src.startsWith('/')) return null;
  const base = String(api?.defaults?.baseURL || '').replace(/\/api\/?$/, '');
  return `${base}${src}`;
};

const resolveHero = (icon) => {
  const s = String(icon || '').trim();
  if (!s) return { kind: 'icon', name: 'file-document-outline' };
  const asset = buildAssetUrl(s);
  if (asset && /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(s)) {
    return { kind: 'image', uri: asset };
  }
  if (/^https?:\/\//i.test(s) && /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(s)) {
    return { kind: 'image', uri: s };
  }
  return { kind: 'icon', name: s };
};

const PrepareCardDetailScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const initial = route?.params?.card || null;
  const paramId = route?.params?.id;

  const colors = useMemo(
    () => ({
      screen: '#FFFFFF',
      title: '#2C3E50',
      body: '#475569',
      muted: '#64748B',
    }),
    []
  );

  const [card, setCard] = useState(initial);
  const [loading, setLoading] = useState(() => !initial);
  const [error, setError] = useState(null);

  const id = initial?.id ?? paramId;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (id == null) {
        setLoading(false);
        setError('Missing card id');
        return;
      }
      setError(null);
      setLoading(true);
      try {
        const data = await fetchPrepareCardById(id);
        if (!cancelled) setCard(data);
      } catch (e) {
        if (!cancelled) {
          setError(e?.response?.data?.message || e?.message || 'Could not load this topic.');
          if (initial) setCard(initial);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, initial]);

  const hero = useMemo(() => resolveHero(card?.image_url || card?.icon), [card?.image_url, card?.icon]);

  const iconEl = useMemo(() => {
    if (hero.kind === 'image') {
      return <Image source={{ uri: hero.uri }} style={styles.heroIcon} resizeMode="contain" />;
    }
    return (
      <Icon
        name={hero.name}
        size={scale(48)}
        color="#C94D4D"
      />
    );
  }, [hero, scale]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screen }]}>
      <Header title="" onBackPress={() => navigation.goBack()} style={{ borderBottomWidth: 0 }} />

      {loading && !card?.title ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#DC5C69" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing(20),
            paddingBottom: vscale(32),
            width: contentWidth,
            alignSelf: 'center',
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.hero, { marginBottom: vscale(16) }]}>{iconEl}</View>
          <Text style={[styles.title, { fontSize: ms(22), marginBottom: vscale(8), color: colors.title }]}>
            {card?.title || 'Prepare'}
          </Text>
          <Text style={[styles.sub, { fontSize: ms(14), marginBottom: vscale(16), color: colors.muted }]}>
            {card?.description || ''}
          </Text>
          {error ? (
            <Text style={[styles.err, { fontSize: ms(13), marginBottom: vscale(12), color: '#F87171' }]}>{error}</Text>
          ) : null}
          {card?.content ? (
            <Text style={[styles.body, { fontSize: ms(15), lineHeight: ms(24), color: colors.body }]}>{card.content}</Text>
          ) : !error ? (
            <Text style={[styles.body, { fontSize: ms(15), lineHeight: ms(24), color: colors.body }]}>
              More guidance for this topic will appear here when available.
            </Text>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { alignItems: 'center' },
  heroIcon: { width: 96, height: 96 },
  title: { fontWeight: '700', textAlign: 'center' },
  sub: { textAlign: 'center' },
  body: { textAlign: 'left' },
  err: { textAlign: 'center' },
});

export default PrepareCardDetailScreen;
