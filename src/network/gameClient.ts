import {
  ChatMessage,
  ClientMessage,
  DiscoveredRoom,
  DrawStroke,
  RoomState,
  ServerMessage,
} from '../types/game';

export type ConnectionStatus = 'connecting' | 'open' | 'closed';

type Listener<T> = (value: T) => void;

class Emitter<T> {
  private listeners: Listener<T>[] = [];

  on(listener: Listener<T>): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  emit(value: T) {
    this.listeners.forEach((fn) => fn(value));
  }
}

const RECONNECT_DELAY_MS = 2000;

function socketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}/ws`;
}

export async function fetchRooms(): Promise<DiscoveredRoom[]> {
  const res = await fetch('/api/rooms');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** WebSocket client for the game server. The server is the single source of truth. */
export class GameClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  private state: RoomState | null = null;
  private playerId: string | null = null;
  // CANVAS arrives right after JOINED, before the first ROOM_STATE.
  private pendingStrokes: DrawStroke[] = [];

  readonly onState = new Emitter<RoomState | null>();
  readonly onChat = new Emitter<ChatMessage>();
  readonly onCorrectGuess = new Emitter<string>();
  readonly onRoomClosed = new Emitter<string>();
  readonly onError = new Emitter<string>();
  readonly onStatus = new Emitter<ConnectionStatus>();

  constructor() {
    this.connect();
  }

  getPlayerId(): string | null {
    return this.playerId;
  }

  private connect() {
    if (this.destroyed) return;
    this.onStatus.emit('connecting');
    const ws = new WebSocket(socketUrl());
    this.ws = ws;

    ws.onopen = () => this.onStatus.emit('open');
    ws.onmessage = (event) => {
      try {
        this.handle(JSON.parse(event.data) as ServerMessage);
      } catch (err) {
        console.error('Invalid server message', err);
      }
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.onStatus.emit('closed');
      if (this.state) {
        this.resetRoom();
        this.onRoomClosed.emit('Mất kết nối tới máy chủ.');
      }
      if (!this.destroyed) {
        this.reconnectTimer = setTimeout(() => this.connect(), RECONNECT_DELAY_MS);
      }
    };
  }

  private handle(msg: ServerMessage) {
    if (msg.action === 'JOINED') {
      this.playerId = msg.playerId;
      return;
    }
    // After leaving, drop room messages that were already in flight.
    if (!this.playerId && msg.action !== 'ERROR') return;

    switch (msg.action) {
      case 'ROOM_STATE':
        this.setState({ ...msg.state, strokes: this.state?.strokes ?? [] });
        return;
      case 'TICK':
        if (this.state) this.setState({ ...this.state, timeRemaining: msg.timeRemaining });
        return;
      case 'CANVAS':
        if (this.state) this.setState({ ...this.state, strokes: msg.strokes });
        else this.pendingStrokes = msg.strokes;
        return;
      case 'DRAW_STROKE':
        if (this.state) this.setState({ ...this.state, strokes: [...this.state.strokes, msg.stroke] });
        return;
      case 'CHAT':
        this.onChat.emit(msg.message);
        return;
      case 'CORRECT_GUESS':
        this.onCorrectGuess.emit(msg.playerId);
        return;
      case 'ROOM_CLOSED':
        this.resetRoom();
        this.onRoomClosed.emit(msg.reason);
        return;
      case 'ERROR':
        this.onError.emit(msg.message);
        return;
    }
  }

  private setState(state: RoomState) {
    if (!this.state && this.pendingStrokes.length > 0) {
      state = { ...state, strokes: this.pendingStrokes };
    }
    this.pendingStrokes = [];
    this.state = state;
    this.onState.emit(state);
  }

  private resetRoom() {
    this.state = null;
    this.playerId = null;
    this.pendingStrokes = [];
    this.onState.emit(null);
  }

  private send(msg: ClientMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.onError.emit('Chưa kết nối được tới máy chủ, vui lòng thử lại.');
      return false;
    }
    this.ws.send(JSON.stringify(msg));
    return true;
  }

  createRoom(roomName: string, playerName: string) {
    this.send({ action: 'CREATE_ROOM', roomName, playerName });
  }

  joinRoom(roomCode: string, playerName: string) {
    this.send({ action: 'JOIN_ROOM', roomCode, playerName });
  }

  startGame(totalRounds: number, roundDurationSeconds: number) {
    this.send({ action: 'START_GAME', totalRounds, roundDurationSeconds });
  }

  chooseRandomWord() {
    this.send({ action: 'CHOOSE_WORD', mode: 'random' });
  }

  chooseCustomWord(word: string) {
    this.send({ action: 'CHOOSE_WORD', mode: 'custom', word });
  }

  addStroke(stroke: DrawStroke) {
    // The server does not echo strokes back to the drawer, so render it locally right away.
    if (this.send({ action: 'DRAW_STROKE', stroke }) && this.state) {
      this.setState({ ...this.state, strokes: [...this.state.strokes, stroke] });
    }
  }

  clearCanvas() {
    this.send({ action: 'CLEAR_CANVAS' });
  }

  sendGuess(text: string) {
    this.send({ action: 'CHAT_GUESS', text });
  }

  playAgain() {
    this.send({ action: 'PLAY_AGAIN' });
  }

  leaveRoom() {
    this.send({ action: 'LEAVE_ROOM' });
    this.resetRoom();
  }

  destroy() {
    this.destroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }
}
