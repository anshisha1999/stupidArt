import React, { useState } from 'react';
import { DiscoveredRoom } from '../types/game';
import {
  Wifi,
  Radio,
  PlusCircle,
  RefreshCw,
  Server,
  ArrowRight,
  ShieldCheck,
  User,
  ExternalLink,
  Laptop,
} from 'lucide-react';

interface RoomBrowserViewProps {
  rooms: DiscoveredRoom[];
  onJoinRoom: (room: DiscoveredRoom) => void;
  onCreateRoom: (roomName: string) => void;
  onManualConnect: (ip: string, port: number) => void;
  myIp: string;
}

export const RoomBrowserView: React.FC<RoomBrowserViewProps> = ({
  rooms,
  onJoinRoom,
  onCreateRoom,
  onManualConnect,
  myIp,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('Phòng Game Trưa');
  const [manualIp, setManualIp] = useState('192.168.1.105');
  const [manualPort, setManualPort] = useState('8080');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    onCreateRoom(newRoomName.trim());
    setShowCreateModal(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIp.trim()) return;
    onManualConnect(manualIp.trim(), parseInt(manualPort) || 8080);
    setShowManualModal(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl p-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-2">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            UDP BROADCAST DISCOVERY ACTIVE (PORT 8888)
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Sảnh Tìm Phòng Chơi Trong Mạng Nội Bộ (LAN)
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Các thiết bị cùng kết nối chung một Wi-Fi sẽ tự động tìm thấy nhau qua UDP Broadcast mà không cần qua Server Internet.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Server className="w-4 h-4 text-amber-400" />
            Nhập IP thủ công
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            Tạo phòng mới (Host)
          </button>
        </div>
      </div>

      {/* Network & Local Info Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5 text-xs">
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">IP Thiết bị của bạn:</span>
          <span className="font-mono font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            {myIp}
          </span>
        </div>
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">Cổng UDP Quét:</span>
          <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            8888 (Broadcast)
          </span>
        </div>
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">Cổng WebSocket Game:</span>
          <span className="font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
            8080 (dart:io)
          </span>
        </div>
      </div>

      {/* Discovered Rooms Grid */}
      <div className="flex-1 overflow-y-auto space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-indigo-400" />
            Danh sách phòng phát hiện trong Wi-Fi ({rooms.length})
          </h3>
          <span className="text-xs text-slate-500">Tự động làm mới mỗi 3.5s</span>
        </div>

        {rooms.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-center p-6 border-2 border-dashed border-slate-800 rounded-2xl">
            <Radio className="w-10 h-10 mb-3 text-slate-600 animate-pulse" />
            <p className="font-semibold text-slate-300">Đang quét các phòng trong mạng LAN...</p>
            <p className="text-xs mt-1 text-slate-500 max-w-sm">
              Chưa tìm thấy phòng nào đang mở. Hãy bấm &quot;Tạo phòng mới&quot; trên một thiết bị để làm Host phát tín hiệu!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rooms.map((room, idx) => (
              <div
                key={idx}
                className="bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between group shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-bold text-slate-100 text-sm group-hover:text-indigo-300 transition-colors">
                      {room.roomName}
                    </h4>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                      LAN
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Chủ phòng: <strong className="text-slate-200">{room.hostName}</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Laptop className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-mono text-slate-300 text-[11px]">
                        ws://{room.hostIp}:{room.port}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Số người: <strong className="text-emerald-400">{room.playerCount} / {room.maxPlayers}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">
                    {room.phase === 'LOBBY' ? 'Đang ở sảnh chờ' : 'Đang trong trận'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onJoinRoom(room)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-all active:scale-95"
                  >
                    <span>Vào phòng</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Tạo phòng mới */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSubmit}
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4"
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-indigo-400" />
              Tạo phòng chơi mới (Làm Host)
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Đặt tên phòng của bạn:
                </label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Ví dụ: Phòng Chiến Hữu Tầng 2"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p>• Máy bạn sẽ khởi chạy Local WebSocket Server tại cổng <strong>8080</strong>.</p>
                <p>• Dịch vụ UDP Broadcast sẽ phát tín hiệu liên tục trên cổng <strong>8888</strong>.</p>
                <p>• Các máy khác trong cùng Wi-Fi sẽ tự động nhìn thấy phòng này.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
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

      {/* Modal: Nhập IP thủ công */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleManualSubmit}
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4"
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-amber-400" />
              Kết nối trực tiếp qua IP (Fallback)
            </h3>

            <div className="space-y-3 text-xs">
              <p className="text-slate-400 text-[11px]">
                Sử dụng khi Router Wi-Fi bật chế độ cách ly AP (AP Isolation) hoặc chặn gói tin UDP Broadcast.
              </p>
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Địa chỉ IP của máy Host:
                </label>
                <input
                  type="text"
                  value={manualIp}
                  onChange={(e) => setManualIp(e.target.value)}
                  placeholder="192.168.1.105"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Cổng kết nối (Port):
                </label>
                <input
                  type="text"
                  value={manualPort}
                  onChange={(e) => setManualPort(e.target.value)}
                  placeholder="8080"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
              >
                Kết nối ngay
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
