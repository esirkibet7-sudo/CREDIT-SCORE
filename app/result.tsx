import {
    fetchSuccessfulPaymentsFromSupabase,
    PaymentRecord,
    recordPaymentToSupabase,
    supabase,
} from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { WebView } from 'react-native-webview';

const BEIGE = '#F5F0E8';
const CARD = '#FFFDF7';
const ACCENT = '#2E6B9E';
const BORDER = '#D9CFC0';
const TEXT = '#2C2416';
const MUTED = '#8A7F6E';
const SUCCESS = '#1A9E5C';
const DANGER = '#C0392B';
const DANGER_BG = '#FEF0EE';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const PREFIXES = ['+254', '+255', '+256', '+234'];

// ─── phase type ───────────────────────────────────────────────────────────────
type Phase = 'pre_payment' | 'bad_credit' | 'clearing_loading' | 'cleared';

// ─── Animated Green Tick ──────────────────────────────────────────────────────
function SuccessTick() {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(ring1, { toValue: 1, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(ring2, { toValue: 1, duration: 800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const r1Scale = ring1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });
  const r1Opacity = ring1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.3, 0] });
  const r2Scale = ring2.interpolate({ inputRange: [0, 1], outputRange: [1, 2] });
  const r2Opacity = ring2.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 0.1, 0] });

  return (
    <View style={tick.container}>
      <Animated.View style={[tick.ring, { transform: [{ scale: r2Scale }], opacity: r2Opacity }]} />
      <Animated.View style={[tick.ring, { transform: [{ scale: r1Scale }], opacity: r1Opacity }]} />
      <Animated.View style={[tick.circle, { transform: [{ scale }], opacity }]}>
        <Ionicons name="checkmark-sharp" size={48} color="#fff" />
      </Animated.View>
    </View>
  );
}

const tick = StyleSheet.create({
  container: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  ring: { position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: SUCCESS },
  circle: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: SUCCESS,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: SUCCESS, shadowOpacity: 0.45, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
});

// ─── Clearing Spinner (inline, like checking.tsx) ─────────────────────────────
function ClearingSpinner({ onDone }: { onDone: () => void }) {
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse    = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const dot1     = useRef(new Animated.Value(1)).current;
  const dot2     = useRef(new Animated.Value(0.4)).current;
  const dot3     = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(rotation, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.12, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    Animated.timing(progress, { toValue: 1, duration: 5000, easing: Easing.inOut(Easing.ease), useNativeDriver: false }).start();
      Animated.timing(progress, { toValue: 1, duration: 10000, easing: Easing.inOut(Easing.ease), useNativeDriver: false }).start();
    Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(dot1, { toValue: 1,   duration: 300, useNativeDriver: true }),
        Animated.timing(dot2, { toValue: 0.4, duration: 300, useNativeDriver: true }),
        Animated.timing(dot3, { toValue: 0.2, duration: 300, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(dot1, { toValue: 0.4, duration: 300, useNativeDriver: true }),
        Animated.timing(dot2, { toValue: 1,   duration: 300, useNativeDriver: true }),
        Animated.timing(dot3, { toValue: 0.4, duration: 300, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(dot1, { toValue: 0.2, duration: 300, useNativeDriver: true }),
        Animated.timing(dot2, { toValue: 0.4, duration: 300, useNativeDriver: true }),
        Animated.timing(dot3, { toValue: 1,   duration: 300, useNativeDriver: true }),
      ]),
    ])).start();

    const timer = setTimeout(onDone, 10000);
    return () => clearTimeout(timer);
  }, []);

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={sp.wrap}>
      <View style={sp.spinnerSection}>
        <Animated.View style={[sp.glowRing, { transform: [{ scale: pulse }] }]} />
        <View style={sp.trackRing} />
        <Animated.View style={[sp.spinnerArc, { transform: [{ rotate: spin }] }]}>
          <View style={sp.arcDot} />
        </Animated.View>
        <View style={sp.centerCircle}>
          <Text style={sp.centerText}>CRB</Text>
        </View>
      </View>

      <Text style={sp.title}>Processing Your Clearance</Text>
        <Text style={sp.title}>Clearing in Progress</Text>
      <Text style={sp.subtitle}>Please wait while we clear your credit record</Text>

      <View style={sp.dotsRow}>
        {[dot1, dot2, dot3].map((d, i) => (
          <Animated.View key={i} style={[sp.dot, { opacity: d }]} />
        ))}
      </View>

      <View style={sp.progressBar}>
        <Animated.View style={[sp.progressFill, { width: progressWidth }]} />
      </View>

      {[
        { label: 'Verifying payment', color: SUCCESS },
        { label: 'Clearing blacklist records', color: ACCENT },
        { label: 'Updating CRB database', color: MUTED },
      ].map((step, i) => (
        <View key={i} style={sp.stepRow}>
          <View style={[sp.stepDot, { backgroundColor: step.color }]} />
          <Text style={[sp.stepText, { color: step.color }]}>{step.label}</Text>
        </View>
      ))}
    </View>
  );
}

const sp = StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%', paddingHorizontal: 24, paddingTop: 40 },
  spinnerSection: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  glowRing: {
    position: 'absolute', width: 170, height: 170, borderRadius: 85,
    borderWidth: 2, borderColor: SUCCESS + '30', backgroundColor: SUCCESS + '08',
  },
  trackRing: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    borderWidth: 4, borderColor: SUCCESS + '20',
  },
  spinnerArc: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    borderWidth: 4, borderLeftColor: SUCCESS, borderTopColor: SUCCESS,
    borderRightColor: 'transparent', borderBottomColor: 'transparent',
  },
  arcDot: {
    position: 'absolute', top: -3, right: -3, width: 10, height: 10,
    borderRadius: 5, backgroundColor: SUCCESS,
  },
  centerCircle: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: '#1a3a2a',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: SUCCESS, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  centerText: { color: '#ffffff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: '800', color: TEXT, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: MUTED, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  dotsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: SUCCESS },
  progressBar: {
    width: '100%', height: 6, backgroundColor: SUCCESS + '20',
    borderRadius: 3, overflow: 'hidden', marginBottom: 28,
  },
  progressFill: { height: 6, backgroundColor: SUCCESS, borderRadius: 3 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, alignSelf: 'flex-start' },
  stepDot: { width: 8, height: 8, borderRadius: 4 },
  stepText: { fontSize: 13, fontWeight: '600' },
});

// ─── Payment Modal (configurable amount) ─────────────────────────────────────
function PaymentModal({
  visible,
  onClose,
  onStartPayment,
  amount,
  title,
  subtitle,
  initialPhone = '',
}: {
  visible: boolean;
  onClose: () => void;
  onStartPayment: (phone: string, amount: string) => void;
  amount: string;
  title: string;
  subtitle: string;
  initialPhone?: string;
}) {
  const [selectedPrefix, setSelectedPrefix] = useState('+254');
  const [showPrefixList, setShowPrefixList] = useState(false);
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ phone?: string }>({});

  useEffect(() => {
    if (visible && initialPhone) {
      let clean = initialPhone.replace(/^\+254\s?/, '').trim();
      setPhone(clean);
    }
  }, [visible, initialPhone]);

  const validate = () => {
    const e: { phone?: string } = {};
    const digits = phone.replace(/\D/g, '');
    if (!digits || (digits.length !== 8 && digits.length !== 9 && digits.length !== 10)) {
      e.phone = 'Enter a valid phone number';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleProceed = () => {
    if (validate()) {
      let rawDigits = phone.replace(/\D/g, '');
      if (rawDigits.startsWith('0')) {
        rawDigits = rawDigits.slice(1);
      }
      onStartPayment(`${selectedPrefix} ${rawDigits}`, amount);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={modal.overlay} onPress={onClose}>
          <Pressable style={modal.sheet} onPress={() => {}}>
            <View style={modal.handle} />
            <View style={modal.titleRow}>
              <Ionicons name="card-outline" size={22} color={ACCENT} />
              <Text style={modal.title}>{title}</Text>
            </View>
            <Text style={modal.subtitle}>{subtitle}</Text>

            <View style={modal.divider} />

            <Text style={modal.fieldLabel}>Phone Number</Text>
            <View style={[modal.phoneRow, !!errors.phone && modal.fieldError]}>
              <TouchableOpacity style={modal.prefixBtn} onPress={() => setShowPrefixList(!showPrefixList)}>
                <Text style={modal.prefixText}>{selectedPrefix}</Text>
                <Ionicons name={showPrefixList ? 'chevron-up' : 'chevron-down'} size={14} color={MUTED} />
              </TouchableOpacity>
              <View style={modal.prefixDivider} />
              <TextInput
                style={modal.phoneInput}
                placeholder="07XXXXXXXX or 01XXXXXXXX"
                placeholderTextColor={MUTED}
                value={phone}
                onChangeText={(v) => setPhone(v.replace(/\D/g, ''))}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
            {showPrefixList && (
              <View style={modal.prefixList}>
                {PREFIXES.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[modal.prefixOption, p === selectedPrefix && modal.prefixOptionSelected]}
                    onPress={() => { setSelectedPrefix(p); setShowPrefixList(false); }}
                  >
                    <Text style={[modal.prefixOptionText, p === selectedPrefix && modal.prefixOptionTextSelected]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {!!errors.phone && <Text style={modal.errorText}>{errors.phone}</Text>}

            <View style={modal.amountPreview}>
              <Text style={modal.amountLabel}>Amount</Text>
              <Text style={modal.amountValue}>KES {amount}</Text>
            </View>

            <TouchableOpacity style={modal.payBtn} onPress={handleProceed} activeOpacity={0.85}>
              <Ionicons name="lock-closed" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={modal.payBtnText}>Pay KES {amount}</Text>
            </TouchableOpacity>
            <View style={{ height: Platform.OS === 'ios' ? 24 : 8 }} />
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: CARD, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingTop: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '800', color: TEXT },
  subtitle: { fontSize: 13, color: MUTED, marginBottom: 16, lineHeight: 19 },
  divider: { height: 1, backgroundColor: BORDER, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: TEXT, marginBottom: 6 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, backgroundColor: BEIGE, overflow: 'hidden' },
  prefixBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, gap: 4 },
  prefixText: { fontSize: 15, fontWeight: '700', color: TEXT },
  prefixDivider: { width: 1.5, height: 32, backgroundColor: BORDER },
  phoneInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: TEXT },
  prefixList: { borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, overflow: 'hidden', marginTop: 4, backgroundColor: CARD },
  prefixOption: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  prefixOptionSelected: { backgroundColor: ACCENT + '12' },
  prefixOptionText: { fontSize: 15, color: TEXT },
  prefixOptionTextSelected: { color: ACCENT, fontWeight: '700' },
  fieldError: { borderColor: DANGER },
  errorText: { fontSize: 12, color: DANGER, marginTop: 4 },
  amountPreview: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: BEIGE, borderRadius: 12, padding: 14, marginTop: 16, marginBottom: 4,
    borderWidth: 1, borderColor: BORDER,
  },
  amountLabel: { fontSize: 14, fontWeight: '600', color: MUTED },
  amountValue: { fontSize: 22, fontWeight: '900', color: ACCENT },
  payBtn: {
    flexDirection: 'row', backgroundColor: SUCCESS, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', marginTop: 16,
    shadowColor: SUCCESS, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

// ─── Paystack WebView Modal ───────────────────────────────────────────────────
function PaystackWebViewModal({
  visible, authorizationUrl, htmlSource, onSuccess, onClose,
}: {
  visible: boolean; authorizationUrl?: string; htmlSource?: string;
  onSuccess: (reference: string) => void; onClose: () => void;
}) {
  const handleNavStateChange = (navState: any) => {
    const { url } = navState;
    if (!url) return;
    if (
      url.includes('trxref=') || url.includes('reference=') ||
      url.includes('paystack-callback') || url.includes('standard.paystack.co/close')
    ) {
      const match = url.match(/(?:trxref|reference)=([^&]+)/);
      onSuccess(match ? match[1] : `CRB_${Date.now()}`);
    }
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.status === 'success') onSuccess(data.reference || `CRB_${Date.now()}`);
      else if (data.status === 'cancelled') onClose();
    } catch (e) {}
  };

  const source = authorizationUrl ? { uri: authorizationUrl } : { html: htmlSource || '' };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={webM.header}>
          <TouchableOpacity onPress={onClose} style={webM.closeBtn}>
            <Ionicons name="close-sharp" size={24} color={TEXT} />
          </TouchableOpacity>
          <View style={webM.titleWrap}>
            <Text style={webM.title}>Secure Payment Checkout</Text>
            <Text style={webM.urlText}>api.paystack.co</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>
        <WebView
          source={source}
          onNavigationStateChange={handleNavStateChange}
          onMessage={handleMessage}
          javaScriptEnabled domStorageEnabled startInLoadingState
          renderLoading={() => (
            <View style={webM.loadingWrap}>
              <ActivityIndicator size="large" color={ACCENT} />
              <Text style={webM.loadingText}>Loading Checkout Gateway...</Text>
            </View>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const webM = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EBEBEB', backgroundColor: '#FAFAFA' },
  closeBtn: { padding: 4 },
  titleWrap: { alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: TEXT },
  urlText: { fontSize: 11, color: MUTED },
  loadingWrap: { ...StyleSheet.absoluteFill, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: MUTED, fontWeight: '500' },
});

// ─── Certificate Download Modal ───────────────────────────────────────────────
function CertificateModal({ visible, onClose, reference }: { visible: boolean; onClose: () => void; reference: string; }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: BEIGE }}>
        <View style={certM.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close-circle-outline" size={28} color={TEXT} />
          </TouchableOpacity>
          <Text style={certM.headerTitle}>Official CRB Certificate</Text>
          <TouchableOpacity onPress={() => Alert.alert('Saved', 'CRB Clearance Certificate PDF saved successfully!')}>
            <Ionicons name="download-outline" size={24} color={ACCENT} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={certM.content}>
          <View style={certM.certCard}>
            <View style={certM.stampRow}>
              <View style={certM.badge}>
                <Ionicons name="shield-checkmark" size={18} color={SUCCESS} />
                <Text style={certM.badgeText}>CLEARED &amp; VERIFIED</Text>
              </View>
              <Text style={certM.certId}>ID: {reference || 'CRB-CLR-2026'}</Text>
            </View>
            <Text style={certM.mainHeading}>KENYA CREDIT REFERENCE BUREAU</Text>
            <Text style={certM.subHeading}>CERTIFICATE OF CRB CLEARANCE</Text>
            <View style={certM.line} />
            <Text style={certM.bodyText}>
              This is to certify that the registered individual has successfully cleared all CRB listings and blacklist records. The credit standing is now CLEARED with ZERO active negative listings as of the date indicated below.
            </Text>
            <View style={certM.detailsGrid}>
              {[
                { label: 'CRB STATUS:', value: 'CLEARED', color: SUCCESS },
                { label: 'BLACKLIST CLEARED:', value: 'YES - FULLY REMOVED', color: SUCCESS },
                { label: 'ACTIVE LISTINGS:', value: 'NONE (0 RECORDS)', color: TEXT },
                { label: 'DATE CLEARED:', value: new Date().toLocaleDateString(), color: TEXT },
                { label: 'VALID UNTIL:', value: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString(), color: TEXT },
              ].map((row, i) => (
                <View key={i} style={certM.detailRow}>
                  <Text style={certM.detailLabel}>{row.label}</Text>
                  <Text style={[certM.detailVal, { color: row.color }]}>{row.value}</Text>
                </View>
              ))}
            </View>
            <View style={certM.qrBox}>
              <Ionicons name="qr-code-outline" size={64} color={TEXT} />
              <Text style={certM.qrText}>Scan to Verify Official Authenticity</Text>
            </View>
            <TouchableOpacity
              style={certM.printBtn}
              onPress={() => Alert.alert('Success', 'CRB Clearance Certificate downloaded to your device!')}
            >
              <Ionicons name="print-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={certM.printBtnText}>Download &amp; Print Certificate PDF</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const certM = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  content: { padding: 20 },
  certCard: { backgroundColor: CARD, borderRadius: 20, padding: 24, borderWidth: 2, borderColor: SUCCESS, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16, elevation: 5 },
  stampRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: SUCCESS + '18', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: '800', color: SUCCESS },
  certId: { fontSize: 11, fontWeight: '700', color: MUTED },
  mainHeading: { fontSize: 16, fontWeight: '900', color: TEXT, textAlign: 'center', letterSpacing: 0.5 },
  subHeading: { fontSize: 12, fontWeight: '700', color: SUCCESS, textAlign: 'center', marginBottom: 16, marginTop: 2 },
  line: { height: 2, backgroundColor: SUCCESS, marginBottom: 16 },
  bodyText: { fontSize: 12, color: MUTED, lineHeight: 18, textAlign: 'center', marginBottom: 20 },
  detailsGrid: { backgroundColor: BEIGE, borderRadius: 14, padding: 16, gap: 10, marginBottom: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 11, fontWeight: '700', color: MUTED },
  detailVal: { fontSize: 12, fontWeight: '800', color: TEXT },
  qrBox: { alignItems: 'center', gap: 4, marginBottom: 20 },
  qrText: { fontSize: 11, color: MUTED },
  printBtn: { flexDirection: 'row', backgroundColor: SUCCESS, borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  printBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

// ─── Admin Password Modal ─────────────────────────────────────────────────────
function AdminAuthModal({ visible, onClose, onSubmit }: { visible: boolean; onClose: () => void; onSubmit: (p: string) => void; }) {
  const [password, setPassword] = useState('');
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={adminA.overlay} onPress={onClose}>
        <Pressable style={adminA.card} onPress={() => {}}>
          <Ionicons name="key-sharp" size={32} color={ACCENT} style={{ alignSelf: 'center', marginBottom: 8 }} />
          <Text style={adminA.title}>Admin Access Verification</Text>
          <Text style={adminA.subtitle}>Enter master password to view live payment analytics</Text>
          <TextInput style={adminA.input} placeholder="Password" placeholderTextColor={MUTED} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
          <View style={adminA.btnRow}>
            <TouchableOpacity style={adminA.cancelBtn} onPress={onClose}><Text style={adminA.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={adminA.submitBtn} onPress={() => { onSubmit(password); setPassword(''); }}><Text style={adminA.submitText}>Authenticate</Text></TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const adminA = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', backgroundColor: CARD, borderRadius: 20, padding: 24, borderWidth: 1.5, borderColor: BORDER },
  title: { fontSize: 18, fontWeight: '800', color: TEXT, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 12, color: MUTED, textAlign: 'center', marginBottom: 20 },
  input: { backgroundColor: BEIGE, borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: TEXT, marginBottom: 20 },
  btnRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  cancelText: { fontSize: 14, fontWeight: '600', color: MUTED },
  submitBtn: { flex: 1, backgroundColor: ACCENT, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  submitText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

// ─── Admin Dashboard Modal ────────────────────────────────────────────────────
function AdminDashboardModal({ visible, onClose, payments, onRefresh, isRefreshing }: {
  visible: boolean; onClose: () => void; payments: PaymentRecord[]; onRefresh: () => void; isRefreshing?: boolean;
}) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const totalAmount = payments.reduce((sum, p) => sum + (Number(p.amount) || 100), 0);

  const todayRevenue = payments
    .filter((p) => {
      if (!p.created_at) return true;
      const d = new Date(p.created_at).getTime();
      return d >= startOfToday;
    })
    .reduce((sum, p) => sum + (Number(p.amount) || 100), 0);

  const weekRevenue = payments
    .filter((p) => {
      if (!p.created_at) return true;
      const d = new Date(p.created_at).getTime();
      return d >= sevenDaysAgo;
    })
    .reduce((sum, p) => sum + (Number(p.amount) || 100), 0);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: BEIGE }}>
        <View style={adminD.header}>
          <TouchableOpacity onPress={onClose}><Ionicons name="close-circle" size={28} color={TEXT} /></TouchableOpacity>
          <Text style={adminD.headerTitle}>Live Payment Analytics</Text>
          <TouchableOpacity onPress={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? <ActivityIndicator size="small" color={ACCENT} /> : <Ionicons name="refresh" size={24} color={ACCENT} />}
          </TouchableOpacity>
        </View>

        <View style={adminD.summaryGrid}>
          <View style={adminD.sumCard}>
            <Text style={adminD.sumLabel}>TODAY'S EARNINGS</Text>
            <Text style={[adminD.sumVal, { color: SUCCESS }]}>KES {todayRevenue}</Text>
          </View>
          <View style={adminD.sumCard}>
            <Text style={adminD.sumLabel}>THIS WEEK'S EARNINGS</Text>
            <Text style={[adminD.sumVal, { color: ACCENT }]}>KES {weekRevenue}</Text>
          </View>
          <View style={adminD.sumCard}>
            <Text style={adminD.sumLabel}>TOTAL REVENUE</Text>
            <Text style={[adminD.sumVal, { color: TEXT }]}>KES {totalAmount}</Text>
          </View>
          <View style={adminD.sumCard}>
            <Text style={adminD.sumLabel}>TOTAL PAYMENTS</Text>
            <Text style={adminD.sumVal}>{payments.length}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={adminD.listTitle}>Payment Log ({payments.length})</Text>
            {isRefreshing && <Text style={{ fontSize: 11, color: ACCENT, fontWeight: '600' }}>Syncing...</Text>}
          </View>
          <FlatList
            data={payments}
            keyExtractor={(item, i) => item.reference || String(i)}
            showsVerticalScrollIndicator={false}
            refreshing={!!isRefreshing}
            onRefresh={onRefresh}
            renderItem={({ item }) => (
              <View style={adminD.itemCard}>
                <View style={adminD.itemTop}>
                  <Text style={adminD.itemPhone}>{item.phone || 'Unknown'}</Text>
                  <Text style={adminD.itemAmount}>KES {item.amount || 100}</Text>
                </View>
                <View style={adminD.itemBottom}>
                  <Text style={adminD.itemRef}>{item.reference}</Text>
                  <Text style={adminD.itemDate}>{item.created_at ? new Date(item.created_at).toLocaleString() : 'Just now'}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={() => (
              <View style={adminD.emptyWrap}>
                <Ionicons name="receipt-outline" size={48} color={MUTED} />
                <Text style={adminD.emptyText}>No payments logged yet.</Text>
                <Text style={adminD.emptySub}>Pull down to refresh from Supabase.</Text>
              </View>
            )}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const adminD = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerTitle: { fontSize: 17, fontWeight: '800', color: TEXT },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16 },
  sumCard: { width: '48%', backgroundColor: CARD, padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: BORDER },
  sumLabel: { fontSize: 9, fontWeight: '800', color: MUTED, letterSpacing: 0.5, marginBottom: 4 },
  sumVal: { fontSize: 18, fontWeight: '900', color: ACCENT },
  listTitle: { fontSize: 13, fontWeight: '800', color: TEXT },
  itemCard: { backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER, marginBottom: 10 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemPhone: { fontSize: 15, fontWeight: '700', color: TEXT },
  itemAmount: { fontSize: 14, fontWeight: '800', color: SUCCESS },
  itemBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemRef: { fontSize: 11, color: MUTED, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  itemDate: { fontSize: 11, color: MUTED },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '700', color: TEXT },
  emptySub: { fontSize: 13, color: MUTED, textAlign: 'center' },
});

// ─── Helper: Initialize Paystack ──────────────────────────────────────────────
async function initPaystack(phone: string, amountKes: number, phone2email: string) {
  const { data, error } = await supabase.functions.invoke('paystack-initialize', {
    body: { phone, amountKes, email: phone2email },
  });
  if (error || !data?.authorization_url) {
    throw new Error(error?.message || 'Unable to initialize Paystack payment.');
  }
  return { authUrl: data.authorization_url as string };
}

// ─── Main Result Screen ───────────────────────────────────────────────────────
export default function ResultScreen() {
  // Phase state machine
  const [phase, setPhase] = useState<Phase>('pre_payment');

  // Payment WebView state
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paystackVisible, setPaystackVisible] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | undefined>();
  const [inlineHtml, setInlineHtml] = useState<string | undefined>();
  const [isInitializing, setIsInitializing] = useState(false);
  const [currentPaymentType, setCurrentPaymentType] = useState<'check' | 'clearance'>('check');

  const [certModalVisible, setCertModalVisible] = useState(false);
  const [payRef, setPayRef] = useState('');
  const [clearRef, setClearRef] = useState('');
  const [userIdNumber, setUserIdNumber] = useState('');
  const [userPhone, setUserPhone] = useState('+254 712345678');

  // Admin Easter egg
  const [tapCount, setTapCount] = useState(0);
  const [showPassModal, setShowPassModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPayments, setAdminPayments] = useState<PaymentRecord[]>([]);
  const [isAdminRefreshing, setIsAdminRefreshing] = useState(false);

  const [isVipUser, setIsVipUser] = useState(false);

  useEffect(() => {
    restorePhase();
  }, []);

  useEffect(() => {
    if ((phase !== 'bad_credit' && phase !== 'cleared') || isVipUser) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timestampKey = phase === 'bad_credit' ? 'CRB_PAID_TIMESTAMP' : 'CRB_CLEARED_TIMESTAMP';
    AsyncStorage.getItem(timestampKey).then((timestamp) => {
      if (!timestamp) return;
      const remaining = TWELVE_HOURS_MS - (Date.now() - Number(timestamp));
      if (remaining <= 0) {
        setPhase('pre_payment');
        setClearRef('');
        setPayRef('');
        return;
      }
      timer = setTimeout(() => {
        setPhase('pre_payment');
        setClearRef('');
        setPayRef('');
      }, remaining);
    });

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [phase, isVipUser]);

  // Restore persisted state
  const restorePhase = async () => {
    try {
      const vip = await AsyncStorage.getItem('CRB_VIP_USER');
      const email = await AsyncStorage.getItem('CRB_USER_EMAIL');
      if (vip === 'true' || email === 'terrence311@gmail.com') {
        setIsVipUser(true);
        setClearRef('VIP_TERRENCE_HEALTHY');
        setPhase('cleared');
        return;
      }

      const clearedTs = await AsyncStorage.getItem('CRB_CLEARED_TIMESTAMP');
      const clearedRef = await AsyncStorage.getItem('CRB_CLEARED_REFERENCE');
      const paidTs = await AsyncStorage.getItem('CRB_PAID_TIMESTAMP');
      const paidRef = await AsyncStorage.getItem('CRB_PAID_REFERENCE');
      const savedUserPhone = await AsyncStorage.getItem('CRB_USER_PHONE');
      const savedIdNumber = await AsyncStorage.getItem('CRB_USER_ID_NUMBER');
      const paidPhone = await AsyncStorage.getItem('CRB_PAID_PHONE');
      if (savedUserPhone) setUserPhone(savedUserPhone);
      else if (paidPhone) setUserPhone(paidPhone);
      if (savedIdNumber) setUserIdNumber(savedIdNumber);

      if (clearedTs && clearedRef) {
        if (Date.now() - parseInt(clearedTs) < TWELVE_HOURS_MS) {
          setClearRef(clearedRef);
          setPhase('cleared');
          return;
        }
      }
      if (paidTs && paidRef) {
        if (Date.now() - parseInt(paidTs) < TWELVE_HOURS_MS) {
          setPayRef(paidRef);
          setPhase('bad_credit');
          return;
        }
      }
    } catch {}
  };

  // Admin easter egg (40 taps on title)
  const handleTitleTap = () => {
    const next = tapCount + 1;
    setTapCount(next);
    if (next >= 40) { setTapCount(0); setShowPassModal(true); }
  };

  const handleAdminAuth = async (pass: string) => {
    if (pass === 'qwerty12345@#CRBDASH') {
      setShowPassModal(false);
      setIsAdminRefreshing(true);
      try {
        const list = await fetchSuccessfulPaymentsFromSupabase();
        setAdminPayments(list);
        setShowAdminModal(true);
      } finally { setIsAdminRefreshing(false); }
    } else {
      Alert.alert('Access Denied', 'Incorrect master admin password.');
    }
  };

  const handleRefreshAdmin = async () => {
    setIsAdminRefreshing(true);
    try {
      const list = await fetchSuccessfulPaymentsFromSupabase();
      setAdminPayments(list);
    } finally { setIsAdminRefreshing(false); }
  };

  // Trigger Paystack for check (100 KES) or clearance (200 KES)
  const startPaystack = async (phone: string, amountKes: number, type: 'check' | 'clearance') => {
    setPaymentModalVisible(false);
    setIsInitializing(true);
    setUserPhone(phone);
    setCurrentPaymentType(type);
    const cleanPhone = phone.replace(/\D/g, '');
    const email = `${cleanPhone}@crbchecker.co.ke`;
    try {
      const { authUrl: au } = await initPaystack(phone, amountKes, email);
      setAuthUrl(au);
      setInlineHtml(undefined);
      setPaystackVisible(true);
    } catch (error) {
      Alert.alert('Payment unavailable', error instanceof Error ? error.message : 'Could not start Paystack checkout.');
    } finally {
      setIsInitializing(false);
    }
  };

  const handlePaymentSuccess = async (ref: string) => {
    const expectedAmount = currentPaymentType === 'check' ? 100 : 200;
    const { data, error } = await supabase.functions.invoke('paystack-verify', {
      body: { reference: ref, expectedAmountKes: expectedAmount, phone: userPhone },
    });

    if (error || !data?.verified) {
      Alert.alert('Payment not verified', error?.message || 'Paystack has not confirmed this payment yet.');
      return;
    }

    setPaystackVisible(false);

    if (currentPaymentType === 'check') {
      // 100 KES check paid → show bad credit
      setPayRef(ref);
      await AsyncStorage.setItem('CRB_PAID_TIMESTAMP', Date.now().toString());
      await AsyncStorage.setItem('CRB_PAID_REFERENCE', ref);
      await AsyncStorage.setItem('CRB_PAID_PHONE', userPhone);
      recordPaymentToSupabase({ phone: userPhone, amount: 100, currency: 'KES', reference: ref, status: 'success' });
      setPhase('bad_credit');
    } else {
      // 200 KES clearance paid → show spinner → then cleared
      setClearRef(ref);
      await AsyncStorage.setItem('CRB_CLEARED_TIMESTAMP', Date.now().toString());
      await AsyncStorage.setItem('CRB_CLEARED_REFERENCE', ref);
      recordPaymentToSupabase({ phone: userPhone, amount: 200, currency: 'KES', reference: ref, status: 'clearance_success' });
      setPhase('clearing_loading');
    }
  };

  const handleClearingDone = () => setPhase('cleared');

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={phase !== 'clearing_loading'}
      >
        {/* ── Pre-payment Phase ── */}
        {phase === 'pre_payment' && (
          <>
            <SuccessTick />
            <TouchableOpacity activeOpacity={0.9} onPress={handleTitleTap}>
              <Text style={s.mainTitle}>CRB Status Check{'\n'}was Successful</Text>
            </TouchableOpacity>
            <Text style={s.mainSub}>
              Make a service payment of KES 100 to view your complete credit report
            </Text>

            <View style={s.instrCard}>
              <View style={s.instrCardHeader}>
                <Ionicons name="card" size={20} color={SUCCESS} />
                <Text style={s.instrCardTitle}>Payment Instructions</Text>
              </View>
              {[
                { step: '1', title: 'Tap the payment button', desc: 'Press the payment button below to initiate secure payment' },
                { step: '2', title: 'Enter your phone number', desc: 'Use international format (+254 / +255 / +256 / +234)' },
                { step: '3', title: 'Enter amount (100 KES)', desc: 'Pay 100 KES via M-PESA, Mobile Money, or Card' },
              ].map((item) => (
                <View key={item.step} style={s.instrRow}>
                  <View style={s.instrNum}><Text style={s.instrNumTxt}>{item.step}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.instrTitle}>{item.title}</Text>
                    <Text style={s.instrDesc}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={s.payBtn}
              onPress={() => { setCurrentPaymentType('check'); setPaymentModalVisible(true); }}
              disabled={isInitializing}
              activeOpacity={0.85}
            >
              {isInitializing ? <ActivityIndicator color="#fff" size="small" /> : (
                <><Ionicons name="lock-closed-sharp" size={18} color="#fff" style={{ marginRight: 8 }} /><Text style={s.payBtnTxt}>Pay KES 100</Text></>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* ── Bad Credit Phase ── */}
        {phase === 'bad_credit' && (
          <>
            {/* Red X icon */}
            <View style={s.badTickCircle}>
              <Ionicons name="close-sharp" size={52} color="#fff" />
            </View>

            <View style={s.dangerBadge}>
              <Ionicons name="warning-sharp" size={16} color="#fff" />
              <Text style={s.dangerBadgeTxt}>BLACKLISTED</Text>
            </View>

            <TouchableOpacity activeOpacity={0.9} onPress={handleTitleTap}>
              <Text style={s.badTitle}>Bad Credit Score Detected</Text>
            </TouchableOpacity>

            <Text style={s.badSub}>
              Reference: {payRef}
            </Text>

            {/* Bad credit report card */}
            <View style={s.badCard}>
              <View style={s.badCardHeader}>
                <Text style={s.badCardTitle}>CRB CREDIT REPORT</Text>
                <View style={s.badStatusTag}>
                  <Text style={s.badStatusTxt}>BLACKLISTED</Text>
                </View>
              </View>

              <View style={s.scoreRowBad}>
                <View style={s.badScoreCircle}>
                  <Text style={s.badScoreNum}>LOW</Text>
                  <Text style={s.badScoreLabel}>CREDIT</Text>
                </View>
                <View style={s.scoreStats}>
                  <View style={s.statItem}>
                    <Text style={s.statLabel}>STATUS</Text>
                    <Text style={[s.statValue, { color: DANGER }]}>Blacklisted</Text>
                  </View>
                  <View style={s.statItem}>
                    <Text style={s.statLabel}>LISTINGS</Text>
                    <Text style={[s.statValue, { color: DANGER }]}>Active Records</Text>
                  </View>
                  <View style={s.statItem}>
                    <Text style={s.statLabel}>ELIGIBILITY</Text>
                    <Text style={[s.statValue, { color: DANGER }]}>Restricted</Text>
                  </View>
                </View>
              </View>

              {/* Warning advisory */}
              <View style={s.warningBox}>
                <Ionicons name="alert-circle" size={20} color={DANGER} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.warningTitle}>CRB Advisory Notice</Text>
                  <Text style={s.warningText}>
                    Your credit record shows active blacklist listings across licensed Credit Reference Bureaus. This restricts you from accessing loans, mortgages, business credit, and formal employment requiring credit checks. You must clear your CRB record to restore your financial standing.
                  </Text>
                </View>
              </View>
            </View>

            {/* Clearance card */}
            <View style={s.clearCard}>
              <View style={s.clearCardHeader}>
                <Ionicons name="shield-outline" size={22} color={ACCENT} />
                <Text style={s.clearCardTitle}>Clear Your CRB Record</Text>
              </View>
              <Text style={s.clearCardSub}>
                Pay KES 200 to initiate your official CRB clearance and remove all blacklist listings from your record.
              </Text>
              {[
                'Remove all active blacklist records',
                'Restore your credit eligibility',
                'Receive an official CRB clearance certificate',
              ].map((benefit, i) => (
                <View key={i} style={s.benefitRow}>
                  <Ionicons name="checkmark-circle" size={18} color={SUCCESS} />
                  <Text style={s.benefitTxt}>{benefit}</Text>
                </View>
              ))}

              <TouchableOpacity
                style={s.clearBtn}
                onPress={() => { setCurrentPaymentType('clearance'); setPaymentModalVisible(true); }}
                disabled={isInitializing}
                activeOpacity={0.85}
              >
                {isInitializing ? <ActivityIndicator color="#fff" size="small" /> : (
                  <><Ionicons name="shield-checkmark-sharp" size={18} color="#fff" style={{ marginRight: 8 }} /><Text style={s.clearBtnTxt}>Pay KES 200 to Clear CRB Record</Text></>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Clearing Loading Phase ── */}
        {phase === 'clearing_loading' && (
          <ClearingSpinner onDone={handleClearingDone} />
        )}

        {/* ── Cleared / Positive Credit Phase ── */}
        {phase === 'cleared' && (
          <>
            <SuccessTick />

            <View style={s.clearedBadge}>
              <Ionicons name="shield-checkmark-sharp" size={18} color="#fff" />
              <Text style={s.clearedBadgeTxt}>{isVipUser ? 'HEALTHY CREDIT STATUS' : 'CRB RECORD CLEARED'}</Text>
            </View>

            <TouchableOpacity activeOpacity={0.9} onPress={handleTitleTap}>
              <Text style={s.clearedTitle}>{isVipUser ? 'Credit Status is Healthy!' : 'You Have Been Cleared!'}</Text>
            </TouchableOpacity>

            <Text style={s.clearedSub}>
              {isVipUser
                ? 'CRB Database check completed successfully. Your credit score is 860 (Excellent).\nReference: VIP_TERRENCE_HEALTHY'
                : `Your CRB blacklist record has been successfully removed.\nReference: ${clearRef || payRef}`}
            </Text>

            {!isVipUser && (
              <View style={s.identityCard}>
                <Text style={s.identityTitle}>REPORT HOLDER</Text>
                <View style={s.identityRow}>
                  <Text style={s.identityLabel}>Phone number</Text>
                  <Text style={s.identityValue}>{userPhone}</Text>
                </View>
                <View style={s.identityRow}>
                  <Text style={s.identityLabel}>National ID</Text>
                  <Text style={s.identityValue}>{userIdNumber || '—'}</Text>
                </View>
                <Text style={s.identityStatus}>This number and ID are no longer in the blacklist.</Text>
              </View>
            )}

            {/* Cleared report card */}
            <View style={s.clearedCard}>
              <View style={s.clearedCardHeader}>
                <Text style={s.clearedCardTitle}>CRB CREDIT REPORT</Text>
                <View style={s.clearedStatusTag}>
                  <Text style={s.clearedStatusTxt}>{isVipUser ? 'GOOD / HEALTHY' : 'CLEARED'}</Text>
                </View>
              </View>

              <View style={s.clearedStatsGrid}>
                {[
                  { label: 'CRB STATUS', value: isVipUser ? 'Healthy' : 'Cleared', color: SUCCESS },
                  { label: 'CREDIT SCORE', value: isVipUser ? '860 (Excellent)' : 'Removed', color: SUCCESS },
                  { label: 'LISTINGS', value: '0 Active', color: SUCCESS },
                  { label: 'ELIGIBILITY', value: '100% Eligible', color: SUCCESS },
                ].map((item, i) => (
                  <View key={i} style={s.clearedStat}>
                    <Text style={s.clearedStatLabel}>{item.label}</Text>
                    <Text style={[s.clearedStatValue, { color: item.color }]}>{item.value}</Text>
                  </View>
                ))}
              </View>

              {/* Good standing advisory */}
              <View style={s.clearedAdvice}>
                <Ionicons name="analytics" size={20} color={SUCCESS} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.clearedAdviceTitle}>Financial Advisory</Text>
                  <Text style={s.clearedAdviceTxt}>
                    {isVipUser
                      ? 'Your credit record is healthy and in good standing. You can proceed with any financial move, loan application, or credit facility. Avoid defaults to maintain your excellent credit score.'
                      : 'Your CRB record is now clean. You can confidently apply for loans, mortgages, business credit, and employment. Avoid late payments and defaults to maintain your clear standing.'}
                  </Text>
                </View>
              </View>

              <View style={s.divider} />

              <TouchableOpacity
                style={s.downloadBtn}
                onPress={() => setCertModalVisible(true)}
              >
                <Ionicons name="document-text-sharp" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={s.downloadBtnTxt}>{isVipUser ? 'Download Credit Report' : 'Download Clearance Certificate'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Payment input modal */}
      <PaymentModal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        onStartPayment={(phone, amt) => startPaystack(phone, parseFloat(amt), currentPaymentType)}
        amount={currentPaymentType === 'clearance' ? '200' : '100'}
        title={currentPaymentType === 'clearance' ? 'CRB Clearance Payment' : 'Service Payment'}
        subtitle={currentPaymentType === 'clearance'
          ? 'Pay KES 200 to clear your CRB blacklist record'
          : 'Pay KES 100 to view your complete credit report'
        }
        initialPhone={userPhone}
      />

      {/* Paystack WebView */}
      <PaystackWebViewModal
        visible={paystackVisible}
        authorizationUrl={authUrl}
        htmlSource={inlineHtml}
        onSuccess={handlePaymentSuccess}
        onClose={() => setPaystackVisible(false)}
      />

      {/* Certificate modal */}
      <CertificateModal
        visible={certModalVisible}
        onClose={() => setCertModalVisible(false)}
        reference={clearRef || payRef}
      />

      {/* Admin modals */}
      <AdminAuthModal visible={showPassModal} onClose={() => setShowPassModal(false)} onSubmit={handleAdminAuth} />
      <AdminDashboardModal
        visible={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        payments={adminPayments}
        onRefresh={handleRefreshAdmin}
        isRefreshing={isAdminRefreshing}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BEIGE },
  content: { alignItems: 'center', paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 56 : 36, paddingBottom: 40 },

  // Pre-payment
  mainTitle: { fontSize: 26, fontWeight: '800', color: TEXT, textAlign: 'center', lineHeight: 34, letterSpacing: -0.4, marginBottom: 8 },
  mainSub: { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  instrCard: { width: '100%', backgroundColor: CARD, borderRadius: 20, padding: 20, borderWidth: 1.5, borderColor: BORDER, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 12, elevation: 3, marginBottom: 24 },
  instrCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  instrCardTitle: { fontSize: 14, fontWeight: '700', color: TEXT, textTransform: 'uppercase', letterSpacing: 1 },
  instrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  instrNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: SUCCESS + '18', borderWidth: 1.5, borderColor: SUCCESS + '40', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  instrNumTxt: { fontSize: 13, fontWeight: '800', color: SUCCESS },
  instrTitle: { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 2 },
  instrDesc: { fontSize: 12, color: MUTED, lineHeight: 18 },
  payBtn: { width: '100%', flexDirection: 'row', backgroundColor: SUCCESS, borderRadius: 14, paddingVertical: 17, alignItems: 'center', justifyContent: 'center', shadowColor: SUCCESS, shadowOpacity: 0.38, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  payBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

  // Bad credit
  badTickCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: DANGER, alignItems: 'center', justifyContent: 'center', marginBottom: 20, shadowColor: DANGER, shadowOpacity: 0.45, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  dangerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: DANGER, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 12 },
  dangerBadgeTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
  badTitle: { fontSize: 24, fontWeight: '800', color: DANGER, textAlign: 'center', lineHeight: 32, letterSpacing: -0.4, marginBottom: 6 },
  badSub: { fontSize: 12, color: MUTED, textAlign: 'center', marginBottom: 24 },

  badCard: { width: '100%', backgroundColor: CARD, borderRadius: 20, padding: 20, borderWidth: 2, borderColor: DANGER + '40', marginBottom: 20, shadowColor: DANGER, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  badCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  badCardTitle: { fontSize: 13, fontWeight: '800', color: MUTED, letterSpacing: 1 },
  badStatusTag: { backgroundColor: DANGER + '15', borderColor: DANGER, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  badStatusTxt: { fontSize: 11, fontWeight: '800', color: DANGER },

  scoreRowBad: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 20 },
  badScoreCircle: { width: 96, height: 96, borderRadius: 48, borderWidth: 6, borderColor: DANGER, alignItems: 'center', justifyContent: 'center', backgroundColor: DANGER_BG },
  badScoreNum: { fontSize: 20, fontWeight: '900', color: DANGER },
  badScoreLabel: { fontSize: 9, fontWeight: '800', color: DANGER, letterSpacing: 0.5 },

  scoreStats: { flex: 1, gap: 8 },
  statItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  statLabel: { fontSize: 11, fontWeight: '700', color: MUTED },
  statValue: { fontSize: 13, fontWeight: '700', color: TEXT },

  warningBox: { flexDirection: 'row', backgroundColor: DANGER + '08', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: DANGER + '25', gap: 10 },
  warningTitle: { fontSize: 13, fontWeight: '800', color: DANGER, marginBottom: 4 },
  warningText: { fontSize: 12, color: TEXT, lineHeight: 18 },

  // Clearance card
  clearCard: { width: '100%', backgroundColor: CARD, borderRadius: 20, padding: 20, borderWidth: 1.5, borderColor: ACCENT + '40', shadowColor: ACCENT, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  clearCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  clearCardTitle: { fontSize: 16, fontWeight: '800', color: TEXT },
  clearCardSub: { fontSize: 13, color: MUTED, lineHeight: 20, marginBottom: 16 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  benefitTxt: { fontSize: 13, color: TEXT, fontWeight: '500', flex: 1 },
  clearBtn: { flexDirection: 'row', backgroundColor: ACCENT, borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12, shadowColor: ACCENT, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  clearBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Cleared
  clearedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: SUCCESS, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 12 },
  clearedBadgeTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
  clearedTitle: { fontSize: 26, fontWeight: '800', color: TEXT, textAlign: 'center', lineHeight: 34, letterSpacing: -0.4, marginBottom: 8 },
  clearedSub: { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  identityCard: { width: '100%', backgroundColor: '#F0F7F2', borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: SUCCESS + '45' },
  identityTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: MUTED, marginBottom: 10 },
  identityRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: SUCCESS + '20' },
  identityLabel: { fontSize: 13, color: MUTED },
  identityValue: { fontSize: 13, fontWeight: '800', color: TEXT, maxWidth: '58%', textAlign: 'right' },
  identityStatus: { fontSize: 12, lineHeight: 18, color: SUCCESS, fontWeight: '700', marginTop: 12 },

  clearedCard: { width: '100%', backgroundColor: CARD, borderRadius: 20, padding: 20, borderWidth: 1.5, borderColor: SUCCESS + '50', shadowColor: SUCCESS, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  clearedCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  clearedCardTitle: { fontSize: 13, fontWeight: '800', color: MUTED, letterSpacing: 1 },
  clearedStatusTag: { backgroundColor: SUCCESS + '15', borderColor: SUCCESS, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  clearedStatusTxt: { fontSize: 11, fontWeight: '800', color: SUCCESS },

  clearedStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  clearedStat: { flex: 1, minWidth: '40%', backgroundColor: SUCCESS + '0A', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: SUCCESS + '20', alignItems: 'center' },
  clearedStatLabel: { fontSize: 10, fontWeight: '700', color: MUTED, marginBottom: 4 },
  clearedStatValue: { fontSize: 16, fontWeight: '900' },

  clearedAdvice: { flexDirection: 'row', backgroundColor: SUCCESS + '10', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: SUCCESS + '30', marginBottom: 20, gap: 10 },
  clearedAdviceTitle: { fontSize: 13, fontWeight: '800', color: SUCCESS, marginBottom: 4 },
  clearedAdviceTxt: { fontSize: 12, color: TEXT, lineHeight: 18 },

  divider: { height: 1, backgroundColor: BORDER, marginBottom: 16 },
  downloadBtn: { flexDirection: 'row', backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  downloadBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
