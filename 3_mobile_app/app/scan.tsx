import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { savePairingData, loadUserEmail } from '../lib/storage';

const { width } = Dimensions.get('window');

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate scanning line
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.infoText}>Đang kiểm tra quyền Camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>📷 Cần quyền Camera</Text>
        <Text style={styles.subText}>
          Ứng dụng cần quyền Camera để quét mã QR ghép nối thiết bị.
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Cấp quyền Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const scanLineY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 240],
  });

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned || scanning) return;
    setScanning(true);

    try {
      const parsed = JSON.parse(data);
      if (parsed.type !== 'SECURITY_PAIR' || !parsed.payload) {
        Alert.alert('❌ Mã QR không hợp lệ', 'Đây không phải mã QR của hệ thống Security.', [
          { text: 'Thử lại', onPress: () => setScanning(false) },
        ]);
        return;
      }

      const { email: qrEmail, deviceId, url } = parsed.payload;
      
      const currentEmail = await loadUserEmail();
      
      if (!currentEmail || currentEmail !== qrEmail) {
        Alert.alert('❌ Không khớp Email', `Tài khoản bạn đang dùng (${currentEmail}) không khớp với tài khoản trên máy tính (${qrEmail}). Mời bạn đăng nhập đúng tài khoản trên PC.`, [
          { text: 'Thử lại', onPress: () => setScanning(false) },
        ]);
        return;
      }

      // Lưu pairing và chuyển tới Dashboard
      setScanned(true);
      await savePairingData({
        deviceId: deviceId,
        url: url,
        pairedAt: Date.now(),
        email: qrEmail,
      });
      
      Alert.alert(
        '✅ Ghép nối thành công!',
        `Đã nối bảo mật với máy tính của bạn.\nID: ${deviceId}\nServer: ${url}`,
        [{ text: 'Vào Dashboard', onPress: () => router.replace('/dashboard') }]
      );
    } catch (e) {
      Alert.alert('❌ Lỗi đọc QR', 'Không thể đọc dữ liệu từ mã QR này.', [
        { text: 'Thử lại', onPress: () => setScanning(false) },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quét mã QR</Text>
        <View style={{ width: 80 }} />
      </View>

      {/* Camera */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />

        {/* Overlay */}
        <View style={styles.overlay}>
          <View style={styles.topOverlay} />
          <View style={styles.middleRow}>
            <View style={styles.sideOverlay} />
            {/* Scanner frame */}
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              {/* Scan line */}
              <Animated.View
                style={[
                  styles.scanLine,
                  { transform: [{ translateY: scanLineY }] },
                ]}
              />
            </View>
            <View style={styles.sideOverlay} />
          </View>
          <View style={styles.bottomOverlay} />
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>Hướng dẫn Ghép nối</Text>
        <Text style={styles.instructionsText}>
          1. Đăng nhập PC App bằng tài khoản Google (Email) của bạn.
        </Text>
        <Text style={styles.instructionsText}>
          2. Đảm bảo ứng dụng Mobile cũng đang đăng nhập đúng <Text style={styles.highlight}>Email</Text> đó.
        </Text>
        <Text style={styles.instructionsText}>
          3. Đưa Camera quét mã QR để xác nhận ghép nối.
        </Text>
      </View>
    </View>
  );
}

const FRAME_SIZE = width * 0.7;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  center: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#0a0a0f',
  },
  backBtn: { width: 80 },
  backText: { color: '#6C63FF', fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cameraContainer: {
    height: width * 1.1,
    position: 'relative',
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,10,15,0.75)',
  },
  middleRow: {
    flexDirection: 'row',
    height: FRAME_SIZE,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,10,15,0.75)',
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,10,15,0.75)',
  },
  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#6C63FF',
    borderWidth: 3,
  },
  topLeft: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0 },
  topRight: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#6C63FF',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  instructions: {
    flex: 1,
    padding: 24,
    paddingTop: 28,
  },
  instructionsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  instructionsText: {
    color: '#888',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 6,
  },
  highlight: {
    color: '#6C63FF',
    fontWeight: '600',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  subText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  infoText: { color: '#888', fontSize: 15 },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    backgroundColor: '#6C63FF',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
