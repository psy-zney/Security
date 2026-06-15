import { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import { jwtDecode } from "jwt-decode";
import { invoke } from "@tauri-apps/api/core";
import CryptoJS from 'crypto-js';
import { listen } from '@tauri-apps/api/event';
import { openUrl } from '@tauri-apps/plugin-opener';
import "./App.css";

// Hàm tạo PKCE (RFC 7636) để dùng Google OAuth mà không bị lộ Secret Key
function base64URLEncode(str: any) {
  return str.toString(CryptoJS.enc.Base64)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
}

function generatePKCE() {
  const verifier = base64URLEncode(CryptoJS.lib.WordArray.random(32));
  const challenge = base64URLEncode(CryptoJS.SHA256(verifier));
  return { verifier, challenge };
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  
  // Demo purpose fallback
  const [passwordInput, setPasswordInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [loginError, setLoginError] = useState("");
  
  const [machineId, setMachineId] = useState("fetching...");
  const [relayUrl, setRelayUrl] = useState("https://security-relay.onrender.com");
  const [secretKey, setSecretKey] = useState("");
  
  const [otpCode, setOtpCode] = useState<string | null>(null);
  
  useEffect(() => {
    invoke<string>("get_machine_id")
      .then((id) => setMachineId(id))
      .catch((err) => {
        console.error("Failed to get machine id:", err);
        setMachineId("unknown_pc");
      });

    invoke<string>("get_app_config")
      .then((configStr) => {
        try {
          const cfg = JSON.parse(configStr);
          if (cfg.RELAY_URL) setRelayUrl(cfg.RELAY_URL);
          if (cfg.SECRET_KEY) setSecretKey(cfg.SECRET_KEY);
        } catch(e) {
          console.error("Failed to parse config:", e);
        }
      })
      .catch(err => console.error("Failed to get config:", err));
  }, []);

  const deviceConfig = {
    deviceId: machineId,
    url: relayUrl
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
        secret: secretKey,
        timestamp: Date.now()
      }
    });
  };

  const handleNativeGoogleLogin = async () => {
    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
      if (!clientId || clientId.includes('PASTE_YOUR')) {
        setLoginError("Hãy dán VITE_GOOGLE_CLIENT_ID thật vào file .env của 2_pc_ui_app.");
        return;
      }

      setLoginError("Đang chờ trình duyệt đăng nhập...");

      // 1. Gọi lệnh Rust để mở một Local Server lắng nghe ở cổng cố định 8989
      const port = await invoke<number>('start_oauth_server');
      console.log('OAuth server started on port:', port);

      // 2. Tạo chuỗi PKCE bảo mật
      const { verifier, challenge } = generatePKCE();
      const redirectUri = `http://localhost:${port}/callback`;

      // 3. Chuẩn bị đường link để nhảy sang trình duyệt Chrome của người dùng
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=email profile&` +
        `code_challenge=${challenge}&` +
        `code_challenge_method=S256`;

      // 4. Lắng nghe phản hồi trả về từ Rust (khi trình duyệt chuyển về localhost:8989)
      const unlisten = await listen<string>('oauth_callback', async (event) => {
        const returnedUrl = event.payload;
        unlisten(); // ngay lập tức huỷ bỏ nghe ngóng để tiết kiệm tài nguyên
        
        try {
          // Trích xuất mã Code ra khỏi URL
          const urlObj = new URL(returnedUrl);
          const code = urlObj.searchParams.get('code');

          if (!code) throw new Error("Google không trả về uỷ quyền (code).");

          // 5. Gửi lên Google lấy cục Token xịn
          const params: Record<string, string> = {
            client_id: clientId,
            code: code,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
            code_verifier: verifier
          };
          if (clientSecret) {
            params.client_secret = clientSecret;
          }

          const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(params)
          });

          const tokenData = await tokenRes.json();
          if (tokenData.id_token) {
            const decoded = jwtDecode<{ email: string }>(tokenData.id_token);
            setUserEmail(decoded.email);
            setIsAuthenticated(true);
          } else {
             setLoginError("Lấy token thất bại: " + JSON.stringify(tokenData));
          }
        } catch (e: any) {
          setLoginError("Lỗi trao đổi token: " + e.message);
        }
      });

      // Bật trình duyệt hệ thống
      await openUrl(authUrl);

    } catch (e: any) {
      setLoginError("Không thể bật Server bắt Login: " + e.message);
    }
  };

  const handleSetKillOtp = async () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpCode(code);
    try {
      const res = await invoke<string>('trigger_set_kill_otp', { otp: code });
      alert(res);
    } catch (e: any) {
      alert("Lỗi: " + e);
    }
  };

  const handleResumeService = async () => {
    setOtpCode(null);
    try {
      const res = await invoke<string>('trigger_resume_service');
      alert(res);
    } catch (e: any) {
      alert("Lỗi: " + e);
    }
  };

  const handleCheckUpdate = async () => {
    try {
      const res = await fetch(`${relayUrl}/updates/version.json`);
      if (res.ok) {
        const data = await res.json();
        const confirmUpdate = window.confirm(`Có bản cập nhật Service chạy ngầm mới!\n\nPhiên bản: ${data.version}\nNội dung: ${data.notes}\n\nBạn có muốn tự động tải xuống và cài đặt ngay không? (Sẽ yêu cầu quyền Admin một lần duy nhất)`);
        if (confirmUpdate) {
          try {
            const status = await invoke<string>('download_and_update_service', { relayUrl });
            alert(status);
          } catch (e: any) {
            alert("Lỗi khi cập nhật: " + e);
          }
        }
      } else {
        alert("Hiện chưa có bản cập nhật mới nào trên Server.");
      }
    } catch (e: any) {
      alert("Không thể kết nối đến Server để kiểm tra cập nhật: " + e.message);
    }
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
            <button 
              className="btn primary" 
              onClick={handleNativeGoogleLogin}
              style={{ padding: '16px', width: '100%', backgroundColor: '#fff', color: '#000', fontWeight: 'bold' }}
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="G" style={{ width: 18, marginRight: 8, verticalAlign: 'middle' }} />
              Đăng nhập bằng Trình Duyệt
            </button>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '16px', color: '#888' }}>👇 Đăng nhập ngay lập tức 👇</div>

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
              <div style={{ marginTop: 12 }}>
                <p><strong>Server Relay URL (Địa chỉ IP của máy tính này):</strong></p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <input 
                    type="text" 
                    value={relayUrl} 
                    onChange={(e) => setRelayUrl(e.target.value)}
                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', fontSize: '13px' }}
                  />
                </div>
                <p style={{ fontSize: '12px', color: '#888', marginTop: '8px', lineHeight: 1.4 }}>
                  Ghi chú: Mã QR sẽ cập nhật tự động khi bạn sửa URL trên. Điện thoại cần kết nối đúng IP mạng LAN của máy này (Ví dụ: http://192.168.x.x:3000) để tránh lỗi Websocket.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="actions-section" style={{ marginTop: '24px' }}>
          <div className="card actions-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <button className="btn primary" onClick={() => invoke('trigger_lock').then(alert).catch(alert)}>
              🔒 Khóa PC
            </button>
            <button className="btn warning" onClick={() => invoke('trigger_lock_usb').then(alert).catch(alert)}>
              🛡️ Khóa USB
            </button>
            <button className="btn danger" onClick={() => invoke('trigger_capture_camera').then(alert).catch(alert)}>
              📸 Chụp Ảnh Ngầm
            </button>
            <button className="btn secondary" onClick={() => {
              const newPass = prompt("Nhập mật khẩu mới:");
              if (newPass) invoke('trigger_change_password', { newPass }).then(alert).catch(alert);
            }}>
              🔑 Đổi Mật Khẩu
            </button>
            <button className="btn danger" onClick={handleSetKillOtp} style={{ border: '1px solid #fecaca' }}>
              ❌ Tắt Bảo Vệ (Tạo OTP)
            </button>
            <button className="btn primary" onClick={handleResumeService} style={{ backgroundColor: '#22c55e', boxShadow: '0 4px 14px rgba(34, 197, 94, 0.3)' }}>
              ✅ Bật Lại Bảo Vệ
            </button>
            <button className="btn secondary" onClick={handleCheckUpdate} style={{ backgroundColor: '#3b82f6', color: 'white' }}>
              ☁️ Cập nhật Service
            </button>
          </div>
        </section>

        {otpCode && (
          <section className="otp-section" style={{ marginTop: '24px' }}>
            <div className="card" style={{ textAlign: 'center', border: '2px dashed #ef4444', backgroundColor: '#fef2f2' }}>
              <h3 style={{ color: '#ef4444', marginTop: 0, fontSize: '1.2rem' }}>Mã OTP Tạm Ngưng Dịch Vụ</h3>
              <p style={{ color: '#0f172a' }}>Vui lòng nhập mã này vào ứng dụng Mobile để hoàn tất tắt tiến trình ngầm:</p>
              <h1 style={{ letterSpacing: '0.25em', fontSize: '3rem', margin: '1rem 0', color: '#b91c1c' }}>{otpCode}</h1>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 0 }}>Khi Service ngắt kết nối, sẽ tiết kiệm RAM cho máy tính. Bấm "Bật Lại Bảo Vệ" để khôi phục.</p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;
