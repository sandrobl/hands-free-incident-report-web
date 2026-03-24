export function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
}

export function statusBadgeClass(status: string | null | undefined): string {
  const s = (status ?? '').toLowerCase();
  if (s === 'done' || s === 'completed') return 'badge badge-done';
  if (s === 'pending' || s === '')       return 'badge badge-pending';
  if (s === 'error' || s === 'failed')   return 'badge badge-error';
  return 'badge badge-default';
}

export function statusLabel(status: string | null | undefined): string {
  const s = (status ?? '').toLowerCase();
  if (s === 'pending' || s === '') return 'pending';
  return status ?? '—';
}
