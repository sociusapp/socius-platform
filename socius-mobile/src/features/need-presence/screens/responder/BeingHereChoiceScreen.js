import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../../../components/common/Header';
import Button from '../../../../components/common/Button';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useResponsive } from '../../../../utils/responsive';

const BeingHereChoiceScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Header 
        title="Your Safety Comes First" 
        onBackPress={() => navigation.goBack()}
        style={{ borderBottomWidth: 0 }}
        titleStyle={{ fontSize: ms(16), color: '#5D6D7E' }}
      />
      
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing(20), paddingTop: vscale(20), paddingBottom: vscale(40) }]} showsVerticalScrollIndicator={false}>
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          {/* Main Card */}
          <View style={[styles.mainCard, { 
            borderRadius: scale(16), 
            padding: spacing(24), 
            marginBottom: vscale(24),
            shadowRadius: scale(8),
            elevation: scale(2),
            borderWidth: scale(1)
          }]}>
            <Text style={[styles.cardTitle, { fontSize: ms(20), marginBottom: vscale(12) }]}>Being here is your choice.</Text>
            <View style={[styles.separator, { width: scale(40), height: scale(2), marginBottom: vscale(12) }]} />
            <Text style={[styles.cardSubtitle, { fontSize: ms(15), lineHeight: vscale(22) }]}>
              You are not required to stay, engage, or explain yourself.
            </Text>
          </View>

          {/* List Items */}
          <View style={[styles.listContainer, { marginBottom: vscale(20) }]}>
            <View style={[styles.listItem, { paddingVertical: vscale(12) }]}>
              <View style={[styles.iconBox, { width: scale(32) }]}>
                <Icon name="door-open" size={scale(20)} color="#CD5C5C" />
              </View>
              <Text style={[styles.listItemText, { fontSize: ms(15) }]}>You may leave at any time</Text>
            </View>
            <View style={[styles.divider, { height: scale(1), marginLeft: scale(32) }]} />

            <View style={[styles.listItem, { paddingVertical: vscale(12) }]}>
              <View style={[styles.iconBox, { width: scale(32) }]}>
                <Icon name="message-text-outline" size={scale(20)} color="#CD5C5C" />
              </View>
              <Text style={[styles.listItemText, { fontSize: ms(15) }]}>You do not owe anyone an explanation</Text>
            </View>
            <View style={[styles.divider, { height: scale(1), marginLeft: scale(32) }]} />

            <View style={[styles.listItem, { paddingVertical: vscale(12) }]}>
              <View style={[styles.iconBox, { width: scale(32) }]}>
                <Icon name="clock-outline" size={scale(20)} color="#CD5C5C" />
              </View>
              <Text style={[styles.listItemText, { fontSize: ms(15) }]}>Leaving early is not a failure</Text>
            </View>
            <View style={[styles.divider, { height: scale(1), marginLeft: scale(32) }]} />

            <View style={[styles.listItem, { paddingVertical: vscale(12) }]}>
              <View style={[styles.iconBox, { width: scale(32) }]}>
                <Icon name="heart" size={scale(20)} color="#CD5C5C" />
              </View>
              <Text style={[styles.listItemText, { fontSize: ms(15) }]}>Your presence alone may already be enough</Text>
            </View>
          </View>

          <View style={[styles.dividerFull, { height: scale(1), marginBottom: vscale(24) }]} />

          {/* Footer Section */}
          <View style={[styles.footerSection, { gap: vscale(8) }]}>
            <Text style={[styles.footerText, { fontSize: ms(14) }]}>
              Socius does not expect intervention.
            </Text>
            <Text style={[styles.footerTextItalic, { fontSize: ms(14), marginBottom: vscale(20) }]}>
              You decide what feels safe for you.
            </Text>

            <Button 
              title="I Understand" 
              onPress={() => navigation.goBack()} 
              variant="primary" // Assuming primary is the red one or we override
              style={[styles.primaryButton, { borderRadius: scale(30), marginBottom: vscale(10) }]}
            />

            <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.leaveButton, { paddingVertical: vscale(10) }]}>
              <Text style={[styles.leaveButtonText, { fontSize: ms(16) }]}>Leave Now</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.bottomSpacer, { height: vscale(20), borderBottomWidth: scale(1), marginBottom: vscale(20) }]} />
          
          <Text style={[styles.bottomNote, { fontSize: ms(13) }]}>
            You can continue or leave without penalty.
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
  mainCard: {
    backgroundColor: '#F8F9FA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    alignItems: 'center', // Center text
    borderColor: '#F0F0F0',
  },
  cardTitle: {
    fontWeight: '700',
    color: '#4A5568', // Dark grey/slate
    textAlign: 'center',
  },
  separator: {
    backgroundColor: '#E2E8F0',
  },
  cardSubtitle: {
    color: '#718096',
    textAlign: 'center',
  },
  listContainer: {
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  listItemText: {
    color: '#5D6D7E',
    flex: 1,
  },
  divider: {
    backgroundColor: '#F0F0F0',
  },
  dividerFull: {
    backgroundColor: '#E0E0E0',
  },
  footerSection: {
    alignItems: 'center',
  },
  footerText: {
    color: '#5D6D7E',
    textAlign: 'center',
  },
  footerTextItalic: {
    color: '#5D6D7E',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#D3453D', // Match the red button color
  },
  leaveButton: {
  },
  leaveButtonText: {
    color: '#D3453D',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  bottomSpacer: {
    borderBottomColor: '#F0F0F0',
    width: '100%',
  },
  bottomNote: {
    color: '#7F8C8D',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default BeingHereChoiceScreen;
