import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";

// ── التنسيقات والخطوط ─────────────────────────────────────────────────────────────
const _fl = document.createElement("link");
_fl.rel = "stylesheet";
_fl.href = "https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@300;600;800&display=swap";
document.head.appendChild(_fl);

const ft = () => new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
const uid = () => Math.random().toString(36).slice(2, 9);

// ── محرك الربط مع Gemini ──────────────────────────────────────────────────────────
const callGemini = async (key, systemPrompt, userMessage) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
  const payload = {
    contents: [{ role: "user", parts: [{ text: `Instructions: ${systemPrompt}\n\nQuestion: ${userMessage}\n\nملاحظة: في نهاية ردك، أضف سطراً يبدأ بـ "VOTE:" ثم اختر (مع/ضد/امتنع) مع ذكر السبب باختصار.` }] }]
  };

  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "تعذر الرد.";
  } catch (e) { return `❌ خطأ في الاتصال.`; }
};

// ── بيانات أعضاء المجلس ──────────────────────────────────────────────────────────
const ADVISORS = [
  { id: "chair", name: "عبدالإله", role: "رئيس المجلس | خبير ذكاء اصطناعي", color: "#00d4ff", isChair: true, systemPrompt: "أنت عبدالإله، رئيس المجلس ومطور برمجيات وخبير ذكاء اصطناعي. وظيفتك مراجعة المقترحات بذكاء تقني عالي وإصدار قرار حاسم. تحدث بلغة واثقة واحترافية." },
  { id: "sara", name: "سارة", role: "خبيرة تقنية", color: "#a855f7", systemPrompt: "أنتِ سارة، خبيرة تقنية. ركزي على الحلول المبتكرة." },
  { id: "khalid", name: "خالد", role: "مستشار أعمال", color: "#f59e0b", systemPrompt: "أنت خالد، مستشار أعمال. ركز على التكاليف والربحية." }
];

// ── المكون الرئيسي ──────────────────────────────────────────────────────────
export function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("gemini_key") || "");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("council");
  const chatEnd = useRef(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !apiKey || loading) return;
    const q = input.trim();
    setMessages(p => [...p, { role: "user", content: q, time: ft() }]);
    setInput("");
    setLoading(true);

    try {
      const results = await Promise.all(ADVISORS.map(a => callGemini(apiKey, a.systemPrompt, q).then(t => ({ ...a, text: t }))));
      
      const responses = results.map(r => {
        const voteMatch = r.text.match(/VOTE:\s*(مع|ضد|امتنع)(.*)/i);
        return {
          role: "advisor",
          name: r.name,
          color: r.color,
          isChair: r.isChair,
          content: r.text.replace(/VOTE:.*$/m, "").trim(),
          vote: voteMatch ? voteMatch[1] : "امتنع",
          voteReason: voteMatch ? voteMatch[2] : "",
          time: ft()
        };
      });

      setMessages(p => [...p, ...responses]);
    } catch {
      setMessages(p => [...p, { role: "error", content: "فشل في جلب ردود المجلس." }]);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ fontFamily: "'Noto Kufi Arabic', sans-serif", direction: "rtl", background: "#020617", color: "#f8fafc", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      
      {/* Navbar */}
      <nav style={{ padding: "20px", background: "rgba(15, 23, 42, 0.8)", borderBottom: "1px solid #1e293b", backdropFilter: "blur(10px)", display: "flex", justifyContent: "space-between", alignItems: "center", sticky: "top" }}>
        <div style={{ fontSize: "1.4rem", fontWeight: 800, background: "linear-gradient(90deg, #00d4ff, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>مجلس الأمم التقنية</div>
        <button onClick={() => setActiveTab(activeTab === "council" ? "settings" : "council")} style={{ background: "#1e293b", color: "#fff", border: "1px solid #334155", padding: "8px 15px", borderRadius: "10px", cursor: "pointer" }}>
          {activeTab === "council" ? "⚙️ الإعدادات" : "🏠 العودة للمجلس"}
        </button>
      </nav>

      {/* Main Container */}
      <main style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
        {activeTab === "settings" ? (
          <div style={{ maxWidth: "600px", margin: "40px auto", background: "#0f172a", padding: "30px", borderRadius: "20px", border: "1px solid #1e293b" }}>
            <h3>إعدادات الوصول</h3>
            <input type="password" value={apiKey} onChange={(e) => { setApiKey(e.target.value); localStorage.setItem("gemini_key", e.target.value); }} placeholder="الصق مفتاح API هنا..." style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #334155", background: "#020617", color: "#fff" }} />
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div key={i} style={{ 
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                width: m.role === "advisor" ? "100%" : "auto",
                maxWidth: m.role === "advisor" ? "900px" : "80%",
                background: m.role === "user" ? "#1e293b" : "rgba(30, 41, 59, 0.5)",
                padding: "20px", borderRadius: "15px",
                border: m.role === "advisor" ? `1px solid ${m.color}44` : "none",
                position: "relative", animation: "fadeIn 0.5s ease"
              }}>
                {m.role === "advisor" && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                    <span style={{ fontWeight: 800, color: m.color }}>{m.isChair ? "👑 " : ""}{m.name}</span>
                    <span style={{ fontSize: "0.7rem", opacity: 0.5 }}>{m.time}</span>
                  </div>
                )}
                <div style={{ lineHeight: "1.7", fontSize: "0.95rem" }}>{m.content}</div>
                
                {m.role === "advisor" && (
                  <div style={{ marginTop: "15px", paddingTop: "10px", borderTop: "1px dashed #334155", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>التصويت:</span>
                    <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.75rem", background: m.vote === "مع" ? "#065f46" : m.vote === "ضد" ? "#991b1b" : "#374151", color: "#fff" }}>
                      {m.vote}
                    </span>
                    <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>{m.voteReason}</span>
                  </div>
                )}
              </div>
            ))}
            {loading && <div style={{ textAlign: "center", color: "#00d4ff", animation: "pulse 1.5s infinite" }}>⏳ جاري انعقاد الجلسة واستشارة الأعضاء...</div>}
          </>
        )}
        <div ref={chatEnd} />
      </main>

      {/* Footer Input */}
      {activeTab === "council" && (
        <footer style={{ padding: "20px", background: "#0f172a", borderTop: "1px solid #1e293b" }}>
          <div style={{ maxWidth: "900px", margin: "auto", display: "flex", gap: "15px" }}>
            <input 
              value={input} onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="اطرح موضوعاً للمناقشة والتصويت..." 
              style={{ flex: 1, padding: "15px", borderRadius: "15px", border: "1px solid #334155", background: "#020617", color: "#fff", outline: "none" }}
            />
            <button onClick={handleSend} style={{ background: "linear-gradient(135deg, #00d4ff, #a855f7)", color: "#fff", border: "none", padding: "0 30px", borderRadius: "15px", cursor: "pointer", fontWeight: 800 }}>إرسال</button>
          </div>
        </footer>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) { ReactDOM.createRoot(rootElement).render(<App />); }
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
