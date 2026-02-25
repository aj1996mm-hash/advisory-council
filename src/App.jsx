import { useState, useEffect, useRef } from "react";

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

// seat 0=bottom-center(chair), 1-5 clockwise
const SEATS = [
  {x:50,y:86}, {x:14,y:63}, {x:14,y:28}, {x:50,y:8}, {x:86,y:28}, {x:86,y:63}
];

const LS = {
  get:(k,fb)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):fb; }catch{ return fb; } },
  set:(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} },
};

// ── Avatar component ──────────────────────────────────────────────────────────
const AV = ({color,size=36,glow=false,children}) => (
  <div style={{width:size,height:size,borderRadius:Math.round(size/3.2),background:`linear-gradient(135deg,${color}cc,${color}55)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:Math.round(size*.38),fontWeight:700,color:"#fff",border:`2px solid ${color}${glow?"99":"44"}`,boxShadow:glow?`0 0 18px ${color}55`:"none",transition:"all .3s",flexShrink:0}}>
    {children}
  </div>
);

// ── Advisor Editor ────────────────────────────────────────────────────────────
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
      <input value={f.avatar} onChange={e=>s("avatar",e.target.value)} placeholder="رمز (حرف أو إيموجي)" style={IS}/>
      <textarea value={f.bio} onChange={e=>s("bio",e.target.value)} placeholder="نبذة قصيرة" rows={2} style={{...IS,resize:"vertical"}}/>
      <textarea value={f.systemPrompt} onChange={e=>s("systemPrompt",e.target.value)} placeholder="System Prompt — شخصية العضو وأسلوبه" rows={3} style={{...IS,fontSize:11,resize:"vertical"}}/>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>onSave(f)} style={{flex:1,padding:"8px",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:8,color:"#fff",fontFamily:"'Noto Kufi Arabic',sans-serif",fontSize:12,fontWeight:600,cursor:"pointer"}}>حفظ</button>
        <button onClick={onCancel} style={{padding:"8px 14px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,color:"#94a3b8",cursor:"pointer",fontFamily:"'Noto Kufi Arabic',sans-serif",fontSize:12}}>إلغاء</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [advisors,setAdvisors]         = useState(()=>LS.get("adv_v3",DEFAULT_ADVISORS));
  const [usage,setUsage]               = useState(()=>({count:0,plan:"free",...LS.get("adv_usage",{})}));
  const [apiKey,setApiKey]             = useState(()=>localStorage.getItem("adv_key")||"");
  const [chairName,setChairName]       = useState(()=>localStorage.getItem("adv_chair")||"");
  const [activeTab,setActiveTab]       = useState("council");
  const [selAdvisor,setSelAdvisor]     = useState(null);
  const [councilMsgs,setCouncilMsgs]  = useState([]);
  const [directMsgs,setDirectMsgs]    = useState([]);
  const [input,setInput]               = useState("");
  const [loading,setLoading]           = useState(false);
  const [sidebarOpen,setSidebarOpen]   = useState(true);
  const [showPricing,setShowPricing]   = useState(false);
  const [showCustomize,setShowCustomize] = useState(false);
  const [showNewCouncil,setShowNewCouncil] = useState(false);
  const [showVeto,setShowVeto]         = useState(null);
  const [editId,setEditId]             = useState(null);
  const [voteMode,setVoteMode]         = useState("both");
  const [pendingVote,setPendingVote]   = useState(null);
  const [newC,setNewC]                 = useState({name:"",purpose:"",members:[]});
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

  // API
  const callAPI = async (adv,msgs,withVote=false) => {
    if(!apiKey) return "⚠️ يرجى إدخال مفتاح API.";
    const sys = adv.systemPrompt+(withVote?VOTE_PROMPT:"");
    try{
      const r = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:sys,messages:msgs})
      });
      const d=await r.json();
      if(d.error) return `❌ ${d.error.message}`;
      return d.content?.[0]?.text||"لا يوجد رد.";
    }catch(e){ return `❌ فشل: ${e.message}`; }
  };

  // Send council
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

  // Manual vote
  const triggerVote = async () => {
    if(!pendingVote||loading) return;
    const {question,rid}=pendingVote;
    setLoading(true);
    try{
      const results = await Promise.all(
        avail.map(a=>callAPI(a,[{role:"user",content:`بخصوص: "${question}" — صوّت الآن مع أو ضد أو امتنع مع سبب قصير.`}],true).then(t=>({advisor:a,text:t})))
      );
      const votes=results.map(r=>({advisor:r.advisor,...(parseVote(r.text)||{vote:"امتنع",reason:""})}));
      setCouncilMsgs(p=>[...p,{role:"vote_table",votes,question,time:ft(),rid:uid()}]);
      const aF=votes.every(v=>v.vote==="مع"),aA=votes.every(v=>v.vote==="ضد");
      if(aF||aA) setShowVeto({question,rid,unanimous:aF?"مع":"ضد"});
      setPendingVote(null);
      incUsage(avail.length);
    }finally{ setLoading(false); }
  };

  // Send direct
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
  const selectPlan = k => { const u={...usage,plan:k}; setUsage(u); LS.set("adv_usage",u); setShowPricing(false); };

  // Latest votes for seat badges
  const latestVotes={};
  councilMsgs.filter(m=>m.role==="vote_table").slice(-1).forEach(m=>{
    m.votes?.forEach(v=>{ if(v.advisor?.id) latestVotes[v.advisor.id]=v.vote; });
  });

  // New council
  const addMember = () => setNewC(c=>({...c,members:[...c.members,{id:uid(),name:"",role:"",avatar:"",color:"#6366f1",bio:"",systemPrompt:"",seat:c.members.length+1}]}));
  const applyNew = () => {
    if(newC.members.length<2) return;
    const built=newC.members.map((m,i)=>({...m,isChair:i===0,seat:i===0?0:i}));
    saveAdv(built); setShowNewCouncil(false); setNewC({name:"",purpose:"",members:[]});
  };

  const IS = {background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"9px 13px",color:"#e2e8f0",fontFamily:"'Noto Kufi Arabic',sans-serif",fontSize:13,outline:"none",width:"100%",direction:"rtl",boxSizing:"border-box"};
  const BP = {padding:"8px 18px",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:8,color:"#fff",fontFamily:"'Noto Kufi Arabic',sans-serif",fontSize:13,fontWeight:600,cursor:"pointer"};
  const BG = {padding:"7px 14px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,color:"#94a3b8",fontFamily:"'Noto Kufi Arabic',sans-serif",fontSize:12,cursor:"pointer"};
  const sendColor = activeTab==="direct"&&selAdvisor?selAdvisor.color:"#6366f1";

  // ── Render vote table ────────────────────────────────────────────────────────
  const renderVT = (msg,i) => {
    const pros=msg.votes?.filter(v=>v.vote==="مع")||[];
    const cons=msg.votes?.filter(v=>v.vote==="ضد")||[];
    const abst=msg.votes?.filter(v=>v.vote==="امتنع")||[];
    const res=pros.length>cons.length?"✅ صدر القرار":cons.length>pros.length?"❌ رُفض القرار":"⚖️ تعادل";
    const rc=pros.length>cons.length?"#10b981":cons.length>pros.length?"#ef4444":"#f59e0b";
    return (
      <div key={`vt-${i}`} style={{background:"rgba(8,11,26,0.98)",border:"1px solid rgba(99,102,241,0.22)",borderRadius:14,overflow:"hidden",animation:"slideIn .3s ease"}}>
        <div style={{background:"linear-gradient(135deg,rgba(99,102,241,0.14),rgba(139,92,246,0.08))",padding:"9px 15px",display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid rgba(99,102,241,0.12)"}}>
          <span style={{fontSize:14}}>🏛️</span>
          <span style={{fontSize:12,fontWeight:700,color:"#a5b4fc"}}>قرار المجلس</span>
          <span style={{fontSize:10,color:"#334155",marginRight:"auto",fontFamily:"monospace"}}>{msg.time}</span>
        </div>
        <div style={{padding:"12px 15px"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:10}}>
            <thead><tr>{[["🟢 مع",pros],["🔴 ضد",cons],["🟡 امتنع",abst]].map(([l,lst],ci)=>(
              <th key={ci} style={{padding:"6px 10px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",color:"#64748b",fontWeight:600,textAlign:"center",width:"33%"}}>{l} ({lst.length})</th>
            ))}</tr></thead>
            <tbody><tr>{[pros,cons,abst].map((lst,ci)=>(
              <td key={ci} style={{padding:"8px 10px",border:"1px solid rgba(255,255,255,0.06)",verticalAlign:"top"}}>
                {lst.length===0?<span style={{color:"#1e293b",fontSize:11}}>—</span>:
                  lst.map((v,vi)=>(
                    <div key={vi} style={{display:"flex",alignItems:"flex-start",gap:5,marginBottom:5}}>
                      <AV color={v.advisor?.color||"#6366f1"} size={20}>{v.advisor?.avatar||"؟"}</AV>
                      <div>
                        <div style={{fontSize:11,fontWeight:700,color:v.advisor?.color||"#94a3b8"}}>{v.advisor?.name||"عضو"}</div>
                        {v.reason&&<div style={{fontSize:10,color:"#475569",lineHeight:1.3}}>{v.reason}</div>}
                      </div>
                    </div>
                  ))
                }
              </td>
            ))}</tr></tbody>
          </table>
          <div style={{background:hex2rgba(rc,.08),border:`1px solid ${hex2rgba(rc,.28)}`,borderRadius:8,padding:"7px 13px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:12,fontWeight:700,color:rc}}>{res} — {pros.length} مقابل {cons.length}</span>
            <span style={{fontSize:10,color:"#334155"}}>{msg.votes?.length||0} أعضاء</span>
          </div>
        </div>
      </div>
    );
  };

  const renderMsg = (msg,i) => {
    if(msg.type==="thinking") return (
      <div key="thinking" style={{alignSelf:"flex-end",background:"rgba(12,16,35,0.9)",border:"1px solid rgba(99,102,241,0.18)",borderRadius:12,padding:"10px 15px",color:"#6366f1",fontSize:12,animation:"pulse 1.4s infinite"}}>
        الأعضاء يدرسون المسألة… ✦
      </div>
    );
    if(msg.role==="vote_table") return renderVT(msg,i);
    if(msg.role==="veto") return (
      <div key={`ve-${i}`} style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.28)",borderRadius:12,padding:"11px 15px",animation:"slideIn .3s ease"}}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
          <span>⚡</span>
          <span style={{fontSize:12,fontWeight:700,color:"#ef4444"}}>حق النقض (VETO)</span>
          <span style={{fontSize:10,color:"#334155",marginRight:"auto"}}>{msg.time}</span>
        </div>
        <p style={{margin:0,fontSize:12,color:"#fca5a5"}}>
          استخدم <strong>{msg.chairName}</strong> حق النقض —
          <strong style={{color:msg.decision==="تأييد"?"#10b981":"#ef4444"}}>{msg.decision==="تأييد"?" ✅ أيّد الإجماع":" ❌ نقض القرار"}</strong>
        </p>
      </div>
    );
    if(msg.role==="user") return (
      <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:2,animation:"slideIn .25s ease"}}>
        <div style={{maxWidth:"62%",background:"linear-gradient(135deg,#3730a3,#6366f1)",borderRadius:"13px 13px 4px 13px",padding:"10px 14px",boxShadow:"0 0 14px rgba(99,102,241,0.16)"}}>
          <p style={{margin:0,fontSize:13,lineHeight:1.7}}>{msg.content}</p>
        </div>
        <span style={{fontSize:10,color:"#1e293b",marginRight:4}}>{msg.time}</span>
      </div>
    );
    if(msg.role==="advisor"){
      const a=msg.advisor;
      const dn=a.isChair&&chairName?chairName:a.name;
      return (
        <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2,animation:"slideIn .25s ease"}}>
          <div style={{maxWidth:"68%",background:"rgba(10,13,28,0.93)",border:`1px solid ${hex2rgba(a.color,.22)}`,borderRadius:"13px 13px 13px 4px",padding:"11px 14px",boxShadow:`0 0 10px ${hex2rgba(a.color,.1)}`}}>
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:7,paddingBottom:7,borderBottom:`1px solid ${hex2rgba(a.color,.14)}`}}>
              <AV color={a.color} size={24}>{a.avatar}</AV>
              <span style={{fontSize:12,fontWeight:700,color:a.color}}>{dn}</span>
              <span style={{fontSize:10,color:"#334155",marginRight:"auto"}}>{a.role}</span>
              {a.isChair&&<span style={{fontSize:9,background:"rgba(99,102,241,0.18)",border:"1px solid rgba(99,102,241,0.28)",borderRadius:4,padding:"1px 5px",color:"#a5b4fc"}}>رئيس</span>}
            </div>
            <p style={{margin:0,fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{msg.content}</p>
            {msg.rawVote&&(
              <div style={{marginTop:7,paddingTop:7,borderTop:`1px solid ${hex2rgba(a.color,.1)}`,display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:10,color:"#334155"}}>التصويت:</span>
                <span style={{fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:5,
                  color:msg.rawVote.vote==="مع"?"#10b981":msg.rawVote.vote==="ضد"?"#ef4444":"#f59e0b",
                  background:msg.rawVote.vote==="مع"?"rgba(16,185,129,0.1)":msg.rawVote.vote==="ضد"?"rgba(239,68,68,0.1)":"rgba(245,158,11,0.1)",
                  border:`1px solid ${msg.rawVote.vote==="مع"?"rgba(16,185,129,0.3)":msg.rawVote.vote==="ضد"?"rgba(239,68,68,0.3)":"rgba(245,158,11,0.3)"}`}}>
                  {msg.rawVote.vote}
                </span>
                {msg.rawVote.reason&&<span style={{fontSize:10,color:"#475569"}}>{msg.rawVote.reason}</span>}
              </div>
            )}
          </div>
          <span style={{fontSize:10,color:"#1e293b",marginLeft:4}}>{msg.time}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{fontFamily:"'Noto Kufi Arabic',sans-serif",direction:"rtl",background:"#07091a",color:"#e2e8f0",minHeight:"100vh",display:"flex",flexDirection:"column",position:"relative",overflow:"hidden"}}>
      <style>{`
        @keyframes slideIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
        ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:rgba(99,102,241,.28);border-radius:3px}
        *{box-sizing:border-box} textarea::placeholder,input::placeholder{color:#1e293b}
      `}</style>

      {/* BG */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}>
        <div style={{position:"absolute",top:-180,right:-180,width:550,height:550,background:"radial-gradient(circle,rgba(99,102,241,0.07),transparent 70%)",borderRadius:"50%"}}/>
        <div style={{position:"absolute",bottom:-160,left:-160,width:480,height:480,background:"radial-gradient(circle,rgba(139,92,246,0.05),transparent 70%)",borderRadius:"50%"}}/>
        <svg width="100%" height="100%" style={{opacity:.18}}><defs><pattern id="d" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="rgba(99,102,241,.5)"/></pattern></defs><rect width="100%" height="100%" fill="url(#d)"/></svg>
      </div>

      {/* Header */}
      <header style={{height:56,background:"rgba(7,9,26,0.97)",borderBottom:"1px solid rgba(99,102,241,0.14)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",position:"sticky",top:0,zIndex:50,backdropFilter:"blur(16px)",flexShrink:0,gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:9,flexShrink:0}}>
          <div style={{width:32,height:32,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,boxShadow:"0 0 14px rgba(99,102,241,0.4)"}}>⬡</div>
          <div style={{lineHeight:1.2}}>
            <div style={{fontSize:13,fontWeight:700}}>مجلس التقنية</div>
            <div style={{fontSize:8,letterSpacing:3,color:"#334155",fontFamily:"monospace"}}>ADVISORY COUNCIL</div>
          </div>
        </div>

        <div style={{display:"flex",gap:2,background:"rgba(255,255,255,0.04)",borderRadius:9,padding:3}}>
          {[["council","🏛️ المجلس"],["direct","💬 محادثة"],["settings","⚙️ الإعدادات"]].map(([id,lbl])=>(
            <button key={id} onClick={()=>setActiveTab(id)} style={{padding:"5px 13px",borderRadius:6,cursor:"pointer",border:"none",fontFamily:"'Noto Kufi Arabic',sans-serif",fontSize:11,fontWeight:activeTab===id?600:400,background:activeTab===id?"linear-gradient(135deg,#6366f1,#8b5cf6)":"transparent",color:activeTab===id?"#fff":"#64748b",transition:"all .2s"}}>{lbl}</button>
          ))}
          <button onClick={()=>setShowCustomize(true)} style={{padding:"5px 13px",borderRadius:6,cursor:"pointer",border:"1px solid rgba(139,92,246,0.28)",fontFamily:"'Noto Kufi Arabic',sans-serif",fontSize:11,background:"transparent",color:"#8b5cf6",transition:"all .2s"}}>✦ تخصيص</button>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <span onClick={()=>setShowPricing(true)} style={{padding:"4px 10px",borderRadius:14,fontSize:11,fontWeight:600,background:`${plan.color}22`,border:`1px solid ${plan.color}44`,color:plan.color,cursor:"pointer"}}>{plan.name}</span>
          <span style={{fontSize:11,color:"#334155"}}>{usage.count}/{limit===Infinity?"∞":limit}</span>
          <button onClick={()=>setShowPricing(true)} style={{...BP,padding:"5px 13px",fontSize:11}}>ترقية ↑</button>
        </div>
      </header>

      {/* Body */}
      <div style={{display:"flex",flex:1,overflow:"hidden",height:"calc(100vh - 56px)",position:"relative",zIndex:1}}>
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

          {/* ══ Council ══ */}
          {activeTab==="council" && (
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

              {/* Round Table */}
              <div style={{flex:"0 0 290px",position:"relative",background:"rgba(7,9,26,0.65)",borderBottom:"1px solid rgba(99,102,241,0.1)",overflow:"hidden"}}>
                {/* Oval table surface */}
                <div style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",width:"54%",height:"62%",borderRadius:"50%",background:"radial-gradient(ellipse at center,rgba(99,102,241,0.05) 0%,rgba(7,9,26,0.85) 100%)",border:"1px solid rgba(99,102,241,0.16)",boxShadow:"0 0 50px rgba(99,102,241,0.06) inset"}}>
                  <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center"}}>
                    <div style={{fontSize:24,opacity:.1}}>⬡</div>
                    <div style={{fontSize:8,color:"#1e293b",fontFamily:"monospace",letterSpacing:2,marginTop:2}}>ADVISORY COUNCIL</div>
                  </div>
                </div>

                {/* Seats */}
                {avail.map(a=>{
                  const pos=SEATS[a.seat??1];
                  const dn=a.isChair&&chairName?chairName:a.name;
                  const vote=latestVotes[a.id];
                  const speaking=loading;
                  return (
                    <div key={a.id} onClick={()=>{setSelAdvisor(a);setActiveTab("direct");}} style={{position:"absolute",left:`calc(${pos.x}% - 36px)`,top:`calc(${pos.y}% - 38px)`,width:72,display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer",zIndex:a.isChair?3:2}}>
                      {speaking&&<div style={{position:"absolute",top:-7,left:"50%",transform:"translateX(-50%)",background:"#6366f1",borderRadius:8,padding:"1px 7px",fontSize:8,whiteSpace:"nowrap",fontWeight:600,animation:"pulse 1.2s infinite"}}>●</div>}
                      {vote&&<div style={{position:"absolute",top:-5,right:-4,width:18,height:18,borderRadius:"50%",background:vote==="مع"?"#10b981":vote==="ضد"?"#ef4444":"#f59e0b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,border:"2px solid #07091a",zIndex:4}}>{vote==="مع"?"✓":vote==="ضد"?"✕":"−"}</div>}
                      <div style={{width:52,height:52,borderRadius:a.isChair?15:13,background:`linear-gradient(135deg,${a.color}cc,${a.color}55)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:"#fff",border:`2px solid ${a.color}77`,boxShadow:`0 0 ${loading?"18px":"8px"} ${a.color}${loading?"66":"22"}`,transition:"all .4s"}}>
                        {a.avatar||dn[0]}
                      </div>
                      <div style={{fontSize:9,fontWeight:600,color:a.color,textAlign:"center",maxWidth:72,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{dn}{a.isChair?" 👑":""}</div>
                      <div style={{fontSize:8,color:"#334155",textAlign:"center",maxWidth:72,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.role}</div>
                    </div>
                  );
                })}

                {/* Labels */}
                <div style={{position:"absolute",top:8,right:12,fontSize:9,color:loading?"#6366f1":"#1e293b",fontFamily:"monospace",letterSpacing:1}}>{loading?"● LIVE SESSION":"○ SESSION OPEN"}</div>
                <div style={{position:"absolute",top:8,left:12,display:"flex",gap:3,alignItems:"center"}}>
                  <span style={{fontSize:8,color:"#1e293b"}}>التصويت:</span>
                  {[["auto","تلقائي"],["manual","يدوي"],["both","الاثنان"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setVoteMode(v)} style={{padding:"2px 7px",borderRadius:4,border:`1px solid ${voteMode===v?"rgba(99,102,241,0.45)":"rgba(255,255,255,0.05)"}`,background:voteMode===v?"rgba(99,102,241,0.12)":"transparent",color:voteMode===v?"#a5b4fc":"#1e293b",fontSize:8,cursor:"pointer",fontFamily:"'Noto Kufi Arabic',sans-serif"}}>{l}</button>
                  ))}
                </div>
              </div>

              {/* Manual vote bar */}
              {pendingVote&&(voteMode==="manual"||voteMode==="both")&&(
                <div style={{padding:"7px 18px",background:"rgba(99,102,241,0.06)",borderBottom:"1px solid rgba(99,102,241,0.13)",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                  <span style={{fontSize:11,color:"#a5b4fc",flex:1}}>هل تريد إجراء تصويت رسمي على هذه المسألة؟</span>
                  <button onClick={triggerVote} style={{...BP,padding:"5px 14px",fontSize:11}}>🗳️ أجرِ التصويت</button>
                  <button onClick={()=>setPendingVote(null)} style={{...BG,fontSize:10,padding:"5px 10px"}}>لاحقاً</button>
                </div>
              )}

              {/* Chat */}
              <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:11}}>
                {councilMsgs.length===0&&(
                  <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,color:"#1e293b",padding:32,textAlign:"center",minHeight:120}}>
                    <div style={{fontSize:32,opacity:.12}}>⬡</div>
                    <p style={{fontSize:13,fontWeight:600,margin:0,color:"#334155"}}>الجلسة مفتوحة</p>
                    <p style={{fontSize:11,margin:0,maxWidth:340}}>اطرح مسألتك على المجلس وسيُدلي كل عضو برأيه. إن احتاج الأمر قراراً، أجرى المجلس تصويتاً رسمياً.</p>
                  </div>
                )}
                {councilMsgs.map(renderMsg)}
                <div ref={chatEnd}/>
              </div>
            </div>
          )}

          {/* ══ Direct ══ */}
          {activeTab==="direct"&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
              {selAdvisor?(
                <>
                  <div style={{padding:"12px 20px",background:"rgba(7,9,26,0.7)",borderBottom:`1px solid ${hex2rgba(selAdvisor.color,.16)}`,display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
                    <AV color={selAdvisor.color} size={46} glow>{selAdvisor.avatar}</AV>
                    <div>
                      <h3 style={{margin:0,fontSize:15,fontWeight:700,color:selAdvisor.color}}>{selAdvisor.isChair&&chairName?chairName:selAdvisor.name}</h3>
                      <p style={{margin:"2px 0 0",fontSize:11,color:"#475569"}}>{selAdvisor.role}</p>
                      <p style={{margin:"3px 0 0",fontSize:11,color:"#334155",maxWidth:480}}>{selAdvisor.bio}</p>
                    </div>
                  </div>
                  <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:11}}>
                    {directMsgs.map(renderMsg)}
                    <div ref={chatEnd}/>
                  </div>
                </>
              ):(
                <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#1e293b",fontSize:13}}>اختر عضواً من الشريط الجانبي</div>
              )}
            </div>
          )}

          {/* ══ Settings ══ */}
          {activeTab==="settings"&&(
            <div style={{flex:1,padding:26,overflowY:"auto"}}>
              <h2 style={{margin:"0 0 18px",fontSize:17,fontWeight:700}}>الإعدادات</h2>
              <div style={{display:"grid",gap:14,maxWidth:480}}>
                {[
                  {t:"مفتاح Anthropic API", c:<input type="password" value={apiKey} onChange={e=>saveKey(e.target.value)} placeholder="sk-ant-..." style={IS}/>},
                  {t:"اسمك كرئيس المجلس", d:"سيحل اسمك محل اسم رئيس المجلس الافتراضي ويُستخدم عند النقض", c:<input value={chairName} onChange={e=>saveChair(e.target.value)} placeholder="اكتب اسمك (اختياري)" style={IS}/>},
                  {t:"آلية التصويت الافتراضية", c:
                    <div style={{display:"flex",gap:7}}>
                      {[["auto","تلقائي"],["manual","يدوي"],["both","الاثنان"]].map(([v,l])=>(
                        <button key={v} onClick={()=>setVoteMode(v)} style={{flex:1,padding:"8px 4px",borderRadius:7,border:`1px solid ${voteMode===v?"rgba(99,102,241,0.45)":"rgba(255,255,255,0.07)"}`,background:voteMode===v?"rgba(99,102,241,0.1)":"rgba(255,255,255,0.02)",color:voteMode===v?"#a5b4fc":"#64748b",fontFamily:"'Noto Kufi Arabic',sans-serif",fontSize:11,cursor:"pointer",textAlign:"center"}}>{l}</button>
                      ))}
                    </div>
                  },
                  {t:"الاستخدام", c:
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>{const u={...usage,count:0};setUsage(u);LS.set("adv_usage",u);}} style={BG}>إعادة ضبط العداد</button>
                      <button onClick={()=>setShowPricing(true)} style={BP}>ترقية الخطة</button>
                    </div>
                  },
                ].map(({t,d,c},i)=>(
                  <div key={i} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:11,padding:14}}>
                    <h3 style={{margin:"0 0 4px",fontSize:12,fontWeight:600,color:"#94a3b8"}}>{t}</h3>
                    {d&&<p style={{margin:"0 0 9px",fontSize:11,color:"#334155"}}>{d}</p>}
                    {c}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          {(activeTab==="council"||activeTab==="direct")&&(
            <div style={{padding:"10px 18px 16px",background:"rgba(7,9,26,0.98)",borderTop:"1px solid rgba(99,102,241,0.1)",flexShrink:0}}>
              <div style={{display:"flex",gap:9,background:"rgba(255,255,255,0.04)",borderRadius:11,border:"1px solid rgba(99,102,241,0.14)",padding:"9px 13px"}}>
                <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
                  placeholder={activeTab==="council"?"اطرح مسألتك على المجلس…":`اسأل ${selAdvisor?(selAdvisor.isChair&&chairName?chairName:selAdvisor.name):"العضو"}…`}
                  style={{flex:1,background:"transparent",border:"none",outline:"none",color:"#e2e8f0",fontFamily:"'Noto Kufi Arabic',sans-serif",fontSize:14,resize:"none",direction:"rtl",lineHeight:1.5,maxHeight:96}} rows={1} disabled={loading}/>
                <button onClick={handleSend} disabled={loading||!input.trim()} style={{width:38,height:38,borderRadius:8,background:`linear-gradient(135deg,${sendColor},${sendColor}cc)`,border:"none",color:"#fff",cursor:"pointer",fontSize:17,flexShrink:0,boxShadow:`0 0 12px ${sendColor}44`,alignSelf:"flex-end",opacity:(!input.trim()||loading)?.45:1,transition:"opacity .2s"}}>
                  {loading?"⋯":"↵"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{width:sidebarOpen?236:0,minWidth:sidebarOpen?236:0,background:"rgba(8,10,23,0.98)",borderLeft:"1px solid rgba(99,102,241,0.1)",display:"flex",flexDirection:"column",overflow:"hidden",transition:"all .3s",flexShrink:0}}>
          <div style={{padding:12,display:"flex",flexDirection:"column",gap:9,height:"100%",overflowY:"auto",minWidth:212}}>
            <div style={{background:"rgba(255,255,255,0.03)",borderRadius:7,padding:9}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#475569",marginBottom:5}}><span>الرسائل</span><span style={{color:barClr,fontWeight:600}}>{usage.count}/{limit===Infinity?"∞":limit}</span></div>
              <div style={{background:"rgba(255,255,255,0.06)",borderRadius:3,height:4,overflow:"hidden"}}><div style={{height:"100%",background:barClr,borderRadius:3,width:`${pct}%`,transition:"width .5s"}}/></div>
            </div>
            {!apiKey&&<input type="password" value={apiKey} onChange={e=>saveKey(e.target.value)} placeholder="مفتاح API…" style={{...IS,fontSize:11}}/>}
            <span style={{fontSize:9,color:"#1e293b",letterSpacing:1,fontWeight:600}}>أعضاء المجلس</span>
            {advisors.map((a,i)=>{
              const av=i<plan.advisors;
              const sel=activeTab==="direct"&&selAdvisor?.id===a.id;
              const dn=a.isChair&&chairName?chairName:a.name;
              return (
                <div key={a.id} onClick={()=>av?(setSelAdvisor(a),setActiveTab("direct")):setShowPricing(true)}
                  style={{padding:"8px 9px",borderRadius:8,cursor:av?"pointer":"not-allowed",display:"flex",alignItems:"center",gap:8,border:`1px solid ${sel?a.color+"44":"rgba(255,255,255,0.05)"}`,background:sel?hex2rgba(a.color,.08):"rgba(255,255,255,0.02)",transition:"all .2s",opacity:av?1:.38}}>
                  <AV color={a.color} size={30}>{a.avatar||dn[0]}</AV>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,fontWeight:600,color:sel?a.color:"#cbd5e1",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{dn}{a.isChair?" 👑":""}</div>
                    <div style={{fontSize:9,color:"#334155",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.role}</div>
                  </div>
                  {!av&&<span style={{fontSize:10}}>🔒</span>}
                </div>
              );
            })}
          </div>
        </div>
        <button onClick={()=>setSidebarOpen(!sidebarOpen)} style={{position:"absolute",left:sidebarOpen?224:0,top:"50%",transform:"translateY(-50%)",width:14,height:40,background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.18)",borderRadius:"5px 0 0 5px",cursor:"pointer",color:"#475569",fontSize:9,zIndex:10,transition:"left .3s",display:"flex",alignItems:"center",justifyContent:"center"}}>
          {sidebarOpen?"›":"‹"}
        </button>
      </div>

      {/* ══ VETO MODAL ══ */}
      {showVeto&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(14px)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#0b0e20",border:"1px solid rgba(239,68,68,0.28)",borderRadius:20,padding:30,maxWidth:400,width:"100%",textAlign:"center",boxShadow:"0 0 50px rgba(239,68,68,0.08)"}}>
            <div style={{fontSize:40,marginBottom:10}}>⚡</div>
            <h2 style={{margin:"0 0 8px",fontSize:18,fontWeight:700,color:"#ef4444"}}>إجماع المجلس</h2>
            <p style={{margin:"0 0 6px",fontSize:13,color:"#94a3b8"}}>صوّت جميع الأعضاء بـ <strong style={{color:showVeto.unanimous==="مع"?"#10b981":"#ef4444"}}>{showVeto.unanimous}</strong></p>
            <p style={{margin:"0 0 22px",fontSize:12,color:"#475569"}}>بوصفك رئيساً للمجلس <strong style={{color:"#a5b4fc"}}>{chairDN}</strong>، هل تستخدم حق النقض؟</p>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={()=>applyVeto("تأييد")} style={{...BP,background:"linear-gradient(135deg,#10b981,#059669)",padding:"9px 20px",fontSize:13}}>✅ تأييد الإجماع</button>
              <button onClick={()=>applyVeto("نقض")} style={{...BP,background:"linear-gradient(135deg,#ef4444,#dc2626)",padding:"9px 20px",fontSize:13}}>❌ نقض القرار</button>
            </div>
            <button onClick={()=>setShowVeto(null)} style={{marginTop:12,background:"none",border:"none",color:"#334155",cursor:"pointer",fontFamily:"'Noto Kufi Arabic',sans-serif",fontSize:11}}>تجاهل</button>
          </div>
        </div>
      )}

      {/* ══ CUSTOMIZE MODAL ══ */}
      {showCustomize&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(14px)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>e.target===e.currentTarget&&setShowCustomize(false)}>
          <div style={{background:"#0b0e20",border:"1px solid rgba(99,102,241,0.22)",borderRadius:20,padding:26,maxWidth:640,width:"100%",maxHeight:"88vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <h2 style={{margin:0,fontSize:17,fontWeight:700}}>✦ تخصيص المجلس</h2>
              <div style={{display:"flex",gap:7}}>
                <button onClick={()=>{saveAdv(DEFAULT_ADVISORS);setShowCustomize(false);}} style={{...BG,color:"#ef4444",borderColor:"rgba(239,68,68,0.28)",fontSize:11}}>↺ إعادة الافتراضي</button>
                <button onClick={()=>{setShowCustomize(false);setShowNewCouncil(true);}} style={{...BP,fontSize:11,padding:"6px 13px"}}>＋ مجلس جديد</button>
                <button onClick={()=>setShowCustomize(false)} style={{width:26,height:26,borderRadius:6,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",color:"#64748b",cursor:"pointer",fontSize:12}}>✕</button>
              </div>
            </div>
            <p style={{margin:"0 0 14px",fontSize:11,color:"#334155"}}>عدّل أي عضو لتحويل المجلس حسب تخصصك — قانوني، طبي، تسويقي، استثماري…</p>
            <div style={{display:"grid",gap:9}}>
              {advisors.map(a=>{
                const dn=a.isChair&&chairName?chairName:a.name;
                return (
                  <div key={a.id} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${hex2rgba(a.color,.16)}`,borderRadius:11,padding:13}}>
                    {editId===a.id?(
                      <AdvisorEditor advisor={a} chairName={chairName}
                        onSave={fields=>{ saveAdv(advisors.map(x=>x.id===a.id?{...x,...fields}:x)); setEditId(null); }}
                        onCancel={()=>setEditId(null)}/>
                    ):(
                      <div style={{display:"flex",alignItems:"center",gap:9}}>
                        <AV color={a.color} size={34}>{a.avatar||dn[0]}</AV>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:600,color:a.color}}>{dn}{a.isChair?" 👑":""}</div>
                          <div style={{fontSize:10,color:"#475569"}}>{a.role}</div>
                        </div>
                        <button onClick={()=>setEditId(a.id)} style={{...BG,fontSize:10,padding:"4px 10px"}}>تعديل</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ NEW COUNCIL MODAL ══ */}
      {showNewCouncil&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",backdropFilter:"blur(14px)",zIndex:101,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>e.target===e.currentTarget&&setShowNewCouncil(false)}>
          <div style={{background:"#0b0e20",border:"1px solid rgba(99,102,241,0.22)",borderRadius:20,padding:26,maxWidth:600,width:"100%",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <h2 style={{margin:0,fontSize:16,fontWeight:700}}>＋ مجلس جديد من صفر</h2>
              <button onClick={()=>setShowNewCouncil(false)} style={{width:26,height:26,borderRadius:6,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",color:"#64748b",cursor:"pointer",fontSize:12}}>✕</button>
            </div>
            <div style={{display:"grid",gap:8,marginBottom:14}}>
              <input value={newC.name} onChange={e=>setNewC(c=>({...c,name:e.target.value}))} placeholder="اسم المجلس (مثال: المجلس الطبي الاستشاري)" style={IS}/>
              <input value={newC.purpose} onChange={e=>setNewC(c=>({...c,purpose:e.target.value}))} placeholder="الغرض أو مجال المجلس" style={IS}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
              <span style={{fontSize:12,fontWeight:600,color:"#94a3b8"}}>الأعضاء ({newC.members.length}) — الأول سيكون الرئيس</span>
              <button onClick={addMember} style={{...BP,fontSize:11,padding:"5px 12px"}}>＋ أضف عضو</button>
            </div>
            {newC.members.length===0&&(
              <div style={{textAlign:"center",padding:20,color:"#1e293b",fontSize:12}}>اضغط «أضف عضو» لبناء مجلسك</div>
            )}
            <div style={{display:"grid",gap:7,marginBottom:14}}>
              {newC.members.map((m,mi)=>(
                <div key={m.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:11}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                    <span style={{fontSize:10,color:"#475569"}}>{mi===0?"👑 الرئيس":`عضو ${mi+1}`}</span>
                    <button onClick={()=>setNewC(c=>({...c,members:c.members.filter(x=>x.id!==m.id)}))} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:12}}>✕</button>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                    {[["name","الاسم"],["role","الدور / التخصص"],["avatar","رمز (حرف أو إيموجي)"]].map(([k,ph])=>(
                      <input key={k} value={m[k]} onChange={e=>setNewC(c=>({...c,members:c.members.map(x=>x.id===m.id?{...x,[k]:e.target.value}:x)}))} placeholder={ph} style={{...IS,fontSize:11}}/>
                    ))}
                    <input type="color" value={m.color} onChange={e=>setNewC(c=>({...c,members:c.members.map(x=>x.id===m.id?{...x,color:e.target.value}:x)}))} style={{...IS,padding:4,height:37}}/>
                  </div>
                  <textarea value={m.systemPrompt} onChange={e=>setNewC(c=>({...c,members:c.members.map(x=>x.id===m.id?{...x,systemPrompt:e.target.value}:x)}))} placeholder={`System Prompt — مثال: أنت ${m.name||"العضو"}، ${m.role||"خبير"} متمرس. أجب بالعربية.`} rows={2} style={{...IS,fontSize:11,marginTop:7,resize:"vertical"}}/>
                </div>
              ))}
            </div>
            {newC.members.length>=2&&(
              <button onClick={applyNew} style={{...BP,width:"100%",padding:"11px",fontSize:13}}>✦ تطبيق المجلس الجديد ({newC.members.length} أعضاء)</button>
            )}
          </div>
        </div>
      )}

      {/* ══ PRICING MODAL ══ */}
      {showPricing&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(14px)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>e.target===e.currentTarget&&setShowPricing(false)}>
          <div style={{background:"#0b0e20",border:"1px solid rgba(99,102,241,0.2)",borderRadius:20,padding:24,maxWidth:680,width:"100%",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{margin:0,fontSize:17,fontWeight:700}}>اختر خطتك</h2>
              <button onClick={()=>setShowPricing(false)} style={{width:26,height:26,borderRadius:6,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",color:"#64748b",cursor:"pointer",fontSize:12}}>✕</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
              {[
                {key:"free",  feats:["30 رسالة","3 أعضاء","محادثة مباشرة"],lock:["المجلس+التصويت","التخصيص الكامل"]},
                {key:"pro",   feats:["500 رسالة","6 أعضاء","المجلس+التصويت","تخصيص كامل","مجلس من صفر","دعم أولوية"],lock:[],badge:"⭐ الأشهر"},
                {key:"enterprise",feats:["غير محدود","6 أعضاء","كل الميزات","API مخصص","دعم 24/7"],lock:[]},
              ].map(({key,feats,lock,badge})=>{
                const p=PLANS[key];
                return(
                  <div key={key} onClick={()=>selectPlan(key)} style={{background:key==="pro"?"rgba(99,102,241,0.07)":"rgba(255,255,255,0.02)",border:`1px solid ${key==="pro"?"rgba(99,102,241,0.32)":"rgba(255,255,255,0.07)"}`,borderRadius:13,padding:17,cursor:"pointer",transform:key==="pro"?"scale(1.02)":"scale(1)",position:"relative",transition:"all .2s"}}>
                    {badge&&<div style={{position:"absolute",top:-9,left:"50%",transform:"translateX(-50%)",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",borderRadius:11,padding:"2px 11px",fontSize:9,fontWeight:700,whiteSpace:"nowrap"}}>{badge}</div>}
                    <div style={{marginBottom:11}}>
                      <div style={{fontSize:10,color:"#475569",marginBottom:3}}>{p.name}</div>
                      <div style={{fontSize:20,fontWeight:800}}>{p.price===0?"مجاني":`${p.price} ريال`}</div>
                      {p.price>0&&<div style={{fontSize:9,color:"#334155"}}>/شهر</div>}
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:13}}>
                      {feats.map(f=><div key={f} style={{fontSize:11,color:"#94a3b8",display:"flex",gap:5}}><span style={{color:"#10b981"}}>✓</span>{f}</div>)}
                      {lock.map(f=><div key={f} style={{fontSize:11,color:"#1e293b",textDecoration:"line-through",display:"flex",gap:5}}><span>✕</span>{f}</div>)}
                    </div>
                    <button style={{width:"100%",padding:"7px",background:usage.plan===key?"rgba(255,255,255,0.04)":`linear-gradient(135deg,${p.color},${p.color}bb)`,border:usage.plan===key?"1px solid rgba(255,255,255,0.07)":"none",borderRadius:7,color:usage.plan===key?"#334155":"#fff",fontFamily:"'Noto Kufi Arabic',sans-serif",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                      {usage.plan===key?"خطتك الحالية":"اختر هذه الخطة"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
