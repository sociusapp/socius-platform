import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../../components/common/Header';
import { LinearGradient } from 'expo-linear-gradient';
import { useResponsive } from '../../../utils/responsive';
import MotionPressable from '../../../components/common/MotionPressable';
import MotionTextInput from '../../../components/common/MotionTextInput';
import MotionView from '../../../components/common/MotionView';

const WhatsHappeningScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const [query, setQuery] = (useState)('');

  const navigateToCreate = (category) => {
    navigation.navigate('CreateAwareness', { category });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <MotionPressable onPress={() => navigation.navigate('Settings')} style={{ padding: spacing(8) }}>
            <Icon name="cog" size={scale(24)} color="#999999" />
          </MotionPressable>
        }
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />

      <ScrollView 
        contentContainerStyle={[styles.scroll, { 
          paddingHorizontal: spacing(20), 
          paddingTop: vscale(20), 
          paddingBottom: vscale(60),
          alignItems: 'center'
        }]} 
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth }}>
          <MotionView preset="fadeUp" delay={100}>
            <Text style={[styles.title, { fontSize: ms(22), marginBottom: vscale(6) }]}>What’s happening right now?</Text>
            <Text style={[styles.subtitle, { fontSize: ms(13), marginBottom: vscale(12) }]}>Choose the closest option or search directly.</Text>
          </MotionView>

          <MotionView preset="fadeUp" delay={200}>
            <View style={[styles.searchWrap, { 
              borderRadius: scale(24), 
              paddingHorizontal: spacing(12), 
              paddingVertical: vscale(8), 
              marginBottom: vscale(12),
              shadowRadius: scale(4),
              elevation: scale(1)
            }]}>
              <Icon name="magnify" size={scale(22)} color="#999999" />
              <MotionTextInput
                containerStyle={{ flex: 1, marginLeft: spacing(8), borderRadius: scale(16), paddingVertical: 0, paddingHorizontal: 0, borderWidth: 0, backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0 }}
                inputStyle={[styles.searchInput, { fontSize: ms(14) }]}
                placeholder="Search (e.g. unsafe walk, blood, car issue)"
                placeholderTextColor="#9AA1A9"
                value={query}
                onChangeText={setQuery}
              />
            </View>
          </MotionView>

          <MotionView preset="fadeUp" delay={300}>
            <MotionPressable 
              style={[styles.card, { 
                borderRadius: scale(16), 
                borderWidth: scale(1), 
                paddingHorizontal: spacing(14), 
                paddingVertical: vscale(12), 
                marginBottom: vscale(12),
                shadowRadius: scale(6),
                elevation: scale(2)
              }]}
              onPress={() => navigateToCreate('calm_presence')}
            >
              <LinearGradient 
                colors={["#F6C7C4", "#E96A5C"]} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 1 }} 
                style={[styles.iconPill, { width: scale(40), height: scale(40), borderRadius: scale(20), marginRight: spacing(12) }]}
              >
                <Icon name="account-group" size={scale(22)} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { fontSize: ms(15), marginBottom: vscale(4) }]}>I need calm presence</Text>
                <Text style={[styles.cardDesc, { fontSize: ms(12) }]}>Something feels off and I don’t want to be alone.</Text>
              </View>
            </MotionPressable>
          </MotionView>

          <MotionView preset="fadeUp" delay={400}>
            <MotionPressable 
              style={[styles.card, { 
                borderRadius: scale(16), 
                borderWidth: scale(1), 
                paddingHorizontal: spacing(14), 
                paddingVertical: vscale(12), 
                marginBottom: vscale(12),
                shadowRadius: scale(6),
                elevation: scale(2)
              }]}
              onPress={() => navigateToCreate('care_support')}
            >
              <LinearGradient 
                colors={["#F6C7C4", "#E96A5C"]} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 1 }} 
                style={[styles.iconPill, { width: scale(40), height: scale(40), borderRadius: scale(20), marginRight: spacing(12) }]}
              >
                <Icon name="heart" size={scale(22)} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { fontSize: ms(15), marginBottom: vscale(4) }]}>Someone needs care or support</Text>
                <Text style={[styles.cardDesc, { fontSize: ms(12) }]}>This is about care, comfort, or assistance.</Text>
              </View>
            </MotionPressable>
          </MotionView>

          <MotionView preset="fadeUp" delay={500}>
            <MotionPressable 
              style={[styles.card, { 
                borderRadius: scale(16), 
                borderWidth: scale(1), 
                paddingHorizontal: spacing(14), 
                paddingVertical: vscale(12), 
                marginBottom: vscale(12),
                shadowRadius: scale(6),
                elevation: scale(2)
              }]}
              onPress={() => navigateToCreate('right_help')}
            >
              <LinearGradient 
                colors={["#F6C7C4", "#E96A5C"]} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 1 }} 
                style={[styles.iconPill, { width: scale(40), height: scale(40), borderRadius: scale(20), marginRight: spacing(12) }]}
              >
                <Icon name="link-variant" size={scale(22)} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { fontSize: ms(15), marginBottom: vscale(4) }]}>We need the right help</Text>
                <Text style={[styles.cardDesc, { fontSize: ms(12) }]}>Specific help or resources are needed.</Text>
              </View>
            </MotionPressable>
          </MotionView>

          <MotionView preset="fadeUp" delay={600}>
            <MotionPressable 
              style={[styles.card, { 
                borderRadius: scale(16), 
                borderWidth: scale(1), 
                paddingHorizontal: spacing(14), 
                paddingVertical: vscale(12), 
                marginBottom: vscale(12),
                shadowRadius: scale(6),
                elevation: scale(2)
              }]}
              onPress={() => navigateToCreate('prevent_fix')}
            >
              <LinearGradient 
                colors={["#F6C7C4", "#E96A5C"]} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 1 }} 
                style={[styles.iconPill, { width: scale(40), height: scale(40), borderRadius: scale(20), marginRight: spacing(12) }]}
              >
                <Icon name="wrench" size={scale(22)} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { fontSize: ms(15), marginBottom: vscale(4) }]}>Let’s prevent or fix something</Text>
                <Text style={[styles.cardDesc, { fontSize: ms(12) }]}>A local issue that could become a problem.</Text>
              </View>
            </MotionPressable>
          </MotionView>

          <View style={[styles.footerNoteWrap, { marginTop: vscale(6) }]}>
            <View style={[styles.sectionDivider, { height: scale(1), marginVertical: vscale(10) }]} />
            <Text style={[styles.footerNote, { fontSize: ms(12) }]}>Nothing is shared until you confirm.</Text>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 60,
    alignItems: 'stretch',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 12,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F2F4',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  iconPill: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: '#666666',
  },
  footerNoteWrap: {
    alignItems: 'center',
  },
  sectionDivider: {
    width: '100%',
    backgroundColor: '#E8EAED',
  },
  footerNote: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
  },
});

export default WhatsHappeningScreen;
