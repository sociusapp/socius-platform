import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../../../components/common/Header';
import Button from '../../../../components/common/Button';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useResponsive } from '../../../../utils/responsive';
import { useFocusEffect } from '@react-navigation/native';

const SituationSharedScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => true;
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [])
  );

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Header 
        title="Situation Shared" 
        onBackPress={() => {}}
        style={[styles.header, { paddingHorizontal: spacing(16) }]}
        titleStyle={[styles.headerTitle, { fontSize: ms(18) }]}
      />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: spacing(20), paddingTop: vscale(20), paddingBottom: vscale(40) }]} showsVerticalScrollIndicator={false}>
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          <View style={[styles.iconContainer, { marginBottom: vscale(24) }]}>
            <Icon name="share-variant" size={scale(80)} color="#27AE60" />
          </View>

          <Text style={[styles.title, { fontSize: ms(24), marginBottom: vscale(12) }]}>Information Shared</Text>
          <Text style={[styles.subtitle, { fontSize: ms(16), marginBottom: vscale(32) }]}>
            The situation details have been shared with community members nearby. Thank you for contributing to shared awareness.
          </Text>

          <View style={[styles.card, { padding: spacing(20), borderRadius: scale(16), marginBottom: vscale(24) }]}>
            <Text style={[styles.cardTitle, { fontSize: ms(18), marginBottom: vscale(12) }]}>What happens next?</Text>
            <View style={[styles.bulletItem, { marginBottom: vscale(8) }]}>
              <Icon name="information-outline" size={scale(18)} color="#27AE60" style={{ marginRight: spacing(8) }} />
              <Text style={[styles.bulletText, { fontSize: ms(14) }]}>Nearby members can see the shared details.</Text>
            </View>
            <View style={[styles.bulletItem, { marginBottom: vscale(8) }]}>
              <Icon name="information-outline" size={scale(18)} color="#27AE60" style={{ marginRight: spacing(8) }} />
              <Text style={[styles.bulletText, { fontSize: ms(14) }]}>The community is now more aware of the situation.</Text>
            </View>
            <View style={[styles.bulletItem]}>
              <Icon name="information-outline" size={scale(18)} color="#27AE60" style={{ marginRight: spacing(8) }} />
              <Text style={[styles.bulletText, { fontSize: ms(14) }]}>You can update or close the situation anytime.</Text>
            </View>
          </View>

          <Button 
            title="Go to Home" 
            onPress={() =>
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
              })
            }
            style={{ borderRadius: scale(30) }}
          />
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  scroll: {
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },
  subtitle: {
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulletText: {
    color: '#34495E',
    flex: 1,
  },
});

export default SituationSharedScreen;
