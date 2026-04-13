import { useState, useEffect } from "react";
import QRCode from "react-core-image"; // Wait, it uses react-qr-code
import QRCodeRect from "react-qr-code";
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  
  // Demo purpose fallback
  const [passwordInput, setPasswordInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [loginError, setLoginError] = useState("");
  
  const [machineId, setMachineId] = useState("fetching...");
  
  useEffect(() => {
    invoke<string>("get_machine_id")
      .then((id) => setMachineId(id))
      .catch((err) => {
        console.error("Failed to get machine id:", err);
        setMachineId(import.meta.env.VITE_DEVICE_ID || "unknown_pc");
      });
  }, []);

  const deviceConfig = {
    deviceId: machineId,
    url: import.meta.env.VITE_RELAY_URL || "http://192.168.88.62:3000"
  };

  const handleDemoLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput === "lequangkhanh295@gmail.com" && passwordInput === "zney295") {
      setUserEmail(emailInput);
      setIsAuthenticated(true);
      setLoginError("");
    } else {
      setLoginError("Email hoặc mật khẩu Demo không đúng!");
      setTimeout(() => setLoginError(""), 3000);
    }
  };

  const generateQRCodePayload = () => {
    // Không dùng AES cố định nữa mà truyền thẳng Email + URL để Mobile quét
    // Mobile sẽ kiểm tra xem tài khoản trên Mobile có khớp với tài khoản Email trên mã QR này không.
    return JSON.stringify({
      type: "SECURITY_PAIR",
      payload: {
        email: userEmail,
        deviceId: deviceConfig.deviceId,
        url: deviceConfig.url,
        timestamp: Date.now()
      }
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="container login-container">
        <div className="card login-card" style={{ maxWidth: '400px' }}>
          <div className="login-header">
            <h2>Đăng nhập Security</h2>
            <p className="subtitle">Security Core Dashboard</p>
          </div>
          
          <div className="google-auth-container" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
             <GoogleLogin
                onSuccess={credentialResponse => {
                  try {
                    if (credentialResponse.credential) {
                      const decoded = jwtDecode<{ email: string }>(credentialResponse.credential);
                      setUserEmail(decoded.email);
                      setIsAuthenticated(true);
                    }
                  } catch (e) {
                    console.error("Token decode failed", e);
                  }
                }}
                onError={() => {
                  console.log('Login Failed');
                  setLoginError("Google Sign-In thất bại. (Chưa config Client ID?)");
                }}
                useOneTap
              />
          </div>

          <div style={{ textAlign: 'center', marginBottom: '16px', color: '#888' }}>Hoặc dùng tài khoản Demo</div>

          <form onSubmit={handleDemoLogin} className="login-form">
            <div className="input-group">
              <input 
                type="email" 
                placeholder="Email: lequangkhanh295@gmail.com" 
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                style={{ marginBottom: '12px' }}
              />
              <input 
                type="password" 
                placeholder="Mật khẩu: zney295" 
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
              />
            </div>
            {loginError && <p className="error-text">{loginError}</p>}
            <button type="submit" className="btn primary w-full" style={{ marginTop: '12px' }}>Vào Demo Mode</button>
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
            {userEmail}
          </div>
        </header>

        <section className="qr-section">
          <div className="card qr-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2>Quét mã QR để ghép nối</h2>
            <p className="subtitle" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              Hãy dùng ứng dụng Mobile đăng nhập vào chung tài khoản <b>{userEmail}</b> sau đó quét mã QR này để ghép nối thiết bị an toàn.
            </p>
            
            <div className="qr-wrapper" style={{ padding: '16px', backgroundColor: 'white', borderRadius: '12px' }}>
              <QRCodeRect 
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
              <p><strong>Bảo mật QR:</strong> <span>Email Verification Mode</span></p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
