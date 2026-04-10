import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../components/common/Header';
import { useResponsive } from '../../utils/responsive';

const splitParagraphs = (raw) => {
  const s = String(raw || '').trim();
  if (!s) return [];
  return s
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
};

const FallbackBody = ({ style }) => (
  <Text style={style}>No article text yet. Pull to refresh on Prepare, or check back later.</Text>
);

const PrepareLearnArticleScreen = ({ navigation, route }) => {
  const title = String(route?.params?.title || '').trim() || 'Learn more';
  const content = route?.params?.content != null ? String(route.params.content) : '';
  const { contentWidth, ms, spacing, vscale } = useResponsive();
  const colors = useMemo(
    () => ({
      screen: '#FFFFFF',
      border: '#E8EAED',
      title: '#1A1C1E',
      body: '#42474E',
    }),
    []
  );

  const paragraphs = useMemo(() => splitParagraphs(content), [content]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screen }]}>
      <Header
        title={title.length > 28 ? `${title.slice(0, 26)}…` : title}
        onBackPress={() => navigation.goBack()}
        style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: spacing(20),
            paddingTop: vscale(20),
            paddingBottom: vscale(40),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          <Text
            style={[
              styles.title,
              { fontSize: ms(22), marginBottom: vscale(16), color: colors.title },
            ]}
          >
            {title}
          </Text>
          {!paragraphs.length ? (
            <FallbackBody style={[styles.body, { fontSize: ms(16), lineHeight: Math.round(ms(24)), color: colors.body }]} />
          ) : (
            paragraphs.map((p, i) => (
              <Text
                key={`p-${i}`}
                style={[
                  styles.body,
                  {
                    fontSize: ms(16),
                    lineHeight: Math.round(ms(24)),
                    color: colors.body,
                    marginBottom: i < paragraphs.length - 1 ? vscale(14) : 0,
                  },
                ]}
              >
                {p}
              </Text>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  title: {
    fontWeight: '700',
    textAlign: 'left',
  },
  body: {
    textAlign: 'left',
  },
});

export default PrepareLearnArticleScreen;
