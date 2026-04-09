import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ReportDetail } from '../types';
import { formatDate } from '../utils/format';
import AuthedImg from './AuthedImg';
import { API_BASE } from '../config';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';

interface Props {
  reportId: string;
  detail: ReportDetail | undefined;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onOpenReport: (reportId: string) => void
}

// ─── Map marker colour by status ─────────────────────────────────────────────
function markerColor(status: string | null | undefined): string {
  const s = (status ?? '').toLowerCase();
  if (s === 'done' || s === 'completed') return '#98BE59';
  if (s === 'error' || s === 'failed') return '#c0392b';
  return '#6D9AC4';
}

export default function Modal({ reportId, detail, isLoading, error, onClose, onOpenReport }: Props) {
  // Lock scroll + Escape key while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const loc_upload = detail?.location_upload?.coordinates
    ? `${detail.location_upload.coordinates[1].toFixed(6)}, ${detail.location_upload.coordinates[0].toFixed(6)}`
    : '—';

  return createPortal(
    <div id="overlay" style={{ display: 'flex' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div id="modal">
        <div id="modal-header">
          <span id="modal-report-id">{reportId}</span>
          <button id="modal-close" onClick={onClose}>✕</button>
        </div>

        <div id="modal-body">
          {/* Loading */}
          {isLoading && (
            <div id="modal-spinner">
              <div className="spinner" />
            </div>
          )}

          {/* Error */}
          {!isLoading && error && (
            <div style={{
              color: 'var(--danger)',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.75rem',
              padding: '1rem',
            }}>
              Failed to load: {error}
            </div>
          )}

          {/* Content */}
          {!isLoading && detail && (
            <>
              {/* Description */}
              <div>
                <div className="m-label">Description</div>
                <div id="modal-short">
                  {detail.description_short ?? (
                    <span style={{ color: 'var(--muted)', fontStyle: 'italic', fontWeight: 400 }}>No summary yet</span>
                  )}
                </div>
                <div id="modal-synonyms">
                  {detail.description_synonyms ?? (
                    <span style={{ color: 'var(--muted)' }}>Synonyms not yet generated.</span>
                  )}
                </div>
                <div id="modal-full">
                  {detail.description_full ?? (
                    <span style={{ color: 'var(--muted)' }}>Full description not yet generated.</span>
                  )}
                </div>
              </div>

              {/* Frames */}
              <div>
                <div className="m-label">Incident Frames</div>
                <div id="modal-frames">
                  {(detail.reported_frames ?? []).length === 0 ? (
                    <div style={{ color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', }}>No frames available</div>
                  ) : (
                    detail.reported_frames!.map((f, i) => (
                      <div className="m-frame" key={i}>
                        <div className='m-frame-img-container'>
                          <AuthedImg src={`${API_BASE}${f.frame_url}`} className="m-frame-img" />
                          <div className="m-frame-meta">
                            <div className="m-frame-mask">
                              Mask: {f.mask_coverage != null ? (f.mask_coverage * 100).toFixed(0) + '%' : '—'}
                            </div>
                            <div className="m-frame-conf">
                              Confidence:{f.confidence != null ? (f.confidence * 100).toFixed(0) + '%' : '—'}
                            </div>
                          </div>
                        </div>
                        {f.location_segmented?.coordinates ? (
                          <div className='m-frame-location'>
                            <MapContainer
                              style={{ height: '150px', width: '100%', background: 'var(--surface)' }}
                              center={[f.location_segmented.coordinates[1], f.location_segmented.coordinates[0]]}
                              zoom={40}
                            >
                              <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              />
                              <CircleMarker
                                key={reportId}
                                center={[f.location_segmented.coordinates[1], f.location_segmented.coordinates[0]]}
                                radius={8}
                                pathOptions={{
                                  color: markerColor(detail.status),
                                  fillColor: markerColor(detail.status),
                                  fillOpacity: 0.85,
                                  weight: 1.5,
                                }}
                              >
                                <Tooltip direction="top" offset={[0, -6]}>
                                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem' }}>
                                    <strong>{detail?.description_short ?? reportId.slice(0, 8)}</strong>
                                    <br />
                                    {detail.status ?? 'pending'}
                                  </span>
                                </Tooltip>
                              </CircleMarker>
                            </MapContainer>
                          </div>
                        ) : <span className='meta-v'>No segmented object location data.</span>}
                      </div>
                    ))
                  )}
                </div>
              </div>
              {/* Map */}
              <div>
                <div className="m-label">Upload Location</div>
                {Array.isArray(detail?.location_upload?.coordinates) && detail.location_upload.coordinates.length === 2 &&
                  typeof detail.location_upload.coordinates[0] === 'number' &&
                  typeof detail.location_upload.coordinates[1] === 'number' && (
                    <div style={{ border: '1px solid var(--border)', overflow: 'hidden', position: 'relative' }}>
                      <MapContainer
                        style={{ height: '200px', width: '100%', background: 'var(--surface)' }}
                        center={[detail.location_upload.coordinates[1], detail.location_upload.coordinates[0]]}
                        zoom={15}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <CircleMarker
                          key={reportId}
                          center={[detail.location_upload.coordinates[1], detail.location_upload.coordinates[0]]}
                          radius={8}
                          pathOptions={{
                            color: markerColor(detail.status),
                            fillColor: markerColor(detail.status),
                            fillOpacity: 0.85,
                            weight: 1.5,
                          }}
                        >
                          <Tooltip direction="top" offset={[0, -6]}>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem' }}>
                              <strong>{detail?.description_short ?? reportId.slice(0, 8)}</strong>
                              <br />
                              {detail.status ?? 'pending'}
                            </span>
                          </Tooltip>
                        </CircleMarker>
                      </MapContainer>
                    </div>
                  )}
              </div>
              {/* Metadata */}
              <div>
                <div className="m-label">Metadata</div>
                <div id="modal-meta">
                  <div className="meta-cell">
                    <div className="meta-k">Report ID</div>
                    <div className="meta-v">{detail.report_id}</div>
                  </div>
                  <div className="meta-cell">
                    <div className="meta-k">Status</div>
                    <div className="meta-v">{detail.status ?? '—'}</div>
                  </div>
                  <div className="meta-cell">
                    <div className="meta-k">Created</div>
                    <div className="meta-v">{formatDate(detail.created_at)}</div>
                  </div>
                  <div className="meta-cell">
                    <div className="meta-k">Upload Location</div>
                    <div className="meta-v">{loc_upload}</div>
                  </div>
                  <div className="meta-cell">
                    <div className="meta-k">Frames</div>
                    <div className="meta-v">{(detail.reported_frames ?? []).length}</div>
                  </div>
                  <div className="meta-cell">
                    <div className="meta-k">Duplicate of</div>
                    <div className="meta-v">
                      <span
                        style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', }}
                        onClick={() => {
                          onClose();
                          // small delay so modal unmounts cleanly before reopening
                          setTimeout(() => onOpenReport(detail.duplicate_of!), 50);
                        }}
                      >
                        {detail.duplicate_of}
                      </span>
                      {detail.duplicate_confidence != null && (
                        <span style={{ color: 'var(--muted)', marginLeft: '0.5rem' }}>
                          ({(detail.duplicate_confidence * 100).toFixed(0)}% match)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="meta-cell">
                    <div className="meta-k">Duplicates</div>
                    <div className="meta-v" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {detail.duplicates!.map(dupId => (
                        <span
                          key={dupId}
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '0.72rem',
                            color: 'var(--accent)',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                          onClick={() => {
                            onClose();
                            setTimeout(() => onOpenReport(dupId), 50);
                          }}
                        >
                          {dupId}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="meta-cell">
                    <div className="meta-k">Location segmented</div>
                    <div className="meta-v" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {detail.reported_frames?.map((f, index) =>
                        <span key={index}>
                          {f.location_segmented?.coordinates ? `${index}: ${f.location_segmented.coordinates[1].toFixed(6)}, ${f.location_segmented.coordinates[0].toFixed(6)}` : '—'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="meta-cell">
                    <div className="meta-k">Distance segmented from upload location</div>
                    <div className="meta-v" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {detail.reported_frames?.map((f, index) =>
                        <span key={index}>
                          {f.distance_median_from_reported_location != null ? `${index}: ${f.distance_median_from_reported_location.toFixed(2)}m` : '—'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}