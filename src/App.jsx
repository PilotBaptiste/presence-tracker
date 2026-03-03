import { useState, useEffect, useCallback } from "react";
import { db } from "./firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";

// ─── CONFIG ────────────────────────────────────────────────────────────────
const USER_ID = "baptiste"; // identifiant unique pour tes données

const STATUSES = [
  { key: "ON",       label: "ON",       color: "#3b82f6", bg: "#eff6ff",   text: "#1d4ed8", group: "work" },
  { key: "COMMUTING",label: "COMMUTING",color: "#06b6d4", bg: "#ecfeff",   text: "#0e7490", group: "work" },
  { key: "OFF",      label: "OFF",      color: "#8b5cf6", bg: "#f5f3ff",   text: "#6d28d9", group: "off" },
  { key: "LEAVE",    label: "LEAVE",    color: "#f59e0b", bg: "#fffbeb",   text: "#92400e", group: "off" },
  { key: "SICK",     label: "SICK",     color: "#ef4444", bg: "#fef2f2",   text: "#991b1b", group: "absent" },
  { key: "UNFIT",    label: "UNFIT",    color: "#a855f7", bg: "#faf5ff",   text: "#6b21a8", group: "absent" },
  { key: "FATIGUE",  label: "FATIGUE",  color: "#f97316", bg: "#fff7ed",   text: "#9a3412", group: "absent" },
];

const GROUPS = [
  { key: "work",   label: "Travail",  color: "#3b82f6", keys: ["ON", "COMMUTING"] },
  { key: "off",    label: "Repos",    color: "#8b5cf6", keys: ["OFF", "LEAVE"] },
  { key: "absent", label: "Absences", color: "#ef4444", keys: ["SICK", "UNFIT", "FATIGUE"] },
];

const MONTHS = [
  { name: "Janvier", short: "Jan", days: 31 }, { name: "Février",   short: "Fév", days: 28 },
  { name: "Mars",    short: "Mar", days: 31 }, { name: "Avril",     short: "Avr", days: 30 },
  { name: "Mai",     short: "Mai", days: 31 }, { name: "Juin",      short: "Jun", days: 30 },
  { name: "Juillet", short: "Jul", days: 31 }, { name: "Août",      short: "Aoû", days: 31 },
  { name: "Septembre",short:"Sep", days: 30 }, { name: "Octobre",   short: "Oct", days: 31 },
  { name: "Novembre",short: "Nov", days: 30 }, { name: "Décembre",  short: "Déc", days: 31 },
];

const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const getDays = (i, y) => i === 1 && isLeap(y) ? 29 : MONTHS[i].days;
const initMonthData = () => Object.fromEntries(STATUSES.map(s => [s.key, ""]));
const initYearData = () => Object.fromEntries(MONTHS.map(m => [m.name, initMonthData()]));

const s = (key) => STATUSES.find(x => x.key === key);

// ─── SMALL COMPONENTS ──────────────────────────────────────────────────────

function Pill({ statusKey, value, small }) {
  const st = s(statusKey);
  if (!st) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      background: st.bg, color: st.text,
      border: `1px solid ${st.color}33`,
      padding: small ? "2px 8px" : "4px 12px",
      borderRadius: "99px", fontSize: small ? "11px" : "13px", fontWeight: 700,
    }}>
      {value !== undefined && <span>{value}</span>}
      <span>{st.label}</span>
    </span>
  );
}

function ProgressBar({ value, max }) {
  const p = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const over = value > max, ok = value === max && max > 0;
  const color = over ? "#ef4444" : ok ? "#10b981" : "#3b82f6";
  return (
    <div style={{ height: "5px", background: "#e2e8f0", borderRadius: "99px", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${p}%`, background: color, borderRadius: "99px", transition: "width 0.4s ease" }} />
    </div>
  );
}

// ─── MONTH ROW ─────────────────────────────────────────────────────────────

function MonthRow({ month, mi, year, values, onChange }) {
  const days = getDays(mi, year);
  const total = STATUSES.reduce((sum, st) => sum + (parseInt(values[st.key]) || 0), 0);
  const over = total > days, ok = total === days && total > 0;

  return (
    <div style={{
      background: "#fff", borderRadius: "16px", padding: "16px 18px",
      border: `1.5px solid ${over ? "#fca5a5" : ok ? "#6ee7b7" : "#e2e8f0"}`,
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)", transition: "border-color 0.3s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: "15px", color: "#1e293b" }}>{month.name}</span>
          <span style={{ marginLeft: "8px", fontSize: "12px", color: "#94a3b8" }}>{days} jours</span>
        </div>
        <span style={{ fontWeight: 900, fontSize: "16px", color: over ? "#ef4444" : ok ? "#10b981" : "#94a3b8" }}>
          {total}<span style={{ fontSize: "11px", fontWeight: 500, color: "#cbd5e1" }}>/{days}</span>
          {ok && " ✓"}{over && " ⚠️"}
        </span>
      </div>
      <div style={{ marginBottom: "12px" }}><ProgressBar value={total} max={days} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
        {STATUSES.map(st => (
          <div key={st.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <label style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.5px", color: st.color, textTransform: "uppercase" }}>{st.label}</label>
            <input
              type="number" inputMode="numeric" min="0" max={days}
              value={values[st.key] ?? ""}
              onChange={e => onChange(month.name, st.key, e.target.value.replace(/\D/, ""))}
              style={{
                width: "100%", height: "42px", border: `2px solid ${st.color}33`,
                borderRadius: "10px", textAlign: "center", fontSize: "17px",
                fontWeight: 800, color: st.text, background: st.bg,
                outline: "none", WebkitAppearance: "none", MozAppearance: "textfield",
              }}
              onFocus={e => { e.target.style.borderColor = st.color; e.target.style.boxShadow = `0 0 0 3px ${st.color}22`; }}
              onBlur={e => { e.target.style.borderColor = `${st.color}33`; e.target.style.boxShadow = "none"; }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SUMMARY TABLE ──────────────────────────────────────────────────────────

function SummaryTable({ data, year }) {
  const v = (m, k) => parseInt(data[m]?.[k]) || 0;
  const mT = (m) => STATUSES.reduce((s, st) => s + v(m, st.key), 0);
  const yT = (k) => MONTHS.reduce((s, m) => s + v(m.name, k), 0);

  return (
    <div style={{ overflowX: "auto", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "680px", background: "#fff" }}>
        <thead>
          <tr style={{ background: "#f8fafc" }}>
            <th style={TH({ left: true, color: "#94a3b8" })}>MOIS</th>
            {STATUSES.map(st => <th key={st.key} style={TH({ color: st.color })}>{st.label}</th>)}
            <th style={TH({ color: "#1e293b" })}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {MONTHS.map((m, i) => {
            const total = mT(m.name), days = getDays(i, year);
            return (
              <tr key={m.name} style={{ borderTop: "1px solid #f1f5f9" }}>
                <td style={TD({ bold: true })}>{m.name} <span style={{ color: "#cbd5e1", fontSize: "11px" }}>({days}j)</span></td>
                {STATUSES.map(st => {
                  const val = v(m.name, st.key);
                  return (
                    <td key={st.key} style={TD({ center: true })}>
                      {val > 0
                        ? <span style={{ background: st.bg, color: st.text, padding: "2px 9px", borderRadius: "99px", fontWeight: 700, fontSize: "12px" }}>{val}</span>
                        : <span style={{ color: "#e2e8f0" }}>—</span>}
                    </td>
                  );
                })}
                <td style={TD({ center: true, bold: true, color: total > days ? "#ef4444" : total === days && total > 0 ? "#10b981" : "#94a3b8" })}>
                  {total > 0 ? total : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: "#f8fafc", borderTop: "2px solid #e2e8f0" }}>
            <td style={TD({ bold: true, color: "#1e293b" })}>TOTAL ANNÉE</td>
            {STATUSES.map(st => (
              <td key={st.key} style={TD({ center: true })}>
                <span style={{ background: st.bg, color: st.color, padding: "3px 10px", borderRadius: "99px", fontWeight: 900, fontSize: "13px" }}>{yT(st.key)}</span>
              </td>
            ))}
            <td style={TD({ center: true, bold: true, color: "#1e293b", fontSize: "16px" })}>
              {STATUSES.reduce((s, st) => s + yT(st.key), 0)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

const TH = ({ left, color } = {}) => ({
  padding: "12px 10px", fontSize: "11px", fontWeight: 800,
  textTransform: "uppercase", letterSpacing: "0.7px",
  textAlign: left ? "left" : "center", color: color || "#94a3b8",
});
const TD = ({ center, bold, color, fontSize } = {}) => ({
  padding: "10px 10px", fontSize: fontSize || "13px",
  textAlign: center ? "center" : "left",
  fontWeight: bold ? 700 : 400,
  color: color || "#64748b",
});

// ─── CHARTS ────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
      <p style={{ fontWeight: 700, color: "#1e293b", marginBottom: "6px", fontSize: "13px" }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ fontSize: "12px", color: p.fill, fontWeight: 600 }}>
          {p.name}: <span style={{ color: "#1e293b" }}>{p.value}j</span>
        </p>
      ))}
    </div>
  );
};

function Charts({ allData, years }) {
  const v = (yearData, m, k) => parseInt(yearData?.[m]?.[k]) || 0;

  const groupVal = (yearData, monthName, groupKey) => {
    const g = GROUPS.find(x => x.key === groupKey);
    return g.keys.reduce((s, k) => s + v(yearData, monthName, k), 0);
  };

  // Per-year per-month data
  const monthlyData = (year) => MONTHS.map((m, i) => ({
    name: m.short,
    Travail: groupVal(allData[year], m.name, "work"),
    Repos: groupVal(allData[year], m.name, "off"),
    Absences: groupVal(allData[year], m.name, "absent"),
  }));

  // All-years global
  const globalData = years.map(year => ({
    name: String(year),
    Travail: MONTHS.reduce((s, m) => s + groupVal(allData[year], m.name, "work"), 0),
    Repos: MONTHS.reduce((s, m) => s + groupVal(allData[year], m.name, "off"), 0),
    Absences: MONTHS.reduce((s, m) => s + groupVal(allData[year], m.name, "absent"), 0),
  }));

  const COLORS = { Travail: "#3b82f6", Repos: "#8b5cf6", Absences: "#ef4444" };

  const ChartCard = ({ title, subtitle, children }) => (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "20px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ marginBottom: "16px" }}>
        <h3 style={{ fontWeight: 800, fontSize: "15px", color: "#1e293b" }}>{title}</h3>
        {subtitle && <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Global all years */}
      <ChartCard title="Vue globale — toutes années" subtitle="Travail · Repos · Absences">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={globalData} barGap={4}>
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#cbd5e1" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
            {Object.entries(COLORS).map(([name, color]) => (
              <Bar key={name} dataKey={name} fill={color} radius={[5, 5, 0, 0]} maxBarSize={40} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Per year per month */}
      {years.filter(y => allData[y]).map(year => (
        <ChartCard key={year} title={`${year} — par mois`} subtitle="Jours travaillés · repos · absences">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData(year)} barGap={2}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#cbd5e1" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
              {Object.entries(COLORS).map(([name, color]) => (
                <Bar key={name} dataKey={name} fill={color} radius={[4, 4, 0, 0]} maxBarSize={22} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      ))}
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────

export default function App() {
  const currentYear = new Date().getFullYear();
  const [years, setYears] = useState([2024, 2025, 2026]);
  const [year, setYear] = useState(2026);
  const [tab, setTab] = useState("saisie");
  const [allData, setAllData] = useState({});
  const [syncStatus, setSyncStatus] = useState("loading"); // loading | synced | saving | error

  // ── Firestore real-time listener ──
  useEffect(() => {
    setSyncStatus("loading");
    const ref = doc(db, "users", USER_ID);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setAllData(d.allData || {});
        if (d.years) setYears(d.years);
      }
      setSyncStatus("synced");
    }, () => setSyncStatus("error"));
    return () => unsub();
  }, []);

  // ── Save to Firestore (debounced) ──
  const saveTimeout = useCallback(() => {
    let t;
    return (data, yrs) => {
      clearTimeout(t);
      setSyncStatus("saving");
      t = setTimeout(async () => {
        try {
          await setDoc(doc(db, "users", USER_ID), { allData: data, years: yrs });
          setSyncStatus("synced");
        } catch { setSyncStatus("error"); }
      }, 800);
    };
  }, [])();

  const onChange = (month, key, val) => {
    const updated = {
      ...allData,
      [year]: {
        ...(allData[year] || initYearData()),
        [month]: { ...(allData[year]?.[month] || initMonthData()), [key]: val }
      }
    };
    setAllData(updated);
    saveTimeout(updated, years);
  };

  const addYear = () => {
    const next = Math.max(...years) + 1;
    const newYears = [...years, next];
    setYears(newYears);
    setYear(next);
    saveTimeout(allData, newYears);
  };

  const reset = () => {
    if (!window.confirm(`Effacer toutes les données de ${year} ?`)) return;
    const updated = { ...allData, [year]: initYearData() };
    setAllData(updated);
    saveTimeout(updated, years);
  };

  const data = allData[year] || initYearData();

  const TABS = [
    { k: "saisie",  l: "✏️ Saisie" },
    { k: "tableau", l: "📋 Tableau" },
    { k: "charts",  l: "📊 Graphiques" },
  ];

  const syncInfo = {
    loading: { label: "Chargement...", color: "#f59e0b", bg: "#fffbeb" },
    saving:  { label: "Sauvegarde...", color: "#3b82f6", bg: "#eff6ff" },
    synced:  { label: "✓ Synchronisé", color: "#10b981", bg: "#f0fdf4" },
    error:   { label: "⚠ Erreur sync", color: "#ef4444", bg: "#fef2f2" },
  }[syncStatus];

  return (
    <div style={{ background: "#f1f5f9", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* HEADER */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "14px 16px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "24px" }}>📋</span>
            <div>
              <h1 style={{ fontSize: "17px", fontWeight: 900, color: "#1e293b" }}>Suivi Présence</h1>
              <p style={{ fontSize: "11px", color: "#94a3b8" }}>Sync Firebase · Multi-appareils</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {/* Year buttons */}
            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
              {years.map(y => (
                <button key={y} onClick={() => setYear(y)} style={{
                  padding: "5px 11px", borderRadius: "8px", border: `1.5px solid ${year === y ? "#3b82f6" : "#e2e8f0"}`,
                  background: year === y ? "#eff6ff" : "#fff",
                  color: year === y ? "#2563eb" : "#94a3b8",
                  fontWeight: 700, fontSize: "13px", cursor: "pointer",
                }}>{y}</button>
              ))}
              <button onClick={addYear} style={{ padding: "5px 9px", borderRadius: "8px", border: "1.5px dashed #cbd5e1", background: "#fff", color: "#94a3b8", fontWeight: 700, fontSize: "13px", cursor: "pointer" }} title="Ajouter une année">＋</button>
            </div>
            {/* Sync badge */}
            <div style={{ padding: "4px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 600, background: syncInfo.bg, color: syncInfo.color, border: `1px solid ${syncInfo.color}33` }}>
              {syncInfo.label}
            </div>
            <button onClick={reset} style={{ padding: "5px 10px", borderRadius: "8px", border: "1px solid #fecaca", background: "#fef2f2", color: "#ef4444", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>🗑 Reset {year}</button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "14px 16px 60px" }}>
        {/* Status pills legend */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
          {STATUSES.map(st => <Pill key={st.key} statusKey={st.key} small />)}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", background: "#e2e8f0", padding: "4px", borderRadius: "12px", width: "fit-content", marginBottom: "16px" }}>
          {TABS.map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{
              padding: "7px 16px", borderRadius: "9px", border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: "13px", transition: "all 0.2s",
              background: tab === t.k ? "#fff" : "transparent",
              color: tab === t.k ? "#1e293b" : "#94a3b8",
              boxShadow: tab === t.k ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            }}>{t.l}</button>
          ))}
        </div>

        {syncStatus === "loading"
          ? <div style={{ textAlign: "center", padding: "60px", color: "#94a3b8", fontSize: "14px" }}>⏳ Chargement des données...</div>
          : <>
            {tab === "saisie" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {MONTHS.map((m, i) => <MonthRow key={m.name} month={m} mi={i} year={year} values={data[m.name] || {}} onChange={onChange} />)}
              </div>
            )}
            {tab === "tableau" && <SummaryTable data={data} year={year} />}
            {tab === "charts" && <Charts allData={allData} years={years} />}
          </>
        }
      </div>
    </div>
  );
}