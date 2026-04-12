import { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import CryptoJS from "crypto-js";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

// Thay mặt cho DB - Đọc từ tệp .env (Vite yêu cầu tiền tố VITE_)
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;
const PAIRING_SECRET_KEY = import.meta.env.VITE_PAIRING_SECRET_KEY;
const AES_PASSPHRASE = import.meta.env.VITE_AES_PASSPHRASE;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [machineId, setMachineId] = useState("fetching...");
  
  // Tự động lấy Machine GUID từ hệ thống khi mở App
  useEffect(() => {
    invoke<string>("get_machine_id")
      .then((id) => setMachineId(id))
      .catch((err) => {
        console.error("Failed to get machine id:", err);
        setMachineId(import.meta.env.VITE_DEVICE_ID || "unknown_pc");
      });
  }, []);

  // Thông tin cấu hình ghép nối
  const deviceConfig = {
    deviceId: machineId,
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
    // Ở đây ta mã hoá AES với passphrase lấy từ bảo mật .env
    const encryptedData = CryptoJS.AES.encrypt(rawData, AES_PASSPHRASE).toString();
    
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
