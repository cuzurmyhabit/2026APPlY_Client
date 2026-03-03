import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { io, type Socket } from 'socket.io-client';
import { createRandomProfile } from '@/realtime/randomProfile';

type CursorPeer = {
  clientId: string;
  name: string;
  color: string;
  x?: number;
  y?: number;
};

type JoinPayload = {
  clientId?: string;
  name?: string;
  color?: string;
  x?: number;
  y?: number;
};

type MovePayload = {
  clientId?: string;
  name?: string;
  color?: string;
  x?: number;
  y?: number;
};

type LeavePayload = {
  clientId?: string;
};

function toGradient(color: string): [string, string] {
  const match = color.match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
  if (!match) {
    return [color, color];
  }

  const hue = Number(match[1]);
  const saturation = Number(match[2]);
  const lightness = Number(match[3]);

  const start = `hsl(${hue} ${Math.min(96, saturation + 8)}% ${Math.min(62, lightness + 8)}%)`;
  const end = `hsl(${hue} ${Math.min(98, saturation + 14)}% ${Math.max(26, lightness - 18)}%)`;

  return [start, end];
}

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000';

function LiveCursorOverlay() {
  const [myClientId, setMyClientId] = useState('');
  const [peers, setPeers] = useState<Record<string, CursorPeer>>({});

  const socket = useMemo<Socket>(
    () =>
      io(SOCKET_URL, {
        transports: ['websocket'],
        reconnection: true,
        autoConnect: false,
      }),
    [],
  );

  const profile = useMemo(() => createRandomProfile(), []);
  const frameRef = useRef<number | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onConnect = () => {
      if (!socket.id) {
        return;
      }

      setMyClientId(socket.id);
      socket.emit('cursor:join', profile);
    };

    const onJoin = (payload: JoinPayload) => {
      const parsed = payload;
      if (!parsed.clientId || !parsed.name || !parsed.color) {
        return;
      }
      const clientId = parsed.clientId;
      const name = parsed.name;
      const color = parsed.color;

      setPeers((prev) => {
        const prevPeer = prev[clientId];
        return {
          ...prev,
          [clientId]: {
            clientId,
            name,
            color,
            x: typeof parsed.x === 'number' ? parsed.x : prevPeer?.x,
            y: typeof parsed.y === 'number' ? parsed.y : prevPeer?.y,
          },
        };
      });
    };

    const onMove = (payload: MovePayload) => {
      const parsed = payload;
      if (
        !parsed.clientId ||
        typeof parsed.x !== 'number' ||
        typeof parsed.y !== 'number'
      ) {
        return;
      }
      const clientId = parsed.clientId;

      setPeers((prev) => {
        const current = prev[clientId];
        return {
          ...prev,
          [clientId]: {
            clientId,
            name: parsed.name ?? current?.name ?? 'Anonymous',
            color: parsed.color ?? current?.color ?? '#333',
            x: parsed.x,
            y: parsed.y,
          },
        };
      });
    };

    const onLeave = (payload: LeavePayload) => {
      const parsed = payload;
      if (!parsed.clientId) {
        return;
      }
      const clientId = parsed.clientId;

      setPeers((prev) => {
        const next = { ...prev };
        delete next[clientId];
        return next;
      });
    };

    socket.on('connect', onConnect);
    socket.on('cursor:join', onJoin);
    socket.on('cursor:move', onMove);
    socket.on('cursor:leave', onLeave);
    socket.connect();

    const sendPointer = () => {
      frameRef.current = null;
      if (!pointerRef.current) {
        return;
      }
      socket.emit('cursor:move', pointerRef.current);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const point = { x: event.clientX, y: event.clientY };
      pointerRef.current = point;
      if (frameRef.current !== null) {
        return;
      }
      frameRef.current = window.requestAnimationFrame(sendPointer);
    };

    const leaveRoom = () => {
      socket.emit('cursor:leave');
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('beforeunload', leaveRoom);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('beforeunload', leaveRoom);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      socket.off('connect', onConnect);
      socket.off('cursor:join', onJoin);
      socket.off('cursor:move', onMove);
      socket.off('cursor:leave', onLeave);
      leaveRoom();
      socket.disconnect();
    };
  }, [profile, socket]);

  const visiblePeers = Object.values(peers).filter(
    (peer) =>
      peer.clientId !== myClientId &&
      typeof peer.x === 'number' &&
      typeof peer.y === 'number',
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      {visiblePeers.map((peer) => (
        (() => {
          const [gradientStart, gradientEnd] = toGradient(peer.color);
          const gradientId = `cursor-gradient-${peer.clientId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

          return (
            <motion.div
              key={peer.clientId}
              initial={false}
              animate={{ x: peer.x, y: peer.y }}
              transition={{
                type: 'spring',
                bounce: 0.35,
                damping: 26,
                stiffness: 360,
                mass: 0.7,
                restSpeed: 0.5,
              }}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                willChange: 'transform',
              }}
            >
              <svg width='30' height='42' viewBox='0 0 24 36' fill='none'>
                <defs>
                  <linearGradient id={gradientId} x1='0%' y1='0%' x2='500%' y2='0%'>
                    <stop offset='0%' stopColor={gradientStart} />
                    <stop offset='100%' stopColor={gradientEnd} />
                  </linearGradient>
                </defs>
                <path
                  d='M0.928548 2.18278C0.619075 1.37094 1.42087 0.577818 2.2293 0.896107L14.3863 5.68247C15.2271 6.0135 15.2325 7.20148 14.3947 7.54008L9.85984 9.373C9.61167 9.47331 9.41408 9.66891 9.31127 9.91604L7.43907 14.4165C7.09186 15.2511 5.90335 15.2333 5.58136 14.3886L0.928548 2.18278Z'
                  fill={`url(#${gradientId})`}
                  style={{ filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.24))' }}
                />
              </svg>

              <div
                style={{
                  position: 'absolute',
                  top: 14,
                  left: 12,
                  backgroundImage: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
                  color: '#fff',
                  padding: '7px 12px',
                  borderRadius: 3,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  boxShadow:
                    '0 10px 24px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.22)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                }}
              >
                {peer.name}
              </div>
            </motion.div>
          );
        })()
      ))}
    </div>
  );
}

export default LiveCursorOverlay;
