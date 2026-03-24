import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../../components/common/Header';
import Button from '../../../components/common/Button';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useResponsive } from '../../../utils/responsive';
import MotionView from '../../../components/common/MotionView';

const RequestClosedScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Header 
        title="Request Closed" 
        onBackPress={() => navigation.goBack()}
        style={[styles.header, { paddingHorizontal: spacing(16) }]}
        titleStyle={[styles.headerTitle, { fontSize: ms(16) }]}
      />
      
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing(20), paddingBottom: vscale(30) }]} showsVerticalScrollIndicator={false}>
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          <MotionView preset="fadeUp" delay={100} style={[styles.illustrationContainer, { height: vscale(180), marginBottom: vscale(10) }]}>
            <Image 
              source={require('../../../assets/images/awareness/05.png')}
              style={styles.illustrationImage}
              resizeMode="contain"
            />
          </MotionView>

          <MotionView preset="fadeUp" delay={200} style={[styles.statusCard, { padding: spacing(20), borderRadius: scale(16), marginBottom: vscale(16), borderWidth: scale(1) }]}>
            <Text style={[styles.statusTitle, { fontSize: ms(16), marginBottom: vscale(8) }]}>This awareness request has ended.</Text>
            <Text style={[styles.statusSubtitle, { fontSize: ms(14) }]}>No further action is expected.</Text>
          </MotionView>

          <MotionView preset="fadeUp" delay={300} style={[styles.infoCard, { padding: spacing(16), borderRadius: scale(16), marginBottom: vscale(16), borderWidth: scale(1) }]}>
            <Text style={[styles.cardHeader, { fontSize: ms(16), marginBottom: vscale(12) }]}>How closures happen</Text>
            <View style={[styles.divider, { height: scale(1), marginBottom: vscale(12) }]} />
            
            <View style={[styles.listItem, { marginBottom: vscale(12), gap: spacing(12) }]}>
              <View style={[styles.iconBox, { width: scale(20) }]}>
                <Icon name="check" size={scale(16)} color="#7F8C8D" />
              </View>
              <Text style={[styles.listItemText, { fontSize: ms(14), lineHeight: vscale(20) }]}>The requester closed the request.</Text>
            </View>
            
            <View style={[styles.listItem, { marginBottom: vscale(12), gap: spacing(12) }]}>
              <View style={[styles.iconBox, { width: scale(20) }]}>
                <Icon name="clock-outline" size={scale(16)} color="#7F8C8D" />
              </View>
              <Text style={[styles.listItemText, { fontSize: ms(14), lineHeight: vscale(20) }]}>A time limit was reached.</Text>
            </View>
            
            <View style={[styles.listItem, { marginBottom: vscale(12), gap: spacing(12) }]}>
              <View style={[styles.iconBox, { width: scale(20) }]}>
                <Icon name="wifi-off" size={scale(16)} color="#7F8C8D" />
              </View>
              <Text style={[styles.listItemText, { fontSize: ms(14), lineHeight: vscale(20) }]}>The requester went offline.</Text>
            </View>
          </MotionView>

          <MotionView preset="fadeUp" delay={400} style={[styles.infoCard, { padding: spacing(16), borderRadius: scale(16), marginBottom: vscale(16), borderWidth: scale(1) }]}>
            <Text style={[styles.cardHeader, { fontSize: ms(16), marginBottom: vscale(12) }]}>What to do now</Text>
            <View style={[styles.divider, { height: scale(1), marginBottom: vscale(12) }]} />
            
            <View style={[styles.listItem, { marginBottom: vscale(12), gap: spacing(12) }]}>
              <View style={[styles.iconBox, { width: scale(20) }]}>
                <Icon name="home-variant-outline" size={scale(16)} color="#7F8C8D" />
              </View>
              <Text style={[styles.listItemText, { fontSize: ms(14), lineHeight: vscale(20) }]}>Resume your day.</Text>
            </View>
            
            <View style={[styles.listItem, { marginBottom: vscale(12), gap: spacing(12) }]}>
              <View style={[styles.iconBox, { width: scale(20) }]}>
                <Icon name="check" size={scale(16)} color="#7F8C8D" />
              </View>
              <Text style={[styles.listItemText, { fontSize: ms(14), lineHeight: vscale(20) }]}>No follow-up is required.</Text>
            </View>
            
            <View style={[styles.listItem, { marginBottom: vscale(12), gap: spacing(12) }]}>
              <View style={[styles.iconBox, { width: scale(20) }]}>
                <Icon name="phone-outline" size={scale(16)} color="#7F8C8D" />
              </View>
              <Text style={[styles.listItemText, { fontSize: ms(14), lineHeight: vscale(20) }]}>Use emergency contacts if you still have concerns.</Text>
            </View>
          </MotionView>

          <MotionView preset="fadeUp" delay={500}>
            <Text style={[styles.closureNote, { fontSize: ms(14), marginBottom: vscale(24) }]}>
              Closure does not mean something went wrong.
            </Text>
          </MotionView>

          <MotionView preset="fadeUp" delay={600} style={[styles.actionContainer, { marginBottom: vscale(24) }]}>
            <Button 
              title="Return Home" 
              onPress={() =>
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
                })
              } 
              variant="primary"
              fullWidth
              style={[styles.returnButton, { borderRadius: scale(30) }]}
            />
          </MotionView>

          <MotionView preset="fadeUp" delay={700}>
            <Text style={[styles.footerNote, { fontSize: ms(12), paddingHorizontal: spacing(20) }]}>
              Socius closes requests to prevent confusion or pressure.
            </Text>
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
    borderBottomWidth: 0,
  },
  headerTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  illustrationContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationImage: {
    width: '100%',
    height: '100%',
  },
  statusCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderColor: '#F0F0F0',
  },
  statusTitle: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },
  statusSubtitle: {
    color: '#5D6D7E',
    textAlign: 'center',
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderColor: '#F0F0F0',
  },
  cardHeader: {
    fontWeight: '600',
    color: '#2C3E50',
  },
  divider: {
    backgroundColor: '#F0F0F0',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  listItemText: {
    color: '#5D6D7E',
    flex: 1,
  },
  closureNote: {
    color: '#7F8C8D',
    textAlign: 'center',
  },
  actionContainer: {
    width: '100%',
  },
  returnButton: {
  },
  footerNote: {
    color: '#BDC3C7',
    textAlign: 'center',
  },
});

export default RequestClosedScreen;
