import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    NativeScrollEvent,
    NativeSyntheticEvent,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');
const BACKGROUND = '#121318';
const PRIMARY = '#ADC2FF';
const TEXT = '#F5F5F7';
const MUTED = '#C9CAD1';
const ONBOARDING_SEEN = 'CRB_ONBOARDING_SEEN';

const slides = [
  {
    icon: 'shield-checkmark-outline' as const,
    iconColor: '#1769E8',
    iconBackground: '#102A58',
    title: 'Secure Your\nFinancial Future',
    description: 'Monitor your CRB status with bank-grade security and stay ahead of your financial health.',
  },
  {
    icon: 'speedometer-outline' as const,
    iconColor: '#FFB31A',
    iconBackground: '#493717',
    title: 'Comprehensive\nCredit Analysis',
    description: 'Detailed insights and fast reporting to help you understand your credit standing better.',
  },
  {
    icon: 'notifications-outline' as const,
    iconColor: '#00D65B',
    iconBackground: '#0C432A',
    title: 'Real-time Alerts\n& Notifications',
    description: 'Receive instant notifications for any changes in your credit report or status.',
  },
];

export default function Index() {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_SEEN).then((seen) => {
      if (seen === 'true') router.replace('/auth');
    });
  }, []);

  const finishOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_SEEN, 'true');
    router.replace('/auth');
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    if (nextIndex !== activeIndex) setActiveIndex(nextIndex);
  };

  const goNext = () => {
    if (activeIndex === slides.length - 1) {
      finishOnboarding();
      return;
    }
    listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <FlatList
        ref={listRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.title}
        onMomentumScrollEnd={handleScroll}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={[styles.iconHalo, { backgroundColor: `${item.iconBackground}66` }]}>
              <View style={[styles.iconCircle, { backgroundColor: item.iconBackground }]}>
                <Ionicons name={item.icon} size={88} color={item.iconColor} />
              </View>
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((slide, index) => (
            <View key={slide.title} style={[styles.dot, index === activeIndex && styles.activeDot]} />
          ))}
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={goNext} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>{activeIndex === slides.length - 1 ? 'Get Started' : 'Next'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={finishOnboarding} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BACKGROUND },
  slide: { width, flex: 1, alignItems: 'center', paddingHorizontal: 36, paddingTop: 86 },
  iconHalo: {
    width: 318, height: 318, borderRadius: 159,
    alignItems: 'center', justifyContent: 'center', marginTop: 12,
  },
  iconCircle: {
    width: 262, height: 262, borderRadius: 131,
    alignItems: 'center', justifyContent: 'center',
  },
  copy: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 178 },
  title: { color: TEXT, fontSize: 42, lineHeight: 51, fontWeight: '800', textAlign: 'center' },
  description: { color: MUTED, fontSize: 22, lineHeight: 32, textAlign: 'center', marginTop: 28 },
  footer: { position: 'absolute', left: 44, right: 44, bottom: 42, alignItems: 'center' },
  dots: { flexDirection: 'row', alignItems: 'center', height: 20, marginBottom: 34, gap: 14 },
  dot: { width: 15, height: 15, borderRadius: 8, backgroundColor: '#777A83' },
  activeDot: { width: 62, backgroundColor: PRIMARY },
  primaryButton: {
    width: '100%', backgroundColor: PRIMARY, borderRadius: 28,
    paddingVertical: 19, alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  skipButton: { padding: 14 },
  skipText: { color: MUTED, fontSize: 16, fontWeight: '600' },
});
