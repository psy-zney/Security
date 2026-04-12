import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("Connected");
  const [logs, setLogs] = useState<string[]>([
    "System Initialized",
    "Waiting for commands..."
  ]);

  function addLog(msg: string) {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${msg}`, ...prev].slice(0, 5));
  }

  async function greet() {
    setGreetMsg(await invoke("greet", { name }));
  }

  async function handleLockPC() {
    addLog("Sending Lock PC request...");
    try {
      const response: string = await invoke("trigger_lock");
      addLog(`✓ ${response}`);
      setStatus("Locked Triggered");
    } catch (error) {
      addLog(`❌ Error: ${error}`);
      setStatus("Error writing file");
    }
  }

  return (
    <div className="container">
      <div className="dashboard">
        <header className="header">
          <h1>Security Core UI</h1>
          <div className="status-indicator">
            <span className={`dot ${status === "Error writing file" ? "error" : ""}`}></span>
            {status}
          </div>
        </header>

        <section className="control-panel">
          <div className="card features">
            <h2>Command Center</h2>
            <p className="subtitle">Mô phỏng chức năng của Background Service (Yêu cầu quyền Administrator)</p>
            
            <div className="actions">
              <button className="btn danger flex items-center justify-center gap-2" onClick={handleLockPC}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Thử nghiệm Khóa PC & Đổi mật khẩu
              </button>
              
              <button className="btn secondary" onClick={() => addLog("Tính năng đang phát triển...")}>
                Cập nhật cấu hình mạng
              </button>
              <button className="btn secondary" onClick={() => addLog("Tính năng đang phát triển...")}>
                Thay đổi trạng thái USB
              </button>
            </div>
          </div>

          <div className="card log-viewer">
            <h2>System Logs</h2>
            <ul className="log-list">
              {logs.map((log, i) => (
                <li key={i}>{log}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Tauri test block */}
        <section className="card test-backend">
          <h2>Giao tiếp Backend Rust</h2>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              greet();
            }}
          >
            <input
              id="greet-input"
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="Nhập tên..."
            />
            <button className="btn primary" type="submit">Ping</button>
          </form>
          <p>{greetMsg}</p>
        </section>
      </div>
    </div>
  );
}

export default App;
