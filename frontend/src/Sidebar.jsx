import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// ── route map ─────────────────────────────────────────────────────────
const NAV = [
  {
    group: "Workspace",
    items: [
      { label: "Dashboard",     route: "/dashboard",            icon: "◈" },
      { label: "Canvas",        route: "/canvas",               icon: "⊞" },
      { label: "Analytics",     route: "/analytics",            icon: "◎" },
      { label: "Notifications", route: "/notifications",        icon: "◇", badge: true },
    ],
  },
  {
    group: "Tasks",
    items: [
      { label: "All Tasks",     route: "/dashboard",            icon: "≡" },
      { label: "Decaying",      route: "/dashboard?filter=decaying", icon: "⌁", danger: true },
      { label: "Completed",     route: "/dashboard?filter=completed", icon: "✓" },
      { label: "Recurring",     route: "/dashboard?filter=recurring", icon: "↺" },
    ],
  },
  {
    group: "Social",
    items: [
      { label: "Leaderboard",   route: "/leaderboard",          icon: "⊛" },
      { label: "Rewards",       route: "/rewards",              icon: "⬡" },
      { label: "Shared Board",  route: "/shared",               icon: "⊗" },
      { label: "Accountability",route: "/accountability",       icon: "⊕" },
    ],
  },
  {
    group: "Settings",
    items: [
      { label: "Profile",       route: "/settings",             icon: "○" },
      { label: "Webhooks",      route: "/settings/webhooks",    icon: "⌘" },
      { label: "Preferences",   route: "/settings/preferences", icon: "⊜" },
    ],
  },
  {
    group: "Admin",
    admin: true,
    items: [
      { label: "Users",         route: "/admin/users",          icon: "⊞", admin: true },
      { label: "Audit Log",     route: "/admin/audit",          icon: "≋",  admin: true },
      { label: "System Stats",  route: "/admin/stats",          icon: "⊟", admin: true },
    ],
  },
];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=IBM+Plex+Mono:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:           #111009;
    --surface:      #1a1710;
    --surface2:     #201d12;
    --sb-width:     240px;
    --sb-collapsed: 60px;
    --border:       rgba(212,175,80,0.13);
    --border-hi:    rgba(212,175,80,0.4);
    --gold:         #d4af50;
    --gold-dim:     rgba(212,175,80,0.5);
    --gold-glow:    rgba(212,175,80,0.08);
    --text:         #e8e0cc;
    --text-dim:     rgba(232,224,204,0.45);
    --text-faint:   rgba(232,224,204,0.22);
    --red:          #c0614a;
    --red-dim:      rgba(192,97,74,0.14);
    --mono:         'IBM Plex Mono', monospace;
    --serif:        'Cormorant Garamond', serif;
    --transition:   240ms cubic-bezier(0.4,0,0.2,1);
  }

  /* ── App shell ── */
  .app-shell {
    display: flex;
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    font-family: var(--mono);
  }

  /* ── Sidebar ── */
  .sidebar {
    position: fixed;
    top: 0; left: 0; bottom: 0;
    width: var(--sb-width);
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    z-index: 200;
    transition: width var(--transition);
    overflow: hidden;
  }

  .sidebar.collapsed {
    width: var(--sb-collapsed);
  }

  /* thin gold shimmer on top edge */
  .sidebar::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, var(--gold) 0%, transparent 70%);
  }

  /* ── Logo area ── */
  .sb-logo {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 20px 18px 16px;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    transition: background var(--transition);
    flex-shrink: 0;
    text-decoration: none;
  }

  .sb-logo:hover { background: var(--gold-glow); }

  .logo-mark {
    width: 28px;
    height: 28px;
    border: 1.5px solid var(--gold);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--serif);
    font-style: italic;
    font-size: 14px;
    font-weight: 600;
    color: var(--gold);
    flex-shrink: 0;
    transition: box-shadow var(--transition);
  }

  .sb-logo:hover .logo-mark {
    box-shadow: 0 0 12px rgba(212,175,80,0.25);
  }

  .logo-text {
    font-family: var(--serif);
    font-size: 17px;
    font-style: italic;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    opacity: 1;
    transition: opacity var(--transition);
  }

  .logo-text em { color: var(--gold); font-style: normal; }

  .sidebar.collapsed .logo-text { opacity: 0; pointer-events: none; }

  /* ── Nav scroll area ── */
  .sb-nav {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 10px 0;
    scrollbar-width: none;
  }

  .sb-nav::-webkit-scrollbar { display: none; }

  /* ── Group ── */
  .nav-group { margin-bottom: 4px; }

  .nav-group-label {
    font-size: 8px;
    font-weight: 500;
    letter-spacing: .22em;
    text-transform: uppercase;
    color: var(--text-faint);
    padding: 10px 20px 5px;
    white-space: nowrap;
    overflow: hidden;
    opacity: 1;
    transition: opacity var(--transition);
  }

  .sidebar.collapsed .nav-group-label { opacity: 0; }

  /* ── Nav item ── */
  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 18px;
    cursor: pointer;
    position: relative;
    transition: background var(--transition);
    text-decoration: none;
    white-space: nowrap;
    border-radius: 0;
    margin: 1px 8px;
    border-radius: 4px;
    overflow: hidden;
  }

  .nav-item:hover {
    background: var(--gold-glow);
  }

  .nav-item.active {
    background: rgba(212,175,80,0.10);
  }

  /* Active left bar */
  .nav-item.active::before {
    content: '';
    position: absolute;
    left: 0; top: 50%;
    transform: translateY(-50%);
    width: 2px;
    height: 60%;
    background: var(--gold);
    border-radius: 0 2px 2px 0;
  }

  .nav-icon {
    font-size: 14px;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--text-dim);
    transition: color var(--transition);
    font-family: var(--mono);
    line-height: 1;
  }

  .nav-item.active .nav-icon,
  .nav-item:hover .nav-icon { color: var(--gold); }

  .nav-item.danger .nav-icon { color: var(--red); }
  .nav-item.danger:hover .nav-icon { color: #d4704a; }

  .nav-item.admin-item .nav-icon { color: rgba(192,97,74,0.6); }
  .nav-item.admin-item:hover .nav-icon { color: var(--red); }

  .nav-label {
    font-size: 12px;
    color: var(--text-dim);
    transition: color var(--transition), opacity var(--transition);
    font-weight: 400;
    letter-spacing: 0.02em;
    overflow: hidden;
    white-space: nowrap;
  }

  .nav-item.active .nav-label { color: var(--text); }
  .nav-item:hover .nav-label  { color: var(--text); }

  .sidebar.collapsed .nav-label { opacity: 0; pointer-events: none; }

  /* Badge */
  .nav-badge {
    margin-left: auto;
    min-width: 16px;
    height: 16px;
    background: var(--red);
    border-radius: 8px;
    font-size: 9px;
    font-weight: 500;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    flex-shrink: 0;
    transition: opacity var(--transition);
  }

  .sidebar.collapsed .nav-badge { opacity: 0; }

  /* Tooltip on collapsed */
  .nav-item .tooltip {
    position: absolute;
    left: calc(var(--sb-collapsed) - 8px);
    top: 50%;
    transform: translateY(-50%);
    background: var(--surface2);
    border: 1px solid var(--border-hi);
    border-radius: 4px;
    padding: 5px 10px;
    font-size: 11px;
    color: var(--text);
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity .15s;
    z-index: 300;
    box-shadow: 4px 4px 20px rgba(0,0,0,0.4);
  }

  .sidebar.collapsed .nav-item:hover .tooltip { opacity: 1; }

  /* Divider */
  .nav-divider {
    height: 1px;
    background: var(--border);
    margin: 8px 18px;
  }

  /* Admin group special border */
  .nav-group.admin-group {
    border-top: 1px solid var(--border);
    padding-top: 4px;
    margin-top: 4px;
  }

  .nav-group-label.admin-label { color: rgba(192,97,74,0.4); }

  /* ── Collapse toggle ── */
  .sb-footer {
    border-top: 1px solid var(--border);
    padding: 12px 10px;
    flex-shrink: 0;
  }

  /* User area */
  .sb-user {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 4px;
    cursor: pointer;
    transition: background var(--transition);
    margin-bottom: 8px;
    overflow: hidden;
  }

  .sb-user:hover { background: var(--gold-glow); }

  .user-avatar {
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

  .user-info {
    overflow: hidden;
    opacity: 1;
    transition: opacity var(--transition);
  }

  .sidebar.collapsed .user-info { opacity: 0; }

  .user-email {
    font-size: 10px;
    color: var(--text-dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 150px;
  }

  .user-role {
    font-size: 9px;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--gold-dim);
  }

  /* Collapse button */
  .collapse-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 10px;
    background: none;
    border: 1px solid var(--border);
    border-radius: 4px;
    cursor: pointer;
    color: var(--text-faint);
    font-family: var(--mono);
    font-size: 11px;
    transition: border-color var(--transition), color var(--transition), background var(--transition);
    overflow: hidden;
    white-space: nowrap;
  }

  .collapse-btn:hover {
    border-color: var(--border-hi);
    color: var(--text-dim);
    background: var(--gold-glow);
  }

  .collapse-arrow {
    font-size: 14px;
    flex-shrink: 0;
    transition: transform var(--transition);
    display: inline-block;
  }

  .sidebar.collapsed .collapse-arrow { transform: rotate(180deg); }

  .collapse-label {
    opacity: 1;
    transition: opacity var(--transition);
  }

  .sidebar.collapsed .collapse-label { opacity: 0; }

  /* ── Main content area ── */
  .main-content {
    margin-left: var(--sb-width);
    flex: 1;
    min-height: 100vh;
    transition: margin-left var(--transition);
    position: relative;
  }

  .main-content.collapsed {
    margin-left: var(--sb-collapsed);
  }

  /* ── Mobile overlay ── */
  .sb-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    z-index: 150;
    backdrop-filter: blur(2px);
    animation: fadeIn .2s ease;
  }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .sb-overlay.show { display: block; }

  /* Mobile toggle button */
  .mobile-toggle {
    display: none;
    position: fixed;
    top: 14px;
    left: 14px;
    z-index: 250;
    width: 36px;
    height: 36px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--gold);
    font-size: 16px;
    transition: background var(--transition);
  }

  .mobile-toggle:hover { background: var(--surface2); }

  @media (max-width: 768px) {
    .mobile-toggle { display: flex; }
    .sidebar {
      width: var(--sb-width) !important;
      transform: translateX(-100%);
      transition: transform var(--transition);
    }
    .sidebar.mobile-open {
      transform: translateX(0);
    }
    .main-content,
    .main-content.collapsed {
      margin-left: 0 !important;
    }
  }
`;

export default function Sidebar({ children, userEmail = "user@example.com", userRole = "member", notifCount = 3 }) {
  const [collapsed, setCollapsed]     = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();

  // close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // save collapsed state to localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sb_collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sb_collapsed", String(next));
  };

  const go = (route) => {
    navigate(route);
    setMobileOpen(false);
  };

  const isActive = (route) => {
    const base = route.split("?")[0];
    return location.pathname === base;
  };

  const initial = userEmail ? userEmail[0].toUpperCase() : "U";

  return (
    <>
      <style>{styles}</style>

      {/* Mobile hamburger */}
      <button className="mobile-toggle" onClick={() => setMobileOpen(true)}>☰</button>

      {/* Overlay */}
      <div
        className={`sb-overlay${mobileOpen ? " show" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      <div className="app-shell">
        {/* ── Sidebar ── */}
        <aside className={`sidebar${collapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`}>

          {/* Logo */}
          <div className="sb-logo" onClick={() => go("/dashboard")}>
            <div className="logo-mark">T</div>
            <span className="logo-text">Task<em>Decay</em></span>
          </div>

          {/* Nav */}
          <nav className="sb-nav">
            {NAV.map((group) => (
              <div key={group.group} className={`nav-group${group.admin ? " admin-group" : ""}`}>
                <div className={`nav-group-label${group.admin ? " admin-label" : ""}`}>
                  {group.group}
                </div>
                {group.items.map((item) => (
                  <div
                    key={item.route + item.label}
                    className={[
                      "nav-item",
                      isActive(item.route) ? "active" : "",
                      item.danger ? "danger" : "",
                      item.admin ? "admin-item" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => go(item.route)}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                    {item.badge && notifCount > 0 && (
                      <span className="nav-badge">{notifCount}</span>
                    )}
                    {/* Tooltip shown only when collapsed */}
                    <span className="tooltip">{item.label}</span>
                  </div>
                ))}
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="sb-footer">
            {/* User block */}
            <div className="sb-user" onClick={() => go("/settings")}>
              <div className="user-avatar">{initial}</div>
              <div className="user-info">
                <div className="user-email">{userEmail}</div>
                <div className="user-role">{userRole}</div>
              </div>
            </div>

            {/* Collapse toggle */}
            <button className="collapse-btn" onClick={toggleCollapse}>
              <span className="collapse-arrow">‹</span>
              <span className="collapse-label">Collapse sidebar</span>
            </button>
          </div>
        </aside>

        {/* ── Page content ── */}
        <main className={`main-content${collapsed ? " collapsed" : ""}`}>
          {children}
        </main>
      </div>
    </>
  );
}