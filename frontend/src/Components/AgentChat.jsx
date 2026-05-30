// frontend/src/components/AgentChat.jsx
import { useState } from "react";
import axios from "axios";

const API = "http://127.0.0.1:8000";

export default function AgentChat() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const res = await axios.post(`${API}/agent/chat`, 
        { message: userMsg },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setMessages(prev => [...prev, { role: "ai", text: res.data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "ai", text: "Something went wrong." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        position:"fixed", bottom:32, right:32,
        width:56, height:56, borderRadius:"50%",
        background:"rgba(212,175,80,0.15)", border:"1px solid rgba(212,175,80,0.4)",
        color:"#d4af50", fontSize:24, cursor:"pointer", zIndex:1000,
      }}>
        ◈
      </button>
    );
  }

  return (
    <div style={{
      position:"fixed", bottom:32, right:32, width:380, height:500,
      background:"#1a1710", border:"1px solid rgba(212,175,80,0.25)",
      borderRadius:6, display:"flex", flexDirection:"column", zIndex:1000,
      fontFamily:"'IBM Plex Mono', monospace",
    }}>
      {/* Header */}
      <div style={{
        padding:"12px 16px", borderBottom:"1px solid rgba(212,175,80,0.14)",
        display:"flex", justifyContent:"space-between", alignItems:"center",
      }}>
        <span style={{ fontSize:11, color:"#d4af50", letterSpacing:".14em", textTransform:"uppercase" }}>
          Gravitas AI
        </span>
        <button onClick={() => setOpen(false)} style={{
          background:"none", border:"none", color:"rgba(232,224,204,0.3)", cursor:"pointer", fontSize:16,
        }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:16, display:"flex", flexDirection:"column", gap:12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            background: m.role === "user" ? "rgba(212,175,80,0.1)" : "rgba(232,224,204,0.05)",
            border: `1px solid ${m.role === "user" ? "rgba(212,175,80,0.25)" : "rgba(232,224,204,0.1)"}`,
            borderRadius:4, padding:"8px 12px", maxWidth:"85%",
            fontSize:12, color:"#e8e0cc", lineHeight:1.5, whiteSpace:"pre-wrap",
          }}>
            {m.text}
          </div>
        ))}
        {loading && <div style={{ fontSize:11, color:"rgba(212,175,80,0.4)" }}>thinking...</div>}
      </div>

      {/* Input */}
      <div style={{ padding:12, borderTop:"1px solid rgba(212,175,80,0.14)", display:"flex", gap:8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask anything..."
          style={{
            flex:1, background:"rgba(232,224,204,0.05)", border:"1px solid rgba(212,175,80,0.14)",
            borderRadius:3, padding:"8px 12px", color:"#e8e0cc",
            fontFamily:"'IBM Plex Mono', monospace", fontSize:11, outline:"none",
          }}
        />
        <button onClick={send} style={{
          background:"rgba(212,175,80,0.1)", border:"1px solid rgba(212,175,80,0.3)",
          borderRadius:3, padding:"8px 14px", color:"#d4af50",
          fontFamily:"'IBM Plex Mono', monospace", fontSize:10, cursor:"pointer",
          letterSpacing:".1em", textTransform:"uppercase",
        }}>Send</button>
      </div>
    </div>
  );
}