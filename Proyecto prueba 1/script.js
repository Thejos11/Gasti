/* ============ Gasti ============
 * Capa de datos (Store) aislada para poder reemplazarla por Supabase.
 * Hoy persiste SOLO en localStorage de este navegador. No hay envío real
 * de notificaciones ni sincronización: la interfaz lo indica.
 * Nunca pongas claves secretas aquí; con Supabase usa solo la anon key + RLS.
 */
'use strict';

/* ---------- Utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
const cop = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);
const sameDay = (a, b) => a.toDateString() === b.toDateString();
const startOfDay = d => { d = new Date(d); d.setHours(0, 0, 0, 0); return d; };
const fmtDate = d => new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
const fmtTime = d => new Date(d).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
const toLocalInput = d => { d = new Date(d); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const toDateInput = d => toLocalInput(d).slice(0, 10);

const CATS = {
  alimentacion: { name: 'Alimentación', icon: 'i-food', color: '#8B5CF6' },
  transporte: { name: 'Transporte', icon: 'i-car', color: '#A78BFA' },
  entretenimiento: { name: 'Entretenimiento', icon: 'i-play', color: '#6D28D9' },
  compras: { name: 'Compras', icon: 'i-bag', color: '#C4B5FD' },
  servicios: { name: 'Servicios', icon: 'i-bolt', color: '#4C1D95' },
  otros: { name: 'Otros', icon: 'i-dots', color: '#7C7C8A' }
};
const METHODS = ['Efectivo', 'Tarjeta débito', 'Tarjeta crédito', 'Nequi / Daviplata', 'Transferencia'];
const FREQ = { weekly: 'Semanal', monthly: 'Mensual', yearly: 'Anual' };
const ic = (id) => `<svg class="ico"><use href="#${id}"/></svg>`;

/* ---------- Store ---------- */
const KEY = 'gasti.v1';
const Store = {
  data: { user: null, expenses: [], subs: [], notifs: [], settings: { currency: 'COP', tz: 'America/Bogota', income: 0, budget: 0, remindDays: 3, push: false, notifTypes: { renewals: true, reminders: true, summaries: true } } },
  load() { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d) this.data = { ...this.data, ...d, settings: { ...this.data.settings, ...d.settings } }; } catch { } },
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); return true; } catch { toast('No se pudo guardar en el navegador', true); return false; } },
  logout() { this.data.user = null; this.save(); },
  addNotif(title, text, type = 'confirm') { this.data.notifs.unshift({ id: uid(), title, text, type, date: new Date().toISOString(), read: false }); }
};

function seedDemo() {
  const now = new Date(), d = Store.data;
  const mk = (daysAgo, h, desc, amount, cat, method) => { const t = new Date(now); t.setDate(t.getDate() - daysAgo); t.setHours(h, 15, 0, 0); return { id: uid(), desc, amount, cat, method, notes: '', date: t.toISOString() }; };
  d.expenses = [
    mk(0, 8, 'Tinto y empanada', 6500, 'alimentacion', 'Efectivo'), mk(0, 12, 'Almuerzo corrientazo', 18000, 'alimentacion', 'Nequi / Daviplata'),
    mk(1, 7, 'Bus TransMilenio', 3200, 'transporte', 'Tarjeta débito'), mk(1, 16, 'Gaseosa y papas', 7500, 'alimentacion', 'Efectivo'),
    mk(2, 19, 'Cine', 32000, 'entretenimiento', 'Tarjeta crédito'), mk(3, 9, 'Café', 5800, 'alimentacion', 'Efectivo'),
    mk(3, 20, 'Uber', 14800, 'transporte', 'Tarjeta crédito'), mk(4, 13, 'Camiseta', 69900, 'compras', 'Tarjeta crédito'),
    mk(5, 10, 'Recibo de agua', 54000, 'servicios', 'Transferencia'), mk(6, 8, 'Tinto', 3000, 'alimentacion', 'Efectivo'),
    mk(8, 12, 'Almuerzo', 21000, 'alimentacion', 'Nequi / Daviplata'), mk(10, 18, 'Recarga celular', 20000, 'servicios', 'Nequi / Daviplata'),
    mk(12, 9, 'Café', 5800, 'alimentacion', 'Efectivo'), mk(15, 21, 'Videojuego', 89000, 'entretenimiento', 'Tarjeta crédito'),
    mk(22, 11, 'Mercado', 142000, 'alimentacion', 'Tarjeta débito'), mk(28, 15, 'Taxi', 18000, 'transporte', 'Efectivo'),
    mk(33, 12, 'Almuerzo', 19000, 'alimentacion', 'Efectivo'), mk(38, 17, 'Zapatos', 120000, 'compras', 'Tarjeta crédito'), mk(41, 9, 'Café', 5500, 'alimentacion', 'Efectivo')
  ];
  const nx = n => { const t = new Date(now); t.setDate(t.getDate() + n); return toDateInput(t); };
  d.subs = [
    { id: uid(), name: 'Netflix', price: 38900, freq: 'monthly', next: nx(2), status: 'active', remind: 3 },
    { id: uid(), name: 'Spotify', price: 16900, freq: 'monthly', next: nx(9), status: 'active', remind: 3 },
    { id: uid(), name: 'iCloud', price: 4900, freq: 'monthly', next: nx(15), status: 'active', remind: 1 },
    { id: uid(), name: 'Gimnasio', price: 12000, freq: 'weekly', next: nx(4), status: 'active', remind: 1 },
    { id: uid(), name: 'Dominio web', price: 65000, freq: 'yearly', next: nx(120), status: 'active', remind: 7 },
    { id: uid(), name: 'HBO Max', price: 24900, freq: 'monthly', next: nx(20), status: 'cancelled', remind: 3 }
  ];
  d.settings.income = 3500000; d.settings.budget = 1200000;
  d.notifs = [];
  Store.addNotif('Datos de ejemplo cargados', 'Estás viendo información ficticia. Puedes borrarla desde Configuración.', 'confirm');
}

/* ---------- Cálculos ---------- */
const subStatus = s => { if (s.status === 'cancelled') return 'cancelled'; const days = daysUntil(s.next); return days <= (s.remind ?? 3) + 4 && days >= 0 ? 'soon' : 'active'; };
const daysUntil = ds => Math.round((startOfDay(ds + 'T00:00') - startOfDay(new Date())) / 864e5);
const monthlyCost = s => s.freq === 'weekly' ? s.price * 52 / 12 : s.freq === 'yearly' ? s.price / 12 : s.price;
const sum = a => a.reduce((t, e) => t + e.amount, 0);
function stats() {
  const ex = Store.data.expenses, now = new Date();
  const inMonth = (e, m, y) => { const d = new Date(e.date); return d.getMonth() === m && d.getFullYear() === y; };
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const month = ex.filter(e => inMonth(e, now.getMonth(), now.getFullYear()));
  const prevM = ex.filter(e => inMonth(e, prev.getMonth(), prev.getFullYear()));
  const today = ex.filter(e => sameDay(new Date(e.date), now));
  const byCat = {}; month.forEach(e => byCat[e.cat] = (byCat[e.cat] || 0) + e.amount);
  const days = [...Array(7)].map((_, i) => { const d = new Date(now); d.setDate(d.getDate() - (6 - i)); return { d, total: sum(ex.filter(e => sameDay(new Date(e.date), d))) }; });
  const months = [...Array(6)].map((_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1); return { d, total: sum(ex.filter(e => inMonth(e, d.getMonth(), d.getFullYear()))) }; });
  const small = ex.filter(e => e.amount <= 20000 && (now - new Date(e.date)) < 30 * 864e5);
  const smallGroups = {}; small.forEach(e => { const k = e.desc.trim().toLowerCase(); (smallGroups[k] ||= { name: e.desc, n: 0, total: 0 }).n++; smallGroups[k].total += e.amount; });
  return { month, prevM, today, byCat, days, months, total: sum(month), prevTotal: sum(prevM), todayTotal: sum(today), small, smallTop: Object.values(smallGroups).filter(g => g.n >= 2).sort((a, b) => b.total - a.total).slice(0, 5) };
}
function refreshNotifs() { // Notificaciones derivadas de suscripciones (locales, no push)
  const { subs, notifs, settings } = Store.data; if (!settings.notifTypes.renewals) return;
  subs.filter(s => subStatus(s) === 'soon').forEach(s => {
    const id = `renew-${s.id}-${s.next}`;
    if (!notifs.some(n => n.id === id)) notifs.unshift({ id, title: `${s.name} se renueva ${daysUntil(s.next) === 0 ? 'hoy' : 'en ' + daysUntil(s.next) + ' d'}`, text: `${cop(s.price)} · ${FREQ[s.freq].toLowerCase()}`, type: 'renewal', date: new Date().toISOString(), read: false });
  });
}

/* ---------- UI helpers ---------- */
function toast(msg, error) { const t = document.createElement('div'); t.className = 'toast' + (error ? ' error' : ''); t.textContent = msg; $('#toasts').append(t); setTimeout(() => t.remove(), 3500); }
function delta(cur, prev) {
  if (!prev) return `<span class="pill neutral">Sin mes anterior</span>`;
  const p = Math.round((cur - prev) / prev * 100), up = p > 0;
  return `<span class="pill ${up ? 'bad' : 'ok'}">${ic(up ? 'i-up' : 'i-down')}${Math.abs(p)}% vs mes anterior</span>`;
}
function emptyState(icon, title, text, btn) { return `<div class="empty"><div class="art">${ic(icon)}</div><h3>${title}</h3><p>${text}</p>${btn || ''}</div>`; }
function donut(byCat) {
  const total = Object.values(byCat).reduce((a, b) => a + b, 0); if (!total) return '';
  const R = 70, C = 2 * Math.PI * R; let off = 0;
  const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const segs = entries.map(([k, v]) => { const len = v / total * C; const s = `<circle cx="85" cy="85" r="${R}" stroke="${CATS[k].color}" stroke-dasharray="${Math.max(len - 3, 0)} ${C}" stroke-dashoffset="${-off}" stroke-linecap="round"/>`; off += len; return s; }).join('');
  return `<div class="donut-wrap"><div class="donut"><svg viewBox="0 0 170 170" role="img" aria-label="Gastos por categoría"><circle cx="85" cy="85" r="${R}" stroke="rgba(255,255,255,.05)"/>${segs}</svg><div class="center"><small>Total</small><b class="num">${cop(total)}</b></div></div>
  <div class="legend">${entries.map(([k, v]) => `<div><i style="background:${CATS[k].color}"></i><span>${CATS[k].name}</span><span class="num">${Math.round(v / total * 100)}%</span></div>`).join('')}</div></div>`;
}
function bars(items, labelFn, highlightLast) {
  const max = Math.max(...items.map(i => i.total), 1);
  return `<div class="bars">${items.map((i, k) => `<div class="bar-col" title="${cop(i.total)}"><div class="bar ${highlightLast && k === items.length - 1 ? 'today' : ''}" style="height:${Math.max(i.total / max * 100, 2)}%;animation-delay:${k * 60}ms"></div><small>${labelFn(i.d)}</small></div>`).join('')}</div>`;
}
const expenseRow = (e, actions) => { const c = CATS[e.cat] || CATS.otros; return `<div class="item"><div class="chip-ico">${ic(c.icon)}</div><div class="body"><strong>${esc(e.desc)}</strong><small>${c.name} · ${fmtTime(e.date)} · ${esc(e.method)}</small></div><span class="amount num">−${cop(e.amount)}</span>${actions ? `<div class="actions"><button class="icon-btn" data-edit="${e.id}" aria-label="Editar ${esc(e.desc)}">${ic('i-edit')}</button><button class="icon-btn" data-del="${e.id}" aria-label="Eliminar ${esc(e.desc)}">${ic('i-trash')}</button></div>` : ''}</div>`; };
const weekday = d => d.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '');
const monthName = d => d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '');

/* ---------- Modales ---------- */
function openModal(html, onMount) {
  const root = $('#modalRoot'), prevFocus = document.activeElement;
  root.innerHTML = `<div class="overlay" id="ov"><div class="modal glass" role="dialog" aria-modal="true">${html}</div></div>`;
  const close = () => { root.innerHTML = ''; document.removeEventListener('keydown', esck); prevFocus?.focus?.(); };
  const esck = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', esck);
  $('#ov').addEventListener('mousedown', e => { if (e.target.id === 'ov') close(); });
  root.querySelectorAll('[data-close]').forEach(b => b.onclick = close);
  root.querySelector('input,select,button:not([data-close])')?.focus();
  onMount?.(root, close); return close;
}
function expenseModal(id) {
  const ed = Store.data.expenses.find(e => e.id === id), now = ed ? new Date(ed.date) : new Date();
  openModal(`<div class="modal-head"><h3>${ed ? 'Editar gasto' : 'Registrar gasto'}</h3><button class="icon-btn" data-close aria-label="Cerrar">${ic('i-x')}</button></div>
  <form id="expForm" novalidate>
    <label class="field"><span>Descripción</span><input name="desc" maxlength="80" placeholder="Ej: Tinto y pan" value="${esc(ed?.desc)}"><em class="err" hidden></em></label>
    <div class="row2"><label class="field"><span>Valor (COP)</span><input name="amount" inputmode="numeric" placeholder="0" value="${ed ? ed.amount : ''}"><em class="err" hidden></em></label>
    <label class="field"><span>Fecha y hora</span><input name="date" type="datetime-local" value="${toLocalInput(now)}"></label></div>
    <div class="field"><span>Categoría</span><div class="cat-pick">${Object.entries(CATS).map(([k, c], i) => `<label><input type="radio" name="cat" value="${k}" ${(ed ? ed.cat === k : i === 0) ? 'checked' : ''}><span>${ic(c.icon)}${c.name}</span></label>`).join('')}</div></div>
    <label class="field"><span>Método de pago</span><select name="method">${METHODS.map(m => `<option ${ed?.method === m ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
    <label class="field"><span>Notas (opcional)</span><textarea name="notes" rows="2" maxlength="300">${esc(ed?.notes)}</textarea></label>
    <div class="modal-foot"><button type="button" class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary">${ed ? 'Guardar cambios' : 'Guardar gasto'}</button></div></form>`,
    (root, close) => {
      $('#expForm').onsubmit = ev => {
        ev.preventDefault(); const f = new FormData(ev.target); let ok = true;
        const bad = (name, msg) => { const fl = ev.target[name].closest('.field'); fl.classList.add('invalid'); const er = $('.err', fl); er.textContent = msg; er.hidden = false; ok = false; };
        root.querySelectorAll('.field').forEach(x => { x.classList.remove('invalid'); const e = $('.err', x); if (e) e.hidden = true; });
        const desc = f.get('desc').trim(), amount = Number(String(f.get('amount')).replace(/[.\s,]/g, ''));
        if (!desc) bad('desc', 'Escribe una descripción.');
        if (!amount || amount <= 0) bad('amount', 'Ingresa un valor mayor a 0.');
        if (!ok) return;
        const rec = { id: ed?.id || uid(), desc, amount, cat: f.get('cat'), method: f.get('method'), notes: f.get('notes').trim(), date: new Date(f.get('date') || Date.now()).toISOString() };
        if (ed) Object.assign(ed, rec); else Store.data.expenses.push(rec);
        Store.addNotif(ed ? 'Gasto actualizado' : 'Gasto registrado', `${desc} · ${cop(amount)}`);
        if (Store.save()) { toast(ed ? 'Gasto actualizado' : 'Gasto guardado en este dispositivo'); close(); render(); }
      };
    });
}
function subModal(id) {
  const ed = Store.data.subs.find(s => s.id === id);
  openModal(`<div class="modal-head"><h3>${ed ? 'Editar suscripción' : 'Nueva suscripción'}</h3><button class="icon-btn" data-close aria-label="Cerrar">${ic('i-x')}</button></div>
  <form id="subForm" novalidate>
    <label class="field"><span>Servicio</span><input name="name" maxlength="40" placeholder="Netflix, Spotify…" value="${esc(ed?.name)}"><em class="err" hidden></em></label>
    <div class="row2"><label class="field"><span>Precio (COP)</span><input name="price" inputmode="numeric" value="${ed ? ed.price : ''}"><em class="err" hidden></em></label>
    <label class="field"><span>Frecuencia</span><select name="freq">${Object.entries(FREQ).map(([k, v]) => `<option value="${k}" ${ed?.freq === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
    <div class="row2"><label class="field"><span>Próxima renovación</span><input name="next" type="date" value="${ed?.next || toDateInput(new Date())}"></label>
    <label class="field"><span>Recordar antes</span><select name="remind">${[0, 1, 3, 7].map(n => `<option value="${n}" ${(ed?.remind ?? 3) === n ? 'selected' : ''}>${n ? n + ' día' + (n > 1 ? 's' : '') : 'El mismo día'}</option>`).join('')}</select></label></div>
    <label class="field"><span>Estado</span><select name="status"><option value="active" ${ed?.status !== 'cancelled' ? 'selected' : ''}>Activa</option><option value="cancelled" ${ed?.status === 'cancelled' ? 'selected' : ''}>Cancelada</option></select></label>
    <div class="modal-foot"><button type="button" class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary">${ed ? 'Guardar' : 'Añadir suscripción'}</button></div></form>`,
    (root, close) => {
      $('#subForm').onsubmit = ev => {
        ev.preventDefault(); const f = new FormData(ev.target); let ok = true;
        const bad = (n, m) => { const fl = ev.target[n].closest('.field'); fl.classList.add('invalid'); const e = $('.err', fl); e.textContent = m; e.hidden = false; ok = false; };
        const name = f.get('name').trim(), price = Number(String(f.get('price')).replace(/[.\s,]/g, ''));
        if (!name) bad('name', 'Escribe el nombre del servicio.'); if (!price || price <= 0) bad('price', 'Ingresa un precio válido.'); if (!ok) return;
        const rec = { id: ed?.id || uid(), name, price, freq: f.get('freq'), next: f.get('next'), remind: Number(f.get('remind')), status: f.get('status') };
        if (ed) Object.assign(ed, rec); else Store.data.subs.push(rec);
        if (Store.save()) { toast('Suscripción guardada en este dispositivo'); close(); render(); }
      };
    });
}
function confirmDel(text, fn) {
  openModal(`<h3>¿Eliminar?</h3><p class="muted" style="margin:10px 0 20px">${esc(text)} Esta acción no se puede deshacer.</p><div class="modal-foot"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-danger" id="yes">Eliminar</button></div>`,
    (r, close) => $('#yes').onclick = () => { fn(); close(); });
}

/* ---------- Vistas ---------- */
const ROUTES = [
  ['dashboard', 'Dashboard', 'i-dash'], ['gastos', 'Gastos', 'i-wallet'], ['suscripciones', 'Suscripciones', 'i-repeat'],
  ['estadisticas', 'Estadísticas', 'i-chart'], ['notificaciones', 'Notificaciones', 'i-bell'], ['configuracion', 'Configuración', 'i-gear']
];
const Views = {
  dashboard() {
    const d = Store.data, s = stats(), name = (d.user?.name || 'ahí').split(' ')[0];
    const h = new Date().getHours(), hi = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
    const up = d.subs.filter(x => x.status !== 'cancelled').sort((a, b) => daysUntil(a.next) - daysUntil(b.next)).slice(0, 4);
    const subTotal = d.subs.filter(x => x.status !== 'cancelled').reduce((t, x) => t + monthlyCost(x), 0);
    const hasData = d.expenses.length > 0, st = d.settings;
    const budgetPct = st.budget ? Math.min(100, Math.round(s.total / st.budget * 100)) : 0;
    const avail = st.income ? st.income - s.total - subTotal * 0 : null;
    const smallTotal = sum(s.small);
    if (!hasData && !d.subs.length) return `<div class="page-head"><div><small>${hi}</small><h1>Hola, ${esc(name)} 👋</h1></div></div><div class="card">${emptyState('i-wallet', 'Empieza registrando tu primer gasto', 'En segundos verás cuánto gastas, en qué y qué suscripciones se vienen.', '<button class="btn btn-primary" data-add>Registrar gasto</button><button class="btn btn-ghost btn-sm" data-demo>Cargar datos de ejemplo</button>')}</div>`;
    return `<div class="page-head"><div><small>${hi}</small><h1>Hola, ${esc(name)} 👋</h1></div><small>${new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</small></div>
    <div class="grid g-hero">
      <div class="card hero-card"><span class="label">Gastado este mes</span><div class="big num">${cop(s.total)}</div>${delta(s.total, s.prevTotal)}
        ${st.budget ? `<div class="progress ${budgetPct > 90 ? 'warn' : ''}" style="position:relative;z-index:1;margin-top:18px"><i style="width:${budgetPct}%"></i></div><small style="position:relative;z-index:1">${budgetPct}% de tu presupuesto de ${cop(st.budget)}</small>` : `<p class="muted" style="margin-top:14px;position:relative;z-index:1;font-size:13px">Define un presupuesto en <a class="link" href="#configuracion">Configuración</a> para seguir tu avance.</p>`}</div>
      <div class="card stat"><span class="label">Hoy</span><div class="big num">${cop(s.todayTotal)}</div><span class="pill soft">${s.today.length} gasto${s.today.length === 1 ? '' : 's'} hoy</span></div>
      <div class="card stat"><span class="label">Movimientos del mes</span><div class="big num">${s.month.length}</div>
        ${avail !== null ? `<span class="pill ${avail >= 0 ? 'ok' : 'bad'}">Disponible ${cop(avail)}</span>` : `<span class="pill neutral">Sin ingresos registrados</span>`}</div>
    </div>
    <div class="grid g-2 mt">
      <div class="card"><div class="card-head"><h3>Últimos 7 días</h3><a class="link" href="#estadisticas">Ver análisis</a></div>${bars(s.days, i => weekday(i), true)}</div>
      <div class="card"><div class="card-head"><h3>Por categoría</h3></div>${Object.keys(s.byCat).length ? donut(s.byCat) : emptyState('i-chart', 'Sin datos del mes', 'Registra gastos para ver su distribución.')}</div>
    </div>
    <div class="grid g-2 mt">
      <div class="card"><div class="card-head"><h3>Movimientos recientes</h3><a class="link" href="#gastos">Ver todos</a></div>
        <div class="list">${[...d.expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5).map(e => expenseRow(e)).join('') || emptyState('i-wallet', 'Aún no hay gastos', 'Usa “Registrar gasto”.')}</div></div>
      <div style="display:flex;flex-direction:column;gap:18px">
        <div class="card"><div class="card-head"><h3>Próximas renovaciones</h3><a class="link" href="#suscripciones">Gestionar</a></div>
          <div class="list">${up.map(x => { const n = daysUntil(x.next); return `<div class="item"><div class="logo" style="width:38px;height:38px;font-size:15px">${esc(x.name[0].toUpperCase())}</div><div class="body"><strong>${esc(x.name)}</strong><small>${cop(x.price)} · ${FREQ[x.freq]}</small></div><span class="pill ${subStatus(x) === 'soon' ? 'soft' : 'neutral'}">${n < 0 ? 'Vencida' : n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : 'en ' + n + ' d'}</span></div>`; }).join('') || '<p class="muted">Sin suscripciones activas.</p>'}</div>
          <small>Costo mensual estimado: <b class="num" style="color:var(--text)">${cop(subTotal)}</b></small></div>
        <div class="card"><div class="card-head"><h3>Gastos hormiga</h3></div>
          <div class="num" style="font-size:24px;font-weight:800">${cop(smallTotal)}</div><small>${s.small.length} compras de hasta ${cop(20000)} en 30 días.</small>
          ${s.smallTop[0] ? `<p style="margin-top:8px;font-size:13.5px">💡 <b>${esc(s.smallTop[0].name)}</b> se repitió ${s.smallTop[0].n} veces (${cop(s.smallTop[0].total)}).</p>` : ''}</div>
      </div>
    </div>`;
  },
  gastos() {
    const d = Store.data;
    return `<div class="page-head"><div><small>Historial</small><h1>Gastos</h1></div><button class="btn btn-primary" data-add>${ic('i-plus')}Nuevo gasto</button></div>
    <div class="toolbar"><input id="q" type="search" placeholder="Buscar por descripción o nota…" value="${esc(App.query)}" aria-label="Buscar"><select id="fcat" aria-label="Categoría"><option value="">Todas las categorías</option>${Object.entries(CATS).map(([k, c]) => `<option value="${k}" ${App.fcat === k ? 'selected' : ''}>${c.name}</option>`).join('')}</select></div>
    <div class="card" id="expList"></div>`;
  },
  suscripciones() {
    const d = Store.data, act = d.subs.filter(s => s.status !== 'cancelled'), m = act.reduce((t, s) => t + monthlyCost(s), 0);
    return `<div class="page-head"><div><small>Pagos recurrentes</small><h1>Suscripciones</h1></div><button class="btn btn-primary" data-addsub>${ic('i-plus')}Añadir</button></div>
    <div class="grid g-3" style="margin-bottom:18px"><div class="card hero-card"><span class="label">Costo mensual estimado</span><div class="big num">${cop(m)}</div><small style="position:relative;z-index:1">${act.length} activas · ${cop(m * 12)} al año</small></div>
    <div class="card stat"><span class="label">Próximas (7 días)</span><div class="big num">${act.filter(s => { const n = daysUntil(s.next); return n >= 0 && n <= 7; }).length}</div></div>
    <div class="card stat"><span class="label">Canceladas</span><div class="big num">${d.subs.length - act.length}</div></div></div>
    ${d.subs.length ? `<div class="sub-grid">${[...d.subs].sort((a, b) => daysUntil(a.next) - daysUntil(b.next)).map(s => { const st = subStatus(s), n = daysUntil(s.next); return `<div class="card sub-card ${st}"><div class="sub-top"><div class="logo">${esc(s.name[0].toUpperCase())}</div><div class="body" style="flex:1"><strong>${esc(s.name)}</strong><br><small>${FREQ[s.freq]}</small></div><span class="pill ${st === 'soon' ? 'soft' : st === 'cancelled' ? 'neutral' : 'ok'}">${st === 'soon' ? 'Próxima a vencer' : st === 'cancelled' ? 'Cancelada' : 'Activa'}</span></div>
      <div><div class="num" style="font-size:24px;font-weight:800">${cop(s.price)}</div><small>${st === 'cancelled' ? 'Sin cobros' : `Renueva ${fmtDate(s.next + 'T00:00')} · ${n < 0 ? 'vencida' : n === 0 ? 'hoy' : 'en ' + n + ' d'}`} · ${ic('i-clock').replace('class="ico"', 'class="ico" style="width:12px;height:12px;vertical-align:-1px"')} aviso ${s.remind}d antes</small></div>
      <div class="sub-foot"><span></span><div class="actions"><button class="icon-btn" data-editsub="${s.id}" aria-label="Editar ${esc(s.name)}">${ic('i-edit')}</button><button class="icon-btn" data-delsub="${s.id}" aria-label="Eliminar ${esc(s.name)}">${ic('i-trash')}</button></div></div></div>`; }).join('')}</div>`
        : `<div class="card">${emptyState('i-repeat', 'Sin suscripciones', 'Añade tus servicios recurrentes y te mostraremos cuándo se renuevan.', '<button class="btn btn-primary" data-addsub>Añadir suscripción</button>')}</div>`}`;
  },
  estadisticas() {
    const s = stats(), d = Store.data, tot = s.total, cats = Object.entries(s.byCat).sort((a, b) => b[1] - a[1]);
    const subM = d.subs.filter(x => x.status !== 'cancelled').reduce((t, x) => t + monthlyCost(x), 0);
    if (!d.expenses.length) return `<div class="page-head"><div><small>Análisis</small><h1>Estadísticas</h1></div></div><div class="card">${emptyState('i-chart', 'Aún no hay datos para analizar', 'Registra gastos y aquí verás tus hábitos de consumo.')}</div>`;
    const diff = s.total - s.prevTotal;
    return `<div class="page-head"><div><small>Análisis</small><h1>Estadísticas</h1></div></div>
    <div class="grid g-eq"><div class="card"><div class="card-head"><h3>Evolución mensual</h3></div>${bars(s.months, i => monthName(i), true)}</div>
    <div class="card"><div class="card-head"><h3>Por categoría (mes actual)</h3></div>${cats.length ? donut(s.byCat) : '<p class="muted">Sin gastos este mes.</p>'}</div></div>
    <div class="grid g-eq mt"><div class="card"><div class="card-head"><h3>Comparación de periodos</h3></div>
      <div class="hbar"><div class="top"><span>Mes actual</span><b class="num">${cop(s.total)}</b></div><div class="progress"><i style="width:${Math.min(100, s.total / Math.max(s.total, s.prevTotal, 1) * 100)}%"></i></div></div>
      <div class="hbar"><div class="top"><span>Mes anterior</span><b class="num">${cop(s.prevTotal)}</b></div><div class="progress"><i style="width:${Math.min(100, s.prevTotal / Math.max(s.total, s.prevTotal, 1) * 100)}%;opacity:.5"></i></div></div>
      <p style="font-size:14px">${s.prevTotal ? (diff > 0 ? `Gastaste <b style="color:var(--bad)">${cop(diff)} más</b> que el mes pasado.` : `Ahorraste <b style="color:var(--ok)">${cop(-diff)}</b> frente al mes pasado.`) : 'Aún no hay mes anterior para comparar.'}</p></div>
    <div class="card"><div class="card-head"><h3>Categorías con más consumo</h3></div>${cats.slice(0, 4).map(([k, v]) => `<div class="hbar"><div class="top"><span>${CATS[k].name}</span><b class="num">${cop(v)}</b></div><div class="progress"><i style="width:${v / cats[0][1] * 100}%"></i></div></div>`).join('') || '<p class="muted">Sin datos.</p>'}</div></div>
    <div class="grid g-eq mt"><div class="card"><div class="card-head"><h3>Gastos hormiga frecuentes</h3><span class="pill soft">${cop(sum(s.small))} / 30 d</span></div>
      ${s.smallTop.length ? s.smallTop.map(g => `<div class="item"><div class="chip-ico">${g.n}×</div><div class="body"><strong>${esc(g.name)}</strong><small>Se repitió ${g.n} veces</small></div><span class="amount num">${cop(g.total)}</span></div>`).join('') : '<p class="muted">No detectamos compras pequeñas repetidas. ¡Bien!</p>'}</div>
    <div class="card"><div class="card-head"><h3>Gasto recurrente</h3></div><div class="big num" style="margin-top:0">${cop(subM)}</div><small>al mes en suscripciones activas${tot ? ` (${Math.round(subM / (tot + subM) * 100)}% de tu gasto total estimado)` : ''}.</small></div></div>`;
  },
  notificaciones() {
    refreshNotifs(); Store.save(); const n = Store.data.notifs;
    return `<div class="page-head"><div><small>Centro de avisos</small><h1>Notificaciones</h1></div>${n.some(x => !x.read) ? '<button class="btn btn-ghost" id="readAll">Marcar todas como leídas</button>' : ''}</div>
    <div class="notice">Los avisos se muestran dentro de la app. El envío de notificaciones push y recordatorios automáticos requiere Supabase y aún no está conectado.</div>
    <div class="card">${n.length ? `<div class="list">${n.map(x => `<div class="item ${x.read ? '' : 'unread'}"><div class="chip-ico">${ic(x.type === 'renewal' ? 'i-repeat' : x.type === 'summary' ? 'i-chart' : 'i-check')}</div><div class="body"><strong>${esc(x.title)}</strong><small>${esc(x.text)} · ${fmtDate(x.date)} ${fmtTime(x.date)}</small></div>${x.read ? '<span class="pill neutral">Leída</span>' : `<button class="btn btn-ghost btn-sm" data-read="${x.id}">Marcar leída</button>`}</div>`).join('')}</div>` : emptyState('i-bell', 'Todo al día', 'Cuando haya renovaciones o confirmaciones aparecerán aquí.')}</div>`;
  },
  configuracion() {
    const d = Store.data, st = d.settings, sw = (k, t, sub) => `<div class="switch-row"><div><strong>${t}</strong><br><small>${sub}</small></div><label class="switch"><input type="checkbox" data-nt="${k}" ${st.notifTypes[k] ? 'checked' : ''} aria-label="${t}"><span></span></label></div>`;
    return `<div class="page-head"><div><small>Tu cuenta</small><h1>Configuración</h1></div></div>
    <div class="grid g-eq"><form class="card" id="setForm"><div class="card-head"><h3>Perfil y preferencias</h3></div>
      <label class="field"><span>Nombre</span><input name="name" value="${esc(d.user?.name)}"></label>
      <label class="field"><span>Correo</span><input name="email" type="email" value="${esc(d.user?.email)}"></label>
      <div class="row2"><label class="field"><span>Moneda</span><select name="currency"><option value="COP">Peso colombiano (COP)</option></select></label>
      <label class="field"><span>Zona horaria</span><select name="tz">${['America/Bogota', 'America/Mexico_City', 'America/Lima', 'America/Argentina/Buenos_Aires', 'Europe/Madrid'].map(z => `<option ${st.tz === z ? 'selected' : ''}>${z}</option>`).join('')}</select></label></div>
      <div class="row2"><label class="field"><span>Ingresos mensuales (opcional)</span><input name="income" inputmode="numeric" value="${st.income || ''}"></label>
      <label class="field"><span>Presupuesto mensual (opcional)</span><input name="budget" inputmode="numeric" value="${st.budget || ''}"></label></div>
      <button class="btn btn-primary">Guardar cambios</button></form>
    <div style="display:flex;flex-direction:column;gap:18px"><div class="card"><div class="card-head"><h3>Avisos</h3></div>
      ${sw('renewals', 'Renovaciones de suscripciones', 'Avisos antes de cada cobro')}${sw('reminders', 'Recordatorios programados', 'Tus recordatorios personalizados')}${sw('summaries', 'Resúmenes periódicos', 'Resumen semanal de gastos')}
      <label class="field" style="margin-top:14px"><span>Recordar renovaciones por defecto</span><select id="remDays">${[0, 1, 3, 7].map(n => `<option value="${n}" ${st.remindDays === n ? 'selected' : ''}>${n ? n + ' día(s) antes' : 'El mismo día'}</option>`).join('')}</select></label>
      <small>Notificaciones push: no disponibles hasta conectar el backend.</small></div>
    <div class="card"><div class="card-head"><h3>Sesión y datos</h3></div><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-ghost" id="logout">${ic('i-logout')}Cerrar sesión</button><button class="btn btn-danger" id="wipe">Borrar datos locales</button></div></div></div></div>`;
  }
};

/* ---------- App ---------- */
const App = { route: 'dashboard', query: '', fcat: '' };
function renderExpenseList() {
  const el = $('#expList'); if (!el) return;
  const q = App.query.toLowerCase();
  const list = Store.data.expenses.filter(e => (!App.fcat || e.cat === App.fcat) && (!q || (e.desc + ' ' + e.notes).toLowerCase().includes(q))).sort((a, b) => new Date(b.date) - new Date(a.date));
  if (!list.length) { el.innerHTML = Store.data.expenses.length ? emptyState('i-search', 'Sin resultados', 'Prueba con otra búsqueda o categoría.') : emptyState('i-wallet', 'Aún no hay gastos', 'Registra el primero en segundos.', '<button class="btn btn-primary" data-add>Registrar gasto</button>'); return; }
  let last = '', html = '';
  list.forEach(e => { const k = new Date(e.date).toDateString(); if (k !== last) { last = k; const dd = new Date(e.date); html += `<div class="day-label">${sameDay(dd, new Date()) ? 'Hoy' : dd.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</div>`; } html += expenseRow(e, true); });
  el.innerHTML = `<div class="list">${html}</div>`;
}
function render() {
  refreshNotifs();
  const unread = Store.data.notifs.filter(n => !n.read).length;
  const link = (r, cls) => `<a href="#${r[0]}" class="${App.route === r[0] ? 'active' : ''}" ${App.route === r[0] ? 'aria-current="page"' : ''}>${ic(r[2])}<span>${cls ? r[1].replace('Suscripciones', 'Subs').replace('Estadísticas', 'Stats').replace('Configuración', 'Ajustes').replace('Notificaciones', 'Avisos') : r[1]}</span>${!cls && r[0] === 'notificaciones' && unread ? `<b class="badge">${unread}</b>` : ''}</a>`;
  $('#nav').innerHTML = ROUTES.map(r => link(r)).join('');
  $('#bottomNav').innerHTML = [ROUTES[0], ROUTES[1], ROUTES[2], ROUTES[4], ROUTES[5]].map(r => link(r, 1)).join('');
  $('#bellDot').hidden = !unread;
  const u = Store.data.user || {}; $('#sideName').textContent = u.name || 'Usuario'; $('#sideEmail').textContent = u.email || ''; $('#sideAvatar').textContent = (u.name || 'G')[0].toUpperCase();
  $('#view').innerHTML = Views[App.route](); bindView(); renderExpenseList();
}
function bindView() {
  const v = $('#view');
  v.onclick = e => {
    const t = e.target.closest('button'); if (!t) return; const D = Store.data;
    if (t.dataset.add !== undefined) expenseModal();
    else if (t.dataset.addsub !== undefined) subModal();
    else if (t.dataset.demo !== undefined) { seedDemo(); Store.save(); toast('Datos de ejemplo cargados'); render(); }
    else if (t.dataset.edit) expenseModal(t.dataset.edit);
    else if (t.dataset.editsub) subModal(t.dataset.editsub);
    else if (t.dataset.del) confirmDel('Se eliminará este gasto.', () => { D.expenses = D.expenses.filter(x => x.id !== t.dataset.del); Store.save(); toast('Gasto eliminado'); render(); });
    else if (t.dataset.delsub) confirmDel('Se eliminará esta suscripción.', () => { D.subs = D.subs.filter(x => x.id !== t.dataset.delsub); Store.save(); toast('Suscripción eliminada'); render(); });
    else if (t.dataset.read) { D.notifs.find(n => n.id === t.dataset.read).read = true; Store.save(); render(); }
    else if (t.id === 'readAll') { D.notifs.forEach(n => n.read = true); Store.save(); render(); }
    else if (t.id === 'logout') { Store.logout(); boot(); }
    else if (t.id === 'wipe') confirmDel('Se borrarán todos tus gastos, suscripciones y avisos de este navegador.', () => { Object.assign(D, { expenses: [], subs: [], notifs: [] }); Store.save(); toast('Datos locales borrados'); render(); });
  };
  $('#q')?.addEventListener('input', e => { App.query = e.target.value; renderExpenseList(); });
  $('#fcat')?.addEventListener('change', e => { App.fcat = e.target.value; renderExpenseList(); });
  v.querySelectorAll('[data-nt]').forEach(i => i.onchange = () => { Store.data.settings.notifTypes[i.dataset.nt] = i.checked; Store.save(); toast('Preferencia guardada'); });
  $('#remDays')?.addEventListener('change', e => { Store.data.settings.remindDays = Number(e.target.value); Store.save(); toast('Preferencia guardada'); });
  $('#setForm')?.addEventListener('submit', e => {
    e.preventDefault(); const f = new FormData(e.target), n = x => Number(String(f.get(x)).replace(/[.\s,]/g, '')) || 0;
    if (!f.get('name').trim()) return toast('El nombre no puede estar vacío', true);
    Object.assign(Store.data.user, { name: f.get('name').trim(), email: f.get('email').trim() });
    Object.assign(Store.data.settings, { tz: f.get('tz'), income: n('income'), budget: n('budget') });
    if (Store.save()) { toast('Configuración guardada'); render(); }
  });
}
function route() { const h = location.hash.slice(1); App.route = Views[h] ? h : 'dashboard'; if (!$('#app').hidden) { render(); $('#view').focus({ preventScroll: true }); scrollTo(0, 0); } }

function boot() {
  const logged = !!Store.data.user;
  $('#auth').hidden = logged; $('#app').hidden = !logged; if (logged) route();
}
function initAuth() {
  let mode = 'login';
  const setMode = m => { mode = m; $('#tabLogin').classList.toggle('is-active', m === 'login'); $('#tabSignup').classList.toggle('is-active', m === 'signup'); $('#nameField').hidden = m === 'login'; $('#authSubmit').textContent = m === 'login' ? 'Entrar' : 'Crear cuenta'; $('#authError').hidden = true; };
  $('#tabLogin').onclick = () => setMode('login'); $('#tabSignup').onclick = () => setMode('signup');
  $('#authForm').onsubmit = e => {
    e.preventDefault(); const em = $('#authEmail').value.trim(), pw = $('#authPass').value, nm = $('#authName').value.trim(), er = $('#authError');
    let msg = ''; if (!/^\S+@\S+\.\S+$/.test(em)) msg = 'Ingresa un correo válido.'; else if (pw.length < 8) msg = 'La contraseña debe tener al menos 8 caracteres.'; else if (mode === 'signup' && !nm) msg = 'Cuéntanos tu nombre.';
    if (msg) { er.textContent = msg; er.hidden = false; return; }
    // Aquí irá supabase.auth.signInWithPassword / signUp. Nunca se guarda la contraseña.
    Store.data.user = { name: nm || em.split('@')[0], email: em }; Store.save(); $('#authPass').value = ''; location.hash = 'dashboard'; boot();
  };
  $('#demoBtn').onclick = () => { Store.data.user = { name: 'Camila', email: 'demo@gasti.app' }; seedDemo(); Store.save(); location.hash = 'dashboard'; boot(); };
}
document.addEventListener('DOMContentLoaded', () => {
  Store.load(); initAuth();
  $('#addExpenseTop').onclick = () => expenseModal(); $('#fab').onclick = () => expenseModal();
  $('#bellBtn').onclick = () => location.hash = 'notificaciones';
  $('#globalSearch').addEventListener('input', e => { App.query = e.target.value; if (App.route !== 'gastos') location.hash = 'gastos'; else { $('#q').value = App.query; renderExpenseList(); } });
  window.addEventListener('hashchange', route); boot();
});
