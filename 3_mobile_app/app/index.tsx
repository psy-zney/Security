import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  TextInput,
  Alert
} from 'react-native';
import { router } from 'expo-router';
import { loadPairingData, loadUserEmail, saveUserEmail } from '../lib/storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {jwtDecode} from 'jwt-decode';

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const [checking, setChecking] = useState(true);
  const [hasPairing, setHasPairing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [curEmail, setCurEmail] = useState('');
  
  // Demo Login states
  const [emailInput, setEmailInput] = useState('');
  const [pwdInput, setPwdInput] = useState('');

  const glowAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 'dummy-client-id.apps.googleusercontent.com',
  });

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();

    const checkState = async () => {
      try {
        const mail = await loadUserEmail();
        if (mail) {
          setCurEmail(mail);
          setIsLoggedIn(true);
          const data = await loadPairingData();
          if (data?.deviceId) setHasPairing(true);
        }
      } catch (err) { }
      setChecking(false);
    };
    checkState();
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      try {
        const decoded = jwtDecode<{ email: string }>(id_token);
        if (decoded.email) {
          handleSuccessLogin(decoded.email);
        }
      } catch (e) {
         Alert.alert("Google Auth Error", "Không thể thu thập token");
      }
    }
  }, [response]);

  const handleSuccessLogin = async (email: string) => {
    await saveUserEmail(email);
    setCurEmail(email);
    setIsLoggedIn(true);
  };

  const handleDemoLogin = () => {
    if (emailInput === "lequangkhanh295@gmail.com" && pwdInput === "zney295") {
      handleSuccessLogin(emailInput);
    } else {
      Alert.alert("Lỗi", "Email hoặc mật khẩu demo không đúng!");
    }
  };

  if (checking) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Đang khởi động...</Text>
      </View>
    );
  }

  // --- LOGIN SCREEN ---
  if (!isLoggedIn) {
     return (
      <View style={styles.container}>
        <Animated.View style={[styles.orb, styles.orbTopLeft, { opacity: glowAnim }]} />
        <Animated.View style={[styles.orb, styles.orbBottomRight, { opacity: glowAnim }]} />
        
        <View style={styles.loginCard}>
          <Text style={styles.title}>Đăng nhập</Text>
          <Text style={styles.description}>
            Sử dụng mạng an toàn bằng Google Auth
          </Text>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: '#4285F4', marginBottom: 24 }]}
            onPress={() => promptAsync()}
          >
            <Text style={styles.primaryButtonText}>G Đăng nhập với Google</Text>
          </TouchableOpacity>

          <Text style={{color:'#888', textAlign:'center', marginBottom: 12}}>— Hoặc Demo Mode —</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Email (lequangkhanh295@gmail.com)"
            placeholderTextColor="#666"
            value={emailInput}
            onChangeText={setEmailInput}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Mật khẩu (zney295)"
            placeholderTextColor="#666"
            value={pwdInput}
            onChangeText={setPwdInput}
            secureTextEntry
          />
          <TouchableOpacity style={styles.primaryButton} onPress={handleDemoLogin}>
            <Text style={styles.primaryButtonText}>Đăng nhập Demo</Text>
          </TouchableOpacity>
        </View>
      </View>
     )
  }

  // --- WELCOME SCREEN ---
  return (
    <View style={styles.container}>
      <Animated.View style={[styles.orb, styles.orbTopLeft, { opacity: glowAnim }]} />
      <Animated.View style={[styles.orb, styles.orbBottomRight, { opacity: glowAnim }]} />

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.shieldContainer}>
          <Animated.View style={[styles.shieldGlow, { opacity: glowAnim }]} />
          <Text style={styles.shieldIcon}>🛡️</Text>
        </View>

        <Text style={styles.title}>Security Core</Text>
        <Text style={styles.subtitle}>{"Email: " + curEmail}</Text>
        <Text style={styles.description}>
          Thiết lập kết nối an toàn với Laptop của bạn bằng cách quét mã QR từ ứng dụng quản trị trên PC.
        </Text>

        <View style={styles.badges}>
          <View style={styles.badge}><Text style={styles.badgeText}>⚡ Email Verification</Text></View>
          <View style={styles.badge}><Text style={styles.badgeText}>📡 Realtime</Text></View>
        </View>

        {hasPairing ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/dashboard')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>▶️  Vào trang điều khiển</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/scan')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>📷  Quét mã QR ghép nối</Text>
          </TouchableOpacity>
        )}

        {hasPairing && (
           <View style={{flexDirection: 'row', gap: 16, marginTop: 12}}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/scan')}>
              <Text style={styles.secondaryButtonText}>Ghép nối thiết bị mới</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  loginCard: {
    width: width * 0.85,
    backgroundColor: '#151520',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2a2a3a',
    zIndex: 10,
  },
  input: {
    backgroundColor: '#0a0a0f',
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2a2a3a',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
  },
  orb: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  orbTopLeft: {
    top: -80,
    left: -80,
    backgroundColor: '#6C63FF',
    opacity: 0.15,
  },
  orbBottomRight: {
    bottom: -80,
    right: -80,
    backgroundColor: '#FF4757',
    opacity: 0.15,
  },
  content: {
    width: width * 0.88,
    alignItems: 'center',
    zIndex: 10,
  },
  shieldContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  shieldGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#6C63FF',
    opacity: 0.3,
  },
  shieldIcon: { fontSize: 56, zIndex: 1 },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 6,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 14,
    color: '#6C63FF',
    letterSpacing: 1,
    marginBottom: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 40,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a3a',
    backgroundColor: '#111120',
  },
  badgeText: { color: '#aaa', fontSize: 12, fontWeight: '600' },
  primaryButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#555',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
