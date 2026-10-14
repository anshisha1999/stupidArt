import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Serve static frontend files from Vite's dist directory
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Vietnamese Word Bank on Server
const WORD_BANK = [
  { word: 'Con mèo', category: 'Động vật' },
  { word: 'Con chó', category: 'Động vật' },
  { word: 'Con voi', category: 'Động vật' },
  { word: 'Hươu cao cổ', category: 'Động vật' },
  { word: 'Cá heo', category: 'Động vật' },
  { word: 'Chim cánh cụt', category: 'Động vật' },
  { word: 'Con nhện', category: 'Động vật' },
  { word: 'Bánh mì', category: 'Ẩm thực' },
  { word: 'Phở bò', category: 'Ẩm thực' },
  { word: 'Cà phê sữa đá', category: 'Ẩm thực' },
  { word: 'Trà sữa', category: 'Ẩm thực' },
  { word: 'Kem ốc quế', category: 'Ẩm thực' },
  { word: 'Máy bay', category: 'Phương tiện' },
  { word: 'Tàu hỏa', category: 'Phương tiện' },
  { word: 'Xe đạp', category: 'Phương tiện' },
  { word: 'Chiếc ô', category: 'Đồ vật' },
  { word: 'Điện thoại', category: 'Đồ vật' },
  { word: 'Đồng hồ cát', category: 'Đồ vật' },
  { word: 'Cầu vồng', category: 'Thiên nhiên' },
  { word: 'Mặt trời', category: 'Thiên nhiên' },
  { word: 'Núi lửa', category: 'Thiên nhiên' },
];

function normalizeText(input: string): string {
  if (!input) return '';
  return input.toLowerCase().trim().replace(/\s+/g, ' ');
}

function removeVietnameseAccents(input: string): string {
  let str = normalizeText(input);
  const patterns: [RegExp, string][] = [
    [/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a'],
    [/[èéẹẻẽêềếệểễ]/g, 'e'],
    [/[ìíịỉĩ]/g, 'i'],
    [/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o'],
    [/[ùúụủũưừứựửữ]/g, 'u'],
    [/[ỳýỵỷỹ]/g, 'y'],
    [/đ/g, 'd'],
  ];
  for (const [pattern, replacement] of patterns) {
    str = str.replace(pattern, replacement);
  }
  return str;
}

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function maskWord(word: string): string {
  return word.split('').map((c) => (c === ' ' ? '   ' : '_ ')).join('');
}

interface PlayerSession {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  score: number;
  hasGuessedCorrectly: boolean;
  ws: WebSocket;
  roomCode: string;
}

interface GameRoom {
  code: string;
  name: string;
  phase: 'lobby' | 'drawing' | 'roundSummary' | 'gameOver';
  currentRound: number;
  totalRounds: number;
  roundDuration: number;
  timeRemaining: number;
  drawerIndex: number;
  currentDrawerId: string | null;
  secretWord: string;
  category: string;
  players: Map<WebSocket, PlayerSession>;
  strokes: any[];
  timer?: any;
}

const rooms = new Map<string, GameRoom>();

// REST APIs
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), activeRooms: rooms.size });
});

app.get('/api/rooms', (req, res) => {
  const list = Array.from(rooms.values()).map((r) => ({
    code: r.code,
    name: r.name,
    playerCount: r.players.size,
    phase: r.phase,
    round: `${r.currentRound}/${r.totalRounds}`,
  }));
  res.json(list);
});

// Single Page App fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Create HTTP Server & attach WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function broadcastToRoom(room: GameRoom, data: any, excludeWs?: WebSocket) {
  const msg = JSON.stringify(data);
  for (const [clientWs] of room.players) {
    if (clientWs !== excludeWs && clientWs.readyState === WebSocket.OPEN) {
      try {
        clientWs.send(msg);
      } catch (_) {}
    }
  }
}

function broadcastRoomState(room: GameRoom) {
  const playersList = Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    isHost: p.isHost,
    score: p.score,
    hasGuessedCorrectly: p.hasGuessedCorrectly,
  }));

  for (const [clientWs, player] of room.players) {
    if (clientWs.readyState === WebSocket.OPEN) {
      const isDrawer = player.id === room.currentDrawerId;
      const statePacket = {
        action: 'ROOM_STATE',
        roomCode: room.code,
        roomName: room.name,
        phase: room.phase,
        currentRound: room.currentRound,
        totalRounds: room.totalRounds,
        timeRemaining: room.timeRemaining,
        currentDrawerId: room.currentDrawerId,
        secretWord: isDrawer ? room.secretWord : maskWord(room.secretWord),
        category: room.category,
        players: playersList,
      };
      try {
        clientWs.send(JSON.stringify(statePacket));
      } catch (_) {}
    }
  }
}

function startRound(room: GameRoom) {
  if (room.timer) clearInterval(room.timer);

  room.phase = 'drawing';
  room.strokes = [];
  room.timeRemaining = room.roundDuration;

  const playersArr = Array.from(room.players.values());
  if (playersArr.length === 0) return;

  playersArr.forEach((p) => {
    p.hasGuessedCorrectly = false;
  });

  const drawer = playersArr[room.drawerIndex % playersArr.length];
  room.currentDrawerId = drawer.id;

  const wordObj = WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
  room.secretWord = wordObj.word;
  room.category = wordObj.category;

  broadcastRoomState(room);

  room.timer = setInterval(() => {
    room.timeRemaining--;
    broadcastToRoom(room, { action: 'TICK', timeRemaining: room.timeRemaining });

    if (room.timeRemaining <= 0) {
      clearInterval(room.timer);
      endRound(room, 'Hết thời gian vẽ!');
    }
  }, 1000);
}

function endRound(room: GameRoom, reason: string) {
  if (room.timer) clearInterval(room.timer);
  room.phase = 'roundSummary';

  broadcastToRoom(room, {
    action: 'ROUND_SUMMARY',
    secretWord: room.secretWord,
    reason,
  });
  broadcastRoomState(room);

  setTimeout(() => {
    const playersArr = Array.from(room.players.values());
    if (playersArr.length === 0) return;

    room.drawerIndex++;
    if (room.drawerIndex % playersArr.length === 0) {
      room.currentRound++;
    }

    if (room.currentRound > room.totalRounds) {
      room.phase = 'gameOver';
      broadcastToRoom(room, { action: 'GAME_OVER' });
      broadcastRoomState(room);
    } else {
      startRound(room);
    }
  }, 5000);
}

wss.on('connection', (ws) => {
  let currentRoom: GameRoom | null = null;
  let playerSession: PlayerSession | null = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const action = msg.action;

      if (action === 'CREATE_ROOM') {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const roomName = msg.roomName || `Phòng ${code}`;
        const newRoom: GameRoom = {
          code,
          name: roomName,
          phase: 'lobby',
          currentRound: 1,
          totalRounds: msg.totalRounds || 3,
          roundDuration: msg.roundDuration || 60,
          timeRemaining: msg.roundDuration || 60,
          drawerIndex: 0,
          currentDrawerId: null,
          secretWord: '',
          category: '',
          players: new Map(),
          strokes: [],
        };

        rooms.set(code, newRoom);
        currentRoom = newRoom;

        playerSession = {
          id: msg.playerId || Math.random().toString(36).substring(2, 9),
          name: msg.playerName || 'Chủ phòng',
          avatar: msg.avatar || '🎨',
          isHost: true,
          score: 0,
          hasGuessedCorrectly: false,
          ws,
          roomCode: code,
        };

        newRoom.players.set(ws, playerSession);
        ws.send(JSON.stringify({ action: 'ROOM_CREATED', roomCode: code }));
        broadcastRoomState(newRoom);
        return;
      }

      if (action === 'JOIN_ROOM') {
        const code = (msg.roomCode || '').toUpperCase();
        const targetRoom = rooms.get(code);

        if (!targetRoom) {
          ws.send(JSON.stringify({ action: 'ERROR', message: `Không tìm thấy phòng có mã: ${code}` }));
          return;
        }

        currentRoom = targetRoom;
        playerSession = {
          id: msg.playerId || Math.random().toString(36).substring(2, 9),
          name: msg.playerName || 'Khách',
          avatar: msg.avatar || '🚀',
          isHost: false,
          score: 0,
          hasGuessedCorrectly: false,
          ws,
          roomCode: code,
        };

        targetRoom.players.set(ws, playerSession);
        ws.send(JSON.stringify({ action: 'JOIN_SUCCESS', roomCode: code }));
        broadcastRoomState(targetRoom);
        return;
      }

      if (!currentRoom || !playerSession) return;

      if (action === 'START_GAME') {
        if (playerSession.isHost && currentRoom.phase === 'lobby') {
          currentRoom.currentRound = 1;
          currentRoom.drawerIndex = 0;
          for (const p of currentRoom.players.values()) {
            p.score = 0;
          }
          startRound(currentRoom);
        }
      } else if (action === 'DRAW_POINT') {
        if (playerSession.id === currentRoom.currentDrawerId) {
          currentRoom.strokes.push(msg.stroke);
          broadcastToRoom(currentRoom, { action: 'DRAW_POINT', stroke: msg.stroke }, ws);
        }
      } else if (action === 'CLEAR_CANVAS') {
        if (playerSession.id === currentRoom.currentDrawerId) {
          currentRoom.strokes = [];
          broadcastToRoom(currentRoom, { action: 'CLEAR_CANVAS' });
        }
      } else if (action === 'CHAT_GUESS') {
        const text = msg.text || '';
        if (!text.trim()) return;

        if (playerSession.id === currentRoom.currentDrawerId || playerSession.hasGuessedCorrectly) {
          return;
        }

        const normGuess = normalizeText(text);
        const normTarget = normalizeText(currentRoom.secretWord);
        const unaccentedGuess = removeVietnameseAccents(normGuess);
        const unaccentedTarget = removeVietnameseAccents(normTarget);

        const isExact = normGuess === normTarget || unaccentedGuess === unaccentedTarget;

        if (isExact && currentRoom.phase === 'drawing') {
          playerSession.hasGuessedCorrectly = true;
          const scoreGain = 100 + currentRoom.timeRemaining * 5;
          playerSession.score += scoreGain;

          const drawerSession = Array.from(currentRoom.players.values()).find(
            (p) => p.id === currentRoom!.currentDrawerId
          );
          if (drawerSession) drawerSession.score += 35;

          broadcastToRoom(currentRoom, {
            action: 'CORRECT_GUESS',
            playerId: playerSession.id,
            playerName: playerSession.name,
            scoreGained: scoreGain,
          });

          broadcastRoomState(currentRoom);

          const guessers = Array.from(currentRoom.players.values()).filter(
            (p) => p.id !== currentRoom!.currentDrawerId
          );
          if (guessers.length > 0 && guessers.every((p) => p.hasGuessedCorrectly)) {
            clearInterval(currentRoom.timer);
            endRound(currentRoom, 'Tất cả mọi người đều đã đoán đúng!');
          }
          return;
        }

        // Close guess check (Levenshtein distance <= 1)
        if (unaccentedTarget.length >= 3) {
          const dist = levenshteinDistance(unaccentedGuess, unaccentedTarget);
          if (dist === 1 && currentRoom.phase === 'drawing') {
            broadcastToRoom(currentRoom, {
              action: 'CHAT_MESSAGE',
              message: {
                id: Math.random().toString(36).substring(2, 9),
                senderName: playerSession.name,
                text,
                timestamp: Date.now(),
              },
            });

            ws.send(JSON.stringify({
              action: 'CLOSE_GUESS',
              message: 'Đoán gần đúng rồi! Hãy kiểm tra lại chính tả nhé!',
            }));
            return;
          }
        }

        broadcastToRoom(currentRoom, {
          action: 'CHAT_MESSAGE',
          message: {
            id: Math.random().toString(36).substring(2, 9),
            senderName: playerSession.name,
            text,
            timestamp: Date.now(),
          },
        });
      } else if (action === 'LEAVE_ROOM') {
        handleDisconnect();
      }
    } catch (_) {}
  });

  function handleDisconnect() {
    if (currentRoom && playerSession) {
      currentRoom.players.delete(ws);

      if (playerSession.isHost) {
        broadcastToRoom(currentRoom, {
          action: 'ROOM_CLOSED',
          reason: 'Chủ phòng đã giải tán phòng.',
        });
        if (currentRoom.timer) clearInterval(currentRoom.timer);
        rooms.delete(currentRoom.code);
      } else {
        if (playerSession.id === currentRoom.currentDrawerId && currentRoom.phase === 'drawing') {
          if (currentRoom.timer) clearInterval(currentRoom.timer);
          broadcastToRoom(currentRoom, {
            action: 'FORCE_NEXT_ROUND',
            reason: 'Người vẽ đã ngắt kết nối.',
          });
          setTimeout(() => {
            if (currentRoom && currentRoom.players.size > 0) {
              currentRoom.drawerIndex++;
              startRound(currentRoom);
            }
          }, 2000);
        } else {
          broadcastRoomState(currentRoom);
        }
      }
    }
  }

  ws.on('close', handleDisconnect);
  ws.on('error', handleDisconnect);
});

server.listen(port, () => {
  console.log(`[Render/Local Server] Game Server đang chạy tại cổng http://localhost:${port}`);
  console.log(`[Render/Local Server] WebSocket Server sẵn sàng phục vụ.`);
});
