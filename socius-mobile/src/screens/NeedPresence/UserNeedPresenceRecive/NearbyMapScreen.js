import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../../components/common/Header';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useResponsive } from '../../../utils/responsive';

const NearbyMapScreen = ({ navigation }) => {
  const [isGuidanceExpanded, setIsGuidanceExpanded] = useState(true);
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Header 
        title="" 
        onBackPress={() => navigation.goBack()}
        style={[styles.header, { paddingHorizontal: spacing(16) }]}
        titleStyle={[styles.headerTitle, { fontSize: ms(18) }]}
      />
      
      <ScrollView contentContainerStyle={[styles.scrollContent, { padding: spacing(16), paddingBottom: vscale(40) }]} showsVerticalScrollIndicator={false}>
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          {/* Map Placeholder */}
          <View style={[styles.mapCard, { borderRadius: scale(12), marginBottom: vscale(16), shadowRadius: scale(4), elevation: scale(3) }]}>
            <View style={[styles.mapPlaceholder, { height: vscale(140) }]}>
              {/* Simple map pattern simulation */}
              <View style={[styles.mapRoad, { top: vscale(20), height: vscale(20) }]} />
              <View style={[styles.mapRoad, { top: vscale(60), height: vscale(20) }]} />
              <View style={[styles.mapRoad, { left: spacing(100), width: spacing(20), height: vscale(150) }]} />
              
              <View style={styles.mapPinContainer}>
                <Icon name="map-marker" size={scale(40)} color="#7F8C8D" />
              </View>
            </View>
            <View style={[styles.distanceContainer, { padding: spacing(12) }]}>
              <Text style={[styles.distanceText, { fontSize: ms(14) }]}>Approximately <Text style={styles.boldText}>400 meters</Text> away.</Text>
            </View>
          </View>

          {/* Situation Details */}
          <View style={[styles.card, { borderRadius: scale(12), padding: spacing(16), marginBottom: vscale(16), shadowRadius: scale(4), elevation: scale(3) }]}>
            <Text style={[styles.cardHeader, { fontSize: ms(16), marginBottom: vscale(8) }]}>Situation shared nearby</Text>
            <View style={[styles.divider, { height: scale(1), marginBottom: vscale(12) }]} />
            <Text style={[styles.situationText, { fontSize: ms(15), marginBottom: vscale(6) }]}>
              Situation: <Text style={styles.boldText}>Being followed</Text>
            </Text>
            <Text style={[styles.situationNote, { fontSize: ms(14) }]}>
              Note: Walking alone near main road
            </Text>
          </View>

          {/* Let them know button */}
          <TouchableOpacity style={[styles.actionButton, { marginBottom: vscale(16), borderRadius: scale(30), shadowRadius: scale(4), elevation: scale(3) }]} activeOpacity={0.8}>
            <LinearGradient
              colors={['#F0F0F0', '#E0E0E0']}
              style={[styles.actionButtonGradient, { paddingVertical: vscale(14), paddingHorizontal: spacing(20), borderRadius: scale(30), borderWidth: scale(1) }]}
            >
              <Text style={[styles.actionButtonText, { fontSize: ms(16), marginBottom: vscale(2) }]}>Let them know I may be nearby</Text>
              <Text style={[styles.actionButtonSubtext, { fontSize: ms(12) }]}>This shares only your first name and photo.</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Safety Guidance */}
          <View style={[styles.guidanceCard, { borderRadius: scale(12), marginBottom: vscale(16), shadowRadius: scale(4), elevation: scale(3) }]}>
            <TouchableOpacity 
              style={[styles.guidanceHeader, { padding: spacing(12), borderBottomWidth: scale(1) }]} 
              onPress={() => setIsGuidanceExpanded(!isGuidanceExpanded)}
            >
              <View style={styles.guidanceHeaderLeft}>
                <View style={[styles.dot, { width: scale(6), height: scale(6), borderRadius: scale(3), marginRight: spacing(8) }]} />
                <Text style={[styles.guidanceTitle, { fontSize: ms(14) }]}>Safety guidance <Text style={[styles.tapToView, { fontSize: ms(12) }]}>(tap to view)</Text></Text>
              </View>
              <Icon name={isGuidanceExpanded ? "chevron-up" : "chevron-down"} size={scale(20)} color="#7F8C8D" />
            </TouchableOpacity>

            {isGuidanceExpanded && (
              <View style={[styles.guidanceContent, { padding: spacing(12) }]}>
                <View style={styles.guidanceRow}>
                  {/* DO Column */}
                  <View style={styles.guidanceColumn}>
                    <Text style={[styles.columnHeader, { fontSize: ms(14), marginBottom: vscale(8) }]}>Do</Text>
                    <View style={[styles.columnDivider, { height: scale(1), marginBottom: vscale(8) }]} />
                    
                    <View style={[styles.checkItem, { marginBottom: vscale(8) }]}>
                      <Icon name="check-circle" size={scale(16)} color="#7DA47B" style={[styles.checkIcon, { marginTop: vscale(1), marginRight: spacing(6) }]} />
                      <Text style={[styles.checkText, { fontSize: ms(11), lineHeight: vscale(16) }]}>Stay visible and calm</Text>
                    </View>
                    <View style={[styles.checkItem, { marginBottom: vscale(8) }]}>
                      <Icon name="check-circle" size={scale(16)} color="#7DA47B" style={[styles.checkIcon, { marginTop: vscale(1), marginRight: spacing(6) }]} />
                      <Text style={[styles.checkText, { fontSize: ms(11), lineHeight: vscale(16) }]}>Keep distance</Text>
                    </View>
                    <View style={[styles.checkItem, { marginBottom: vscale(8) }]}>
                      <Icon name="check-circle" size={scale(16)} color="#7DA47B" style={[styles.checkIcon, { marginTop: vscale(1), marginRight: spacing(6) }]} />
                      <Text style={[styles.checkText, { fontSize: ms(11), lineHeight: vscale(16) }]}>Ask "Are you okay?"</Text>
                    </View>
                    <View style={[styles.checkItem, { marginBottom: vscale(8) }]}>
                      <Icon name="check-circle" size={scale(16)} color="#7DA47B" style={[styles.checkIcon, { marginTop: vscale(1), marginRight: spacing(6) }]} />
                      <Text style={[styles.checkText, { fontSize: ms(11), lineHeight: vscale(16) }]}>Contact authorities if unsure</Text>
                    </View>
                  </View>

                  {/* Vertical Divider */}
                  <View style={[styles.verticalDivider, { width: scale(1), marginHorizontal: spacing(8) }]} />

                  {/* DON'T Column */}
                  <View style={styles.guidanceColumn}>
                    <Text style={[styles.columnHeader, { fontSize: ms(14), marginBottom: vscale(8) }]}>Don't</Text>
                    <View style={[styles.columnDivider, { height: scale(1), marginBottom: vscale(8) }]} />
                    
                    <View style={[styles.checkItem, { marginBottom: vscale(8) }]}>
                      <View style={[styles.xIconContainer, { width: scale(16), height: scale(16), borderRadius: scale(8), marginTop: vscale(1), marginRight: spacing(6) }]}>
                        <Icon name="arrow-up" size={scale(10)} color="#FFFFFF" style={{ transform: [{ rotate: '45deg' }] }} />
                      </View>
                      <Text style={[styles.checkText, { fontSize: ms(11), lineHeight: vscale(16) }]}>Don't confront or chase</Text>
                    </View>
                    <View style={[styles.checkItem, { marginBottom: vscale(8) }]}>
                      <View style={[styles.xIconContainer, { width: scale(16), height: scale(16), borderRadius: scale(8), marginTop: vscale(1), marginRight: spacing(6) }]}>
                        <Icon name="arrow-up" size={scale(10)} color="#FFFFFF" style={{ transform: [{ rotate: '45deg' }] }} />
                      </View>
                      <Text style={[styles.checkText, { fontSize: ms(11), lineHeight: vscale(16) }]}>Don't detain anyone</Text>
                    </View>
                    <View style={[styles.checkItem, { marginBottom: vscale(8) }]}>
                      <View style={[styles.xIconContainer, { width: scale(16), height: scale(16), borderRadius: scale(8), marginTop: vscale(1), marginRight: spacing(6) }]}>
                        <Icon name="arrow-up" size={scale(10)} color="#FFFFFF" style={{ transform: [{ rotate: '45deg' }] }} />
                      </View>
                      <Text style={[styles.checkText, { fontSize: ms(11), lineHeight: vscale(16) }]}>Don't use force</Text>
                    </View>
                    <View style={[styles.checkItem, { marginBottom: vscale(8) }]}>
                      <View style={[styles.xIconContainer, { width: scale(16), height: scale(16), borderRadius: scale(8), marginTop: vscale(1), marginRight: spacing(6) }]}>
                        <Icon name="arrow-up" size={scale(10)} color="#FFFFFF" style={{ transform: [{ rotate: '45deg' }] }} />
                      </View>
                      <Text style={[styles.checkText, { fontSize: ms(11), lineHeight: vscale(16) }]}>Don't put yourself at risk</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Open Navigation Button */}
          <TouchableOpacity style={[styles.actionButton, { marginBottom: vscale(16), borderRadius: scale(30), shadowRadius: scale(4), elevation: scale(3) }]} activeOpacity={0.8}>
            <LinearGradient
              colors={['#F8F9FA', '#F1F2F3']}
              style={[styles.actionButtonGradient, { paddingVertical: vscale(14), paddingHorizontal: spacing(20), borderRadius: scale(30), borderWidth: scale(1) }]}
            >
              <Text style={[styles.actionButtonText, { fontSize: ms(16), marginBottom: vscale(2) }]}>Open navigation <Text style={[styles.normalText, { fontSize: ms(14) }]}>(external app)</Text></Text>
              <Text style={[styles.actionButtonSubtext, { fontSize: ms(12) }]}>Use only if you feel safe.</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Bottom Emergency Bar */}
          <View style={[styles.emergencyBar, { borderRadius: scale(30), paddingVertical: vscale(12), paddingHorizontal: spacing(16), shadowRadius: scale(2), elevation: scale(2), borderWidth: scale(1) }]}>
            <TouchableOpacity style={styles.emergencyItem}>
              <Icon name="shield-account" size={scale(20)} color="#7F8C8D" />
              <Text style={[styles.emergencyText, { fontSize: ms(14), marginLeft: spacing(6) }]}>Police</Text>
            </TouchableOpacity>
            
            <View style={[styles.barDivider, { width: scale(1), height: vscale(20) }]} />
            
            <TouchableOpacity style={styles.emergencyItem}>
              <View style={[styles.plusIconBox, { width: scale(16), height: scale(16), borderRadius: scale(4) }]}>
                <Icon name="plus" size={scale(12)} color="#FFFFFF" />
              </View>
              <Text style={[styles.emergencyText, { fontSize: ms(14), marginLeft: spacing(6) }]}>Ambulance</Text>
            </TouchableOpacity>
            
            <View style={[styles.barDivider, { width: scale(1), height: vscale(20) }]} />
            
            <TouchableOpacity style={styles.emergencyItem}>
              <Icon name="phone" size={scale(20)} color="#7F8C8D" />
              <Text style={[styles.emergencyText, { fontSize: ms(14), marginLeft: spacing(6) }]}>Helpline</Text>
            </TouchableOpacity>
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
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    color: '#A83A30',
    fontWeight: '600',
  },
  scrollContent: {
  },
  mapCard: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    backgroundColor: '#E5E7E9',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mapRoad: {
    position: 'absolute',
    width: '120%',
    backgroundColor: '#FFFFFF',
    left: -20,
    transform: [{ rotate: '15deg' }],
  },
  mapPinContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 5,
  },
  distanceContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  distanceText: {
    color: '#5D6D7E',
  },
  boldText: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  card: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
  },
  cardHeader: {
    fontWeight: '700',
    color: '#5D6D7E',
  },
  divider: {
    backgroundColor: '#F0F0F0',
  },
  situationText: {
    color: '#2C3E50',
  },
  situationNote: {
    color: '#5D6D7E',
  },
  actionButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
  },
  actionButtonGradient: {
    alignItems: 'center',
    borderColor: '#E0E0E0',
  },
  actionButtonText: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  normalText: {
    fontWeight: '400',
  },
  actionButtonSubtext: {
    color: '#7F8C8D',
  },
  guidanceCard: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    overflow: 'hidden',
  },
  guidanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderBottomColor: '#F0F0F0',
  },
  guidanceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    backgroundColor: '#D35400', // Orange/Red dot
  },
  guidanceTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  tapToView: {
    fontWeight: '400',
    color: '#7F8C8D',
  },
  guidanceContent: {
  },
  guidanceRow: {
    flexDirection: 'row',
  },
  guidanceColumn: {
    flex: 1,
  },
  columnHeader: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },
  columnDivider: {
    backgroundColor: '#F0F0F0',
  },
  verticalDivider: {
    backgroundColor: '#F0F0F0',
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkIcon: {
  },
  xIconContainer: {
    backgroundColor: '#C0392B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkText: {
    color: '#2C3E50',
    flex: 1,
  },
  emergencyBar: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    borderColor: '#E0E0E0',
  },
  emergencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  emergencyText: {
    color: '#7F8C8D',
    fontWeight: '500',
  },
  barDivider: {
    backgroundColor: '#D5D8DC',
  },
  plusIconBox: {
    backgroundColor: '#7F8C8D',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NearbyMapScreen;
