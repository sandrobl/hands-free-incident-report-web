import { useEffect } from 'react';
import { ReportSummary, ReportDetail } from '../types';
import { formatDate, statusBadgeClass, statusLabel } from '../utils/format';
import AuthedImg from './AuthedImg';
import { API_BASE } from '../config';

interface Props {
  report:        ReportSummary;
  detail:        ReportDetail | undefined;
  onFetchDetail: (id: string) => void;
  onClick:       (id: string) => void;
}

export default function ReportRow({ report, detail, onFetchDetail, onClick }: Props) {
  // Eagerly fetch detail when this row is first rendered (mirrors fetchDetailForRow)
  useEffect(() => {
    onFetchDetail(report.report_id);
  // We intentionally run only on mount; report_id never changes for a given row
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.report_id]);

  const frames        = detail?.reported_frames ?? [];
  const visibleFrames = frames.slice(0, 4);
  const extraCount    = frames.length - visibleFrames.length;

  const loc = detail?.location?.coordinates
    ? (() => {
        const [lng, lat] = detail.location!.coordinates;
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      })()
    : null;

  return (
    <tr onClick={() => onClick(report.report_id)}>
      {/* Report ID */}
      <td>
        <div className="td-id" title={report.report_id}>
          {report.report_id}
        </div>
      </td>

      {/* Summary */}
      <td>
        {!detail ? (
          <div className="td-short none">—</div>
        ) : detail.description_short ? (
          <div className="td-short">{detail.description_short}</div>
        ) : (
          <div className="td-short none">No summary yet</div>
        )}
      </td>

      {/* Frames strip */}
      <td>
        <div className="frames-strip">
          {!detail ? (
            <div className="frame-ph">…</div>
          ) : frames.length === 0 ? (
            <div className="frame-ph">none</div>
          ) : (
            <>
              {visibleFrames.map((f, i) => (
                <AuthedImg
                  key={i}
                  src={`${API_BASE}${f.frame_url}`}
                  className="frame-thumb"
                />
              ))}
              {extraCount > 0 && (
                <div className="frame-more">+{extraCount}</div>
              )}
            </>
          )}
        </div>
      </td>

      {/* Status badge */}
      <td>
        <span className={statusBadgeClass(report.status)}>
          {statusLabel(report.status)}
        </span>
      </td>

      {/* Location */}
      <td>
        <div className="td-loc">{loc ?? '—'}</div>
      </td>

      {/* Created */}
      <td>
        <div className="td-date">{formatDate(report.created_at)}</div>
      </td>
    </tr>
  );
}
