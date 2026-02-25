import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";

// ── Font ─────────────────────────────────────────────────────────────────────
const _fl = document.createElement("link");
_fl.rel = "stylesheet";
_fl.href = "https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@300;400;500;600;700;800;900&display=swap";
document.head.appendChild(_fl);

// ── Helpers ───────────────────────────────────────────────────────────────────
const hex2rgba = (hex, a) => {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
};
const ft = () => new Date().toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"});
const uid = () => Math.random().toString(36).slice(2,9);

const parseVote = (text) => {
  const m = text.match(/VOTE:\s*(مع|ضد|امتنع)(.*)/);
  if (!m) return null;
  return { vote: m[1].trim(), reason: m[2].trim().replace(/^[،,\-\u2013\s]+/,"") };
};
const cleanText = (text) => text.replace(/VOTE:.*$/m,"").trim();

const VOTE_PROMPT = "\n\nتعليمة: إذا كان السؤال يحتاج قراراً أو توصية، أضف في نهاية ردك سطراً يبدأ بـ VOTE: ثم اختر مع/ضد/امتنع وسبباً قصيراً.";
const DECISION_WORDS = ["هل","توصية","قرار","أوصي","أنصح","نختار","نبدأ","نطلق","ننفذ","نستثمر","نشتري","نبيع","نوافق","نرفض","يجدر","ينبغي","الأفضل","الأنسب","هل يجب","هل أقوم","هل نقوم"];
const needsDecision = (q) => DECISION_WORDS.some(k => q.includes(k));

// ── Default data ──────────────────────────────────────────────────────────────
const DEFAULT_ADVISORS = [
  { id:"sara",      name:"سارة",     role:"خبيرة الذكاء الاصطناعي",          avatar:"س", color:"#8b5cf6", seat:1, bio:"متخصصة في نماذج اللغة الكبيرة وتطبيقاتها التجارية.", systemPrompt:"أنت سارة، خبيرة ذكاء اصطناعي. أجيبي بأسلوب علمي مبسط مع أمثلة عملية. أجيبي بالعربية." },
  { id:"khalid",    name:"خالد",     role:"رائد أعمال تقني",                 avatar:"خ", color:"#f59e0b", seat:2, bio:"أسس شركات تقنية ناجحة وجمع تمويلات بقيمة 200M ريال.", systemPrompt:"أنت خالد، رائد أعمال تقني. تحدث بثقة وركز على الفرص التجارية والنمو. أجب بالعربية." },
  { id:"layla",     name:"ليلى",     role:"مديرة التحول الرقمي",             avatar:"ل", color:"#10b981", seat:3, bio:"قادت تحول رقمي في 15 مؤسسة حكومية وخاصة.", systemPrompt:"أنت ليلى، خبيرة التحول الرقمي. ركزي على الخطوات العملية وإدارة التغيير. أجيبي بالعربية." },
  { id:"faisal",    name:"فيصل",     role:"خبير الأمن السيبراني",            avatar:"ف", color:"#ef4444", seat:4, bio:"خبرة 18 عاماً في حماية البنية التحتية الحرجة.", systemPrompt:"أنت فيصل، خبير أمن سيبراني. حلل المخاطر وقدم حلولاً وقائية. أجب بالعربية." },
  { id:"noura",     name:"نورة",     role:"مصممة تجربة المستخدم",            avatar:"ن", color:"#ec4899", seat:5, bio:"صممت منتجات استخدمها أكثر من 10M مستخدم.", systemPrompt:"أنت نورة، مصممة UX. ركزي على تجربة المستخدم والجانب الإنساني. أجيبي بالعربية." },
  { id:"abdulilah", name:"عبدالإله", role:"مطور برمجيات وخبير ذكاء اصطناعي", avatar:"ع", color:"#06b6d4", seat:0, isChair:true, bio:"رئيس المجلس، مطور برمجيات متمرس وخبير ذكاء اصطناعي.", systemPrompt:"أنت عبدالإله، رئيس المجلس ومطور برمجيات وخبير ذكاء اصطناعي. تتحدث بلغة تقنية دقيقة مع رؤية استراتيجية شاملة. لديك حق النقض. أجب بالعربية." },
];

const PLANS = {
  free:       { name:"مجاني",   price:0,   messages:30,       advisors:3, color:"#64748b" },
  pro:        { name:"احترافي", price:99,  messages:500,      advisors:6, color:"#6366f1" },
  enterprise: { name:"مؤسسي",  price:499, messages:Infinity, advisors:6, color:"#8b5cf6" },
};

const SEATS = [ {x:50,y:86}, {x:14,y:63}, {x:14,y:28}, {x:50,y:8}, {x:86,y:28}, {x:86,y:63} ];

const LS = {
  get:(k,fb)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):fb; }catch{ return fb; } },
  set:(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} },
};

// ── Components ──────────────────────────────────────────────────────────
const AV = ({color,size=36,glow=false,children}) => (
  <div style={{width:size,height:size,borderRadius:Math.round(size/3.2),background:`linear-gradient(135deg,${color}cc,${color}55)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:Math.round(size*.38),fontWeight:700,color:"#fff",border:`2px solid ${color}${glow?"99":"44"}`,boxShadow:glow?`0 0 18px ${color}55`:"none",transition:"all .3s",flexShrink:0}}>
    {children}
  </div>
);

function AdvisorEditor({advisor,chairName,onSave,onCancel}) {
  const initName = advisor.isChair&&chairName ? chairName : advisor.name;
  const [f,setF] = useState({name:initName,role:advisor.role,avatar:advisor.avatar||"",bio:advisor.bio||"",systemPrompt:advisor.systemPrompt,color:advisor.color});
  const s = (k,v) => setF(p=>({...p,[k]:v}));
  const IS = {background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"8px 12px",color:"#e2e8f0",fontFamily:"'Noto Kufi Arabic',sans-serif",fontSize:12,outline:"none",width:"100%",direction:"rtl",boxSizing:"border-box"};
  return (
    <div style={{display:"grid",gap:8}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
        <AV color={f.color} size={28}>{f.avatar||f.name[0]||"؟"}</AV>
        <span style={{fontSize:12,color:f.color,fontWeight:600}}>تعديل العضو</span>
        <input type="color" value={f.color} onChange={e=>s("color",e.target.value)} style={{width:26,height:26,borderRadius:5,border:"none",cursor:"pointer",padding:2,background:"transparent"}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <input value={f.name} onChange={e=>s("name",e.target.value)} placeholder="الاسم" style={IS}/>
        <input value={f.role} onChange={e=>s("role",e.target.value)} placeholder="الدور" style={IS}/>
      </div>
      <input value={f.avatar} onChange={e=>s("avatar",e.target.value)} placeholder="رمز" style={IS}/>
      <textarea value={f.bio} onChange={e=>s("bio",e.target.value)} placeholder="نبذة" rows={2} style={{...IS,resize:"vertical"}}/>
      <textarea value={f.systemPrompt} onChange={e=>s("systemPrompt",e.target.value)} placeholder="System Prompt" rows={3} style={{...IS,fontSize:11,resize:"vertical"}}/>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>onSave(f)} style={{flex:1,padding:"8px",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:8,color:"#fff",cursor:"pointer"}}>حفظ</button>
        <button onClick={onCancel} style={{padding:"8px 14px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,color:"#94a3b8",cursor:"pointer"}}>إلغاء</button>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────
export function App() {
  const [advisors,setAdvisors]         = useState(()=>LS.get("adv_v3",DEFAULT_ADVISORS));
  const [usage,setUsage]               = useState(()=>({count:0,plan:"free",...LS.get("adv_usage",{})}));
  const [apiKey,setApiKey]             = useState(()=>localStorage.getItem("adv_key")||"");
  const [chairName,setChairName]       = useState(()=>localStorage.getItem("adv_chair")||"");
  const [activeTab,setActiveTab]       = useState("council");
  const [selAdvisor,setSelAdvisor]     = useState(null);
  const [councilMsgs,setCouncilMsgs]  = useState([]);
  const [directMsgs,setDirectMsgs]    = useState([]);
  const [input, setInput]              = useState("");
  const [loading, setLoading]          = useState(false);
  const [sidebarOpen, setSidebarOpen]  = useState(true);
  const [showPricing, setShowPricing]  = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showNewCouncil, setShowNewCouncil] = useState(false);
  const [showVeto, setShowVeto]        = useState(null);
  const [editId, setEditId]            = useState(null);
  const [voteMode, setVoteMode]        = useState("both");
  const [pendingVote, setPendingVote]  = useState(null);
  const [newC, setNewC]                = useState({name:"",purpose:"",members:[]});
  const chatEnd = useRef(null);

  const plan   = PLANS[usage.plan]||PLANS.free;
  const avail  = advisors.slice(0,plan.advisors);
  const limit  = plan.messages;
  const pct    = limit===Infinity?0:Math.min((usage.count/limit)*100,100);
  const barClr = pct>=90?"#ef4444":pct>=70?"#f59e0b":"#6366f1";
  const chair  = advisors.find(a=>a.isChair)||advisors[0];
  const chairDN= chairName||chair?.name||"الرئيس";

  useEffect(()=>{ chatEnd.current?.scrollIntoView({behavior:"smooth"}); },[councilMsgs,directMsgs]);

  const saveKey   = k => { setApiKey(k); localStorage.setItem("adv_key",k); };
  const saveChair = n => { setChairName(n); localStorage.setItem("adv_chair",n); };
  const saveAdv   = d => { setAdvisors(d); LS.set("adv_v3",d); };
  const incUsage  = (n=1) => { const u={...usage,count:usage.count+n}; setUsage(u); LS.set("adv_usage",u); };
  const checkLim  = () => { if(usage.count>=limit){setShowPricing(true);return false;} return true; };

  const callAPI = async (adv,msgs,withVote=false) => {
    if(!apiKey) return "⚠️ يرجى إدخال مفتاح API.";
    const sys = adv.systemPrompt+(withVote?VOTE_PROMPT:"");
    try{
      const r = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-3-5-sonnet-20240620",max_tokens:1000,system:sys,messages:msgs})
      });
      const d=await r.json();
      if(d.error) return `❌ ${d.error.message}`;
      return d.content?.[0]?.text||"لا يوجد رد.";
    }catch(e){ return `❌ فشل: ${e.message}`; }
  };

  const sendCouncil = async () => {
    if(!input.trim()||loading||!checkLim()) return;
    const q=input.trim();
    const rid=uid();
    const withVote = voteMode==="auto"||(voteMode==="both"&&needsDecision(q));
    setCouncilMsgs(p=>[...p,{role:"user",content:q,time:ft(),rid}]);
    setInput(""); setLoading(true);
    setCouncilMsgs(p=>[...p,{type:"thinking",rid}]);
    try{
      const results = await Promise.all(
        avail.map(a=>callAPI(a,[{role:"user",content:q}],withVote).then(t=>({advisor:a,text:t,time:ft()})))
      );
      const parsed = results.map(r=>({advisor:r.advisor,content:cleanText(r.text),rawVote:parseVote(r.text),time:r.time}));
      const hasVotes = parsed.some(p=>p.rawVote);
      setCouncilMsgs(p=>{
        const base=p.filter(m=>m.rid!==rid||m.role==="user");
        const msgs=parsed.map(r=>({role:"advisor",...r,rid}));
        const vt=hasVotes?[{role:"vote_table",votes:parsed.map(r=>({advisor:r.advisor,...(r.rawVote||{})})),question:q,time:ft(),rid}]:[];
        return [...base,...msgs,...vt];
      });
      if(!hasVotes&&(voteMode==="manual"||voteMode==="both")) setPendingVote({responses:parsed,question:q,rid});
      if(hasVotes){
        const vs=parsed.filter(r=>r.rawVote).map(r=>r.rawVote.vote);
        const aF=vs.every(v=>v==="مع"), aA=vs.every(v=>v==="ضد");
        if(aF||aA) setShowVeto({question:q,rid,unanimous:aF?"مع":"ضد"});
      }
      incUsage(avail.length);
    }finally{ setLoading(false); }
  };

  const sendDirect = async () => {
    const adv=selAdvisor;
    if(!input.trim()||loading||!checkLim()||!adv) return;
    const q=input.trim();
    setDirectMsgs(p=>[...p,{role:"user",content:q,time:ft()}]);
    setInput(""); setLoading(true);
    const hist=[...directMsgs.slice(-6),{role:"user",content:q}].map(m=>({role:m.role==="user"?"user":"assistant",content:m.content}));
    try{
      const text=await callAPI(adv,hist);
      setDirectMsgs(p=>[...p,{role:"advisor",advisor:adv,content:cleanText(text),rawVote:parseVote(text),time:ft()}]);
      incUsage(1);
    }finally{ setLoading(false); }
  };

  const handleSend = () => { if(activeTab==="council") sendCouncil(); else if(activeTab==="direct") sendDirect(); };
  const handleKey = e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();} };
  const applyVeto = dec => { setCouncilMsgs(p=>[...p,{role:"veto",decision:dec,chairName:chairDN,time:ft()}]); setShowVeto(null); };

  // Latest votes for seat badges
  const latestVotes={};
  councilMsgs.filter(m=>m.role==="vote_table").slice(-1).forEach(m=>{
    m.votes?.forEach(v=>{ if(v.advisor?.id) latestVotes[v.advisor.id]=v.vote; });
  });

  const IS = {background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"9px 13px",color:"#e2e8f0",fontFamily:"'Noto Kufi Arabic',sans-serif",fontSize:13,outline:"none",width:"100%",direction:"rtl",boxSizing:"border-box"};
  const BP = {padding:"8px 18px",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:8,color:"#fff",fontFamily:"'Noto Kufi Arabic',sans-serif",fontSize:13,fontWeight:600,cursor:"pointer"};
  const BG = {padding:"7px 14px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,color:"#94a3b8",fontFamily:"'Noto Kufi Arabic',sans-serif",fontSize:12,cursor:"pointer"};
  const sendColor = activeTab==="direct"&&selAdvisor?selAdvisor.color:"#6366f1";

  // Render Sub-components
  const renderVT = (msg,i) => {
    const pros=msg.votes?.filter(v=>v.vote==="مع")||[];
    const cons=msg.votes?.filter(v=>v.vote==="ضد")||[];
    const abst=msg.votes?.filter(v=>v.vote==="امتنع")||[];
    const res=pros.length>cons.length?"✅ صدر القرار":cons.length>pros.length?"❌ رُفض القرار":"⚖️ تعادل";
    const rc=pros.length>cons.length?"#10b981":cons.length>pros.length?"#ef4444":"#f59e0b";
    return (
      <div key={`vt-${i}`} style={{background:"rgba(8,11,26,0.98)",border:"1px solid rgba(99,102,241,0.22)",borderRadius:14,overflow:"hidden",animation:"slideIn .3s ease"}}>
        <div style={{background:"rgba(99,102,241,0.1)",padding:"9px 15px",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,fontWeight:700,color:"#a5b4fc"}}>قرار المجلس</span>
        </div>
        <div style={{padding:"12px 15px"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr>{["🟢 مع","🔴 ضد","🟡 امتنع"].map(l=><th key={l} style={{padding:5,color:"#64748b"}}>{l}</th>)}</tr></thead>
            <tbody><tr>{[pros,cons,abst].map((lst,ci)=>(
              <td key={ci} style={{padding:5,border:"1px solid rgba(255,255,255,0.06)",verticalAlign:"top"}}>
                {lst.map((v,vi)=><div key={vi} style={{fontSize:10,color:v.advisor?.color}}>{v.advisor?.name}</div>)}
              </td>
            ))}</tr></tbody>
          </table>
          <div style={{marginTop:8,fontSize:12,fontWeight:700,color:rc}}>{res}</div>
        </div>
      </div>
    );
  };

  const renderMsg = (msg,i) => {
    if(msg.type==="thinking") return <div key="think" style={{color:"#6366f1",fontSize:12}}>الأعضاء يدرسون المسألة…</div>;
    if(msg.role==="vote_table") return renderVT(msg,i);
    if(msg.role==="user") return (
      <div key={i} style={{alignSelf:"flex-start",background:"#3730a3",borderRadius:12,padding:"10px 14px",fontSize:13}}>{msg.content}</div>
    );
    if(msg.role==="advisor"){
      const a=msg.advisor;
      return (
        <div key={i} style={{alignSelf:"flex-end",background:"rgba(10,13,28,0.9)",border:`1px solid ${hex2rgba(a.color,.2)}`,borderRadius:12,padding:12,maxWidth:"80%"}}>
           <div style={{fontWeight:700,color:a.color,fontSize:12,marginBottom:5}}>{a.name}</div>
           <div style={{fontSize:13,lineHeight:1.6}}>{msg.content}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{fontFamily:"'Noto Kufi Arabic',sans-serif",direction:"rtl",background:"#07091a",color:"#e2e8f0",minHeight:"100vh",display:"flex",flexDirection:"column"}}>
       <style>{`@keyframes slideIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}`}</style>
       
       <header style={{height:56,background:"#07091a",borderBottom:"1px solid rgba(99,102,241,0.1)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",position:"sticky",top:0,zIndex:10}}>
          <div style={{fontWeight:700}}>🏛️ مجلس التقنية</div>
          <div style={{display:"flex",gap:10}}>
             {["council","direct","settings"].map(t=>(
               <button key={t} onClick={()=>setActiveTab(t)} style={{background:activeTab===t?"#6366f1":"transparent",color:"#fff",border:"none",padding:"5px 12px",borderRadius:6,cursor:"pointer"}}>{t}</button>
             ))}
          </div>
       </header>

       <main style={{flex:1,display:"flex",overflow:"hidden"}}>
          <div style={{flex:1,display:"flex",flexDirection:"column",overflowY:"auto",padding:20,gap:15}}>
             {activeTab==="council" && councilMsgs.map(renderMsg)}
             {activeTab==="direct" && directMsgs.map(renderMsg)}
             {activeTab==="settings" && (
               <div style={{padding:20}}>
                 <h3>الإعدادات</h3>
                 <input type="password" value={apiKey} onChange={e=>saveKey(e.target.value)} placeholder="API Key" style={IS}/>
               </div>
             )}
             <div ref={chatEnd}/>
          </div>
       </main>

       <footer style={{padding:20,background:"#07091a",borderTop:"1px solid rgba(99,102,241,0.1)"}}>
          <div style={{display:"flex",gap:10}}>
             <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey} style={{...IS,flex:1}} placeholder="اكتب هنا..."/>
             <button onClick={handleSend} style={BP}>إرسال</button>
          </div>
       </footer>
    </div>
  );
}

// ── Rendering ──────────────────────────────────────────────────────────
const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
