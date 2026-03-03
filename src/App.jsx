import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line, CartesianGrid } from "recharts";

const USER_ID  = "baptiste";
const PWD_HASH = "0a57623f36f03cb5900a3c85bdf23bbf5e0232cdbc025feef21f7898b5531465";

const hashStr = async (str) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
};

const STATUSES = [
  { key: "ON",        label: "ON",        color: "#2563eb", bg: "#eff6ff", text: "#1d4ed8", group: "work"   },
  { key: "COMMUTING", label: "COMMUTING", color: "#0891b2", bg: "#ecfeff", text: "#0e7490", group: "work"   },
  { key: "OFF",       label: "OFF",       color: "#7c3aed", bg: "#f5f3ff", text: "#6d28d9", group: "off"    },
  { key: "LEAVE",     label: "LEAVE",     color: "#d97706", bg: "#fffbeb", text: "#92400e", group: "off"    },
  { key: "SICK",      label: "SICK",      color: "#dc2626", bg: "#fef2f2", text: "#991b1b", group: "absent" },
  { key: "UNFIT",     label: "UNFIT",     color: "#9333ea", bg: "#faf5ff", text: "#6b21a8", group: "absent" },
  { key: "FATIGUE",   label: "FATIGUE",   color: "#ea580c", bg: "#fff7ed", text: "#9a3412", group: "absent" },
];

const GROUPS = [
  { key: "work",   label: "Travail",  color: "#2563eb", keys: ["ON","COMMUTING"] },
  { key: "off",    label: "Repos",    color: "#7c3aed", keys: ["OFF","LEAVE"]    },
  { key: "absent", label: "Absences", color: "#dc2626", keys: ["SICK","UNFIT","FATIGUE"] },
];

const MONTHS = [
  { name:"Janvier",   short:"Jan", days:31 }, { name:"Février",   short:"Fév", days:28 },
  { name:"Mars",      short:"Mar", days:31 }, { name:"Avril",     short:"Avr", days:30 },
  { name:"Mai",       short:"Mai", days:31 }, { name:"Juin",      short:"Jun", days:30 },
  { name:"Juillet",   short:"Jul", days:31 }, { name:"Août",      short:"Aoû", days:31 },
  { name:"Septembre", short:"Sep", days:30 }, { name:"Octobre",   short:"Oct", days:31 },
  { name:"Novembre",  short:"Nov", days:30 }, { name:"Décembre",  short:"Déc", days:31 },
];

const isLeap      = (y) => (y%4===0 && y%100!==0) || y%400===0;
const getDays     = (i,y) => i===1 && isLeap(y) ? 29 : MONTHS[i].days;
const initMonthData = () => ({ ...Object.fromEntries(STATUSES.map(s=>[s.key,""])), flightTime:"", dutyTime:"", sectors:"" });
const initYearData  = () => Object.fromEntries(MONTHS.map(m=>[m.name, initMonthData()]));

const parseTime = (str) => {
  if (!str) return 0;
  const s = String(str).trim();
  const c = s.match(/^(\d+):(\d{1,2})$/);  if (c) return parseInt(c[1])*60+parseInt(c[2]);
  const h = s.match(/^(\d+)h(\d{0,2})$/i); if (h) return parseInt(h[1])*60+(h[2]?parseInt(h[2]):0);
  const n = s.match(/^(\d+)$/);             if (n) return parseInt(n[1]);
  return 0;
};
const fmtTime = (mins) => { if (!mins) return "0h00"; return `${Math.floor(mins/60)}h${String(mins%60).padStart(2,"0")}`; };
const card    = (extra={}) => ({ background:"#fff", borderRadius:"16px", border:"1px solid #e2e8f0", boxShadow:"0 1px 3px rgba(0,0,0,0.06)", ...extra });

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#fff",border:"1px solid #e2e8f0",borderRadius:"12px",padding:"10px 14px",boxShadow:"0 4px 16px rgba(0,0,0,0.1)" }}>
      <p style={{ fontWeight:800,color:"#1e293b",marginBottom:"6px",fontSize:"13px" }}>{label}</p>
      {payload.map(p=><p key={p.dataKey} style={{ fontSize:"12px",color:p.stroke||p.fill,fontWeight:600,margin:"2px 0" }}>{p.name}: <span style={{ color:"#1e293b" }}>{p.value}</span></p>)}
    </div>
  );
};

// ── Modal mot de passe ──────────────────────────────────────────────────────
function LockModal({ onUnlock, onClose }) {
  const [pwd, setPwd]       = useState("");
  const [err, setErr]       = useState(false);
  const [loading, setLoading] = useState(false);

  const tryUnlock = async () => {
    setLoading(true); setErr(false);
    const h = await hashStr(pwd);
    if (h === PWD_HASH) { onUnlock(); }
    else { setErr(true); setPwd(""); }
    setLoading(false);
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999 }}>
      <div style={{ background:"#fff",borderRadius:"20px",padding:"32px 28px",width:"100%",maxWidth:"360px",boxShadow:"0 20px 60px rgba(0,0,0,0.2)",margin:"16px" }}>
        <div style={{ textAlign:"center",marginBottom:"24px" }}>
          <div style={{ fontSize:"36px",marginBottom:"8px" }}>🔐</div>
          <h2 style={{ fontWeight:900,fontSize:"18px",color:"#1e293b" }}>Mode édition</h2>
          <p style={{ fontSize:"13px",color:"#94a3b8",marginTop:"4px" }}>Entre le mot de passe pour pouvoir modifier les données</p>
        </div>
        <input
          type="password" placeholder="Mot de passe" value={pwd}
          onChange={e=>{ setPwd(e.target.value); setErr(false); }}
          onKeyDown={e=>e.key==="Enter" && tryUnlock()}
          autoFocus
          style={{ width:"100%",padding:"12px 14px",borderRadius:"10px",border:`2px solid ${err?"#fca5a5":"#e2e8f0"}`,fontSize:"15px",outline:"none",marginBottom:"8px",boxSizing:"border-box",transition:"border-color 0.2s" }}
        />
        {err && <p style={{ color:"#dc2626",fontSize:"12px",marginBottom:"8px",fontWeight:600 }}>❌ Mot de passe incorrect</p>}
        <div style={{ display:"flex",gap:"8px",marginTop:"8px" }}>
          <button onClick={onClose} style={{ flex:1,padding:"11px",borderRadius:"10px",border:"1px solid #e2e8f0",background:"#f8fafc",color:"#64748b",fontWeight:700,fontSize:"14px",cursor:"pointer" }}>Annuler</button>
          <button onClick={tryUnlock} disabled={loading||!pwd}
            style={{ flex:2,padding:"11px",borderRadius:"10px",border:"none",background:pwd?"#2563eb":"#bfdbfe",color:"#fff",fontWeight:700,fontSize:"14px",cursor:pwd?"pointer":"default",transition:"background 0.2s" }}>
            {loading ? "..." : "Déverrouiller"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TimeInput ───────────────────────────────────────────────────────────────
function TimeInput({ value, onChange, color="#2563eb", label, editMode }) {
  const [raw, setRaw]       = useState(value||"");
  const [focused, setFocused] = useState(false);
  useEffect(()=>{ if (!focused) setRaw(value||""); }, [value, focused]);

  const display = () => {
    if (focused) return raw;
    if (!value)  return "";
    const m = parseTime(value);
    return `${Math.floor(m/60)}:${String(m%60).padStart(2,"0")}`;
  };
  const handleBlur = () => {
    setFocused(false);
    const mins = parseTime(raw);
    if (mins>0) { const f=`${Math.floor(mins/60)}:${String(mins%60).padStart(2,"0")}`; setRaw(f); onChange(f); }
    else        { setRaw(""); onChange(""); }
  };

  const readonlyStyle = !editMode ? { opacity:0.65, cursor:"default", background:"#f8fafc", border:"2px solid #e2e8f0", color:"#94a3b8" } : {};

  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:"4px" }}>
      <label style={{ fontSize:"9px",fontWeight:800,letterSpacing:"0.5px",color:editMode?color:"#94a3b8",textTransform:"uppercase" }}>{label}</label>
      <input
        type="text" placeholder="0:00" value={display()}
        onChange={e=>editMode && setRaw(e.target.value.replace(/[^0-9:h]/gi,""))}
        onFocus={()=>{ if (!editMode) return; setFocused(true); setRaw(value||""); }}
        onBlur={handleBlur}
        readOnly={!editMode}
        style={{ width:"100%",height:"42px",border:`2px solid ${focused?color:color+"44"}`,borderRadius:"10px",textAlign:"center",fontSize:"14px",fontWeight:700,color,background:color+"10",outline:"none",boxShadow:focused?`0 0 0 3px ${color}22`:"none",transition:"all 0.2s",...readonlyStyle }}
      />
    </div>
  );
}

// ── MonthRow ────────────────────────────────────────────────────────────────
function MonthRow({ month, mi, year, values, onChange, editMode }) {
  const days       = getDays(mi, year);
  const total      = STATUSES.reduce((s,st)=>s+(parseInt(values[st.key])||0), 0);
  const over       = total>days, ok = total===days&&total>0;
  const flightMins = parseTime(values.flightTime);
  const dutyMins   = parseTime(values.dutyTime);
  const sectors    = parseInt(values.sectors)||0;
  const onDays     = parseInt(values.ON)||0;

  return (
    <div style={{ ...card(), padding:"16px 18px", border:`1.5px solid ${over?"#fca5a5":ok?"#86efac":"#e2e8f0"}`, transition:"border-color 0.3s",
      // légèrement différent en lecture seule
      opacity: 1,
    }}>
      {/* Header */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px" }}>
        <div>
          <span style={{ fontWeight:800,fontSize:"15px",color:"#1e293b" }}>{month.name}</span>
          <span style={{ marginLeft:"8px",fontSize:"12px",color:"#94a3b8" }}>{days} jours</span>
        </div>
        <span style={{ fontWeight:900,fontSize:"15px",color:over?"#dc2626":ok?"#16a34a":"#94a3b8" }}>
          {total}<span style={{ fontSize:"11px",fontWeight:500,color:"#cbd5e1" }}>/{days}</span>
          {ok&&" ✓"}{over&&" ⚠️"}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height:"4px",background:"#f1f5f9",borderRadius:"99px",overflow:"hidden",marginBottom:"14px" }}>
        <div style={{ height:"100%",width:`${Math.min((total/days)*100,100)}%`,background:over?"#dc2626":ok?"#16a34a":"#2563eb",borderRadius:"99px",transition:"width 0.4s ease" }}/>
      </div>

      {/* Status inputs */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"6px",marginBottom:"14px" }}>
        {STATUSES.map(st=>{
          const isReadonly = !editMode;
          return (
            <div key={st.key} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:"4px" }}>
              <label style={{ fontSize:"9px",fontWeight:800,letterSpacing:"0.5px",color:isReadonly?"#94a3b8":st.color,textTransform:"uppercase" }}>{st.label}</label>
              <input
                type="number" inputMode="numeric" min="0" max={days}
                value={values[st.key]??""}
                onChange={e=>editMode && onChange(month.name, st.key, e.target.value.replace(/\D/,""))}
                readOnly={isReadonly}
                style={{
                  width:"100%", height:"40px",
                  border:`2px solid ${isReadonly?"#e2e8f0":st.color+"33"}`,
                  borderRadius:"10px", textAlign:"center",
                  fontSize:"16px", fontWeight:800,
                  color:isReadonly?"#94a3b8":st.text,
                  background:isReadonly?"#f8fafc":st.bg,
                  outline:"none", cursor:isReadonly?"default":"text",
                  WebkitAppearance:"none", MozAppearance:"textfield",
                  transition:"all 0.2s",
                }}
                onFocus={e=>{ if (!editMode) return; e.target.style.borderColor=st.color; e.target.style.boxShadow=`0 0 0 3px ${st.color}18`; }}
                onBlur={e=>{ e.target.style.borderColor=editMode?`${st.color}33`:"#e2e8f0"; e.target.style.boxShadow="none"; }}
              />
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div style={{ borderTop:"1px dashed #e2e8f0",marginBottom:"12px" }}/>

      {/* Flight inputs */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px" }}>
        <TimeInput label="✈ Temps de vol" color="#0891b2" value={values.flightTime} onChange={v=>onChange(month.name,"flightTime",v)} editMode={editMode}/>
        <TimeInput label="⏱ Duty time"   color="#7c3aed" value={values.dutyTime}   onChange={v=>onChange(month.name,"dutyTime",v)}   editMode={editMode}/>
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:"4px" }}>
          <label style={{ fontSize:"9px",fontWeight:800,letterSpacing:"0.5px",color:editMode?"#16a34a":"#94a3b8",textTransform:"uppercase" }}>🛫 Secteurs</label>
          <input
            type="number" inputMode="numeric" min="0"
            value={values.sectors??""}
            onChange={e=>editMode && onChange(month.name,"sectors",e.target.value.replace(/\D/,""))}
            readOnly={!editMode}
            style={{ width:"100%",height:"42px",border:`2px solid ${editMode?"#16a34a44":"#e2e8f0"}`,borderRadius:"10px",textAlign:"center",fontSize:"16px",fontWeight:800,color:editMode?"#15803d":"#94a3b8",background:editMode?"#f0fdf4":"#f8fafc",outline:"none",cursor:editMode?"text":"default",WebkitAppearance:"none",MozAppearance:"textfield",transition:"all 0.2s" }}
            onFocus={e=>{ if (!editMode) return; e.target.style.borderColor="#16a34a"; e.target.style.boxShadow="0 0 0 3px #16a34a18"; }}
            onBlur={e=>{ e.target.style.borderColor=editMode?"#16a34a44":"#e2e8f0"; e.target.style.boxShadow="none"; }}
          />
        </div>
      </div>

      {/* Flight chips */}
      {(flightMins>0||dutyMins>0||sectors>0) && (
        <div style={{ display:"flex",gap:"8px",marginTop:"10px",flexWrap:"wrap" }}>
          {flightMins>0 && <span style={{ background:"#ecfeff",color:"#0e7490",border:"1px solid #0891b233",padding:"2px 10px",borderRadius:"99px",fontSize:"11px",fontWeight:700 }}>✈ {fmtTime(flightMins)}{onDays>0?` · moy ${fmtTime(Math.round(flightMins/onDays))}/j ON`:""}</span>}
          {dutyMins>0   && <span style={{ background:"#f5f3ff",color:"#6d28d9",border:"1px solid #7c3aed33",padding:"2px 10px",borderRadius:"99px",fontSize:"11px",fontWeight:700 }}>⏱ {fmtTime(dutyMins)}{onDays>0?` · moy ${fmtTime(Math.round(dutyMins/onDays))}/j ON`:""}</span>}
          {sectors>0    && <span style={{ background:"#f0fdf4",color:"#15803d",border:"1px solid #16a34a33",padding:"2px 10px",borderRadius:"99px",fontSize:"11px",fontWeight:700 }}>🛫 {sectors} sect.{onDays>0?` · moy ${(sectors/onDays).toFixed(1)}/j ON`:""}</span>}
        </div>
      )}
    </div>
  );
}

// ── StatCard ────────────────────────────────────────────────────────────────
function StatCard({ emoji, label, value, sub, color="#2563eb" }) {
  return (
    <div style={card({ padding:"16px 18px" })}>
      <div style={{ fontSize:"20px",marginBottom:"4px" }}>{emoji}</div>
      <div style={{ fontSize:"24px",fontWeight:900,color,lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:"12px",color:"#64748b",marginTop:"4px",fontWeight:600 }}>{label}</div>
      {sub&&<div style={{ fontSize:"11px",color:"#94a3b8",marginTop:"2px" }}>{sub}</div>}
    </div>
  );
}

// ── SummaryTable ────────────────────────────────────────────────────────────
function SummaryTable({ data, year }) {
  const v  = (m,k) => parseInt(data[m]?.[k])||0;
  const mT = (m)   => STATUSES.reduce((s,st)=>s+v(m,st.key),0);
  const yT = (k)   => MONTHS.reduce((s,m)=>s+v(m.name,k),0);
  const TH = (e={}) => ({ padding:"11px 10px",fontSize:"11px",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.6px",textAlign:"center",color:"#94a3b8",...e });
  const TD = (e={}) => ({ padding:"9px 10px",fontSize:"13px",...e });
  return (
    <div style={{ overflowX:"auto",...card() }}>
      <table style={{ width:"100%",borderCollapse:"collapse",minWidth:"700px" }}>
        <thead><tr style={{ background:"#f8fafc",borderBottom:"1px solid #e2e8f0" }}>
          <th style={TH({ textAlign:"left",paddingLeft:"18px",color:"#64748b" })}>MOIS</th>
          {STATUSES.map(st=><th key={st.key} style={TH({ color:st.color })}>{st.label}</th>)}
          <th style={TH({ color:"#1e293b" })}>TOTAL</th>
        </tr></thead>
        <tbody>{MONTHS.map((m,i)=>{
          const total=mT(m.name),days=getDays(i,year),over=total>days,ok=total===days&&total>0;
          return(<tr key={m.name} style={{ borderBottom:"1px solid #f1f5f9" }}>
            <td style={TD({ paddingLeft:"18px",fontWeight:700,color:"#1e293b" })}>{m.name} <span style={{ color:"#cbd5e1",fontSize:"11px" }}>({days}j)</span></td>
            {STATUSES.map(st=>{const val=v(m.name,st.key);return(
              <td key={st.key} style={TD({ textAlign:"center" })}>
                {val>0?<span style={{ background:st.bg,color:st.text,padding:"2px 9px",borderRadius:"99px",fontWeight:700,fontSize:"12px" }}>{val}</span>:<span style={{ color:"#e2e8f0" }}>—</span>}
              </td>);})}
            <td style={TD({ textAlign:"center",fontWeight:800,fontSize:"14px",color:over?"#dc2626":ok?"#16a34a":"#94a3b8" })}>{total>0?total:"—"}{ok&&" ✓"}{over&&" ⚠️"}</td>
          </tr>);})}
        </tbody>
        <tfoot><tr style={{ background:"#f8fafc",borderTop:"2px solid #e2e8f0" }}>
          <td style={TD({ paddingLeft:"18px",fontWeight:900,color:"#1e293b",fontSize:"13px" })}>TOTAL ANNÉE</td>
          {STATUSES.map(st=><td key={st.key} style={TD({ textAlign:"center" })}><span style={{ background:st.bg,color:st.color,padding:"3px 10px",borderRadius:"99px",fontWeight:900,fontSize:"13px" }}>{yT(st.key)}</span></td>)}
          <td style={TD({ textAlign:"center",fontWeight:900,fontSize:"16px",color:"#1e293b" })}>{STATUSES.reduce((s,st)=>s+yT(st.key),0)}</td>
        </tr></tfoot>
      </table>
    </div>
  );
}

// ── PresenceCharts ──────────────────────────────────────────────────────────
function PresenceCharts({ allData, years }) {
  const gv = (yd,mn,gk) => { const g=GROUPS.find(x=>x.key===gk); return g.keys.reduce((s,k)=>s+(parseInt(yd?.[mn]?.[k])||0),0); };
  const monthlyData = (year) => MONTHS.map(m=>({ name:m.short, Travail:gv(allData[year],m.name,"work"), Repos:gv(allData[year],m.name,"off"), Absences:gv(allData[year],m.name,"absent") }));
  const globalData  = years.map(y=>({ name:String(y), Travail:MONTHS.reduce((s,m)=>s+gv(allData[y],m.name,"work"),0), Repos:MONTHS.reduce((s,m)=>s+gv(allData[y],m.name,"off"),0), Absences:MONTHS.reduce((s,m)=>s+gv(allData[y],m.name,"absent"),0) }));
  const COLORS = { Travail:"#2563eb", Repos:"#7c3aed", Absences:"#dc2626" };
  const CC = ({title,sub,children}) => (<div style={card({ padding:"20px" })}><div style={{ marginBottom:"16px" }}><h3 style={{ fontWeight:800,fontSize:"15px",color:"#1e293b" }}>{title}</h3>{sub&&<p style={{ fontSize:"12px",color:"#94a3b8",marginTop:"2px" }}>{sub}</p>}</div>{children}</div>);
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:"16px" }}>
      <CC title="Vue globale — toutes années" sub="Travail · Repos · Absences cumulés">
        <ResponsiveContainer width="100%" height={220}><BarChart data={globalData} barGap={6}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
          <XAxis dataKey="name" tick={{ fontSize:12,fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
          <YAxis tick={{ fontSize:11,fill:"#cbd5e1" }} axisLine={false} tickLine={false}/>
          <Tooltip content={<CustomTooltip/>}/><Legend wrapperStyle={{ fontSize:"12px",paddingTop:"10px" }}/>
          {Object.entries(COLORS).map(([n,c])=><Bar key={n} dataKey={n} fill={c} radius={[6,6,0,0]} maxBarSize={50}/>)}
        </BarChart></ResponsiveContainer>
      </CC>
      {years.filter(y=>allData[y]).map(year=>(
        <CC key={year} title={`${year} — par mois`} sub="Jours de travail · repos · absences">
          <ResponsiveContainer width="100%" height={200}><BarChart data={monthlyData(year)} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
            <XAxis dataKey="name" tick={{ fontSize:11,fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
            <YAxis tick={{ fontSize:11,fill:"#cbd5e1" }} axisLine={false} tickLine={false}/>
            <Tooltip content={<CustomTooltip/>}/><Legend wrapperStyle={{ fontSize:"12px",paddingTop:"8px" }}/>
            {Object.entries(COLORS).map(([n,c])=><Bar key={n} dataKey={n} fill={c} radius={[4,4,0,0]} maxBarSize={24}/>)}
          </BarChart></ResponsiveContainer>
        </CC>
      ))}
    </div>
  );
}

// ── FlightStats ─────────────────────────────────────────────────────────────
function FlightStats({ allData, years }) {
  const ft  = (yd,m) => parseTime(yd?.[m]?.flightTime);
  const dt  = (yd,m) => parseTime(yd?.[m]?.dutyTime);
  const sec = (yd,m) => parseInt(yd?.[m]?.sectors)||0;
  const on  = (yd,m) => parseInt(yd?.[m]?.ON)||0;

  const yearlyStats = years.map(y=>({
    year:y,
    totalFlight:  MONTHS.reduce((s,m)=>s+ft(allData[y],m.name),0),
    totalDuty:    MONTHS.reduce((s,m)=>s+dt(allData[y],m.name),0),
    totalSectors: MONTHS.reduce((s,m)=>s+sec(allData[y],m.name),0),
    totalOn:      MONTHS.reduce((s,m)=>s+on(allData[y],m.name),0),
  }));

  const gF=yearlyStats.reduce((s,y)=>s+y.totalFlight,0);
  const gD=yearlyStats.reduce((s,y)=>s+y.totalDuty,0);
  const gS=yearlyStats.reduce((s,y)=>s+y.totalSectors,0);
  const gO=yearlyStats.reduce((s,y)=>s+y.totalOn,0);

  const globalBar     = years.map(y=>{ const ys=yearlyStats.find(x=>x.year===y); return { name:String(y), "Vol (h)":parseFloat((ys.totalFlight/60).toFixed(1)), "Duty (h)":parseFloat((ys.totalDuty/60).toFixed(1)), Secteurs:ys.totalSectors }; });
  const monthlyFlight = (year) => MONTHS.map(m=>({ name:m.short, "Vol (h)":parseFloat((ft(allData[year],m.name)/60).toFixed(1)), "Duty (h)":parseFloat((dt(allData[year],m.name)/60).toFixed(1)), Secteurs:sec(allData[year],m.name) }));
  const CC = ({title,sub,children}) => (<div style={card({ padding:"20px" })}><div style={{ marginBottom:"16px" }}><h3 style={{ fontWeight:800,fontSize:"15px",color:"#1e293b" }}>{title}</h3>{sub&&<p style={{ fontSize:"12px",color:"#94a3b8",marginTop:"2px" }}>{sub}</p>}</div>{children}</div>);

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:"16px" }}>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:"10px" }}>
        <StatCard emoji="✈️" label="Vol total"      value={fmtTime(gF)} color="#0891b2" sub={gO>0?`moy ${fmtTime(Math.round(gF/gO))}/j ON`:undefined}/>
        <StatCard emoji="⏱"  label="Duty total"     value={fmtTime(gD)} color="#7c3aed" sub={gO>0?`moy ${fmtTime(Math.round(gD/gO))}/j ON`:undefined}/>
        <StatCard emoji="🛫" label="Secteurs totaux" value={gS}          color="#16a34a" sub={gO>0?`moy ${(gS/gO).toFixed(1)}/j ON`:undefined}/>
        <StatCard emoji="📅" label="Jours ON total"  value={gO}          color="#2563eb"/>
      </div>

      <div style={card({ padding:"20px" })}>
        <h3 style={{ fontWeight:800,fontSize:"15px",color:"#1e293b",marginBottom:"14px" }}>Comparaison par année</h3>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",minWidth:"500px" }}>
            <thead><tr style={{ background:"#f8fafc",borderBottom:"1px solid #e2e8f0" }}>
              {["Année","Jours ON","Temps vol","Duty time","Secteurs","Moy vol/j","Moy duty/j","Moy sect/j"].map(h=>(
                <th key={h} style={{ padding:"10px 12px",fontSize:"11px",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.5px",color:"#94a3b8",textAlign:h==="Année"?"left":"center" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{yearlyStats.map(({year:y,totalFlight,totalDuty,totalSectors,totalOn})=>(
              <tr key={y} style={{ borderBottom:"1px solid #f1f5f9" }}>
                <td style={{ padding:"10px 12px",fontWeight:800,color:"#1e293b",fontSize:"14px" }}>{y}</td>
                <td style={{ padding:"10px 12px",textAlign:"center" }}><span style={{ background:"#eff6ff",color:"#1d4ed8",padding:"2px 9px",borderRadius:"99px",fontWeight:700,fontSize:"12px" }}>{totalOn}j</span></td>
                <td style={{ padding:"10px 12px",textAlign:"center" }}><span style={{ background:"#ecfeff",color:"#0e7490",padding:"2px 9px",borderRadius:"99px",fontWeight:700,fontSize:"12px" }}>{fmtTime(totalFlight)}</span></td>
                <td style={{ padding:"10px 12px",textAlign:"center" }}><span style={{ background:"#f5f3ff",color:"#6d28d9",padding:"2px 9px",borderRadius:"99px",fontWeight:700,fontSize:"12px" }}>{fmtTime(totalDuty)}</span></td>
                <td style={{ padding:"10px 12px",textAlign:"center" }}><span style={{ background:"#f0fdf4",color:"#15803d",padding:"2px 9px",borderRadius:"99px",fontWeight:700,fontSize:"12px" }}>{totalSectors}</span></td>
                <td style={{ padding:"10px 12px",textAlign:"center",color:"#64748b",fontSize:"12px",fontWeight:600 }}>{totalOn>0?fmtTime(Math.round(totalFlight/totalOn)):"—"}</td>
                <td style={{ padding:"10px 12px",textAlign:"center",color:"#64748b",fontSize:"12px",fontWeight:600 }}>{totalOn>0?fmtTime(Math.round(totalDuty/totalOn)):"—"}</td>
                <td style={{ padding:"10px 12px",textAlign:"center",color:"#64748b",fontSize:"12px",fontWeight:600 }}>{totalOn>0?(totalSectors/totalOn).toFixed(1):"—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <CC title="Vue globale — toutes années" sub="Temps vol · duty · secteurs">
        <ResponsiveContainer width="100%" height={220}><BarChart data={globalBar} barGap={6}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
          <XAxis dataKey="name" tick={{ fontSize:12,fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
          <YAxis yAxisId="time" tick={{ fontSize:11,fill:"#cbd5e1" }} axisLine={false} tickLine={false} unit="h"/>
          <YAxis yAxisId="sect" orientation="right" tick={{ fontSize:11,fill:"#cbd5e1" }} axisLine={false} tickLine={false}/>
          <Tooltip content={<CustomTooltip/>}/><Legend wrapperStyle={{ fontSize:"12px",paddingTop:"10px" }}/>
          <Bar yAxisId="time" dataKey="Vol (h)"  fill="#0891b2" radius={[6,6,0,0]} maxBarSize={50}/>
          <Bar yAxisId="time" dataKey="Duty (h)" fill="#7c3aed" radius={[6,6,0,0]} maxBarSize={50}/>
          <Bar yAxisId="sect" dataKey="Secteurs" fill="#16a34a" radius={[6,6,0,0]} maxBarSize={50}/>
        </BarChart></ResponsiveContainer>
      </CC>

      {years.filter(y=>allData[y]).map(year=>{
        const ys=yearlyStats.find(x=>x.year===year);
        return (
          <div key={year} style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:"8px" }}>
              <StatCard emoji="✈️" label={`Vol ${year}`}      value={fmtTime(ys.totalFlight)} color="#0891b2" sub={ys.totalOn>0?`moy ${fmtTime(Math.round(ys.totalFlight/ys.totalOn))}/j ON`:undefined}/>
              <StatCard emoji="⏱"  label={`Duty ${year}`}     value={fmtTime(ys.totalDuty)}   color="#7c3aed" sub={ys.totalOn>0?`moy ${fmtTime(Math.round(ys.totalDuty/ys.totalOn))}/j ON`:undefined}/>
              <StatCard emoji="🛫" label={`Secteurs ${year}`} value={ys.totalSectors}          color="#16a34a" sub={ys.totalOn>0?`moy ${(ys.totalSectors/ys.totalOn).toFixed(1)}/j ON`:undefined}/>
            </div>
            <CC title={`${year} — vol & duty par mois`} sub="En heures">
              <ResponsiveContainer width="100%" height={220}><BarChart data={monthlyFlight(year)} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                <XAxis dataKey="name" tick={{ fontSize:11,fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="time" tick={{ fontSize:11,fill:"#cbd5e1" }} axisLine={false} tickLine={false} unit="h"/>
                <YAxis yAxisId="sect" orientation="right" tick={{ fontSize:11,fill:"#cbd5e1" }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip/>}/><Legend wrapperStyle={{ fontSize:"12px",paddingTop:"8px" }}/>
                <Bar yAxisId="time" dataKey="Vol (h)"  fill="#0891b2" radius={[4,4,0,0]} maxBarSize={22}/>
                <Bar yAxisId="time" dataKey="Duty (h)" fill="#7c3aed" radius={[4,4,0,0]} maxBarSize={22}/>
                <Bar yAxisId="sect" dataKey="Secteurs" fill="#16a34a" radius={[4,4,0,0]} maxBarSize={22}/>
              </BarChart></ResponsiveContainer>
            </CC>
            <CC title={`${year} — secteurs par mois`} sub="Nombre de tronçons volés">
              <ResponsiveContainer width="100%" height={160}><LineChart data={monthlyFlight(year)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                <XAxis dataKey="name" tick={{ fontSize:11,fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:11,fill:"#cbd5e1" }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Line type="monotone" dataKey="Secteurs" stroke="#16a34a" strokeWidth={2.5} dot={{ r:4,fill:"#16a34a" }} activeDot={{ r:6 }}/>
              </LineChart></ResponsiveContainer>
            </CC>
          </div>
        );
      })}
    </div>
  );
}

// ── APP PRINCIPAL ───────────────────────────────────────────────────────────
export default function App() {
  const [years, setYears]       = useState([2024,2025,2026]);
  const [year, setYear]         = useState(2026);
  const [tab, setTab]           = useState("saisie");
  const [allData, setAllData]   = useState({});
  const [sync, setSync]         = useState("loading");
  const [editMode, setEditMode] = useState(false);
  const [showLock, setShowLock] = useState(false);
  const saveTimer               = useRef(null);

  useEffect(()=>{
    setSync("loading");
    const ref = doc(db,"users",USER_ID);
    const unsub = onSnapshot(ref, snap=>{
      if (snap.exists()) { const d=snap.data(); if(d.allData)setAllData(d.allData); if(d.years)setYears(d.years); }
      setSync("synced");
    }, ()=>setSync("error"));
    return ()=>unsub();
  },[]);

  const persist = (data, yrs) => {
    setSync("saving"); clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async()=>{ try{ await setDoc(doc(db,"users",USER_ID),{allData:data,years:yrs}); setSync("synced"); }catch{ setSync("error"); }}, 700);
  };

  const onChange = (month, key, val) => {
    if (!editMode) return;
    const updated = { ...allData, [year]:{ ...(allData[year]||initYearData()), [month]:{ ...(allData[year]?.[month]||initMonthData()), [key]:val }}};
    setAllData(updated); persist(updated, years);
  };

  const addYear = () => {
    if (!editMode) return;
    const next=Math.max(...years)+1, ny=[...years,next];
    setYears(ny); setYear(next); persist(allData, ny);
  };

  const reset = () => {
    if (!editMode) return;
    if (!window.confirm(`Effacer toutes les données de ${year} ?`)) return;
    const u={...allData,[year]:initYearData()}; setAllData(u); persist(u,years);
  };

  const data = allData[year]||initYearData();

  const sb = {
    loading:{ label:"Chargement...", color:"#d97706", bg:"#fffbeb" },
    saving: { label:"Sauvegarde...", color:"#2563eb", bg:"#eff6ff" },
    synced: { label:"✓ Synchronisé", color:"#16a34a", bg:"#f0fdf4" },
    error:  { label:"⚠ Erreur",      color:"#dc2626", bg:"#fef2f2" },
  }[sync];

  const TABS = [
    { k:"saisie",   l:"✏️ Saisie"   },
    { k:"tableau",  l:"📋 Tableau"  },
    { k:"presence", l:"📊 Présence" },
    { k:"flight",   l:"✈️ Vol"      },
  ];

  return (
    <div style={{ background:"#f1f5f9",minHeight:"100vh",fontFamily:"system-ui,-apple-system,sans-serif" }}>

      {/* ── HEADER ── */}
      <header style={{ background:"#fff",borderBottom:"1px solid #e2e8f0",padding:"12px 16px",position:"sticky",top:0,zIndex:100,boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth:"920px",margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"10px",flexWrap:"wrap" }}>

          {/* Logo + titre */}
          <div style={{ display:"flex",alignItems:"center",gap:"10px" }}>
            <div style={{ width:"36px",height:"36px",background:"linear-gradient(135deg,#2563eb,#7c3aed)",borderRadius:"10px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px" }}>📋</div>
            <div>
              <h1 style={{ fontSize:"16px",fontWeight:900,color:"#1e293b",letterSpacing:"-0.3px" }}>Suivi Présence & Vol</h1>
              <p style={{ fontSize:"11px",color:"#94a3b8" }}>Sync Firebase · Multi-appareils</p>
            </div>
          </div>

          {/* Contrôles droite */}
          <div style={{ display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap" }}>
            {/* Années */}
            <div style={{ display:"flex",gap:"3px",alignItems:"center" }}>
              {years.map(y=>(
                <button key={y} onClick={()=>setYear(y)} style={{ padding:"5px 11px",borderRadius:"8px",border:`1.5px solid ${year===y?"#2563eb":"#e2e8f0"}`,background:year===y?"#eff6ff":"#fff",color:year===y?"#2563eb":"#94a3b8",fontWeight:700,fontSize:"13px",cursor:"pointer" }}>{y}</button>
              ))}
              {editMode && (
                <button onClick={addYear} title="Ajouter une année" style={{ padding:"5px 9px",borderRadius:"8px",border:"1.5px dashed #cbd5e1",background:"#fff",color:"#94a3b8",fontWeight:800,fontSize:"14px",cursor:"pointer" }}>＋</button>
              )}
            </div>

            {/* Badge sync */}
            <div style={{ padding:"4px 10px",borderRadius:"8px",fontSize:"11px",fontWeight:600,background:sb.bg,color:sb.color,border:`1px solid ${sb.color}33`,transition:"all 0.3s" }}>{sb.label}</div>

            {/* Edit mode */}
            {editMode ? (
              <>
                <div style={{ padding:"4px 10px",borderRadius:"8px",background:"#fef9c3",color:"#a16207",border:"1px solid #fde04788",fontSize:"11px",fontWeight:700 }}>✏️ Mode édition</div>
                <button onClick={reset} style={{ padding:"5px 10px",borderRadius:"8px",border:"1px solid #fecaca",background:"#fef2f2",color:"#dc2626",fontWeight:700,fontSize:"12px",cursor:"pointer" }}>🗑 {year}</button>
                <button onClick={()=>setEditMode(false)} style={{ padding:"5px 11px",borderRadius:"8px",border:"1px solid #e2e8f0",background:"#f8fafc",color:"#64748b",fontWeight:700,fontSize:"12px",cursor:"pointer" }}>🔒 Verrouiller</button>
              </>
            ) : (
              <button onClick={()=>setShowLock(true)} style={{ padding:"5px 14px",borderRadius:"8px",border:"1.5px solid #2563eb",background:"#eff6ff",color:"#2563eb",fontWeight:700,fontSize:"12px",cursor:"pointer" }}>✏️ Éditer</button>
            )}
          </div>
        </div>
      </header>

      {/* ── CONTENU ── */}
      <div style={{ maxWidth:"920px",margin:"0 auto",padding:"14px 16px 60px" }}>

        {/* Légende pills */}
        <div style={{ display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"12px" }}>
          {STATUSES.map(st=><span key={st.key} style={{ background:st.bg,color:st.text,border:`1px solid ${st.color}33`,padding:"3px 10px",borderRadius:"99px",fontSize:"11px",fontWeight:700 }}>{st.label}</span>)}
          <span style={{ background:"#ecfeff",color:"#0e7490",border:"1px solid #0891b233",padding:"3px 10px",borderRadius:"99px",fontSize:"11px",fontWeight:700 }}>✈ VOL</span>
          <span style={{ background:"#f5f3ff",color:"#6d28d9",border:"1px solid #7c3aed33",padding:"3px 10px",borderRadius:"99px",fontSize:"11px",fontWeight:700 }}>⏱ DUTY</span>
          <span style={{ background:"#f0fdf4",color:"#15803d",border:"1px solid #16a34a33",padding:"3px 10px",borderRadius:"99px",fontSize:"11px",fontWeight:700 }}>🛫 SECTEURS</span>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex",gap:"3px",background:"#e2e8f0",padding:"4px",borderRadius:"12px",width:"fit-content",marginBottom:"16px" }}>
          {TABS.map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)} style={{ padding:"7px 14px",borderRadius:"9px",border:"none",cursor:"pointer",fontWeight:700,fontSize:"13px",transition:"all 0.2s",background:tab===t.k?"#fff":"transparent",color:tab===t.k?"#1e293b":"#94a3b8",boxShadow:tab===t.k?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>{t.l}</button>
          ))}
        </div>

        {/* Bannière lecture seule */}
        {!editMode && (
          <div style={{ background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:"10px",padding:"10px 16px",marginBottom:"14px",display:"flex",alignItems:"center",gap:"10px" }}>
            <span style={{ fontSize:"16px" }}>👁</span>
            <span style={{ fontSize:"13px",color:"#0369a1",fontWeight:600 }}>Mode lecture seule — clique sur <strong>✏️ Éditer</strong> pour modifier les données</span>
          </div>
        )}

        {/* Pages */}
        {sync==="loading"
          ? <div style={{ textAlign:"center",padding:"80px 20px",color:"#94a3b8" }}><div style={{ fontSize:"32px",marginBottom:"12px" }}>⏳</div><p style={{ fontSize:"14px",fontWeight:600 }}>Chargement Firebase...</p></div>
          : <>
              {tab==="saisie"   && <div style={{ display:"flex",flexDirection:"column",gap:"10px" }}>{MONTHS.map((m,i)=><MonthRow key={m.name} month={m} mi={i} year={year} values={data[m.name]||{}} onChange={onChange} editMode={editMode}/>)}</div>}
              {tab==="tableau"  && <SummaryTable data={data} year={year}/>}
              {tab==="presence" && <PresenceCharts allData={allData} years={years}/>}
              {tab==="flight"   && <FlightStats allData={allData} years={years}/>}
            </>
        }
      </div>

      {/* ── MODAL MOT DE PASSE ── */}
      {showLock && (
        <LockModal
          onUnlock={()=>{ setEditMode(true); setShowLock(false); }}
          onClose={()=>setShowLock(false)}
        />
      )}
    </div>
  );
}
