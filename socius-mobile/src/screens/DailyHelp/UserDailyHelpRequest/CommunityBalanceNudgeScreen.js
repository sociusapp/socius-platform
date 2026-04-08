import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../../components/common/Header';
import Button from '../../../components/common/Button';
import MotionView from '../../../components/common/MotionView';
import { useResponsive } from '../../../utils/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: spacing(20), paddingTop: vscale(20), paddingBottom: vscale(40) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth }}>
          {/* Main Title */}
          <MotionView preset="fadeUp" duration={220}>
            <View style={[styles.titleContainer, { marginBottom: vscale(24) }]}>
              <Text style={[styles.mainTitle, { fontSize: ms(22), marginBottom: vscale(8) }]}>
                Keep the Balance
              </Text>
              <Text style={[styles.subtitle, { fontSize: ms(14), lineHeight: ms(20) }]}>
                Socius works best when we all help each other
              </Text>
            </View>
          </MotionView>

          {/* Visual Balance Card */}
          <MotionView preset="fadeUp" duration={220} delay={40}>
            <View style={[styles.balanceCard, { borderRadius: scale(20), padding: spacing(20), marginBottom: vscale(24) }]}>
              {/* Balance Visual */}
              <View style={styles.balanceVisual}>
                {/* Left side - Receiving */}
                <View style={[styles.balanceSide, { backgroundColor: '#FFE4E1' }]}>
                  <Icon name="hand-heart" size={scale(32)} color="#DC5C69" />
                  <Text style={[styles.balanceNumber, { fontSize: ms(20), color: '#DC5C69' }]}>3+</Text>
                  <Text style={[styles.balanceLabel, { fontSize: ms(11) }]}>Help Received</Text>
                </View>

                {/* Balance Center */}
                <View style={styles.balanceCenter}>
                  <View style={styles.balanceLine} />
                  <View style={[styles.balancePivot, { width: scale(8), height: scale(8), borderRadius: scale(4) }]} />
                </View>

                {/* Right side - Giving (empty/low) */}
                <View style={[styles.balanceSide, { backgroundColor: '#F5F5F5' }]}>
                  <Icon name="hand-heart-outline" size={scale(32)} color="#999" />
                  <Text style={[styles.balanceNumber, { fontSize: ms(20), color: '#999' }]}>0</Text>
                  <Text style={[styles.balanceLabel, { fontSize: ms(11) }]}>Help Given</Text>
                </View>
              </View>

              {/* Balance Status */}
              <View style={[styles.balanceStatus, { marginTop: vscale(16), paddingVertical: vscale(8), paddingHorizontal: spacing(12), borderRadius: scale(20) }]}>
                <Icon name="alert-circle" size={scale(14)} color="#DC5C69" />
                <Text style={[styles.balanceStatusText, { fontSize: ms(12), marginLeft: spacing(6) }]}>
                  Balance is tilted
                </Text>
              </View>
            </View>
          </MotionView>

          {/* Simple Explanation */}
          <MotionView preset="fadeUp" duration={220} delay={80}>
            <View style={[styles.infoSection, { marginBottom: vscale(24) }]}>
              <View style={[styles.infoRow, { marginBottom: vscale(12) }]}>
                <View style={[styles.infoIcon, { width: scale(36), height: scale(36), borderRadius: scale(18) }]}>
                  <Icon name="information" size={scale(18)} color="#DC5C69" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={[styles.infoTitle, { fontSize: ms(14) }]}>Why am I seeing this?</Text>
                  <Text style={[styles.infoText, { fontSize: ms(13), lineHeight: ms(18) }]}>
                    You've received help 3 times but haven't set up how you can help others yet.
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { width: scale(36), height: scale(36), borderRadius: scale(18) }]}>
                  <Icon name="heart-circle" size={scale(18)} color="#4CAF50" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={[styles.infoTitle, { fontSize: ms(14) }]}>What happens next?</Text>
                  <Text style={[styles.infoText, { fontSize: ms(13), lineHeight: ms(18) }]}>
                    Choose what help you can offer. You'll only be asked when you're available.
                  </Text>
                </View>
              </View>
            </View>
          </MotionView>

          {/* Action Buttons */}
          <MotionView preset="fadeUp" duration={220} delay={120}>
            <Button
              title="Yes, I'll Help Others"
              onPress={handleSetWaysToHelp}
              variant="gradient"
              size="large"
              fullWidth
              icon={<Icon name="hand-heart" size={scale(20)} color="#FFFFFF" />}
              style={{ marginBottom: vscale(12) }}
            />
          </MotionView>

          <MotionView preset="fadeUp" duration={220} delay={150}>
            <TouchableOpacity
              onPress={handleContinueRequest}
              style={[styles.skipButton, { paddingVertical: vscale(14) }]}
            >
              <Text style={[styles.skipButtonText, { fontSize: ms(14) }]}>
                Maybe later, continue to my request
              </Text>
            </TouchableOpacity>
          </MotionView>

          {/* Reassurance Footer */}
          <MotionView preset="fadeUp" duration={220} delay={180}>
            <View style={[styles.footer, { marginTop: vscale(20), paddingTop: vscale(16) }]}>
              <View style={styles.footerItem}>
                <Icon name="check-circle" size={scale(14)} color="#4CAF50" />
                <Text style={[styles.footerText, { fontSize: ms(12), marginLeft: spacing(6) }]}>
                  100% optional - no penalty
                </Text>
              </View>
              <View style={styles.footerItem}>
                <Icon name="check-circle" size={scale(14)} color="#4CAF50" />
                <Text style={[styles.footerText, { fontSize: ms(12), marginLeft: spacing(6) }]}>
                  You control when you're available
                </Text>
              </View>
              <View style={styles.footerItem}>
                <Icon name="check-circle" size={scale(14)} color="#4CAF50" />
                <Text style={[styles.footerText, { fontSize: ms(12), marginLeft: spacing(6) }]}>
                  You choose what help to offer
                </Text>
              </View>
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
  scroll: {
    flexGrow: 1,
  },
  titleContainer: {
    alignItems: 'center',
  },
  mainTitle: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
  },
  balanceCard: {
    backgroundColor: '#FFF5F4',
    borderWidth: 1,
    borderColor: '#F4C2C2',
    alignItems: 'center',
  },
  balanceVisual: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  balanceSide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  balanceNumber: {
    fontWeight: '700',
    marginTop: 4,
  },
  balanceLabel: {
    color: '#666',
    marginTop: 2,
  },
  balanceCenter: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLine: {
    width: 2,
    height: 60,
    backgroundColor: '#999',
  },
  balancePivot: {
    backgroundColor: '#999',
    marginTop: -4,
  },
  balanceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE4E1',
  },
  balanceStatusText: {
    color: '#DC5C69',
    fontWeight: '600',
  },
  infoSection: {},
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    backgroundColor: '#FFF5F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  infoText: {
    color: '#666',
  },
  skipButton: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
  },
  skipButtonText: {
    color: '#666',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E8EAED',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  footerText: {
    color: '#666',
  },
});

export default CommunityBalanceNudgeScreen;
