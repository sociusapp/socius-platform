import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../../components/common/Header';
import Button from '../../../components/common/Button';
import MotionView from '../../../components/common/MotionView';
import { useResponsive } from '../../../utils/responsive';

const CommunityBalanceNudgeScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const { initialRequest } = route?.params || {};

  const handleContinueRequest = () => {
    if (initialRequest?._id || initialRequest?.id) {
      navigation.replace('RequestActive', { initialRequest });
      return;
    }
    navigation.reset({ index: 0, routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }] });
  };

  const handleSetWaysToHelp = () => {
    navigation.navigate('AvailabilityRoles');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={{ padding: scale(8) }}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <Icon name="cog" size={scale(24)} color="#999999" />
          </TouchableOpacity>
        }
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { alignItems: 'center', paddingHorizontal: spacing(20), paddingTop: vscale(24), paddingBottom: vscale(40) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth }}>
          <MotionView preset="fadeUp" duration={220}>
            <View style={[styles.card, { borderRadius: scale(18), borderWidth: scale(1), paddingHorizontal: spacing(18), paddingVertical: vscale(18), marginBottom: vscale(18), shadowOffset: { width: 0, height: vscale(2) }, shadowRadius: scale(6), elevation: scale(2) }]}>
              <View style={[styles.iconWrap, { width: scale(52), height: scale(52), borderRadius: scale(26), marginBottom: vscale(12) }]}>
                <Icon name="hand-heart" size={scale(28)} color="#DC5C69" />
              </View>
              <Text style={[styles.title, { fontSize: ms(18), marginBottom: vscale(8) }]}>Thanks for asking for support.</Text>
              <Text style={[styles.body, { fontSize: ms(14), lineHeight: ms(20) }]}>
                You have asked for help a few times recently. Many people here also offer help when they are able.
              </Text>
            </View>
          </MotionView>

          <MotionView preset="fadeUp" duration={220} delay={40}>
            <View style={{ marginBottom: vscale(20) }}>
              <Text style={[styles.subheading, { fontSize: ms(14), marginBottom: vscale(8) }]}>Would you like to set how you can help others?</Text>
              <Text style={[styles.body, { fontSize: ms(13), lineHeight: ms(20) }]}>
                You are never required to help. Choosing what you are open to simply lets Socius know when to ask you.
              </Text>
            </View>
          </MotionView>

          <MotionView preset="fadeUp" duration={220} delay={80}>
            <Button
              title="Set Ways to Help"
              onPress={handleSetWaysToHelp}
              variant="gradient"
              size="large"
              fullWidth
              icon={<Icon name="hand-heart" size={scale(18)} color="#FFFFFF" />}
              accessibilityLabel="Set ways you can help others"
            />
          </MotionView>
          <MotionView preset="fadeUp" duration={220} delay={110}>
            <Button
              title="Continue without setting now"
              onPress={handleContinueRequest}
              variant="white"
              size="large"
              fullWidth
              icon={<Icon name="arrow-right" size={scale(18)} color="#2C3E50" />}
              accessibilityLabel="Continue to your active request"
            />
          </MotionView>

          <View style={[styles.footerNote, { marginTop: vscale(10) }]}>
            <Text style={[styles.footerText, { fontSize: ms(12) }]}>There is no penalty for only asking for help.</Text>
            <Text style={[styles.footerText, { fontSize: ms(12) }]}>These settings are just for your comfort and availability.</Text>
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
  },
  card: {
    backgroundColor: '#FFF5F4',
    borderColor: '#F4C2C2',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },
  iconWrap: {
    backgroundColor: '#FCE3E3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },
  body: {
    color: '#495057',
    textAlign: 'center',
  },
  subheading: {
    fontWeight: '600',
    color: '#2C3E50',
  },
  footerNote: {
    alignItems: 'center',
  },
  footerText: {
    color: '#868E96',
    textAlign: 'center',
  },
});

export default CommunityBalanceNudgeScreen;
