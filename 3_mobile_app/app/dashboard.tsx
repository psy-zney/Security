import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  Vibration,
} from 'react-native';
import { router } from 'expo-router';
import { connectToRelay, sendCommand, disconnectRelay, isConnected } from '../lib/socket';
import { loadPairingData, clearPairingData } from '../lib/storage';

const { width } = Dimensions.get('window');

interface LogEntry {
  id: string;
  time: string;
  message: string;
  type: 'info' | 'alarm' | 'success' | 'error';
}

interface LocationInfo {
  ip?: string;
  query?: string;
  city?: string;
  regionName?: string;
  country?: string;
  lat?: number;
  lon?: number;
  isp?: string;
  ssid?: string;
  bssid?: string;
  status?: string;
}

export default function DashboardScreen() {
  const [connected, setConnected] = useState(false);
  const [pairing, setPairing] = useState<{ deviceId: string; url: string } | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [lastAlarm, setLastAlarm] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const alarmAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    setLogs((prev) => [{ id: Date.now().toString(), time, message, type }, ...prev.slice(0, 49)]);
  }, []);

  const triggerAlarmAnimation = useCallback(() => {
    Vibration.vibrate([0, 300, 200, 300, 200, 500]);
    Animated.sequence([
      Animated.timing(alarmAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(alarmAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(alarmAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(alarmAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [alarmAnim]);

  useEffect(() => {
    // Pulse animation for connection dot
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    // Load pairing và kết nối
    loadPairingData().then((data) => {
      if (!data) {
        router.replace('/');
        return;
      }
      setPairing({ deviceId: data.deviceId, url: data.url });
      addLog(`Đang kết nối tới ${data.url}...`, 'info');

      connectToRelay(
        data.url,
        data.secret,
        data.deviceId,
        (statusData: any) => {
          // Nhận cập nhật từ PC
          const msg = statusData?.status || statusData?.message || JSON.stringify(statusData);
          const isAlarm = msg.toLowerCase().includes('alarm') || msg.toLowerCase().includes('camera');
          
          if (isAlarm) {
            setLastAlarm(msg);
            triggerAlarmAnimation();
            addLog(`🚨 ${msg}`, 'alarm');
          } else {
            addLog(msg, 'info');
          }

          // Cập nhật location nếu có
          if (statusData?.location) {
            setLocation(statusData.location);
          }
          if (statusData?.ssid) {
            setLocation((prev) => ({ ...prev, ssid: statusData.ssid, bssid: statusData.bssid }));
          }
        },
        () => {
          setConnected(false);
          addLog('Mất kết nối với Server!', 'error');
        }
      );

      setConnected(true);
      addLog(`✅ Đã kết nối với thiết bị: ${data.deviceId}`, 'success');
    });

    return () => {
      disconnectRelay();
    };
  }, []);

  const sendCmd = (command: string, label: string) => {
    if (!isConnected()) {
      Alert.alert('⚠️ Chưa kết nối', 'Đang chờ kết nối với Server. Vui lòng đợi giây lát...');
      return;
    }
    const sent = sendCommand(command);
    if (sent) {
      addLog(`➤ Đã gửi lệnh: ${label}`, 'success');
    } else {
      addLog(`✗ Không thể gửi lệnh: ${label}`, 'error');
    }
  };

  const handleUnpair = () => {
    Alert.alert(
      '⚠️ Huỷ ghép nối',
      'Bạn có chắc muốn huỷ kết nối với thiết bị này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          style: 'destructive',
          onPress: async () => {
            await clearPairingData();
            disconnectRelay();
            router.replace('/');
          },
        },
      ]
    );
  };

  const logTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'alarm': return '#FF4757';
      case 'success': return '#2ed573';
      case 'error': return '#FF6B81';
      default: return '#888';
    }
  };

  const alarmBg = alarmAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,71,87,0)', 'rgba(255,71,87,0.12)'],
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🛡️ Command Center</Text>
          <Text style={styles.deviceId} numberOfLines={1}>
            ID: {pairing?.deviceId ?? '---'}
          </Text>
        </View>
        <View style={styles.connectionBadge}>
          <Animated.View
            style={[
              styles.connectionDot,
              { backgroundColor: connected ? '#2ed573' : '#FF4757' },
              connected ? { transform: [{ scale: pulseAnim }] } : {},
            ]}
          />
          <Text style={[styles.connectionText, { color: connected ? '#2ed573' : '#FF4757' }]}>
            {connected ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ALARM BANNER */}
        {lastAlarm && (
          <Animated.View style={[styles.alarmBanner, { backgroundColor: alarmBg }]}>
            <Text style={styles.alarmIcon}>🚨</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.alarmTitle}>CẢNH BÁO XÂM NHẬP</Text>
              <Text style={styles.alarmMsg} numberOfLines={2}>{lastAlarm}</Text>
            </View>
            <TouchableOpacity onPress={() => setLastAlarm(null)}>
              <Text style={styles.alarmDismiss}>✕</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Location Card */}
        {location && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📍 Vị trí Laptop</Text>
            <View style={styles.locationGrid}>
              {(location.ip || location.query) && <LocationRow label="Public IP" value={location.ip || location.query || ''} />}
              {location.ssid && <LocationRow label="Wi-Fi (SSID)" value={location.ssid} highlight />}
              {location.bssid && <LocationRow label="BSSID" value={location.bssid} />}
              {location.city && <LocationRow label="Thành phố" value={`${location.city}, ${location.country}`} />}
              {location.isp && <LocationRow label="Nhà mạng" value={location.isp} />}
              {location.lat && <LocationRow label="Tọa độ" value={`${location.lat}, ${location.lon}`} />}
            </View>
          </View>
        )}

        {/* Control Buttons */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚡ Điều khiển</Text>
          <TouchableOpacity
            style={[styles.commandBtn, styles.lockBtn]}
            onPress={() => Alert.alert('🔒 Xác nhận khóa máy', 'Bạn có chắc muốn khóa Laptop ngay bây giờ?', [
              { text: 'Hủy', style: 'cancel' },
              { text: '🔒 KHÓA NGAY', style: 'destructive', onPress: () => sendCmd('lock_pc', 'Khóa máy tính') },
            ])}
            activeOpacity={0.8}
          >
            <Text style={styles.cmdIcon}>🔒</Text>
            <View style={styles.cmdTextContainer}>
              <Text style={styles.cmdTitle}>Khóa Máy Tính</Text>
              <Text style={styles.cmdSubtitle}>Khoá PC ngay lập tức</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.commandBtn, styles.cameraBtn]}
            onPress={() => sendCmd('capture_camera', 'Chụp ảnh mai phục')}
            activeOpacity={0.8}
          >
            <Text style={styles.cmdIcon}>📸</Text>
            <View style={styles.cmdTextContainer}>
              <Text style={styles.cmdTitle}>Chụp Ảnh Ngầm</Text>
              <Text style={styles.cmdSubtitle}>Kích hoạt mai phục Camera</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.commandBtn, styles.locateBtn]}
            onPress={() => sendCmd('request_location', 'Yêu cầu vị trí')}
            activeOpacity={0.8}
          >
            <Text style={styles.cmdIcon}>📡</Text>
            <View style={styles.cmdTextContainer}>
              <Text style={styles.cmdTitle}>Lấy Vị Trí Mới</Text>
              <Text style={styles.cmdSubtitle}>Cập nhật lại IP truy cập hiện tại</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.commandBtn, styles.passwordBtn]}
            onPress={() => Alert.prompt(
              '🔑 Đổi mật khẩu PC',
              'Nhập mật khẩu mới cho tài khoản Admin trên Windows:',
              [
                { text: 'Hủy', style: 'cancel' },
                {
                  text: 'Đổi Mật Khẩu',
                  onPress: (password) => {
                    if (password) {
                      sendCommand('change_password', { password });
                      // Hàm sendCommand này tôi gọi trực tiếp để truyền được payload
                    }
                  }
                }
              ]
            )}
            activeOpacity={0.8}
          >
            <Text style={styles.cmdIcon}>🔑</Text>
            <View style={styles.cmdTextContainer}>
              <Text style={styles.cmdTitle}>Đổi Mật Khẩu PC</Text>
              <Text style={styles.cmdSubtitle}>Khoá máy với mật khẩu mới</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Activity Log */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Nhật ký hoạt động</Text>
          {logs.length === 0 && (
            <Text style={styles.emptyLog}>Chưa có hoạt động nào...</Text>
          )}
          {logs.map((log) => (
            <View key={log.id} style={styles.logRow}>
              <Text style={styles.logTime}>{log.time}</Text>
              <Text style={[styles.logMsg, { color: logTypeColor(log.type) }]} numberOfLines={2}>
                {log.message}
              </Text>
            </View>
          ))}
        </View>

        {/* Unpair */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.unpairBtn} onPress={handleUnpair}>
            <Text style={styles.unpairText}>🔗 Huỷ ghép nối thiết bị</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function LocationRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.locationRow}>
      <Text style={styles.locationLabel}>{label}</Text>
      <Text style={[styles.locationValue, highlight && styles.locationHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  deviceId: {
    color: '#555',
    fontSize: 11,
    marginTop: 2,
    maxWidth: width * 0.55,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#111120',
    borderWidth: 1,
    borderColor: '#1a1a2e',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  alarmBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FF4757',
    gap: 12,
  },
  alarmIcon: { fontSize: 28 },
  alarmTitle: {
    color: '#FF4757',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  alarmMsg: { color: '#ff8a8a', fontSize: 13 },
  alarmDismiss: { color: '#FF4757', fontSize: 18, padding: 4 },
  card: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: '#111120',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1a1a2e',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 16,
  },
  locationGrid: { gap: 8 },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  locationLabel: { color: '#666', fontSize: 13 },
  locationValue: { color: '#ccc', fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  locationHighlight: { color: '#6C63FF', fontWeight: '700' },
  commandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 16,
  },
  lockBtn: {
    backgroundColor: 'rgba(255,71,87,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,71,87,0.3)',
  },
  cameraBtn: {
    backgroundColor: 'rgba(108,99,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.3)',
  },
  locateBtn: {
    backgroundColor: 'rgba(46,213,115,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(46,213,115,0.3)',
  },
  passwordBtn: {
    backgroundColor: 'rgba(255,165,2,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,165,2,0.4)',
  },
  cmdIcon: { fontSize: 28 },
  cmdTextContainer: { flex: 1 },
  cmdTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cmdSubtitle: { color: '#666', fontSize: 12, marginTop: 2 },
  logRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  logTime: { color: '#444', fontSize: 11, fontFamily: 'monospace', minWidth: 56 },
  logMsg: { fontSize: 12, flex: 1, lineHeight: 17 },
  emptyLog: { color: '#444', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  unpairBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a1a1a',
    backgroundColor: 'rgba(255,71,87,0.06)',
    alignItems: 'center',
  },
  unpairText: { color: '#FF4757', fontSize: 15, fontWeight: '600' },
});
