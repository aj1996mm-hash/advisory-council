import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";

// ── Font & Setup ─────────────────────────────────────────────────────────────
const _fl = document.createElement("link");
_fl.rel = "stylesheet";
_fl.href = "https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@300;400;500;600;700;800;900&display=swap";
document.head.appendChild(_fl);

const ft = () => new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
const uid = () => Math.random().toString(36).slice(2, 9);

// ── Gemini API Logic ──────────────────────────────────────────────────────────
const callGemini = async (key, systemPrompt, userMessage) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
  
  // دمج البرومبت التعليمي مع رسالة المستخدم لمحاكاة نظام الـ System Instructions
  const fullPrompt = `System Instructions: ${systemPrompt}\n\nUser Question: ${userMessage}`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }]
      })
    });
    const data = await response.json();
    if (data.error) return `❌ خطأ من جوجل: ${data.error.message}`;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "لم يتم استلام رد.";
  } catch (e) {
    return `❌ فشل الاتصال: ${e.message}`;
  }
};

// ── Default Data ──────────────────────────────────────────────────────────────
const DEFAULT_ADVISORS = [
  { id: "sara", name: "سارة", role: "خبيرة الذكاء الاصطناعي", avatar: "س", color: "#8b5cf6", systemPrompt: "أنت سارة، خبيرة ذكاء اصطناعي. أجيبي بأسلوب علمي مبسط ومباشر بالعربية." },
  { id: "khalid", name: "خالد", role: "رائد أعمال تقني", avatar: "خ", color: "#f59e0b", systemPrompt: "أنت خالد، رائد أعمال تقني. ركز على الجدوى الاقتصادية والفرص الاستثمارية بالعربية." },
  { id: "layla", name: "ليلى", role: "مديرة التحول الرقمي", avatar: "ل", color: "#10b981", systemPrompt: "أنت ليلى، خبيرة تحول رقمي. ركزي على التنفيذ العملي والكفاءة المؤسسية بالعربية." },
  { id: "abdulilah", name: "عبدالإله", role: "رئيس المجلس", avatar: "ع", color: "#06b6d4", isChair: true, systemPrompt: "أنت عبدالإله رئيس المجلس. لخص الآراء وقدم رؤية استراتيجية شاملة بالعربية." }
];

// ── Main App ──────────────────────────────────────────────────────────
export function App() {
  const [advisors] = useState(DEFAULT_ADVISORS);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("gemini_key") || "");
  const [activeTab, setActiveTab] = useState("council");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEnd = useRef(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const saveKey = (k) => { setApiKey(k); localStorage.setItem("gemini_key", k); };

  const handleSend = async () => {
    if (!input.trim() || !apiKey || loading) return;
    
    const userQ = input.trim();
    const currentRid = uid();
    
    setMessages(prev => [...prev, { role: "user", content: userQ, time: ft(), rid: currentRid }]);
    setInput("");
    setLoading(true);

    // استدعاء الأعضاء (أول 3 أعضاء لتوفير السرعة)
    const activeAdvisors = advisors.slice(0, 3);
    
    try {
      const results = await Promise.all(
        activeAdvisors.map(adv => 
          callGemini(apiKey, adv.systemPrompt, userQ).then(text => ({ adv, text }))
        )
      );

      const newMsgs = results.map(res => ({
        role: "advisor",
        name: res.adv.name,
        color: res.adv.color,
        content: res.text,
        time: ft(),
        rid: currentRid
      }));

      setMessages(prev => [...prev, ...newMsgs]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "error", content: "حدث خطأ أثناء جلب الردود." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Noto Kufi Arabic', sans-serif", direction: "rtl", background: "#07091a", color: "#e2e8f0", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      
      {/* Header */}
      <header style={{ padding: "15px 20px", borderBottom: "1px solid rgba(99,102,241,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "#8b5cf6" }}>🏛️ مجلس الذكاء الاستشاري</div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => setActiveTab("council")} style={{ background: activeTab === "council" ? "#6366f1" : "transparent", border: "none", color: "#fff", padding: "5px 15px", borderRadius: "20px", cursor: "pointer" }}>المجلس</button>
          <button onClick={() => setActiveTab("settings")} style={{ background: activeTab === "settings" ? "#6366f1" : "transparent", border: "none", color: "#fff", padding: "5px 15px", borderRadius: "20px", cursor: "pointer" }}>الإعدادات</button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "15px" }}>
        {activeTab === "settings" ? (
          <div style={{ maxWidth: "500px", margin: "auto", width: "100%", background: "rgba(255,255,255,0.05)", padding: "20px", borderRadius: "15px" }}>
            <h3>إعدادات المفتاح</h3>
            <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>أدخل مفتاح Google Gemini API هنا:</p>
            <input 
              type="password" 
              value={apiKey} 
              onChange={(e) => saveKey(e.target.value)} 
              placeholder="AIzaSy..." 
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "#fff" }}
            />
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} style={{ 
              alignSelf: m.role === "user" ? "flex-start" : "flex-end",
              maxWidth: "85%",
              background: m.role === "user" ? "#312e81" : "rgba(30, 41, 59, 0.7)",
              padding: "12px 16px",
              borderRadius: "15px",
              border: m.role === "advisor" ? `1px solid ${m.color}44` : "none"
            }}>
              {m.role === "advisor" && <div style={{ fontWeight: 700, color: m.color, fontSize: "0.8rem", marginBottom: "4px" }}>{m.name}</div>}
              <div style={{ fontSize: "0.95rem", lineHeight: "1.6" }}>{m.content}</div>
              <div style={{ fontSize: "0.7rem", opacity: 0.5, marginTop: "5px", textAlign: "left" }}>{m.time}</div>
            </div>
          ))
        )}
        {loading && <div style={{ textAlign: "center", color: "#6366f1" }}>الأعضاء يفكرون الآن...</div>}
        <div ref={chatEnd} />
      </main>

      {/* Input Area */}
      {activeTab === "council" && (
        <footer style={{ padding: "20px", borderTop: "1px solid rgba(99,102,241,0.1)" }}>
          <div style={{ display: "flex", gap: "10px", maxWidth: "800px", margin: "auto" }}>
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="اسأل المجلس عن فكرتك..."
              style={{ flex: 1, padding: "12px 20px", borderRadius: "25px", border: "1px solid #334155", background: "#0f172a", color: "#fff", outline: "none" }}
            />
            <button onClick={handleSend} style={{ background: "#6366f1", color: "#fff", border: "none", padding: "10px 25px", borderRadius: "25px", cursor: "pointer", fontWeight: 600 }}>إرسال</button>
          </div>
        </footer>
      )}
    </div>
  );
}

// ── Render ──────────────────────────────────────────────────────────
const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<App />);
}
