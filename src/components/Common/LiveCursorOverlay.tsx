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
  angle?: number;
};

type LocalCursor = {
  x: number;
  y: number;
  angle: number;
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

function getShortestAngle(current: number, target: number): number {
  const delta = ((((target - current) % 360) + 540) % 360) - 180;
  return current + delta;
}

function LiveCursorOverlay() {
  const [myClientId, setMyClientId] = useState('');
  const [peers, setPeers] = useState<Record<string, CursorPeer>>({});
  const [myCursor, setMyCursor] = useState<LocalCursor | null>(null);

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
  const previousPointerRef = useRef<{ x: number; y: number } | null>(null);
  const myAngleRef = useRef(0);

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
            angle: prevPeer?.angle ?? 0,
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
      const nextX = parsed.x;
      const nextY = parsed.y;

      setPeers((prev) => {
        const current = prev[clientId];
        const prevX = current?.x;
        const prevY = current?.y;

        let nextAngle = current?.angle ?? 0;
        if (typeof prevX === 'number' && typeof prevY === 'number') {
          const dx = nextX - prevX;
          const dy = nextY - prevY;
          const distance = Math.hypot(dx, dy);
          if (distance > 0.6) {
            nextAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
          }
        }

        return {
          ...prev,
          [clientId]: {
            clientId,
            name: parsed.name ?? current?.name ?? 'Anonymous',
            color: parsed.color ?? current?.color ?? '#333',
            x: nextX,
            y: nextY,
            angle: nextAngle,
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

      const previousPoint = previousPointerRef.current;
      let nextAngle = myAngleRef.current;
      if (previousPoint) {
        const dx = point.x - previousPoint.x;
        const dy = point.y - previousPoint.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 0.6) {
          const targetAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
          nextAngle = getShortestAngle(myAngleRef.current, targetAngle);
        }
      }

      myAngleRef.current = nextAngle;
      setMyCursor({ x: point.x, y: point.y, angle: nextAngle });
      previousPointerRef.current = point;
      pointerRef.current = point;
      if (frameRef.current !== null) {
        return;
      }
      frameRef.current = window.requestAnimationFrame(sendPointer);
    };

    const leaveRoom = () => {
      socket.emit('cursor:leave');
    };

    const previousHtmlCursor = document.documentElement.style.cursor;
    const previousBodyCursor = document.body.style.cursor;
    const hideCursorStyle = document.createElement('style');
    hideCursorStyle.setAttribute('data-live-cursor-hide', 'true');
    hideCursorStyle.textContent = '*, *::before, *::after { cursor: none !important; }';
    document.head.appendChild(hideCursorStyle);
    document.documentElement.style.cursor = 'none';
    document.body.style.cursor = 'none';

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
      document.documentElement.style.cursor = previousHtmlCursor;
      document.body.style.cursor = previousBodyCursor;
      hideCursorStyle.remove();
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

      {myCursor && (
        <motion.div
          initial={false}
          animate={{ x: myCursor.x, y: myCursor.y, rotate: myCursor.angle }}
          transition={{
            x: { type: 'spring', bounce: 0.35, damping: 26, stiffness: 360, mass: 0.7, restSpeed: 0.5 },
            y: { type: 'spring', bounce: 0.35, damping: 26, stiffness: 360, mass: 0.7, restSpeed: 0.5 },
            rotate: { type: 'spring', stiffness: 300, damping: 24, mass: 0.65 },
          }}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 25,
            height: 27,
            transformOrigin: '50% 50%',
            willChange: 'transform',
          }}
        >
          <svg width='25' height='27' viewBox='0 0 50 54' fill='none'>
            <defs>
              <filter id='self-cursor-shadow' x='0.602397' y='0.952444' width='49.0584' height='52.428' filterUnits='userSpaceOnUse' colorInterpolationFilters='sRGB'>
                <feFlood floodOpacity='0' result='BackgroundImageFix' />
                <feColorMatrix in='SourceAlpha' type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0' result='hardAlpha' />
                <feOffset dy='2.25825' />
                <feGaussianBlur stdDeviation='2.25825' />
                <feComposite in2='hardAlpha' operator='out' />
                <feColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0' />
                <feBlend mode='normal' in2='BackgroundImageFix' result='effect1_dropShadow_91_7928' />
                <feBlend mode='normal' in='SourceGraphic' in2='effect1_dropShadow_91_7928' result='shape' />
              </filter>
            </defs>
            <g filter='url(#self-cursor-shadow)'>
              <path d='M42.6817 41.1495L27.5103 6.79925C26.7269 5.02557 24.2082 5.02558 23.3927 6.79925L7.59814 41.1495C6.75833 42.9759 8.52712 44.8902 10.4125 44.1954L24.3757 39.0496C24.8829 38.8627 25.4385 38.8627 25.9422 39.0496L39.8121 44.1954C41.6849 44.8902 43.4884 42.9759 42.6817 41.1495Z' fill='black' />
              <path d='M43.7146 40.6933L28.5431 6.34306C27.3556 3.65428 23.5772 3.69516 22.3668 6.32755L6.57226 40.6778C5.3134 43.4156 7.97238 46.298 10.803 45.2549L24.7662 40.109C25.0221 40.0147 25.2999 40.0156 25.5494 40.1082L39.4193 45.254C42.2261 46.2953 44.9254 43.4347 43.7146 40.6933Z' stroke='white' strokeWidth='2.25825' />
            </g>
          </svg>
        </motion.div>
      )}
    </div>
  );
}

export default LiveCursorOverlay;
