import { useEffect, useState } from "react";
import axios from "axios";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=IBM+Plex+Mono:wght@300;400;500&display=swap');

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
    --red-dim:    rgba(192,97,74,0.14);
    --amber:      #c08040;
    --green-ok:   #6a9e60;
    --mono:       'IBM Plex Mono', monospace;
    --serif:      'Cormorant Garamond', serif;
  }

  body { background: var(--bg); }

  .dash-root {
    min-height: 100vh;
    background: var(--bg);
    font-family: var(--mono);
    color: var(--text);
    position: relative;
  }

  .dash-root::after {
    content: '';
    position: fixed;
    inset: 0;
    background:
      radial-gradient(ellipse 55% 45% at 5% 95%, rgba(212,175,80,0.07) 0%, transparent 55%),
      radial-gradient(ellipse 40% 55% at 95% 5%,  rgba(180,120,50,0.05) 0%, transparent 55%);
    pointer-events: none;
    z-index: 0;
  }

  .topbar {
    position: sticky; top: 0; z-index: 200;
    height: 56px;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 48px;
    background: rgba(17,16,9,0.93);
    border-bottom: 1px solid var(--border);
    backdrop-filter: blur(14px);
  }

  .logo {
    font-family: var(--serif);
    font-size: 20px; font-style: italic; font-weight: 600;
    color: var(--text); letter-spacing: 0.01em;
  }
  .logo em { color: var(--gold); font-style: normal; }

  .topbar-right { display: flex; align-items: center; gap: 16px; }

  .streak {
    display: flex; align-items: center; gap: 7px;
    padding: 4px 12px;
    border: 1px solid var(--border); border-radius: 2px;
    font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
    color: var(--gold-dim);
  }

  .btn-logout {
    background: none;
    border: 1px solid var(--border); border-radius: 2px;
    color: var(--text-faint);
    font-family: var(--mono); font-size: 9px;
    letter-spacing: 0.16em; text-transform: uppercase;
    padding: 5px 14px; cursor: pointer;
    transition: border-color 0.2s, color 0.2s;
  }
  .btn-logout:hover { border-color: var(--border-hi); color: var(--text-dim); }

  .dash-body {
    position: relative; z-index: 1;
    max-width: 960px; margin: 0 auto;
    padding: 52px 48px 100px;
  }

  .page-header {
    margin-bottom: 44px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border);
  }

  .page-eyebrow {
    font-size: 9px; letter-spacing: 0.28em; text-transform: uppercase;
    color: var(--gold); margin-bottom: 8px;
  }

  .page-title {
    font-family: var(--serif);
    font-size: 44px; font-weight: 600;
    color: var(--text); line-height: 1;
  }
  .page-title em { font-style: italic; color: var(--gold); }

  /* Stats */
  .stats-row {
    display: grid; grid-template-columns: repeat(4,1fr);
    gap: 1px; background: var(--border);
    border: 1px solid var(--border); border-radius: 3px;
    overflow: hidden; margin-bottom: 36px;
  }

  .stat { background: var(--surface); padding: 20px 24px; transition: background 0.2s; }
  .stat:hover { background: var(--surface2); }

  .stat-lbl {
    font-size: 8px; letter-spacing: 0.22em; text-transform: uppercase;
    color: var(--text-faint); margin-bottom: 8px;
  }

  .stat-val {
    font-family: var(--serif); font-size: 32px; font-weight: 600;
    color: var(--text); line-height: 1;
  }
  .stat-val.warn   { color: var(--amber); }
  .stat-val.danger { color: var(--red); }
  .stat-val.good   { color: var(--green-ok); }

  /* Input panel */
  .input-panel {
    background: var(--surface);
    border: 1px solid var(--border); border-radius: 3px;
    padding: 28px 32px; margin-bottom: 32px;
    position: relative;
  }
  .input-panel::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, var(--gold) 0%, transparent 60%);
    border-radius: 3px 3px 0 0;
  }

  .input-label {
    font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase;
    color: var(--text-faint); margin-bottom: 14px;
  }

  .input-row { display: flex; gap: 10px; align-items: stretch; }

  .task-input {
    flex: 1;
    background: rgba(212,175,80,0.04);
    border: 1px solid var(--border); border-radius: 2px;
    padding: 12px 16px; color: var(--text);
    font-family: var(--mono); font-size: 13px;
    outline: none; transition: border-color 0.2s, background 0.2s;
  }
  .task-input::placeholder { color: var(--text-faint); }
  .task-input:focus { border-color: var(--border-hi); background: rgba(212,175,80,0.07); }

  .energy-select {
    background: rgba(212,175,80,0.04);
    border: 1px solid var(--border); border-radius: 2px;
    padding: 0 14px; color: var(--text-dim);
    font-family: var(--mono); font-size: 11px;
    outline: none; cursor: pointer; min-width: 136px;
    transition: border-color 0.2s;
  }
  .energy-select:focus { border-color: var(--border-hi); }
  .energy-select option { background: var(--surface); }

  .btn-add {
    padding: 0 28px;
    background: rgba(212,175,80,0.10);
    border: 1px solid var(--gold); border-radius: 2px;
    color: var(--gold);
    font-family: var(--mono); font-size: 10px;
    letter-spacing: 0.16em; text-transform: uppercase;
    cursor: pointer; white-space: nowrap;
    transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
  }
  .btn-add:hover { background: rgba(212,175,80,0.18); box-shadow: 0 0 20px rgba(212,175,80,0.15); transform: translateY(-1px); }
  .btn-add:active { transform: translateY(0); }
  .btn-add:disabled { opacity: 0.45; pointer-events: none; }

  .input-hint { margin-top: 10px; font-size: 10px; color: var(--text-faint); font-style: italic; }

  /* Filters */
  .filter-row { display: flex; gap: 2px; margin-bottom: 20px; }

  .filter-btn {
    padding: 5px 16px; background: none;
    border: 1px solid transparent; border-radius: 2px;
    font-family: var(--mono); font-size: 9px;
    letter-spacing: 0.16em; text-transform: uppercase;
    color: var(--text-faint); cursor: pointer; transition: all 0.15s;
  }
  .filter-btn:hover { color: var(--text-dim); border-color: var(--border); }
  .filter-btn.active { background: var(--gold-glow); border-color: var(--border-hi); color: var(--gold); }

  /* Task list */
  .task-list { display: flex; flex-direction: column; gap: 2px; }

  .task-row {
    display: grid;
    grid-template-columns: 48px 1fr 160px 48px;
    align-items: center;
    background: var(--surface);
    border: 1px solid var(--border); border-radius: 2px;
    transition: background 0.15s, border-color 0.15s;
    animation: rowIn 0.3s ease both;
    overflow: hidden; position: relative;
  }
  @keyframes rowIn {
    from { opacity: 0; transform: translateX(-8px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .task-row:hover { background: var(--surface2); border-color: rgba(212,175,80,0.22); }
  .task-row.done  { opacity: 0.4; }
  .task-row.updating { pointer-events: none; }

  .accent-bar {
    position: absolute; left: 0; top: 0; bottom: 0; width: 2px;
    transition: background 0.6s;
  }

  /* Checkbox cell */
  .cb-cell {
    display: flex; align-items: center; justify-content: center;
    height: 100%; padding: 18px 0 18px 16px;
    cursor: pointer;
  }

  .cb {
    width: 17px; height: 17px;
    border: 1.5px solid rgba(212,175,80,0.28); border-radius: 2px;
    background: none;
    display: flex; align-items: center; justify-content: center;
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
    flex-shrink: 0;
  }
  .cb-cell:hover .cb { border-color: var(--gold); box-shadow: 0 0 8px rgba(212,175,80,0.18); }
  .cb.checked { background: rgba(106,158,96,0.15); border-color: var(--green-ok); }

  /* Task info */
  .task-info {
    padding: 16px 18px;
    display: flex; flex-direction: column; gap: 5px;
    min-width: 0;
  }

  .task-title-text {
    font-size: 13px; color: var(--text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    transition: color 0.2s;
  }
  .task-title-text.done { text-decoration: line-through; color: var(--text-faint); }

  .task-chips { display: flex; align-items: center; gap: 8px; }

  .chip {
    padding: 2px 9px; border-radius: 2px;
    font-size: 8px; letter-spacing: 0.14em; text-transform: uppercase;
    border: 1px solid;
  }
  .chip.high   { color: #c07060; border-color: rgba(192,112,96,0.3);  background: rgba(192,112,96,0.08); }
  .chip.medium { color: #c0a060; border-color: rgba(192,160,96,0.3);  background: rgba(192,160,96,0.08); }
  .chip.low    { color: #80b070; border-color: rgba(128,176,112,0.3); background: rgba(128,176,112,0.07); }

  /* Decay bar */
  .decay-wrap { padding: 0 20px; }
  .decay-top {
    display: flex; justify-content: space-between;
    font-size: 8px; color: var(--text-faint); letter-spacing: 0.1em; margin-bottom: 5px;
  }
  .decay-track { height: 2px; background: rgba(212,175,80,0.07); border-radius: 1px; overflow: hidden; }
  .decay-fill { height: 100%; border-radius: 1px; transition: width 1s ease, background 0.6s; }

  /* Delete btn */
  .btn-del {
    height: 100%; width: 100%;
    background: none; border: none;
    border-left: 1px solid var(--border);
    color: var(--text-faint); font-size: 18px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background 0.15s, color 0.15s;
  }
  .btn-del:hover { background: var(--red-dim); color: var(--red); }

  /* Empty */
  .empty { text-align: center; padding: 80px 20px; }
  .empty-glyph { font-family: var(--serif); font-style: italic; font-size: 60px; color: rgba(212,175,80,0.09); margin-bottom: 18px; }
  .empty-title { font-family: var(--serif); font-style: italic; font-size: 22px; color: var(--text-faint); margin-bottom: 8px; }
  .empty-sub   { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(232,224,204,0.16); }

  /* Toast */
  .toast {
    position: fixed; bottom: 32px; right: 40px;
    padding: 11px 20px; border-radius: 2px;
    font-size: 11px; letter-spacing: 0.06em; z-index: 999;
    animation: toastIn 0.25s ease both;
  }
  .toast.success { background: rgba(106,158,96,0.12); border: 1px solid rgba(106,158,96,0.4); color: #90c880; }
  .toast.error   { background: var(--red-dim); border: 1px solid rgba(192,97,74,0.4); color: #d08070; }

  @keyframes toastIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

function getDecayLevel(task) {
  if (task.completed) return 0;
  const daysOld = (Date.now() - new Date(task.created_at || Date.now())) / 86400000;
  const ageScore = Math.min(daysOld / 7, 1) * 50;
  let dueScore = 0;
  if (task.due_date) {
    const daysLeft = (new Date(task.due_date) - Date.now()) / 86400000;
    if (daysLeft <= 0) dueScore = 50;
    else if (daysLeft <= 1) dueScore = 40;
    else if (daysLeft <= 3) dueScore = 25;
    else if (daysLeft <= 7) dueScore = 10;
  }
  return Math.min((ageScore + dueScore) * (task.priority_weight || 1), 100);
}

function decayColor(level) {
  if (level >= 75) return "#c0614a";
  if (level >= 50) return "#c08040";
  if (level >= 25) return "#c0a040";
  return "#6a9e60";
}

function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast ${type}`}>{msg}</div>;
}

export default function Dashboard() {
  const [tasks, setTasks]       = useState([]);
  const [title, setTitle]       = useState("");
  const [energy, setEnergy]     = useState("medium");
  const [filter, setFilter]     = useState("all");
  const [adding, setAdding]     = useState(false);
  const [updating, setUpdating] = useState(null);
  const [toast, setToast]       = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2800);
  };

  // ── auth logic unchanged ──────────────────────────────────────────
  const fetchTasks = async () => {
    const token = localStorage.getItem("token");
    const response = await axios.get("http://127.0.0.1:8000/tasks", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setTasks(response.data);
  };

  useEffect(() => { fetchTasks(); }, []);

  const createTask = async () => {
    if (!title.trim()) return;
    setAdding(true);
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        "http://127.0.0.1:8000/tasks",
        { title, energy_level: energy },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTitle("");
      fetchTasks();
      showToast("Task added");
    } catch {
      showToast("Failed to add task", "error");
    } finally {
      setAdding(false);
    }
  };

  // ── NEW: calls PATCH /tasks/{id}/complete, toggles True/False ────
  const toggleComplete = async (task) => {
    setUpdating(task.id);
    const token = localStorage.getItem("token");
    try {
      await axios.patch(
        `http://127.0.0.1:8000/tasks/${task.id}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTasks(prev =>
        prev.map(t =>
          t.id === task.id
            ? { ...t, completed: !t.completed }
            : t
        )
      );
      showToast(task.completed ? "Marked incomplete" : "Completed ✓");
    } catch {
      showToast("Update failed", "error");
    } finally {
      setUpdating(null);
    }
  };

  const deleteTask = async (taskId) => {
    const token = localStorage.getItem("token");
    try {
      await axios.delete(`http://127.0.0.1:8000/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(prev => prev.filter(t => t.id !== taskId));
      showToast("Deleted");
    } catch {
      showToast("Delete failed", "error");
    }
  };
  // ─────────────────────────────────────────────────────────────────

  const handleKey = (e) => { if (e.key === "Enter") createTask(); };

  const activeCount    = tasks.filter(t => !t.completed).length;
  const completedCount = tasks.filter(t => t.completed).length;
  const decayingCount  = tasks.filter(t => !t.completed && getDecayLevel(t) >= 50).length;
  const totalCount     = tasks.length;

  const filtered = tasks.filter(t => {
    if (filter === "active")    return !t.completed;
    if (filter === "completed") return t.completed;
    if (filter === "decaying")  return !t.completed && getDecayLevel(t) >= 50;
    return true;
  });

  return (
    <>
      <style>{styles}</style>
      <div className="dash-root">

        {/* Topbar */}
        <div className="topbar">
          <div className="logo">Task<em>Decay</em></div>
          <div className="topbar-right">
            <div className="streak">🔥 0-day streak</div>
            <button className="btn-logout" onClick={() => { localStorage.removeItem("token"); window.location.href = "/login"; }}>
              Logout
            </button>
          </div>
        </div>

        <div className="dash-body">

          {/* Header */}
          <div className="page-header">
            <div className="page-eyebrow">Workspace</div>
            <h1 className="page-title">Your <em>tasks.</em></h1>
          </div>

          {/* Stats */}
          <div className="stats-row">
            {[
              { lbl: "Total",     val: totalCount,     cls: "" },
              { lbl: "Active",    val: activeCount,    cls: "" },
              { lbl: "Decaying",  val: decayingCount,  cls: decayingCount > 2 ? "danger" : decayingCount > 0 ? "warn" : "" },
              { lbl: "Completed", val: completedCount, cls: completedCount > 0 ? "good" : "" },
            ].map(s => (
              <div className="stat" key={s.lbl}>
                <div className="stat-lbl">{s.lbl}</div>
                <div className={`stat-val ${s.cls}`}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="input-panel">
            <div className="input-label">New task</div>
            <div className="input-row">
              <input
                className="task-input"
                placeholder='e.g. "Submit report by Friday"'
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={handleKey}
              />
              <select className="energy-select" value={energy} onChange={e => setEnergy(e.target.value)}>
                <option value="high">⚡ High energy</option>
                <option value="medium">🔋 Medium</option>
                <option value="low">🌿 Low energy</option>
              </select>
              <button className="btn-add" onClick={createTask} disabled={adding}>
                {adding ? "Adding…" : "+ Add"}
              </button>
            </div>
            <div className="input-hint">Press Enter to add · NLP parsing coming soon</div>
          </div>

          {/* Filters */}
          <div className="filter-row">
            {["all", "active", "decaying", "completed"].map(f => (
              <button key={f} className={`filter-btn ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>

          {/* Task list */}
          <div className="task-list">
            {filtered.length === 0 && (
              <div className="empty">
                <div className="empty-glyph">∅</div>
                <div className="empty-title">Nothing here.</div>
                <div className="empty-sub">Add a task above to begin.</div>
              </div>
            )}

            {filtered.map((task, i) => {
              const done       = !!task.completed;
              const decay      = getDecayLevel(task);
              const isUpdating = updating === task.id;

              return (
                <div
                  key={task.id}
                  className={`task-row${done ? " done" : ""}${isUpdating ? " updating" : ""}`}
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div className="accent-bar" style={{ background: done ? "rgba(106,158,96,0.35)" : decayColor(decay) }} />

                  {/* Checkbox */}
                  <div className="cb-cell" onClick={() => !isUpdating && toggleComplete(task)}>
                    <div className={`cb${done ? " checked" : ""}`}>
                      {done && (
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                          <path d="M1.5 4.5l2 2 4-4" stroke="#6a9e60" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="task-info">
                    <div className={`task-title-text${done ? " done" : ""}`}>{task.title}</div>
                    <div className="task-chips">
                      <span className={`chip ${task.energy_level || "medium"}`}>
                        {task.energy_level === "high" ? "⚡ high" : task.energy_level === "low" ? "🌿 low" : "🔋 mid"}
                      </span>
                      {task.due_date && (
                        <span style={{ fontSize: "9px", color: "var(--text-faint)", letterSpacing: "0.1em" }}>
                          due {task.due_date}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Decay bar (hidden when done) */}
                  {!done ? (
                    <div className="decay-wrap">
                      <div className="decay-top"><span>decay</span><span>{Math.round(decay)}%</span></div>
                      <div className="decay-track">
                        <div className="decay-fill" style={{ width: `${decay}%`, background: decayColor(decay) }} />
                      </div>
                    </div>
                  ) : (
                    <div />
                  )}

                  {/* Delete */}
                  <button className="btn-del" onClick={() => deleteTask(task.id)}>×</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {toast && <Toast msg={toast.message} type={toast.type} />}
    </>
  );
}