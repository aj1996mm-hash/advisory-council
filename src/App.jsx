import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";

// ── الخطوط والتنسيقات البصرية ──────────────────────────────────────────────────
const _fl = document.createElement("link");
_fl.rel = "stylesheet";
_fl.href = "https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@300;600;800&display=swap";
document.head.appendChild(_fl);

const ft = () => new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

// ── محرك الربط المحدث مع Gemini (تم إصلاح الرابط هنا) ──────────────────────────────
const callGemini = async (key, systemPrompt, userMessage) => {
  // استخدام النسخة المستقرة gemini-1.5-flash لضمان التوافق مع المفتاح
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
  
  const payload = {
    contents: [{ 
      parts: [{ 
        text: `Instructions: ${systemPrompt}\n\nIMPORTANT: End your response with a new line starting with "VOTE:" then choose one: (مع / ضد / امتنع) followed by a short reason.\n\nUser Question: ${userMessage}` 
      }] 
    }]
  };

  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (data.error) return `❌ خطأ البرمجة: ${data.error.message}`;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "اعتذر، لم أستطع صياغة رد.";
  } catch (e) { return `❌ فشل الاتصال بالخادم.`; }
};

// ── تشكيل المجلس الاستشاري ─────────────────────────────────────────────────────
const ADVISORS = [
  { id: "chair", name: "عبدالإله", role: "رئيس المجلس | خبير ذكاء اصطناعي", color: "#00f2ff", isChair: true, systemPrompt: "أنت عبدالإله، رئيس المجلس ومطور برمجيات متمرس. مهمتك تلخيص النقاش واتخاذ قرارات تقنية حاسمة بأسلوب قيادي ورصين." },
  { id: "sara", name: "سارة", role: "خبيرة ذكاء اصطناعي", color: "#a855f7", systemPrompt: "أنتِ سارة، خبيرة تقنية LLMs. ركزي على الإمكانيات التقنية والابتكار." },
  { id: "khalid", name: "خالد", role: "رائد أعمال تقني", color: "#f59e0b", systemPrompt: "أنت خالد، رائد أعمال. ركز على الجدوى التجارية وسوق العمل." },
  { id: "layla", name: "ليلى", role: "مديرة تحول رقمي", color: "#10b981", systemPrompt: "أنتِ ليلى، خبيرة تنظيمية. ركزي على سلاسة التنفيذ والسياسات." }
];

// ── واجهة المستخدم ────────────────────────────────────────────────────────────
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
          vote: voteMatch ? voteMatch[1].trim() : "امتنع",
          voteReason: voteMatch ? voteMatch[2].trim() : "لم يذكر السبب.",
          time: ft()
        };
      });
      setMessages(p => [...p, ...responses]);
    } catch {
      setMessages(p => [...p, { role: "error", content: "فشل في التواصل مع أعضاء المجلس." }]);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ fontFamily: "'Noto Kufi Arabic', sans-serif", direction: "rtl", background: "#020410", color: "#e2e8f0", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      
      {/* الهيدر الاحترافي */}
      <header style={{ padding: "15px 25px", background: "rgba(10, 15, 35, 0.9)", borderBottom: "1px solid #1e293b", backdropFilter: "blur(12px)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100 }}>
        <div>
          <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#00f2ff", textShadow: "0 0 15px #00f2ff44" }}>🏛️ مجلس الأمم الذكي</span>
        </div>
        <button onClick={() => setActiveTab(activeTab === "council" ? "settings" : "council")} style={{ background: "#161b33", color: "#fff", border: "1px solid #2e3c51", padding: "8px 18px", borderRadius: "12px", cursor: "pointer", fontWeight: 600 }}>
          {activeTab === "council" ? "⚙️ الإعدادات" : "🏠 العودة للمناقشة"}
        </button>
      </header>

      {/* منطقة الرسائل */}
      <main style={{ flex: 1, overflowY: "auto", padding: "25px", display: "flex", flexDirection: "column", gap: "25px" }}>
        {activeTab === "settings" ? (
          <div style={{ maxWidth: "500px", margin: "50px auto", background: "#0f172a", padding: "30px", borderRadius: "20px", border: "1px solid #1e293b", textAlign: "center" }}>
            <h3 style={{ color: "#00f2ff" }}>إعدادات الربط</h3>
            <p style={{ fontSize: "0.85rem", opacity: 0.7 }}>أدخل مفتاح Google Gemini API الخاص بك لتفعيل المجلس</p>
            <input type="password" value={apiKey} onChange={(e) => { setApiKey(e.target.value); localStorage.setItem("gemini_key", e.target.value); }} placeholder="AIzaSy..." style={{ width: "100%", padding: "14px", borderRadius: "10px", border: "1px solid #334155", background: "#020410", color: "#fff", marginTop: "15px", boxSizing: "border-box" }} />
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div key={i} style={{ 
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                width: m.role === "advisor" ? "100%" : "auto",
                maxWidth: m.role === "advisor" ? "850px" : "75%",
                background: m.role === "user" ? "linear-gradient(135deg, #4f46e5, #3730a3)" : "rgba(22, 27, 51, 0.6)",
                padding: "20px", borderRadius: "20px",
                border: m.role === "advisor" ? `1px solid ${m.color}33` : "none",
                boxShadow: m.role === "advisor" ? `0 4px 20px -5px ${m.color}22` : "none",
                animation: "slideUp 0.4s ease-out"
              }}>
                {m.role === "advisor" && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: m.color, boxShadow: `0 0 10px ${m.color}` }}></div>
                      <span style={{ fontWeight: 800, color: m.color, fontSize: "1rem" }}>{m.isChair ? "👑 [رئيس المجلس] " : ""}{m.name}</span>
                      <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: "6px", opacity: 0.8 }}>{m.role}</span>
                    </div>
                    <span style={{ fontSize: "0.7rem", opacity: 0.4 }}>{m.time}</span>
                  </div>
                )}
                <div style={{ lineHeight: "1.8", fontSize: "1rem", color: "#f1f5f9" }}>{m.content}</div>
                
                {/* منصة التصويت (أشبه بالأمم المتحدة) */}
                {m.role === "advisor" && (
                  <div style={{ marginTop: "18px", paddingTop: "15px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#94a3b8" }}>قرار العضو:</span>
                      <div style={{ 
                        padding: "5px 15px", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 800,
                        background: m.vote === "مع" ? "#059669" : m.vote === "ضد" ? "#dc2626" : "#4b5563",
                        color: "#fff", display: "flex", alignItems: "center", gap: "5px"
                      }}>
                        {m.vote === "مع" ? "✅ " : m.vote === "ضد" ? "❌ " : "⚪ "} {m.vote}
                      </div>
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#94a3b8", fontStyle: "italic" }}>
                      "{m.voteReason}"
                    </div>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: "center", background: "#161b33", padding: "15px 30px", borderRadius: "50px", border: "1px solid #00f2ff44", color: "#00f2ff", fontSize: "0.9rem", fontWeight: 600 }}>
                ⚙️ جاري تحليل البيانات في المجلس الاستشاري...
              </div>
            )}
          </>
        )}
        <div ref={chatEnd} />
      </main>

      {/* صندوق الإدخال الفاخر */}
      {activeTab === "council" && (
        <footer style={{ padding: "25px", background: "rgba(10, 15, 35, 0.9)", borderTop: "1px solid #1e293b", backdropFilter: "blur(12px)" }}>
          <div style={{ maxWidth: "850px", margin: "auto", display: "flex", gap: "15px", position: "relative" }}>
            <input 
              value={input} onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="اكتب فكرتك أو مشروعك هنا ليصوت عليه المجلس..." 
              style={{ flex: 1, padding: "18px 25px", borderRadius: "18px", border: "1px solid #2e3c51", background: "#020410", color: "#fff", outline: "none", fontSize: "1rem", transition: "all 0.3s" }}
            />
            <button onClick={handleSend} disabled={loading} style={{ background: "linear-gradient(135deg, #00f2ff, #4f46e5)", color: "#fff", border: "none", padding: "0 35px", borderRadius: "18px", cursor: "pointer", fontWeight: 800, fontSize: "1rem", transition: "0.3s", opacity: loading ? 0.6 : 1 }}>
              {loading ? "..." : "إرسال"}
            </button>
          </div>
        </footer>
      )}

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; borderRadius: 10px; }
      `}</style>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) { ReactDOM.createRoot(rootElement).render(<App />); }
