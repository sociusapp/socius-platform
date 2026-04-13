import React, { useState } from 'react';
import { CircleDot, Users, MessageCircle, MessagesSquare, Scale, Activity, MapPin, ExternalLink, Play, Pause, Image as ImageIcon } from 'lucide-react';
import UserAvatar from '../../components/common/UserAvatar';

const ChatMessageContent = ({ msg, alignRight }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef(null);

  if (msg.messageType === 'image' && msg.attachment?.url) {
    return (
      <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-black/5 dark:bg-black/20">
        <img 
          src={msg.attachment.url} 
          alt="Chat attachment" 
          className="max-w-full h-auto cursor-pointer hover:opacity-95 transition-opacity"
          onClick={() => window.open(msg.attachment.url, '_blank')}
        />
        {msg.text && <p className="p-2 text-sm leading-snug">{msg.text}</p>}
      </div>
    );
  }

  if (msg.messageType === 'audio' && msg.attachment?.url) {
    const togglePlay = () => {
      if (audioRef.current) {
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play();
        setIsPlaying(!isPlaying);
      }
    };

    return (
      <div className={`mt-2 flex items-center gap-3 p-2 rounded-xl border ${
        alignRight 
          ? 'bg-socius-red/10 border-socius-red/20' 
          : 'bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700'
      }`}>
        <button 
          onClick={togglePlay}
          className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${
            alignRight ? 'bg-socius-red text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
          }`}
        >
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full ${alignRight ? 'bg-socius-red' : 'bg-gray-500'} transition-all duration-300`} style={{ width: isPlaying ? '100%' : '0%' }}></div>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] font-medium opacity-70">Audio Message</span>
            {msg.attachment.durationSec && (
              <span className="text-[10px] tabular-nums opacity-70">{msg.attachment.durationSec}s</span>
            )}
          </div>
        </div>
        <audio 
          ref={audioRef} 
          src={msg.attachment.url} 
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          className="hidden"
        />
      </div>
    );
  }

  if (msg.messageType === 'location' && msg.attachment?.lat) {
    const { lat, lng, address } = msg.attachment;
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    return (
      <div className="mt-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="p-3 space-y-2">
          <div className="flex items-start gap-2">
            <MapPin size={16} className="text-socius-red shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-900 dark:text-white leading-snug">Shared Location</p>
              {address && <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2 mt-0.5">{address}</p>}
            </div>
          </div>
          <button 
            onClick={() => window.open(mapsUrl, '_blank')}
            className="w-full py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-[11px] font-bold text-gray-700 dark:text-gray-200 transition-colors flex items-center justify-center gap-1.5"
          >
            View on Maps <ExternalLink size={12} />
          </button>
        </div>
      </div>
    );
  }

  // Default text or unknown type
  const isGeneric = !['text', 'image', 'audio', 'location'].includes(msg.messageType);
  return (
    <div className="text-sm whitespace-pre-wrap break-words leading-snug">
      {isGeneric && <span className="text-[10px] font-bold uppercase opacity-50 block mb-1">[{msg.messageType}]</span>}
      {msg.text || (isGeneric ? JSON.stringify(msg.attachment) : '')}
    </div>
  );
};

export const formatDateTime = (value) => {
  if (!value) return '-';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString();
  } catch {
    return '-';
  }
};

export const safeText = (value) => {
  const s = String(value || '').trim();
  return s || '-';
};

export const extractApproxLatLng = (detailType, detailData) => {
  const location =
    detailType === 'help'
      ? detailData?.request?.location
      : detailType === 'presence'
        ? detailData?.location || detailData?.request?.location
        : detailData?.location;

  const coords = location?.coordinatesApprox || location?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;

  const lng = Number(coords[0]);
  const lat = Number(coords[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    lat,
    lng,
    label: location?.address || location?.whereToFindText || null,
  };
};

export const timelineKindStyle = (kind) => {
  switch (kind) {
    case 'request':
      return 'border-l-socius-red/80 bg-gray-50/95 dark:bg-gray-900/55 dark:border-l-socius-red/60';
    case 'match':
    case 'presence_match':
      return 'border-l-socius-red bg-socius-red/[0.06] dark:bg-socius-red/10 dark:border-l-socius-red';
    case 'message':
      return 'border-l-gray-400 bg-gray-50 dark:bg-gray-800/55';
    case 'chat':
      return 'border-l-gray-500 bg-gray-50/90 dark:bg-gray-800/45';
    case 'closure':
      return 'border-l-amber-500/90 bg-amber-50/50 dark:bg-amber-950/25';
    default:
      return 'border-l-gray-300 bg-gray-50/90 dark:bg-gray-800/40';
  }
};

const kindDotClass = (kind) => {
  switch (kind) {
    case 'request':
    case 'match':
    case 'presence_match':
      return 'bg-socius-red';
    case 'message':
      return 'bg-gray-500 dark:bg-gray-400';
    case 'chat':
      return 'bg-gray-600 dark:bg-gray-500';
    case 'closure':
      return 'bg-amber-500';
    default:
      return 'bg-gray-400';
  }
};

const KindIcon = ({ kind, className }) => {
  const cn = className || 'h-3.5 w-3.5';
  switch (kind) {
    case 'request':
      return <CircleDot className={cn} />;
    case 'match':
    case 'presence_match':
      return <Users className={cn} />;
    case 'message':
      return <MessageCircle className={cn} />;
    case 'chat':
      return <MessagesSquare className={cn} />;
    case 'closure':
      return <Scale className={cn} />;
    default:
      return <Activity className={cn} />;
  }
};

const humanizeDetailKey = (k) =>
  String(k || '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();

const isUserLikeDetail = (v) =>
  v &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  (v.fullName != null || v.phone != null);

const TimelineEventDetails = ({ detail }) => {
  if (!detail || typeof detail !== 'object') return null;
  const restKeys = Object.keys(detail).filter((k) => {
    if (k === 'text') return false;
    const v = detail[k];
    return v != null && v !== '';
  });
  if (!restKeys.length && !(detail.text != null && String(detail.text).trim() !== '')) return null;

  const textVal =
    detail.text != null && String(detail.text).trim() !== '' ? String(detail.text).trim() : null;

  return (
    <div className="mt-3 space-y-3">
      {textVal ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60 px-3 py-2 text-sm text-gray-800 dark:text-gray-100">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 block mb-1">
            Message
          </span>
          <span className="whitespace-pre-wrap break-words">{textVal}</span>
        </div>
      ) : null}

      {restKeys.map((k) => {
        const v = detail[k];
        if (isUserLikeDetail(v)) {
          const name = safeText(v.fullName);
          return (
            <div
              key={k}
              className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900/55 px-3 py-3"
            >
              <UserAvatar src={v.profileImage} name={name} size="md" className="shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-socius-red dark:text-red-400/90">
                  {humanizeDetailKey(k)}
                </div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{name}</div>
                {v.phone ? <div className="text-xs text-gray-600 dark:text-gray-400">{safeText(v.phone)}</div> : null}
              </div>
            </div>
          );
        }

        if (Array.isArray(v)) {
          if (!v.length) return null;
          return (
            <div key={k} className="rounded-lg border border-gray-200/90 dark:border-gray-700 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                {humanizeDetailKey(k)}
              </div>
              <ul className="list-disc list-inside text-xs text-gray-700 dark:text-gray-300 space-y-0.5">
                {v.map((item, i) => (
                  <li key={i} className="break-all">
                    {typeof item === 'object' && item !== null ? JSON.stringify(item) : String(item)}
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        if (v !== null && typeof v === 'object') {
          const nested = Object.entries(v).filter(([, nv]) => nv != null && nv !== '');
          if (!nested.length) return null;
          const allPrimitive = nested.every(([, nv]) =>
            ['string', 'number', 'boolean'].includes(typeof nv)
          );
          if (allPrimitive) {
            return (
              <div
                key={k}
                className="rounded-lg border border-gray-200/90 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-950/35 px-3 py-2"
              >
                <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                  {humanizeDetailKey(k)}
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  {nested.map(([sk, sv]) => (
                    <div key={sk} className="sm:col-span-1">
                      <dt className="text-gray-500 dark:text-gray-500 capitalize">{humanizeDetailKey(sk)}</dt>
                      <dd className="text-gray-900 dark:text-gray-100 font-medium break-all">{String(sv)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          }
          return (
            <div key={k} className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase text-gray-500 mb-1">{humanizeDetailKey(k)}</div>
              <pre className="text-[10px] leading-relaxed text-gray-600 dark:text-gray-400 overflow-x-auto max-h-40">
                {JSON.stringify(v, null, 2)}
              </pre>
            </div>
          );
        }

        if (k === 'distanceMeters' && typeof v === 'number' && Number.isFinite(v)) {
          return (
            <div key={k} className="flex items-baseline gap-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400 font-medium">{humanizeDetailKey(k)}</span>
              <span className="tabular-nums font-semibold text-gray-900 dark:text-gray-100">{Math.round(v)} m</span>
            </div>
          );
        }

        return (
          <div
            key={k}
            className="flex flex-col gap-0.5 text-sm py-2 border-b border-gray-100 dark:border-gray-800/90 last:border-0 last:pb-0 first:pt-0"
          >
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
              {humanizeDetailKey(k)}
            </span>
            <span className="text-gray-900 dark:text-gray-100 break-words">{String(v)}</span>
          </div>
        );
      })}
    </div>
  );
};

export const SummaryChips = ({ pairs = [] }) =>
  pairs.length ? (
    <div className="flex flex-wrap gap-2">
      {pairs.map(({ label, value }) => (
        <span
          key={label}
          className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-800 dark:text-gray-200 ring-1 ring-inset ring-gray-500/15"
        >
          {label}
          <span className="ml-1 font-bold tabular-nums">{value}</span>
        </span>
      ))}
    </div>
  ) : null;

const formatChatTime = (value) => {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const sameCalendarDay = (a, b) => {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

const formatDayLabel = (value) => {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
};

/** Normalize Mongo / JSON user ids for reliable comparison */
const toIdStr = (v) => {
  if (v == null || v === '') return '';
  if (typeof v === 'object') {
    if (v.$oid != null) return String(v.$oid);
    if (v._id != null) return String(v._id);
  }
  return String(v);
};

const compactAttachmentJson = (att) => {
  if (!att || typeof att !== 'object') return null;
  const cleaned = {};
  for (const [k, val] of Object.entries(att)) {
    if (val == null || val === '') continue;
    cleaned[k] = val;
  }
  if (!Object.keys(cleaned).length) return null;
  try {
    return JSON.stringify(cleaned);
  } catch {
    return null;
  }
};

/** Admin-themed read-only transcript: requester left, helper right (Socius accent). */
export const AdminChatPanel = ({ chatActivity }) => {
  if (!chatActivity?.sessions?.length) return null;

  const { sessions, messagesBySession, messagesTruncated } = chatActivity;
  const sortedSessions = [...sessions].sort((a, b) => {
    const ta = new Date(a.openedAt || a.createdAt || 0).getTime();
    const tb = new Date(b.openedAt || b.createdAt || 0).getTime();
    return ta - tb;
  });

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm mb-6">
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-800 text-white dark:bg-gray-950 border-b-2 border-socius-red">
        <div className="flex items-center gap-2 min-w-0">
          <MessagesSquare className="h-5 w-5 shrink-0 text-red-200" />
          <div className="min-w-0">
            <h4 className="text-sm font-semibold truncate">Messages</h4>
            <p className="text-[11px] text-gray-300 truncate">Read-only · same order as chat</p>
          </div>
        </div>
        {messagesTruncated ? (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-200 shrink-0">
            Truncated
          </span>
        ) : null}
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {sortedSessions.map((session) => {
          const sid = String(session.id);
          const msgs = messagesBySession[sid] || [];
          const reqName = safeText(session.requester?.fullName || 'Requester');
          const helprName = safeText(session.helper?.fullName || 'Helper');
          const reqIdRaw = session.requester?.id ?? session.requester?._id;
          const helperIdRaw = session.helper?.id ?? session.helper?._id;
          const reqId = reqIdRaw != null ? toIdStr(reqIdRaw) : '';
          const helperId = helperIdRaw != null ? toIdStr(helperIdRaw) : '';
          const sessionLabel = [reqName, helprName].filter((x) => x && x !== '-').join(' · ');

          return (
            <div key={sid} className="bg-gray-50 dark:bg-gray-950">
              <div className="px-3 py-2.5 bg-gray-100/90 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <div className="flex items-center gap-1.5 shrink-0">
                  <UserAvatar src={session.requester?.profileImage} name={reqName} size="sm" />
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 px-0.5" aria-hidden>
                    ·
                  </span>
                  <UserAvatar src={session.helper?.profileImage} name={helprName} size="sm" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate">{sessionLabel}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Opened {formatDateTime(session.openedAt)}
                    {session.status === 'closed' && session.closedAt ? ` · Closed ${formatChatTime(session.closedAt)}` : ''}
                  </p>
                </div>
              </div>

              <div className="px-3 py-4 space-y-1 max-h-[min(520px,62vh)] overflow-y-auto bg-white dark:bg-gray-900/40">
                {!msgs.length ? (
                  <p className="text-center text-xs text-gray-500 dark:text-gray-500 py-6">No messages in this session.</p>
                ) : (
                  msgs.map((msg, idx) => {
                    const senderId =
                      toIdStr(msg.sender?.id) || toIdStr(msg.sender?._id) || '';
                    const isRequesterSide = reqId && senderId && senderId === reqId;
                    const isHelperSide = helperId && senderId && senderId === helperId;
                    const alignRight = isHelperSide;
                    const label = safeText(
                      msg.sender?.fullName ||
                        (isHelperSide ? helprName : isRequesterSide ? reqName : 'Participant')
                    );

                    const prev = idx > 0 ? msgs[idx - 1] : null;
                    const showDay = !prev || !sameCalendarDay(prev.createdAt, msg.createdAt);
                    const prevSid = toIdStr(prev?.sender?.id) || toIdStr(prev?.sender?._id) || '';
                    const showName = prevSid === '' || senderId === '' || prevSid !== senderId;

                    const text =
                      msg.messageType === 'text' && msg.text != null
                        ? String(msg.text)
                        : `[${safeText(msg.messageType)}]`;

                    const attStr = compactAttachmentJson(msg.attachment);

                    return (
                      <React.Fragment key={String(msg.id ?? idx)}>
                        {showDay ? (
                          <div className="flex justify-center my-3">
                            <span className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-gray-200/90 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300/50 dark:border-gray-600">
                              {formatDayLabel(msg.createdAt)}
                            </span>
                          </div>
                        ) : null}
                        <div
                          className={`flex w-full ${alignRight ? 'justify-end' : 'justify-start'} mb-1`}
                        >
                          <div
                            className={`max-w-[min(100%,28rem)] rounded-2xl px-3 py-2 shadow-sm ${
                              alignRight
                                ? 'bg-socius-red/12 dark:bg-socius-red/20 text-gray-900 dark:text-gray-100 border border-socius-red/35 dark:border-red-800/50 rounded-tr-sm'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-tl-sm'
                            }`}
                          >
                            {showName ? (
                              <div
                                className={`text-[10px] font-semibold mb-0.5 truncate ${
                                  alignRight
                                    ? 'text-right text-socius-red dark:text-red-300'
                                    : 'text-left text-gray-600 dark:text-gray-400'
                                }`}
                              >
                                {label}
                              </div>
                            ) : null}
                            <ChatMessageContent msg={msg} alignRight={alignRight} />
                            <div
                              className={`text-[10px] mt-1 tabular-nums text-gray-500 dark:text-gray-500 ${
                                alignRight ? 'text-right' : 'text-left'
                              }`}
                            >
                              {formatChatTime(msg.createdAt)}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const StatCards = ({ pairs = [] }) =>
  pairs.length ? (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {pairs.map(({ label, value }) => (
        <div
          key={label}
          className="rounded-xl border border-gray-200/80 dark:border-gray-700 bg-white/80 dark:bg-gray-900/60 px-4 py-3 shadow-sm"
        >
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {label}
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{value}</div>
        </div>
      ))}
    </div>
  ) : null;

export const ActivityTimeline = ({
  events = [],
  chatMeta,
  variant = 'compact',
  title = 'Activity & messages',
  showTruncationHint = true,
}) => {
  const isFull = variant === 'full';

  const listClass = isFull
    ? 'relative space-y-0 border-l-2 border-socius-red/25 dark:border-socius-red/35 ml-3 pl-8 pb-1'
    : 'space-y-2 max-h-[min(420px,55vh)] overflow-y-auto pr-1';

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/40 p-4 md:p-6">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-socius-red opacity-90" />
          <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">{title}</h4>
        </div>
        {showTruncationHint && chatMeta?.messagesTruncated ? (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            Messages capped (latest chunk)
          </span>
        ) : null}
      </div>
      {!events.length ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No timeline events recorded for this request.</p>
      ) : (
        <ul className={listClass}>
          {events.map((ev, idx) => (
            <li
              key={`${ev.at}-${idx}-${ev.kind}`}
              className={
                isFull
                  ? 'relative pb-8 last:pb-0'
                  : `rounded-lg border border-gray-100 dark:border-gray-700 pl-3 py-2 text-sm border-l-4 ${timelineKindStyle(ev.kind)}`
              }
            >
              {isFull ? (
                <>
                  <span
                    className={`absolute -left-[calc(0.5rem+9px)] top-1 flex h-7 w-7 items-center justify-center rounded-full text-white shadow-md ring-4 ring-white dark:ring-gray-900 ${kindDotClass(ev.kind)}`}
                  >
                    <KindIcon kind={ev.kind} className="h-3.5 w-3.5" />
                  </span>
                  <div
                    className={`rounded-xl border border-gray-200/90 dark:border-gray-700/90 pl-4 pr-4 py-3.5 border-l-4 shadow-sm ${timelineKindStyle(ev.kind)}`}
                  >
                    <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                      {formatDateTime(ev.at)}
                    </div>
                    <div className="mt-1 text-base font-semibold text-gray-900 dark:text-white leading-snug">
                      {ev.label}
                    </div>
                    <TimelineEventDetails detail={ev.detail} />
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[10px] font-mono text-gray-500 dark:text-gray-400">
                    {formatDateTime(ev.at)}
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{ev.label}</div>
                  {ev.detail && Object.keys(ev.detail).length > 0 ? (
                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
                      {ev.detail.text != null && String(ev.detail.text).trim() !== '' ? (
                        <div>
                          <span className="font-medium text-gray-500 dark:text-gray-400">Text: </span>
                          <span className="whitespace-pre-wrap break-words">{String(ev.detail.text)}</span>
                        </div>
                      ) : null}
                      {Object.entries(ev.detail)
                        .filter(([k]) => k !== 'text')
                        .map(([k, v]) => (
                          <div key={k} className="font-mono text-[11px] break-all">
                            <span className="text-gray-500 dark:text-gray-400">{k}: </span>
                            {typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}
                          </div>
                        ))}
                    </div>
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
