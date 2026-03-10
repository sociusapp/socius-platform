import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Button from '../../../components/common/Button';
import Header from '../../../components/common/Header';
import CustomAlert from '../../../components/common/CustomAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { useResponsive } from '../../../utils/responsive';
import { closeHelpRequest } from '../../../services/api/incident.api';
import { loadAuth } from '../../../services/storage/asyncStorage.service';

const ClosingRequestScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const [resolved, setResolved] = useState(null);
  const [accountReturned, setAccountReturned] = useState(false);
  const [needMoreTime, setNeedMoreTime] = useState(false);
  const [reaction, setReaction] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const requestId = route?.params?.requestId;

  // Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: 'alert-circle-outline',
    iconColor: '#DC5C69'
  });

  const showAlert = (title, message, buttons = [], icon = 'alert-circle-outline', iconColor = '#DC5C69') => {
    setAlertConfig({
      title,
      message,
      buttons,
      icon,
      iconColor
    });
    setAlertVisible(true);
  };

  const closeAlert = () => {
    setAlertVisible(false);
  };

  const handleDone = async () => {
    if (submitting) {
      return;
    }

    if (!requestId) {
      showAlert('Request not found', 'Unable to identify the request to close.', [{ text: 'OK', onPress: closeAlert, type: 'destructive' }]);
      return;
    }

    setSubmitting(true);

    try {
      const auth = await loadAuth();
      const token = auth?.accessToken;

      if (!token) {
        showAlert('Not signed in', 'Please sign in again to close this request.', [{ text: 'OK', onPress: closeAlert, type: 'primary' }]);
        return;
      }

      const payload = {
        wasResolved: resolved === true,
        accountability: accountReturned ? 'completed_as_agreed' : needMoreTime ? 'needed_more_time' : null,
        rating: reaction === 'good' ? 5 : reaction === 'neutral' ? 3 : reaction === 'alert' ? 1 : null,
      };

      const response = await closeHelpRequest(token, requestId, payload);

      if (response?.success) {
        if (resolved === false && !accountReturned && !needMoreTime) {
          navigation.navigate('CommunityBalanceNudge');
          return;
        }

        navigation.reset({
          index: 0,
          routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
        });
        return;
      }

      showAlert(
        'Unable to close',
        response?.message || 'Something went wrong while closing the request.',
        [{ text: 'OK', onPress: closeAlert, type: 'destructive' }]
      );
    } catch (error) {
      const status = error?.response?.status;
      const messageFromServer =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.[0]?.message;

      showAlert(
        status ? `Error (${status})` : 'Error',
        messageFromServer || 'Something went wrong while closing the request.',
        [{ text: 'OK', onPress: closeAlert, type: 'destructive' }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportConcern = () => {
    navigation.navigate('ReportConcern');
  };


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
      >
        <View style={{ width: contentWidth }}>
          <Text style={[styles.pageTitle, { fontSize: ms(16), marginBottom: vscale(12) }]}>Closing This Request</Text>

          <View style={[styles.statusCard, {
            borderRadius: scale(18),
            borderWidth: scale(1),
            paddingHorizontal: spacing(18),
            paddingVertical: vscale(16),
            marginBottom: vscale(14),
            shadowOffset: { width: 0, height: vscale(2) },
            shadowRadius: scale(6),
            elevation: scale(2)
          }]}>
            <View style={[styles.statusTop, { marginBottom: vscale(10) }]}>
              <LinearGradient
                colors={['#EEF2F6', '#E5EAEE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.statusCircleLg, { width: scale(72), height: scale(72), borderRadius: scale(36) }]}
              />
            </View>
            <Text style={[styles.statusTitle, { fontSize: ms(16), marginBottom: vscale(6) }]}>This request is being closed.</Text>
            <Text style={[styles.statusSubtitle, { fontSize: ms(14) }]}>Thanks for keeping things calm and respectful.</Text>
          </View>

          <View style={[styles.section, { marginBottom: vscale(14) }]}>
            <Text style={[styles.sectionHeading, { fontSize: ms(14), marginBottom: vscale(10) }]}>Was this resolved?</Text>
            <View style={[styles.rowButtons, { gap: spacing(10) }]}>
              <Button
                title="Yes, it’s resolved"
                onPress={() => setResolved(true)}
                variant="gradient"
                size="large"
                fullWidth={false}
                style={[styles.halfButton, resolved === true && {}]}
              />
              <Button
                title="No, I’m stepping away"
                onPress={() => setResolved(false)}
                variant="white"
                size="large"
                fullWidth={false}
                style={styles.halfButton}
              />
            </View>
          </View>

          <View style={[styles.section, { marginBottom: vscale(14) }]}>
            <Text style={[styles.sectionHeading, { fontSize: ms(14), marginBottom: vscale(10) }]}>Accountability</Text>
            <TouchableOpacity
              style={[styles.checkboxRow, { marginBottom: vscale(8) }]}
              onPress={() => setAccountReturned(!accountReturned)}
              activeOpacity={0.85}
            >
              <View style={[styles.checkbox, {
                width: scale(22),
                height: scale(22),
                borderRadius: scale(6),
                borderWidth: scale(1),
                marginRight: spacing(10)
              }, accountReturned && styles.checkboxChecked]}>
                {accountReturned && <Icon name="check" size={scale(16)} color="#FFFFFF" />}
              </View>
              <Text style={[styles.checkboxText, { fontSize: ms(14) }]}>Returned / completed as agreed</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.checkboxRow, { marginBottom: vscale(8) }]}
              onPress={() => setNeedMoreTime(!needMoreTime)}
              activeOpacity={0.85}
            >
              <View style={[styles.checkbox, {
                width: scale(22),
                height: scale(22),
                borderRadius: scale(6),
                borderWidth: scale(1),
                marginRight: spacing(10)
              }, needMoreTime && styles.checkboxChecked]}>
                {needMoreTime && <Icon name="check" size={scale(16)} color="#FFFFFF" />}
              </View>
              <Text style={[styles.checkboxText, { fontSize: ms(14) }]}>Needed more time</Text>
            </TouchableOpacity>
            <Text style={[styles.helperText, { fontSize: ms(12), marginTop: vscale(6) }]}>This helps build trust for future requests.</Text>
          </View>

          <View style={[styles.section, { marginBottom: vscale(14) }]}>
            <Text style={[styles.sectionHeading, { fontSize: ms(14), marginBottom: vscale(10) }]}>How did this go?</Text>
            <View style={[styles.reactionPill, {
              borderRadius: scale(28),
              borderWidth: scale(1),
              paddingHorizontal: spacing(16),
              paddingVertical: vscale(8),
              marginBottom: vscale(8),
              shadowOffset: { width: 0, height: vscale(2) },
              shadowRadius: scale(6),
              elevation: scale(2)
            }]}>
              <TouchableOpacity
                style={[styles.reactionItem, { width: scale(44), height: scale(44), borderRadius: scale(22) }, reaction === 'good' && styles.reactionSelected]}
                onPress={() => setReaction('good')}
                activeOpacity={0.85}
              >
                <Icon name="thumb-up" size={scale(22)} color={reaction === 'good' ? '#DC5C69' : '#5A6F7D'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reactionItem, { width: scale(44), height: scale(44), borderRadius: scale(22) }, reaction === 'neutral' && styles.reactionSelected]}
                onPress={() => setReaction('neutral')}
                activeOpacity={0.85}
              >
                <Icon name="emoticon-outline" size={scale(22)} color={reaction === 'neutral' ? '#DC5C69' : '#5A6F7D'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reactionItem, { width: scale(44), height: scale(44), borderRadius: scale(22) }, reaction === 'alert' && styles.reactionSelected]}
                onPress={() => setReaction('alert')}
                activeOpacity={0.85}
              >
                <Icon name="alert-circle-outline" size={scale(22)} color={reaction === 'alert' ? '#DC5C69' : '#5A6F7D'} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.linkRow, { gap: spacing(4) }]} onPress={handleReportConcern} activeOpacity={0.85}>
              <Text style={[styles.linkText, { fontSize: ms(14) }]}>Report a Concern</Text>
              <Icon name="chevron-right" size={scale(20)} color="#DC5C69" />
            </TouchableOpacity>
          </View>

          <View style={[styles.noticeCard, {
            borderRadius: scale(18),
            borderWidth: scale(1),
            paddingHorizontal: spacing(18),
            paddingVertical: vscale(12),
            marginBottom: vscale(16),
            shadowOffset: { width: 0, height: vscale(2) },
            shadowRadius: scale(6),
            elevation: scale(2)
          }]}>
            <View style={[styles.noticeIcon, {
              width: scale(28),
              height: scale(28),
              borderRadius: scale(14),
              marginRight: spacing(10)
            }]}>
              <Text style={[styles.noticeIndex, { fontSize: ms(14) }]}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.noticeText, { fontSize: ms(14), lineHeight: ms(20) }]}>
                Details from this request will no longer be visible. Location sharing ends now.
              </Text>
            </View>
          </View>

          <Button
            title="Done"
            onPress={handleDone}
            variant="gradient"
            size="large"
            fullWidth
            loading={submitting}
            disabled={submitting}
          />
          <View style={[styles.footerNote, { marginTop: vscale(8) }]}>
            <Text style={[styles.footerNoteText, { fontSize: ms(12) }]}>
              Participation is voluntary. Thank you for being part of your community.
            </Text>
          </View>
          <View style={{ height: vscale(20) }} />
        </View>
      </ScrollView>
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
        onClose={closeAlert}
      />
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
  pageTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EAED',
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
  },
  statusTop: {
    alignItems: 'center',
    marginBottom: 10,
  },
  statusCircleLg: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 6,
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  rowButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfButton: {
    flex: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#DC5C69',
    borderColor: '#DC5C69',
  },
  checkboxText: {
    fontSize: 14,
    color: '#111827',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },
  reactionItem: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    backgroundColor: '#F9FAFB',
  },
  reactionSelected: {
    backgroundColor: '#FFF1F2',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  linkText: {
    color: '#DC5C69',
    fontWeight: '500',
  },
  noticeCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },
  noticeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeIndex: {
    fontWeight: '600',
    color: '#4B5563',
  },
  noticeText: {
    color: '#111827',
  },
  footerNote: {
    alignItems: 'center',
  },
  footerNoteText: {
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default ClosingRequestScreen;
