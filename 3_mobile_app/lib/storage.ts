import AsyncStorage from '@react-native-async-storage/async-storage';

const PAIRING_KEY = '@security_pairing_data';
const USER_EMAIL_KEY = '@security_user_email';

export interface PairingData {
  deviceId: string;
  url: string;
  secret?: string; // made optional
  email?: string;
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

export async function saveUserEmail(email: string): Promise<void> {
  await AsyncStorage.setItem(USER_EMAIL_KEY, email);
}

export async function loadUserEmail(): Promise<string | null> {
  return await AsyncStorage.getItem(USER_EMAIL_KEY);
}

export async function clearUserEmail(): Promise<void> {
  await AsyncStorage.removeItem(USER_EMAIL_KEY);
}
