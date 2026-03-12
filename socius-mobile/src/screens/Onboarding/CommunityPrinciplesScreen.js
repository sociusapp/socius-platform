import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/common/Button';
import Header from '../../components/common/Header';
import { useResponsive } from '../../utils/responsive';
import BottomActionBar from '../../components/common/BottomActionBar';

const CommunityPrinciplesScreen = ({ navigation }) => {
  const { contentWidth, titleFont, subtitleFont, bodyFont, smallFont, scale, vscale, spacing, height } = useResponsive();
  const principles = [
    {
      icon: require('../../assets/icons/icon-11.png'),
      title: "Respect First",
      description: "Treat everyone with dignity and patience."
    },
    {
      icon: require('../../assets/icons/icon-13.png'),
      title: "No Escalation",
      description: "This platform exists to calm situations, not intensify them."
    },
    {
      icon: require('../../assets/icons/icon-15.png'),
      title: "Voluntary Participation",
      description: "No one is expected to act or respond."
    },
    {
      icon: require('../../assets/icons/icon-16.png'),
      title: "Privacy Matters",
      description: "Respect personal boundaries and shared information."
    },
    {
      icon: require('../../assets/icons/icon-17.png'),
      title: "Step Away When Needed",
      description: "Your safety comes first. Leaving is always okay."
    }
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Header 
        title="" 
        onBackPress={() => navigation.goBack()} 
        style={{ borderBottomWidth: 0 }}
      />
      
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { alignItems: 'center', paddingHorizontal: spacing(20), paddingTop: vscale(10), paddingBottom: vscale(24) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', width: '100%', flex: 1, justifyContent: height > 700 ? 'center' : 'flex-start' }}>
          {/* Main Card Container */}
          <View style={[styles.cardContainer, { 
            width: contentWidth, 
            paddingVertical: vscale(20), 
            paddingHorizontal: spacing(16), 
            borderRadius: scale(24),
            borderWidth: scale(1),
            shadowOffset: { width: 0, height: vscale(2) },
            shadowRadius: scale(8),
            elevation: scale(3)
          }]}>
            {/* Title */}
            <Text style={[styles.pageTitle, { fontSize: titleFont(20), marginBottom: vscale(12), lineHeight: titleFont(26) }]}>Our Community Principles</Text>
            
            {/* Divider */}
            <View style={[styles.divider, { marginVertical: vscale(12), height: scale(1) }]} />

            {/* Principles List */}
            <View style={[styles.listContainer, { marginVertical: vscale(4) }]}>
              {principles.map((item, index) => (
                <View key={index} style={[styles.principleItem, { marginBottom: vscale(16) }]}>
                  <View style={[styles.iconCircle, { width: scale(48), height: scale(48), borderRadius: scale(24), marginRight: spacing(14) }]}>
                    <Image 
                      source={item.icon} 
                      style={{ width: scale(40), height: scale(40) }} 
                      resizeMode="contain"
                    />
                  </View>
                  <View style={[styles.textContainer, { paddingTop: vscale(2) }]}>
                    <Text style={[styles.itemTitle, { fontSize: subtitleFont(16), fontWeight: '700', marginBottom: vscale(2), lineHeight: subtitleFont(22) }]}>{item.title}</Text>
                    <Text style={[styles.itemDescription, { fontSize: bodyFont(13), lineHeight: bodyFont(18) }]}>{item.description}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Divider */}
            <View style={[styles.divider, { marginVertical: vscale(12), height: scale(1) }]} />

            {/* Footer Text */}
            <Text style={[styles.footerText, { fontSize: bodyFont(13), lineHeight: bodyFont(18) }]}>
              These principles apply to everyone using Socius.
            </Text>
          </View>
        </View>
      </ScrollView>

      <BottomActionBar style={{ paddingHorizontal: spacing(20) }} contentStyle={{ width: contentWidth, alignSelf: 'center' }}>
        <Button 
          title="Continue" 
          onPress={() => navigation.navigate('PhoneVerification')}
          fullWidth
        />
      </BottomActionBar>
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

  // ===== CARD CONTAINER =====
  cardContainer: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    borderColor: '#E8EAED',
  },

  pageTitle: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },

  divider: {
    backgroundColor: '#E8EAED',
  },

  // ===== PRINCIPLES LIST =====
  listContainer: {
    width: '100%',
  },

  principleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  iconCircle: {
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  textContainer: {
    flex: 1,
  },

  itemTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },

  itemDescription: {
    fontWeight: '400',
    color: '#666666',
  },

  // ===== FOOTER TEXT =====
  footerText: {
    fontWeight: '400',
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // ===== FOOTER BUTTON =====
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E8EAED',
  },
});

export default CommunityPrinciplesScreen;
