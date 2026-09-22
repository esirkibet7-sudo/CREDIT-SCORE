import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// ─── Color Palette ────────────────────────────────────────────────────────────
const BG_TOP = '#EEF4FA';
const BG_BOTTOM = '#F5F0E8';
const ACCENT = '#2E6B9E';
const ACCENT_BRIGHT = '#1A4F7A';
const GOLD = '#B8860B';
const GOLD_LIGHT = '#C9A84C';
const TEXT_PRIMARY = '#0D1F3C';
const TEXT_SECONDARY = '#3A3A3A';
const TEXT_MUTED = '#5A6070';
const WHITE = '#FFFFFF';
const CARD_BG = 'rgba(255,255,255,0.85)';

// ─── Slide Data ───────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: 'hero',
    icon: 'shield-checkmark' as const,
    iconColor: GOLD,
    headline: 'Secure Your\nFinancial Freedom',
    body: 'Monitor your CRB status with bank-grade security and stay ahead of your financial health.',
    badge: 'Bank-Grade Security',
    badgeIcon: 'lock-closed' as const,
  },
  {
    id: 'analysis',
    icon: 'analytics' as const,
    iconColor: ACCENT_BRIGHT,
    headline: 'Comprehensive\nCredit Analysis',
    body: 'Get a 360° view of your credit profile with deep insights that help you take control of your financial future.',
    badge: 'Full Credit Overview',
    badgeIcon: 'pie-chart' as const,
  },
  {
    id: 'reporting',
    icon: 'document-text' as const,
    iconColor: '#4CAF8A',
    headline: 'Detailed & Fast\nReporting',
    body: 'Understand your credit standing better with lightning-fast, easy-to-read reports delivered right to your fingertips.',
    badge: 'Instant Reports',
    badgeIcon: 'flash' as const,
  },
];

const SLIDE_DURATION = 3000; // ms each slide is shown
const TRANSITION_DURATION = 500; // ms cross-fade

// ─── Floating Particle ────────────────────────────────────────────────────────
function Particle({ delay, x, size }: { delay: number; x: number; size: number }) {
  const translateY = useRef(new Animated.Value(height * 0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -60,
            duration: 5000 + Math.random() * 3000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.6, duration: 600, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 600, delay: 3000, useNativeDriver: true }),
          ]),
        ]),
        Animated.parallel([
          Animated.timing(translateY, { toValue: height * 0.9, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: ACCENT,
        opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

// ─── Single Slide ─────────────────────────────────────────────────────────────
function Slide({
  slide,
  anim,
}: {
  slide: (typeof SLIDES)[0];
  anim: Animated.Value;
}) {
  const iconScale = useRef(new Animated.Value(0.5)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(iconScale, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.timing(iconOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [slide.id]);

  return (
    <Animated.View style={[styles.slideContainer, { opacity: anim }]}>
      {/* Icon bubble */}
      <Animated.View
        style={[
          styles.iconBubble,
          { transform: [{ scale: iconScale }], opacity: iconOpacity },
        ]}
      >
        {/* Outer ring */}
        <View style={[styles.iconRingOuter, { borderColor: slide.iconColor + '33' }]} />
        <View style={[styles.iconRingInner, { borderColor: slide.iconColor + '66' }]} />
        <View style={[styles.iconCore, { backgroundColor: slide.iconColor + '22' }]}>
          <Ionicons name={slide.icon} size={52} color={slide.iconColor} />
        </View>
      </Animated.View>

      {/* Badge */}
      <View style={styles.badge}>
        <Ionicons name={slide.badgeIcon} size={11} color={GOLD} style={{ marginRight: 5 }} />
        <Text style={styles.badgeText}>{slide.badge}</Text>
      </View>

      {/* Text */}
      <Text style={styles.headline}>{slide.headline}</Text>
      <Text style={styles.body}>{slide.body}</Text>
    </Animated.View>
  );
}

// ─── Main Splash Screen ───────────────────────────────────────────────────────
export default function SplashScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Progress bar anims (one per slide)
  const progressAnims = useRef(SLIDES.map(() => new Animated.Value(0))).current;
  const progressRunning = useRef<Animated.CompositeAnimation | null>(null);

  // Logo entrance
  const logoY = useRef(new Animated.Value(-30)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // Glow pulse
  const glowScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.spring(logoY, { toValue: 0, friction: 6, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    // Glow pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowScale, { toValue: 1.15, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Advance slides
  useEffect(() => {
    // Reset & animate current progress bar
    progressAnims[currentIndex].setValue(0);
    progressRunning.current = Animated.timing(progressAnims[currentIndex], {
      toValue: 1,
      duration: SLIDE_DURATION,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    progressRunning.current.start(({ finished }) => {
      if (!finished) return;

      const nextIndex = currentIndex + 1;

      if (nextIndex >= SLIDES.length) {
        // All slides done → navigate to auth
        router.replace('/auth');
        return;
      }

      // Cross-fade to next slide
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: TRANSITION_DURATION / 2,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex(nextIndex);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: TRANSITION_DURATION / 2,
          useNativeDriver: true,
        }).start();
      });
    });

    return () => progressRunning.current?.stop();
  }, [currentIndex]);

  // Random particles
  const particles = useRef(
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * width,
      size: 3 + Math.random() * 5,
      delay: Math.random() * 4000,
    }))
  ).current;

  const slide = SLIDES[currentIndex];

  return (
    <View style={styles.root}>
      {/* ── Background gradient layers ── */}
      <View style={[styles.bgLayer, { backgroundColor: BG_TOP }]} />
      <View style={styles.bgCircleTop} />
      <View style={styles.bgCircleBottom} />

      {/* ── Floating particles ── */}
      {particles.map((p) => (
        <Particle key={p.id} x={p.x} size={p.size} delay={p.delay} />
      ))}

      {/* ── Logo area ── */}
      <Animated.View
        style={[
          styles.logoArea,
          { opacity: logoOpacity, transform: [{ translateY: logoY }] },
        ]}
      >
        {/* Glow ring behind logo */}
        <Animated.View style={[styles.glowRing, { transform: [{ scale: glowScale }] }]} />

        <View style={styles.logoBox}>
          <Image
            source={require('../assets/images/app-icon.jpg')}
            style={styles.logoImage}
          />
        </View>
        <Text style={styles.appName}>CRB STATUS</Text>
        <Text style={styles.appTagline}>CHECKER</Text>
      </Animated.View>

      {/* ── Divider ── */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <View style={styles.dividerDot} />
        <View style={styles.dividerLine} />
      </View>

      {/* ── Slide content ── */}
      <Slide slide={slide} anim={fadeAnim} />

      {/* ── Progress bars ── */}
      <View style={styles.progressRow}>
        {SLIDES.map((s, i) => (
          <View key={s.id} style={styles.progressTrack}>
            {i < currentIndex ? (
              // Completed — full bar
              <View style={[styles.progressFill, { width: '100%' }]} />
            ) : i === currentIndex ? (
              // Active — animated
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            ) : null}
          </View>
        ))}
      </View>

      {/* ── Dot indicators ── */}
      <View style={styles.dotsRow}>
        {SLIDES.map((s, i) => (
          <View
            key={s.id}
            style={[
              styles.dot,
              i === currentIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <Ionicons name="shield-half" size={13} color={GOLD} style={{ marginRight: 5 }} />
        <Text style={styles.footerText}>256-bit encrypted · Powered by Metropol CRB</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },

  // Backgrounds
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  bgCircleTop: {
    position: 'absolute',
    top: -120,
    right: -100,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: ACCENT + '18',
  },
  bgCircleBottom: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: GOLD + '15',
  },

  // Logo
  logoArea: {
    alignItems: 'center',
    marginTop: height * 0.08,
    marginBottom: 0,
  },
  glowRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: GOLD + '25',
    top: -10,
  },
  logoBox: {
    width: 90,
    height: 90,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: GOLD,
    shadowColor: GOLD,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  appName: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: '900',
    color: TEXT_PRIMARY,
    letterSpacing: 6,
  },
  appTagline: {
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 4,
    marginTop: 2,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    width: width * 0.6,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: TEXT_PRIMARY + '25',
  },
  dividerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: GOLD,
    marginHorizontal: 8,
  },

  // Slide
  slideContainer: {
    alignItems: 'center',
    paddingHorizontal: 28,
    flex: 1,
  },

  // Icon bubble
  iconBubble: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 130,
    height: 130,
    marginBottom: 20,
  },
  iconRingOuter: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1.5,
  },
  iconRingInner: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
  },
  iconCore: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GOLD + '22',
    borderColor: GOLD + '70',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 16,
  },
  badgeText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  // Text
  headline: {
    fontSize: 28,
    fontWeight: '900',
    color: TEXT_PRIMARY,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  body: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 23,
    maxWidth: 300,
  },

  // Progress bars
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 28,
    marginTop: 20,
    width: '100%',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: TEXT_PRIMARY + '20',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: ACCENT,
  },

  // Dots
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TEXT_PRIMARY + '30',
  },
  dotActive: {
    width: 20,
    backgroundColor: ACCENT,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: height * 0.04,
  },
  footerText: {
    fontSize: 11,
    color: TEXT_MUTED,
    letterSpacing: 0.3,
  },
});
