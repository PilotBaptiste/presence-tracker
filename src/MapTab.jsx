import { useState, useEffect, useRef } from "react";

const BASES_CONFIG = {
  FAO: { color: "#f59e0b", label: "Faro" },
  MXP: { color: "#3b82f6", label: "Milan Malpensa" },
  BOD: { color: "#10b981", label: "Bordeaux" },
};

const INITIAL_ROUTES = {
  FAO: ["LGW","BRS","GLA","BSL","GVA","AMS","ORY","MAN","LYS"],
  MXP: ["LGW","CDG","BCN","AGP","RBA","BDS","IBZ","PMI","CAG","OLB","BRI","PRG","AMS","ATH","EFL","ZTH","JMK","CTA","PMO","ZAD","OPO","LIS","LCG","HAM","STR","NAP","QSR"],
  BOD: ["MRS","LYS","NCE","OPO","RAK","RBA","ESU","LIL","BRU","LGW","FCO","BUD","PRG","VIE","EDI"],
};

const KNOWN = {
  BOD:{city:"Bordeaux",country:"FR",lat:44.8283,lon:-0.7156},
  MRS:{city:"Marseille",country:"FR",lat:43.4393,lon:5.2214},
  NCE:{city:"Nice",country:"FR",lat:43.6584,lon:7.2159},
  LYS:{city:"Lyon",country:"FR",lat:45.7256,lon:5.0811},
  CDG:{city:"Paris CDG",country:"FR",lat:49.0097,lon:2.5478},
  ORY:{city:"Paris Orly",country:"FR",lat:48.7233,lon:2.3794},
  TLS:{city:"Toulouse",country:"FR",lat:43.6293,lon:1.3638},
  NTE:{city:"Nantes",country:"FR",lat:47.1532,lon:-1.6108},
  BIQ:{city:"Biarritz",country:"FR",lat:43.4683,lon:-1.5231},
  MPL:{city:"Montpellier",country:"FR",lat:43.5762,lon:3.9630},
  LIL:{city:"Lille",country:"FR",lat:50.5636,lon:3.0894},
  SXB:{city:"Strasbourg",country:"FR",lat:48.5383,lon:7.6283},
  GNB:{city:"Grenoble",country:"FR",lat:45.3629,lon:5.3294},
  AJA:{city:"Ajaccio",country:"FR",lat:41.9236,lon:8.8029},
  BIA:{city:"Bastia",country:"FR",lat:42.5527,lon:9.4837},
  CLY:{city:"Calvi",country:"FR",lat:42.5244,lon:8.7931},
  FSC:{city:"Figari",country:"FR",lat:41.5006,lon:9.0978},
  RNS:{city:"Rennes",country:"FR",lat:48.0695,lon:-1.7348},
  BES:{city:"Brest",country:"FR",lat:48.4479,lon:-4.4186},
  LRH:{city:"La Rochelle",country:"FR",lat:46.1792,lon:-1.1953},
  CMF:{city:"Chambéry",country:"FR",lat:45.6381,lon:5.8802},
  ETZ:{city:"Metz-Nancy",country:"FR",lat:48.9821,lon:6.2514},
  LGW:{city:"London Gatwick",country:"GB",lat:51.1481,lon:-0.1903},
  LHR:{city:"London Heathrow",country:"GB",lat:51.4775,lon:-0.4614},
  LTN:{city:"London Luton",country:"GB",lat:51.8747,lon:-0.3683},
  STN:{city:"London Stansted",country:"GB",lat:51.8850,lon:0.2350},
  MAN:{city:"Manchester",country:"GB",lat:53.3537,lon:-2.2750},
  EDI:{city:"Edinburgh",country:"GB",lat:55.9500,lon:-3.3725},
  BRS:{city:"Bristol",country:"GB",lat:51.3827,lon:-2.7191},
  BHX:{city:"Birmingham",country:"GB",lat:52.4539,lon:-1.7480},
  GLA:{city:"Glasgow",country:"GB",lat:55.8719,lon:-4.4331},
  JER:{city:"Jersey",country:"GB",lat:49.2079,lon:-2.1955},
  BCN:{city:"Barcelone",country:"ES",lat:41.2971,lon:2.0785},
  MAD:{city:"Madrid",country:"ES",lat:40.4936,lon:-3.5668},
  PMI:{city:"Palma",country:"ES",lat:39.5517,lon:2.7388},
  AGP:{city:"Málaga",country:"ES",lat:36.6749,lon:-4.4991},
  ALC:{city:"Alicante",country:"ES",lat:38.2822,lon:-0.5582},
  VLC:{city:"Valencia",country:"ES",lat:39.4893,lon:-0.4816},
  SVQ:{city:"Séville",country:"ES",lat:37.4180,lon:-5.8931},
  IBZ:{city:"Ibiza",country:"ES",lat:38.8729,lon:1.3731},
  TFS:{city:"Tenerife Sud",country:"ES",lat:28.0445,lon:-16.5725},
  LPA:{city:"Gran Canaria",country:"ES",lat:27.9319,lon:-15.3866},
  FUE:{city:"Fuerteventura",country:"ES",lat:28.4527,lon:-13.8638},
  ACE:{city:"Lanzarote",country:"ES",lat:28.9455,lon:-13.6052},
  MAH:{city:"Minorque",country:"ES",lat:39.8626,lon:4.2186},
  BIO:{city:"Bilbao",country:"ES",lat:43.3011,lon:-2.9106},
  LCG:{city:"La Corogne",country:"ES",lat:43.3021,lon:-8.3776},
  FCO:{city:"Rome",country:"IT",lat:41.8003,lon:12.2389},
  MXP:{city:"Milan Malpensa",country:"IT",lat:45.6306,lon:8.7281},
  LIN:{city:"Milan Linate",country:"IT",lat:45.4453,lon:9.2767},
  VCE:{city:"Venise",country:"IT",lat:45.5053,lon:12.3519},
  NAP:{city:"Naples",country:"IT",lat:40.8860,lon:14.2908},
  CTA:{city:"Catane",country:"IT",lat:37.4668,lon:15.0664},
  PSA:{city:"Pise",country:"IT",lat:43.6839,lon:10.3927},
  BLQ:{city:"Bologne",country:"IT",lat:44.5354,lon:11.2887},
  PMO:{city:"Palerme",country:"IT",lat:38.1759,lon:13.0910},
  TRN:{city:"Turin",country:"IT",lat:45.2008,lon:7.6497},
  FLR:{city:"Florence",country:"IT",lat:43.8100,lon:11.2051},
  CAG:{city:"Cagliari",country:"IT",lat:39.2515,lon:9.0543},
  OLB:{city:"Olbia",country:"IT",lat:40.8987,lon:9.5176},
  SUF:{city:"Lamezia Terme",country:"IT",lat:38.9054,lon:16.2423},
  BDS:{city:"Brindisi",country:"IT",lat:40.6576,lon:17.9470},
  BRI:{city:"Bari",country:"IT",lat:41.1389,lon:16.7606},
  QSR:{city:"Salerne",country:"IT",lat:40.6204,lon:14.9113},
  BER:{city:"Berlin",country:"DE",lat:52.3667,lon:13.5033},
  MUC:{city:"Munich",country:"DE",lat:48.3538,lon:11.7861},
  FRA:{city:"Francfort",country:"DE",lat:50.0379,lon:8.5622},
  DUS:{city:"Düsseldorf",country:"DE",lat:51.2895,lon:6.7668},
  HAM:{city:"Hambourg",country:"DE",lat:53.6304,lon:9.9882},
  STR:{city:"Stuttgart",country:"DE",lat:48.6900,lon:9.2217},
  GVA:{city:"Genève",country:"CH",lat:46.2380,lon:6.1089},
  ZRH:{city:"Zurich",country:"CH",lat:47.4647,lon:8.5492},
  BSL:{city:"Bâle-Mulhouse",country:"CH",lat:47.5896,lon:7.5299},
  AMS:{city:"Amsterdam",country:"NL",lat:52.3086,lon:4.7639},
  BRU:{city:"Bruxelles",country:"BE",lat:50.9014,lon:4.4844},
  CRL:{city:"Charleroi",country:"BE",lat:50.4592,lon:4.4538},
  LIS:{city:"Lisbonne",country:"PT",lat:38.7813,lon:-9.1359},
  OPO:{city:"Porto",country:"PT",lat:41.2481,lon:-8.6814},
  FAO:{city:"Faro",country:"PT",lat:37.0144,lon:-7.9659},
  FNC:{city:"Madère",country:"PT",lat:32.6979,lon:-16.7745},
  ATH:{city:"Athènes",country:"GR",lat:37.9364,lon:23.9445},
  HER:{city:"Héraklion",country:"GR",lat:35.3397,lon:25.1803},
  CFU:{city:"Corfou",country:"GR",lat:39.6019,lon:19.9117},
  RHO:{city:"Rhodes",country:"GR",lat:36.4054,lon:28.0862},
  MYK:{city:"Mykonos",country:"GR",lat:37.4350,lon:25.3481},
  JMK:{city:"Mykonos",country:"GR",lat:37.4350,lon:25.3481},
  JTR:{city:"Santorin",country:"GR",lat:36.3992,lon:25.4793},
  CHQ:{city:"Chania",country:"GR",lat:35.5317,lon:24.1497},
  KGS:{city:"Kos",country:"GR",lat:36.7933,lon:27.0917},
  ZTH:{city:"Zakynthos",country:"GR",lat:37.7509,lon:20.8843},
  SKG:{city:"Thessalonique",country:"GR",lat:40.5197,lon:22.9709},
  EFL:{city:"Céphalonie",country:"GR",lat:38.1200,lon:20.5005},
  VIE:{city:"Vienne",country:"AT",lat:48.1103,lon:16.5697},
  PRG:{city:"Prague",country:"CZ",lat:50.1008,lon:14.2600},
  BUD:{city:"Budapest",country:"HU",lat:47.4298,lon:19.2611},
  WAW:{city:"Varsovie",country:"PL",lat:52.1657,lon:20.9671},
  CPH:{city:"Copenhague",country:"DK",lat:55.6180,lon:12.6560},
  ARN:{city:"Stockholm",country:"SE",lat:59.6519,lon:17.9186},
  OSL:{city:"Oslo",country:"NO",lat:60.1939,lon:11.1004},
  HEL:{city:"Helsinki",country:"FI",lat:60.3172,lon:24.9633},
  DUB:{city:"Dublin",country:"IE",lat:53.4213,lon:-6.2701},
  IST:{city:"Istanbul",country:"TR",lat:41.2608,lon:28.7418},
  AYT:{city:"Antalya",country:"TR",lat:36.8987,lon:30.8003},
  DLM:{city:"Dalaman",country:"TR",lat:36.7131,lon:28.7925},
  BJV:{city:"Bodrum",country:"TR",lat:37.2506,lon:27.6644},
  CMN:{city:"Casablanca",country:"MA",lat:33.3675,lon:-7.5898},
  RAK:{city:"Marrakech",country:"MA",lat:31.6069,lon:-8.0363},
  AGA:{city:"Agadir",country:"MA",lat:30.3250,lon:-9.4131},
  FEZ:{city:"Fès",country:"MA",lat:33.9273,lon:-4.9778},
  TNG:{city:"Tanger",country:"MA",lat:35.7269,lon:-5.9168},
  ESU:{city:"Essaouira",country:"MA",lat:31.3975,lon:-9.6817},
  RBA:{city:"Rabat",country:"MA",lat:34.0510,lon:-6.7752},
  TUN:{city:"Tunis",country:"TN",lat:36.8510,lon:10.2272},
  DJE:{city:"Djerba",country:"TN",lat:33.8750,lon:10.7755},
  HRG:{city:"Hurghada",country:"EG",lat:27.1783,lon:33.7994},
  SSH:{city:"Sharm el-Sheikh",country:"EG",lat:27.9773,lon:34.3950},
  TLV:{city:"Tel Aviv",country:"IL",lat:32.0114,lon:34.8867},
  ETH:{city:"Eilat",country:"IL",lat:29.5613,lon:34.9600},
  DBV:{city:"Dubrovnik",country:"HR",lat:42.5614,lon:18.2681},
  SPU:{city:"Split",country:"HR",lat:43.5389,lon:16.2980},
  ZAD:{city:"Zadar",country:"HR",lat:44.1083,lon:15.2467},
  LCA:{city:"Larnaca",country:"CY",lat:34.8751,lon:33.6249},
  MLA:{city:"Malte",country:"MT",lat:35.8575,lon:14.4775},
  KEF:{city:"Reykjavik",country:"IS",lat:63.9850,lon:-22.6056},
  OTP:{city:"Bucarest",country:"RO",lat:44.5711,lon:26.0858},
  SOF:{city:"Sofia",country:"BG",lat:42.6967,lon:23.4114},
  BEG:{city:"Belgrade",country:"RS",lat:44.8184,lon:20.3091},
  DXB:{city:"Dubaï",country:"AE",lat:25.2528,lon:55.3644},
  LUX:{city:"Luxembourg",country:"LU",lat:49.6233,lon:6.2044},
};

const parseTime = (str) => {
  if (!str) return 0;
  const s = String(str).trim();
  const c = s.match(/^(\d+):(\d{1,2})$/); if (c) return parseInt(c[1])*60+parseInt(c[2]);
  const h = s.match(/^(\d+)h(\d{0,2})$/i); if (h) return parseInt(h[1])*60+(h[2]?parseInt(h[2]):0);
  return 0;
};
const fmtTime = (m) => `${Math.floor(m/60)}h${String(m%60).padStart(2,"0")}`;
const fmtNum  = (n,d=0) => n.toLocaleString("fr-FR",{maximumFractionDigits:d});
const card    = (e={}) => ({background:"#fff",borderRadius:"16px",border:"1px solid #e2e8f0",boxShadow:"0 1px 3px rgba(0,0,0,0.06)",...e});

const bezierCurve = (p0, p1) => {
  const steps = 40;
  const mid = [(p0[0]+p1[0])/2, (p0[1]+p1[1])/2];
  const dx = p1[0]-p0[0], dy = p1[1]-p0[1];
  const ctrl = [mid[0] - dy*0.2, mid[1] + dx*0.2];
  const pts = [];
  for (let i=0; i<=steps; i++) {
    const t = i/steps;
    pts.push([
      (1-t)**2*p0[0] + 2*(1-t)*t*ctrl[0] + t**2*p1[0],
      (1-t)**2*p0[1] + 2*(1-t)*t*ctrl[1] + t**2*p1[1],
    ]);
  }
  return pts;
};

export default function MapTab({ allData, years, editMode, onSaveAirports, airportData }) {
  const mapRef    = useRef(null);
  const leafRef   = useRef(null);
  const layersRef = useRef([]);

  // Routes par base : { FAO: [{code, count}], MXP: [...], BOD: [...] }
  const initRoutes = (saved) => {
    if (saved?.routes) return saved.routes;
    return Object.fromEntries(
      Object.entries(INITIAL_ROUTES).map(([base, codes]) => [
        base, codes.map(c => ({ code: c, count: 1 }))
      ])
    );
  };

  // Comptage atterrissages (champ texte séparé pour les aéros hors base)
  const initLandings = (saved) => saved?.landings || "";

  const [routes,   setRoutes]   = useState(() => initRoutes(airportData));
  const [landings, setLandings] = useState(() => initLandings(airportData));
  const [activeBase, setActiveBase] = useState("all");
  const [editBase,   setEditBase]   = useState(null); // base en cours d'édition
  const [newCode,    setNewCode]    = useState("");
  const [newCount,   setNewCount]   = useState(1);
  const [co2Year,    setCo2Year]    = useState(years[years.length-1]);

  // Parse landings "BOD:45 MRS:32" pour le top destinations
  const parseLandings = (str) => {
    const result = {};
    const matches = (str||"").toUpperCase().matchAll(/([A-Z]{3})(?::(\d+))?/g);
    for (const m of matches) {
      const code=m[1], count=parseInt(m[2])||1;
      if (KNOWN[code]) result[code]=(result[code]||0)+count;
    }
    return result;
  };

  const landingCounts = parseLandings(landings);

  // Tous les aéroports visités (bases + destinations)
  const allCodes = [...new Set([
    ...Object.keys(BASES_CONFIG),
    ...Object.values(routes).flat().map(r=>r.code),
  ])].filter(c=>KNOWN[c]);

  // Init map
  useEffect(() => {
    if (leafRef.current || !mapRef.current) return;
    const L = window.L; if (!L) return;
    const map = L.map(mapRef.current, { center:[45,15], zoom:4, zoomControl:true, attributionControl:false });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
        }).addTo(map);
    leafRef.current = map;
    renderMap(map, routes, activeBase);
    return () => { try { map.remove(); } catch(e){} leafRef.current=null; };
  }, []);

  useEffect(() => {
    if (leafRef.current) renderMap(leafRef.current, routes, activeBase);
  }, [routes, activeBase]);

  const clearLayers = (map) => {
    layersRef.current.forEach(l=>{ try{map.removeLayer(l);}catch(e){} });
    layersRef.current=[];
  };

  const renderMap = (map, rts, base) => {
    const L = window.L;
    clearLayers(map);
    const basesToShow = base==="all" ? Object.keys(BASES_CONFIG) : [base];

    // Lignes d'abord
    basesToShow.forEach(b => {
      const baseAp = KNOWN[b]; if (!baseAp) return;
      const color  = BASES_CONFIG[b].color;
      (rts[b]||[]).forEach(({code}) => {
        const ap = KNOWN[code]; if (!ap) return;
        const pts = bezierCurve([baseAp.lat,baseAp.lon],[ap.lat,ap.lon]);
        const line = L.polyline(pts, { color, weight:1.5, opacity:0.55 }).addTo(map);
        layersRef.current.push(line);
      });
    });

    // Marqueurs des destinations
    const shownCodes = new Set();
    basesToShow.forEach(b => {
      (rts[b]||[]).forEach(({code}) => shownCodes.add(code));
      shownCodes.add(b);
    });

    shownCodes.forEach(code => {
      const ap = KNOWN[code]; if (!ap) return;
      const isBase = !!BASES_CONFIG[code];
      const baseColor = BASES_CONFIG[code]?.color;

      // Couleur du point : si dest de plusieurs bases, on mélange
      const basesForCode = Object.entries(rts).filter(([b,list])=>list.some(r=>r.code===code)).map(([b])=>b);
      const dotColor = isBase ? baseColor : (basesForCode.length===1 ? BASES_CONFIG[basesForCode[0]]?.color : "#94a3b8");
      const size = isBase ? 16 : 9;

      const icon = L.divIcon({
        className:"",
        html:`<div style="width:${size}px;height:${size}px;background:${dotColor||"#60a5fa"};border:${isBase?"2.5px solid #fff":"1.5px solid rgba(255,255,255,0.5)"};border-radius:50%;box-shadow:0 0 ${isBase?12:6}px ${dotColor||"#3b82f6"}88;"></div>`,
        iconSize:[size,size], iconAnchor:[size/2,size/2],
      });

      const blist = basesForCode.map(b=>`<span style="color:${BASES_CONFIG[b].color};font-weight:800">${b}</span>`).join(", ");
      const marker = L.marker([ap.lat,ap.lon],{icon}).addTo(map).bindPopup(`
        <div style="font-family:system-ui;padding:4px;min-width:130px">
          <div style="font-size:15px;font-weight:900;color:#1e293b">${code}${isBase?" 🏠":""}</div>
          <div style="font-size:12px;color:#64748b;margin-top:1px">${ap.city}, ${ap.country}</div>
          ${!isBase&&basesForCode.length>0?`<div style="margin-top:5px;font-size:11px">Depuis : ${blist}</div>`:""}
          ${landingCounts[code]?`<div style="margin-top:5px;background:#eff6ff;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:700;color:#1d4ed8;display:inline-block">${landingCounts[code]} atterrissages</div>`:""}
        </div>`);
      layersRef.current.push(marker);
    });
  };

  // Ajouter une destination à une base
  const addDestination = (base) => {
    const code = newCode.toUpperCase().trim();
    if (!code || !KNOWN[code]) return;
    const existing = routes[base]?.find(r=>r.code===code);
    const updated = {
      ...routes,
      [base]: existing
        ? routes[base].map(r=>r.code===code?{...r,count:r.count+newCount}:r)
        : [...(routes[base]||[]), {code, count:newCount}],
    };
    setRoutes(updated);
    setNewCode(""); setNewCount(1);
    onSaveAirports({ routes:updated, landings });
  };

  // Supprimer une destination
  const removeDestination = (base, code) => {
    const updated = { ...routes, [base]: routes[base].filter(r=>r.code!==code) };
    setRoutes(updated);
    onSaveAirports({ routes:updated, landings });
  };

  // Modifier le count d'une destination
  const updateCount = (base, code, count) => {
    const updated = { ...routes, [base]: routes[base].map(r=>r.code===code?{...r,count:parseInt(count)||1}:r) };
    setRoutes(updated);
    onSaveAirports({ routes:updated, landings });
  };

  // Top destinations (toutes bases confondues, dédupliqué)
  const destCounts = {};
  Object.values(routes).flat().forEach(({code,count}) => {
    destCounts[code]=(destCounts[code]||0)+count;
  });
  // Override avec landings si renseigné
  Object.entries(landingCounts).forEach(([code,count])=>{ destCounts[code]=count; });
  const sorted = Object.entries(destCounts).sort((a,b)=>b[1]-a[1]).slice(0,15);
  const countries = [...new Set(allCodes.map(c=>KNOWN[c]?.country).filter(Boolean))];
  const totalLandings = Object.values(destCounts).reduce((s,v)=>s+v,0);

  // CO2
  const getYearMins = (y) => Object.values(allData[y]||{}).reduce((s,m)=>s+parseTime(m?.flightTime),0);
  const co2s = (mins) => { const h=mins/60,fuel=h*2250,co2T=(fuel*3.16)/1000; return{fuelKg:fuel,fuelL:fuel/0.8,co2TotalTon:co2T,co2PerPaxTon:co2T/(180*0.925),distKm:h*820}; };
  const yMins=getYearMins(co2Year), tMins=years.reduce((s,y)=>s+getYearMins(y),0);
  const yC=co2s(yMins), tC=co2s(tMins);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>

      {/* ── CARTE ── */}
      <div style={{...card(),overflow:"hidden"}}>
        <div style={{padding:"14px 18px",background:"#0f172a",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"8px"}}>
          <div>
            <h3 style={{fontWeight:800,fontSize:"15px",color:"#f1f5f9"}}>🗺 Mes routes</h3>
            <p style={{fontSize:"12px",color:"#475569",marginTop:"2px"}}>{allCodes.length} aéroports · {countries.length} pays</p>
          </div>
          <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
            {[{k:"all",label:"Toutes",color:"#94a3b8"},...Object.entries(BASES_CONFIG).map(([k,v])=>({k,label:`${k} — ${v.label}`,color:v.color}))].map(b=>(
              <button key={b.k} onClick={()=>setActiveBase(b.k)} style={{padding:"5px 11px",borderRadius:"8px",border:`1.5px solid ${activeBase===b.k?b.color:"#334155"}`,background:activeBase===b.k?b.color+"22":"#1e293b",color:activeBase===b.k?b.color:"#475569",fontWeight:700,fontSize:"11px",cursor:"pointer",transition:"all 0.2s"}}>
                {b.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{background:"#0f172a",padding:"6px 18px",display:"flex",gap:"14px",flexWrap:"wrap"}}>
          {Object.entries(BASES_CONFIG).map(([code,b])=>(
            <div key={code} style={{display:"flex",alignItems:"center",gap:"6px"}}>
              <div style={{width:"10px",height:"10px",borderRadius:"50%",background:b.color,boxShadow:`0 0 6px ${b.color}`}}/>
              <span style={{fontSize:"11px",fontWeight:700,color:b.color}}>🏠 {code}</span>
            </div>
          ))}
        </div>
        <div ref={mapRef} style={{height:"460px",width:"100%",background:"#0f172a"}}/>
      </div>

      {/* ── GESTION ROUTES ── */}
      {editMode && (
        <div style={card({padding:"20px"})}>
          <h3 style={{fontWeight:800,fontSize:"15px",color:"#1e293b",marginBottom:"14px"}}>✏️ Gérer les routes par base</h3>
          <div style={{display:"flex",gap:"8px",marginBottom:"16px",flexWrap:"wrap"}}>
            {Object.entries(BASES_CONFIG).map(([base,b])=>(
              <button key={base} onClick={()=>setEditBase(editBase===base?null:base)}
                style={{padding:"7px 16px",borderRadius:"10px",border:`2px solid ${editBase===base?b.color:"#e2e8f0"}`,background:editBase===base?b.color+"15":"#f8fafc",color:editBase===base?b.color:"#64748b",fontWeight:700,fontSize:"13px",cursor:"pointer",transition:"all 0.2s"}}>
                🏠 {base} — {b.label} <span style={{background:editBase===base?b.color:"#e2e8f0",color:editBase===base?"#fff":"#94a3b8",padding:"1px 7px",borderRadius:"99px",fontSize:"11px",marginLeft:"4px"}}>{routes[base]?.length||0}</span>
              </button>
            ))}
          </div>

          {editBase && (
            <div style={{background:"#f8fafc",borderRadius:"12px",padding:"16px",border:`1.5px solid ${BASES_CONFIG[editBase].color}44`}}>
              <div style={{fontWeight:800,fontSize:"13px",color:BASES_CONFIG[editBase].color,marginBottom:"12px"}}>
                Routes depuis {editBase} — {BASES_CONFIG[editBase].label}
              </div>

              {/* Ajouter */}
              <div style={{display:"flex",gap:"8px",marginBottom:"14px",flexWrap:"wrap"}}>
                <input value={newCode} onChange={e=>setNewCode(e.target.value.toUpperCase().slice(0,3))} placeholder="Code IATA" maxLength={3}
                  style={{width:"90px",padding:"8px 10px",borderRadius:"8px",border:"2px solid #e2e8f0",fontFamily:"monospace",fontWeight:700,fontSize:"14px",outline:"none",textTransform:"uppercase"}}
                  onFocus={e=>e.target.style.borderColor=BASES_CONFIG[editBase].color} onBlur={e=>e.target.style.borderColor="#e2e8f0"}
                />
                <input type="number" value={newCount} onChange={e=>setNewCount(parseInt(e.target.value)||1)} min={1} placeholder="Nb"
                  style={{width:"70px",padding:"8px 10px",borderRadius:"8px",border:"2px solid #e2e8f0",fontWeight:700,fontSize:"14px",outline:"none",textAlign:"center",WebkitAppearance:"none"}}
                />
                <span style={{alignSelf:"center",fontSize:"12px",color:"#94a3b8"}}>atterrissage{newCount>1?"s":""}</span>
                <button onClick={()=>addDestination(editBase)}
                  disabled={!newCode||newCode.length<3||!KNOWN[newCode.toUpperCase()]}
                  style={{padding:"8px 16px",borderRadius:"8px",border:"none",background:newCode.length===3&&KNOWN[newCode.toUpperCase()]?BASES_CONFIG[editBase].color:"#e2e8f0",color:newCode.length===3&&KNOWN[newCode.toUpperCase()]?"#fff":"#94a3b8",fontWeight:700,fontSize:"13px",cursor:"pointer"}}>
                  + Ajouter
                </button>
                {newCode.length===3 && !KNOWN[newCode.toUpperCase()] && (
                  <span style={{alignSelf:"center",fontSize:"11px",color:"#dc2626"}}>Code inconnu</span>
                )}
                {newCode.length===3 && KNOWN[newCode.toUpperCase()] && (
                  <span style={{alignSelf:"center",fontSize:"11px",color:"#16a34a",fontWeight:600}}>✓ {KNOWN[newCode.toUpperCase()]?.city}</span>
                )}
              </div>

              {/* Liste destinations */}
              <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                {(routes[editBase]||[]).map(({code,count})=>(
                  <div key={code} style={{display:"flex",alignItems:"center",gap:"4px",background:"#fff",border:`1px solid ${BASES_CONFIG[editBase].color}44`,borderRadius:"8px",padding:"4px 8px"}}>
                    <span style={{fontWeight:800,fontSize:"12px",color:BASES_CONFIG[editBase].color}}>{code}</span>
                    <span style={{fontSize:"11px",color:"#94a3b8"}}>{KNOWN[code]?.city}</span>
                    <input type="number" value={count} min={1}
                      onChange={e=>updateCount(editBase,code,e.target.value)}
                      style={{width:"42px",padding:"1px 4px",borderRadius:"5px",border:"1px solid #e2e8f0",fontWeight:700,fontSize:"12px",textAlign:"center",WebkitAppearance:"none"}}
                    />
                    <button onClick={()=>removeDestination(editBase,code)}
                      style={{background:"none",border:"none",color:"#fca5a5",cursor:"pointer",fontSize:"14px",lineHeight:1,padding:"0 2px"}}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TOP DESTINATIONS ── */}
      {sorted.length>0&&(
        <div style={card({padding:"20px"})}>
          <h3 style={{fontWeight:800,fontSize:"15px",color:"#1e293b",marginBottom:"4px"}}>🏆 Top destinations</h3>
          <p style={{fontSize:"12px",color:"#94a3b8",marginBottom:"14px"}}>{totalLandings} atterrissages au total · {Object.keys(destCounts).length} destinations</p>
          <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
            {sorted.map(([code,count],i)=>{
              const ap=KNOWN[code], max=sorted[0][1], medals=["🥇","🥈","🥉"];
              const basesForCode=Object.entries(routes).filter(([,list])=>list.some(r=>r.code===code)).map(([b])=>b);
              const mainBase=basesForCode[0];
              const barColor=mainBase?BASES_CONFIG[mainBase]?.color:`hsl(${220-i*10},70%,55%)`;
              return(
                <div key={code} style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{fontSize:"13px",width:"22px",textAlign:"center",flexShrink:0}}>{medals[i]||`${i+1}.`}</span>
                  <span style={{background:mainBase?`${BASES_CONFIG[mainBase].color}18`:"#eff6ff",color:mainBase?BASES_CONFIG[mainBase].color:"#1d4ed8",padding:"2px 7px",borderRadius:"6px",fontWeight:800,fontSize:"12px",width:"36px",textAlign:"center",border:`1px solid ${mainBase?BASES_CONFIG[mainBase].color+"33":"#bfdbfe"}`,flexShrink:0}}>{code}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
                      <span style={{fontSize:"13px",fontWeight:600,color:"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ap?.city||code}</span>
                      <span style={{fontSize:"11px",color:"#94a3b8",flexShrink:0,marginLeft:"6px"}}>{ap?.country}</span>
                    </div>
                    <div style={{height:"5px",background:"#f1f5f9",borderRadius:"99px",overflow:"hidden"}}>
                      <div style={{width:`${(count/max)*100}%`,height:"100%",background:barColor,borderRadius:"99px",transition:"width 0.5s ease"}}/>
                    </div>
                    {basesForCode.length>0&&<div style={{display:"flex",gap:"3px",marginTop:"3px"}}>
                      {basesForCode.map(b=><span key={b} style={{fontSize:"9px",fontWeight:700,color:BASES_CONFIG[b].color,background:BASES_CONFIG[b].color+"15",padding:"0px 5px",borderRadius:"99px"}}>via {b}</span>)}
                    </div>}
                  </div>
                  <span style={{fontSize:"13px",fontWeight:800,color:"#64748b",minWidth:"24px",textAlign:"right",flexShrink:0}}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CO2 ── */}
      <div style={{...card(),overflow:"hidden"}}>
        <div style={{padding:"18px 20px",background:"linear-gradient(135deg,#064e3b,#065f46)"}}>
          <h3 style={{fontWeight:900,fontSize:"16px",color:"#fff",marginBottom:"2px"}}>🌍 Bilan Carbone</h3>
          <p style={{fontSize:"12px",color:"#6ee7b7"}}>A320 CEO/NEO easyJet · Données ICAO/IATA</p>
        </div>
        <div style={{padding:"12px 20px",background:"#f0fdf4",borderBottom:"1px solid #d1fae5"}}>
          <p style={{fontSize:"12px",color:"#065f46",lineHeight:1.7,margin:0}}>
            <strong>Méthode :</strong> L'A320 consomme ~<strong>2 250 kg kérosène/heure</strong> (CEO ~2 400, NEO ~2 100). 1 kg kérosène = <strong>3,16 kg CO₂</strong>. Part passager = total ÷ 166 pax (180 × 92,5%).
          </p>
        </div>
        <div style={{padding:"18px 20px"}}>
          <div style={{display:"flex",gap:"6px",marginBottom:"16px",alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:"12px",color:"#94a3b8",fontWeight:600}}>Année :</span>
            {years.map(y=>(
              <button key={y} onClick={()=>setCo2Year(y)} style={{padding:"4px 10px",borderRadius:"8px",border:`1.5px solid ${co2Year===y?"#059669":"#e2e8f0"}`,background:co2Year===y?"#d1fae5":"#fff",color:co2Year===y?"#065f46":"#94a3b8",fontWeight:700,fontSize:"12px",cursor:"pointer"}}>{y}</button>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
            {[[`📅 ${co2Year} · ${fmtTime(yMins)}`,yC],[`🌍 Toutes années · ${fmtTime(tMins)}`,tC]].map(([title,c],i)=>(
              <div key={i} style={{background:"#f8fafc",borderRadius:"12px",padding:"14px",border:"1px solid #e2e8f0"}}>
                <div style={{fontWeight:800,fontSize:"12px",color:"#1e293b",marginBottom:"10px"}}>{title}</div>
                {[
                  {bg:"#fff7ed",bc:"#fed7aa",lc:"#9a3412",vc:"#ea580c",label:"⛽ KÉROSÈNE AVION",val:`${fmtNum(c.fuelKg/1000,1)} t`,sub:`${fmtNum(c.fuelL)} L`},
                  {bg:"#fef2f2",bc:"#fecaca",lc:"#991b1b",vc:"#dc2626",label:"💨 CO₂ AVION TOTAL",val:`${fmtNum(c.co2TotalTon,i===0?1:0)} t`,sub:`${fmtNum(c.distKm)} km`},
                  {bg:"#f0fdf4",bc:"#bbf7d0",lc:"#166534",vc:"#16a34a",label:"🧑‍✈️ TA PART (1/166 pax)",val:`${fmtNum(c.co2PerPaxTon*1000,0)} kg CO₂`,sub:`${fmtNum(c.co2PerPaxTon,3)} t`},
                ].map((row,j)=>(
                  <div key={j} style={{padding:"8px 10px",background:row.bg,borderRadius:"8px",border:`1px solid ${row.bc}`,marginBottom:j<2?"8px":0}}>
                    <div style={{fontSize:"10px",color:row.lc,fontWeight:800,marginBottom:"2px"}}>{row.label}</div>
                    <div style={{fontSize:"18px",fontWeight:900,color:row.vc,lineHeight:1}}>{row.val}</div>
                    <div style={{fontSize:"11px",color:row.lc,marginTop:"2px"}}>{row.sub}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{marginTop:"12px",padding:"12px 14px",background:"#fffbeb",borderRadius:"10px",border:"1px solid #fde68a"}}>
            <p style={{fontSize:"12px",color:"#92400e",lineHeight:1.7,margin:0}}>
              💡 <strong>Contexte :</strong> Un Français émet ~9 t CO₂/an. Un Paris–NY A/R ≈ 1,7 t/pax. Le chiffre "avion total" = ta responsabilité opérationnelle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}