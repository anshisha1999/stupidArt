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

export type GamePhase = 'LOBBY' | 'STARTING' | 'SELECTING_WORD' | 'DRAWING' | 'ROUND_SUMMARY' | 'GAME_OVER';

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
  maskedForGuessers?: boolean;
}

export interface RoomSettings {
  roomName: string;
  port: number;
  hostIp: string;
  totalRounds: number;
  roundDurationSeconds: number; // 60 or 90
  maxPlayers: number;
}

export interface RoomState {
  roomId: string;
  settings: RoomSettings;
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  currentDrawerId: string | null;
  secretWord: string;
  maskedWord: string; // e.g. "_ _ _ _"
  category: string;
  timeRemaining: number;
  players: Player[];
  strokes: DrawStroke[];
  lastWinnerId?: string;
  roundPointsGained: Record<string, number>;
}

export interface NetworkPacket {
  id: string;
  timestamp: number;
  protocol: 'UDP_BROADCAST' | 'WEBSOCKET';
  direction: 'INCOMING' | 'OUTGOING' | 'SERVER_BROADCAST';
  action: string;
  sender: string;
  payload: any;
  byteSize: number;
}

export interface DiscoveredRoom {
  roomName: string;
  hostName: string;
  hostIp: string;
  port: number;
  playerCount: number;
  maxPlayers: number;
  phase: GamePhase;
  lastSeen: number;
}
