/** Data adapter. Requires Supabase Auth access_token, never a publishable key as bearer. */
export class ConflictError extends Error {
  constructor() { super('Otra persona modificó este registro. Actualizá los datos antes de guardar.'); this.name = 'ConflictError'; }
}
export function createStore({url, publishableKey, getAccessToken, fetcher = fetch}) {
  async function request(path, method = 'GET', body) {
    const token = await getAccessToken();
    if (!token || token.startsWith('sb_')) throw new Error('Iniciá sesión para acceder.');
    const response = await fetcher(`${url}/rest/v1/${path}`, {
      method, headers: {apikey: publishableKey, Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json', Prefer: 'return=representation'},
      ...(body === undefined ? {} : {body: JSON.stringify(body)}),
    });
    if (!response.ok) throw new Error(`No se pudo completar la operación (${response.status}). Conservá tu edición y volvé a intentar.`);
    if (response.status === 204) return null;
    return response.json();
  }
  async function update(table, filter, patch) {
    const rows = await request(`${table}?${filter}`, 'PATCH', patch);
    if (!Array.isArray(rows) || rows.length !== 1) throw new ConflictError();
    return rows[0];
  }
  return {
    async load() {
      // Paginate rather than silently truncating historical patients at the API row cap.
      const patients = [];
      for (let offset = 0;; offset += 500) {
        const page = await request(`patients?select=*&order=id&limit=500&offset=${offset}`);
        if (!Array.isArray(page)) throw new Error('Respuesta de pacientes inválida.');
        patients.push(...page);
        if (page.length < 500) break;
      }
      return {patients};
    },
    async loadMonth(monthKey) {
      const cells = [];
      for (let offset = 0;; offset += 500) {
        const page = await request(`cv_schedule_cells?month_key=eq.${encodeURIComponent(monthKey)}&select=*&order=id&limit=500&offset=${offset}`);
        if (!Array.isArray(page)) throw new Error('Respuesta de horario inválida.');
        cells.push(...page);
        if (page.length < 500) break;
      }
      return cells;
    },
    async addPatient(patient) {
      const name = patient.name?.trim();
      if (!name) throw new Error('Escribí el nombre.');
      const rows = await request('patients', 'POST', {name, status: patient.status,
        therapist: patient.therapist || '', assigned: patient.assigned || '', notes: patient.notes || ''});
      if (!Array.isArray(rows) || rows.length !== 1) throw new Error('No se pudo confirmar el registro. Actualizá antes de reintentar.');
      return rows[0];
    },
    savePatient(patient, expectedRevision) {
      const name = patient.name?.trim();
      if (!name) throw new Error('Escribí el nombre.');
      return update('patients', `id=eq.${encodeURIComponent(patient.id)}&revision=eq.${expectedRevision}`,
        {name, status: patient.status, therapist: patient.therapist || '', assigned: patient.assigned || '', notes: patient.notes || ''});
    },
    // Archive retains history; no hard delete or batch upsert.
    archivePatient(patient) { return this.savePatient({...patient, status:'inactivo'}, patient.revision); },
    saveCell(cell, value) {
      return update('cv_schedule_cells', `id=eq.${encodeURIComponent(cell.id)}&revision=eq.${cell.revision}`, {value});
    },
    createMonth(monthKey, sourceMonthKey = null) {
      return request('rpc/cv_create_month', 'POST', {target_month:monthKey, source_month:sourceMonthKey});
    },
  };
}

/** Sequential polling: errors reach the UI; no background writes, no local seed fallback. */
export function watch(load, onData, onError, interval = 5000) {
  let stopped = false, timer;
  async function tick() {
    try { const data = await load(); if (!stopped) onData(data); }
    catch (error) { if (!stopped) onError(error); }
    finally { if (!stopped) timer = setTimeout(tick, interval); }
  }
  tick();
  return () => { stopped = true; clearTimeout(timer); };
}
export function moveMonth(year, month, delta) {
  const d = new Date(Date.UTC(year, month + delta, 1));
  return {year:d.getUTCFullYear(), month:d.getUTCMonth()};
}
export function summarizeSlots(slots) {
  return slots.reduce((s, x) => {
    if (!x.available) return s;
    s.capacity++;
    if (!x.value.trim()) s.free++;
    else if (x.value.includes('🗓')) s.evaluationReserved++;
    else s.occupied++;
    return s;
  }, {capacity:0, free:0, evaluationReserved:0, occupied:0});
}
