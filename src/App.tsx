import React, { useState, useEffect, useMemo } from 'react';
import { LanSimulatorEngine } from './engine/lanSimulatorEngine';
import { RoomState, DrawStroke, ChatMessage, DiscoveredRoom } from './types/game';
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
} from 'lucide-react';

export default function App() {
  const engine = useMemo(() => new LanSimulatorEngine(), []);

  // Screen navigation: 'browser' -> 'lobby' -> 'game'
  const [currentScreen, setCurrentScreen] = useState<'browser' | 'lobby' | 'game'>('browser');

  const [roomState, setRoomState] = useState<RoomState>(engine.getState());
  const [discoveredRooms, setDiscoveredRooms] = useState<DiscoveredRoom[]>(engine.getDiscoveredRooms());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activePlayerId, setActivePlayerId] = useState<string>('player_host');
  const [playerName, setPlayerName] = useState<string>('Họa Sĩ Vui Vẻ');

  // Dialogs
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [showLeaveModal, setShowLeaveModal] = useState<boolean>(false);
  const [newRoomName, setNewRoomName] = useState<string>('Phòng Gia Đình');
  const [manualIp, setManualIp] = useState<string>('192.168.1.105');
  const [closeGuessAlert, setCloseGuessAlert] = useState<string | null>(null);

  // Room config
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [selectedRounds, setSelectedRounds] = useState<number>(3);

  useEffect(() => {
    const unsubState = engine.subscribeState((state) => {
      setRoomState(state);
      if (currentScreen === 'lobby' && state.phase === 'DRAWING') {
        setCurrentScreen('game');
      }
    });

    const unsubRooms = engine.subscribeDiscoveredRooms((rooms) => {
      setDiscoveredRooms(rooms);
    });

    const unsubChat = engine.subscribeChat((chat) => {
      setMessages((prev) => [...prev, chat]);
      if (chat.type === 'close_guess') {
        setCloseGuessAlert(chat.text);
        setTimeout(() => setCloseGuessAlert(null), 3000);
      }
    });

    const unsubCorrect = engine.subscribeCorrectGuess(() => {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    });

    const unsubRoomClosed = engine.subscribeRoomClosed((reason) => {
      setCurrentScreen('browser');
    });

    return () => {
      unsubState();
      unsubRooms();
      unsubChat();
      unsubCorrect();
      unsubRoomClosed();
      engine.destroy();
    };
  }, [engine, currentScreen]);

  const activePlayer =
    roomState.players.find((p) => p.id === activePlayerId) ||
    roomState.players[0] || {
      id: 'player_host',
      name: playerName,
      avatar: '🎨',
      isHost: true,
      score: 0,
      hasGuessedCorrectly: false,
      isConnected: true,
      pingMs: 1,
    };

  const isCurrentDrawer = activePlayer.id === roomState.currentDrawerId;
  const currentDrawerPlayer = roomState.players.find(
    (p) => p.id === roomState.currentDrawerId
  );

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    engine.createNewRoom(newRoomName.trim(), playerName.trim());
    setActivePlayerId('player_host');
    setShowCreateModal(false);
    setCurrentScreen('lobby');
  };

  const handleJoinRoom = (room: DiscoveredRoom) => {
    engine.connectToRoom(room.hostIp, room.port, playerName.trim());
    setShowManualModal(false);
    setCurrentScreen('lobby');
  };

  const handleManualConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIp.trim()) return;
    engine.connectToRoom(manualIp.trim(), 8080, playerName.trim());
    setShowManualModal(false);
    setCurrentScreen('lobby');
  };

  const handleStartGame = () => {
    engine.setRoomSettings({
      roundDurationSeconds: selectedDuration,
      totalRounds: selectedRounds,
    });
    engine.startGame();
    setCurrentScreen('game');
  };

  const handleConfirmLeave = () => {
    setShowLeaveModal(false);
    engine.leaveRoom(activePlayer.id);
    setCurrentScreen('browser');
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
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
                onClick={() => setDiscoveredRooms(engine.getDiscoveredRooms())}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                title="Làm mới danh sách"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setShowManualModal(true)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                title="Nhập IP thủ công"
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
                <div>IP Máy của bạn:</div>
                <div className="font-mono font-bold text-indigo-300 text-xs">
                  {roomState.settings.hostIp}
                </div>
              </div>
            </div>
          </div>

          {/* Room List Content */}
          <div className="flex-1 overflow-y-auto p-4 max-w-xl mx-auto w-full space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-semibold text-slate-200">
                Phòng tìm thấy trong Wi-Fi ({discoveredRooms.length})
              </span>
              <button
                type="button"
                onClick={() => setShowManualModal(true)}
                className="text-indigo-400 hover:underline"
              >
                Nhập IP kết nối trực tiếp
              </button>
            </div>

            {discoveredRooms.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center text-slate-500">
                <RefreshCw className="w-10 h-10 mb-3 text-slate-600 animate-spin" />
                <p className="font-semibold text-slate-300 text-sm">
                  Đang quét phòng chơi trên cổng UDP 8888...
                </p>
                <p className="text-xs mt-1 text-slate-500">
                  Hãy chắc chắn rằng các máy cùng kết nối chung một mạng Wi-Fi.
                </p>
              </div>
            ) : (
              discoveredRooms.map((room, idx) => (
                <div
                  key={idx}
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
                      ws://{room.hostIp}:{room.port}
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
                Chờ người chơi sẵn sàng • {roomState.players.length} thành viên
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
                  ? isCurrentDrawer
                    ? `${roomState.secretWord} (${roomState.category})`
                    : `${roomState.maskedWord} (${roomState.category})`
                  : roomState.phase === 'ROUND_SUMMARY'
                  ? `${roomState.secretWord} (Đáp án)`
                  : '...'}
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
                isDrawer={isCurrentDrawer}
                strokes={roomState.strokes}
                onAddStroke={(s) => engine.addStroke(s, activePlayer.id)}
                onClearCanvas={() => engine.clearCanvas(activePlayer.id)}
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
                onSendGuess={(t) => engine.submitGuess(activePlayer.id, t)}
                isDrawer={isCurrentDrawer}
              />
            </div>
          </div>
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
              Kết nối IP thủ công
            </h3>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Nhập IP của máy Host (dành cho trường hợp Router Wi-Fi chặn gói UDP Broadcast):
            </p>

            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1">
                Địa chỉ IP của Host:
              </label>
              <input
                type="text"
                value={manualIp}
                onChange={(e) => setManualIp(e.target.value)}
                placeholder="192.168.1.105"
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
