import { useState, useEffect } from "react";
import axios from "axios";

// ── All integrations defined here ─────────────────────────────────────
// To add a new provider later (Linear, Slack, Jira):
//   1. Add an object here with available: false
//   2. When backend is ready, change available: true
//   3. That's it — no other frontend code changes needed
const INTEGRATIONS = [
  {
    provider:  "github",
    icon:      "⚫",
    name:      "GitHub",
    desc:      "Issues assigned to you become tasks with decay. Completing a task closes the issue automatically.",
    features:  ["Assigned issues", "PR reviews", "Milestone deadlines", "Bidirectional sync"],
    available: true,
  },
  {
    provider:  "linear",
    icon:      "🟣",
    name:      "Linear",
    desc:      "Sync assigned issues from your current cycle. Cycle end date drives decay.",
    features:  ["Cycle issues", "Priority mapping", "Status sync"],
    available: false,
  },
  {
    provider:  "slack",
    icon:      "💬",
    name:      "Slack",
    desc:      "React to any message with an emoji to turn it into a task instantly.",
    features:  ["Emoji reactions", "Mentions", "DM reminders"],
    available: false,
  },
  {
    provider:  "jira",
    icon:      "🔵",
    name:      "Jira",
    desc:      "Sprint tickets assigned to you with sprint deadline as decay target.",
    features:  ["Sprint tickets", "Story points", "Status transitions"],
    available: false,
  },
  {
    provider:  "notion",
    icon:      "⬛",
    name:      "Notion",
    desc:      "Database items and action items assigned to you in Notion pages.",
    features:  ["Database rows", "Action items", "Due dates"],
    available: false,
  },
];

// ── Styles — unchanged from your original file ────────────────────────
const styles = `
  .int-root { padding: 0; }

  .int-section-title {
    font-size: 9px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--text-faint);
    margin-bottom: 16px;
  }

  .int-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 24px 28px;
    margin-bottom: 10px;
    position: relative;
    overflow: hidden;
  }

  .int-card.connected::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--gold) 0%, transparent 60%);
  }

  .int-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
  }

  .int-card-left {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    flex: 1;
  }

  .int-logo {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    background: var(--surface2);
    flex-shrink: 0;
  }

  .int-name {
    font-size: 15px;
    font-weight: 500;
    color: var(--text);
    margin-bottom: 4px;
    font-family: var(--serif);
    font-style: italic;
  }

  .int-desc {
    font-size: 11px;
    color: var(--text-dim);
    line-height: 1.5;
    max-width: 380px;
  }

  .status-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 9px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    flex-shrink: 0;
  }

  .status-badge.connected {
    background: rgba(106,158,96,0.12);
    border: 1px solid rgba(106,158,96,0.35);
    color: #90c880;
  }

  .status-badge.disconnected {
    background: rgba(212,175,80,0.06);
    border: 1px solid var(--border);
    color: var(--text-faint);
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .status-dot.connected    { background: #6a9e60; }
  .status-dot.disconnected { background: rgba(232,224,204,0.2); }

  .int-user-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
  }

  .int-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1px solid var(--border-hi);
    background: rgba(212,175,80,0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--serif);
    font-style: italic;
    font-size: 13px;
    color: var(--gold);
    flex-shrink: 0;
  }

  .int-username {
    font-size: 12px;
    color: var(--text-dim);
    font-family: var(--mono);
    flex: 1;
  }

  .int-username strong {
    color: var(--text);
    font-weight: 500;
  }

  .btn-connect {
    padding: 9px 20px;
    background: rgba(212,175,80,0.10);
    border: 1px solid var(--gold);
    border-radius: 2px;
    color: var(--gold);
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .btn-connect:hover {
    background: rgba(212,175,80,0.18);
    box-shadow: 0 0 16px rgba(212,175,80,0.15);
    transform: translateY(-1px);
  }

  .btn-connect:active  { transform: translateY(0); }
  .btn-connect:disabled { opacity: 0.45; pointer-events: none; }

  .btn-disconnect {
    padding: 6px 14px;
    background: none;
    border: 1px solid rgba(192,97,74,0.3);
    border-radius: 2px;
    color: rgba(192,97,74,0.6);
    font-family: var(--mono);
    font-size: 9px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
  }

  .btn-disconnect:hover {
    background: rgba(192,97,74,0.08);
    border-color: rgba(192,97,74,0.5);
    color: #c0614a;
  }

  .int-features {
    margin-top: 14px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .int-feature {
    font-size: 9px;
    padding: 2px 9px;
    border-radius: 2px;
    border: 1px solid var(--border);
    color: var(--text-faint);
    letter-spacing: 0.06em;
  }

  .int-card.coming-soon { opacity: 0.45; }

  .coming-soon-label {
    font-size: 9px;
    padding: 2px 9px;
    border: 1px solid var(--border);
    border-radius: 20px;
    color: var(--text-faint);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    flex-shrink: 0;
  }

  .toast {
    position: fixed;
    bottom: 32px; right: 40px;
    padding: 11px 20px;
    border-radius: 2px;
    font-size: 11px;
    letter-spacing: 0.06em;
    z-index: 999;
    animation: toastIn 0.25s ease both;
  }
  .toast.success {
    background: rgba(106,158,96,0.12);
    border: 1px solid rgba(106,158,96,0.4);
    color: #90c880;
  }
  .toast.error {
    background: rgba(192,97,74,0.14);
    border: 1px solid rgba(192,97,74,0.4);
    color: #d08070;
  }

  @keyframes toastIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .skeleton {
    height: 120px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 3px;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
  }
`;

// ── Toast ─────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast ${type}`}>{msg}</div>;
}

// ── IntegrationCard ───────────────────────────────────────────────────
// Each available integration gets its own card component with its own
// state. GitHub card manages GitHub state, Slack card manages Slack
// state independently. They don't interfere with each other.
function IntegrationCard({ integration, showToast }) {
  const { provider, icon, name, desc, features } = integration;

  const [loading,    setLoading]    = useState(true);
  const [connected,  setConnected]  = useState(false);
  const [username,   setUsername]   = useState(null);
  const [connecting, setConnecting] = useState(false);

  // Check if this provider is already connected when card mounts
  useEffect(() => {
    const checkStatus = async () => {
      const token = localStorage.getItem("token");
      try {
        // provider variable is "github", "slack", etc.
        // backtick string so ${provider} is actually replaced
        const res = await axios.get(
          `http://127.0.0.1:8000/integrations/${provider}/status`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setConnected(res.data.connected);
        setUsername(res.data.username);
      } catch {
        setConnected(false);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [provider]);

  const handleConnect = async () => {
    setConnecting(true);
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(
        `http://127.0.0.1:8000/integrations/${provider}/oauth-url`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Redirect browser to provider's OAuth page
      // Page navigates away so setConnecting(false) is never called
      // Button stays in "Redirecting..." until user comes back
      window.location.href = res.data.url;
    } catch {
      showToast(`Failed to start ${name} connection`, "error");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    const token = localStorage.getItem("token");
    try {
      await axios.delete(
        `http://127.0.0.1:8000/integrations/${provider}/disconnect`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConnected(false);
      setUsername(null);
      showToast(`${name} disconnected`, "success");
    } catch {
      showToast(`Failed to disconnect ${name}`, "error");
    }
  };

  if (loading) return <div className="skeleton" />;

  return (
    <div className={`int-card ${connected ? "connected" : ""}`}>
      <div className="int-card-top">

        <div className="int-card-left">
          <div className="int-logo">{icon}</div>
          <div>
            <div className="int-name">{name}</div>
            <div className="int-desc">{desc}</div>
            <div className="int-features">
              {features.map(f => (
                <span key={f} className="int-feature">{f}</span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:10, flexShrink:0 }}>
          <div className={`status-badge ${connected ? "connected" : "disconnected"}`}>
            <div className={`status-dot ${connected ? "connected" : "disconnected"}`} />
            {connected ? "Connected" : "Not connected"}
          </div>

          {!connected && (
            <button
              className="btn-connect"
              onClick={handleConnect}
              disabled={connecting}
            >
              {connecting ? "Redirecting…" : `Connect ${name}`}
            </button>
          )}
        </div>
      </div>

      {connected && (
        <div className="int-user-row">
          <div className="int-avatar">
            {username ? username[0].toUpperCase() : name[0]}
          </div>
          <div className="int-username">
            Connected as <strong>{username || `your ${name} account`}</strong>
          </div>
          <button className="btn-disconnect" onClick={handleDisconnect}>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Integrations page ────────────────────────────────────────────
export default function Integrations() {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Read URL params once on mount — handles ALL providers generically
  // GitHub OAuth  → /settings?github=connected
  // Slack OAuth   → /settings?slack=connected   (future)
  // Linear OAuth  → /settings?linear=connected  (future)
  // Same code handles all of them
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    INTEGRATIONS.forEach(({ provider, name }) => {
      const result = params.get(provider);

      if (result === "connected") {
        showToast(`${name} connected successfully ✓`, "success");
      }
      if (result === "cancelled") {
        showToast(`${name} connection cancelled`, "error");
      }
      if (result === "error") {
        showToast(`${name} connection failed — try again`, "error");
      }
    });

    // Clean the URL so params don't persist on refresh
    window.history.replaceState({}, "", "/settings");
  }, []);

  return (
    <>
      <style>{styles}</style>
      <div className="int-root">

        <div className="int-section-title">Connected services</div>

        {/* Render a card for each available integration */}
        {INTEGRATIONS.filter(i => i.available).map(integration => (
          <IntegrationCard
            key={integration.provider}
            integration={integration}
            showToast={showToast}
          />
        ))}

        <div className="int-section-title" style={{ marginTop: 32 }}>
          Coming soon
        </div>

        {/* Coming soon — visual only, not interactive */}
        {INTEGRATIONS.filter(i => !i.available).map(integration => (
          <div key={integration.provider} className="int-card coming-soon">
            <div className="int-card-top">
              <div className="int-card-left">
                <div className="int-logo">{integration.icon}</div>
                <div>
                  <div className="int-name">{integration.name}</div>
                  <div className="int-desc">{integration.desc}</div>
                </div>
              </div>
              <span className="coming-soon-label">Soon</span>
            </div>
          </div>
        ))}

      </div>

      {toast && <Toast msg={toast.message} type={toast.type} />}
    </>
  );
}