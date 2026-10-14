import express from 'express';
import http from 'http';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import {
  VIETNAMESE_WORD_BANK,
  WordItem,
  checkAnswer,
  generateMaskedWord,
} from './src/data/vietnameseWords';
import type {
  ChatMessage,
  ClientMessage,
  DrawStroke,
  GamePhase,
  Player,
  RoomSnapshot,
  ServerMessage,
  DiscoveredRoom,
} from './src/types/game';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 3000;

const MAX_PLAYERS = 8;
const SUMMARY_DELAY_MS = 5000;
const HEARTBEAT_MS = 5000;
const AVATARS = ['🎨', '🚀', '🐰', '🐼', '🦊', '🐸', '🐯', '🦄'];

interface PlayerSession {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  score: number;
  hasGuessedCorrectly: boolean;
  pingMs: number;
  roomCode: string;
}

interface GameRoom {
  code: string;
  name: string;
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  roundDuration: number;
  timeRemaining: number;
  currentDrawerId: string | null;
  drawQueue: string[]; // players still to draw in the current round
  word: WordItem | null;
  strokes: DrawStroke[];
  roundPointsGained: Record<string, number>;
  players: Map<WebSocket, PlayerSession>;
  timer?: ReturnType<typeof setInterval>;
  transition?: ReturnType<typeof setTimeout>;
}

const rooms = new Map<string, GameRoom>();
const sessions = new Map<WebSocket, PlayerSession>();

// ---------- helpers ----------

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : '';
}

function newRoomCode(): string {
  let code: string;
  do {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
  } while (rooms.has(code));
  return code;
}

function isValidStroke(stroke: any): stroke is DrawStroke {
  return (
    stroke &&
    typeof stroke.id === 'string' &&
    stroke.id.length <= 32 &&
    typeof stroke.color === 'string' &&
    /^#[0-9a-fA-F]{6}$/.test(stroke.color) &&
    typeof stroke.strokeWidth === 'number' &&
    stroke.strokeWidth > 0 &&
    stroke.strokeWidth <= 40 &&
    Array.isArray(stroke.points) &&
    stroke.points.length > 0 &&
    stroke.points.length <= 20000 &&
    stroke.points.every(
      (p: any) => p && typeof p.x === 'number' && typeof p.y === 'number' && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1
    )
  );
}

function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcast(room: GameRoom, msg: ServerMessage, exclude?: WebSocket) {
  const raw = JSON.stringify(msg);
  for (const ws of room.players.keys()) {
    if (ws !== exclude && ws.readyState === WebSocket.OPEN) ws.send(raw);
  }
}

function chatMessage(type: ChatMessage['type'], text: string, sender?: PlayerSession): ChatMessage {
  return {
    id: randomUUID(),
    senderId: sender?.id ?? 'SYSTEM',
    senderName: sender?.name ?? 'Hệ Thống',
    text,
    timestamp: Date.now(),
    type,
  };
}

function systemChat(room: GameRoom, text: string) {
  broadcast(room, { action: 'CHAT', message: chatMessage('system', text) });
}

function findPlayer(room: GameRoom, id: string | null): PlayerSession | undefined {
  if (!id) return undefined;
  for (const p of room.players.values()) if (p.id === id) return p;
  return undefined;
}

function hostOf(room: GameRoom): PlayerSession | undefined {
  for (const p of room.players.values()) if (p.isHost) return p;
  return undefined;
}

// Secret word is only visible to the drawer, players who already guessed it, and everyone once the turn is over.
function canSeeWord(room: GameRoom, viewer: PlayerSession): boolean {
  return room.phase !== 'DRAWING' || viewer.id === room.currentDrawerId || viewer.hasGuessedCorrectly;
}

function snapshotFor(room: GameRoom, viewer: PlayerSession): RoomSnapshot {
  const players: Player[] = Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    isHost: p.isHost,
    score: p.score,
    hasGuessedCorrectly: p.hasGuessedCorrectly,
    isConnected: true,
    pingMs: p.pingMs,
  }));

  const word = room.word?.word ?? '';
  return {
    roomId: room.code,
    settings: {
      roomName: room.name,
      totalRounds: room.totalRounds,
      roundDurationSeconds: room.roundDuration,
      maxPlayers: MAX_PLAYERS,
    },
    phase: room.phase,
    currentRound: room.currentRound,
    totalRounds: room.totalRounds,
    currentDrawerId: room.currentDrawerId,
    secretWord: canSeeWord(room, viewer) ? word : '',
    maskedWord: word ? generateMaskedWord(word) : '',
    category: room.word?.category ?? '',
    timeRemaining: room.timeRemaining,
    players,
    roundPointsGained: room.roundPointsGained,
  };
}

function broadcastState(room: GameRoom) {
  for (const [ws, viewer] of room.players) {
    send(ws, { action: 'ROOM_STATE', state: snapshotFor(room, viewer) });
  }
}

function clearRoomTimers(room: GameRoom) {
  if (room.timer) clearInterval(room.timer);
  if (room.transition) clearTimeout(room.transition);
  room.timer = undefined;
  room.transition = undefined;
}

// ---------- game flow ----------

function pickWord(previous: WordItem | null): WordItem {
  const pool = VIETNAMESE_WORD_BANK.filter((w) => w !== previous);
  return pool[Math.floor(Math.random() * pool.length)];
}

function takeNextDrawer(room: GameRoom): PlayerSession | undefined {
  while (room.drawQueue.length > 0) {
    const player = findPlayer(room, room.drawQueue.shift()!);
    if (player) return player;
  }
  return undefined;
}

function startGame(room: GameRoom, totalRounds: number, roundDuration: number) {
  room.totalRounds = totalRounds;
  room.roundDuration = roundDuration;
  room.currentRound = 1;
  room.drawQueue = Array.from(room.players.values()).map((p) => p.id);
  for (const p of room.players.values()) p.score = 0;
  nextTurn(room);
}

function nextTurn(room: GameRoom) {
  clearRoomTimers(room);
  let drawer = takeNextDrawer(room);
  if (!drawer) {
    room.currentRound++;
    if (room.currentRound > room.totalRounds) {
      endGame(room);
      return;
    }
    room.drawQueue = Array.from(room.players.values()).map((p) => p.id);
    drawer = takeNextDrawer(room);
    if (!drawer) return;
  }

  const word = pickWord(room.word);
  room.phase = 'DRAWING';
  room.currentDrawerId = drawer.id;
  room.word = word;
  room.strokes = [];
  room.roundPointsGained = {};
  room.timeRemaining = room.roundDuration;
  for (const p of room.players.values()) p.hasGuessedCorrectly = false;

  broadcast(room, { action: 'CANVAS', strokes: [] });
  systemChat(room, `--- Hiệp ${room.currentRound}/${room.totalRounds}: ${drawer.name} bắt đầu vẽ! ---`);
  broadcastState(room);

  room.timer = setInterval(() => {
    room.timeRemaining--;
    if (room.timeRemaining === Math.floor(room.roundDuration / 2)) {
      systemChat(room, `💡 Gợi ý: ${word.hint}`);
    }
    broadcast(room, { action: 'TICK', timeRemaining: room.timeRemaining });
    if (room.timeRemaining <= 0) endTurn(room, 'Hết thời gian!');
  }, 1000);
}

function endTurn(room: GameRoom, reason: string) {
  if (room.phase !== 'DRAWING') return;
  clearRoomTimers(room);
  room.phase = 'ROUND_SUMMARY';
  systemChat(room, `🏁 ${reason} Từ khóa chính xác là: "${room.word?.word}".`);
  broadcastState(room);
  room.transition = setTimeout(() => nextTurn(room), SUMMARY_DELAY_MS);
}

function endGame(room: GameRoom) {
  clearRoomTimers(room);
  room.phase = 'GAME_OVER';
  room.currentRound = room.totalRounds;
  room.currentDrawerId = null;
  const winner = Array.from(room.players.values()).sort((a, b) => b.score - a.score)[0];
  systemChat(room, `🏆 TRÒ CHƠI KẾT THÚC! Chúc mừng ${winner?.name} đã giành chiến thắng!`);
  broadcastState(room);
}

function backToLobby(room: GameRoom) {
  clearRoomTimers(room);
  room.phase = 'LOBBY';
  room.currentRound = 1;
  room.currentDrawerId = null;
  room.word = null;
  room.strokes = [];
  room.roundPointsGained = {};
  for (const p of room.players.values()) {
    p.score = 0;
    p.hasGuessedCorrectly = false;
  }
  broadcast(room, { action: 'CANVAS', strokes: [] });
  systemChat(room, 'Đã quay về phòng chờ. Sẵn sàng bắt đầu ván mới!');
  broadcastState(room);
}

function allGuessersDone(room: GameRoom): boolean {
  const guessers = Array.from(room.players.values()).filter((p) => p.id !== room.currentDrawerId);
  return guessers.length > 0 && guessers.every((p) => p.hasGuessedCorrectly);
}

function handleGuess(ws: WebSocket, room: GameRoom, player: PlayerSession, text: string) {
  if (room.phase !== 'DRAWING' || !room.word) {
    broadcast(room, { action: 'CHAT', message: chatMessage('chat', text, player) });
    return;
  }

  // Drawer must not leak hints; FE disables the input too.
  if (player.id === room.currentDrawerId) return;

  // Players who already know the word only talk among themselves (and the drawer).
  if (player.hasGuessedCorrectly) {
    const msg: ServerMessage = { action: 'CHAT', message: chatMessage('chat', text, player) };
    for (const [clientWs, p] of room.players) {
      if (p.hasGuessedCorrectly || p.id === room.currentDrawerId) send(clientWs, msg);
    }
    return;
  }

  const result = checkAnswer(text, room.word.word);

  if (result.isCorrect) {
    player.hasGuessedCorrectly = true;
    const scoreGain = 100 + room.timeRemaining * 5;
    player.score += scoreGain;
    room.roundPointsGained[player.id] = scoreGain;
    const drawer = findPlayer(room, room.currentDrawerId);
    if (drawer) drawer.score += 35;

    broadcast(room, {
      action: 'CHAT',
      message: chatMessage('correct_guess', `🎉 ${player.name} ĐÃ ĐOÁN ĐÚNG TỪ KHÓA! (+${scoreGain} điểm)`),
    });
    send(ws, { action: 'CORRECT_GUESS', playerId: player.id });
    broadcastState(room);

    if (allGuessersDone(room)) endTurn(room, 'Tất cả người chơi đều đã đoán đúng!');
    return;
  }

  broadcast(room, { action: 'CHAT', message: chatMessage('chat', text, player) });
  if (result.isClose) {
    send(ws, {
      action: 'CHAT',
      message: chatMessage('close_guess', `💡 ${player.name}: Đoán gần đúng rồi! Hãy kiểm tra lại chính tả nhé!`),
    });
  }
}

// ---------- room membership ----------

function closeRoom(room: GameRoom, reason: string) {
  clearRoomTimers(room);
  for (const ws of room.players.keys()) {
    sessions.delete(ws);
    send(ws, { action: 'ROOM_CLOSED', reason });
  }
  room.players.clear();
  rooms.delete(room.code);
}

function leaveRoom(ws: WebSocket) {
  const player = sessions.get(ws);
  if (!player) return;
  sessions.delete(ws);
  const room = rooms.get(player.roomCode);
  if (!room) return;
  room.players.delete(ws);

  if (player.isHost) {
    closeRoom(room, 'Chủ phòng đã rời đi, phòng chơi đã giải tán.');
    return;
  }
  if (room.players.size === 0) {
    closeRoom(room, 'Phòng trống.');
    return;
  }

  systemChat(room, `${player.name} đã rời phòng.`);

  if ((room.phase === 'DRAWING' || room.phase === 'ROUND_SUMMARY') && room.players.size < 2) {
    systemChat(room, 'Không đủ người chơi để tiếp tục.');
    endGame(room);
    return;
  }

  if (room.phase === 'DRAWING') {
    if (player.id === room.currentDrawerId) {
      endTurn(room, 'Người vẽ đã thoát!');
      return;
    }
    if (allGuessersDone(room)) {
      endTurn(room, 'Tất cả người chơi đều đã đoán đúng!');
      return;
    }
  }
  broadcastState(room);
}

function joinRoom(ws: WebSocket, room: GameRoom, playerName: string, isHost: boolean) {
  const player: PlayerSession = {
    id: randomUUID(),
    name: playerName || (isHost ? 'Chủ phòng' : 'Khách'),
    avatar: AVATARS[room.players.size % AVATARS.length],
    isHost,
    score: 0,
    hasGuessedCorrectly: false,
    pingMs: 0,
    roomCode: room.code,
  };
  room.players.set(ws, player);
  sessions.set(ws, player);

  send(ws, { action: 'JOINED', roomCode: room.code, playerId: player.id });
  send(ws, { action: 'CANVAS', strokes: room.strokes });
  systemChat(room, isHost ? `Đã tạo phòng "${room.name}" (mã ${room.code}).` : `${player.name} đã vào phòng!`);
  broadcastState(room);
}

function handleMessage(ws: WebSocket, msg: ClientMessage) {
  if (msg.action === 'CREATE_ROOM') {
    leaveRoom(ws);
    const code = newRoomCode();
    const room: GameRoom = {
      code,
      name: cleanText(msg.roomName, 30) || `Phòng ${code}`,
      phase: 'LOBBY',
      currentRound: 1,
      totalRounds: 3,
      roundDuration: 60,
      timeRemaining: 60,
      currentDrawerId: null,
      drawQueue: [],
      word: null,
      strokes: [],
      roundPointsGained: {},
      players: new Map(),
    };
    rooms.set(code, room);
    joinRoom(ws, room, cleanText(msg.playerName, 20), true);
    return;
  }

  if (msg.action === 'JOIN_ROOM') {
    const code = cleanText(msg.roomCode, 10).toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      send(ws, { action: 'ERROR', message: `Không tìm thấy phòng có mã: ${code}` });
      return;
    }
    if (sessions.get(ws)?.roomCode === code) return; // already in this room
    if (room.players.size >= MAX_PLAYERS) {
      send(ws, { action: 'ERROR', message: 'Phòng đã đầy.' });
      return;
    }
    leaveRoom(ws);
    joinRoom(ws, room, cleanText(msg.playerName, 20), false);
    return;
  }

  const player = sessions.get(ws);
  const room = player && rooms.get(player.roomCode);
  if (!player || !room) return;

  switch (msg.action) {
    case 'START_GAME': {
      if (!player.isHost || room.phase !== 'LOBBY') return;
      if (room.players.size < 2) {
        send(ws, { action: 'ERROR', message: 'Cần ít nhất 2 người chơi để bắt đầu.' });
        return;
      }
      const rounds = [2, 3, 5].includes(msg.totalRounds) ? msg.totalRounds : 3;
      const duration = [60, 90].includes(msg.roundDurationSeconds) ? msg.roundDurationSeconds : 60;
      startGame(room, rounds, duration);
      return;
    }
    case 'DRAW_STROKE':
      if (room.phase !== 'DRAWING' || player.id !== room.currentDrawerId) return;
      if (!isValidStroke(msg.stroke)) {
        // The drawer already rendered it locally; resync so their canvas matches everyone else's.
        send(ws, { action: 'CANVAS', strokes: room.strokes });
        return;
      }
      room.strokes.push(msg.stroke);
      broadcast(room, { action: 'DRAW_STROKE', stroke: msg.stroke }, ws);
      return;
    case 'CLEAR_CANVAS':
      if (room.phase !== 'DRAWING' || player.id !== room.currentDrawerId) return;
      room.strokes = [];
      broadcast(room, { action: 'CANVAS', strokes: [] });
      return;
    case 'CHAT_GUESS': {
      const text = cleanText(msg.text, 100);
      if (text) handleGuess(ws, room, player, text);
      return;
    }
    case 'PLAY_AGAIN':
      if (player.isHost && room.phase === 'GAME_OVER') backToLobby(room);
      return;
    case 'LEAVE_ROOM':
      leaveRoom(ws);
      return;
  }
}

// ---------- HTTP + WebSocket server ----------

const app = express();
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), activeRooms: rooms.size });
});

app.get('/api/rooms', (_req, res) => {
  const list: DiscoveredRoom[] = Array.from(rooms.values()).map((r) => ({
    code: r.code,
    roomName: r.name,
    hostName: hostOf(r)?.name ?? '',
    playerCount: r.players.size,
    maxPlayers: MAX_PLAYERS,
    phase: r.phase,
  }));
  res.json(list);
});

const server = http.createServer(app);

if (isProduction) {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  const { createServer: createViteServer } = await import('vite');
  // HMR shares the game's HTTP server so dev needs a single port.
  const vite = await createViteServer({
    server: { middlewareMode: true, ws: { server } },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024 });

server.on('upgrade', (req, socket, head) => {
  if (req.url?.split('?')[0] !== '/ws') {
    // In dev, Vite's HMR listens on the same server for its own upgrades.
    if (isProduction) socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

const liveness = new Map<WebSocket, { alive: boolean; pingSentAt: number }>();

wss.on('connection', (ws) => {
  liveness.set(ws, { alive: true, pingSentAt: 0 });

  ws.on('pong', () => {
    const state = liveness.get(ws);
    if (!state) return;
    state.alive = true;
    const player = sessions.get(ws);
    if (player) player.pingMs = Date.now() - state.pingSentAt;
  });

  ws.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg && typeof msg.action === 'string') handleMessage(ws, msg);
  });

  // Protocol errors (e.g. oversized frames) are followed by 'close'; without a listener they crash the process.
  ws.on('error', () => {});

  ws.on('close', () => {
    leaveRoom(ws);
    liveness.delete(ws);
  });
});

// Heartbeat: drops dead connections and measures each player's real round-trip time.
setInterval(() => {
  const now = Date.now();
  for (const [ws, state] of liveness) {
    if (!state.alive) {
      ws.terminate();
      continue;
    }
    state.alive = false;
    state.pingSentAt = now;
    ws.ping();
  }
  for (const room of rooms.values()) broadcastState(room);
}, HEARTBEAT_MS);

server.listen(port, () => {
  console.log(`[Server] Game server đang chạy tại http://localhost:${port} (${isProduction ? 'production' : 'dev'})`);
  console.log(`[Server] WebSocket endpoint: ws://localhost:${port}/ws`);
});
