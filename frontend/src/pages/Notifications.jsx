import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://127.0.0.1:8000";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=IBM+Plex+Mono:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  :root {
    --bg:#111009; --surface:#1a1710; --border:rgba(212,175,80,0.14); --border-hi:rgba(212,175,80,0.45);
    --gold:#d4af50; --gold-dim:rgba(212,175,80,0.55); --text:#e8e0cc; --text-dim:rgba(232,224,204,0.45);
    --text-faint:rgba(232,224,204,0.22); --red:#c0614a; --red-dim:rgba(192,97,74,0.14); --green-ok:#6a9e60;
    --mono:'IBM Plex Mono',monospace; --serif:'Cormorant Garamond',serif;
  }
  .nt-root { min-height:100vh; background:var(--bg); font-family:var(--mono); color:var(--text); }
  .nt-body { max-width:820px; margin:0 auto; padding:52px 48px 100px; }
  .nt-eyebrow { font-size:9px; letter-spacing:.28em; text-transform:uppercase; color:var(--gold); margin-bottom:8px; }
  .nt-title { font-family:var(--serif); font-size:40px; font-weight:600; line-height:1; }
  .nt-title em { font-style:italic; color:var(--gold); }
  .nt-sub { font-size:11px; color:var(--text-faint); margin-top:8px; margin-bottom:36px; }
  .nt-divider { height:1px; background:var(--border); margin-bottom:32px; }

  .btn { padding:6px 14px; border-radius:2px; font-family:var(--mono); font-size:9px;
    letter-spacing:.14em; text-transform:uppercase; cursor:pointer; border:1px solid; background:none;
    transition:background .15s, transform .1s; }
  .btn:hover { transform:translateY(-1px); }
  .btn.green { border-color:rgba(106,158,96,0.5); color:#90c880; background:rgba(106,158,96,0.12); }
  .btn.red   { border-color:rgba(192,97,74,0.4); color:#d08070; background:var(--red-dim); }

  .item { background:var(--surface); border:1px solid var(--border); border-radius:3px;
    padding:18px 20px; margin-bottom:10px; position:relative; overflow:hidden; animation:in .25s ease both; }
  .item::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--gold); opacity:.5; }
  @keyframes in { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
  .item-top { display:flex; justify-content:space-between; align-items:flex-start; gap:14px; }
  .item-src { font-size:8px; letter-spacing:.2em; text-transform:uppercase; color:var(--gold-dim); margin-bottom:6px; }
  .item-title { font-size:14px; color:var(--text); margin-bottom:6px; }
  .item-body { font-size:11px; color:var(--text-dim); line-height:1.6; max-height:54px; overflow:hidden; }
  .item-link { font-size:10px; color:var(--gold-dim); text-decoration:none; }
  .item-link:hover { color:var(--gold); }
  .item-actions { display:flex; gap:6px; flex-shrink:0; }

  .empty { text-align:center; padding:80px 20px; }
  .empty-glyph { font-family:var(--serif); font-style:italic; font-size:60px; color:rgba(212,175,80,0.09); }
  .empty-title { font-family:var(--serif); font-style:italic; font-size:22px; color:var(--text-faint); margin-top:14px; }
  .empty-sub { font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:rgba(232,224,204,0.16); margin-top:8px; }

  .toast { position:fixed; bottom:32px; right:40px; padding:11px 20px; border-radius:2px; font-size:11px; z-index:999; animation:in .25s ease both; }
  .toast.success { background:rgba(106,158,96,0.12); border:1px solid rgba(106,158,96,0.4); color:#90c880; }
  .toast.error   { background:var(--red-dim); border:1px solid rgba(192,97,74,0.4); color:#d08070; }
`;

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [toast, setToast] = useState(null);

  const flash = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  };

  const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  const loadItems = async () => {
    try {
      const res = await axios.get(`${API}/notifications?status=inbox`, authHeader());
      setItems(res.data);
    } catch {
      flash("Failed to load inbox", "error");
    }
  };

  useEffect(() => { loadItems(); }, []);

  const accept = async (id) => {
    try {
      await axios.post(`${API}/notifications/${id}/accept`, {}, authHeader());
      setItems(prev => prev.filter(i => i.id !== id));
      flash("Added to dashboard ✓");
    } catch {
      flash("Failed to accept", "error");
    }
  };

  const dismiss = async (id) => {
    try {
      await axios.post(`${API}/notifications/${id}/dismiss`, {}, authHeader());
      setItems(prev => prev.filter(i => i.id !== id));
      flash("Dismissed");
    } catch {
      flash("Failed", "error");
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="nt-root">
        <div className="nt-body">
          <div className="nt-eyebrow">Inbox</div>
          <h1 className="nt-title">Notifications<em>.</em></h1>
          <p className="nt-sub">Issues pushed from your connected tools. Accept one to turn it into a task.</p>
          <div className="nt-divider" />

          {items.length === 0 ? (
            <div className="empty">
              <div className="empty-glyph">∅</div>
              <div className="empty-title">Inbox is clear.</div>
              <div className="empty-sub">New GitHub issues assigned to you will appear here.</div>
            </div>
          ) : items.map(item => (
            <div className="item" key={item.id}>
              <div className="item-top">
                <div style={{ minWidth: 0 }}>
                  <div className="item-src">{item.source}</div>
                  <div className="item-title">{item.title}</div>
                  {item.body && <div className="item-body">{item.body}</div>}
                  {item.url && (
                    <a className="item-link" href={item.url} target="_blank" rel="noreferrer">↗ view source</a>
                  )}
                </div>
                <div className="item-actions">
                  <button className="btn green" onClick={() => accept(item.id)}>✓ Accept</button>
                  <button className="btn red"   onClick={() => dismiss(item.id)}>Dismiss</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </>
  );
}