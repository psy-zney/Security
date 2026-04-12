import AsyncStorage from '@react-native-async-storage/async-storage';

const PAIRING_KEY = '@security_pairing_data';

export interface PairingData {
  deviceId: string;
  url: string;
  secret: string;
  pairedAt: number;
}

export async function savePairingData(data: PairingData): Promise<void> {
  await AsyncStorage.setItem(PAIRING_KEY, JSON.stringify(data));
}

export async function loadPairingData(): Promise<PairingData | null> {
  const raw = await AsyncStorage.getItem(PAIRING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function clearPairingData(): Promise<void> {
  await AsyncStorage.removeItem(PAIRING_KEY);
}
