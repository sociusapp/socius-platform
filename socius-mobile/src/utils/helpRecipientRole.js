/** Pure role normalization for FCM / socket payloads — keep this file import-light to avoid Metro cycles. */

export function normalizeRecipientRole(value) {
  const v = String(value || '').toLowerCase().trim();
  if (v === 'helper' || v === 'volunteer' || v === 'responder') return 'helper';
  if (v === 'requester' || v === 'owner') return 'requester';
  return null;
}
