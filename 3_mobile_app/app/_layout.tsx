import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity } from 'react-native';
import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

const BACKEND_URL = process.env.EXPO_PUBLIC_RELAY_URL || 'https://security-relay.onrender.com';

function ServerStatusCorner() {
  const [isServerActive, setIsServerActive] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const dotColor = isServerActive ? '#00FF00' : '#FF0000';

  useEffect(() => {
    const socket: Socket = io(BACKEND_URL, {
      query: { clientType: 'ping_viewer' },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      setIsServerActive(true);
    });

    socket.on('server_ping', () => {
      setIsServerActive(true);
    });

    socket.on('disconnect', () => {
      setIsServerActive(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handlePingRender = async () => {
    setIsPinging(true);
    try {
      await fetch(BACKEND_URL);
    } catch (e) {
      // ignore errors
    }
    setTimeout(() => setIsPinging(false), 2000);
  };

  return (
    <View style={{ position: 'absolute', top: 50, right: 20, zIndex: 999, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <TouchableOpacity 
        onPress={handlePingRender}
        style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
      >
        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{isPinging ? 'Pinging...' : 'Ping Render'}</Text>
      </TouchableOpacity>
      <View style={{ 
        width: 12, 
        height: 12, 
        borderRadius: 6, 
        backgroundColor: dotColor, 
        shadowColor: dotColor, 
        shadowOpacity: 0.8, 
        shadowRadius: 6, 
        shadowOffset: { width: 0, height: 0 },
        elevation: 5
      }} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <ServerStatusCorner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#000000' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="scan" />
        <Stack.Screen name="dashboard" />
      </Stack>
    </View>
  );
}
