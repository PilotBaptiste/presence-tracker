import { useState, useEffect } from "react";

const STATUSES = [
  { key: "OFF",     label: "OFF",     color: "#6366f1", bg: "#1e1b4b", pill: "#818cf8", text: "#c7d2fe" },
  { key: "ON",      label: "ON",      color: "#10b981", bg: "#022c22", pill: "#34d399", text: "#a7f3d0" },
  { key: "LEAVE",   label: "LEAVE",   color: "#f59e0b", bg: "#1c1500", pill: "#fbbf24", text: "#fde68a" },
  { key: "SICK",    label: "SICK",    color: "#ef4444", bg: "#1f0a0a", pill: "#f87171", text: "#fecaca" },
  { key: "UNFIT",   label: "UNFIT",   color: "#a855f7", bg: "#1a0533", pill: "#c084fc", text: "#e9d5ff" },
  { key: "FATIGUE", label: "FATIGUE", color: "#f97316", bg: "#1c0a00", pill: "#fb923c", text: "#fed7aa" },
];

const MONTHS = [
  { name: "Janvier",   days: 31 }, { name: "Février",   days: 28 },
  { name: "Mars",      days: 31 }, { name: "Avril",     days: 30 },
  { name: "Mai",       days: 31 }, { name: "Juin",      days: 30 },
  { name: "Juillet",   days: 31 }, { name: "Août",      days: 31 },
  { name: "Septembre", days: 30 }, { name: "Octobre",   days: 31 },
  { name: "Novembre",  days: 30 }, { name: "Décembre",  days: 31 },
];

const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const getDays = (i, y) => i === 1 && isLeap(y) ? 29 : MONTHS[i].days;
const initData = () => Object.fromEntries(MONTHS.map(m => [m.name, Object.fromEntries(STATUSES.map(s => [s.key, ""]))]));
const STORAGE_KEY = "presence-tracker-v1";
const load = () => { try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
const save = (d) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} };

const thS = { padding: "12px 10px", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.8px", textAlign: "center" };
const tdS = { padding: "10px 10px", fontSize: "13px", color: "#94a3b8" };

function ProgressBar({ value, max, color }) {
  const p = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const c = value > max ? "#ef4444" : value === max && max > 0 ? "#10b981" : color;
  return (
    <div style={{ height: "5px", background: "#0f172a", borderRadius: "99px", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${p}%`, background: c, borderRadius: "99px", transition: "width 0.4s ease", boxShadow: `0 0 6px ${c}88` }} />
    </div>
  );
}

function MonthRow({ month, mi, year, values, onChange }) {
  const days = getDays(mi, year);
  const total = STATUSES.reduce((s, st) => s + (parseInt(values[st.key]) || 0), 0);
  const over = total > days, ok = total === days && total > 0;
  return (
    <div style={{ background: "#1e293b", borderRadius: "14px", padding: "14px 16px", border: `1.5px solid ${over ? "#ef444455" : ok ? "#10b98155" : "#2d3f55"}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: "15px", color: "#f1f5f9" }}>{month.name}</span>
          <span style={{ marginLeft: "8px", fontSize: "11px", color: "#475569" }}>{days}j</span>
        </div>
        <span style={{ fontWeight: 900, fontSize: "17px", color: over ? "#f87171" : ok ? "#34d399" : "#64748b" }}>
          {total}<span style={{ fontSize: "11px", fontWeight: 500, color: "#475569" }}>/{days}</span>
          {ok ? " ✓" : over ? " ⚠️" : ""}
        </span>
      </div>
      <div style={{ marginBottom: "12px" }}><ProgressBar value={total} max={days} color="#6366f1" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: "6px" }}>
        {STATUSES.map(s => (
          <div key={s.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <label style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.6px", color: s.pill }}>{s.label}</label>
            <input type="number" inputMode="numeric" min="0" max={days} value={values[s.key] ?? ""}
              onChange={e => onChange(month.name, s.key, e.target.value.replace(/\D/, ""))}
              style={{ width: "100%", height: "42px", border: `2px solid ${s.color}33`, borderRadius: "9px", textAlign: "center", fontSize: "17px", fontWeight: 800, color: s.text, background: s.bg, outline: "none", WebkitAppearance: "none", MozAppearance: "textfield" }}
              onFocus={e => { e.target.style.borderColor = s.color; e.target.style.boxShadow = `0 0 0 3px ${s.color}22`; }}
              onBlur={e => { e.target.style.borderColor = `${s.color}33`; e.target.style.boxShadow = "none"; }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryTable({ data, year }) {
  const v = (m, k) => parseInt(data[m]?.[k]) || 0;
  const mT = (m) => STATUSES.reduce((s, st) => s + v(m, st.key), 0);
  const yT = (k) => MONTHS.reduce((s, m) => s + v(m.name, k), 0);
  return (
    <div style={{ overflowX: "auto", borderRadius: "14px", border: "1px solid #1e293b" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "580px" }}>
        <thead><tr style={{ background: "#0f172a" }}>
          <th style={{ ...thS, textAlign: "left", color: "#475569" }}>MOIS</th>
          {STATUSES.map(s => <th key={s.key} style={{ ...thS, color: s.pill }}>{s.label}</th>)}
          <th style={{ ...thS, color: "#94a3b8" }}>TOTAL</th>
        </tr></thead>
        <tbody>{MONTHS.map((m, i) => {
          const total = mT(m.name), days = getDays(i, year);
          return (
            <tr key={m.name} style={{ background: i % 2 === 0 ? "#1e293b" : "#172032" }}>
              <td style={{ ...tdS, fontWeight: 700, color: "#e2e8f0" }}>{m.name} <span style={{ color: "#334155", fontSize: "11px" }}>({days}j)</span></td>
              {STATUSES.map(s => { const val = v(m.name, s.key); return (
                <td key={s.key} style={{ ...tdS, textAlign: "center" }}>
                  {val > 0 ? <span style={{ background: s.bg, color: s.text, padding: "2px 9px", borderRadius: "99px", fontWeight: 700, fontSize: "12px", border: `1px solid ${s.color}33` }}>{val}</span> : <span style={{ color: "#2d3f55" }}>—</span>}
                </td>
              );})}
              <td style={{ ...tdS, textAlign: "center", fontWeight: 800, color: total > days ? "#f87171" : total === days && total > 0 ? "#34d399" : "#64748b" }}>{total > 0 ? total : "—"}</td>
            </tr>
          );
        })}</tbody>
        <tfoot><tr style={{ background: "#0f172a", borderTop: "2px solid #334155" }}>
          <td style={{ ...tdS, fontWeight: 900, color: "#f1f5f9", fontSize: "13px" }}>TOTAL ANNÉE</td>
          {STATUSES.map(s => <td key={s.key} style={{ ...tdS, textAlign: "center" }}>
            <span style={{ background: s.bg, color: s.pill, padding: "3px 11px", borderRadius: "99px", fontWeight: 900, fontSize: "14px", border: `1px solid ${s.color}55` }}>{yT(s.key)}</span>
          </td>)}
          <td style={{ ...tdS, textAlign: "center", fontWeight: 900, fontSize: "17px", color: "#f1f5f9" }}>{STATUSES.reduce((s, st) => s + yT(st.key), 0)}</td>
        </tr></tfoot>
      </table>
    </div>
  );
}

function Stats({ data, year }) {
  const v = (m, k) => parseInt(data[m]?.[k]) || 0;
  const yT = (k) => MONTHS.reduce((s, m) => s + v(m.name, k), 0);
  const total = STATUSES.reduce((s, st) => s + yT(st.key), 0);
  const totalDays = MONTHS.reduce((s, m, i) => s + getDays(i, year), 0);
  const completed = MONTHS.filter((m, i) => { const t = STATUSES.reduce((s, st) => s + v(m.name, st.key), 0); return t === getDays(i, year) && t > 0; }).length;
  const maxVal = Math.max(...STATUSES.map(s => yT(s.key)), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ background: "#1e293b", borderRadius: "14px", padding: "20px" }}>
        <h3 style={{ color: "#f1f5f9", fontSize: "14px", fontWeight: 700, marginBottom: "14px" }}>📊 Répartition annuelle</h3>
        {STATUSES.map(s => { const val = yT(s.key); return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span style={{ width: "62px", fontSize: "11px", fontWeight: 700, color: s.pill, flexShrink: 0 }}>{s.label}</span>
            <div style={{ flex: 1, background: "#0f172a", borderRadius: "99px", height: "18px", overflow: "hidden" }}>
              <div style={{ width: `${(val / maxVal) * 100}%`, height: "100%", background: `linear-gradient(90deg,${s.color},${s.pill})`, borderRadius: "99px", transition: "width 0.5s ease", display: "flex", alignItems: "center", paddingLeft: "8px" }}>
                {val > 0 && (val / maxVal) > 0.15 && <span style={{ fontSize: "11px", fontWeight: 800, color: "#fff" }}>{val}j</span>}
              </div>
            </div>
            <span style={{ fontSize: "12px", color: "#475569", width: "24px", textAlign: "right" }}>{(val / maxVal) <= 0.15 && val > 0 ? `${val}j` : ""}</span>
          </div>
        );})}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        {[
          { v: total, label: "jours saisis", sub: `sur ${totalDays}` },
          { v: completed, label: "mois complets", sub: `sur ${MONTHS.length}` },
          ...STATUSES.map(s => ({ v: yT(s.key), label: s.label, s })).filter(x => x.v > 0)
        ].map((item, i) => (
          <div key={i} style={{ background: item.s ? item.s.bg : "#1e293b", borderRadius: "12px", padding: "14px", border: item.s ? `1px solid ${item.s.color}33` : "1px solid #334155" }}>
            <div style={{ fontSize: "26px", fontWeight: 900, color: item.s ? item.s.pill : "#f1f5f9" }}>{item.v}</div>
            <div style={{ fontSize: "12px", color: item.s ? item.s.text : "#64748b", marginTop: "2px" }}>{item.label}</div>
            {item.sub && <div style={{ fontSize: "11px", color: "#334155", marginTop: "2px" }}>{item.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [year, setYear] = useState(2026);
  const [tab, setTab] = useState("saisie");
  const [allData, setAllData] = useState(() => load() || { 2026: initData() });
  const [flash, setFlash] = useState(false);

  const data = allData[year] || initData();

  useEffect(() => {
    save(allData);
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 1200);
    return () => clearTimeout(t);
  }, [allData]);

  const onChange = (month, key, val) => setAllData(prev => ({
    ...prev, [year]: { ...(prev[year] || initData()), [month]: { ...(prev[year]?.[month] || {}), [key]: val } }
  }));

  const reset = () => { if (window.confirm(`Effacer ${year} ?`)) setAllData(p => ({ ...p, [year]: initData() })); };

  const TABS = [{ k: "saisie", l: "✏️ Saisie" }, { k: "resume", l: "📋 Tableau" }, { k: "stats", l: "📊 Stats" }];

  return (
    <div style={{ background: "#0f172a", minHeight: "100vh", color: "#f1f5f9", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <header style={{ background: "#020617", borderBottom: "1px solid #1e293b", padding: "14px 16px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: "860px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "22px" }}>📋</span>
            <div>
              <h1 style={{ fontSize: "17px", fontWeight: 900, color: "#f1f5f9" }}>Suivi Présence</h1>
              <p style={{ fontSize: "11px", color: "#475569" }}>Sauvegarde auto · Local</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "3px" }}>
              {[2025, 2026, 2027].map(y => (
                <button key={y} onClick={() => setYear(y)} style={{ padding: "5px 10px", borderRadius: "7px", border: `1px solid ${year === y ? "#6366f1" : "#1e293b"}`, background: year === y ? "#312e81" : "#1e293b", color: year === y ? "#c7d2fe" : "#64748b", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>{y}</button>
              ))}
            </div>
            <div style={{ padding: "4px 9px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: flash ? "#022c22" : "#1e293b", color: flash ? "#34d399" : "#475569", border: `1px solid ${flash ? "#10b98133" : "#334155"}`, transition: "all 0.3s" }}>
              {flash ? "✓ Sauvegardé" : "💾 Auto"}
            </div>
            <button onClick={reset} style={{ padding: "5px 9px", borderRadius: "7px", border: "1px solid #7f1d1d", background: "#1f0a0a", color: "#f87171", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>🗑</button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "12px 16px" }}>
        {/* Status legend */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
          {STATUSES.map(s => <span key={s.key} style={{ background: s.bg, color: s.pill, border: `1px solid ${s.color}44`, padding: "3px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: 700 }}>{s.label}</span>)}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", background: "#1e293b", padding: "4px", borderRadius: "11px", width: "fit-content", marginBottom: "14px" }}>
          {TABS.map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{ padding: "7px 14px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "12px", background: tab === t.k ? "#6366f1" : "transparent", color: tab === t.k ? "#fff" : "#64748b", boxShadow: tab === t.k ? "0 2px 8px #6366f155" : "none", transition: "all 0.2s" }}>{t.l}</button>
          ))}
        </div>

        {tab === "saisie" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {MONTHS.map((m, i) => <MonthRow key={m.name} month={m} mi={i} year={year} values={data[m.name] || {}} onChange={onChange} />)}
          </div>
        )}
        {tab === "resume" && <SummaryTable data={data} year={year} />}
        {tab === "stats" && <Stats data={data} year={year} />}
      </div>
    </div>
  );
}