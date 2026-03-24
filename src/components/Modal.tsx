import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ReportDetail } from '../types';
import { formatDate } from '../utils/format';
import AuthedImg from './AuthedImg';
import { API_BASE } from '../config';

interface Props {
  reportId:  string;
  detail:    ReportDetail | undefined;
  isLoading: boolean;
  error:     string | null;
  onClose:   () => void;
}

export default function Modal({ reportId, detail, isLoading, error, onClose }: Props) {
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

  const loc = detail?.location?.coordinates
    ? `${detail.location.coordinates[1].toFixed(6)}, ${detail.location.coordinates[0].toFixed(6)}`
    : '—';

  return createPortal(
    <div
      id="overlay"
      style={{ display: 'flex' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
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
                    <span style={{ color: 'var(--muted)', fontStyle: 'italic', fontWeight: 400 }}>
                      No summary yet
                    </span>
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
                    <div style={{
                      color: 'var(--muted)',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '0.7rem',
                    }}>
                      No frames available
                    </div>
                  ) : (
                    detail.reported_frames!.map((f, i) => (
                      <div className="m-frame" key={i}>
                        <AuthedImg
                          src={`${API_BASE}${f.frame_url}`}
                          className="m-frame-img"
                        />
                        <div className="m-frame-conf">
                          Confidence:{f.confidence != null ? (f.confidence * 100).toFixed(0) + '%' : '—'}
                        </div>
                        <div className="m-frame-mask">
                          Mask: {f.mask_coverage != null ? (f.mask_coverage * 100).toFixed(0) + '%' : '—'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
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
                    <div className="meta-k">Location</div>
                    <div className="meta-v">{loc}</div>
                  </div>
                  <div className="meta-cell">
                    <div className="meta-k">Frames</div>
                    <div className="meta-v">{(detail.reported_frames ?? []).length}</div>
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
