import { baseURL } from '../services/api/client';

/** Resolve stored borrow image path to a loadable URI (absolute or /uploads). */
export function resolveBorrowImageUri(rawInput) {
  let raw = String(rawInput || '').trim();
  if (!raw || raw === 'undefined' || raw === 'null') return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  // Legacy or malformed paths: closures are served under /uploads/closures
  if (raw.startsWith('/closures/')) {
    raw = `/uploads${raw}`;
  }
  if (raw.startsWith('/uploads/') || raw.startsWith('uploads/')) {
    const root = String(baseURL || '').replace(/\/api\/?$/, '');
    const pathPart = raw.startsWith('/') ? raw : `/${raw}`;
    return `${root}${pathPart}`;
  }
  return '';
}

export function formatBorrowDateTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}
