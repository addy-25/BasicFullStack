import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";

// ── existing pages ────────────────────────────────────────────────────
import Login     from "./pages/Login";
import Signup    from "./pages/Signup";
import Dashboard from "./pages/Dashboard";

// ── stub pages (replace with real components as you build them) ───────
const Stub = ({ name }) => (
  <div style={{
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#111009",
    fontFamily: "'IBM Plex Mono', monospace",
    color: "rgba(232,224,204,0.3)",
    gap: 12,
  }}>
    <div style={{ fontSize: 48, opacity: 0.15, fontFamily: "Cormorant Garamond, serif", fontStyle: "italic" }}>
      ∅
    </div>
    <div style={{ fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase" }}>
      {name}
    </div>
    <div style={{ fontSize: 11, opacity: 0.5 }}>
      Page coming soon
    </div>
  </div>
);

// ── auth guard ────────────────────────────────────────────────────────
function RequireAuth({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

// ── layout wrapper (sidebar shown only on protected pages) ────────────
function AppLayout({ children }) {
  const email = localStorage.getItem("user_email") || "user@example.com";
  const role  = localStorage.getItem("user_role")  || "member";
  return (
    <Sidebar userEmail={email} userRole={role} notifCount={3}>
      {children}
    </Sidebar>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public routes (no sidebar) ── */}
        <Route path="/login"          element={<Login />} />
        <Route path="/signup"         element={<Signup />} />
        <Route path="/forgot-password" element={<Stub name="Forgot Password" />} />
        <Route path="/reset-password/:token" element={<Stub name="Reset Password" />} />
        <Route path="/shared/:token"  element={<Stub name="Shared Board" />} />

        {/* ── Protected routes (with sidebar) ── */}
        <Route path="/onboarding" element={
          <RequireAuth><Stub name="Onboarding" /></RequireAuth>
        } />

        <Route path="/dashboard" element={
          <RequireAuth>
            <AppLayout><Dashboard /></AppLayout>
          </RequireAuth>
        } />

        <Route path="/canvas" element={
          <RequireAuth>
            <AppLayout><Stub name="Spatial Canvas" /></AppLayout>
          </RequireAuth>
        } />

        <Route path="/tasks/:id" element={
          <RequireAuth>
            <AppLayout><Stub name="Task Detail" /></AppLayout>
          </RequireAuth>
        } />

        <Route path="/analytics" element={
          <RequireAuth>
            <AppLayout><Stub name="Analytics" /></AppLayout>
          </RequireAuth>
        } />

        <Route path="/notifications" element={
          <RequireAuth>
            <AppLayout><Stub name="Notifications" /></AppLayout>
          </RequireAuth>
        } />

        <Route path="/leaderboard" element={
          <RequireAuth>
            <AppLayout><Stub name="Leaderboard" /></AppLayout>
          </RequireAuth>
        } />

        <Route path="/rewards" element={
          <RequireAuth>
            <AppLayout><Stub name="Rewards" /></AppLayout>
          </RequireAuth>
        } />

        <Route path="/accountability" element={
          <RequireAuth>
            <AppLayout><Stub name="Accountability" /></AppLayout>
          </RequireAuth>
        } />

        <Route path="/settings" element={
          <RequireAuth>
            <AppLayout><Stub name="Settings — Profile" /></AppLayout>
          </RequireAuth>
        } />

        <Route path="/settings/webhooks" element={
          <RequireAuth>
            <AppLayout><Stub name="Settings — Webhooks" /></AppLayout>
          </RequireAuth>
        } />

        <Route path="/settings/preferences" element={
          <RequireAuth>
            <AppLayout><Stub name="Settings — Preferences" /></AppLayout>
          </RequireAuth>
        } />

        {/* ── Admin routes ── */}
        <Route path="/admin/users" element={
          <RequireAuth>
            <AppLayout><Stub name="Admin — Users" /></AppLayout>
          </RequireAuth>
        } />

        <Route path="/admin/audit" element={
          <RequireAuth>
            <AppLayout><Stub name="Admin — Audit Log" /></AppLayout>
          </RequireAuth>
        } />

        <Route path="/admin/stats" element={
          <RequireAuth>
            <AppLayout><Stub name="Admin — System Stats" /></AppLayout>
          </RequireAuth>
        } />

        {/* ── Fallbacks ── */}
        <Route path="/"  element={<Navigate to="/dashboard" replace />} />
        <Route path="*"  element={
          <div style={{
            minHeight:"100vh", display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            background:"#111009", fontFamily:"'Cormorant Garamond',serif",
            color:"rgba(232,224,204,0.4)", gap:16,
          }}>
            <div style={{ fontSize:80, fontStyle:"italic", opacity:.15 }}>404</div>
            <div style={{ fontSize:22, fontStyle:"italic" }}>Page not found.</div>
            <button
              onClick={() => window.location.href = "/dashboard"}
              style={{
                marginTop:8, padding:"8px 20px",
                background:"none", border:"1px solid rgba(212,175,80,0.3)",
                borderRadius:3, color:"rgba(212,175,80,0.6)",
                fontFamily:"'IBM Plex Mono',monospace", fontSize:11,
                letterSpacing:".14em", textTransform:"uppercase", cursor:"pointer",
              }}
            >
              ← Back to dashboard
            </button>
          </div>
        } />

      </Routes>
    </BrowserRouter>
  );
}