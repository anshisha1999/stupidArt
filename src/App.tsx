import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GameClient, ConnectionStatus, fetchRooms } from './network/gameClient';
import { RoomState, ChatMessage, DiscoveredRoom } from './types/game';
import { DrawingCanvas } from './components/DrawingCanvas';
import { ChatAndLeaderboard } from './components/ChatAndLeaderboard';
import confetti from 'canvas-confetti';
import {
  RefreshCw,
  Network,
  PlusCircle,
  LogOut,
  Clock,
  Play,
  Settings,
  Lightbulb,
  ArrowRight,
  User,
  AlertTriangle,
  Trophy,
} from 'lucide-react';

const ROOM_LIST_POLL_MS = 3000;

// Shown only while not in a room; never rendered with data.
const EMPTY_ROOM: RoomState = {
  roomId: '',
  settings: { roomName: '', totalRounds: 0, roundDurationSeconds: 0, maxPlayers: 0 },
  phase: 'LOBBY',
  currentRound: 0,
  totalRounds: 0,
  currentDrawerId: null,
  secretWord: '',
  maskedWord: '',
  category: '',
  timeRemaining: 0,
  players: [],
  strokes: [],
  roundPointsGained: {},
};

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Đang kết nối...',
  open: 'Đã kết nối',
  closed: 'Mất kết nối',
};

export default function App() {
  const client = useMemo(() => new GameClient(), []);

  const [joinedRoom, setJoinedRoom] = useState<RoomState | null>(null);
  const roomState = joinedRoom ?? EMPTY_ROOM;
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [discoveredRooms, setDiscoveredRooms] = useState<DiscoveredRoom[]>([]);
  const [roomsLoaded, setRoomsLoaded] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [playerName, setPlayerName] = useState<string>('Họa Sĩ Vui Vẻ');

  // Screen navigation is derived from the server state: 'browser' -> 'lobby' -> 'game'
  const currentScreen: 'browser' | 'lobby' | 'game' = !joinedRoom
    ? 'browser'
    : joinedRoom.phase === 'LOBBY'
    ? 'lobby'
    : 'game';

  // Dialogs
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [showLeaveModal, setShowLeaveModal] = useState<boolean>(false);
  const [newRoomName, setNewRoomName] = useState<string>('Phòng Gia Đình');
  const [manualCode, setManualCode] = useState<string>('');
  const [closeGuessAlert, setCloseGuessAlert] = useState<string | null>(null);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  // Room config
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [selectedRounds, setSelectedRounds] = useState<number>(3);

  useEffect(() => {
    const showError = (text: string) => {
      setErrorAlert(text);
      setTimeout(() => setErrorAlert(null), 3500);
    };

    const unsubs = [
      client.onStatus.on(setConnectionStatus),
      client.onState.on((state) => {
        setJoinedRoom(state);
        setMyPlayerId(client.getPlayerId());
        if (!state) setMessages([]);
      }),
      client.onChat.on((chat) => {
        setMessages((prev) => [...prev, chat]);
        if (chat.type === 'close_guess') {
          setCloseGuessAlert(chat.text);
          setTimeout(() => setCloseGuessAlert(null), 3000);
        }
      }),
      client.onCorrectGuess.on(() => {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }),
      client.onRoomClosed.on(showError),
      client.onError.on(showError),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
      client.destroy();
    };
  }, [client]);

  const loadRooms = useCallback(() => {
    fetchRooms()
      .then((rooms) => {
        setDiscoveredRooms(rooms);
        setRoomsLoaded(true);
      })
      .catch(() => setRoomsLoaded(true));
  }, []);

  // Poll the open rooms while browsing
  useEffect(() => {
    if (currentScreen !== 'browser') return;
    loadRooms();
    const timer = setInterval(loadRooms, ROOM_LIST_POLL_MS);
    return () => clearInterval(timer);
  }, [currentScreen, loadRooms]);

  const activePlayer = roomState.players.find((p) => p.id === myPlayerId) || {
    id: myPlayerId ?? '',
    name: playerName,
    avatar: '🎨',
    isHost: false,
    score: 0,
    hasGuessedCorrectly: false,
    isConnected: true,
    pingMs: 0,
  };

  const isCurrentDrawer = !!myPlayerId && myPlayerId === roomState.currentDrawerId;
  const canDraw = isCurrentDrawer && roomState.phase === 'DRAWING';
  const currentDrawerPlayer = roomState.players.find(
    (p) => p.id === roomState.currentDrawerId
  );
  const winner = [...roomState.players].sort((a, b) => b.score - a.score)[0];

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    client.createRoom(newRoomName.trim(), playerName.trim());
    setShowCreateModal(false);
  };

  const handleJoinRoom = (room: DiscoveredRoom) => {
    client.joinRoom(room.code, playerName.trim());
  };

  const handleManualConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    client.joinRoom(manualCode.trim(), playerName.trim());
    setShowManualModal(false);
  };

  const handleStartGame = () => {
    client.startGame(selectedRounds, selectedDuration);
  };

  const handleConfirmLeave = () => {
    setShowLeaveModal(false);
    client.leaveRoom();
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Toast lỗi / thông báo từ server */}
      {errorAlert && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white font-bold px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 text-xs border border-rose-400">
          <AlertTriangle className="w-4 h-4" />
          <span>{errorAlert}</span>
        </div>
      )}

      {/* Toast Đoán gần đúng */}
      {closeGuessAlert && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 text-xs animate-bounce border border-amber-300">
          <Lightbulb className="w-4 h-4 fill-current text-slate-950" />
          <span>{closeGuessAlert}</span>
        </div>
      )}

      {/* ===================== SCREEN 1: ROOM BROWSER ===================== */}
      {currentScreen === 'browser' && (
        <div className="flex flex-col h-full">
          {/* AppBar */}
          <header className="flex items-center justify-between px-4 py-3 bg-indigo-700 text-white shadow-md">
            <h1 className="text-base font-bold tracking-wide">Draw &amp; Guess LAN</h1>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={loadRooms}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                title="Làm mới danh sách"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setShowManualModal(true)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                title="Nhập mã phòng"
              >
                <Network className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* User Name input card */}
          <div className="p-4 bg-indigo-950/30 border-b border-slate-800">
            <div className="max-w-xl mx-auto flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-[11px] text-slate-400 font-medium mb-1">
                  Tên người chơi của bạn:
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg text-white text-xs pl-9 pr-3 py-2 focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-400 shrink-0">
                <div>Máy chủ:</div>
                <div
                  className={`font-bold text-xs ${
                    connectionStatus === 'open' ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {STATUS_LABEL[connectionStatus]}
                </div>
              </div>
            </div>
          </div>

          {/* Room List Content */}
          <div className="flex-1 overflow-y-auto p-4 max-w-xl mx-auto w-full space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-semibold text-slate-200">
                Phòng đang mở ({discoveredRooms.length})
              </span>
              <button
                type="button"
                onClick={() => setShowManualModal(true)}
                className="text-indigo-400 hover:underline"
              >
                Nhập mã phòng
              </button>
            </div>

            {discoveredRooms.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center text-slate-500">
                <RefreshCw
                  className={`w-10 h-10 mb-3 text-slate-600 ${roomsLoaded ? '' : 'animate-spin'}`}
                />
                <p className="font-semibold text-slate-300 text-sm">
                  {roomsLoaded ? 'Chưa có phòng nào đang mở.' : 'Đang tải danh sách phòng...'}
                </p>
                <p className="text-xs mt-1 text-slate-500">
                  Hãy tạo phòng mới hoặc nhập mã phòng bạn bè gửi cho bạn.
                </p>
              </div>
            ) : (
              discoveredRooms.map((room) => (
                <div
                  key={room.code}
                  className="bg-slate-900 border border-slate-800 hover:border-indigo-500/60 rounded-xl p-3.5 transition-all shadow-md flex items-center justify-between gap-3"
                >
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-sm text-white truncate">
                      {room.roomName}
                    </h3>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Chủ phòng: <strong className="text-slate-200">{room.hostName}</strong>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                      Mã: {room.code} • {room.playerCount}/{room.maxPlayers} người •{' '}
                      {room.phase === 'LOBBY' ? 'Đang chờ' : 'Đang chơi'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleJoinRoom(room)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition-all shrink-0 active:scale-95"
                  >
                    <span>Vào phòng</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Bottom Action: Create Room */}
          <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0">
            <div className="max-w-xl mx-auto">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <PlusCircle className="w-5 h-5" />
                TẠO PHÒNG MỚI (LÀM HOST)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SCREEN 2: LOBBY SCREEN ===================== */}
      {currentScreen === 'lobby' && (
        <div className="flex flex-col h-full">
          {/* AppBar */}
          <header className="flex items-center justify-between px-4 py-3 bg-indigo-700 text-white shadow-md">
            <div>
              <h1 className="text-base font-bold tracking-wide">
                {roomState.settings.roomName}
              </h1>
              <p className="text-[11px] text-indigo-200">
                Mã phòng: <strong className="font-mono text-white">{roomState.roomId}</strong> •{' '}
                {roomState.players.length} thành viên
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowLeaveModal(true)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors text-white"
              title="Thoát phòng"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 max-w-xl mx-auto w-full space-y-4">
            {/* Host Config Card */}
            {activePlayer.isHost && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <Settings className="w-4 h-4 text-indigo-400" />
                  CẤU HÌNH VÁN CHƠI (HOST)
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Thời gian vẽ:</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedDuration(60)}
                        className={`py-1.5 rounded-lg border font-semibold ${
                          selectedDuration === 60
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        60s
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDuration(90)}
                        className={`py-1.5 rounded-lg border font-semibold ${
                          selectedDuration === 90
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        90s
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Số hiệp chơi:</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[2, 3, 5].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setSelectedRounds(r)}
                          className={`py-1.5 rounded-lg border font-semibold ${
                            selectedRounds === r
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {r} hiệp
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Players in lobby */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
                <span>Người chơi trong phòng ({roomState.players.length}):</span>
              </div>

              <div className="space-y-2">
                {roomState.players.map((p) => (
                  <div
                    key={p.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl select-none">{p.avatar}</span>
                      <div>
                        <div className="font-bold text-sm text-slate-200">
                          {p.name} {p.id === activePlayer.id ? '(Bạn)' : ''}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Độ trễ: {p.pingMs}ms
                        </div>
                      </div>
                    </div>

                    {p.isHost ? (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Chủ phòng
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Sẵn sàng
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Lobby Bottom Start Button */}
          <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0">
            <div className="max-w-xl mx-auto">
              {activePlayer.isHost ? (
                <button
                  type="button"
                  onClick={handleStartGame}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Play className="w-5 h-5 fill-current" />
                  BẮT ĐẦU TRÒ CHƠI
                </button>
              ) : (
                <div className="text-center py-2 text-xs text-slate-400">
                  Đang đợi chủ phòng bấm bắt đầu ván...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== SCREEN 3: GAME SCREEN ===================== */}
      {currentScreen === 'game' && (
        <div className="flex flex-col h-full">
          {/* Top In-Game Bar */}
          <header className="flex items-center justify-between px-3 py-2 bg-indigo-700 text-white shrink-0 shadow-md text-xs">
            {/* Round & Timer */}
            <div className="flex items-center gap-3">
              <span className="font-bold">
                Hiệp {roomState.currentRound}/{roomState.totalRounds}
              </span>
              <div
                className={`flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded ${
                  roomState.timeRemaining <= 10
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-indigo-900/60 text-indigo-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                {roomState.timeRemaining}s
              </div>
            </div>

            {/* Secret Word Display */}
            <div className="text-center">
              <div className="font-mono text-sm tracking-widest font-black text-amber-300">
                {roomState.phase === 'DRAWING'
                  ? `${roomState.secretWord || roomState.maskedWord} (${roomState.category})`
                  : roomState.phase === 'ROUND_SUMMARY'
                  ? `${roomState.secretWord} (Đáp án)`
                  : 'Kết thúc'}
              </div>
            </div>

            {/* Exit Room */}
            <button
              type="button"
              onClick={() => setShowLeaveModal(true)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white"
              title="Rời phòng"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </header>

          {/* Main Gameplay Columns */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 p-2 min-h-0">
            {/* Drawing Canvas Area (Left 8 cols) */}
            <div className="lg:col-span-8 flex flex-col min-h-0">
              <DrawingCanvas
                isDrawer={canDraw}
                strokes={roomState.strokes}
                onAddStroke={(s) => client.addStroke(s)}
                onClearCanvas={() => client.clearCanvas()}
                drawerName={currentDrawerPlayer?.name}
                secretWord={isCurrentDrawer ? roomState.secretWord : undefined}
              />
            </div>

            {/* Leaderboard & Chat Feed (Right 4 cols) */}
            <div className="lg:col-span-4 flex flex-col min-h-0">
              <ChatAndLeaderboard
                players={roomState.players}
                messages={messages}
                currentDrawerId={roomState.currentDrawerId}
                activePlayerId={activePlayer.id}
                onSendGuess={(t) => client.sendGuess(t)}
                isDrawer={canDraw}
              />
            </div>
          </div>

          {/* Game Over overlay */}
          {roomState.phase === 'GAME_OVER' && (
            <div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4 text-center">
                <Trophy className="w-10 h-10 text-amber-400 mx-auto" />
                <h3 className="text-base font-bold text-white">Trò chơi kết thúc!</h3>
                {winner && (
                  <p className="text-sm text-slate-300">
                    Người thắng: <strong className="text-amber-300">{winner.avatar} {winner.name}</strong> ({winner.score} đ)
                  </p>
                )}
                <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowLeaveModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                  >
                    Rời phòng
                  </button>
                  {activePlayer.isHost ? (
                    <button
                      type="button"
                      onClick={() => client.playAgain()}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                    >
                      Chơi ván mới
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">Đợi chủ phòng mở ván mới...</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== DIALOG: CREATE ROOM ===================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateRoom}
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4"
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-indigo-400" />
              Tạo phòng chơi mới (Host)
            </h3>

            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1">
                Tên phòng của bạn:
              </label>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Ví dụ: Phòng Gia Đình"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Tạo và vào sảnh
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================== DIALOG: MANUAL IP ===================== */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleManualConnect}
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4"
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Network className="w-5 h-5 text-amber-400" />
              Vào phòng bằng mã
            </h3>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Nhập mã phòng mà chủ phòng đã gửi cho bạn:
            </p>

            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1">
                Mã phòng:
              </label>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="VD: AB12CD"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
              >
                Kết nối
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================== DIALOG: LEAVE CONFIRMATION ===================== */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              Rời phòng chơi
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              {activePlayer.isHost
                ? 'Bạn là Chủ phòng. Nếu bạn rời đi, toàn bộ phòng chơi sẽ bị giải tán! Bạn có chắc không?'
                : 'Bạn có chắc chắn muốn rời khỏi phòng này và quay về danh sách phòng?'}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Ở lại
              </button>
              <button
                type="button"
                onClick={handleConfirmLeave}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Rời phòng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
