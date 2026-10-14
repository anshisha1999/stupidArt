export interface Player {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  score: number;
  hasGuessedCorrectly: boolean;
  isConnected: boolean;
  pingMs: number;
}

export type GamePhase = 'LOBBY' | 'DRAWING' | 'ROUND_SUMMARY' | 'GAME_OVER';

export interface NormalizedPoint {
  x: number; // 0.0 to 1.0
  y: number; // 0.0 to 1.0
}

export interface DrawStroke {
  id: string;
  points: NormalizedPoint[];
  color: string;
  strokeWidth: number; // normalized or px scale
  isEraser?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  type: 'chat' | 'system' | 'correct_guess' | 'close_guess';
}

export interface RoomSettings {
  roomName: string;
  totalRounds: number;
  roundDurationSeconds: number; // 60 or 90
  maxPlayers: number;
}

export interface RoomState {
  roomId: string; // room code, shared with friends to join
  settings: RoomSettings;
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  currentDrawerId: string | null;
  secretWord: string; // empty for players who must not see it yet
  maskedWord: string; // e.g. "_ _ _ _"
  category: string;
  timeRemaining: number;
  players: Player[];
  strokes: DrawStroke[];
  roundPointsGained: Record<string, number>;
}

// Room state as sent by the server; strokes travel separately (CANVAS / DRAW_STROKE).
export type RoomSnapshot = Omit<RoomState, 'strokes'>;

export interface DiscoveredRoom {
  code: string;
  roomName: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  phase: GamePhase;
}

// Client -> Server
export type ClientMessage =
  | { action: 'CREATE_ROOM'; roomName: string; playerName: string }
  | { action: 'JOIN_ROOM'; roomCode: string; playerName: string }
  | { action: 'START_GAME'; totalRounds: number; roundDurationSeconds: number }
  | { action: 'DRAW_STROKE'; stroke: DrawStroke }
  | { action: 'CLEAR_CANVAS' }
  | { action: 'CHAT_GUESS'; text: string }
  | { action: 'PLAY_AGAIN' }
  | { action: 'LEAVE_ROOM' };

// Server -> Client
export type ServerMessage =
  | { action: 'JOINED'; roomCode: string; playerId: string }
  | { action: 'ROOM_STATE'; state: RoomSnapshot }
  | { action: 'TICK'; timeRemaining: number }
  | { action: 'CANVAS'; strokes: DrawStroke[] }
  | { action: 'DRAW_STROKE'; stroke: DrawStroke }
  | { action: 'CHAT'; message: ChatMessage }
  | { action: 'CORRECT_GUESS'; playerId: string }
  | { action: 'ROOM_CLOSED'; reason: string }
  | { action: 'ERROR'; message: string };
