import { useEffect, useState } from "react";
import axios from "axios";

function parseUTC(str) {
  if (!str) return null;
  // If string already has timezone info (+00:00, +05:30, Z) — leave it alone
  if (str.endsWith("Z") || str.includes("+") || /[0-9]-[0-9]{2}:[0-9]{2}$/.test(str)) {
    return new Date(str);
  }
  // No timezone marker → Python sent a naive UTC datetime → append Z
  return new Date(str + "Z");
}

function getDecayLevel(task, now) {
  if (task.completed) return 0;

  const createdDate = parseUTC(task.created_at);
  const createdMs   = createdDate ? createdDate.getTime() : now;
  const elapsedMs   = now - createdMs;

  // MODE 1: Timer
  if (task.timer_minutes) {
    const timerMs = task.timer_minutes * 60 * 1000;
    if (elapsedMs >= timerMs) return 100;           // expired → instant 100
    return (elapsedMs / timerMs) * 100;             // linear 0→100
  }

  // MODE 2: Due date
  if (task.due_date) {
    const dueMs  = parseUTC(task.due_date).getTime();
    const msLeft = dueMs - now;
    if (msLeft <= 0) return 100;                    // overdue → instant 100
    const totalMs = dueMs - createdMs;
    if (totalMs <= 0) return 100;
    return Math.min((elapsedMs / totalMs) * 100, 100);
  }

  // MODE 3: No deadline — age over 7 days
  const AGE_MS = 7 * 24 * 60 * 60 * 1000;
  return Math.min((elapsedMs / AGE_MS) * 100, 100);
}

// ── Visual helpers ────────────────────────────────────────────────────────
function decayColor(v) {
  if (v >= 75) return "#c0614a";
  if (v >= 50) return "#c07030";
  if (v >= 25) return "#c0a040";
  return "#6a9e60";
}

function decayLabel(v) {
  if (v >= 75) return "critical";
  if (v >= 50) return "decaying";
  if (v >= 25) return "warning";
  return "healthy";
}

function fmtMs(ms) {
  if (ms <= 0) return "expired";
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}


function TaskDrawer({ task, now, onClose, onComplete, onDelete }) {
  if (!task) return null;

  const decay = getDecayLevel(task, now);
  const color = decayColor(decay);
  const done  = !!task.completed;

  const R   = 46;
  const C   = 2 * Math.PI * R;
  const gap = C - (decay / 100) * C;

  const createdDate = parseUTC(task.created_at);
  const createdMs   = createdDate ? createdDate.getTime() : now;
  const elapsedMs   = now - createdMs;

  let timeLeftLabel = null;
  let expiresLabel  = null;

  if (task.timer_minutes) {
    const timerMs = task.timer_minutes * 60 * 1000;
    const msLeft  = timerMs - elapsedMs;
    timeLeftLabel = msLeft > 0 ? fmtMs(msLeft) : "⚠ Expired";
    expiresLabel  = new Date(createdMs + timerMs).toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
  } else if (task.due_date) {
    const dueMs  = parseUTC(task.due_date).getTime();
    const msLeft = dueMs - now;
    timeLeftLabel = msLeft > 0 ? fmtMs(msLeft) : "⚠ Overdue";
    expiresLabel  = new Date(task.due_date).toLocaleDateString("en-IN", {
      weekday: "short", day: "numeric", month: "short", year: "numeric"
    });
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>

        <div className="drawer-header">
          <div>
            <div className="drawer-eyebrow">Task details</div>
            <div className="drawer-title">{task.title}</div>
          </div>
          <button className="drawer-close" onClick={onClose}>×</button>
        </div>

        <div className="drawer-gauge">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={R} fill="none"
              stroke="rgba(212,175,80,0.07)" strokeWidth="9"/>
            <circle cx="60" cy="60" r={R} fill="none"
              stroke={color} strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={gap}
              transform="rotate(-90 60 60)"
              style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.5s" }}
            />
            <text x="60" y="55" textAnchor="middle"
              fill={color} fontSize="18"
              fontFamily="IBM Plex Mono" fontWeight="500">
              {Math.round(decay)}%
            </text>
            <text x="60" y="72" textAnchor="middle"
              fill="rgba(232,224,204,0.3)" fontSize="8"
              fontFamily="IBM Plex Mono" letterSpacing="2.5">
              {decayLabel(decay).toUpperCase()}
            </text>
          </svg>
        </div>

        <div className="drawer-rows">

          <div className="drow">
            <span className="drow-lbl">Difficulty</span>
            <span className={`chip ${task.energy_level || "medium"}`}>
              {task.energy_level === "high" ? "⚡ High"
               : task.energy_level === "low" ? "🌿 Low"
               : "🔋 Medium"}
            </span>
          </div>

          <div className="drow">
            <span className="drow-lbl">Status</span>
            <span className="drow-val" style={{ color: done ? "#6a9e60" : color }}>
              {done ? "✓ Completed" : decayLabel(decay)}
            </span>
          </div>

          {createdDate && (
            <div className="drow">
              <span className="drow-lbl">Created</span>
              <span className="drow-val">
                {createdDate.toLocaleString("en-IN", {
                  day: "numeric", month: "short",
                  hour: "2-digit", minute: "2-digit"
                })}
              </span>
            </div>
          )}

          <div className="drow">
            <span className="drow-lbl">Age</span>
            <span className="drow-val">{fmtMs(elapsedMs)}</span>
          </div>

          {task.timer_minutes && (
            <div className="drow">
              <span className="drow-lbl">Timer set</span>
              <span className="drow-val">
                {task.timer_minutes < 1
                  ? `${Math.round(task.timer_minutes * 60)}s`
                  : `${task.timer_minutes}m`}
              </span>
            </div>
          )}

          {expiresLabel && (
            <div className="drow">
              <span className="drow-lbl">
                {task.timer_minutes ? "Expires at" : "Due date"}
              </span>
              <span className="drow-val">{expiresLabel}</span>
            </div>
          )}

          {timeLeftLabel && !done && (
            <div className="drow">
              <span className="drow-lbl">Time left</span>
              <span className="drow-val" style={{
                color: timeLeftLabel.startsWith("⚠") ? "#c0614a"
                     : decay >= 50 ? "#c07030" : "var(--text)"
              }}>
                {timeLeftLabel}
              </span>
            </div>
          )}

          <div className="drow" style={{ flexDirection:"column", alignItems:"stretch", gap:8 }}>
            <span className="drow-lbl">Decay progress</span>
            <div style={{ background:"rgba(212,175,80,0.07)", borderRadius:3, height:5, overflow:"hidden" }}>
              <div style={{
                height:"100%", width:`${decay}%`,
                background:color, borderRadius:3,
                boxShadow: decay >= 75 ? `0 0 8px ${color}99` : "none",
                transition:"width 0.8s ease, background 0.5s"
              }}/>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:"var(--text-faint)" }}>
              <span>0% healthy</span><span>50% decay</span><span>100% critical</span>
            </div>
          </div>

        </div>

        <div className="drawer-actions">
          {!done
            ? <button className="drawer-btn green" onClick={() => { onComplete(task); onClose(); }}>
                ✓ Mark complete
              </button>
            : <button className="drawer-btn gold" onClick={() => { onComplete(task); onClose(); }}>
                ↺ Mark incomplete
              </button>
          }
          <button className="drawer-btn red" onClick={() => { onDelete(task.id); onClose(); }}>
            Delete task
          </button>
        </div>

      </div>
    </div>
  );
}

function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast ${type}`}>{msg}</div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=IBM+Plex+Mono:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

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

  body { background:var(--bg); }
  .dash-root { min-height:100vh; background:var(--bg); font-family:var(--mono); color:var(--text); position:relative; }
  .dash-root::after { content:''; position:fixed; inset:0; background:radial-gradient(ellipse 55% 45% at 5% 95%,rgba(212,175,80,0.07) 0%,transparent 55%),radial-gradient(ellipse 40% 55% at 95% 5%,rgba(180,120,50,0.05) 0%,transparent 55%); pointer-events:none; z-index:0; }

  .topbar { position:sticky; top:0; z-index:200; height:56px; display:flex; align-items:center; justify-content:space-between; padding:0 48px; background:rgba(17,16,9,0.93); border-bottom:1px solid var(--border); backdrop-filter:blur(14px); }
  .logo { font-family:var(--serif); font-size:20px; font-style:italic; font-weight:600; color:var(--text); }
  .logo em { color:var(--gold); font-style:normal; }
  .topbar-right { display:flex; align-items:center; gap:16px; }
  .streak { display:flex; align-items:center; gap:7px; padding:4px 12px; border:1px solid var(--border); border-radius:2px; font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:var(--gold-dim); }
  .btn-logout { background:none; border:1px solid var(--border); border-radius:2px; color:var(--text-faint); font-family:var(--mono); font-size:9px; letter-spacing:0.16em; text-transform:uppercase; padding:5px 14px; cursor:pointer; transition:border-color .2s,color .2s; }
  .btn-logout:hover { border-color:var(--border-hi); color:var(--text-dim); }

  .dash-body { position:relative; z-index:1; max-width:960px; margin:0 auto; padding:52px 48px 100px; }
  .page-header { margin-bottom:44px; padding-bottom:24px; border-bottom:1px solid var(--border); }
  .page-eyebrow { font-size:9px; letter-spacing:0.28em; text-transform:uppercase; color:var(--gold); margin-bottom:8px; }
  .page-title { font-family:var(--serif); font-size:44px; font-weight:600; color:var(--text); line-height:1; }
  .page-title em { font-style:italic; color:var(--gold); }

  .stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:var(--border); border:1px solid var(--border); border-radius:3px; overflow:hidden; margin-bottom:36px; }
  .stat { background:var(--surface); padding:20px 24px; transition:background .2s; }
  .stat:hover { background:var(--surface2); }
  .stat-lbl { font-size:8px; letter-spacing:0.22em; text-transform:uppercase; color:var(--text-faint); margin-bottom:8px; }
  .stat-val { font-family:var(--serif); font-size:32px; font-weight:600; color:var(--text); line-height:1; }
  .stat-val.warn   { color:var(--amber); }
  .stat-val.danger { color:var(--red); }
  .stat-val.good   { color:var(--green-ok); }

  .input-panel { background:var(--surface); border:1px solid var(--border); border-radius:3px; padding:24px 32px 28px; margin-bottom:32px; position:relative; }
  .input-panel::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,var(--gold) 0%,transparent 60%); border-radius:3px 3px 0 0; }
  .input-label { font-size:9px; letter-spacing:0.22em; text-transform:uppercase; color:var(--text-faint); margin-bottom:14px; }
  .input-row { display:flex; gap:10px; align-items:stretch; }
  .task-input { flex:1; background:rgba(212,175,80,0.04); border:1px solid var(--border); border-radius:2px; padding:12px 16px; color:var(--text); font-family:var(--mono); font-size:13px; outline:none; transition:border-color .2s,background .2s; }
  .task-input::placeholder { color:var(--text-faint); }
  .task-input:focus { border-color:var(--border-hi); background:rgba(212,175,80,0.07); }
  .energy-select { background:rgba(212,175,80,0.04); border:1px solid var(--border); border-radius:2px; padding:0 14px; color:var(--text-dim); font-family:var(--mono); font-size:11px; outline:none; cursor:pointer; min-width:128px; }
  .energy-select option { background:var(--surface); }
  .btn-add { padding:0 24px; background:rgba(212,175,80,0.10); border:1px solid var(--gold); border-radius:2px; color:var(--gold); font-family:var(--mono); font-size:10px; letter-spacing:0.16em; text-transform:uppercase; cursor:pointer; white-space:nowrap; transition:background .2s,box-shadow .2s,transform .15s; }
  .btn-add:hover { background:rgba(212,175,80,0.18); box-shadow:0 0 20px rgba(212,175,80,0.15); transform:translateY(-1px); }
  .btn-add:active { transform:translateY(0); }
  .btn-add:disabled { opacity:.45; pointer-events:none; }

  .sched-row { display:flex; align-items:center; gap:12px; margin-top:14px; flex-wrap:wrap; }
  .sched-lbl { font-size:9px; letter-spacing:.16em; text-transform:uppercase; color:var(--text-faint); }
  .mode-toggle { display:flex; border:1px solid var(--border); border-radius:3px; overflow:hidden; }
  .mode-btn { padding:5px 14px; background:none; border:none; border-right:1px solid var(--border); font-family:var(--mono); font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:var(--text-faint); cursor:pointer; transition:background .15s,color .15s; }
  .mode-btn:last-child { border-right:none; }
  .mode-btn.active { background:rgba(212,175,80,0.12); color:var(--gold); }
  .extra-row { display:flex; align-items:center; gap:10px; margin-top:12px; flex-wrap:wrap; }
  .extra-lbl { font-size:9px; letter-spacing:.14em; text-transform:uppercase; color:var(--text-faint); min-width:55px; }
  .date-input,.time-input,.timer-input { background:rgba(212,175,80,0.04); border:1px solid var(--border); border-radius:2px; padding:7px 12px; color:var(--text); font-family:var(--mono); font-size:12px; outline:none; color-scheme:dark; transition:border-color .2s; }
  .date-input { width:155px; } .time-input { width:115px; } .timer-input { width:80px; }
  .date-input:focus,.time-input:focus,.timer-input:focus { border-color:var(--border-hi); }
  .timer-unit { font-size:10px; color:var(--text-faint); }
  .preset-row { display:flex; gap:5px; flex-wrap:wrap; }
  .preset-btn { padding:3px 9px; background:none; border:1px solid var(--border); border-radius:2px; font-family:var(--mono); font-size:9px; color:var(--text-faint); cursor:pointer; transition:all .15s; }
  .preset-btn:hover { border-color:var(--gold); color:var(--gold); background:var(--gold-glow); }
  .input-hint { margin-top:10px; font-size:10px; color:var(--text-faint); font-style:italic; }

  .filter-row { display:flex; gap:2px; margin-bottom:20px; }
  .filter-btn { padding:5px 16px; background:none; border:1px solid transparent; border-radius:2px; font-family:var(--mono); font-size:9px; letter-spacing:.16em; text-transform:uppercase; color:var(--text-faint); cursor:pointer; transition:all .15s; }
  .filter-btn:hover { color:var(--text-dim); border-color:var(--border); }
  .filter-btn.active { background:var(--gold-glow); border-color:var(--border-hi); color:var(--gold); }

  .task-list { display:flex; flex-direction:column; gap:2px; }

  .task-row {
    display:grid;
    grid-template-columns:48px 1fr 200px 48px;
    align-items:center;
    background:var(--surface);
    border:1px solid var(--border);
    border-radius:2px;
    transition:background .15s,border-color .3s,box-shadow .4s;
    animation:rowIn .3s ease both;
    overflow:hidden; position:relative;
  }
  @keyframes rowIn { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
  .task-row.done { opacity:.35; }
  .task-row.updating { pointer-events:none; }

  /* ── Decay state visual treatments ── */
  .task-row.state-warning  { background:rgba(192,160,64,0.05); border-color:rgba(192,160,64,0.28); }
  .task-row.state-decaying { background:rgba(192,112,48,0.07); border-color:rgba(192,112,48,0.38); }
  .task-row.state-critical {
    background:rgba(192,97,74,0.09);
    border-color:rgba(192,97,74,0.45);
    animation:rowIn .3s ease both, critPulse 2.5s ease-in-out infinite;
  }
  @keyframes critPulse {
    0%,100% { box-shadow:0 0 0 rgba(192,97,74,0); }
    50%      { box-shadow:0 0 22px rgba(192,97,74,0.3),inset 0 0 12px rgba(192,97,74,0.05); }
  }
  .task-row.state-decaying .task-title-text,
  .task-row.state-critical .task-title-text { color:#f0e8d4; }

  .accent-bar { position:absolute; left:0; top:0; bottom:0; transition:background .5s; }

  .cb-cell { display:flex; align-items:center; justify-content:center; height:100%; padding:18px 0 18px 16px; cursor:pointer; }
  .cb { width:17px; height:17px; border:1.5px solid rgba(212,175,80,0.28); border-radius:2px; background:none; display:flex; align-items:center; justify-content:center; transition:border-color .2s,background .2s,box-shadow .2s; flex-shrink:0; }
  .cb-cell:hover .cb { border-color:var(--gold); box-shadow:0 0 8px rgba(212,175,80,0.18); }
  .cb.checked { background:rgba(106,158,96,0.15); border-color:var(--green-ok); }

  .task-info { padding:13px 18px; display:flex; flex-direction:column; gap:5px; min-width:0; cursor:pointer; }
  .task-info:hover .click-hint { opacity:1; }
  .task-title-text { font-size:13px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; transition:color .3s; }
  .task-title-text.done { text-decoration:line-through; color:var(--text-faint); }
  .task-chips { display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
  .chip { padding:2px 9px; border-radius:2px; font-size:8px; letter-spacing:.14em; text-transform:uppercase; border:1px solid; }
  .chip.high   { color:#c07060; border-color:rgba(192,112,96,0.35); background:rgba(192,112,96,0.08); }
  .chip.medium { color:#c0a060; border-color:rgba(192,160,96,0.35); background:rgba(192,160,96,0.08); }
  .chip.low    { color:#80b070; border-color:rgba(128,176,112,0.3); background:rgba(128,176,112,0.07); }
  .timer-chip { font-size:9px; font-family:var(--mono); padding:1px 7px; border-radius:2px; border:1px solid rgba(212,175,80,0.2); color:var(--gold-dim); letter-spacing:.06em; transition:color .3s,border-color .3s; }
  .timer-chip.warn    { color:#c07030; border-color:rgba(192,112,48,0.45); }
  .timer-chip.expired { color:var(--red); border-color:rgba(192,97,74,0.5); font-weight:500; }
  .due-chip { font-size:9px; color:var(--text-faint); letter-spacing:.08em; }
  .due-chip.warn    { color:#c07030; }
  .due-chip.expired { color:var(--red); font-weight:500; }
  .click-hint { font-size:9px; color:var(--text-faint); letter-spacing:.08em; opacity:0; transition:opacity .15s; }

  .decay-wrap { padding:0 18px; }
  .decay-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; }
  .decay-lbl { font-size:8px; letter-spacing:.12em; text-transform:uppercase; transition:color .5s; }
  .decay-pct { font-size:11px; font-weight:500; font-family:var(--mono); transition:color .5s; }
  .decay-track { height:4px; background:rgba(212,175,80,0.07); border-radius:2px; overflow:hidden; }
  .decay-fill { height:100%; border-radius:2px; transition:width .9s ease,background .5s,box-shadow .5s; }
  .decay-ticks { position:relative; height:4px; }

  .btn-del { height:100%; width:100%; background:none; border:none; border-left:1px solid var(--border); color:var(--text-faint); font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background .15s,color .15s; }
  .btn-del:hover { background:var(--red-dim); color:var(--red); }

  .empty { text-align:center; padding:80px 20px; }
  .empty-glyph { font-family:var(--serif); font-style:italic; font-size:60px; color:rgba(212,175,80,0.09); margin-bottom:18px; }
  .empty-title { font-family:var(--serif); font-style:italic; font-size:22px; color:var(--text-faint); margin-bottom:8px; }
  .empty-sub   { font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:rgba(232,224,204,0.16); }

  /* Drawer */
  .drawer-overlay { position:fixed; inset:0; z-index:500; background:rgba(0,0,0,0.55); backdrop-filter:blur(3px); display:flex; justify-content:flex-end; animation:overlayIn .2s ease; }
  @keyframes overlayIn { from{opacity:0} to{opacity:1} }
  .drawer { width:360px; height:100vh; background:var(--surface); border-left:1px solid var(--border); display:flex; flex-direction:column; animation:drawerIn .25s cubic-bezier(.16,1,.3,1); overflow-y:auto; position:relative; }
  @keyframes drawerIn { from{transform:translateX(100%)} to{transform:translateX(0)} }
  .drawer::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,var(--gold) 0%,transparent 70%); }
  .drawer-header { display:flex; align-items:flex-start; justify-content:space-between; padding:24px 24px 16px; border-bottom:1px solid var(--border); gap:12px; }
  .drawer-eyebrow { font-size:9px; letter-spacing:.2em; text-transform:uppercase; color:var(--gold); margin-bottom:6px; }
  .drawer-title { font-family:var(--serif); font-size:18px; font-weight:600; color:var(--text); line-height:1.3; }
  .drawer-close { background:none; border:1px solid var(--border); border-radius:2px; width:28px; height:28px; color:var(--text-faint); font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:border-color .2s,color .2s; }
  .drawer-close:hover { border-color:var(--border-hi); color:var(--text); }
  .drawer-gauge { display:flex; justify-content:center; padding:24px 0 16px; }
  .drawer-rows { padding:0 24px 20px; display:flex; flex-direction:column; }
  .drow { display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(212,175,80,0.06); gap:12px; }
  .drow:last-child { border-bottom:none; }
  .drow-lbl { font-size:9px; letter-spacing:.18em; text-transform:uppercase; color:var(--text-faint); flex-shrink:0; }
  .drow-val { font-size:12px; color:var(--text-dim); font-family:var(--mono); text-align:right; }
  .drawer-actions { padding:16px 24px 32px; display:flex; flex-direction:column; gap:8px; border-top:1px solid var(--border); margin-top:auto; }
  .drawer-btn { padding:10px 16px; border-radius:2px; font-family:var(--mono); font-size:11px; letter-spacing:.12em; text-transform:uppercase; cursor:pointer; border:1px solid; transition:background .15s,transform .1s; }
  .drawer-btn:hover { transform:translateY(-1px); }
  .drawer-btn:active { transform:translateY(0); }
  .drawer-btn.green { background:rgba(106,158,96,0.12); border-color:rgba(106,158,96,0.5); color:#90c880; }
  .drawer-btn.green:hover { background:rgba(106,158,96,0.2); }
  .drawer-btn.gold  { background:rgba(212,175,80,0.08); border-color:var(--border-hi); color:var(--gold-dim); }
  .drawer-btn.red   { background:var(--red-dim); border-color:rgba(192,97,74,0.4); color:#d08070; }
  .drawer-btn.red:hover { background:rgba(192,97,74,0.22); }

  .toast { position:fixed; bottom:32px; right:40px; padding:11px 20px; border-radius:2px; font-size:11px; letter-spacing:.06em; z-index:999; animation:toastIn .25s ease both; }
  .toast.success { background:rgba(106,158,96,0.12); border:1px solid rgba(106,158,96,0.4); color:#90c880; }
  .toast.error   { background:var(--red-dim); border:1px solid rgba(192,97,74,0.4); color:#d08070; }
  @keyframes toastIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
`;

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [tasks,    setTasks]    = useState([]);
  const [title,    setTitle]    = useState("");
  const [energy,   setEnergy]   = useState("medium");
  const [filter,   setFilter]   = useState("all");
  const [adding,   setAdding]   = useState(false);
  const [updating, setUpdating] = useState(null);
  const [toast,    setToast]    = useState(null);
  const [selected, setSelected] = useState(null);

  const [schedMode, setSchedMode] = useState("none");
  const [dueDate,   setDueDate]   = useState("");
  const [dueTime,   setDueTime]   = useState("");
  const [timerMins, setTimerMins] = useState("");

  // ── LIVE CLOCK — ticks every second, drives all decay calculations ──
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const fetchTasks = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get("http://127.0.0.1:8000/tasks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(res.data);
    } catch {
      showToast("Failed to load tasks", "error");
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  const createTask = async () => {
    if (!title.trim()) return;
    setAdding(true);
    const token = localStorage.getItem("token");
    const body  = { title, energy_level: energy };
    if (schedMode === "date" && dueDate)
      body.due_date = dueTime ? `${dueDate}T${dueTime}` : dueDate;
    if (schedMode === "timer" && timerMins)
      body.timer_minutes = parseFloat(timerMins);
    try {
      await axios.post("http://127.0.0.1:8000/tasks", body, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTitle(""); setDueDate(""); setDueTime(""); setTimerMins("");
      fetchTasks();
      showToast("Task added");
    } catch {
      showToast("Failed to add task", "error");
    } finally {
      setAdding(false);
    }
  };

  const toggleComplete = async (task) => {
    setUpdating(task.id);
    const token = localStorage.getItem("token");
    try {
      await axios.patch(
        `http://127.0.0.1:8000/tasks/${task.id}/complete`, {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTasks(prev => prev.map(t =>
        t.id === task.id ? { ...t, completed: !t.completed } : t
      ));
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

  const handleKey = (e) => { if (e.key === "Enter") createTask(); };

  const activeCount    = tasks.filter(t => !t.completed).length;
  const completedCount = tasks.filter(t =>  t.completed).length;
  const decayingCount  = tasks.filter(t => !t.completed && getDecayLevel(t, now) >= 50).length;
  const totalCount     = tasks.length;

  const filtered = tasks.filter(t => {
    if (filter === "active")    return !t.completed;
    if (filter === "completed") return  t.completed;
    if (filter === "decaying")  return !t.completed && getDecayLevel(t, now) >= 50;
    return true;
  });

  function stateClass(decay) {
    if (decay >= 75) return "state-critical";
    if (decay >= 50) return "state-decaying";
    if (decay >= 25) return "state-warning";
    return "";
  }

  const timerPresets = [
    { label: "10s", val: String(10/60) },
    { label: "30s", val: String(30/60) },
    { label: "1m",  val: "1"           },
    { label: "5m",  val: "5"           },
    { label: "30m", val: "30"          },
    { label: "1h",  val: "60"          },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="dash-root">

        <div className="topbar">
          <div className="logo">Task<em>Decay</em></div>
          <div className="topbar-right">
            <div className="streak">🔥 0-day streak</div>
            <button className="btn-logout" onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/login";
            }}>Logout</button>
          </div>
        </div>

        <div className="dash-body">
          <div className="page-header">
            <div className="page-eyebrow">Workspace</div>
            <h1 className="page-title">Your <em>tasks.</em></h1>
          </div>

          <div className="stats-row">
            {[
              { lbl:"Total",     val:totalCount,     cls:"" },
              { lbl:"Active",    val:activeCount,    cls:"" },
              { lbl:"Decaying",  val:decayingCount,  cls:decayingCount>2?"danger":decayingCount>0?"warn":"" },
              { lbl:"Completed", val:completedCount, cls:completedCount>0?"good":"" },
            ].map(s => (
              <div className="stat" key={s.lbl}>
                <div className="stat-lbl">{s.lbl}</div>
                <div className={`stat-val ${s.cls}`}>{s.val}</div>
              </div>
            ))}
          </div>

          <div className="input-panel">
            <div className="input-label">New task</div>
            <div className="input-row">
              <input className="task-input" placeholder="Task title…"
                value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={handleKey}/>
              <select className="energy-select" value={energy} onChange={e=>setEnergy(e.target.value)}>
                <option value="high">⚡ High</option>
                <option value="medium">🔋 Medium</option>
                <option value="low">🌿 Low</option>
              </select>
              <button className="btn-add" onClick={createTask} disabled={adding}>
                {adding?"Adding…":"+ Add"}
              </button>
            </div>

            <div className="sched-row">
              <span className="sched-lbl">Deadline</span>
              <div className="mode-toggle">
                {[{id:"none",l:"None"},{id:"date",l:"📅 Date"},{id:"timer",l:"⏱ Timer"}].map(m=>(
                  <button key={m.id}
                    className={`mode-btn${schedMode===m.id?" active":""}`}
                    onClick={()=>setSchedMode(m.id)}
                  >{m.l}</button>
                ))}
              </div>
            </div>

            {schedMode==="date" && (
              <div className="extra-row">
                <span className="extra-lbl">Date</span>
                <input type="date" className="date-input" value={dueDate} onChange={e=>setDueDate(e.target.value)}/>
                <span className="extra-lbl" style={{marginLeft:4}}>Time</span>
                <input type="time" className="time-input" value={dueTime} onChange={e=>setDueTime(e.target.value)}/>
                <span className="timer-unit">(opt)</span>
              </div>
            )}

            {schedMode==="timer" && (
              <div>
                <div className="extra-row">
                  <span className="extra-lbl">In</span>
                  <input type="number" className="timer-input" placeholder="1" min="0.01" step="any"
                    value={timerMins} onChange={e=>setTimerMins(e.target.value)}/>
                  <span className="timer-unit">minutes</span>
                </div>
                <div className="extra-row" style={{marginTop:8}}>
                  <span className="extra-lbl">Quick</span>
                  <div className="preset-row">
                    {timerPresets.map(p=>(
                      <button key={p.label} className="preset-btn" onClick={()=>setTimerMins(p.val)}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="input-hint">
              Click any active task to see full details · Gauge updates every second
            </div>
          </div>

          <div className="filter-row">
            {["all","active","decaying","completed"].map(f=>(
              <button key={f}
                className={`filter-btn${filter===f?" active":""}`}
                onClick={()=>setFilter(f)}
              >{f}</button>
            ))}
          </div>

          <div className="task-list">
            {filtered.length===0 && (
              <div className="empty">
                <div className="empty-glyph">∅</div>
                <div className="empty-title">Nothing here.</div>
                <div className="empty-sub">Add a task above to begin.</div>
              </div>
            )}

            {filtered.map((task,i)=>{
              const done       = !!task.completed;
              const decay      = getDecayLevel(task, now);   // ← live every second
              const color      = done?"rgba(106,158,96,0.35)":decayColor(decay);
              const sc         = done?"":stateClass(decay);
              const isUpdating = updating===task.id;

              // Timer chip
              const createdMs  = parseUTC(task.created_at)?.getTime() ?? now;
              let timerChip=null, dueDateChip=null;

              if (task.timer_minutes && !done) {
                const msLeft = (task.timer_minutes*60*1000)-(now-createdMs);
                const exp    = msLeft<=0;
                timerChip = (
                  <span className={`timer-chip${exp?" expired":msLeft<30000?" warn":""}`}>
                    ⏱ {exp?"expired!":fmtMs(msLeft)}
                  </span>
                );
              }
              if (task.due_date && !task.timer_minutes && !done) {
                const msLeft = parseUTC(task.due_date).getTime()-now;
                const exp    = msLeft<=0;
                dueDateChip = (
                  <span className={`due-chip${exp?" expired":msLeft<86400000?" warn":""}`}>
                    📅 {exp?"overdue!":new Date(task.due_date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}
                  </span>
                );
              }

              const accentW = decay>=75?5:decay>=50?4:decay>=25?3:2;

              return (
                <div key={task.id}
                  className={["task-row",sc,done?"done":"",isUpdating?"updating":""].filter(Boolean).join(" ")}
                  style={{animationDelay:`${i*0.04}s`}}
                >
                  <div className="accent-bar" style={{background:color,width:accentW}}/>

                  <div className="cb-cell" onClick={e=>{e.stopPropagation();!isUpdating&&toggleComplete(task);}}>
                    <div className={`cb${done?" checked":""}`}>
                      {done&&<svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                        <path d="M1.5 4.5l2 2 4-4" stroke="#6a9e60" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>}
                    </div>
                  </div>

                  <div className="task-info" onClick={()=>!done&&setSelected(task)}>
                    <div className={`task-title-text${done?" done":""}`}>{task.title}</div>
                    <div className="task-chips">
                      <span className={`chip ${task.energy_level||"medium"}`}>
                        {task.energy_level==="high"?"⚡ high":task.energy_level==="low"?"🌿 low":"🔋 mid"}
                      </span>
                      {timerChip}
                      {dueDateChip}
                      {!done&&<span className="click-hint">↗ details</span>}
                    </div>
                  </div>

                  {!done?(
                    <div className="decay-wrap">
                      <div className="decay-top">
                        <span className="decay-lbl" style={{color}}>{decayLabel(decay)}</span>
                        <span className="decay-pct"  style={{color}}>{Math.round(decay)}%</span>
                      </div>
                      <div className="decay-track">
                        <div className="decay-fill" style={{
                          width:`${decay}%`, background:color,
                          boxShadow:decay>=75?`0 0 8px ${color}`:"none"
                        }}/>
                      </div>
                      <div className="decay-ticks">
                        {[25,50,75].map(t=>(
                          <div key={t} style={{position:"absolute",left:`${t}%`,top:0,width:1,height:4,background:"rgba(212,175,80,0.15)"}}/>
                        ))}
                      </div>
                    </div>
                  ):(
                    <div style={{padding:"0 18px"}}>
                      <span style={{fontSize:9,letterSpacing:".12em",textTransform:"uppercase",color:"var(--green-ok)",opacity:.6}}>✓ done</span>
                    </div>
                  )}

                  <button className="btn-del" onClick={e=>{e.stopPropagation();deleteTask(task.id);}}>×</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selected&&(
        <TaskDrawer
          task={selected} now={now}
          onClose={()=>setSelected(null)}
          onComplete={toggleComplete}
          onDelete={deleteTask}
        />
      )}

      {toast&&<Toast msg={toast.message} type={toast.type}/>}
    </>
  );
}