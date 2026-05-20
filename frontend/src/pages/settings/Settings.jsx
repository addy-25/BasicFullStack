import { useState, useEffect } from "react";
import Integrations from "./Integrations";


const TABS = [
  { id: "profile",      label: "Profile",       icon: "○" },
  { id: "integrations", label: "Integrations",  icon: "⌘" },
  { id: "notifications",label: "Notifications", icon: "◇" },
  { id: "danger",       label: "Danger Zone",   icon: "⚠" },
];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,400;1,600&family=IBM+Plex+Mono:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:         #111009;
    --surface:    #1a1710;
    --surface2:   #221f14;
    --border:     rgba(212,175,80,0.14);
    --border-hi:  rgba(212,175,80,0.45);
    --gold:       #d4af50;
    --gold-dim:   rgba(212,175,80,0.55);
    --gold-glow:  rgba(212,175,80,0.10);
    --text:       #e8e0cc;
    --text-dim:   rgba(232,224,204,0.45);
    --text-faint: rgba(232,224,204,0.22);
    --red:        #c0614a;
    --mono:       'IBM Plex Mono', monospace;
    --serif:      'Cormorant Garamond', serif;
  }

  body { background: var(--bg); }

  .settings-root {
    min-height: 100vh;
    background: var(--bg);
    font-family: var(--mono);
    color: var(--text);
    position: relative;
  }

  .settings-root::after {
    content: '';
    position: fixed; inset: 0;
    background:
      radial-gradient(ellipse 55% 45% at 5% 95%, rgba(212,175,80,0.06) 0%, transparent 55%),
      radial-gradient(ellipse 40% 55% at 95% 5%,  rgba(180,120,50,0.04) 0%, transparent 55%);
    pointer-events: none; z-index: 0;
  }

  /* ── Page header ── */
  .settings-header {
    position: relative; z-index: 1;
    padding: 48px 48px 0;
    max-width: 1000px;
    margin: 0 auto;
  }

  .settings-eyebrow {
    font-size: 9px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 8px;
  }

  .settings-title {
    font-family: var(--serif);
    font-size: 38px;
    font-weight: 600;
    color: var(--text);
    line-height: 1;
    margin-bottom: 32px;
  }

  .settings-title em { font-style: italic; color: var(--gold); }

  /* ── Layout: left tabs + right content ── */
  .settings-layout {
    position: relative; z-index: 1;
    max-width: 1000px;
    margin: 0 auto;
    padding: 0 48px 80px;
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 32px;
    align-items: start;
  }

  /* ── Left tab list ── */
  .tab-list {
    position: sticky;
    top: 80px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .tab-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 3px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.06em;
    color: var(--text-faint);
    background: none;
    text-align: left;
    width: 100%;
  }

  .tab-item:hover {
    background: var(--gold-glow);
    color: var(--text-dim);
  }

  .tab-item.active {
    background: rgba(212,175,80,0.08);
    border-color: var(--border-hi);
    color: var(--gold);
  }

  /* danger tab special color */
  .tab-item.danger-tab { color: rgba(192,97,74,0.5); }
  .tab-item.danger-tab:hover { color: var(--red); background: rgba(192,97,74,0.06); }
  .tab-item.danger-tab.active { color: var(--red); border-color: rgba(192,97,74,0.4); background: rgba(192,97,74,0.08); }

  .tab-icon {
    font-size: 12px;
    width: 16px;
    text-align: center;
    flex-shrink: 0;
  }

  .tab-divider {
    height: 1px;
    background: var(--border);
    margin: 8px 0;
  }

  /* ── Right content panel ── */
  .tab-panel {
    min-height: 400px;
    animation: panelIn 0.2s ease both;
  }

  @keyframes panelIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Stub panels for unbuilt tabs ── */
  .stub {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    gap: 12px;
    text-align: center;
  }

  .stub-glyph {
    font-family: var(--serif);
    font-style: italic;
    font-size: 48px;
    color: rgba(212,175,80,0.08);
  }

  .stub-title {
    font-family: var(--serif);
    font-style: italic;
    font-size: 20px;
    color: var(--text-faint);
  }

  .stub-sub {
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(232,224,204,0.18);
  }
`;

// Stub component for tabs not yet built
function StubPanel({ name }) {
  return (
    <div className="stub">
      <div className="stub-glyph">∅</div>
      <div className="stub-title">{name}</div>
      <div className="stub-sub">Coming soon</div>
    </div>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");

  // ── Auto-switch to integrations tab if coming back from GitHub OAuth ──
  // When GitHub OAuth completes, it redirects to /settings?github=connected
  // We detect that here and switch to the integrations tab automatically
  // so the user immediately sees their connection was successful.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const githubParam = params.get("github");

    if (githubParam) {
      // Switch to integrations tab so user sees the result
      setActiveTab("integrations");
      // Clean up the URL — remove ?github=connected from the address bar
      window.history.replaceState({}, "", "/settings");
    }
  }, []);

  // Render the correct panel based on active tab
  function renderPanel() {
    switch (activeTab) {
      case "integrations":
        return <Integrations />;
      case "profile":
        return <StubPanel name="Profile" />;
      case "notifications":
        return <StubPanel name="Notifications" />;
      case "danger":
        return <StubPanel name="Danger Zone" />;
      default:
        return null;
    }
  }

  return (
    <>
      <style>{styles}</style>
      <div className="settings-root">

        <div className="settings-header">
          <div className="settings-eyebrow">Account</div>
          <h1 className="settings-title">Your <em>settings.</em></h1>
        </div>

        <div className="settings-layout">

          {/* Left tab list */}
          <nav className="tab-list">
            {TABS.map((tab, i) => (
              <>
                {/* Divider before Danger Zone */}
                {tab.id === "danger" && <div key="div" className="tab-divider" />}
                <button
                  key={tab.id}
                  className={[
                    "tab-item",
                    activeTab === tab.id ? "active" : "",
                    tab.id === "danger" ? "danger-tab" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="tab-icon">{tab.icon}</span>
                  {tab.label}
                </button>
              </>
            ))}
          </nav>

          {/* Right content panel — re-animates on tab switch */}
          <div className="tab-panel" key={activeTab}>
            {renderPanel()}
          </div>

        </div>
      </div>
    </>
  );
}