import { useState } from "react";
import QRCode from "react-qr-code";
import CryptoJS from "crypto-js";
import "./App.css";

// Thay mặt cho DB
const ADMIN_PASSWORD = "admin123";
const PAIRING_SECRET_KEY = "my_secure_key_123";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  
  // Thông tin cấu hình ghép nối
  const deviceConfig = {
    deviceId: "personal_pc_1",
    url: "http://127.0.0.1:3000" // IP của VPS / Cloud Relay sau này
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setLoginError("");
    } else {
      setLoginError("Mật khẩu không đúng!");
      setTimeout(() => setLoginError(""), 3000);
    }
  };

  const generateQRCodePayload = () => {
    // 1. Tạo chuỗi JSON gốc
    const rawData = JSON.stringify({
      deviceId: deviceConfig.deviceId,
      url: deviceConfig.url,
      secret: PAIRING_SECRET_KEY,
      timestamp: Date.now()
    });

    // 2. Mã hoá AES an toàn. 
    // Trong thực tế, bạn sẽ dùng chung cặp chìa khoá mã hoá cố định (hoặc cấp riêng) giữa App iOS và PC.
    // Ở đây ta mô phỏng AES với 1 pass cố định "MOBILE_APP_DECRYPT_KEY"
    const encryptedData = CryptoJS.AES.encrypt(rawData, "MOBILE_APP_DECRYPT_KEY").toString();
    
    // Gửi ra ngoài dạng chuẩn QR JSON
    return JSON.stringify({
      type: "SECURITY_PAIR",
      payload: encryptedData
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="container login-container">
        <div className="card login-card">
          <div className="login-header">
            <h2>Admin Login</h2>
            <p className="subtitle">Security Core Dashboard</p>
          </div>
          
          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <input 
                type="password" 
                placeholder="Nhập mật khẩu..." 
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
              />
            </div>
            {loginError && <p className="error-text">{loginError}</p>}
            <button type="submit" className="btn primary w-full">Đăng nhập</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container dashboard-container">
      <div className="dashboard">
        <header className="header">
          <h1>Security Pairing</h1>
          <div className="status-indicator">
            <span className="dot"></span>
            Authenticated
          </div>
        </header>

        <section className="qr-section">
          <div className="card qr-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2>Ghép nối Thiết bị Di động</h2>
            <p className="subtitle" style={{ textAlign: 'center', marginBottom: '2rem' }}>
              Dùng Ứng dụng Security iOS để quét mã QR bên dưới.<br/>
              Mã có chứa mật chương AES bảo mật kết nối thiết bị của bạn.
            </p>
            
            <div className="qr-wrapper">
              <QRCode 
                value={generateQRCodePayload()} 
                size={220}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox={`0 0 256 256`}
                level="Q"
                bgColor="#ffffff"
                fgColor="#0f172a"
              />
            </div>

            <div className="device-info mt-4">
              <p><strong>Device ID:</strong> <span>{deviceConfig.deviceId}</span></p>
              <p><strong>Relay Server:</strong> <span>{deviceConfig.url}</span></p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
