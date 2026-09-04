import { useState, useEffect, useRef } from "react";
import { createStore, moveMonth, summarizeSlots } from './store.mjs';
import { AuthGate, supabase } from './AuthGate.jsx';

const store = createStore({
  url: import.meta.env.VITE_SUPABASE_URL,
  publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  getAccessToken: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session?.access_token;
  }
});

const C = {
  dark: "#1E3A2F", mid: "#2F5741", sage: "#5A8C6E", light: "#A8C5B0",
  cream: "#F4F0EB", white: "#FFFFFF", accent: "#C97C5D", warn: "#E8A87C",
  muted: "#6B7C74", border: "#D0DDD6", red: "#C0392B", blue: "#2980B9",
  purple: "#7B5EA7",
};

const THERAPISTS = ["Karol", "Krissya", "Fernanda", "Laura", "Raquel"];
const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábados"];
const HOURS = ["8am","9am","10am","11am","12md","1pm","2pm","3pm","4pm","5pm","6pm"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

// Franjas de disponibilidad por terapeuta
// junio-julio = vacaciones Lincoln (Karol libre mañanas)
// agosto en adelante = Karol en Lincoln lun/mar/mié 9am-2pm
const AVAILABILITY = {
  "junio-julio": {
    Karol: {
      Lunes:     { from:"9am",  to:"6pm"  },
      Martes:    { from:"9am",  to:"6pm"  },
      Miércoles: { from:"9am",  to:"6pm"  },
      Jueves:    null,
      Viernes:   { from:"11am", to:"3pm"  },
      Sábados:   null,
    },
    Krissya: {
      Lunes:     null,
      Martes:    { from:"8am",  to:"7pm",  note:"8am + 1pm-7pm (mediodía no disponible)" },
      Miércoles: { from:"8am",  to:"7pm"  },
      Jueves:    null,
      Viernes:   { from:"9am",  to:"3pm"  },
      Sábados:   null,
    },
    Raquel: {
      Lunes:     { from:"12md", to:"6pm"  },
      Martes:    { from:"8am",  to:"6pm"  },
      Miércoles: { from:"8am",  to:"6pm"  },
      Jueves:    { from:"8am",  to:"6pm",  note:"Mañana: Británica y Discovery" },
      Viernes:   { from:"8am",  to:"3pm"  },
      Sábados:   null,
    },
    Fernanda: {
      Lunes:     null,
      Martes:    { from:"1pm",  to:"7pm"  },
      Miércoles: null,
      Jueves:    null,
      Viernes:   null,
      Sábados:   { from:"8am",  to:"1pm"  },
    },
    Laura: {
      Lunes:     null,
      Martes:    { from:"1pm",  to:"7pm"  },
      Miércoles: { from:"1pm",  to:"6pm"  },
      Jueves:    { from:"10am", to:"7pm"  },
      Viernes:   { from:"8am",  to:"12md", note:"8am-9am coordinación, pacientes desde 10am" },
      Sábados:   null,
    },
  },
  "agosto+": {
    Karol: {
      Lunes:     { from:"2pm",  to:"6pm",  note:"Mañana: Lincoln 9am-2pm" },
      Martes:    { from:"2pm",  to:"6pm",  note:"Mañana: Lincoln 9am-2pm" },
      Miércoles: { from:"2pm",  to:"6pm",  note:"Mañana: Lincoln 9am-2pm" },
      Jueves:    null,
      Viernes:   { from:"11am", to:"3pm"  },
      Sábados:   null,
    },
    Krissya: {
      Lunes:     null,
      Martes:    { from:"8am",  to:"7pm",  note:"8am + 1pm-7pm (mediodía no disponible)" },
      Miércoles: { from:"8am",  to:"7pm"  },
      Jueves:    null,
      Viernes:   { from:"9am",  to:"3pm"  },
      Sábados:   null,
    },
    Raquel: {
      Lunes:     { from:"12md", to:"6pm"  },
      Martes:    { from:"8am",  to:"6pm"  },
      Miércoles: { from:"8am",  to:"6pm"  },
      Jueves:    { from:"8am",  to:"6pm",  note:"Mañana: Británica y Discovery" },
      Viernes:   { from:"8am",  to:"3pm"  },
      Sábados:   null,
    },
    Fernanda: {
      Lunes:     null,
      Martes:    { from:"1pm",  to:"7pm"  },
      Miércoles: null,
      Jueves:    null,
      Viernes:   null,
      Sábados:   { from:"8am",  to:"1pm"  },
    },
    Laura: {
      Lunes:     null,
      Martes:    { from:"1pm",  to:"7pm"  },
      Miércoles: { from:"1pm",  to:"6pm"  },
      Jueves:    { from:"10am", to:"7pm"  },
      Viernes:   { from:"8am",  to:"12md", note:"8am-9am coordinación, pacientes desde 10am" },
      Sábados:   null,
    },
  },
};

const PATIENT_STATUS = {
  evaluacion: { label: "En evaluación", color: C.accent },
  terapia:    { label: "En terapia",    color: C.sage },
  alta:       { label: "Alta",          color: C.blue },
  inactivo:   { label: "Inactivo",      color: C.muted },
};

// Busca en el horario de una terapeuta en qué días/horas aparece un paciente
const getPatientSchedule = (schedule, therapist, patientName) => {
  if (!therapist || !schedule[therapist] || !patientName) return null;
  const results = [];
  const nameLower = patientName.toLowerCase();
  DAYS.forEach(day => {
    HOURS.forEach(hour => {
      const cell = schedule[therapist]?.[day]?.[hour] || "";
      if (cell.toLowerCase().includes(nameLower)) {
        results.push(`${day} ${hour}`);
      }
    });
  });
  return results.length > 0 ? results.join(" / ") : null;
};

const getAvailability = (therapist, month) => {
  const period = month >= 7 ? "agosto+" : "junio-julio";
  return AVAILABILITY[period]?.[therapist] || {};
};

// Horas específicas no disponibles dentro de una franja disponible
const UNAVAILABLE_HOURS = {
  Krissya: {
    Martes: ["9am","10am","11am","12md"],
  },
};

const isHourUnavailableException = (therapist, day, hour) => {
  return UNAVAILABLE_HOURS[therapist]?.[day]?.includes(hour) || false;
};

const HOUR_INDEX = {"8am":0,"9am":1,"10am":2,"11am":3,"12md":4,"1pm":5,"2pm":6,"3pm":7,"4pm":8,"5pm":9,"6pm":10};

const isHourAvailable = (therapist, day, hour, month) => {
  const avail = getAvailability(therapist, month)[day];
  if (!avail) return false;
  if (isHourUnavailableException(therapist, day, hour)) return false;
  const from = HOUR_INDEX[avail.from] ?? 0;
  const to   = HOUR_INDEX[avail.to]   ?? 10;
  const h    = HOUR_INDEX[hour]        ?? 0;
  return h >= from && h <= to;
};

const therapistColor = (t) => ({Karol:'#3A7CA5', Krissya:'#6B4C9A', Fernanda:'#C97C5D', Laura:'#2F5741', Raquel:'#7A9E7E'}[t] || C.dark);

// ── Shared styles ────────────────────────────────────────────────────────────
const thStyle = { padding:"10px 12px", fontWeight:700, fontSize:11, color:C.dark, textTransform:"uppercase", letterSpacing:"0.05em", whiteSpace:"nowrap", borderBottom:`2px solid ${C.border}` };
const tdStyle = { padding:"7px 12px", fontSize:13, verticalAlign:"middle", borderBottom:`1px solid ${C.border}` };
const navBtn = { padding:"7px 14px", background:C.white, border:`1px solid ${C.border}`, borderRadius:6, cursor:"pointer", fontSize:16, color:C.dark, fontWeight:700 };
const selStyle = { padding:"8px 12px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, background:C.white, color:C.dark, fontFamily:"inherit", cursor:"pointer" };
const inputStyle = { padding:"7px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", outline:"none", background:C.white };
const smallBtn = { padding:"4px 8px", borderRadius:5, border:"none", cursor:"pointer", fontSize:12, fontWeight:700 };

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() { return <AuthGate><Workspace /></AuthGate>; }
function Workspace() {
  const [tab, setTab] = useState("horarios");
  const [{year: currentYear, month: currentMonth}, setPeriod] = useState(() => {
    const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Costa_Rica',year:'numeric',month:'numeric'}).formatToParts(new Date());
    return {year:Number(parts.find(p=>p.type==='year').value),month:Number(parts.find(p=>p.type==='month').value)-1};
  });
  const [cells, setCells] = useState([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('Cargando información compartida…');
  const [error, setError] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const busy = useRef(false);
  const epoch = useRef(0);
  const editSnapshot = useRef(null);
  const [activeTherapist, setActiveTherapist] = useState("Laura");
  const [patients, setPatients] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [cellValue, setCellValue] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterTherapist, setFilterTherapist] = useState("todos");
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({ name:"", therapist:"Laura", status:"evaluacion", notes:"", assigned:"" });
  const [editingPatient, setEditingPatient] = useState(null);
  const [searchPatient, setSearchPatient] = useState("");

  const monthKey = `${currentYear}-${currentMonth}`;

  useEffect(() => {
    let stopped = false, timer;
    setReady(false); setCells([]); setEditingCell(null); setEditingPatient(null);
    async function refresh() {
      const version = epoch.current;
      try {
        if (!busy.current) {
          const [data, rows] = await Promise.all([store.load(), store.loadMonth(monthKey)]);
          if (!stopped && !busy.current && version === epoch.current) {
            setPatients(data.patients); setCells(rows); setReady(true);
            setLastSync(new Date()); setMessage('Información actualizada');
          }
        }
      } catch (e) { if (!stopped) { setError(e.message); setMessage('No se pudo actualizar'); } }
      finally { if (!stopped) timer = setTimeout(refresh, 5000); }
    }
    refresh();
    return () => { stopped = true; clearTimeout(timer); };
  }, [monthKey]);

  const schedule = {};
  cells.forEach(c => { schedule[c.therapist] ??= {}; schedule[c.therapist][c.day] ??= {}; schedule[c.therapist][c.day][c.hour] = c.value; });
  const metrics = (t) => summarizeSlots(cells.length ? DAYS.flatMap(d => HOURS.map(h => ({available:isHourAvailable(t,d,h,currentMonth),value:schedule[t]?.[d]?.[h] || ''}))) : []);
  const countAvailable = (t) => metrics(t).free;
  async function mutate(operation) {
    if (busy.current) return;
    busy.current = true; epoch.current++; setSaving(true); setError(''); setMessage('Guardando…');
    try { await operation(); setMessage('Guardado'); }
    catch (e) { setError(e.message); setMessage('No se pudo guardar'); }
    finally { busy.current = false; epoch.current++; setSaving(false); }
  }
  const startEdit = (t,d,h) => {
    if (editingCell || busy.current) return;
    const cell = cells.find(c=>c.therapist===t && c.day===d && c.hour===h);
    if (!cell) { setError('Primero creá el horario de este mes.'); return; }
    editSnapshot.current = {...cell}; setEditingCell(`${t}-${d}-${h}`); setCellValue(cell.value);
  };
  const commitEdit = () => mutate(async () => {
    const updated = await store.saveCell(editSnapshot.current, cellValue);
    setCells(prev=>prev.map(c=>c.id===updated.id ? updated : c)); setEditingCell(null);
  });
  const createMonth = (copy) => mutate(async () => {
    const previous = moveMonth(currentYear,currentMonth,-1);
    await store.createMonth(monthKey,copy ? `${previous.year}-${previous.month}` : null);
    setCells(await store.loadMonth(monthKey));
  });
  const changePeriod = (delta) => {
    if (saving) return;
    if ((editingCell || editingPatient || showAddPatient) && !window.confirm('¿Descartar la edición pendiente y cambiar de mes?')) return;
    setShowAddPatient(false); setPeriod(moveMonth(currentYear,currentMonth,delta)); setError('');
  };

  const filteredPatients = patients.filter(p => {
    const mS = filterStatus==="todos"||p.status===filterStatus;
    const mT = filterTherapist==="todos"||p.therapist===filterTherapist||p.assigned===filterTherapist;
    const mQ = !searchPatient||p.name.toLowerCase().includes(searchPatient.toLowerCase());
    return mS && mT && mQ;
  });

  const addPatient = () => mutate(async () => {
    const created = await store.addPatient(newPatient);
    setPatients(prev=>[...prev,created]);
    setNewPatient({name:'',therapist:'Laura',status:'evaluacion',notes:'',assigned:''}); setShowAddPatient(false);
  });
  const saveEditPatient = () => mutate(async () => {
    const updated = await store.savePatient(editingPatient,editingPatient.revision);
    setPatients(prev=>prev.map(p=>p.id===updated.id?updated:p)); setEditingPatient(null);
  });
  const deletePatient = (id) => {
    const patient = patients.find(p=>p.id===id);
    if (!window.confirm(`¿Marcar a ${patient.name} como inactivo? Se conservará su registro.`)) return;
    return mutate(async () => {
      const updated = await store.archivePatient(patient);
      setPatients(prev=>prev.map(p=>p.id===id?updated:p));
    });
  };

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:C.cream, minHeight:"100vh", color:C.dark }}>
      {/* Header */}
      <div style={{ background:C.dark, padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:8, background:C.sage, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>🌿</div>
          <div>
            <div style={{ color:C.white, fontWeight:700, fontSize:15 }}>Casa Verde — TO</div>
            <div style={{ color:C.light, fontSize:11 }}>Coordinación de Terapia Ocupacional</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <button disabled={saving} onClick={async()=>{
            if ((editingCell || editingPatient || showAddPatient) && !window.confirm('¿Cerrar sesión y descartar la edición pendiente?')) return;
            const {error} = await supabase.auth.signOut(); if(error) setError(error.message);
          }} style={navBtn}>Salir</button>
          {[["horarios","📅 Horarios"],["pacientes","👥 Pacientes"]].map(([t,lbl])=>(
            <button key={t} onClick={()=>setTab(t)} style={{ padding:"8px 16px", borderRadius:6, border:"none", cursor:"pointer", fontWeight:600, fontSize:13, background:tab===t?C.sage:"transparent", color:tab===t?C.white:C.light }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:'12px 20px'}} role="status" aria-live="polite">{message}{lastSync && ` · Última consulta ${lastSync.toLocaleTimeString('es-CR')}`}</div>
      {error && <div role="alert" style={{padding:16,background:'#FCE8E6',color:C.red}}>{error} <button onClick={()=>setError('')}>Cerrar aviso</button></div>}
      {!ready && <p style={{padding:20}}>Esperando los datos del servidor. Se reintentará automáticamente.</p>}
      <fieldset disabled={!ready || saving} style={{border:0,padding:0,margin:0,minWidth:0}}>
      {/* ── HORARIOS TAB ── */}
      {tab==="horarios" && (
        <div style={{ padding:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18, flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <button onClick={()=>changePeriod(-1)} style={navBtn}>‹</button>
              <div style={{ background:C.dark, color:C.white, padding:"8px 20px", borderRadius:8, fontWeight:700, fontSize:14, minWidth:150, textAlign:"center" }}>
                {MONTHS[currentMonth]} {currentYear}
              </div>
              <button onClick={()=>changePeriod(1)} style={navBtn}>›</button>
            </div>
            <div style={{ fontSize:11, color:C.muted, background:C.white, padding:"6px 12px", borderRadius:6, border:`1px solid ${C.border}` }}>
              Horario semanal de referencia · las anotaciones quincenales requieren confirmar la fecha
            </div>
          </div>

          {ready && cells.length===0 && <div style={{padding:16,background:C.white,marginBottom:16}}>
            <p>Este mes todavía no tiene horario compartido.</p>
            <button onClick={()=>createMonth(true)} style={navBtn}>Copiar mes anterior</button>{' '}
            <button onClick={()=>createMonth(false)} style={navBtn}>Crear mes vacío</button>
          </div>}
          {/* Therapist tabs */}
          <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
            {THERAPISTS.map(t=>(
              <button key={t} onClick={()=>{if(!editingCell) setActiveTherapist(t);}} style={{ padding:"8px 14px", borderRadius:8, border:`2px solid ${activeTherapist===t?therapistColor(t):C.border}`, background:activeTherapist===t?therapistColor(t):C.white, color:activeTherapist===t?C.white:C.dark, fontWeight:600, fontSize:13, cursor:"pointer" }}>
                {t} <span style={{ fontSize:11, opacity:0.75, fontWeight:400 }}>({countAvailable(t)} libres)</span>
              </button>
            ))}
          </div>

          {/* Grid */}
          <div style={{ background:C.white, borderRadius:12, overflow:"hidden", border:`1px solid ${C.border}`, boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ background:therapistColor(activeTherapist), padding:"11px 18px", display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ color:C.white, fontWeight:700, fontSize:15 }}>{activeTherapist}</span>
              <span style={{ color:"rgba(255,255,255,0.65)", fontSize:13 }}>— {MONTHS[currentMonth]} {currentYear}</span>
              <span style={{ marginLeft:"auto", background:"rgba(255,255,255,0.2)", color:C.white, padding:"2px 10px", borderRadius:20, fontSize:12 }}>
                {countAvailable(activeTherapist)} espacios disponibles
              </span>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:700 }}>
                <thead>
                  <tr style={{ background:"#F7FAF8" }}>
                    <th style={{ ...thStyle, width:52 }}>Hora</th>
                    {DAYS.map(d=>{
                      const avail = getAvailability(activeTherapist, currentMonth)[d];
                      return (
                        <th key={d} style={{ ...thStyle, verticalAlign:"top" }}>
                          <div>{d}</div>
                          {avail ? (
                            <div style={{ fontWeight:400, fontSize:10, color:C.sage, textTransform:"none", letterSpacing:0, marginTop:2 }}>
                              {avail.from}–{avail.to}
                              {avail.note && <div style={{ color:C.muted, fontSize:9 }}>{avail.note}</div>}
                            </div>
                          ) : (
                            <div style={{ fontWeight:400, fontSize:10, color:C.border, textTransform:"none", letterSpacing:0, marginTop:2 }}>no disponible</div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {HOURS.map((h,hi)=>(
                    <tr key={h} style={{ background:hi%2===0?C.white:"#FAFCFA" }}>
                      <td style={{ ...tdStyle, fontWeight:700, fontSize:11, color:C.muted, background:"#F5F8F6" }}>{h}</td>
                      {DAYS.map(d=>{
                        const key=`${activeTherapist}-${d}-${h}`;
                        const val=schedule[activeTherapist]?.[d]?.[h]||"";
                        const isEdit=editingCell===key;
                        const unavailable=!isHourAvailable(activeTherapist,d,h,currentMonth);
                        return (
                          <td key={d} style={{ ...tdStyle, background:val?"#EEF5F0":unavailable?"#F5F5F3":"transparent", cursor:unavailable?"default":"pointer", minWidth:110, opacity:unavailable&&!val?0.45:1 }}
                              onClick={()=>!saving&&ready&&!isEdit&&(!unavailable||val)&&startEdit(activeTherapist,d,h)}>
                            {isEdit?(
                              <div><input aria-label="Contenido del horario" autoFocus value={cellValue} onChange={e=>setCellValue(e.target.value)}
                                onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();commitEdit();}if(e.key==='Escape')setEditingCell(null);}}
                                style={{...inputStyle,width:'100%',boxSizing:'border-box'}}/>
                                <button disabled={saving} onClick={commitEdit}>Guardar</button>
                                <button disabled={saving} onClick={()=>setEditingCell(null)}>Cancelar</button>
                              </div>
                            ):val?(
                              <div style={{ fontSize:12, lineHeight:1.35, padding:"2px 4px",
                                background: val.includes("🗓") ? "#FFF3E0" : "transparent",
                                borderLeft: val.includes("🗓") ? "3px solid #E8A87C" : "none",
                                paddingLeft: val.includes("🗓") ? "6px" : "4px",
                                color: val.includes("🗓") ? "#C97C5D" : "inherit",
                                fontStyle: val.includes("🗓") ? "italic" : "normal"
                              }}>
                                {val.includes("c/15")&&!val.includes("🗓")&&<span style={{ display:"inline-block", width:5, height:5, borderRadius:"50%", background:C.accent, marginRight:4, verticalAlign:"middle" }}/>}
                                {val}
                              </div>
                            ):unavailable?(
                              <div style={{ height:26 }}/>
                            ):(
                              <div style={{ height:26, display:"flex", alignItems:"center", justifyContent:"center" }}>
                                <span style={{ color:C.border, fontSize:10 }}>libre</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding:"8px 18px", borderTop:`1px solid ${C.border}`, fontSize:11, color:C.muted }}>
              Seleccioná una celda y presioná Guardar · ● = anotación de frecuencia quincenal
            </div>
          </div>

          {/* Overview */}
          <div style={{ marginTop:20 }}>
            <div style={{ fontWeight:700, fontSize:13, color:C.dark, marginBottom:10 }}>Resumen — {MONTHS[currentMonth]}</div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {THERAPISTS.map(t=>{
                const m=metrics(t), total=m.capacity, used=m.occupied, pct=total?Math.round((used/total)*100):0;
                return (
                  <div key={t} style={{ background:C.white, borderRadius:10, padding:"12px 16px", border:`1px solid ${C.border}`, minWidth:130, flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:therapistColor(t), marginBottom:6 }}>{t}</div>
                    <div style={{ height:5, background:C.border, borderRadius:3, marginBottom:6 }}>
                      <div style={{ height:5, background:therapistColor(t), borderRadius:3, width:`${pct}%` }}/>
                    </div>
                    <div style={{ fontSize:11, color:C.muted }}><b style={{color:C.dark}}>{used}</b> ocup · <b style={{color:C.sage}}>{countAvailable(t)}</b> libres · {m.evaluationReserved} para evaluación</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── PACIENTES TAB ── */}
      {tab==="pacientes" && (
        <div style={{ padding:20 }}>
          {/* Stats */}
          <div style={{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap" }}>
            {Object.entries(PATIENT_STATUS).map(([key,val])=>{
              const count=patients.filter(p=>p.status===key).length;
              return (
                <div key={key} style={{ background:C.white, borderRadius:10, padding:"12px 18px", border:`2px solid ${val.color}30`, flex:1, minWidth:110 }}>
                  <div style={{ fontSize:22, fontWeight:800, color:val.color }}>{count}</div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{val.label}</div>
                </div>
              );
            })}
            <div style={{ background:C.dark, borderRadius:10, padding:"12px 18px", flex:1, minWidth:110 }}>
              <div style={{ fontSize:22, fontWeight:800, color:C.white }}>{patients.length}</div>
              <div style={{ fontSize:11, color:C.light, marginTop:2 }}>Total histórico</div>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
            <input placeholder="🔍 Buscar..." value={searchPatient} onChange={e=>setSearchPatient(e.target.value)}
              style={{ ...inputStyle, flex:1, minWidth:160, padding:"9px 14px" }}/>
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={selStyle}>
              <option value="todos">Todos los estados</option>
              <option value="evaluacion">En evaluación</option>
              <option value="terapia">En terapia</option>
              <option value="alta">Alta</option>
              <option value="inactivo">Inactivo</option>
            </select>
            <select value={filterTherapist} onChange={e=>setFilterTherapist(e.target.value)} style={selStyle}>
              <option value="todos">Todas</option>
              {THERAPISTS.map(t=><option key={t}>{t}</option>)}
            </select>
            <button onClick={()=>setShowAddPatient(true)} style={{ padding:"9px 14px", background:C.sage, color:C.white, border:"none", borderRadius:8, fontWeight:700, fontSize:13, cursor:"pointer" }}>
              + Nuevo paciente
            </button>
          </div>

          {/* Add form */}
          {showAddPatient&&(
            <div style={{ background:C.white, border:`2px solid ${C.sage}`, borderRadius:10, padding:16, marginBottom:16, display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-end" }}>
              <div style={{ fontWeight:700, color:C.dark, width:"100%", marginBottom:2, fontSize:13 }}>Nuevo paciente</div>
              {[["Nombre","name","text"],["Notas","notes","text"]].map(([lbl,key,type])=>(
                <div key={key} style={{ display:"flex", flexDirection:"column", gap:3, flex:2, minWidth:150 }}>
                  <label style={{ fontSize:11, color:C.muted }}>{lbl}</label>
                  <input type={type} value={newPatient[key]} onChange={e=>setNewPatient(p=>({...p,[key]:e.target.value}))} style={inputStyle}/>
                </div>
              ))}
              {[["Terapeuta evaluó","therapist"],["Estado","status"],["Terapeuta a cargo","assigned"]].map(([lbl,key])=>(
                <div key={key} style={{ display:"flex", flexDirection:"column", gap:3, flex:1, minWidth:130 }}>
                  <label style={{ fontSize:11, color:C.muted }}>{lbl}</label>
                  <select value={newPatient[key]} onChange={e=>setNewPatient(p=>({...p,[key]:e.target.value}))} style={inputStyle}>
                    {key==="status"?(
                      <>
                        <option value="evaluacion">En evaluación</option>
                        <option value="terapia">En terapia</option>
                        <option value="alta">Alta</option>
                        <option value="inactivo">Inactivo</option>
                      </>
                    ):(
                      <>{key==="assigned"&&<option value="">—</option>}{THERAPISTS.map(t=><option key={t}>{t}</option>)}</>
                    )}
                  </select>
                </div>
              ))}
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={addPatient} style={{ ...smallBtn, background:C.sage, color:C.white, padding:"8px 14px" }}>Guardar</button>
                <button onClick={()=>setShowAddPatient(false)} style={{ ...smallBtn, background:C.border, color:C.dark, padding:"8px 14px" }}>Cancelar</button>
              </div>
            </div>
          )}

          {/* Table */}
          <div style={{ background:C.white, borderRadius:12, border:`1px solid ${C.border}`, overflowX:"auto", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:C.dark }}>
                  {["Nombre","Evaluó","Estado","A cargo","Horario",""].map((h,i)=>(
                    <th key={i} style={{ ...thStyle, color:C.white, background:"transparent", textAlign:"left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPatients.length===0&&(
                  <tr><td colSpan={6} style={{ textAlign:"center", padding:28, color:C.muted, fontSize:13 }}>Sin resultados</td></tr>
                )}
                {filteredPatients.map((p,i)=>{
                  const st=PATIENT_STATUS[p.status] || {label:p.status || "Sin estado",color:C.muted};
                  const isEdit=editingPatient?.id===p.id;
                  return (
                    <tr key={p.id} style={{ background:i%2===0?C.white:"#FAFCFA", borderBottom:`1px solid ${C.border}` }}>
                      <td style={{ ...tdStyle, fontWeight:600 }}>
                        {isEdit?<input value={editingPatient.name} onChange={e=>setEditingPatient(ep=>({...ep,name:e.target.value}))} style={{...inputStyle,width:"100%"}}/>:p.name}
                      </td>
                      <td style={tdStyle}>
                        {isEdit?(
                          <select value={editingPatient.therapist} onChange={e=>setEditingPatient(ep=>({...ep,therapist:e.target.value}))} style={inputStyle}>
                            <option value="">—</option>{THERAPISTS.map(t=><option key={t}>{t}</option>)}
                          </select>
                        ):p.therapist?(
                          <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:20, fontSize:11, background:`${therapistColor(p.therapist)}20`, color:therapistColor(p.therapist), fontWeight:600 }}>{p.therapist}</span>
                        ):<span style={{color:C.border}}>—</span>}
                      </td>
                      <td style={tdStyle}>
                        {isEdit?(
                          <select value={editingPatient.status} onChange={e=>setEditingPatient(ep=>({...ep,status:e.target.value}))} style={inputStyle}>
                            <option value="evaluacion">En evaluación</option>
                            <option value="terapia">En terapia</option>
                            <option value="alta">Alta</option>
                            <option value="inactivo">Inactivo</option>
                          </select>
                        ):(
                          <span style={{ display:"inline-block", padding:"3px 9px", borderRadius:20, fontSize:11, background:`${st.color}20`, color:st.color, fontWeight:600 }}>{st.label}</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {isEdit?(
                          <select value={editingPatient.assigned} onChange={e=>setEditingPatient(ep=>({...ep,assigned:e.target.value}))} style={inputStyle}>
                            <option value="">—</option>{THERAPISTS.map(t=><option key={t}>{t}</option>)}
                          </select>
                        ):p.assigned?(
                          <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:20, fontSize:11, background:`${therapistColor(p.assigned)}20`, color:therapistColor(p.assigned), fontWeight:600 }}>{p.assigned}</span>
                        ):<span style={{color:C.border}}>—</span>}
                      </td>
                      <td style={{ ...tdStyle, fontSize:12, maxWidth:200 }}>
                        {isEdit ? (
                          <input value={editingPatient.notes} onChange={e=>setEditingPatient(ep=>({...ep,notes:e.target.value}))} style={{...inputStyle,width:"100%"}} placeholder="Horario manual..."/>
                        ) : (() => {
                          const fromSchedule = getPatientSchedule(schedule, p.assigned || p.therapist, p.name);
                          return fromSchedule ? (
                            <span title="Coincidencia por nombre; confirmar en agenda" style={{ color:C.sage, fontWeight:600 }}>{fromSchedule}</span>
                          ) : p.notes ? (
                            <span style={{ color:C.muted }}>{p.notes}</span>
                          ) : (
                            <span style={{ color:C.border }}>—</span>
                          );
                        })()}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display:"flex", gap:5 }}>
                          {isEdit?(
                            <>
                              <button onClick={saveEditPatient} style={{ ...smallBtn, background:C.sage, color:C.white }}>✓</button>
                              <button onClick={()=>setEditingPatient(null)} style={{ ...smallBtn, background:C.border, color:C.dark }}>✗</button>
                            </>
                          ):(
                            <>
                              <button onClick={()=>{if(!editingPatient || window.confirm("¿Descartar la edición pendiente?")) setEditingPatient({...p});}} style={{ ...smallBtn, background:`${C.blue}18`, color:C.blue }}>✎</button>
                              <button title="Marcar inactivo y conservar historial" onClick={()=>deletePatient(p.id)} style={{ ...smallBtn, background:`${C.red}18`, color:C.red }}>✕</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop:8, fontSize:11, color:C.muted }}>
            Mostrando {filteredPatients.length} de {patients.length} pacientes
          </div>
        </div>
      )}
      </fieldset>
    </div>
  );
}
