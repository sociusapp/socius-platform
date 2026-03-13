import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Button from '../../../components/common/Button';
import Header from '../../../components/common/Header';
import CustomAlert from '../../../components/common/CustomAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { useResponsive } from '../../../utils/responsive';
import { submitClosure } from '../../../services/api/incident.api';
import { loadAuth } from '../../../services/storage/asyncStorage.service';

const ClosingRequestScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const [starRating, setStarRating] = useState(0);
  const [providedHelp, setProvidedHelp] = useState(null);
  const [cancelledAfterAccept, setCancelledAfterAccept] = useState(false);
  const [noReplyAfterAccept, setNoReplyAfterAccept] = useState(false);
  const [itemIssue, setItemIssue] = useState(false);
  const [itemIssueDescription, setItemIssueDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const requestId = route?.params?.requestId;

  useEffect(() => {
    if (providedHelp === true) {
      if (!starRating || starRating < 1) setStarRating(5);
      setCancelledAfterAccept(false);
      setNoReplyAfterAccept(false);
      setItemIssue(false);
      setItemIssueDescription('');
    }
    if (providedHelp === false) {
      setStarRating(0);
    }
  }, [providedHelp]);

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

    if (providedHelp !== true && providedHelp !== false) {
      showAlert('Select an option', 'Please tell us whether help was provided.', [{ text: 'OK', onPress: closeAlert }]);
      return;
    }

    if (providedHelp === true) {
      if (!starRating || starRating < 1) {
        showAlert('Rating required', 'Please rate your experience to continue.', [{ text: 'OK', onPress: closeAlert }]);
        return;
      }
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
        requestId,
        rating: providedHelp === true ? starRating : null,
        feedback: {
          providedHelp: providedHelp === true,
          cancelledAfterAccept,
          noReplyAfterAccept,
          itemIssue,
          itemIssueDescription: itemIssue && itemIssueDescription.trim().length > 0 ? itemIssueDescription.trim() : null,
          evidencePhotos: [],
        }
      };

      const response = await submitClosure(token, payload);

      if (response?.success) {
        showAlert(
          'Submitted',
          'Thanks. We’ll ask the other person to also rate and confirm closure. You can return home now.',
          [
            {
              text: 'OK',
              style: 'primary',
              onPress: () => {
                closeAlert();
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
                });
              },
            },
          ],
          'check-circle-outline',
          '#28C76F'
        );
        return;
      }

      showAlert(
        'Unable to close',
        response?.message || 'Something went wrong while submitting closure.',
        [{ text: 'OK', onPress: closeAlert, type: 'destructive' }]
      );
    } catch (error) {
      const status = error?.response?.status;
      const messageFromServer =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.[0]?.message;

      showAlert(
        status ? `Error (${status})` : 'Error',
        messageFromServer || 'Something went wrong while submitting closure.',
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
        contentContainerStyle={[styles.scroll, { alignItems: 'center' }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: vscale(12) }}>
            <Icon name="check-circle-outline" size={scale(18)} color="#111827" style={{ marginRight: spacing(8) }} />
            <Text style={[styles.pageTitle, { fontSize: ms(16) }]}>Closing This Request</Text>
          </View>

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
                colors={['#E7F9F0', '#DCFCE7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.statusCircleLg, { width: scale(72), height: scale(72), borderRadius: scale(36), alignItems: 'center', justifyContent: 'center' }]}
              >
                <Icon name="hand-heart" size={scale(34)} color="#28C76F" />
              </LinearGradient>
            </View>
            <Text style={[styles.statusTitle, { fontSize: ms(16), marginBottom: vscale(6) }]}>This request is being closed.</Text>
            <Text style={[styles.statusSubtitle, { fontSize: ms(14) }]}>Thanks for keeping things calm and respectful.</Text>
          </View>

          <View style={[styles.section, { marginBottom: vscale(14) }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: vscale(10) }}>
              <Icon name="account-heart-outline" size={scale(18)} color="#6B7280" style={{ marginRight: spacing(8) }} />
              <Text style={[styles.sectionHeading, { fontSize: ms(14) }]}>Did the helper provide help?</Text>
            </View>
            <View style={[styles.rowButtons, { marginBottom: 0 }]}>
              <View style={{ flex: 1, marginRight: spacing(10) }}>
                <Button
                  title="Yes"
                  onPress={() => setProvidedHelp(true)}
                  variant={providedHelp === true ? 'primary' : 'outline'}
                  size="large"
                  fullWidth
                  icon={<Icon name="thumb-up-outline" size={scale(18)} color={providedHelp === true ? '#FFFFFF' : '#E85555'} />}
                  accessibilityLabel="Yes, help was provided"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="No"
                  onPress={() => setProvidedHelp(false)}
                  variant={providedHelp === false ? 'primary' : 'outline'}
                  size="large"
                  fullWidth
                  icon={<Icon name="thumb-down-outline" size={scale(18)} color={providedHelp === false ? '#FFFFFF' : '#E85555'} />}
                  accessibilityLabel="No, help was not provided"
                />
              </View>
            </View>
          </View>

          {providedHelp === true && (
            <View style={[styles.section, { marginBottom: vscale(14) }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: vscale(10) }}>
                <Icon name="star-outline" size={scale(18)} color="#6B7280" style={{ marginRight: spacing(8) }} />
                <Text style={[styles.sectionHeading, { fontSize: ms(14) }]}>Rate your experience</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {[1,2,3,4,5].map(n => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => setStarRating(n)}
                    style={{ padding: spacing(6) }}
                    accessibilityRole="button"
                    accessibilityLabel={`Rate ${n} star${n === 1 ? '' : 's'}`}
                  >
                    <Icon name={n <= starRating ? 'star' : 'star-outline'} size={scale(28)} color={n <= starRating ? '#F59E0B' : '#9CA3AF'} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {providedHelp === false && (
            <View style={[styles.section, { marginBottom: vscale(14) }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: vscale(10) }}>
                <Icon name="alert-circle-outline" size={scale(18)} color="#6B7280" style={{ marginRight: spacing(8) }} />
                <Text style={[styles.sectionHeading, { fontSize: ms(14) }]}>What happened?</Text>
              </View>
              <TouchableOpacity
                style={[styles.checkboxRow, { marginBottom: vscale(8) }]}
                onPress={() => setCancelledAfterAccept(!cancelledAfterAccept)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Cancelled after accepting"
              >
                <View style={[styles.checkbox, {
                  width: scale(22),
                  height: scale(22),
                  borderRadius: scale(6),
                  borderWidth: scale(1),
                  marginRight: spacing(10)
                }, cancelledAfterAccept && styles.checkboxChecked]}>
                  {cancelledAfterAccept && <Icon name="check" size={scale(16)} color="#FFFFFF" />}
                </View>
                <Icon name="close-circle-outline" size={scale(18)} color="#9CA3AF" style={{ marginRight: spacing(8) }} />
                <Text style={[styles.checkboxText, { fontSize: ms(14) }]}>Cancelled after accepting</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.checkboxRow, { marginBottom: vscale(8) }]}
                onPress={() => setNoReplyAfterAccept(!noReplyAfterAccept)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="No reply after accepting"
              >
                <View style={[styles.checkbox, {
                  width: scale(22),
                  height: scale(22),
                  borderRadius: scale(6),
                  borderWidth: scale(1),
                  marginRight: spacing(10)
                }, noReplyAfterAccept && styles.checkboxChecked]}>
                  {noReplyAfterAccept && <Icon name="check" size={scale(16)} color="#FFFFFF" />}
                </View>
                <Icon name="message-alert-outline" size={scale(18)} color="#9CA3AF" style={{ marginRight: spacing(8) }} />
                <Text style={[styles.checkboxText, { fontSize: ms(14) }]}>No reply after accepting</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.checkboxRow, { marginBottom: vscale(8) }]}
                onPress={() => setItemIssue(!itemIssue)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Issue with item"
              >
                <View style={[styles.checkbox, {
                  width: scale(22),
                  height: scale(22),
                  borderRadius: scale(6),
                  borderWidth: scale(1),
                  marginRight: spacing(10)
                }, itemIssue && styles.checkboxChecked]}>
                  {itemIssue && <Icon name="check" size={scale(16)} color="#FFFFFF" />}
                </View>
                <Icon name="package-variant-closed" size={scale(18)} color="#9CA3AF" style={{ marginRight: spacing(8) }} />
                <Text style={[styles.checkboxText, { fontSize: ms(14) }]}>Issue with item</Text>
              </TouchableOpacity>
              <Text style={[styles.helperText, { fontSize: ms(12), marginTop: vscale(6) }]}>This helps build trust for future requests.</Text>
            </View>
          )}

          {itemIssue && (
            <View style={[styles.section, { marginBottom: vscale(14) }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: vscale(10) }}>
                <Icon name="text-box-edit-outline" size={scale(18)} color="#6B7280" style={{ marginRight: spacing(8) }} />
                <Text style={[styles.sectionHeading, { fontSize: ms(14) }]}>Describe the issue (optional)</Text>
              </View>
              <TextInput
                style={[styles.textInput, { borderRadius: scale(8), padding: spacing(12), height: vscale(80), fontSize: ms(14), marginBottom: vscale(8), borderWidth: scale(1), borderColor: '#E5E7EB' }]}
                placeholder="Short description"
                placeholderTextColor="#95A5A6"
                value={itemIssueDescription}
                onChangeText={setItemIssueDescription}
                multiline
              />
            </View>
          )}

          <View style={[styles.section, { marginBottom: vscale(14) }]}>
            <Text style={[styles.sectionHeading, { fontSize: ms(14), marginBottom: vscale(10) }]}>Need to report a concern?</Text>
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
            title="Submit Closure"
            onPress={handleDone}
            variant="gradient"
            size="large"
            fullWidth
            loading={submitting}
            disabled={submitting}
            icon={<Icon name="check-circle-outline" size={scale(18)} color="#FFFFFF" />}
            accessibilityLabel="Submit closure"
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
    borderColor: '#9CA3AF',
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
