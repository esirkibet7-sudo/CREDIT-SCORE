import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { AppEventsLogger, Settings } from 'react-native-fbsdk-next';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  initialRouteName: 'auth',
};

function OfflineModal() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected !== null) {
        setIsConnected(state.isConnected && (state.isInternetReachable ?? true));
      }
    });

    return () => unsubscribe();
  }, []);

  const handleRetry = async () => {
    setIsChecking(true);
    try {
      const state = await NetInfo.fetch();
      setIsConnected(state.isConnected && (state.isInternetReachable ?? true));
    } catch {}
    setIsChecking(false);
  };

  if (isConnected !== false) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="cloud-offline-outline" size={48} color="#C0392B" />
          </View>
          <Text style={styles.title}>No Internet Connection</Text>
          <Text style={styles.subtitle}>
            Please connect to the internet to proceed with your CRB check and status verification.
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRetry} disabled={isChecking} activeOpacity={0.85}>
            {isChecking ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="refresh" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.retryText}>Retry Connection</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    try {
      Settings.setAutoLogAppEventsEnabled(true);
      Settings.setAdvertiserIDCollectionEnabled(true);
      Settings.initializeSDK();
      AppEventsLogger.logEvent('fb_mobile_activate_app');
      AppEventsLogger.flush();
    } catch (error) {
      console.log('Facebook SDK initialization failed:', error);
    }
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="goals" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="profile-check" options={{ headerShown: false }} />
        <Stack.Screen name="checking" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="result" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: true }} />
      </Stack>
      <OfflineModal />
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFDF7',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D9CFC0',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FEF0EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FADBD8',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2C2416',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#8A7F6E',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryBtn: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#2E6B9E',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
