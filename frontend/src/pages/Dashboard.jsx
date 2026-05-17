import { useEffect, useState, useRef } from "react";
import axios from "axios";

// ─────────────────────────────────────────────────────────────
// THE BUG WAS HERE: old getDecayLevel used Date.now() inside
// the function so it never updated. Now it takes `now` as a
// parameter — driven by a setInterval that ticks every second.
// ─────────────────────────────────────────────────────────────
function getDecayLevel(task, now) {
  if (task.completed) return 0;

  const createdMs  = task.created_at ? new Date(task.created_at).getTime() : now;
  const elapsedMs  = now - createdMs;

  // ── Age score: 0→50 over 7 days ──────────────────────────
  const AGE_MS    = 7 * 24 * 60 * 60 * 1000;
  const ageScore  = Math.min(elapsedMs / AGE_MS, 1.0) * 50;

  // ── Due score: 0→50 based on urgency ─────────────────────
  let dueScore = 0;

  if (task.timer_minutes) {
    // Timer mode — linear 0→50 as timer runs out (LIVE every second)
    const timerMs   = task.timer_minutes * 60 * 1000;
    const expiredMs = Math.max(0, elapsedMs - timerMs);
    if (elapsedMs >= timerMs) {
      dueScore = 50; // fully expired
    } else {
      dueScore = (elapsedMs / timerMs) * 50;
    }
  } else if (task.due_date) {
    // Date mode — day-precision buckets
    const dueMs    = new Date(task.due_date).getTime();
    const msLeft   = dueMs - now;
    const daysLeft = msLeft / 86400000;
    if      (daysLeft <= 0) dueScore = 50;
    else if (daysLeft <= 1) dueScore = 40;
    else if (daysLeft <= 3) dueScore = 25;
    else if (daysLeft <= 7) dueScore = 10;
    else                    dueScore = 2;
  }

  const weight = task.priority_weight ?? 1.0;
  return Math.min((ageScore + dueScore) * weight, 100);
}

// ── Helpers ───────────────────────────────────────────────────
function decayColor(v) {
  if (v >= 75) return "#c0614a";
  if (v >= 50) return "#c07030";
  if (v >= 25) return "#c0a040";
  return "#6a9e60";
}

function decayLabel(v) {
  if (v >= 75) return "critical";
  if (v >= 50) return "decaying";
  if (v >= 25) return "watch";
  return "healthy";
}

// Format ms → "2h 14m 33s" or "14m 33s" or "33s"
function fmtMs(ms) {
  if (ms <= 0) return "expired";
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000);
  if (h > 0)  return `${h}h ${m}m ${s}s`;
  if (m > 0)  return `${m}m ${s}s`;
  return `${s}s`;
}

function getTimerInfo(task, now) {
  if (!task.timer_minutes) return null;
  const createdMs = task.created_at ? new Date(task.created_at).getTime() : now;
  const timerMs   = task.timer_minutes * 60 * 1000;
  const expiresAt = createdMs + timerMs;
  const msLeft    = expiresAt - now;
  return { msLeft, expiresAt, timerMs };
}

function getDueDateInfo(task, now) {
  if (!task.due_date) return null;
  const dueMs  = new Date(task.due_date).getTime();
  const msLeft = dueMs - now;
  return { msLeft, dueMs };
}

function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast ${type}`}>{msg}</div>;
}

// ─────────────────────────────────────────────────────────────
// TASK DETAIL DRAWER
// ─────────────────────────────────────────────────────────────
function TaskDrawer({ task, now, onClose, onComplete, onDelete }) {
  if (!task) return null;

  const decay      = getDecayLevel(task, now);
  const color      = decayColor(decay);
  const done       = !!task.completed;
  const timerInfo  = getTimerInfo(task, now);
  const dueDateInfo= getDueDateInfo(task, now);

  const createdAt  = task.created_at ? new Date(task.created_at) : null;
  const elapsedMs  = createdAt ? now - createdAt.getTime() : 0;

  // Circular gauge SVG
  const R   = 44;
  const C   = 2 * Math.PI * R;
  const arc = C - (decay / 100) * C;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-title">{task.title}</div>
          <button className="drawer-close" onClick={onClose}>×</button>
        </div>

        {/* Circular decay gauge */}
        <div className="drawer-gauge-wrap">
          <svg width="108" height="108" viewBox="0 0 108 108">
            {/* Track */}
            <circle cx="54" cy="54" r={R} fill="none" stroke="rgba(212,175,80,0.08)" strokeWidth="8"/>
            {/* Fill */}
            <circle
              cx="54" cy="54" r={R}
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={arc}
              transform="rotate(-90 54 54)"
              style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.5s" }}
            />
            {/* Centre text */}
            <text x="54" y="50" textAnchor="middle" fill={color}
              fontSize="16" fontFamily="IBM Plex Mono" fontWeight="500">
              {Math.round(decay)}%
            </text>
            <text x="54" y="66" textAnchor="middle"
              fill="rgba(232,224,204,0.35)" fontSize="9"
              fontFamily="IBM Plex Mono" letterSpacing="2">
              {decayLabel(decay).toUpperCase()}
            </text>
          </svg>
        </div>

        {/* Info rows */}
        <div className="drawer-rows">

          {/* Difficulty */}
          <div className="drawer-row">
            <span className="dr-label">Difficulty</span>
            <span className={`chip ${task.energy_level || "medium"}`} style={{ fontSize: 10 }}>
              {task.energy_level === "high" ? "⚡ High"
               : task.energy_level === "low"  ? "🌿 Low"
               : "🔋 Medium"}
            </span>
          </div>

          {/* Created */}
          {createdAt && (
            <div className="drawer-row">
              <span className="dr-label">Created</span>
              <span className="dr-val">
                {createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                {" "}
                {createdAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          )}

          {/* Time alive */}
          <div className="drawer-row">
            <span className="dr-label">Age</span>
            <span className="dr-val">{fmtMs(elapsedMs)}</span>
          </div>

          {/* Timer countdown */}
          {timerInfo && (
            <>
              <div className="drawer-row">
                <span className="dr-label">Timer set</span>
                <span className="dr-val">{task.timer_minutes < 1
                  ? `${Math.round(task.timer_minutes * 60)}s`
                  : `${task.timer_minutes}m`}
                </span>
              </div>
              <div className="drawer-row">
                <span className="dr-label">Expires at</span>
                <span className="dr-val">
                  {new Date(timerInfo.expiresAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>
              <div className="drawer-row">
                <span className="dr-label">Time left</span>
                <span className="dr-val" style={{ color: timerInfo.msLeft <= 0 ? "#c0614a" : timerInfo.msLeft < 60000 ? "#c07030" : "var(--text)" }}>
                  {timerInfo.msLeft <= 0 ? "⚠ Expired" : fmtMs(timerInfo.msLeft)}
                </span>
              </div>
            </>
          )}

          {/* Due date */}
          {dueDateInfo && !timerInfo && (
            <>
              <div className="drawer-row">
                <span className="dr-label">Due date</span>
                <span className="dr-val">
                  {new Date(task.due_date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <div className="drawer-row">
                <span className="dr-label">Time left</span>
                <span className="dr-val" style={{ color: dueDateInfo.msLeft <= 0 ? "#c0614a" : dueDateInfo.msLeft < 86400000 ? "#c07030" : "var(--text)" }}>
                  {dueDateInfo.msLeft <= 0 ? "⚠ Overdue" : fmtMs(dueDateInfo.msLeft)}
                </span>
              </div>
            </>
          )}

          {/* Decay bar detail */}
          <div className="drawer-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
            <span className="dr-label">Decay progress</span>
            <div style={{ background: "rgba(212,175,80,0.07)", borderRadius: 3, height: 6, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 3,
                width: `${decay}%`,
                background: color,
                boxShadow: decay >= 75 ? `0 0 8px ${color}88` : "none",
                transition: "width 0.8s ease, background 0.5s"
              }}/>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-faint)", letterSpacing: "0.1em" }}>
              <span>0% healthy</span>
              <span>50% decaying</span>
              <span>100% critical</span>
            </div>
          </div>

          {/* Status */}
          <div className="drawer-row">
            <span className="dr-label">Status</span>
            <span className="dr-val" style={{ color: done ? "#6a9e60" : color }}>
              {done ? "✓ Completed" : decayLabel(decay)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="drawer-actions">
          {!done && (
            <button className="drawer-btn primary" onClick={() => { onComplete(task); onClose(); }}>
              ✓ Mark complete
            </button>
          )}
          {done && (
            <button className="drawer-btn secondary" onClick={() => { onComplete(task); onClose(); }}>
              ↺ Mark incomplete
            </button>
          )}
          <button className="drawer-btn danger" onClick={() => { onDelete(task.id); onClose(); }}>
            Delete task
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
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

  .dash-root { min-height: 100vh; background: var(--bg); font-family: var(--mono); color: var(--text); position: relative; }
  .dash-root::after { content:''; position:fixed; inset:0; background: radial-gradient(ellipse 55% 45% at 5% 95%,rgba(212,175,80,0.07) 0%,transparent 55%), radial-gradient(ellipse 40% 55% at 95% 5%,rgba(180,120,50,0.05) 0%,transparent 55%); pointer-events:none; z-index:0; }

  /* ── Topbar ── */
  .topbar { position:sticky; top:0; z-index:200; height:56px; display:flex; align-items:center; justify-content:space-between; padding:0 48px; background:rgba(17,16,9,0.93); border-bottom:1px solid var(--border); backdrop-filter:blur(14px); }
  .logo { font-family:var(--serif); font-size:20px; font-style:italic; font-weight:600; color:var(--text); }
  .logo em { color:var(--gold); font-style:normal; }
  .topbar-right { display:flex; align-items:center; gap:16px; }
  .streak { display:flex; align-items:center; gap:7px; padding:4px 12px; border:1px solid var(--border); border-radius:2px; font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:var(--gold-dim); }
  .btn-logout { background:none; border:1px solid var(--border); border-radius:2px; color:var(--text-faint); font-family:var(--mono); font-size:9px; letter-spacing:0.16em; text-transform:uppercase; padding:5px 14px; cursor:pointer; transition:border-color .2s,color .2s; }
  .btn-logout:hover { border-color:var(--border-hi); color:var(--text-dim); }

  /* ── Body ── */
  .dash-body { position:relative; z-index:1; max-width:960px; margin:0 auto; padding:52px 48px 100px; }
  .page-header { margin-bottom:44px; padding-bottom:24px; border-bottom:1px solid var(--border); }
  .page-eyebrow { font-size:9px; letter-spacing:0.28em; text-transform:uppercase; color:var(--gold); margin-bottom:8px; }
  .page-title { font-family:var(--serif); font-size:44px; font-weight:600; color:var(--text); line-height:1; }
  .page-title em { font-style:italic; color:var(--gold); }

  /* ── Stats ── */
  .stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:var(--border); border:1px solid var(--border); border-radius:3px; overflow:hidden; margin-bottom:36px; }
  .stat { background:var(--surface); padding:20px 24px; transition:background .2s; cursor:default; }
  .stat:hover { background:var(--surface2); }
  .stat-lbl { font-size:8px; letter-spacing:0.22em; text-transform:uppercase; color:var(--text-faint); margin-bottom:8px; }
  .stat-val { font-family:var(--serif); font-size:32px; font-weight:600; color:var(--text); line-height:1; }
  .stat-val.warn   { color:var(--amber); }
  .stat-val.danger { color:var(--red); }
  .stat-val.good   { color:var(--green-ok); }

  /* ── Input panel ── */
  .input-panel { background:var(--surface); border:1px solid var(--border); border-radius:3px; padding:24px 32px 28px; margin-bottom:32px; position:relative; }
  .input-panel::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,var(--gold) 0%,transparent 60%); border-radius:3px 3px 0 0; }
  .input-label { font-size:9px; letter-spacing:0.22em; text-transform:uppercase; color:var(--text-faint); margin-bottom:14px; }
  .input-row { display:flex; gap:10px; align-items:stretch; }
  .task-input { flex:1; background:rgba(212,175,80,0.04); border:1px solid var(--border); border-radius:2px; padding:12px 16px; color:var(--text); font-family:var(--mono); font-size:13px; outline:none; transition:border-color .2s,background .2s; }
  .task-input::placeholder { color:var(--text-faint); }
  .task-input:focus { border-color:var(--border-hi); background:rgba(212,175,80,0.07); }
  .energy-select { background:rgba(212,175,80,0.04); border:1px solid var(--border); border-radius:2px; padding:0 14px; color:var(--text-dim); font-family:var(--mono); font-size:11px; outline:none; cursor:pointer; min-width:130px; }
  .energy-select option { background:var(--surface); }
  .btn-add { padding:0 24px; background:rgba(212,175,80,0.10); border:1px solid var(--gold); border-radius:2px; color:var(--gold); font-family:var(--mono); font-size:10px; letter-spacing:0.16em; text-transform:uppercase; cursor:pointer; white-space:nowrap; transition:background .2s,box-shadow .2s,transform .15s; }
  .btn-add:hover { background:rgba(212,175,80,0.18); box-shadow:0 0 20px rgba(212,175,80,0.15); transform:translateY(-1px); }
  .btn-add:active { transform:translateY(0); }
  .btn-add:disabled { opacity:.45; pointer-events:none; }

  /* Schedule toggle */
  .sched-row { display:flex; align-items:center; gap:12px; margin-top:14px; flex-wrap:wrap; }
  .sched-lbl { font-size:9px; letter-spacing:.16em; text-transform:uppercase; color:var(--text-faint); }
  .mode-toggle { display:flex; border:1px solid var(--border); border-radius:3px; overflow:hidden; }
  .mode-btn { padding:5px 14px; background:none; border:none; border-right:1px solid var(--border); font-family:var(--mono); font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:var(--text-faint); cursor:pointer; transition:background .15s,color .15s; }
  .mode-btn:last-child { border-right:none; }
  .mode-btn.active { background:rgba(212,175,80,0.12); color:var(--gold); }
  .extra-row { display:flex; align-items:center; gap:10px; margin-top:12px; flex-wrap:wrap; }
  .extra-lbl { font-size:9px; letter-spacing:.14em; text-transform:uppercase; color:var(--text-faint); min-width:55px; }
  .date-input,.time-input,.timer-input { background:rgba(212,175,80,0.04); border:1px solid var(--border); border-radius:2px; padding:7px 12px; color:var(--text); font-family:var(--mono); font-size:12px; outline:none; transition:border-color .2s; color-scheme:dark; }
  .date-input { width:155px; } .time-input { width:115px; } .timer-input { width:85px; }
  .date-input:focus,.time-input:focus,.timer-input:focus { border-color:var(--border-hi); }
  .timer-unit { font-size:10px; color:var(--text-faint); letter-spacing:.1em; }
  .preset-row { display:flex; gap:5px; flex-wrap:wrap; }
  .preset-btn { padding:3px 9px; background:none; border:1px solid var(--border); border-radius:2px; font-family:var(--mono); font-size:9px; color:var(--text-faint); cursor:pointer; transition:all .15s; }
  .preset-btn:hover { border-color:var(--gold); color:var(--gold); background:var(--gold-glow); }
  .input-hint { margin-top:10px; font-size:10px; color:var(--text-faint); font-style:italic; }

  /* ── Filters ── */
  .filter-row { display:flex; gap:2px; margin-bottom:20px; }
  .filter-btn { padding:5px 16px; background:none; border:1px solid transparent; border-radius:2px; font-family:var(--mono); font-size:9px; letter-spacing:.16em; text-transform:uppercase; color:var(--text-faint); cursor:pointer; transition:all .15s; }
  .filter-btn:hover { color:var(--text-dim); border-color:var(--border); }
  .filter-btn.active { background:var(--gold-glow); border-color:var(--border-hi); color:var(--gold); }

  /* ── Task list ── */
  .task-list { display:flex; flex-direction:column; gap:2px; }

  .task-row {
    display:grid;
    grid-template-columns: 48px 1fr 190px 48px;
    align-items:center;
    background:var(--surface);
    border:1px solid var(--border); border-radius:2px;
    transition:background .15s, border-color .15s, box-shadow .4s;
    animation:rowIn .3s ease both;
    overflow:hidden; position:relative;
  }
  @keyframes rowIn { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
  .task-row:hover { background:var(--surface2); border-color:rgba(212,175,80,0.22); }
  .task-row.done     { opacity:.38; }
  .task-row.updating { pointer-events:none; }
  .task-row.critical { animation:rowIn .3s ease both, critPulse 2.5s ease-in-out infinite; }
  @keyframes critPulse {
    0%,100% { box-shadow:0 0 0 rgba(192,97,74,0); border-color:var(--border); }
    50%      { box-shadow:0 0 18px rgba(192,97,74,0.28); border-color:rgba(192,97,74,0.45); }
  }

  .accent-bar { position:absolute; left:0; top:0; bottom:0; width:3px; transition:background .5s; }

  /* Checkbox */
  .cb-cell { display:flex; align-items:center; justify-content:center; height:100%; padding:18px 0 18px 16px; cursor:pointer; }
  .cb { width:17px; height:17px; border:1.5px solid rgba(212,175,80,0.28); border-radius:2px; background:none; display:flex; align-items:center; justify-content:center; transition:border-color .2s,background .2s,box-shadow .2s; flex-shrink:0; }
  .cb-cell:hover .cb { border-color:var(--gold); box-shadow:0 0 8px rgba(212,175,80,0.18); }
  .cb.checked { background:rgba(106,158,96,0.15); border-color:var(--green-ok); }

  /* Task info */
  .task-info { padding:13px 18px; display:flex; flex-direction:column; gap:5px; min-width:0; cursor:pointer; }
  .task-title-text { font-size:13px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .task-title-text.done { text-decoration:line-through; color:var(--text-faint); }
  .task-chips { display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
  .chip { padding:2px 9px; border-radius:2px; font-size:8px; letter-spacing:.14em; text-transform:uppercase; border:1px solid; }
  .chip.high   { color:#c07060; border-color:rgba(192,112,96,0.35); background:rgba(192,112,96,0.08); }
  .chip.medium { color:#c0a060; border-color:rgba(192,160,96,0.35); background:rgba(192,160,96,0.08); }
  .chip.low    { color:#80b070; border-color:rgba(128,176,112,0.3); background:rgba(128,176,112,0.07); }
  .timer-chip { font-size:9px; font-family:var(--mono); padding:1px 7px; border-radius:2px; border:1px solid rgba(212,175,80,0.2); color:var(--gold-dim); letter-spacing:.06em; transition:color .3s,border-color .3s; }
  .timer-chip.warn    { color:#c07030; border-color:rgba(192,112,48,0.4); }
  .timer-chip.expired { color:var(--red); border-color:rgba(192,97,74,0.4); }
  .due-chip { font-size:9px; color:var(--text-faint); letter-spacing:.08em; }
  .due-chip.warn    { color:#c07030; }
  .due-chip.expired { color:var(--red); }

  /* Click hint */
  .click-hint { font-size:9px; color:var(--text-faint); letter-spacing:.08em; opacity:0; transition:opacity .15s; }
  .task-info:hover .click-hint { opacity:1; }

  /* Decay gauge */
  .decay-wrap { padding:0 18px; }
  .decay-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; }
  .decay-lbl-txt { font-size:8px; letter-spacing:.12em; text-transform:uppercase; transition:color .5s; }
  .decay-pct { font-size:11px; font-weight:500; font-family:var(--mono); transition:color .5s; }
  .decay-track { height:4px; background:rgba(212,175,80,0.07); border-radius:2px; overflow:hidden; position:relative; }
  .decay-fill { height:100%; border-radius:2px; transition:width .9s ease, background .5s, box-shadow .5s; }
  .decay-ticks { position:relative; height:4px; }

  /* Delete */
  .btn-del { height:100%; width:100%; background:none; border:none; border-left:1px solid var(--border); color:var(--text-faint); font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background .15s,color .15s; }
  .btn-del:hover { background:var(--red-dim); color:var(--red); }

  /* Empty */
  .empty { text-align:center; padding:80px 20px; }
  .empty-glyph { font-family:var(--serif); font-style:italic; font-size:60px; color:rgba(212,175,80,0.09); margin-bottom:18px; }
  .empty-title { font-family:var(--serif); font-style:italic; font-size:22px; color:var(--text-faint); margin-bottom:8px; }
  .empty-sub   { font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:rgba(232,224,204,0.16); }

  /* ── Task Detail Drawer ── */
  .drawer-overlay {
    position:fixed; inset:0; z-index:500;
    background:rgba(0,0,0,0.55);
    backdrop-filter:blur(3px);
    display:flex; align-items:flex-end; justify-content:flex-end;
    animation:overlayIn .2s ease;
  }
  @keyframes overlayIn { from{opacity:0} to{opacity:1} }

  .drawer {
    width:360px; height:100vh;
    background:var(--surface);
    border-left:1px solid var(--border);
    display:flex; flex-direction:column;
    animation:drawerIn .25s cubic-bezier(.16,1,.3,1);
    overflow-y:auto;
    position:relative;
  }
  @keyframes drawerIn { from{transform:translateX(100%)} to{transform:translateX(0)} }

  /* Gold top accent */
  .drawer::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,var(--gold) 0%,transparent 70%); }

  .drawer-header { display:flex; align-items:flex-start; justify-content:space-between; padding:24px 24px 16px; border-bottom:1px solid var(--border); gap:12px; }
  .drawer-title { font-family:var(--serif); font-size:18px; font-weight:600; color:var(--text); line-height:1.3; flex:1; }
  .drawer-close { background:none; border:1px solid var(--border); border-radius:2px; width:28px; height:28px; color:var(--text-faint); font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:border-color .2s,color .2s; }
  .drawer-close:hover { border-color:var(--border-hi); color:var(--text); }

  .drawer-gauge-wrap { display:flex; justify-content:center; padding:24px 0 16px; }

  .drawer-rows { padding:0 24px 20px; display:flex; flex-direction:column; gap:0; }
  .drawer-row { display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(212,175,80,0.06); gap:12px; }
  .drawer-row:last-child { border-bottom:none; }
  .dr-label { font-size:9px; letter-spacing:.18em; text-transform:uppercase; color:var(--text-faint); flex-shrink:0; }
  .dr-val { font-size:12px; color:var(--text-dim); font-family:var(--mono); text-align:right; }

  .drawer-actions { padding:16px 24px 32px; display:flex; flex-direction:column; gap:8px; border-top:1px solid var(--border); margin-top:auto; }
  .drawer-btn { padding:10px 16px; border-radius:2px; font-family:var(--mono); font-size:11px; letter-spacing:.12em; text-transform:uppercase; cursor:pointer; transition:background .15s,box-shadow .15s,transform .1s; border:1px solid; }
  .drawer-btn:hover { transform:translateY(-1px); }
  .drawer-btn:active { transform:translateY(0); }
  .drawer-btn.primary  { background:rgba(106,158,96,0.12); border-color:rgba(106,158,96,0.5); color:#90c880; }
  .drawer-btn.primary:hover  { background:rgba(106,158,96,0.2); box-shadow:0 0 16px rgba(106,158,96,0.15); }
  .drawer-btn.secondary { background:rgba(212,175,80,0.08); border-color:var(--border-hi); color:var(--gold-dim); }
  .drawer-btn.danger   { background:var(--red-dim); border-color:rgba(192,97,74,0.4); color:#d08070; }
  .drawer-btn.danger:hover { background:rgba(192,97,74,0.22); }

  /* Toast */
  .toast { position:fixed; bottom:32px; right:40px; padding:11px 20px; border-radius:2px; font-size:11px; letter-spacing:.06em; z-index:999; animation:toastIn .25s ease both; }
  .toast.success { background:rgba(106,158,96,0.12); border:1px solid rgba(106,158,96,0.4); color:#90c880; }
  .toast.error   { background:var(--red-dim); border:1px solid rgba(192,97,74,0.4); color:#d08070; }
  @keyframes toastIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
`;

// ─────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [tasks,    setTasks]    = useState([]);
  const [title,    setTitle]    = useState("");
  const [energy,   setEnergy]   = useState("medium");
  const [filter,   setFilter]   = useState("all");
  const [adding,   setAdding]   = useState(false);
  const [updating, setUpdating] = useState(null);
  const [toast,    setToast]    = useState(null);
  const [selected, setSelected] = useState(null); // task detail drawer

  // Schedule mode state
  const [schedMode, setSchedMode] = useState("none"); // "none"|"date"|"timer"
  const [dueDate,   setDueDate]   = useState("");
  const [dueTime,   setDueTime]   = useState("");
  const [timerMins, setTimerMins] = useState("");

  // ── THE FIX: live clock drives all decay calculations ──────
  // setInterval updates `now` every second → React re-renders
  // → getDecayLevel(task, now) gets fresh timestamp every tick
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  // ── Auth-preserving data fetch ──────────────────────────────
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

  // ── Create task — sends energy_level + due/timer ─────────────
  const createTask = async () => {
    if (!title.trim()) return;
    setAdding(true);
    const token = localStorage.getItem("token");

    const body = { title, energy_level: energy };
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

  // ── Toggle complete ──────────────────────────────────────────
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

  // ── Delete ───────────────────────────────────────────────────
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

  // Stats — all use `now` so they update live too
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

  const timerPresets = [
    { label: "10s",  val: String(10/60) },
    { label: "30s",  val: String(30/60) },
    { label: "1m",   val: "1"           },
    { label: "30m",  val: "30"          },
    { label: "1h",   val: "60"          },
    { label: "2h",   val: "120"         },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="dash-root">

        {/* Topbar */}
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

          {/* Stats — live */}
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

          {/* Input panel */}
          <div className="input-panel">
            <div className="input-label">New task</div>
            <div className="input-row">
              <input
                className="task-input"
                placeholder="Task title…"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={handleKey}
              />
              <select className="energy-select" value={energy} onChange={e => setEnergy(e.target.value)}>
                <option value="high">⚡ High</option>
                <option value="medium">🔋 Medium</option>
                <option value="low">🌿 Low</option>
              </select>
              <button className="btn-add" onClick={createTask} disabled={adding}>
                {adding ? "Adding…" : "+ Add"}
              </button>
            </div>

            {/* Deadline toggle */}
            <div className="sched-row">
              <span className="sched-lbl">Deadline</span>
              <div className="mode-toggle">
                {[
                  { id: "none",  label: "None"     },
                  { id: "date",  label: "📅 Date"  },
                  { id: "timer", label: "⏱ Timer"  },
                ].map(m => (
                  <button key={m.id}
                    className={`mode-btn${schedMode === m.id ? " active" : ""}`}
                    onClick={() => setSchedMode(m.id)}
                  >{m.label}</button>
                ))}
              </div>
            </div>

            {schedMode === "date" && (
              <div className="extra-row">
                <span className="extra-lbl">Date</span>
                <input type="date" className="date-input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                <span className="extra-lbl" style={{ marginLeft: 4 }}>Time</span>
                <input type="time" className="time-input" value={dueTime} onChange={e => setDueTime(e.target.value)} />
                <span className="timer-unit">(opt)</span>
              </div>
            )}

            {schedMode === "timer" && (
              <div>
                <div className="extra-row">
                  <span className="extra-lbl">Complete in</span>
                  <input type="number" className="timer-input" placeholder="1" min="0.01" step="any"
                    value={timerMins} onChange={e => setTimerMins(e.target.value)} />
                  <span className="timer-unit">minutes</span>
                </div>
                <div className="extra-row" style={{ marginTop: 8 }}>
                  <span className="extra-lbl">Quick</span>
                  <div className="preset-row">
                    {timerPresets.map(p => (
                      <button key={p.label} className="preset-btn" onClick={() => setTimerMins(p.val)}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="input-hint">Click any task to see its full details · Gauge updates live every second</div>
          </div>

          {/* Filters */}
          <div className="filter-row">
            {["all", "active", "decaying", "completed"].map(f => (
              <button key={f}
                className={`filter-btn${filter === f ? " active" : ""}`}
                onClick={() => setFilter(f)}
              >{f}</button>
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
              const decay      = getDecayLevel(task, now);   // ← now passed in, live
              const color      = done ? "rgba(106,158,96,0.35)" : decayColor(decay);
              const isCritical = !done && decay >= 75;
              const isUpdating = updating === task.id;

              // Timer chip
              const timerInfo = getTimerInfo(task, now);
              const dueDateInfo = getDueDateInfo(task, now);

              return (
                <div
                  key={task.id}
                  className={["task-row", done?"done":"", isCritical?"critical":"", isUpdating?"updating":""].filter(Boolean).join(" ")}
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div className="accent-bar" style={{ background: color }} />

                  {/* Checkbox — stops propagation so clicking it doesn't open drawer */}
                  <div className="cb-cell" onClick={e => { e.stopPropagation(); !isUpdating && toggleComplete(task); }}>
                    <div className={`cb${done ? " checked" : ""}`}>
                      {done && (
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                          <path d="M1.5 4.5l2 2 4-4" stroke="#6a9e60" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Task info — clicking opens drawer */}
                  <div className="task-info" onClick={() => !done && setSelected(task)}>
                    <div className={`task-title-text${done ? " done" : ""}`}>{task.title}</div>
                    <div className="task-chips">
                      <span className={`chip ${task.energy_level || "medium"}`}>
                        {task.energy_level === "high" ? "⚡ high"
                          : task.energy_level === "low" ? "🌿 low"
                          : "🔋 mid"}
                      </span>
                      {timerInfo && !done && (
                        <span className={`timer-chip${timerInfo.msLeft <= 0 ? " expired" : timerInfo.msLeft < 30000 ? " warn" : ""}`}>
                          ⏱ {timerInfo.msLeft <= 0 ? "expired" : fmtMs(timerInfo.msLeft)}
                        </span>
                      )}
                      {dueDateInfo && !timerInfo && !done && (
                        <span className={`due-chip${dueDateInfo.msLeft <= 0 ? " expired" : dueDateInfo.msLeft < 86400000 ? " warn" : ""}`}>
                          📅 {new Date(task.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      )}
                      {!done && <span className="click-hint">click for details</span>}
                    </div>
                  </div>

                  {/* Decay gauge — live 4-color */}
                  {!done ? (
                    <div className="decay-wrap">
                      <div className="decay-top">
                        <span className="decay-lbl-txt" style={{ color }}>{decayLabel(decay)}</span>
                        <span className="decay-pct"     style={{ color }}>{Math.round(decay)}%</span>
                      </div>
                      <div className="decay-track">
                        <div className="decay-fill" style={{
                          width: `${decay}%`,
                          background: color,
                          boxShadow: decay >= 75 ? `0 0 8px ${color}99` : "none",
                        }}/>
                      </div>
                      {/* Zone ticks at 25 / 50 / 75 */}
                      <div className="decay-ticks">
                        {[25, 50, 75].map(t => (
                          <div key={t} style={{
                            position: "absolute", left: `${t}%`,
                            top: 0, width: 1, height: 4,
                            background: "rgba(212,175,80,0.14)"
                          }}/>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: "0 18px" }}>
                      <span style={{ fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--green-ok)", opacity: .6 }}>✓ done</span>
                    </div>
                  )}

                  <button className="btn-del" onClick={e => { e.stopPropagation(); deleteTask(task.id); }}>×</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Task detail drawer */}
      {selected && (
        <TaskDrawer
          task={selected}
          now={now}
          onClose={() => setSelected(null)}
          onComplete={(t) => toggleComplete(t)}
          onDelete={(id) => deleteTask(id)}
        />
      )}

      {toast && <Toast msg={toast.message} type={toast.type} />}
    </>
  );
}