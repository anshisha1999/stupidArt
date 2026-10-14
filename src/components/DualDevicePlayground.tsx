import React, { useState, useEffect, useRef } from 'react';
import { LanSimulatorEngine } from '../engine/lanSimulatorEngine';
import { RoomState, DrawStroke } from '../types/game';
import { DrawingCanvas } from './DrawingCanvas';
import { Smartphone, Tablet, Wifi, Play, RotateCcw, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DualDevicePlaygroundProps {
  engine: LanSimulatorEngine;
}

export const DualDevicePlayground: React.FC<DualDevicePlaygroundProps> = ({ engine }) => {
  const [roomState, setRoomState] = useState<RoomState>(engine.getState());
  const [guesserInput, setGuesserInput] = useState('');

  useEffect(() => {
    const unsub = engine.subscribeState((state) => {
      setRoomState(state);
    });

    const unsubCorrect = engine.subscribeCorrectGuess(() => {
      confetti({
        particleCount: 90,
        spread: 60,
        origin: { y: 0.6 },
      });
    });

    return () => {
      unsub();
      unsubCorrect();
    };
  }, [engine]);

  const hostPlayer = roomState.players.find((p) => p.isHost) || roomState.players[0];
  const clientPlayer =
    roomState.players.find((p) => !p.isHost) || roomState.players[1] || roomState.players[0];

  const isHostDrawer = roomState.currentDrawerId === hostPlayer?.id;
  const isClientDrawer = roomState.currentDrawerId === clientPlayer?.id;

  const handleGuesserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guesserInput.trim() || !clientPlayer) return;
    engine.submitGuess(clientPlayer.id, guesserInput.trim());
    setGuesserInput('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl p-4">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-300 text-xs font-semibold">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            MÔ PHỎNG LAN MULTI-DEVICE: 2 THIẾT BỊ ĐỒNG THỜI
          </div>
          <span className="text-xs text-slate-400">
            Vẽ ở máy Trái (Drawer) → Nét vẽ truyền qua WebSocket sang máy Phải (Guesser)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {roomState.phase === 'LOBBY' ? (
            <button
              type="button"
              onClick={() => engine.startGame()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Bắt đầu ván
            </button>
          ) : (
            <button
              type="button"
              onClick={() => engine.resetToLobby()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Quay lại Lobby
            </button>
          )}
        </div>
      </div>

      {/* Round & Timer Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 rounded-lg border border-slate-700 mb-4 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-200">
            Hiệp: <strong className="text-amber-400">{roomState.currentRound}/{roomState.totalRounds}</strong>
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-300">
            Chủ đề: <strong className="text-sky-400">{roomState.category || 'Chờ...'}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono">
          <span className="text-slate-400">Thời gian còn lại:</span>
          <span
            className={`px-2 py-0.5 rounded font-bold ${
              roomState.timeRemaining <= 10
                ? 'bg-rose-500/20 text-rose-400 animate-pulse'
                : 'bg-indigo-500/20 text-indigo-300'
            }`}
          >
            {roomState.timeRemaining}s
          </span>
        </div>
      </div>

      {/* Split Screen Dual Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* DEVICE 1: HOST / DRAWER (Phone frame) */}
        <div className="flex flex-col bg-slate-950 border-2 border-slate-700 rounded-2xl overflow-hidden shadow-xl">
          {/* Virtual Phone Header */}
          <div className="px-3 py-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-slate-200">THIẾT BỊ 1: HOST (Người vẽ)</span>
              <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                IP: {roomState.settings.hostIp}
              </span>
            </div>
            <span className="font-mono text-amber-300 font-bold">
              Điểm: {hostPlayer?.score || 0}
            </span>
          </div>

          {/* Canvas area */}
          <div className="flex-1 p-2 min-h-0 flex flex-col">
            <DrawingCanvas
              isDrawer={isHostDrawer}
              strokes={roomState.strokes}
              onAddStroke={(s) => engine.addStroke(s, hostPlayer.id)}
              onClearCanvas={() => engine.clearCanvas(hostPlayer.id)}
              drawerName={hostPlayer.name}
              secretWord={roomState.secretWord}
            />
          </div>
        </div>

        {/* DEVICE 2: CLIENT / GUESSER (Tablet/Phone frame) */}
        <div className="flex flex-col bg-slate-950 border-2 border-slate-700 rounded-2xl overflow-hidden shadow-xl">
          {/* Virtual Device Header */}
          <div className="px-3 py-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Tablet className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-200">THIẾT BỊ 2: CLIENT (Người đoán)</span>
              <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                IP: 192.168.1.112
              </span>
            </div>
            <span className="font-mono text-emerald-300 font-bold">
              Điểm: {clientPlayer?.score || 0}
            </span>
          </div>

          {/* Word Guessing Mask Banner on Client */}
          <div className="p-3 bg-indigo-950/40 border-b border-indigo-900/50 flex flex-col items-center justify-center">
            <span className="text-[10px] text-indigo-300 font-medium mb-1">
              TỪ KHÓA CẦN ĐOÁN ({roomState.secretWord.replace(/\s+/g, '').length} CHỮ CÁI)
            </span>
            <div className="text-xl font-mono tracking-widest font-black text-amber-300">
              {roomState.phase === 'DRAWING' ? roomState.maskedWord : roomState.secretWord || '...'}
            </div>
          </div>

          {/* Canvas area (Read-only on Client) */}
          <div className="flex-1 p-2 min-h-0 flex flex-col">
            <DrawingCanvas
              isDrawer={isClientDrawer}
              strokes={roomState.strokes}
              drawerName={hostPlayer.name}
              secretWord=""
            />
          </div>

          {/* Guesser Input Box on Client Device */}
          <form
            onSubmit={handleGuesserSubmit}
            className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={guesserInput}
              onChange={(e) => setGuesserInput(e.target.value)}
              placeholder="Nhập câu trả lời của Client (ví dụ: Con mèo, Bánh mì...)"
              className="flex-1 px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition-all active:scale-95"
            >
              Đoán ngay
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
