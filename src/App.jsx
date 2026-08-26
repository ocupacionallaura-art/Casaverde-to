import { useState, useEffect } from "react";

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
      Lunes:     { from:"1pm",  to:"6pm"  },
      Martes:    { from:"1pm",  to:"6pm"  },
      Miércoles: { from:"11am", to:"6pm"  },
      Jueves:    null,
      Viernes:   { from:"11am", to:"3pm"  },
      Sábados:   null,
    },
    Krissya: {
      Lunes:     null,
      Martes:    { from:"1pm",  to:"7pm"  },
      Miércoles: { from:"8am",  to:"7pm",  note:"Mañana: Home two + oficina desde 11am" },
      Jueves:    null,
      Viernes:   { from:"10am", to:"12md", note:"Home two 10am-12md" },
      Sábados:   null,
    },
    Raquel: {
      Lunes:     { from:"8am",  to:"6pm"  },
      Martes:    { from:"10am", to:"6pm"  },
      Miércoles: { from:"8am",  to:"6pm"  },
      Jueves:    { from:"12md", to:"6pm",  note:"Mañana: Británica y Discovery" },
      Viernes:   { from:"8am",  to:"12md" },
      Sábados:   null,
    },
    Fernanda: {
      Lunes:     null,
      Martes:    { from:"1pm",  to:"7pm"  },
      Miércoles: null,
      Jueves:    null,
      Viernes:   null,
      Sábados:   { from:"8am",  to:"12md" },
    },
    Laura: {
      Lunes:     null,
      Martes:    { from:"1pm",  to:"7pm"  },
      Miércoles: { from:"1pm",  to:"6pm"  },
      Jueves:    { from:"10am", to:"7pm"  },
      Viernes:   { from:"8am",  to:"12md", note:"Coordinación 8-9am, pacientes desde 10am" },
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
      Martes:    { from:"1pm",  to:"7pm"  },
      Miércoles: { from:"8am",  to:"7pm",  note:"Mañana: Home two + oficina desde 11am" },
      Jueves:    null,
      Viernes:   { from:"10am", to:"2pm",  note:"Home two 10am-12md / consultorio 1pm-2pm" },
      Sábados:   null,
    },
    Raquel: {
      Lunes:     { from:"8am",  to:"6pm"  },
      Martes:    { from:"10am", to:"6pm"  },
      Miércoles: { from:"8am",  to:"6pm"  },
      Jueves:    { from:"12md", to:"6pm",  note:"Mañana: Británica y Discovery" },
      Viernes:   { from:"8am",  to:"12md" },
      Sábados:   null,
    },
    Fernanda: {
      Lunes:     null,
      Martes:    { from:"1pm",  to:"7pm"  },
      Miércoles: null,
      Jueves:    null,
      Viernes:   null,
      Sábados:   { from:"8am",  to:"12md" },
    },
    Laura: {
      Lunes:     null,
      Martes:    { from:"1pm",  to:"7pm"  },
      Miércoles: { from:"1pm",  to:"7pm"  },
      Jueves:    { from:"8am",  to:"7pm",  note:"8am coordinación, pacientes desde 10am" },
      Viernes:   { from:"8am",  to:"12md", note:"8am coordinación" },
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

const HOUR_INDEX = {"8am":0,"9am":1,"10am":2,"11am":3,"12md":4,"1pm":5,"2pm":6,"3pm":7,"4pm":8,"5pm":9,"6pm":10};

const isHourAvailable = (therapist, day, hour, month) => {
  const avail = getAvailability(therapist, month)[day];
  if (!avail) return false;
  const from = HOUR_INDEX[avail.from] ?? 0;
  const to   = HOUR_INDEX[avail.to]   ?? 10;
  const h    = HOUR_INDEX[hour]        ?? 0;
  return h >= from && h <= to;
};

// ── Persistencia local + Supabase ───────────────────────────────────────────
const SUPA_URL = "https://rgopwfgbdwdsvmowogit.supabase.co";
const SUPA_KEY = "sb_publishable_2CpkE8EWq26RGc9l-96bww_SmlHYbWg";

const saveToStorage = (key, data) => {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) {}
};

const loadFromStorage = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
};

// Sync to Supabase (fire and forget)
const syncPatients = async (patients) => {
  try {
    // Upsert all patients
    await fetch(`${SUPA_URL}/rest/v1/patients`, {
      method: "POST",
      headers: {
        "apikey": SUPA_KEY,
        "Authorization": `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify(patients)
    });
  } catch(e) {}
};

const syncSchedule = async (monthKey, data) => {
  try {
    await fetch(`${SUPA_URL}/rest/v1/schedules`, {
      method: "POST",
      headers: {
        "apikey": SUPA_KEY,
        "Authorization": `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify([{ month_key: monthKey, data: data, updated_at: new Date().toISOString() }])
    });
  } catch(e) {}
};

const loadFromSupabase = async () => {
  try {
    const [pRes, sRes] = await Promise.all([
      fetch(`${SUPA_URL}/rest/v1/patients?select=*&order=therapist,name`, {
        headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}` }
      }),
      fetch(`${SUPA_URL}/rest/v1/schedules?select=*`, {
        headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}` }
      })
    ]);
    const patients = await pRes.json();
    const schedules = await sRes.json();
    return { patients: patients?.length ? patients : null, schedules: schedules?.length ? schedules : null };
  } catch(e) { return { patients: null, schedules: null }; }
};

const therapistColor = (t) => ({
  Karol:"#3A7CA5", Krissya:"#6B4C9A", Fernanda:"#C97C5D", Laura:"#2F5741", Raquel:"#7A9E7E"
}[t] || C.dark);

// ── Full patient list from Notion export ────────────────────────────────────
const INIT_PATIENTS = [
  {id:1,name:"Alejandro Fait",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Miércoles 12md"}, 
  {id:2,name:"Alejandro Osborne",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Lunes 5pm"}, 
  {id:3,name:"Antonio Monge",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Miércoles 11am"}, 
  {id:4,name:"Arath",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Miércoles 4pm c/15"}, 
  {id:5,name:"Axel Vega",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Martes 3pm"}, 
  {id:6,name:"Benjamin Dobles",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Martes 10am"}, 
  {id:7,name:"Camila Zúñiga",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Viernes 12md"}, 
  {id:8,name:"Daniel Hasbon",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Martes 4pm"}, 
  {id:9,name:"David Quirós",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Viernes 1pm"}, 
  {id:10,name:"Elena Katsaoris",status:"alta",therapist:"Karol",assigned:"Karol",notes:"Alta julio 2026"}, 
  {id:11,name:"Felipe Alfaro",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Lunes 3pm"}, 
  {id:12,name:"Felipe Bermúdez",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Lunes 4pm"}, 
  {id:13,name:"Fernando Barreto",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Martes 12md"}, 
  {id:14,name:"Gabriel Chavez",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Lunes 11am"}, 
  {id:15,name:"Gonzalo Chaverri",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Miércoles 3pm"}, 
  {id:16,name:"Ignacio M",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Lunes 9am"}, 
  {id:17,name:"Ignacio Sanchez",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Lunes 9am"}, 
  {id:18,name:"Isabella Chinchilla",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Lunes 12md"}, 
  {id:19,name:"Jonathan Gael Garcia",status:"terapia",therapist:"Karol",assigned:"Raquel",notes:"Informe entregado. Jueves c/15"}, 
  {id:20,name:"Julián Fait",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Miércoles 12md"}, 
  {id:21,name:"Julián Soto",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Viernes 2pm"}, 
  {id:22,name:"Juliana Ramírez",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Miércoles 4pm"}, 
  {id:23,name:"Matías Vega",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Miércoles 9am"}, 
  {id:24,name:"Melina",status:"terapia",therapist:"Karol",assigned:"Karol",notes:""}, 
  {id:25,name:"Nicolás Berrocal",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Lunes 10am"}, 
  {id:26,name:"Nikola",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Lunes 5pm"}, 
  {id:27,name:"Olivia Peñaranda",status:"inactivo",therapist:"Karol",assigned:"",notes:"Proceso suspendido — mudanza"}, 
  {id:28,name:"Patrick Longston",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Miércoles 9am"}, 
  {id:29,name:"Roberto Chaves",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Lunes 9am"}, 
  {id:30,name:"Roberto Chávez",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Lunes 10am"}, 
  {id:31,name:"Samantha Soto",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Lunes 1pm"}, 
  {id:32,name:"Sebastián Esquivel",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Miércoles 4pm"}, 
  {id:33,name:"Sebastián Ramírez",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Miércoles 10am"}, 
  {id:34,name:"Sofia Brenes",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Lunes 5pm"}, 
  {id:35,name:"Tomás Vargas",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Martes 11am"}, 
  {id:36,name:"Yao Man",status:"terapia",therapist:"Karol",assigned:"Karol",notes:"Martes 1pm"}, 
  {id:37,name:"Bruno Capra",status:"inactivo",therapist:"Krissya",assigned:"Krissya",notes:"Proceso suspendido"}, 
  {id:38,name:"Camila Quesada",status:"inactivo",therapist:"Krissya",assigned:"Krissya",notes:"Proceso suspendido"}, 
  {id:39,name:"Eithan",status:"terapia",therapist:"Krissya",assigned:"Krissya",notes:"Miércoles 4pm c/15"}, 
  {id:40,name:"Elena Carvajal",status:"terapia",therapist:"Krissya",assigned:"Krissya",notes:"Martes 2pm c/15"}, 
  {id:41,name:"Enrique Bonilla",status:"terapia",therapist:"Krissya",assigned:"Krissya",notes:"Martes 4pm"}, 
  {id:42,name:"Eva Withal",status:"inactivo",therapist:"Krissya",assigned:"",notes:"Proceso suspendido"}, 
  {id:43,name:"Fabián Zumbado",status:"terapia",therapist:"Krissya",assigned:"Krissya",notes:"Viernes 1pm"}, 
  {id:44,name:"Felipe Jiménez",status:"terapia",therapist:"Krissya",assigned:"Krissya",notes:"Home Two kínder"}, 
  {id:45,name:"Felipe Ruiz",status:"terapia",therapist:"Krissya",assigned:"Krissya",notes:"Martes 3pm"}, 
  {id:46,name:"Franco Mora",status:"inactivo",therapist:"Krissya",assigned:"Krissya",notes:"Proceso suspendido"}, 
  {id:47,name:"Gabriel Carvajal",status:"terapia",therapist:"Krissya",assigned:"Krissya",notes:"Miércoles 4pm semanal"}, 
  {id:48,name:"Gonzalo Montes",status:"terapia",therapist:"Krissya",assigned:"Krissya",notes:"Martes 5pm Krissya"}, 
  {id:49,name:"Helena Fallas",status:"inactivo",therapist:"Krissya",assigned:"",notes:"Proceso suspendido"}, 
  {id:50,name:"Irene",status:"terapia",therapist:"Krissya",assigned:"Krissya",notes:"Miércoles 11am"}, 
  {id:51,name:"José Rodolfo",status:"inactivo",therapist:"Krissya",assigned:"",notes:"Proceso suspendido"}, 
  {id:52,name:"Juliana Colombari",status:"terapia",therapist:"Krissya",assigned:"Krissya",notes:"Miércoles 12md"}, 
  {id:53,name:"Lucas Fernández",status:"inactivo",therapist:"Krissya",assigned:"Krissya",notes:"Proceso suspendido"}, 
  {id:54,name:"Luciano Gutiérrez",status:"terapia",therapist:"Krissya",assigned:"Krissya",notes:"Viernes 2pm"}, 
  {id:55,name:"Luka Rojas Rubí",status:"inactivo",therapist:"Krissya",assigned:"Krissya",notes:"Proceso suspendido"}, 
  {id:56,name:"Mariano Solís",status:"terapia",therapist:"Krissya",assigned:"Krissya",notes:"Mensual - Martes 2pm"}, 
  {id:57,name:"Marypaz Álvarez",status:"evaluacion",therapist:"Krissya",assigned:"",notes:"En proceso"}, 
  {id:58,name:"Nawel",status:"terapia",therapist:"Krissya",assigned:"Krissya",notes:"Martes 1pm c/15"}, 
  {id:59,name:"Nicolás Fajardo",status:"terapia",therapist:"Krissya",assigned:"Krissya",notes:"Martes 4pm"}, 
  {id:60,name:"Nicolás Garita",status:"inactivo",therapist:"Krissya",assigned:"",notes:"Proceso suspendido"}, 
  {id:61,name:"Romano",status:"terapia",therapist:"Krissya",assigned:"Krissya",notes:"Miércoles 3pm c/15"}, 
  {id:62,name:"Samuel Moreira",status:"inactivo",therapist:"Krissya",assigned:"Krissya",notes:"Proceso suspendido"}, 
  {id:63,name:"Santiago Alejos",status:"inactivo",therapist:"Krissya",assigned:"Krissya",notes:"Proceso suspendido"}, 
  {id:64,name:"Santiago Arzuela",status:"terapia",therapist:"Krissya",assigned:"Krissya",notes:"Home Two kínder"}, 
  {id:65,name:"Santiago Fernández",status:"terapia",therapist:"Krissya",assigned:"Krissya",notes:"Con Krissya"}, 
  {id:66,name:"Santiago Gael",status:"terapia",therapist:"Krissya",assigned:"Krissya",notes:"Martes 5pm"}, 
  {id:67,name:"Santiago López Beche",status:"evaluacion",therapist:"Krissya",assigned:"",notes:"En evaluación"}, 
  {id:68,name:"Sebastián Mendoza",status:"terapia",therapist:"Krissya",assigned:"Krissya",notes:"Con Krissya"}, 
  {id:69,name:"Sebastián Ríos",status:"terapia",therapist:"Krissya",assigned:"Krissya",notes:"Miércoles 4pm c/15"}, 
  {id:70,name:"Sofia Chavarría Madrigal",status:"inactivo",therapist:"Krissya",assigned:"",notes:"Proceso suspendido"}, 
  {id:71,name:"Sofía Vílchez",status:"terapia",therapist:"Krissya",assigned:"Krissya",notes:"Home two - Miércoles kínder"}, 
  {id:72,name:"Tiago Vargas",status:"terapia",therapist:"Krissya",assigned:"Krissya",notes:"Miércoles 2pm"}, 
  {id:73,name:"Tomás Bermúdez",status:"inactivo",therapist:"Krissya",assigned:"Krissya",notes:"Proceso suspendido"}, 
  {id:74,name:"Tomás Coto",status:"terapia",therapist:"Krissya",assigned:"Krissya",notes:"Finland - Martes"}, 
  {id:75,name:"Tomás Coto",status:"terapia",therapist:"Krissya",assigned:"Krissya",notes:"Finland - Martes"}, 
  {id:76,name:"Tomás Harrington",status:"terapia",therapist:"Krissya",assigned:"Krissya",notes:"Martes 3pm"}, 
  {id:77,name:"Valentina Jiménez",status:"terapia",therapist:"Krissya",assigned:"Krissya",notes:"Home Two kínder"}, 
  {id:78,name:"Vicente Medina",status:"terapia",therapist:"Krissya",assigned:"Raquel",notes:"Con Raquel"}, 
  {id:79,name:"Anderson Morales",status:"terapia",therapist:"Fernanda",assigned:"Fernanda",notes:"Sábados 11am c/15"}, 
  {id:80,name:"Catalina Hena",status:"terapia",therapist:"Fernanda",assigned:"Fernanda",notes:"Martes 3pm"}, 
  {id:81,name:"David Gruter",status:"inactivo",therapist:"Fernanda",assigned:"",notes:"Proceso suspendido"}, 
  {id:82,name:"Diego Calderón",status:"terapia",therapist:"Fernanda",assigned:"Fernanda",notes:"Martes 6pm c/15"}, 
  {id:83,name:"Diego Rodríguez",status:"terapia",therapist:"Fernanda",assigned:"Fernanda",notes:"Sábados 9am c/15"}, 
  {id:84,name:"Dylan Fuentes",status:"terapia",therapist:"Fernanda",assigned:"Fernanda",notes:"Sábados 9am"}, 
  {id:85,name:"Eric Fowler",status:"evaluacion",therapist:"Fernanda",assigned:"",notes:"En evaluación"}, 
  {id:86,name:"Fabiana Romero",status:"alta",therapist:"Fernanda",assigned:"Fernanda",notes:"Alta a partir de septiembre"}, 
  {id:87,name:"Fabiana Rosales",status:"inactivo",therapist:"Fernanda",assigned:"",notes:"Proceso suspendido"}, 
  {id:88,name:"Gabriel Piedra",status:"evaluacion",therapist:"Fernanda",assigned:"Fernanda",notes:"Sábados c/15"}, 
  {id:89,name:"Gael Bustamante",status:"terapia",therapist:"Fernanda",assigned:"Fernanda",notes:"Sábados 8am"}, 
  {id:90,name:"Gianna Degroff",status:"alta",therapist:"Fernanda",assigned:"Fernanda",notes:"Alta"}, 
  {id:91,name:"Irene Bonilla",status:"terapia",therapist:"Fernanda",assigned:"Fernanda",notes:"Martes 4pm"}, 
  {id:92,name:"Jaciel Brenes",status:"terapia",therapist:"Fernanda",assigned:"Fernanda",notes:"Sábados 8am"}, 
  {id:93,name:"Luca Sánchez",status:"inactivo",therapist:"Fernanda",assigned:"",notes:"Sábados — proceso suspendido"}, 
  {id:94,name:"Luis Ignacio Vindas",status:"terapia",therapist:"Fernanda",assigned:"Fernanda",notes:"Sábados 8am c/15"}, 
  {id:95,name:"Mattia González",status:"terapia",therapist:"Fernanda",assigned:"Fernanda",notes:"Sábados 10am"}, 
  {id:96,name:"Samuel Marquez",status:"inactivo",therapist:"Fernanda",assigned:"",notes:"Proceso suspendido"}, 
  {id:97,name:"Santiago Arévalo",status:"terapia",therapist:"Fernanda",assigned:"Fernanda",notes:"Sábados 9am c/15"}, 
  {id:98,name:"Santiago Ingianna",status:"terapia",therapist:"Fernanda",assigned:"Fernanda",notes:"Pendiente confirmar sábados"}, 
  {id:99,name:"Vero Hasbun",status:"terapia",therapist:"Fernanda",assigned:"Fernanda",notes:"Martes 4pm"}, 
  {id:100,name:"Zoé Peña",status:"inactivo",therapist:"Fernanda",assigned:"",notes:"Proceso suspendido"}, 
  {id:101,name:"Zoe Zagot",status:"terapia",therapist:"Fernanda",assigned:"Fernanda",notes:"Sábados 2pm"}, 
  {id:102,name:"Alejandro Alvarado",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Jueves 2pm"}, 
  {id:103,name:"Alessio",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Martes 2pm"}, 
  {id:104,name:"Antonio Higuera",status:"inactivo",therapist:"Laura",assigned:"",notes:"Inactivo"}, 
  {id:105,name:"Ariana Rojas",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Lunes 1pm c/15"}, 
  {id:106,name:"Belén",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Martes 1pm"}, 
  {id:107,name:"Elena Pérez",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Miércoles 3pm"}, 
  {id:108,name:"Elisa Araús",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Miércoles 4pm"}, 
  {id:109,name:"Emiliano Salazar",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Jueves 1pm"}, 
  {id:110,name:"Eva Bell",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Viernes 8am"}, 
  {id:111,name:"Fabio Rodríguez",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Miércoles 3pm"}, 
  {id:112,name:"Fabricio Escalona",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Martes 5pm"}, 
  {id:113,name:"Felipe Fernández",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Viernes 9am c/15"}, 
  {id:114,name:"Felipe Rivas",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Martes 3pm"}, 
  {id:115,name:"Felipe Stauffer",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Miércoles 1pm"}, 
  {id:116,name:"Gabriel Medrano",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Jueves 12md c/15"}, 
  {id:117,name:"Gadiel Aguilar",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Viernes 11am"}, 
  {id:118,name:"Isabella Gómez",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Viernes 10am"}, 
  {id:119,name:"José Alberto Iturriaga",status:"inactivo",therapist:"Laura",assigned:"",notes:"Inactivo"}, 
  {id:120,name:"Julián García",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Miércoles 5pm"}, 
  {id:121,name:"Julian Komailizadeh",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Martes 5pm"}, 
  {id:122,name:"Kendall Mena",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Jueves 11am"}, 
  {id:123,name:"Leonora Calvo",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Martes 6pm"}, 
  {id:124,name:"Lilly Anne",status:"alta",therapist:"Laura",assigned:"Laura",notes:"Alta"}, 
  {id:125,name:"Logan Bradley",status:"inactivo",therapist:"Laura",assigned:"",notes:"Proceso suspendido"}, 
  {id:126,name:"Mateo Mayorga",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Jueves 5pm"}, 
  {id:127,name:"Matías Kim",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Jueves 1pm"}, 
  {id:128,name:"Nicolás Acuña",status:"terapia",therapist:"Laura",assigned:"",notes:"c/15 días"}, 
  {id:129,name:"Nicolás Meneses",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Lunes 6pm"}, 
  {id:130,name:"Nicolás Pichardo",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Miércoles 4pm"}, 
  {id:131,name:"Nicolás Sarnowski",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Jueves 4pm"}, 
  {id:132,name:"Samantha Mora",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Miércoles 11am"}, 
  {id:133,name:"Tomás Madrigal",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Jueves 10am"}, 
  {id:134,name:"Tomás Vega",status:"terapia",therapist:"Laura",assigned:"Laura",notes:"Miércoles 5pm"}, 
  {id:135,name:"Alejandro Coto",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:"Miércoles 5pm"}, 
  {id:136,name:"Alyssa",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:"Jueves"}, 
  {id:137,name:"Antonio Rodríguez",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:"Miércoles 5pm"}, 
  {id:138,name:"Ariel",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:"Viernes 2pm c/15"}, 
  {id:139,name:"Benjamin Vargas",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:"c/15"}, 
  {id:140,name:"Carlos Cossio",status:"inactivo",therapist:"Raquel",assigned:"",notes:"Inactivo"}, 
  {id:141,name:"Claudio",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:"Jueves 8am Británica c/15"}, 
  {id:142,name:"Cristian",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:"Viernes 1pm c/15"}, 
  {id:143,name:"Eli Carvajal",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:"Jueves 8am Discovery c/15"}, 
  {id:144,name:"Felipe Alvarado",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:"Jueves 4pm"}, 
  {id:145,name:"Franco Obando",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:"Martes 5pm c/15"}, 
  {id:146,name:"Ian Rojas",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:"Martes 10am c/15"}, 
  {id:147,name:"Isabella Leal",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:"Miércoles 4pm"}, 
  {id:148,name:"Isaías",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:"Jueves 4pm c/15"}, 
  {id:149,name:"Jonathan Gael",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:"Viernes 2pm c/15"}, 
  {id:150,name:"Jordy",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:"Miércoles 1pm"}, 
  {id:151,name:"José Daniel Cáceres",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:"Lunes 4pm"}, 
  {id:152,name:"Julián París",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:"Miércoles 4pm c/15"}, 
  {id:153,name:"Luca Sánchez",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:"Jueves Discovery semanal"}, 
  {id:154,name:"Lucia Ghiringhelli",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:"Miércoles 10am c/15"}, 
  {id:155,name:"Luis Ignacio",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:"Martes 8am c/15"}, 
  {id:156,name:"Mateo Arrieta",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:"Lunes 2pm"}, 
  {id:157,name:"Samantha",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:""}, 
  {id:158,name:"Saúl Avila",status:"alta",therapist:"Raquel",assigned:"",notes:"Alta"}, 
  {id:159,name:"Tomás Alfaro",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:"Lunes 4pm"}, 
  {id:160,name:"Tomas Longston",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:"Viernes 6pm c/15"}, 
  {id:161,name:"Valentina",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:"Martes 3pm"}, 
  {id:162,name:"Yoel Muñoz",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:"Agenda cuando llama"}, 
  {id:163,name:"Zachari",status:"terapia",therapist:"Raquel",assigned:"Raquel",notes:"Lunes 5pm"}, 
  {id:164,name:"Ainhoa Ramirez",status:"inactivo",therapist:"",assigned:"",notes:""}, 
  {id:165,name:"Alejandro de León",status:"inactivo",therapist:"",assigned:"",notes:"Proceso suspendido"}, 
  {id:166,name:"Alejandro Monge",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:167,name:"Alejandro Navarrete",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:168,name:"Alessa Gomez",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:169,name:"Ana Isabel Alvarado (adulta)",status:"inactivo",therapist:"",assigned:"",notes:"Proceso suspendido"}, 
  {id:170,name:"Andrés Chavarría",status:"inactivo",therapist:"",assigned:"",notes:"Proceso suspendido"}, 
  {id:171,name:"Anna Lizbeth",status:"alta",therapist:"",assigned:"",notes:"Alta"}, 
  {id:172,name:"Antonio Montealegre",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:173,name:"Axel Cambronero",status:"inactivo",therapist:"",assigned:"",notes:""}, 
  {id:174,name:"Benjamin Escalante",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:175,name:"Cameron Guillén",status:"inactivo",therapist:"",assigned:"",notes:""}, 
  {id:176,name:"Daniel Vargas",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:177,name:"Elean Mora",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:178,name:"Ella Castro Perez",status:"inactivo",therapist:"",assigned:"",notes:"No regresó"}, 
  {id:179,name:"Emma Angulo",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:180,name:"Emma Espinoza",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:181,name:"Enrique Garzona",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:182,name:"Erick Apuy",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:183,name:"Ernesto Acosta",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:184,name:"Eva Ulate",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:185,name:"Fabiana Alfaro",status:"alta",therapist:"",assigned:"",notes:"Alta a partir de septiembre"}, 
  {id:186,name:"Fabiana Rodríguez Bustamante",status:"inactivo",therapist:"",assigned:"",notes:""}, 
  {id:187,name:"Federico Medioty",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:188,name:"Felipe Valladares",status:"inactivo",therapist:"",assigned:"",notes:""}, 
  {id:189,name:"Fernán Alonso",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:190,name:"Francisco Arévalo",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:191,name:"Gabriel Carr",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:192,name:"Gabriel Jimenez",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:193,name:"Gonzalo Fuentes",status:"inactivo",therapist:"",assigned:"",notes:"Proceso suspendido"}, 
  {id:194,name:"Hector Porras",status:"inactivo",therapist:"",assigned:"",notes:"No regresó"}, 
  {id:195,name:"Helena Bustamante",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:196,name:"Ian Hernandez",status:"inactivo",therapist:"",assigned:"",notes:"Proceso suspendido"}, 
  {id:197,name:"Isaís Ostaszynski",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:198,name:"Ismael Duran",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:199,name:"Jared Ottero",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:200,name:"Javier Sarnowski",status:"alta",therapist:"",assigned:"",notes:"Alta"}, 
  {id:201,name:"Javier Solis",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:202,name:"John Baronne",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:203,name:"Juan Manuel",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:204,name:"Julian Alfaro",status:"evaluacion",therapist:"",assigned:"",notes:""}, 
  {id:205,name:"Julián Ramirez",status:"inactivo",therapist:"",assigned:"",notes:"Proceso suspendido"}, 
  {id:206,name:"Julian Urcuyo",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:207,name:"Leandro Traña",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:208,name:"Leonardo Cortes",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:209,name:"Leonor Gomez",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:210,name:"Liam",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:211,name:"Lorenzo Navarro",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:212,name:"Lucas Montero",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:213,name:"Lucía Bonilla",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:214,name:"Lucia Rodriguez",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:215,name:"Lucia Spinach",status:"inactivo",therapist:"",assigned:"",notes:"No regresó"}, 
  {id:216,name:"Luciana Aguilar",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:217,name:"Luciana Longhi",status:"inactivo",therapist:"",assigned:"",notes:"Proceso suspendido"}, 
  {id:218,name:"Luciana Montecillos",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:219,name:"Luciana Montero",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:220,name:"Luciano Gomez",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:221,name:"Luis Diego",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:222,name:"Mariano Cordero",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:223,name:"Marina Pinheiro",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:224,name:"Nicolas Matamoros",status:"inactivo",therapist:"",assigned:"",notes:""}, 
  {id:225,name:"Noah (primo de Meir)",status:"inactivo",therapist:"",assigned:"",notes:""}, 
  {id:226,name:"Oliver Aita",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:227,name:"Phillipe Espir",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:228,name:"Samuel Carmona",status:"inactivo",therapist:"",assigned:"",notes:"Proceso suspendido"}, 
  {id:229,name:"Samuel Villalobos",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:230,name:"Santiago Quesada",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:231,name:"Saúl Castillo",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:232,name:"Saúl Cortes",status:"inactivo",therapist:"",assigned:"",notes:""}, 
  {id:233,name:"Saúl Tercero",status:"inactivo",therapist:"",assigned:"",notes:"Proceso suspendido"}, 
  {id:234,name:"Sebastian Bravo",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:235,name:"Sebastian Guido",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:236,name:"Sebastián Polanco",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:237,name:"Sebastian Solis",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:238,name:"Sofia Quirós",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:239,name:"Sofía Sheehan",status:"inactivo",therapist:"",assigned:"",notes:"Proceso suspendido"}, 
  {id:240,name:"Theo Quintero",status:"inactivo",therapist:"",assigned:"",notes:"No regresó"}, 
  {id:241,name:"Thomas Vega (Yoses)",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:242,name:"Tomás Elizondo",status:"evaluacion",therapist:"",assigned:"",notes:""}, 
  {id:243,name:"Valentina Camacho",status:"terapia",therapist:"",assigned:"",notes:""}, 
  {id:244,name:"Valentina Canella",status:"inactivo",therapist:"",assigned:"",notes:"No regresó"}, 
  {id:245,name:"Valentina Gordienko",status:"inactivo",therapist:"",assigned:"",notes:"Proceso suspendido"}, 
];

// ── Schedule init ────────────────────────────────────────────────────────────
const initSchedule = () => {
  const s = {};
  THERAPISTS.forEach(t => { s[t] = {}; DAYS.forEach(d => { s[t][d] = {}; HOURS.forEach(h => { s[t][d][h] = ""; }); }); });
  const f = (t,d,h,v) => { if(s[t]?.[d]?.[h]!==undefined) s[t][d][h]=v; };
  // Karol - Lunes
  f("Karol","Lunes","9am","Ignacio M / Roberto Chaves");
  f("Karol","Lunes","10am","Nicolás Berrocal");
  f("Karol","Lunes","11am","Gabriel Chavez");
  f("Karol","Lunes","12md","Isabella Chinchilla");
  f("Karol","Lunes","1pm","Samantha Soto");
  f("Karol","Lunes","3pm","Felipe Alfaro");
  f("Karol","Lunes","4pm","Felipe Bermúdez");
  f("Karol","Lunes","5pm","Sofía Brenes / Nikola / Gabriel / Alejandro Osborne");
  // Karol - Martes
  f("Karol","Martes","10am","Benjamin Dobles");
  f("Karol","Martes","11am","Tomás Vargas");
  f("Karol","Martes","12md","Fernando Barreto");

  f("Karol","Martes","3pm","Axel Vega");
  f("Karol","Martes","4pm","Daniel H");

  // Karol - Miércoles
  f("Karol","Miércoles","9am","Patrick Longston / Matías Vega");
  f("Karol","Miércoles","10am","Sebastián Ramírez / Melina P");
  f("Karol","Miércoles","11am","Antonio Monge");
  f("Karol","Miércoles","12md","Alejandro Fait");
  f("Karol","Miércoles","3pm","Gonzalo Chaverri");
  f("Karol","Miércoles","4pm","Juliana Ramírez / Sebastián Esquivel / Arath (c/15)");
  f("Karol","Miércoles","5pm","Lucía");
  // Karol - Viernes
  f("Karol","Viernes","11am","Yao Man");
  f("Karol","Viernes","12md","Camila Zúñiga");
  f("Karol","Viernes","1pm","David Quirós");
  f("Karol","Viernes","2pm","Julián Soto");
  // Krissya - Martes
  f("Krissya","Martes","9am","Tomás Coto (Finland)");
  f("Krissya","Martes","1pm","Nawel (c/15)");
  f("Krissya","Martes","2pm","Elena Carvajal (c/15)");
  f("Krissya","Martes","3pm","Felipe Ruiz / Tomás Harrington (c/15)");
  f("Krissya","Martes","4pm","Nicolás Fajardo / Enrique Bonilla");
  f("Krissya","Martes","5pm","Santiago Gael");
  // Krissya - Miércoles
  f("Krissya","Miércoles","8am","Home two: Sofía / Matías (c/15) / Franco (semanal) — Valentina y Felipe (por evaluar)");
  f("Krissya","Miércoles","11am","Irene");
  f("Krissya","Miércoles","12md","Juliana Colombari");
  f("Krissya","Miércoles","2pm","Tiago Vargas");
  f("Krissya","Miércoles","3pm","Tomás Harrington (c/15) / Romano (c/15 alternos)");
  f("Krissya","Miércoles","4pm","Sebastián Ríos (c/15) / Gabriel Carvajal (semanal) / Eithan (c/15) / Bruno Capra (c/15)");
  f("Krissya","Miércoles","5pm","Gonzalo");
  f("Krissya","Miércoles","6pm","🗓 Espacio de evaluación");
  // Krissya - Jueves
  f("Krissya","Jueves","5pm","PEERS");
  // Krissya - Viernes
  f("Krissya","Viernes","10am","Home Two: Valentina y Felipe (evaluaciones nuevas)");
  f("Krissya","Viernes","11am","Home Two: Valentina y Felipe (evaluaciones nuevas)");
  f("Krissya","Viernes","1pm","Fabián Zumbado (semanal)");
  f("Krissya","Viernes","2pm","Luciano Gutiérrez");
  // Fernanda - Martes
  f("Fernanda","Martes","3pm","Catalina Hena");
  f("Fernanda","Martes","4pm","Vero Hasbun / Irene Bonilla");
  f("Fernanda","Martes","5pm","Fabiana Romero (c/15)");
  f("Fernanda","Martes","6pm","Diego Calderón (c/15)");
  // Fernanda - Sábados
  f("Fernanda","Sábados","8am","Gael Bustamante (c/15) / Luis Ignacio Vindas (c/15) / Luca Sánchez (c/15 🥭?)");
  f("Fernanda","Sábados","9am","Santiago Arévalo (c/15) / Diego Rodríguez (c/15) / Dylan Fuentes (🥭?) / David Gruter (c/15)");
  f("Fernanda","Sábados","10am","Alberto Mora (🥭?) / Fabiana Rosales (🥭?) / Santiago Ingianna (🥭?)");
  f("Fernanda","Sábados","11am","Gabriel Piedra (c/15) / Anderson Morales (c/15)");
  // Laura - Lunes: no viene al consultorio
  // Laura - Martes
  f("Laura","Martes","1pm","Ariana (c/15) / Belén (semanal)");
  f("Laura","Martes","2pm","Alessio");
  f("Laura","Martes","3pm","Felipe");
  f("Laura","Martes","4pm","🗓 Espacio de evaluación");
  f("Laura","Martes","5pm","Fabricio Escalona");
  f("Laura","Martes","6pm","Leonora Calvo");
  // Laura - Miércoles
  f("Laura","Miércoles","1pm","Felipe Stauffer");

  f("Laura","Miércoles","3pm","Samantha Mora / Elena Pérez");
  f("Laura","Miércoles","4pm","Nicolás Pichardo / Elisa Araús");
  f("Laura","Miércoles","5pm","Julián García / Julián Komailizadeh / Tomás Vega");
  // Laura - Jueves
  f("Laura","Jueves","11am","Kendall Mena");
  f("Laura","Jueves","12md","Gabriel Medrano / Nicolás Acuña (c/15 alternan)");
  f("Laura","Jueves","1pm","Matías Kim / Emiliano");
  f("Laura","Jueves","2pm","Alejandro Alvarado");
  f("Laura","Jueves","3pm","Fabio");
  f("Laura","Jueves","4pm","Nicolás Sarnowski");
  f("Laura","Jueves","5pm","Mateo Mayorga");
  f("Laura","Jueves","6pm","Nicolás Meneses");
  // Laura - Viernes
  f("Laura","Viernes","8am","Coordinación TO / Eva");
  f("Laura","Viernes","9am","Coordinación TO");
  f("Laura","Viernes","10am","Isabella Gómez");
  f("Laura","Viernes","11am","Gadiel Aguilar");
  // Raquel - Lunes
  f("Raquel","Lunes","2pm","Mateo Arrieta / Carlos Cossio");
  f("Raquel","Lunes","3pm","Samantha");
  f("Raquel","Lunes","4pm","Tomás Alfaro");
  f("Raquel","Lunes","5pm","Zachari");
  // Raquel - Martes
  f("Raquel","Martes","8am","Luis Ignacio (c/15)");
  f("Raquel","Martes","10am","Ian Rojas (c/15)");
  f("Raquel","Martes","11am","Luciano");
  f("Raquel","Martes","3pm","Valentina");
  f("Raquel","Martes","4pm","Samantha");
  f("Raquel","Martes","5pm","Franco Obando / Benjamin Vargas (alternan c/15)");
  // Raquel - Miércoles
  f("Raquel","Miércoles","12md","Luciano");
  f("Raquel","Miércoles","1pm","Jordy");
  f("Raquel","Miércoles","2pm","Julián S");
  f("Raquel","Miércoles","3pm","Samantha");
  f("Raquel","Miércoles","4pm","Julián París / Isabella Leal");
  f("Raquel","Miércoles","5pm","Antonio Rodríguez");
  // Raquel - Jueves
  f("Raquel","Jueves","8am","Claudio (Británica c/15) / Eli (Discovery c/15)");

  f("Raquel","Jueves","10am","Luca (Discovery semanal) / Lucía Ghiringhelli (Discovery c/15)");
  f("Raquel","Jueves","10am","Lucía Ghiringhelli (Discovery c/15)");
  f("Raquel","Jueves","12md","Vicente");
  f("Raquel","Jueves","1pm","Felipe Alfaro");

  f("Raquel","Jueves","3pm","Samantha");
  f("Raquel","Jueves","4pm","Alyssa / Felipe Alvarado / Isaías (c/15)");
  f("Raquel","Jueves","5pm","Alejandro Coto");
  // Raquel - Viernes
  f("Raquel","Viernes","8am","Eva Ulate");
  f("Raquel","Viernes","1pm","Emiliano / Cristian (c/15)");
  f("Raquel","Viernes","2pm","Jonathan Gael (c/15) / Ariel (c/15)");
  return s;
};

// ── Shared styles ────────────────────────────────────────────────────────────
const thStyle = { padding:"10px 12px", fontWeight:700, fontSize:11, color:C.dark, textTransform:"uppercase", letterSpacing:"0.05em", whiteSpace:"nowrap", borderBottom:`2px solid ${C.border}` };
const tdStyle = { padding:"7px 12px", fontSize:13, verticalAlign:"middle", borderBottom:`1px solid ${C.border}` };
const navBtn = { padding:"7px 14px", background:C.white, border:`1px solid ${C.border}`, borderRadius:6, cursor:"pointer", fontSize:16, color:C.dark, fontWeight:700 };
const selStyle = { padding:"8px 12px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, background:C.white, color:C.dark, fontFamily:"inherit", cursor:"pointer" };
const inputStyle = { padding:"7px 10px", borderRadius:6, border:`1px solid ${C.border}`, fontSize:12, fontFamily:"inherit", outline:"none", background:C.white };
const smallBtn = { padding:"4px 8px", borderRadius:5, border:"none", cursor:"pointer", fontSize:12, fontWeight:700 };

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("horarios");
  const [currentMonth, setCurrentMonth] = useState(5);
  const [currentYear] = useState(2026);
  const [monthlySchedules, setMonthlySchedules] = useState(() => loadFromStorage("cv_schedules") || { "2026-5": initSchedule() });
  const [activeTherapist, setActiveTherapist] = useState("Laura");
  const [patients, setPatients] = useState(() => loadFromStorage("cv_patients") || INIT_PATIENTS);
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
    loadFromSupabase().then(({ patients: pts, schedules: schs }) => {
      if (pts && pts.length > 0) {
        setPatients(pts);
        saveToStorage("cv_patients", pts);
      } else {
        // First load: push local data to Supabase
        const local = loadFromStorage("cv_patients") || INIT_PATIENTS;
        syncPatients(local);
      }
      if (schs && schs.length > 0) {
        const schMap = {};
        schs.forEach(s => { schMap[s.month_key] = s.data; });
        setMonthlySchedules(schMap);
        saveToStorage("cv_schedules", schMap);
      }
    });
  }, []);



  const getSchedule = () => {
    if (!monthlySchedules[monthKey]) {
      const prevKey = currentMonth === 0 ? `${currentYear-1}-11` : `${currentYear}-${currentMonth-1}`;
      const base = monthlySchedules[prevKey] ? JSON.parse(JSON.stringify(monthlySchedules[prevKey])) : initSchedule();
      setMonthlySchedules(prev => ({ ...prev, [monthKey]: base }));
      return base;
    }
    return monthlySchedules[monthKey];
  };
  const schedule = getSchedule();

  const updateCell = (t,d,h,v) => setMonthlySchedules(prev => {
    const updated = {
      ...prev, [monthKey]: { ...prev[monthKey], [t]: { ...prev[monthKey][t], [d]: { ...prev[monthKey][t][d], [h]:v } } }
    };
    saveToStorage("cv_schedules", updated);
    syncSchedule(monthKey, updated[monthKey]);
    return updated;
  });
  const startEdit = (t,d,h) => { setEditingCell(`${t}-${d}-${h}`); setCellValue(schedule[t]?.[d]?.[h]||""); };
  const commitEdit = (t,d,h) => { updateCell(t,d,h,cellValue); setEditingCell(null); };
  const countAvailable = (t) => { let c=0; DAYS.forEach(d=>HOURS.forEach(h=>{ if(!schedule[t]?.[d]?.[h]) c++; })); return c; };

  const filteredPatients = patients.filter(p => {
    const mS = filterStatus==="todos"||p.status===filterStatus;
    const mT = filterTherapist==="todos"||p.therapist===filterTherapist||p.assigned===filterTherapist;
    const mQ = !searchPatient||p.name.toLowerCase().includes(searchPatient.toLowerCase());
    return mS && mT && mQ;
  });

  const addPatient = () => {
    if (!newPatient.name.trim()) return;
    setPatients(prev => {
      const updated = [...prev, { ...newPatient, id: Date.now() }];
      saveToStorage("cv_patients", updated);
      syncPatients(updated);
      return updated;
    });
    setNewPatient({ name:"", therapist:"Laura", status:"evaluacion", notes:"", assigned:"" });
    setShowAddPatient(false);
  };
  const saveEditPatient = () => {
    setPatients(prev => {
      const updated = prev.map(p=>p.id===editingPatient.id?editingPatient:p);
      saveToStorage("cv_patients", updated);
      syncPatients(updated);
      return updated;
    });
    setEditingPatient(null);
  };
  const deletePatient = (id) => {
    setPatients(prev => {
      const updated = prev.filter(p=>p.id!==id);
      saveToStorage("cv_patients", updated);
      syncPatients(updated);
      return updated;
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
          <button onClick={() => {
            if(window.confirm("¿Resetear todos los cambios al estado original del código?")) {
              localStorage.removeItem("cv_patients");
              localStorage.removeItem("cv_schedules");
              window.location.reload();
            }
          }} style={{ padding:"6px 10px", background:"transparent", border:"1px solid rgba(255,255,255,0.2)", borderRadius:6, color:"rgba(255,255,255,0.5)", fontSize:11, cursor:"pointer" }} title="Resetear datos">
            ↺ Reset
          </button>
          {[["horarios","📅 Horarios"],["pacientes","👥 Pacientes"]].map(([t,lbl])=>(
            <button key={t} onClick={()=>setTab(t)} style={{ padding:"8px 16px", borderRadius:6, border:"none", cursor:"pointer", fontWeight:600, fontSize:13, background:tab===t?C.sage:"transparent", color:tab===t?C.white:C.light }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* ── HORARIOS TAB ── */}
      {tab==="horarios" && (
        <div style={{ padding:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18, flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <button onClick={()=>setCurrentMonth(m=>m===0?11:m-1)} style={navBtn}>‹</button>
              <div style={{ background:C.dark, color:C.white, padding:"8px 20px", borderRadius:8, fontWeight:700, fontSize:14, minWidth:150, textAlign:"center" }}>
                {MONTHS[currentMonth]} {currentYear}
              </div>
              <button onClick={()=>setCurrentMonth(m=>m===11?0:m+1)} style={navBtn}>›</button>
            </div>
            <div style={{ fontSize:11, color:C.muted, background:C.white, padding:"6px 12px", borderRadius:6, border:`1px solid ${C.border}` }}>
              💡 Cada mes es independiente — historial automático
            </div>
          </div>

          {/* Therapist tabs */}
          <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
            {THERAPISTS.map(t=>(
              <button key={t} onClick={()=>setActiveTherapist(t)} style={{ padding:"8px 14px", borderRadius:8, border:`2px solid ${activeTherapist===t?therapistColor(t):C.border}`, background:activeTherapist===t?therapistColor(t):C.white, color:activeTherapist===t?C.white:C.dark, fontWeight:600, fontSize:13, cursor:"pointer" }}>
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
                              onClick={()=>!isEdit&&!unavailable&&startEdit(activeTherapist,d,h)}>
                            {isEdit?(
                              <input autoFocus value={cellValue} onChange={e=>setCellValue(e.target.value)}
                                onBlur={()=>commitEdit(activeTherapist,d,h)}
                                onKeyDown={e=>{if(e.key==="Enter")commitEdit(activeTherapist,d,h);if(e.key==="Escape")setEditingCell(null);}}
                                style={{ width:"100%", border:"none", background:"#D4ECD8", borderRadius:4, padding:"4px 6px", fontSize:12, outline:`2px solid ${therapistColor(activeTherapist)}`, fontFamily:"inherit" }}/>
                            ):val?(
                              <div style={{ fontSize:12, lineHeight:1.35, padding:"2px 4px" }}>
                                {val.includes("c/15")&&<span style={{ display:"inline-block", width:5, height:5, borderRadius:"50%", background:C.accent, marginRight:4, verticalAlign:"middle" }}/>}
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
              Click en cualquier celda para editar · ● = sesión cada 15 días
            </div>
          </div>

          {/* Overview */}
          <div style={{ marginTop:20 }}>
            <div style={{ fontWeight:700, fontSize:13, color:C.dark, marginBottom:10 }}>Resumen — {MONTHS[currentMonth]}</div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {THERAPISTS.map(t=>{
                const total=DAYS.length*HOURS.length, used=total-countAvailable(t), pct=Math.round((used/total)*100);
                return (
                  <div key={t} style={{ background:C.white, borderRadius:10, padding:"12px 16px", border:`1px solid ${C.border}`, minWidth:130, flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:therapistColor(t), marginBottom:6 }}>{t}</div>
                    <div style={{ height:5, background:C.border, borderRadius:3, marginBottom:6 }}>
                      <div style={{ height:5, background:therapistColor(t), borderRadius:3, width:`${pct}%` }}/>
                    </div>
                    <div style={{ fontSize:11, color:C.muted }}><b style={{color:C.dark}}>{used}</b> ocup · <b style={{color:C.sage}}>{countAvailable(t)}</b> libres</div>
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
          <div style={{ background:C.white, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
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
                  const st=PATIENT_STATUS[p.status];
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
                            <span style={{ color:C.sage, fontWeight:600 }}>{fromSchedule}</span>
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
                              <button onClick={()=>setEditingPatient({...p})} style={{ ...smallBtn, background:`${C.blue}18`, color:C.blue }}>✎</button>
                              <button onClick={()=>deletePatient(p.id)} style={{ ...smallBtn, background:`${C.red}18`, color:C.red }}>✕</button>
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
    </div>
  );
}
