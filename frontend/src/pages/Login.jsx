import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Mono:wght@300;400&display=swap');

  .auth-root {
    min-height: 100vh;
    background: #0d1a0f;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'DM Mono', monospace;
    position: relative;
    overflow: hidden;
  }

  .auth-root::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 60% 50% at 20% 80%, rgba(34, 85, 34, 0.18) 0%, transparent 60%),
      radial-gradient(ellipse 40% 60% at 80% 20%, rgba(60, 110, 40, 0.12) 0%, transparent 60%);
    pointer-events: none;
  }

  .spore {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(80,160,60,0.15), transparent 70%);
    animation: float linear infinite;
    pointer-events: none;
  }

  @keyframes float {
    0%   { transform: translateY(110vh) scale(0.5); opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 0.6; }
    100% { transform: translateY(-10vh) scale(1.2); opacity: 0; }
  }

  .auth-card {
    position: relative;
    z-index: 1;
    width: 420px;
    padding: 52px 48px;
    background: rgba(15, 28, 15, 0.85);
    border: 1px solid rgba(80, 160, 60, 0.2);
    border-radius: 4px;
    box-shadow:
      0 0 0 1px rgba(80,160,60,0.06),
      0 32px 80px rgba(0,0,0,0.6),
      inset 0 1px 0 rgba(80,160,60,0.1);
    backdrop-filter: blur(12px);
    animation: cardIn 0.6s cubic-bezier(0.16,1,0.3,1) both;
  }

  @keyframes cardIn {
    from { opacity: 0; transform: translateY(24px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .corner-ornament {
    position: absolute;
    width: 40px;
    height: 40px;
    pointer-events: none;
  }
  .corner-ornament.tl { top: -1px; left: -1px; border-top: 2px solid #5ea83a; border-left: 2px solid #5ea83a; border-radius: 4px 0 0 0; }
  .corner-ornament.br { bottom: -1px; right: -1px; border-bottom: 2px solid #5ea83a; border-right: 2px solid #5ea83a; border-radius: 0 0 4px 0; }

  .auth-eyebrow {
    font-size: 10px;
    font-weight: 400;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: #5ea83a;
    margin-bottom: 10px;
  }

  .auth-title {
    font-family: 'Playfair Display', serif;
    font-size: 34px;
    font-weight: 700;
    color: #d8edcc;
    margin: 0 0 6px;
    line-height: 1.1;
  }

  .auth-subtitle {
    font-size: 12px;
    color: rgba(180, 210, 160, 0.45);
    margin-bottom: 40px;
    letter-spacing: 0.02em;
  }

  .field { margin-bottom: 20px; }

  .field label {
    display: block;
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(180,210,160,0.5);
    margin-bottom: 8px;
  }

  .field input {
    width: 100%;
    background: rgba(80,160,60,0.05);
    border: 1px solid rgba(80,160,60,0.18);
    border-radius: 3px;
    padding: 13px 16px;
    color: #c8e0b8;
    font-family: 'DM Mono', monospace;
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
    box-sizing: border-box;
  }

  .field input::placeholder { color: rgba(140,190,110,0.25); }

  .field input:focus {
    border-color: rgba(94, 168, 58, 0.6);
    background: rgba(80,160,60,0.09);
    box-shadow: 0 0 0 3px rgba(94,168,58,0.08);
  }

  .btn-primary {
    width: 100%;
    margin-top: 8px;
    padding: 14px;
    background: #3d7a22;
    border: 1px solid #5ea83a;
    border-radius: 3px;
    color: #d8edcc;
    font-family: 'DM Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
  }

  .btn-primary:hover {
    background: #4a9229;
    box-shadow: 0 0 20px rgba(94,168,58,0.25);
    transform: translateY(-1px);
  }

  .btn-primary:active { transform: translateY(0); }

  .btn-primary.loading { pointer-events: none; opacity: 0.7; }

  .auth-footer {
    margin-top: 28px;
    text-align: center;
    font-size: 11px;
    color: rgba(140,190,110,0.35);
    letter-spacing: 0.04em;
  }

  .auth-footer a {
    color: #5ea83a;
    text-decoration: none;
    transition: color 0.2s;
  }
  .auth-footer a:hover { color: #7dc44e; }

  .toast {
    position: fixed;
    bottom: 32px;
    right: 32px;
    padding: 12px 20px;
    border-radius: 3px;
    font-family: 'DM Mono', monospace;
    font-size: 12px;
    z-index: 999;
    animation: toastIn 0.3s ease both;
  }
  .toast.success { background: #1e3d14; border: 1px solid #5ea83a; color: #a0d080; }
  .toast.error   { background: #3d1414; border: 1px solid #a83a3a; color: #d08080; }

  @keyframes toastIn {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

const spores = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  size: 60 + Math.random() * 120,
  left: Math.random() * 100,
  duration: 12 + Math.random() * 16,
  delay: Math.random() * 10,
}));

function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast ${type}`}>{msg}</div>;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const navigate = useNavigate();

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── auth logic unchanged ──────────────────────────────────────────
  const login = async () => {
    setLoading(true);
    try {
      const response = await axios.post("http://127.0.0.1:8000/login", { email, password });
      localStorage.setItem("token", response.data.access_token);
      showToast("Login successful", "success");
      navigate("/dashboard");
    } catch (err) {
      console.log(err);
      showToast("Login failed", "error");
    } finally {
      setLoading(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{styles}</style>

      <div className="auth-root">
        {spores.map(s => (
          <div key={s.id} className="spore" style={{
            width: s.size, height: s.size,
            left: `${s.left}%`,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }} />
        ))}

        <div className="auth-card">
          <div className="corner-ornament tl" />
          <div className="corner-ornament br" />

          <div className="auth-eyebrow">Task Decay · v1</div>
          <h1 className="auth-title">Welcome<br /><em>back.</em></h1>
          <p className="auth-subtitle">Your tasks have been waiting — and decaying.</p>

          <div className="field">
            <label>Email address</label>
            <input
              type="email"
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button className={`btn-primary${loading ? " loading" : ""}`} onClick={login}>
            {loading ? "Signing in..." : "Sign In →"}
          </button>

          <div className="auth-footer">
            No account yet? <a href="/signup">Sign up</a>
          </div>
        </div>

        {toast && <Toast msg={toast.message} type={toast.type} />}
      </div>
    </>
  );
}

export default Login;