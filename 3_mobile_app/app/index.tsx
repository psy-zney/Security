import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  TextInput,
  Alert,
  Easing,
  ActivityIndicator,
  Pressable
} from 'react-native';
import { router } from 'expo-router';
import { loadPairingData, loadUserEmail, saveUserEmail, clearUserEmail, clearPairingData } from '../lib/storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import { LinearGradient } from 'expo-linear-gradient';

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_RELAY_URL || 'https://security-relay.onrender.com';

// Tạo component Animated cho TextInput
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// Component tạo viền 7 màu chạy đuổi nhau (Chasing Border) mỏng và tinh tế hơn
const RainbowWrapper = ({ children, style, borderRadius = 24, borderWidth = 1.2 }: any) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[{ borderRadius, overflow: 'hidden', padding: borderWidth }, style]}>
      <Animated.View
        style={{
          position: 'absolute',
          width: '200%',
          height: '200%',
          top: '-50%',
          left: '-50%',
          transform: [{ rotate }],
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <LinearGradient
          colors={[
            'transparent',
            '#FF0000', '#FF7F00', '#FFFF00', '#00FF00',
            'transparent',
            'transparent',
            '#0000FF', '#4B0082', '#8B00FF',
            'transparent'
          ]}
          locations={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.55, 0.65, 0.75, 0.85, 0.9]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: '100%', height: '100%' }}
        />
      </Animated.View>
      <View style={{ backgroundColor: '#000000', borderRadius: borderRadius - borderWidth, justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
};

const maskEmail = (email: string) => {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [name, domain] = parts;
  if (name.length <= 3) return `${name}***@${domain}`;
  return `${name.substring(0, 3)}***@${domain}`;
};

export default function WelcomeScreen() {
  const [checking, setChecking] = useState(true);
  const [hasPairing, setHasPairing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [curEmail, setCurEmail] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [pwdInput, setPwdInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const rainbowAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    Animated.loop(
      Animated.timing(rainbowAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: false,
      })
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
      const accessToken = response.authentication?.accessToken || response.params?.access_token;
      if (accessToken) {
        fetchUserInfo(accessToken);
      } else {
        Alert.alert("Google Auth Error", "Không thu thập được access token từ Google.");
      }
    } else if (response?.type === 'error') {
      Alert.alert("Google Auth Error", "Đăng nhập thất bại hoặc bị huỷ.");
    }
  }, [response]);

  const fetchUserInfo = async (token: string) => {
    setIsConnecting(true);
    try {
      const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = await res.json();
      if (user.email) {
        // Sync Google user with MongoDB database
        const dbRes = await fetch(`${BACKEND_URL}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            name: user.name || user.email.split('@')[0],
            googleId: user.id
          })
        });
        const dbUser = await dbRes.json();
        if (dbRes.ok) {
          handleSuccessLogin(user.email);
        } else {
          Alert.alert("Lỗi CSDL", dbUser.error || "Không thể đồng bộ tài khoản Google vào CSDL.");
        }
      } else {
        Alert.alert("Lỗi", "Không tìm thấy email liên kết với tài khoản này.");
      }
    } catch(e: any) {
      Alert.alert("Google API Error", e?.message || "Không thể tải thông tin profile Google.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSuccessLogin = async (email: string) => {
    await saveUserEmail(email);
    setCurEmail(email);
    setIsLoggedIn(true);
  };

  const handlePasswordLogin = async () => {
    if (!emailInput.includes('@') || emailInput.length <= 5) {
      Alert.alert("Lỗi", "Vui lòng nhập địa chỉ Email hợp lệ!");
      return;
    }
    if (pwdInput.length < 6) {
      Alert.alert("Lỗi", "Mật khẩu phải từ 6 ký tự trở lên!");
      return;
    }

    setIsConnecting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: pwdInput })
      });
      const data = await res.json();
      if (res.ok) {
        handleSuccessLogin(emailInput);
      } else {
        Alert.alert("Lỗi đăng nhập", data.error || "Email hoặc mật khẩu không chính xác.");
      }
    } catch (e: any) {
      Alert.alert("Lỗi kết nối", "Không thể kết nối đến máy chủ.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRegister = async () => {
    if (!emailInput.includes('@') || emailInput.length <= 5) {
      Alert.alert("Lỗi", "Vui lòng nhập địa chỉ Email hợp lệ!");
      return;
    }
    if (pwdInput.length < 6) {
      Alert.alert("Lỗi", "Mật khẩu phải từ 6 ký tự trở lên!");
      return;
    }
    if (!nameInput.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập Họ tên!");
      return;
    }

    setIsConnecting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: pwdInput, name: nameInput })
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert("Đăng ký thành công!", "Tài khoản của bạn đã được tạo. Hãy đăng nhập ngay.", [
          { text: "Đăng nhập", onPress: () => setIsRegistering(false) }
        ]);
      } else {
        Alert.alert("Lỗi đăng ký", data.error || "Không thể tạo tài khoản.");
      }
    } catch (e: any) {
      Alert.alert("Lỗi kết nối", "Không thể kết nối đến máy chủ.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLogout = async () => {
    await clearUserEmail();
    await clearPairingData();
    setCurEmail('');
    setIsLoggedIn(false);
    setHasPairing(false);
  };

  const borderColor = rainbowAnim.interpolate({
    inputRange: [0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.84, 1],
    outputRange: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#8B00FF', '#FF0000']
  });

  if (checking) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.loadingText}>Đang khởi động...</Text>
      </View>
    );
  }

  // --- LOGIN / SIGNUP SCREEN ---
  if (!isLoggedIn) {
     return (
      <View style={styles.container}>
        {isConnecting && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#00D1FF" />
            <Text style={styles.loadingTextOverlay}>Đang kết nối server...</Text>
          </View>
        )}
        <RainbowWrapper borderRadius={24} borderWidth={3} style={{ width: width * 0.85 }}>
          <View style={styles.loginCardInner}>
            <Text style={styles.title}>{isRegistering ? "Đăng ký" : "Đăng nhập"}</Text>
            <Text style={styles.description}>
              {isRegistering ? "Tạo tài khoản mới lưu vào hệ thống bảo mật" : "Sử dụng mạng an toàn bằng Google Auth"}
            </Text>

            {!isRegistering && (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: '#4285F4', marginBottom: 20 }]}
                onPress={() => promptAsync()}
              >
                <Text style={styles.primaryButtonText}>G Đăng nhập với Google</Text>
              </TouchableOpacity>
            )}

            {!isRegistering && <Text style={{color:'#888', textAlign:'center', marginBottom: 16}}>— Hoặc Đăng nhập tài khoản —</Text>}

            {isRegistering && (
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.inputInner}
                  placeholder="Họ và tên"
                  placeholderTextColor="#666"
                  value={nameInput}
                  onChangeText={setNameInput}
                />
              </View>
            )}

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.inputInner}
                placeholder="Email"
                placeholderTextColor="#666"
                value={emailInput}
                onChangeText={setEmailInput}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.inputInner}
                placeholder="Mật khẩu"
                placeholderTextColor="#666"
                value={pwdInput}
                onChangeText={setPwdInput}
                secureTextEntry
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: pressed ? '#555555' : '#00D1FF', borderColor: pressed ? '#555555' : '#00D1FF' }
              ]}
              onPress={isRegistering ? handleRegister : handlePasswordLogin}
            >
              <Text style={[styles.primaryButtonText, { color: '#000000' }]}>{isRegistering ? "Đăng ký" : "Đăng nhập"}</Text>
            </Pressable>

            <TouchableOpacity
              style={{ marginTop: 12, alignItems: 'center' }}
              onPress={() => setIsRegistering(!isRegistering)}
            >
              <Text style={{ color: '#00D1FF', fontSize: 14, fontWeight: '600' }}>
                {isRegistering ? "Đã có tài khoản? Đăng nhập ngay" : "Chưa có tài khoản? Đăng ký ngay"}
              </Text>
            </TouchableOpacity>
          </View>
        </RainbowWrapper>
      </View>
     )
  }

  // --- WELCOME SCREEN ---
  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Animated.View style={[styles.shieldContainer, { borderColor }]}>
          <Text style={styles.shieldIcon}>🛡️</Text>
        </Animated.View>

        <Text style={styles.title}>Security Core</Text>
        <Text style={styles.subtitle}>{"Email: " + maskEmail(curEmail)}</Text>
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

        {hasPairing ? (
           <View style={{flexDirection: 'row', gap: 16, marginTop: 12}}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/scan')}>
              <Text style={styles.secondaryButtonText}>Ghép nối thiết bị mới</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleLogout}>
              <Text style={[styles.secondaryButtonText, {color: '#FF4757'}]}>Đăng xuất</Text>
            </TouchableOpacity>
          </View>
        ) : (
           <View style={{flexDirection: 'row', gap: 16, marginTop: 12}}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleLogout}>
              <Text style={[styles.secondaryButtonText, {color: '#FF4757'}]}>Đăng xuất</Text>
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
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginCardInner: {
    backgroundColor: '#050505',
    padding: 24,
    borderRadius: 22,
  },
  inputWrapper: {
    marginBottom: 18,
    width: '100%',
  },
  inputInner: {
    backgroundColor: '#111111',
    color: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 16,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
    borderWidth: 1,
    borderColor: '#333333',
  },
  loadingText: {
    color: '#00D1FF',
    fontSize: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingTextOverlay: {
    color: '#00D1FF',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    width: width * 0.88,
    alignItems: 'center',
    zIndex: 10,
  },
  shieldContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderRadius: 60,
    borderWidth: 3,
    backgroundColor: '#080808',
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
    color: '#00D1FF',
    letterSpacing: 1,
    marginBottom: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 15,
    color: '#AAA',
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
    borderColor: '#333',
    backgroundColor: '#111',
  },
  badgeText: { color: '#00D1FF', fontSize: 12, fontWeight: '600' },
  primaryButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#888',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
