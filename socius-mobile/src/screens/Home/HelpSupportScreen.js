import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import { useResponsive } from '../../utils/responsive';

const HelpSupportScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const commonQuestions = [
    { 
      label: 'What happens when I press “Need Presence”?', 
      answer: 'Nearby volunteers see a discreet request to be aware. No public feed or exposure. You can cancel or end anytime.' 
    },
    { 
      label: 'Am I required to respond to alerts?', 
      answer: 'No. Participation is voluntary. If you cannot help or it feels unsafe, you can ignore the alert.' 
    },
    { 
      label: 'Can I cancel or leave anytime?', 
      answer: 'Yes. You can cancel a request or leave whenever you choose. Your safety and comfort come first.' 
    },
    { 
      label: 'Is Socius an emergency service?', 
      answer: 'No. Socius supports awareness and calm presence. For emergencies, contact local authorities or emergency services.' 
    },
  ];
  const [openIndices, setOpenIndices] = useState([]);
  const toggleIndex = (i) => {
    setOpenIndices(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  const handleReportIssue = () => {
    navigation.navigate('ReportConcern');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Help & Support" onBackPress={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing(16), paddingTop: vscale(12), paddingBottom: vscale(24), gap: vscale(14) }]} showsVerticalScrollIndicator={false}>
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          <View style={[styles.sectionCard, { borderRadius: scale(16), borderWidth: scale(1), paddingHorizontal: spacing(14), paddingVertical: vscale(12) }]}>
            <View style={[styles.sectionHeaderRow, { gap: spacing(10), marginBottom: vscale(8) }]}>
              <View style={[styles.iconCircle, { width: scale(34), height: scale(34), borderRadius: scale(17) }]}>
                <Icon name="lifebuoy" size={ms(22)} color="#DC5C69" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { fontSize: ms(15) }]}>Need help understanding something?</Text>
              </View>
            </View>
            <Text style={[styles.sectionSubtitle, { fontSize: ms(13), marginBottom: vscale(10) }]}>
              If you're unsure about how Socius works or what to do in a situation, you can start here.
            </Text>

            <View style={[styles.buttonColumn, { gap: vscale(2) }]}>
              <Button title="How Socius Works" onPress={() => navigation.navigate('WhatSociusIs')} fullWidth variant="white" style={[styles.compactButton, { borderRadius: scale(10) }]} textStyle={[styles.compactButtonText, { fontSize: ms(14) }]} />
              <Button title="When to Use Socius" onPress={() => navigation.navigate('WhenToAskPresence')} fullWidth variant="white" style={[styles.compactButton, { borderRadius: scale(10) }]} textStyle={[styles.compactButtonText, { fontSize: ms(14) }]} />
              <Button title="When NOT to Use Socius" onPress={() => navigation.navigate('WhatSociusIsNot')} fullWidth variant="white" style={[styles.compactButton, { borderRadius: scale(10) }]} textStyle={[styles.compactButtonText, { fontSize: ms(14) }]} />
            </View>
          </View>

          <View style={[styles.sectionCard, { borderRadius: scale(16), borderWidth: scale(1), paddingHorizontal: spacing(14), paddingVertical: vscale(12), marginTop: vscale(14) }]}>
            <View style={[styles.sectionHeaderRow, { gap: spacing(10), marginBottom: vscale(8) }]}>
              <View style={[styles.iconCircle, { backgroundColor: '#FFF4E6', width: scale(34), height: scale(34), borderRadius: scale(17) }]}>
                <Icon name="comment-question-outline" size={ms(22)} color="#F59E0B" />
              </View>
              <Text style={[styles.sectionTitle, { fontSize: ms(15) }]}>Common Questions</Text>
            </View>

            <View style={[styles.listContainer, { marginTop: vscale(6) }]}>
              {commonQuestions.map((q, idx) => {
                const open = openIndices.includes(idx);
                return (
                  <View key={idx}>
                    <TouchableOpacity style={[styles.listRow, { paddingVertical: vscale(10), borderTopWidth: scale(1) }]} onPress={() => toggleIndex(idx)}>
                      <Text style={[styles.listRowText, { fontSize: ms(14) }]}>{q.label}</Text>
                      <Icon name={open ? 'chevron-up' : 'chevron-down'} size={ms(20)} color="#999999" />
                    </TouchableOpacity>
                    {open && (
                      <Text style={[styles.answerText, { fontSize: ms(13), lineHeight: ms(20), paddingVertical: vscale(8) }]}>{q.answer}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          <View style={[styles.sectionCard, { borderRadius: scale(16), borderWidth: scale(1), paddingHorizontal: spacing(14), paddingVertical: vscale(12), marginTop: vscale(14) }]}>
            <View style={[styles.sectionHeaderRow, { gap: spacing(10), marginBottom: vscale(8) }]}>
              <View style={[styles.iconCircle, { backgroundColor: '#FEE8EA', width: scale(34), height: scale(34), borderRadius: scale(17) }]}>
                <Icon name="alert" size={ms(22)} color="#DC5C69" />
              </View>
              <Text style={[styles.sectionTitle, { fontSize: ms(15) }]}>Report a Concern</Text>
            </View>

            <Text style={[styles.sectionSubtitle, { fontSize: ms(13), marginBottom: vscale(10) }]}>
              If something didn't feel right or you noticed misuse, you can let us know.
            </Text>

            <Button
              title="Report Issue"
              onPress={handleReportIssue}
              variant="primary"
              fullWidth
              style={{ borderRadius: scale(26) }}
            />

            <Text style={[styles.sectionFootnote, { fontSize: ms(12), marginTop: vscale(8) }]}>
              Reports are reviewed by the Socius team. No immediate action is taken automatically.
            </Text>
          </View>

          <View style={[styles.sectionCard, { borderRadius: scale(16), borderWidth: scale(1), paddingHorizontal: spacing(14), paddingVertical: vscale(12), marginTop: vscale(14) }]}>
            <View style={[styles.sectionHeaderRow, { gap: spacing(10), marginBottom: vscale(8) }]}>
              <View style={[styles.iconCircle, { backgroundColor: '#EAF2FF', width: scale(34), height: scale(34), borderRadius: scale(17) }]}>
                <Icon name="message-text-outline" size={ms(22)} color="#3B82F6" />
              </View>
              <Text style={[styles.sectionTitle, { fontSize: ms(15) }]}>Contact Socius Support</Text>
            </View>

            <View style={[styles.actionsRow, { gap: spacing(12), marginTop: vscale(10) }]}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Email Support"
                  onPress={() => {}}
                  variant="white"
                  fullWidth
                  style={[styles.inlineButton, { borderRadius: scale(10), paddingVertical: vscale(10) }]}
                  textStyle={[styles.inlineButtonText, { fontSize: ms(14) }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Send Feedback"
                  onPress={() => {}}
                  variant="white"
                  fullWidth
                  style={[styles.inlineButton, { borderRadius: scale(10), paddingVertical: vscale(10) }]}
                  textStyle={[styles.inlineButtonText, { fontSize: ms(14) }]}
                />
              </View>
            </View>
          </View>

            <Text style={[styles.footerNote, { fontSize: ms(11), marginTop: vscale(20) }]}>
              You are never required to act. Participation is always your choice.
            </Text>
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
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    backgroundColor: '#F2F7F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  sectionSubtitle: {
    color: '#666666',
  },
  buttonColumn: {

  },
  compactButton: {
    paddingVertical: 0,
  },
  compactButtonText: {
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  chipText: {
    color: '#2C3E50',
    fontWeight: '600',
  },
  sectionFootnote: {
    color: '#999999',
  },
  listContainer: {
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopColor: '#F1F3F5',
  },
  listRowText: {
    color: '#2C3E50',
  },
  answerText: {
    color: '#666666',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inlineButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#D7DCE3',
    borderWidth: 1,
    minHeight: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  inlineButtonText: {
    fontWeight: '700',
    color: '#1F2933',
  },
  footerNote: {
    color: '#999999',
    textAlign: 'center',
  },
});

export default HelpSupportScreen;
