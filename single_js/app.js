// ─── Config — fill these in ───────────────────────────────────────────────────
const AUTH0_DOMAIN    = 'dev-xlewifcpritoq586.us.auth0.com';
const AUTH0_CLIENT_ID = 'XfMtZp0foSXTookQkrleJAaBiao7WopX';
const AUTH0_AUDIENCE  = 'https://handsfree-incident-report.ch';      // e.g. https://api.hands-free-incident-report.ch
const API_BASE        = 'https://api.hands-free-incident-report.ch';
// ─────────────────────────────────────────────────────────────────────────────

let client;
let allReports = [];   // list from /reports
let detailCache = {};  // report_id → full detail from /report/{id}

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const screenLoading   = document.getElementById('screen-loading');
const screenUnauth    = document.getElementById('screen-unauth');
const screenDashboard = document.getElementById('screen-dashboard');
const loginBtn        = document.getElementById('login-btn');
const loginBtn2       = document.getElementById('login-btn-2');
const logoutBtn       = document.getElementById('logout-btn');
const userEmail       = document.getElementById('user-email');
const tableBody       = document.getElementById('table-body');
const searchInput     = document.getElementById('search');
const refreshBtn      = document.getElementById('refresh-btn');
const overlay         = document.getElementById('overlay');
const modalClose      = document.getElementById('modal-close');
const modalReportId   = document.getElementById('modal-report-id');
const modalBody       = document.getElementById('modal-body');

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  client = await auth0.createAuth0Client({
    domain: AUTH0_DOMAIN,
    clientId: AUTH0_CLIENT_ID,
    authorizationParams: {
      redirect_uri: window.location.origin,
      audience: AUTH0_AUDIENCE,
    },
    cacheLocation: 'localstorage',
  });

  if (window.location.search.includes('code=')) {
    await client.handleRedirectCallback();
    window.history.replaceState({}, document.title, '/');
  }

  const authed = await client.isAuthenticated();
  showScreen(authed ? 'dashboard' : 'unauth');

  if (authed) {
    const user = await client.getUser();
    userEmail.textContent = user.email ?? user.name ?? '';
    loginBtn.style.display  = 'none';
    logoutBtn.style.display = 'inline-block';
    loadReports();
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function login() {
  client.loginWithRedirect();
}

function logout() {
  client.logout({ logoutParams: { returnTo: window.location.origin } });
}

async function getToken() {
  return client.getTokenSilently();
}

// ─── API ──────────────────────────────────────────────────────────────────────
async function apiFetch(path) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// ─── Load reports list ────────────────────────────────────────────────────────
async function loadReports() {
  tableBody.innerHTML = '<tr class="loading-row"><td colspan="6">Loading reports…</td></tr>';
  try {
    allReports = await apiFetch('/reports');
    // Sort by created_at descending (newest first)
    allReports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    updateStats(allReports);
    renderTable(allReports);
  } catch (e) {
    tableBody.innerHTML = `<tr class="empty-row"><td colspan="6">Failed to load: ${e.message}</td></tr>`;
  }
}

async function authImg(url, imgElement) {
  try {
    const token = await getToken();
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const blob = await res.blob();
    imgElement.src = URL.createObjectURL(blob);
  } catch (_) {}
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function updateStats(reports) {
  document.getElementById('stat-total').textContent   = reports.length;
  document.getElementById('stat-done').textContent    = reports.filter(r => r.status === 'done').length;
  document.getElementById('stat-pending').textContent = reports.filter(r => !r.status || r.status === 'pending').length;
  document.getElementById('stat-error').textContent   = reports.filter(r => r.status === 'error').length;
}

// ─── Table rendering ──────────────────────────────────────────────────────────
function renderTable(reports) {
  if (!reports.length) {
    tableBody.innerHTML = '<tr class="empty-row"><td colspan="6">No reports found.</td></tr>';
    return;
  }

  tableBody.innerHTML = reports.map(r => `
    <tr data-id="${r.report_id}">
      <td><div class="td-id" title="${r.report_id}">${r.report_id}</div></td>
      <td><div class="td-short none">—</div></td>
      <td><div class="frames-strip"><div class="frame-ph">…</div></div></td>
      <td>${statusBadge(r.status)}</td>
      <td><div class="td-loc">—</div></td>
      <td><div class="td-date">${formatDate(r.created_at)}</div></td>
    </tr>
  `).join('');

  // Attach click handlers
  tableBody.querySelectorAll('tr[data-id]').forEach(row => {
    row.addEventListener('click', () => openModal(row.dataset.id));
  });

  // Eagerly fetch details to fill in summary + frames
  reports.forEach(r => fetchDetailForRow(r.report_id));
}

async function fetchDetailForRow(reportId) {
  try {
    const detail = await fetchDetail(reportId);
    const row = tableBody.querySelector(`tr[data-id="${reportId}"]`);
    if (!row) return;

    // Summary
    const shortCell = row.querySelector('.td-short');
    if (detail.description_short) {
      shortCell.textContent = detail.description_short;
      shortCell.classList.remove('none');
    } else {
      shortCell.textContent = 'No summary yet';
    }

    // Frames strip (max 4 + overflow count)
    const strip = row.querySelector('.frames-strip');
    const frames = detail.reported_frames ?? [];
    if (frames.length === 0) {
      strip.innerHTML = '<div class="frame-ph">none</div>';
    } else {
      const visible = frames.slice(0, 4);
      const extra   = frames.length - visible.length;
      strip.innerHTML = visible.map(f =>
        `<img class="frame-thumb" data-src="${API_BASE}${f.frame_url}">`)
        .join('') + (extra > 0 ? `<div class="frame-more">+${extra}</div>` : '');
      strip.querySelectorAll('img[data-src]').forEach(img => 
        authImg(img.dataset.src, img)
      );
    }


    // Location
    const locCell = row.querySelector('.td-loc');
    if (detail.location?.coordinates) {
      const [lng, lat] = detail.location.coordinates;
      locCell.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  } catch (_) {
    // silently skip — row stays with placeholders
  }
}

// ─── Detail fetch (cached) ────────────────────────────────────────────────────
async function fetchDetail(reportId) {
  if (detailCache[reportId]) return detailCache[reportId];
  const detail = await apiFetch(`/report/${reportId}`);
  detailCache[reportId] = detail;
  return detail;
}

// ─── Modal ────────────────────────────────────────────────────────────────────
async function openModal(reportId) {
  modalReportId.textContent = reportId;
  modalBody.innerHTML = '<div id="modal-spinner"><div class="spinner"></div></div>';
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  try {
    const d = await fetchDetail(reportId);

    const loc = d.location?.coordinates
      ? `${d.location.coordinates[1].toFixed(6)}, ${d.location.coordinates[0].toFixed(6)}`
      : '—';

    const framesHtml = (d.reported_frames ?? []).length
      ? (d.reported_frames.map(f => `
          <div class="m-frame">
            <img class="m-frame-img" data-src="${API_BASE}${f.frame_url}">
            <div class="m-frame-conf">Confidence:${f.confidence != null ? (f.confidence * 100).toFixed(0) + '%' : '—'}</div>
            <div class="m-frame-mask">Mask: ${f.mask_coverage != null ? (f.mask_coverage * 100).toFixed(0) + '%' : '—'}</div>
          </div>`).join(''))
      : '<div style="color:var(--muted);font-family:\'IBM Plex Mono\',monospace;font-size:0.7rem">No frames available</div>';

    modalBody.innerHTML = `
      <div>
        <div class="m-label">Description</div>
        <div id="modal-short">${d.description_short ?? '<span style="color:var(--muted);font-style:italic;font-weight:400">No summary yet</span>'}</div>
        <div id="modal-synonyms">${d.description_synonyms ?? '<span style="color:var(--muted)">Synonyms not yet generated.</span>'}</div>
        <div id="modal-full">${d.description_full ?? '<span style="color:var(--muted)">Full description not yet generated.</span>'}</div>
      </div>

      <div>
        <div class="m-label">Incident Frames</div>
        <div id="modal-frames">${framesHtml}</div>
      </div>

      <div>
        <div class="m-label">Metadata</div>
        <div id="modal-meta">
          <div class="meta-cell"><div class="meta-k">Report ID</div><div class="meta-v">${d.report_id}</div></div>
          <div class="meta-cell"><div class="meta-k">Status</div><div class="meta-v">${d.status ?? '—'}</div></div>
          <div class="meta-cell"><div class="meta-k">Created</div><div class="meta-v">${formatDate(d.created_at)}</div></div>
          <div class="meta-cell"><div class="meta-k">Location</div><div class="meta-v">${loc}</div></div>
          <div class="meta-cell"><div class="meta-k">Frames</div><div class="meta-v">${(d.reported_frames ?? []).length}</div></div>
        </div>
      </div>
    `;
    // load authenticated images
    modalBody.querySelectorAll('img[data-src]').forEach(img =>
      authImg(img.dataset.src, img)
    );

  } catch (e) {
    modalBody.innerHTML = `<div style="color:var(--danger);font-family:'IBM Plex Mono',monospace;font-size:0.75rem;padding:1rem">Failed to load: ${e.message}</div>`;
  }
}

function closeModal() {
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

// ─── Search ───────────────────────────────────────────────────────────────────
function filterReports(query) {
  if (!query.trim()) return renderTable(allReports);
  const q = query.toLowerCase();
  const filtered = allReports.filter(r => {
    const detail = detailCache[r.report_id];
    return (
      r.report_id.toLowerCase().includes(q) ||
      (r.status ?? '').toLowerCase().includes(q) ||
      (detail?.description_short ?? '').toLowerCase().includes(q) ||
      (detail?.description_full  ?? '').toLowerCase().includes(q)
    );
  });
  // Sort filtered by created_at descending
  filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  renderTable(filtered);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function statusBadge(status) {
  const s = (status ?? '').toLowerCase();
  if (s === 'done' || s === 'completed') return `<span class="badge badge-done">${status}</span>`;
  if (s === 'pending' || s === '')       return `<span class="badge badge-pending">${status || 'pending'}</span>`;
  if (s === 'error' || s === 'failed')   return `<span class="badge badge-error">${status}</span>`;
  return `<span class="badge badge-default">${status ?? '—'}</span>`;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function showScreen(which) {
  screenLoading.style.display   = which === 'loading'   ? 'flex' : 'none';
  screenUnauth.style.display    = which === 'unauth'    ? 'flex' : 'none';
  screenDashboard.style.display = which === 'dashboard' ? 'block' : 'none';
}

// ─── Event listeners ──────────────────────────────────────────────────────────
loginBtn.addEventListener('click', login);
loginBtn2.addEventListener('click', login);
logoutBtn.addEventListener('click', logout);
refreshBtn.addEventListener('click', () => { detailCache = {}; loadReports(); });
modalClose.addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
searchInput.addEventListener('input', e => filterReports(e.target.value));

// ─── Boot ─────────────────────────────────────────────────────────────────────
init();