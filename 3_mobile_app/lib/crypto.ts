import CryptoJS from 'crypto-js';

// Giải mã AES payload từ QR Code
export function decryptQRPayload(encrypted: string, passphrase: string): {
  deviceId: string;
  url: string;
  secret: string;
  timestamp: number;
} | null {
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, passphrase);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  } catch (e) {
    return null;
  }
}

// Tạo chữ ký HMAC-SHA256 theo chuẩn của Server
export function generateHmacSignature(secretKey: string): {
  timestamp: string;
  signature: string;
} {
  const timestamp = Date.now().toString();
  const signature = CryptoJS.HmacSHA256(timestamp, secretKey).toString();
  return { timestamp, signature };
}
