import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { connectSocket, appEvents } from '../../services/socket/socket.service';
import { loadAuth } from '../../services/storage/asyncStorage.service';
import {
  getHelpRequestById,
  respondBorrowItemRequest,
  respondOfferItemRequest,
} from '../../services/api/dailyHelp.api';
import { resolveBorrowImageUri } from '../../utils/borrowDisplay';
import { formatMinutesAsDurationLabel } from '../../utils/durationLabel';
import NativeCallService from '../../services/notifications/NativeCallService';
import { normalizeRecipientRole } from '../../utils/helpRecipientRole';

const sameId = (a, b) => String(a || '') === String(b || '');

/**
 * Incoming borrow (matched helper) + incoming offer (requester), on any screen.
 * Validates helperId / requesterId so only the intended counterparty sees the modal.
 */
const GlobalBorrowOfferItemModal = () => {
  const [visible, setVisible] = useState(false);
  const [kind, setKind] = useState(null);
  const [payload, setPayload] = useState(null);
  const [requestMeta, setRequestMeta] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const lastKeyRef = useRef('');

  const stateRef = useRef({ visible: false, kind: null, payload: null });
  useEffect(() => {
    stateRef.current = { visible, kind, payload };
  }, [visible, kind, payload]);

  const emitItemsChanged = useCallback((requestId) => {
    if (requestId) appEvents.emit('help:borrow_offer_items_changed', { requestId: String(requestId) });
  }, []);

  const close = useCallback(() => {
    try {
      NativeCallService.stopRingtone();
    } catch (e) {}
    setVisible(false);
    setPayload(null);
    setKind(null);
    setRequestMeta(null);
    setImageFailed(false);
  }, []);

  const tryOpen = useCallback(async (nextKind, raw) => {
    const data = raw || {};
    const auth = await loadAuth();
    const uid = String(auth?.userId || '');
    if (!uid || !auth?.accessToken) return;

    if (nextKind === 'borrow') {
      if (!sameId(data.helperId, uid)) return;
      const bid = String(data.borrowId || '');
      const rid = String(data.requestId || '');
      if (!bid || !rid) return;
    } else if (nextKind === 'offer') {
      const oid = String(data.offerId || data.borrowId || '');
      const rid = String(data.requestId || '');
      if (!oid || !rid) return;
      if (data.requesterId) {
        if (!sameId(data.requesterId, uid)) return;
      } else if (normalizeRecipientRole(data.recipientRole) !== 'requester') {
        return;
      }
    } else return;

    const dedupe = `${nextKind}:${data.requestId}:${data.borrowId || data.offerId || ''}`;
    if (lastKeyRef.current === dedupe) return;
    lastKeyRef.current = dedupe;
    setTimeout(() => {
      lastKeyRef.current = '';
    }, 1200);

    setKind(nextKind);
    setPayload(data);
    setRequestMeta(null);
    setImageFailed(false);
    setVisible(true);
    if (nextKind === 'borrow') {
      try {
        NativeCallService.startHelpRequestRingtone();
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (!visible || !payload?.requestId) return;
    let cancelled = false;
    (async () => {
      try {
        const auth = await loadAuth();
        const token = auth?.accessToken;
        if (!token) return;
        const res = await getHelpRequestById(token, String(payload.requestId), { cacheTtlMs: 0 });
        const req = res?.success && res?.data?.request ? res.data.request : res?.data?.request || null;
        if (cancelled || !req) return;
        setRequestMeta({
          categoryName: req.categoryName || req.category || '',
          description: req.description || '',
          status: req.status || '',
        });
      } catch (e) {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, payload?.requestId]);

  useEffect(() => {
    let socket;
    const setup = async () => {
      socket = await connectSocket();
      if (!socket) return;

      socket.on('help:borrow_requested', (p) => {
        tryOpen('borrow', p);
      });
      socket.on('help:offer_requested', (p) => {
        tryOpen('offer', p);
      });

      socket.on('help:borrow_response', (p) => {
        const rid = String(p?.requestId || '');
        emitItemsChanged(rid);
        const s = stateRef.current;
        if (!s.visible || s.kind !== 'borrow' || !s.payload) return;
        if (sameId(p?.requestId, s.payload.requestId) && sameId(p?.borrowId, s.payload.borrowId)) {
          close();
        }
      });

      socket.on('help:offer_response', (p) => {
        const rid = String(p?.requestId || '');
        emitItemsChanged(rid);
        const s = stateRef.current;
        if (!s.visible || s.kind !== 'offer' || !s.payload) return;
        const oid = String(s.payload.offerId || s.payload.borrowId || '');
        if (sameId(p?.requestId, s.payload.requestId) && (sameId(p?.offerId, oid) || sameId(p?.borrowId, oid))) {
          close();
        }
      });
    };
    setup();
    return () => {
      if (!socket) return;
      socket.off('help:borrow_requested');
      socket.off('help:offer_requested');
      socket.off('help:borrow_response');
      socket.off('help:offer_response');
    };
  }, [tryOpen, close, emitItemsChanged]);

  useEffect(() => {
    const onBorrowLocal = (data) => {
      if (data == null) {
        close();
        return;
      }
      tryOpen('borrow', data);
    };
    const onOfferLocal = (data) => {
      if (data == null) {
        close();
        return;
      }
      tryOpen('offer', data);
    };
    appEvents.on('help:borrow_requested_local', onBorrowLocal);
    appEvents.on('help:offer_requested_local', onOfferLocal);
    return () => {
      appEvents.off('help:borrow_requested_local', onBorrowLocal);
      appEvents.off('help:offer_requested_local', onOfferLocal);
    };
  }, [tryOpen, close]);

  const handleDecision = async (action) => {
    if (!payload || busy) return;
    const auth = await loadAuth();
    if (!auth?.accessToken) return;
    const rid = String(payload.requestId || '');
    try {
      setBusy(true);
      if (kind === 'borrow') {
        const bid = String(payload.borrowId || '');
        await respondBorrowItemRequest(auth.accessToken, rid, bid, action);
      } else {
        const oid = String(payload.offerId || payload.borrowId || '');
        await respondOfferItemRequest(auth.accessToken, rid, oid, action);
      }
      emitItemsChanged(rid);
      close();
    } catch (e) {
      /* user can retry */
    } finally {
      setBusy(false);
    }
  };

  const title =
    kind === 'borrow'
      ? String(payload?.requesterName || 'Requester')
      : String(payload?.helperName || 'Helper');
  const metaLine =
    [requestMeta?.categoryName, requestMeta?.description].filter(Boolean).join(' · ') || '';
  const statusLine = requestMeta?.status
    ? `Request status: ${String(requestMeta.status).replace(/_/g, ' ')}`
    : '';

  const itemName = String(payload?.itemName || '-');
  const note = String(payload?.note || '').trim();
  const mins = Number(payload?.requestedMinutes || 0);
  const timeLabel =
    formatMinutesAsDurationLabel(mins) || (Number.isFinite(mins) && mins > 0 ? `${mins} min` : '—');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={close}>
            <Icon name="close" size={24} color="#6B7280" />
          </TouchableOpacity>

          <Text style={styles.rolePill}>
            {kind === 'borrow' ? 'Item request (you are helping)' : 'Item offer from helper'}
          </Text>

          <View style={styles.avatarWrap}>
            <Icon name="account-circle" size={72} color="#9CA3AF" />
          </View>
          <Text style={styles.name}>{title}</Text>

          {!!metaLine && (
            <Text style={styles.requestContext} numberOfLines={3}>
              {metaLine}
            </Text>
          )}
          {!!statusLine && <Text style={styles.statusMuted}>{statusLine}</Text>}

          <View style={styles.divider} />

          <Text style={styles.itemLine}>{itemName}</Text>
          <Text style={styles.timeLine}>{timeLabel}</Text>
          {note ? <Text style={styles.quote}>"{note}"</Text> : null}

          <Image
            source={(() => {
              const resolved = resolveBorrowImageUri(payload?.imageUrl);
              const fallback =
                'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=60';
              if (!resolved || imageFailed) return { uri: fallback };
              return { uri: resolved };
            })()}
            style={styles.itemImage}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />

          {busy ? (
            <ActivityIndicator style={{ marginVertical: 8 }} color="#DC5C69" />
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.btn, styles.accept]} onPress={() => handleDecision('accept')}>
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.decline]} onPress={() => handleDecision('decline')}>
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  closeBtn: { position: 'absolute', right: 12, top: 10, zIndex: 2 },
  rolePill: {
    alignSelf: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  avatarWrap: { alignItems: 'center', marginTop: 4 },
  name: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  requestContext: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  statusMuted: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
  },
  divider: {
    marginTop: 10,
    marginBottom: 10,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  itemLine: { fontSize: 17, fontWeight: '600', color: '#111827' },
  timeLine: { fontSize: 15, color: '#6B7280', marginTop: 4, marginBottom: 8 },
  quote: { fontSize: 15, color: '#374151', fontStyle: 'italic', marginBottom: 10, lineHeight: 22 },
  itemImage: {
    width: '100%',
    height: 170,
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: '#F3F4F6',
  },
  actions: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  accept: { backgroundColor: '#E35F52' },
  decline: { backgroundColor: '#E5E7EB', borderWidth: 1, borderColor: '#D1D5DB' },
  acceptText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  declineText: { color: '#1F2937', fontWeight: '700', fontSize: 16 },
});

export default GlobalBorrowOfferItemModal;
