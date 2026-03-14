import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import InCallManager from 'react-native-incall-manager';
import { LinearGradient } from 'expo-linear-gradient';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  MediaStream,
  mediaDevices,
} from 'react-native-webrtc';
import { useResponsive } from '../../utils/responsive';
import { getSocket, connectSocket } from '../../services/socket/socket.service';
import MotionPressable from '../../components/common/MotionPressable';
import MotionView from '../../components/common/MotionView';

const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

const P2PCallScreen = ({ navigation, route }) => {
  const { ms, spacing, vscale, scale, contentWidth } = useResponsive();
  const callId = route?.params?.callId;
  const otherUserId = route?.params?.otherUserId;
  const otherUserName = route?.params?.otherUserName || 'User';
  const isCaller = !!route?.params?.isCaller;
  const initialOffer = route?.params?.initialOffer;

  const pcRef = useRef(null);
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream());
  const connectedRef = useRef(false);
  const statsTimerRef = useRef(null);
  const callTimeoutRef = useRef(null);
  const startedAtRef = useRef(Date.now());
  const answeredTrackedRef = useRef(false);
  const lastQualitySentAtRef = useRef(0);

  const [status, setStatus] = useState(isCaller ? 'Calling…' : 'Connecting…');
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [hold, setHold] = useState(false);
  const [connectedAt, setConnectedAt] = useState(null);
  const [connectTimeMs, setConnectTimeMs] = useState(null);
  const [stats, setStats] = useState({ rttMs: null, jitterMs: null, packetsLost: null, bitrateKbps: null });
  const [pendingOffer, setPendingOffer] = useState(initialOffer || null);

  const safeCallId = useMemo(() => String(callId || ''), [callId]);
  const safeOtherId = useMemo(() => String(otherUserId || ''), [otherUserId]);

  const track = async (eventType, { metrics, failureReason } = {}) => {
    try {
      if (!safeCallId || !safeOtherId) return;
      let s = socketRef.current;
      if (!s || !s.connected) {
        s = getSocket();
      }
      if (!s || !s.connected) {
        s = await connectSocket();
      }
      socketRef.current = s;
      if (!s || !s.connected) return;
      const direction = isCaller ? 'outgoing' : 'incoming';
      s.emit('call:track', {
        callId: safeCallId,
        peerUserId: safeOtherId,
        direction,
        eventType,
        callType: 'p2p_audio',
        occurredAt: new Date().toISOString(),
        device: {
          platform: Platform.OS,
          osVersion: String(Platform.Version),
        },
        metrics: metrics || undefined,
        failureReason: failureReason || undefined,
      });
    } catch (e) {}
  };

  const cleanupCall = async ({ sendEnd = false } = {}) => {
    try {
      const s = socketRef.current;
      if (sendEnd && s && s.connected && safeCallId && safeOtherId) {
        s.emit('call:signal', { callId: safeCallId, toUserId: safeOtherId, type: 'end', data: null });
      }
    } catch (e) {}

    try {
      if (statsTimerRef.current) {
        clearInterval(statsTimerRef.current);
        statsTimerRef.current = null;
      }
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
    } catch (e) {}

    try {
      InCallManager.stopRingback();
    } catch (e) {}

    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    } catch (e) {}

    try {
      if (pcRef.current) {
        pcRef.current.onicecandidate = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.ontrack = null;
        pcRef.current.close();
      }
    } catch (e) {}

    try {
      InCallManager.stop();
    } catch (e) {}
  };

  const endCall = async () => {
    track('ended');
    await cleanupCall({ sendEnd: true });
    navigation.goBack();
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    try {
      const s = localStreamRef.current;
      if (s) {
        s.getAudioTracks().forEach((t) => {
          t.enabled = !(next || hold);
        });
      }
    } catch (e) {}
  };

  const toggleHold = () => {
    const next = !hold;
    setHold(next);
    try {
      const s = localStreamRef.current;
      if (s) {
        s.getAudioTracks().forEach((t) => {
          t.enabled = !(muted || next);
        });
      }
    } catch (e) {}
  };

  const toggleSpeaker = async () => {
    const next = !speaker;
    setSpeaker(next);
    try {
      InCallManager.setSpeakerphoneOn(next);
    } catch (e) {}
  };

  const beginStatsPolling = () => {
    if (statsTimerRef.current) return;
    let lastBytes = 0;
    let lastAt = Date.now();
    statsTimerRef.current = setInterval(async () => {
      try {
        if (!pcRef.current) return;
        const report = await pcRef.current.getStats();
        let rttMs = null;
        let jitterMs = null;
        let packetsLost = null;
        let bytesReceived = null;

        report.forEach((v) => {
          if (v.type === 'candidate-pair' && v.state === 'succeeded' && v.currentRoundTripTime != null) {
            rttMs = Math.round(Number(v.currentRoundTripTime) * 1000);
          }
          if (v.type === 'inbound-rtp' && v.kind === 'audio') {
            if (typeof v.jitter === 'number') jitterMs = Math.round(v.jitter * 1000);
            if (typeof v.packetsLost === 'number') packetsLost = v.packetsLost;
            if (typeof v.bytesReceived === 'number') bytesReceived = v.bytesReceived;
          }
        });

        let bitrateKbps = null;
        if (typeof bytesReceived === 'number') {
          const now = Date.now();
          const dt = Math.max(1, now - lastAt);
          const dbytes = Math.max(0, bytesReceived - lastBytes);
          bitrateKbps = Math.round((dbytes * 8) / dt);
          lastBytes = bytesReceived;
          lastAt = now;
        }

        setStats({ rttMs, jitterMs, packetsLost, bitrateKbps });
        if (connectedRef.current) {
          const now = Date.now();
          if (now - lastQualitySentAtRef.current >= 5000) {
            lastQualitySentAtRef.current = now;
            track('quality', { metrics: { rttMs, jitterMs, packetsLost, bitrateKbps } });
          }
        }
      } catch (e) {}
    }, 1500);
  };

  const acceptIncoming = async () => {
    const offer = pendingOffer;
    const pc = pcRef.current;
    const s = socketRef.current;
    if (!offer || !pc || !s || !s.connected) return;
    setPendingOffer(null);
    setStatus('Connecting…');
    track('answered');
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      s.emit('call:signal', { callId: safeCallId, toUserId: safeOtherId, type: 'answer', data: answer });
      beginStatsPolling();
    } catch (e) {
      track('failed', { failureReason: 'answer_failed' });
      setStatus('Call setup failed');
    }
  };

  const declineIncoming = async () => {
    track('rejected');
    await cleanupCall({ sendEnd: true });
    navigation.goBack();
  };

  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      if (!safeCallId || !safeOtherId) {
        setStatus('Invalid call');
        return;
      }

      try {
        InCallManager.start({ media: 'audio' });
        InCallManager.setSpeakerphoneOn(true);
        InCallManager.setForceSpeakerphoneOn(true);
      } catch (e) {}

      const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
      pcRef.current = pc;

      pc.ontrack = (event) => {
        try {
          const stream0 = event?.streams?.[0];
          if (stream0) {
            remoteStreamRef.current = stream0;
            return;
          }
          const track = event?.track;
          if (track) {
            remoteStreamRef.current.addTrack(track);
          }
        } catch (e) {}
      };

      pc.oniceconnectionstatechange = () => {
        const st = pc.iceConnectionState;
        if (!mounted) return;
        if (st === 'failed') {
          try {
            if (typeof pc.restartIce === 'function') pc.restartIce();
          } catch (e) {}
        }
      };

      pc.onicecandidate = (event) => {
        const cand = event?.candidate;
        if (!cand) return;
        const s = socketRef.current;
        if (!s || !s.connected) return;
        s.emit('call:signal', { callId: safeCallId, toUserId: safeOtherId, type: 'ice', data: cand });
      };

      pc.onconnectionstatechange = () => {
        const st = pc.connectionState;
        if (!mounted) return;
        if (st === 'connected') {
          connectedRef.current = true;
          try {
            InCallManager.stopRingback();
          } catch (e) {}
          if (!connectedAt) {
            const now = Date.now();
            setConnectedAt(now);
            setConnectTimeMs(Math.max(0, now - startedAtRef.current));
          }
          if (!answeredTrackedRef.current) {
            answeredTrackedRef.current = true;
            track('answered');
          }
          setStatus('Connected');
          return;
        }
        if (st === 'failed' || st === 'disconnected' || st === 'closed') {
          if (connectedRef.current) {
            setStatus('Call ended');
          }
        }
      };

      try {
        const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });
      } catch (e) {
        setStatus('Microphone permission needed');
        return;
      }

      let s = getSocket();
      if (!s || !s.connected) {
        s = await connectSocket();
      }
      socketRef.current = s;

      if (!s || !s.connected) {
        setStatus('Connection failed');
        track('failed', { failureReason: 'socket_not_connected' });
        return;
      }

      const onSignal = async (payload) => {
        if (!payload) return;
        if (String(payload.callId) !== safeCallId) return;
        if (String(payload.fromUserId) !== safeOtherId) return;

        const type = String(payload.type);
        const data = payload.data;

        if (type === 'end') {
          track('ended');
          await cleanupCall({ sendEnd: false });
          navigation.goBack();
          return;
        }

        if (type === 'offer') {
          if (!isCaller) {
            setPendingOffer(data || null);
            if (mounted) setStatus('Incoming call…');
            track('ringing');
            return;
          }
          return;
        }

        if (type === 'answer') {
          try {
            try {
              InCallManager.stopRingback();
            } catch (e) {}
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            if (mounted) {
              if (!connectedRef.current) {
                const now = Date.now();
                setConnectedAt(now);
                setConnectTimeMs(Math.max(0, now - startedAtRef.current));
              }
              setStatus('Connected');
            }
            if (!answeredTrackedRef.current) {
              answeredTrackedRef.current = true;
              track('answered');
            }
            beginStatsPolling();
          } catch (e) {}
          return;
        }

        if (type === 'ice') {
          try {
            if (data) {
              await pc.addIceCandidate(new RTCIceCandidate(data));
            }
          } catch (e) {}
        }
      };

      s.on('call:signal', onSignal);

      if (isCaller) {
        track('attempt');
        try {
          try {
            InCallManager.startRingback();
          } catch (e) {}
          const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
          await pc.setLocalDescription(offer);
          s.emit('call:signal', { callId: safeCallId, toUserId: safeOtherId, type: 'offer', data: offer });
          if (mounted) setStatus('Calling…');
        } catch (e) {
          track('failed', { failureReason: 'offer_failed' });
          if (mounted) setStatus('Call setup failed');
        }
      } else {
        if (mounted) setStatus('Incoming call…');
      }

      callTimeoutRef.current = setTimeout(async () => {
        if (!mounted) return;
        if (connectedRef.current) return;
        setStatus('No response');
        track(isCaller ? 'missed' : 'ended');
        await cleanupCall({ sendEnd: true });
        navigation.goBack();
      }, 25000);

      return () => {
        try {
          s.off('call:signal', onSignal);
        } catch (e) {}
      };
    };

    let cleanupSignal = null;
    setup().then((c) => {
      cleanupSignal = c;
    });

    return () => {
      mounted = false;
      if (cleanupSignal) cleanupSignal();
      cleanupCall({ sendEnd: false });
    };
  }, []);

  const connected = connectedRef.current;
  const phase = connected
    ? 'in_call'
    : isCaller
      ? 'outgoing_ringing'
      : pendingOffer
        ? 'incoming_ringing'
        : 'connecting';

  const statusText = (() => {
    const s = String(status || '');
    const errorish = [
      'Call setup failed',
      'Connection failed',
      'Microphone permission needed',
      'No response',
      'Invalid call',
      'Call ended',
    ];
    if (errorish.includes(s)) return s;
    if (hold && phase === 'in_call') return 'On hold';
    if (phase === 'outgoing_ringing') return 'Calling…';
    if (phase === 'incoming_ringing') return 'Incoming call…';
    if (phase === 'in_call') return 'Audio call';
    return 'Connecting…';
  })();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <LinearGradient colors={['#0B1220', '#07101D', '#050A12']} style={styles.container}>
        <View style={[styles.content, { paddingHorizontal: spacing(22) }]}>
          <MotionView preset="fadeDown" style={[styles.top, { paddingTop: vscale(18) }]}>
            <Text style={[styles.name, { fontSize: ms(26) }]} numberOfLines={1}>
              {otherUserName}
            </Text>
            <Text style={[styles.status, { fontSize: ms(14), marginTop: vscale(8) }]}>
              {statusText}
            </Text>
            {connectedAt ? (
              <Text style={[styles.subStatus, { fontSize: ms(12), marginTop: vscale(8) }]}>
                {`${Math.floor((Date.now() - connectedAt) / 1000)}s${connectTimeMs != null ? ` • ${(Math.round(connectTimeMs / 100) / 10).toFixed(1)}s connect` : ''}`}
              </Text>
            ) : null}
          </MotionView>

          <MotionView preset="zoomIn" style={[styles.avatarWrap, { marginTop: vscale(44) }]}>
            <View style={[styles.avatar, { width: scale(128), height: scale(128), borderRadius: scale(64) }]}>
              <Icon name="account" size={scale(62)} color="#FFFFFF" />
            </View>
          </MotionView>

          <View style={[styles.bottom, { width: contentWidth }]}>
            {phase === 'incoming_ringing' ? (
              <MotionView preset="fadeUp" style={[styles.incomingActions, { marginTop: vscale(56) }]}>
                <MotionPressable
                  onPress={declineIncoming}
                  style={[styles.actionCircle, styles.declineCircle, { width: scale(74), height: scale(74), borderRadius: scale(37) }]}
                  accessibilityRole="button"
                  accessibilityLabel="Decline call"
                >
                  <Icon name="phone-hangup" size={scale(26)} color="#FFFFFF" />
                  <Text style={[styles.actionLabel, { fontSize: ms(12), marginTop: vscale(10) }]}>Decline</Text>
                </MotionPressable>

                <MotionPressable
                  onPress={acceptIncoming}
                  style={[styles.actionCircle, styles.acceptCircle, { width: scale(74), height: scale(74), borderRadius: scale(37) }]}
                  accessibilityRole="button"
                  accessibilityLabel="Accept call"
                >
                  <Icon name="phone" size={scale(26)} color="#FFFFFF" />
                  <Text style={[styles.actionLabel, { fontSize: ms(12), marginTop: vscale(10) }]}>Accept</Text>
                </MotionPressable>
              </MotionView>
            ) : null}

            {phase === 'outgoing_ringing' || phase === 'connecting' ? (
              <MotionView preset="fadeUp" style={[styles.singleEndWrap, { marginTop: vscale(64) }]}>
                <MotionPressable
                  onPress={endCall}
                  style={[styles.endCircle, { width: scale(76), height: scale(76), borderRadius: scale(38) }]}
                  accessibilityRole="button"
                  accessibilityLabel="End call"
                >
                  <Icon name="phone-hangup" size={scale(28)} color="#FFFFFF" />
                </MotionPressable>
                <Text style={[styles.endHint, { fontSize: ms(12), marginTop: vscale(12) }]}>Tap to cancel</Text>
              </MotionView>
            ) : null}

            {phase === 'in_call' ? (
              <MotionView preset="fadeUp" style={[styles.inCallControls, { marginTop: vscale(54) }]}>
                <View style={styles.ctrlRow}>
                  <MotionPressable
                    onPress={toggleMute}
                    style={[styles.ctrlCircle, { width: scale(68), height: scale(68), borderRadius: scale(34) }]}
                    accessibilityRole="button"
                    accessibilityLabel="Mute"
                  >
                    <Icon name={muted ? 'microphone-off' : 'microphone'} size={scale(24)} color="#FFFFFF" />
                    <Text style={[styles.ctrlLabel, { fontSize: ms(12), marginTop: vscale(8) }]}>{muted ? 'Muted' : 'Mute'}</Text>
                  </MotionPressable>

                  <MotionPressable
                    onPress={toggleSpeaker}
                    style={[styles.ctrlCircle, { width: scale(68), height: scale(68), borderRadius: scale(34) }]}
                    accessibilityRole="button"
                    accessibilityLabel="Speaker"
                  >
                    <Icon name={speaker ? 'volume-high' : 'volume-low'} size={scale(24)} color="#FFFFFF" />
                    <Text style={[styles.ctrlLabel, { fontSize: ms(12), marginTop: vscale(8) }]}>{speaker ? 'Speaker' : 'Earpiece'}</Text>
                  </MotionPressable>

                  <MotionPressable
                    onPress={toggleHold}
                    style={[styles.ctrlCircle, { width: scale(68), height: scale(68), borderRadius: scale(34) }]}
                    accessibilityRole="button"
                    accessibilityLabel="Hold"
                  >
                    <Icon name={hold ? 'play' : 'pause'} size={scale(24)} color="#FFFFFF" />
                    <Text style={[styles.ctrlLabel, { fontSize: ms(12), marginTop: vscale(8) }]}>{hold ? 'Resume' : 'Hold'}</Text>
                  </MotionPressable>
                </View>

                <MotionPressable
                  onPress={endCall}
                  style={[styles.endPill, { marginTop: vscale(28), paddingVertical: vscale(14), borderRadius: scale(999) }]}
                  accessibilityRole="button"
                  accessibilityLabel="End call"
                >
                  <Icon name="phone-hangup" size={scale(20)} color="#FFFFFF" />
                  <Text style={[styles.endText, { fontSize: ms(15), marginLeft: spacing(10) }]}>End Call</Text>
                </MotionPressable>
              </MotionView>
            ) : null}
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#050A12',
  },
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  top: {
    width: '100%',
    alignItems: 'center',
  },
  name: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  status: {
    color: 'rgba(255,255,255,0.74)',
    fontWeight: '700',
  },
  subStatus: {
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '700',
  },
  avatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    flex: 1,
    alignItems: 'center',
  },
  incomingActions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  actionCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  acceptCircle: { backgroundColor: '#22C55E' },
  declineCircle: { backgroundColor: '#E11D48' },
  actionLabel: {
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '800',
  },
  singleEndWrap: {
    alignItems: 'center',
    width: '100%',
  },
  endCircle: {
    backgroundColor: '#E11D48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endHint: {
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '700',
  },
  inCallControls: {
    width: '100%',
    alignItems: 'center',
  },
  ctrlRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  ctrlCircle: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  ctrlLabel: {
    color: 'rgba(255,255,255,0.78)',
    fontWeight: '800',
  },
  endPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E11D48',
    paddingHorizontal: 18,
    width: '100%',
  },
  endText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});

export default P2PCallScreen;
