import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Button from '../../../../components/common/Button';
import Header from '../../../../components/common/Header';
import { useResponsive } from '../../../../utils/responsive';
import { sociusRefreshProps, useStaticPullRefresh } from '../../../../utils/sociusRefreshControl';

const AwarenessProgressScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const { refreshing, onRefresh } = useStaticPullRefresh();
  const handleBackHome = () =>
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
    });

  const steps = [
    'Request shared with nearby available people',
    'No public feeds or visibility',
    'People may choose to be nearby',
    'You can cancel anytime',
  ];

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
        contentContainerStyle={[styles.scroll, { alignItems: 'center' }]} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...sociusRefreshProps} />}
      >
        <View style={{ width: contentWidth }}>
          <View style={[styles.progressHero, { marginBottom: vscale(16) }]}>
            <View style={[styles.stepBadge, { 
              width: scale(60), 
              height: scale(60), 
              borderRadius: scale(30),
              marginBottom: vscale(8),
              shadowRadius: scale(10),
              elevation: scale(6)
            }]}>
              <Icon name="radar" size={scale(28)} color="#DC5C69" />
            </View>
            <Text style={[styles.title, { fontSize: ms(22), marginBottom: vscale(6) }]}>Awareness Progress</Text>
            <Text style={[styles.subtitle, { fontSize: ms(14), marginBottom: vscale(12) }]}>Understanding how your request is visible locally.</Text>
          </View>

          <View style={[styles.stepCard, { 
            borderRadius: scale(18),
            borderWidth: scale(1),
            paddingHorizontal: spacing(18),
            paddingVertical: vscale(16),
            marginBottom: vscale(16),
            shadowOffset: { width: 0, height: vscale(2) },
            shadowRadius: scale(6),
            elevation: scale(2)
          }]}>
            {steps.map((t, i) => (
              <View key={i} style={[styles.stepRow, { gap: spacing(8), marginBottom: vscale(8) }]}>
                <Icon name="check-circle" size={scale(18)} color="#5A6F7D" />
                <Text style={[styles.stepText, { fontSize: ms(14), lineHeight: ms(20) }]}>{t}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.infoBox, { 
            gap: spacing(10), 
            borderRadius: scale(16),
            borderWidth: scale(1),
            paddingHorizontal: spacing(16),
            paddingVertical: vscale(14),
            marginBottom: vscale(20)
          }]}>
            <Icon name="information" size={scale(20)} color="#999999" />
            <Text style={[styles.infoText, { fontSize: ms(14), lineHeight: ms(22) }]}>
              Socius uses location only during active requests. Nothing is stored publicly.
            </Text>
          </View>

          <Button title="Back to Home" onPress={handleBackHome} fullWidth />
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
  },
  progressHero: {
    alignItems: 'center',
  },
  stepBadge: {
    backgroundColor: '#FFF0F2',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC5C69',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
  },
  title: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },
  subtitle: {
    color: '#666666',
    textAlign: 'center',
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepText: {
    flex: 1,
    color: '#2C3E50',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9F9F9',
    borderColor: '#E8EAED',
  },
  infoText: {
    flex: 1,
    color: '#2C3E50',
  },
});

export default AwarenessProgressScreen;
