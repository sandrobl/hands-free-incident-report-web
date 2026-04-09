import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useApi } from '../hooks/useApi';
import { ReportSummary, ReportDetail } from '../types';
import ReportRow from './ReportRow';
import Modal from './Modal';

// ─── Map marker colour by status ─────────────────────────────────────────────
function markerColor(status: string | null | undefined): string {
  const s = (status ?? '').toLowerCase();
  if (s === 'done' || s === 'completed') return '#98BE59';
  if (s === 'error' || s === 'failed')   return '#c0392b';
  return '#6D9AC4';
}

function FitBounds({ bounds }: { bounds: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (bounds.length === 1) {
      map.setView(bounds[0], 13);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [map, bounds]);
  return null;
}

export default function Dashboard() {
  const { apiFetch } = useApi();

  // ─── Reports list ──────────────────────────────────────────────────────────
  const [allReports,     setAllReports]     = useState<ReportSummary[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError,   setReportsError]   = useState<string | null>(null);

  // ─── Detail cache ──────────────────────────────────────────────────────────
  const detailCacheRef = useRef<Record<string, ReportDetail>>({});
  const [detailCache,  setDetailCache]      = useState<Record<string, ReportDetail>>({});

  // ─── Search ────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Modal ─────────────────────────────────────────────────────────────────
  const [modalReportId, setModalReportId] = useState<string | null>(null);
  const [modalLoading,  setModalLoading]  = useState(false);
  const [modalError,    setModalError]    = useState<string | null>(null);

  // ─── fetchDetail (cached) ─────────────────────────────────────────────────
  const fetchDetail = useCallback(
    async (reportId: string): Promise<ReportDetail> => {
      if (detailCacheRef.current[reportId]) return detailCacheRef.current[reportId];
      const detail = await apiFetch<ReportDetail>(`/report/${reportId}`);
      detailCacheRef.current[reportId] = detail;
      setDetailCache(prev => ({ ...prev, [reportId]: detail }));
      return detail;
    },
    [apiFetch],
  );

  // ─── Load reports list ────────────────────────────────────────────────────
  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    setReportsError(null);
    try {
      const reports = await apiFetch<ReportSummary[]>('/reports');
      reports.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setAllReports(reports);
    } catch (e) {
      setReportsError((e as Error).message);
    } finally {
      setReportsLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleRefresh = useCallback(() => {
    detailCacheRef.current = {};
    setDetailCache({});
    loadReports();
  }, [loadReports]);

  // ─── Modal open/close ─────────────────────────────────────────────────────
  const openModal = useCallback(
    async (reportId: string) => {
      setModalReportId(reportId);
      setModalError(null);
      if (!detailCacheRef.current[reportId]) {
        setModalLoading(true);
        try {
          await fetchDetail(reportId);
        } catch (e) {
          setModalError((e as Error).message);
        } finally {
          setModalLoading(false);
        }
      }
    },
    [fetchDetail],
  );

  const closeModal = useCallback(() => {
    setModalReportId(null);
    setModalError(null);
  }, []);

  // ─── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:   allReports.length,
    done:    allReports.filter(r => r.status === 'done' || r.status === 'completed').length,
    pending: allReports.filter(r => !r.status || r.status === 'pending').length,
    error:   allReports.filter(r => r.status === 'error' || r.status === 'failed').length,
  }), [allReports]);

  // ─── Filtered reports ─────────────────────────────────────────────────────
  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return allReports;
    const q = searchQuery.toLowerCase();
    return [...allReports]
      .filter(r => {
        const d = detailCache[r.report_id];
        return (
          r.report_id.toLowerCase().includes(q) ||
          (r.status ?? '').toLowerCase().includes(q) ||
          (d?.description_short ?? '').toLowerCase().includes(q) ||
          (d?.description_full  ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [allReports, detailCache, searchQuery]);

  // ─── Map markers — only reports that have loaded location data ────────────
  const mapMarkers = useMemo(() =>
    allReports
      .map(r => ({ report: r, detail: detailCache[r.report_id] }))
      .filter(({ detail }) => {
        const coords = detail?.location_upload?.coordinates;
        return Array.isArray(coords) && coords.length === 2 &&
          typeof coords[0] === 'number' && typeof coords[1] === 'number';
      }),
    [allReports, detailCache],
  );

  const mapBounds = useMemo(() =>
    mapMarkers.map(({ detail }) => {
      const [lng, lat] = detail!.location_upload!.coordinates;
      return [lat, lng] as [number, number];
    }),
    [mapMarkers],
  );
  const dash = reportsLoading ? '—' : undefined;

  return (
    <main>
      {/* Stats */}
      <div id="stats">
        <div className="stat">
          <div className="stat-label">Total Reports</div>
          <div className="stat-val">{dash ?? stats.total}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Completed</div>
          <div className="stat-val" style={{ color: 'var(--accent2)' }}>{dash ?? stats.done}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Pending</div>
          <div className="stat-val" style={{ color: 'var(--warn)' }}>{dash ?? stats.pending}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Errors</div>
          <div className="stat-val" style={{ color: 'var(--danger)' }}>{dash ?? stats.error}</div>
        </div>
      </div>

      {/* Map */}
      <div className="m-label">Report upload locations</div>
      <div style={{
        border: '1px solid var(--border)',
        marginBottom: '1.75rem',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <MapContainer
          center={[0, 0]}
          zoom={2}
          style={{ height: '320px', width: '100%', background: 'var(--surface)' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds bounds={mapBounds} />
          {mapMarkers.map(({ report, detail }) => {
            const [lng, lat] = detail!.location_upload!.coordinates;
            return (
              <CircleMarker
                key={report.report_id}
                center={[lat, lng]}
                radius={8}
                pathOptions={{
                  color: markerColor(report.status),
                  fillColor: markerColor(report.status),
                  fillOpacity: 0.85,
                  weight: 1.5,
                }}
                eventHandlers={{ click: () => openModal(report.report_id) }}
              >
                <Tooltip direction="top" offset={[0, -6]}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem' }}>
                    <strong>{detail?.description_short ?? report.report_id.slice(0, 8)}</strong>
                    <br />
                    {report.status ?? 'pending'}
                  </span>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>

      </div>

      {/* Controls */}
      <div id="controls">
        <input
          id="search"
          type="text"
          placeholder="Search by ID, description, status…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <button className="btn" id="refresh-btn" onClick={handleRefresh}>
          ↻ Refresh
        </button>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Report ID</th>
              <th>Summary</th>
              <th>Frames</th>
              <th>Status</th>
              <th>Upload Location</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {reportsLoading ? (
              <tr className="loading-row"><td colSpan={6}>Loading reports…</td></tr>
            ) : reportsError ? (
              <tr className="empty-row"><td colSpan={6}>Failed to load: {reportsError}</td></tr>
            ) : filteredReports.length === 0 ? (
              <tr className="empty-row"><td colSpan={6}>No reports found.</td></tr>
            ) : (
              filteredReports.map(r => (
                <ReportRow
                  key={r.report_id}
                  report={r}
                  detail={detailCache[r.report_id]}
                  onFetchDetail={id => { fetchDetail(id).catch(() => {}); }}
                  onClick={openModal}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalReportId && (
        <Modal
          reportId={modalReportId}
          detail={detailCache[modalReportId]}
          isLoading={modalLoading}
          error={modalError}
          onClose={closeModal}
          onOpenReport={openModal}
        />
      )}
    </main>
  );
}