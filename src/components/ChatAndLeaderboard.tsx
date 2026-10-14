import React, { useState, useRef, useEffect } from 'react';
import { Player, ChatMessage } from '../types/game';
import { Send, Trophy, Sparkles, MessageSquare, Flame, CheckCircle2 } from 'lucide-react';

interface ChatAndLeaderboardProps {
  players: Player[];
  messages: ChatMessage[];
  currentDrawerId: string | null;
  activePlayerId: string;
  onSendGuess: (text: string) => void;
  isDrawer: boolean;
}

export const ChatAndLeaderboard: React.FC<ChatAndLeaderboardProps> = ({
  players,
  messages,
  currentDrawerId,
  activePlayerId,
  onSendGuess,
  isDrawer,
}) => {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendGuess(inputText.trim());
    setInputText('');
  };

  // Sort players by score descending
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
      {/* Leaderboard Header & Player List */}
      <div className="bg-slate-800 p-3 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Trophy className="w-4 h-4 text-amber-400" />
            BẢNG XẾP HẠNG LAN ({players.length} người)
          </div>
          <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            LAN Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
          {sortedPlayers.map((player, idx) => {
            const isCurrentDrawer = player.id === currentDrawerId;
            const isMe = player.id === activePlayerId;

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors border ${
                  player.hasGuessedCorrectly
                    ? 'bg-emerald-950/40 border-emerald-500/40'
                    : isCurrentDrawer
                    ? 'bg-amber-950/30 border-amber-500/40'
                    : 'bg-slate-800/80 border-slate-700/60'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-base select-none">{player.avatar}</span>
                  <div className="truncate">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-slate-200 truncate">
                        {player.name}
                      </span>
                      {isMe && (
                        <span className="text-[9px] bg-indigo-500/30 text-indigo-300 px-1 rounded">
                          Bạn
                        </span>
                      )}
                      {player.isHost && (
                        <span className="text-[9px] bg-rose-500/30 text-rose-300 px-1 rounded">
                          Host
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      {isCurrentDrawer && (
                        <span className="text-amber-400 font-medium flex items-center gap-0.5">
                          ✏️ Đang vẽ
                        </span>
                      )}
                      {player.hasGuessedCorrectly && (
                        <span className="text-emerald-400 font-medium flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3 inline" /> Đã đoán đúng
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-amber-300">
                    {player.score} đ
                  </span>
                  <div className="text-[9px] text-slate-500">{player.pingMs}ms</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs font-sans">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center px-4">
            <MessageSquare className="w-8 h-8 mb-2 stroke-1 opacity-50" />
            <p>Chưa có tin nhắn nào.</p>
            <p className="text-[11px] mt-1">
              Hãy nhập từ khóa bạn đoán vào khung bên dưới!
            </p>
          </div>
        ) : (
          messages.map((m) => {
            if (m.type === 'system') {
              return (
                <div
                  key={m.id}
                  className="bg-slate-800/90 text-slate-300 border border-slate-700/60 rounded-lg p-2 text-center text-[11px] italic"
                >
                  {m.text}
                </div>
              );
            }

            if (m.type === 'correct_guess') {
              return (
                <div
                  key={m.id}
                  className="bg-gradient-to-r from-emerald-900/60 via-emerald-800/40 to-teal-900/60 border border-emerald-500/50 text-emerald-200 rounded-lg p-2.5 font-medium flex items-center gap-2 shadow-sm animate-pulse"
                >
                  <Sparkles className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>{m.text}</span>
                </div>
              );
            }

            const isMine = m.senderId === activePlayerId;

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[10px] text-slate-400 mb-0.5 px-1">
                  {m.senderName}
                </span>
                <div
                  className={`px-3 py-1.5 rounded-xl max-w-[85%] break-words ${
                    isMine
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-200 border border-slate-700/70 rounded-bl-none'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Chat / Guess Input Form */}
      <form
        onSubmit={handleSubmit}
        className="p-2.5 bg-slate-800 border-t border-slate-700 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isDrawer
              ? 'Bạn đang là người vẽ (không thể đoán từ)'
              : 'Gõ từ khóa bạn đoán vào đây...'
          }
          disabled={isDrawer}
          className={`flex-1 px-3 py-2 text-xs rounded-lg border outline-none transition-all ${
            isDrawer
              ? 'bg-slate-900/50 border-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
          }`}
        />
        <button
          type="submit"
          disabled={isDrawer || !inputText.trim()}
          className={`p-2 rounded-lg text-white font-medium flex items-center justify-center transition-all ${
            isDrawer || !inputText.trim()
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 active:scale-95'
          }`}
          title="Gửi câu trả lời"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
