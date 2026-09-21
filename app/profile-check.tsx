import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// ─── Constants ───────────────────────────────────────────────────────────────
const BEIGE = '#F5F0E8';
const CARD = '#FFFDF7';
const ACCENT = '#2E6B9E';
const BORDER = '#D9CFC0';
const TEXT = '#2C2416';
const MUTED = '#8A7F6E';

type InfoRowProps = {
  icon: string;
  label: string;
  value: string;
};

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Text style={styles.infoIconText}>{icon}</Text>
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ProfileCheckScreen() {
  const params = useLocalSearchParams<{
    firstName?: string;
    lastName?: string;
    idNumber?: string;
    email?: string;
    phone?: string;
  }>();
  const router = useRouter();

  const initials =
    ((params.firstName?.[0] ?? '') + (params.lastName?.[0] ?? '')).toUpperCase() || 'U';

  const fullName =
    [params.firstName, params.lastName].filter(Boolean).join(' ') || 'User';

  const handleCheck = async () => {
    await AsyncStorage.setItem('CRB_USER_ID_NUMBER', params.idNumber ?? '');
    await AsyncStorage.setItem('CRB_USER_PHONE', params.phone ?? '');
    router.push('/checking');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Page title */}
        <View style={styles.pageTitleWrap}>
          <Text style={styles.pageTitle}>Credit Score Check</Text>
          <View style={styles.titleUnderline} />
        </View>

        {/* Profile avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          </View>
          <Text style={styles.avatarName}>{fullName}</Text>
          <Text style={styles.avatarSub}>Account holder</Text>
        </View>

        {/* Information card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Your Information</Text>
          <View style={styles.divider} />

          <InfoRow
            icon="ID"
            label="National ID Number"
            value={params.idNumber ?? '—'}
          />
          <View style={styles.rowSeparator} />
          <InfoRow
            icon="@"
            label="Email Address"
            value={params.email ?? '—'}
          />
          <View style={styles.rowSeparator} />
          <InfoRow
            icon="PH"
            label="Phone Number"
            value={params.phone ?? '—'}
          />
        </View>

        {/* Notice */}
        <View style={styles.noticeBox}>
          <View style={styles.noticeDot} />
          <Text style={styles.noticeText}>
            Your information is securely encrypted and will only be used to
            retrieve your CRB credit status report.
          </Text>
        </View>

        {/* Check button */}
        <TouchableOpacity
          style={styles.checkBtn}
          onPress={handleCheck}
          activeOpacity={0.85}
        >
          <Text style={styles.checkBtnText}>Check CRB Status</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BEIGE },
  content: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 48 : 20,
    paddingBottom: 40,
  },

  // Page title
  pageTitleWrap: { marginBottom: 28 },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: -0.5,
  },
  titleUnderline: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: ACCENT,
    marginTop: 8,
  },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: ACCENT + '40',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BEIGE,
    marginBottom: 12,
    shadowColor: ACCENT,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 1,
  },
  avatarName: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 4,
  },
  avatarSub: { fontSize: 13, color: MUTED },

  // Info card
  sectionCard: {
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginBottom: 4,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  infoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: ACCENT + '12',
    borderWidth: 1,
    borderColor: ACCENT + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  infoIconText: {
    fontSize: 11,
    fontWeight: '800',
    color: ACCENT,
    letterSpacing: 0.5,
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT,
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginLeft: 54,
  },

  // Notice
  noticeBox: {
    flexDirection: 'row',
    backgroundColor: ACCENT + '10',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: ACCENT + '25',
    marginBottom: 28,
    alignItems: 'flex-start',
    gap: 10,
  },
  noticeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
    marginTop: 4,
    flexShrink: 0,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: ACCENT,
    lineHeight: 18,
    fontWeight: '500',
  },

  // Check button
  checkBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: ACCENT,
    shadowOpacity: 0.38,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  checkBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
});
