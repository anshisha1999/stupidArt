import React, { useState } from 'react';
import { NetworkPacket } from '../types/game';
import { Activity, Radio, Wifi, Filter, ChevronRight, ChevronDown, Check } from 'lucide-react';

interface NetworkPacketInspectorProps {
  packets: NetworkPacket[];
}

export const NetworkPacketInspector: React.FC<NetworkPacketInspectorProps> = ({ packets }) => {
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'UDP_BROADCAST' | 'WEBSOCKET'>('ALL');
  const [expandedPacketId, setExpandedPacketId] = useState<string | null>(null);

  const filteredPackets = packets.filter((p) => {
    if (selectedFilter === 'ALL') return true;
    return p.protocol === selectedFilter;
  });

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'ROOM_ANNOUNCE':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'DRAW_POINT':
        return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
      case 'CHAT_GUESS':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'CORRECT_GUESS':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'ROOM_STATE':
        return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      case 'CLEAR_CANVAS':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
      {/* Header & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-800 border-b border-slate-700 text-xs">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="font-semibold text-slate-200">GÓI TIN MẠNG LAN & WEBSOCKET REALTIME</span>
          <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[10px]">
            {filteredPackets.length} gói
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={() => setSelectedFilter('ALL')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              selectedFilter === 'ALL'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('UDP_BROADCAST')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
              selectedFilter === 'UDP_BROADCAST'
                ? 'bg-amber-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3 h-3" />
            UDP:8888
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('WEBSOCKET')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
              selectedFilter === 'WEBSOCKET'
                ? 'bg-sky-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wifi className="w-3 h-3" />
            WebSocket
          </button>
        </div>
      </div>

      {/* Packet Stream List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800 font-mono text-[11px]">
        {filteredPackets.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Chưa có gói tin nào được ghi nhận.
          </div>
        ) : (
          filteredPackets.map((pkt) => {
            const isExpanded = expandedPacketId === pkt.id;
            const timeStr = new Date(pkt.timestamp).toLocaleTimeString();

            return (
              <div key={pkt.id} className="hover:bg-slate-800/40 transition-colors">
                <div
                  className="flex items-center justify-between p-2.5 cursor-pointer select-none"
                  onClick={() => setExpandedPacketId(isExpanded ? null : pkt.id)}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}

                    <span className="text-[10px] text-slate-500 shrink-0">{timeStr}</span>

                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border shrink-0 ${
                        pkt.protocol === 'UDP_BROADCAST'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                      }`}
                    >
                      {pkt.protocol === 'UDP_BROADCAST' ? 'UDP' : 'WS'}
                    </span>

                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${getActionBadgeColor(
                        pkt.action
                      )}`}
                    >
                      {pkt.action}
                    </span>

                    <span className="text-slate-300 truncate font-sans text-xs">
                      {pkt.sender}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-slate-400">
                    <span className="text-[10px]">{pkt.byteSize} B</span>
                    <span
                      className={`text-[9px] uppercase px-1 rounded ${
                        pkt.direction === 'OUTGOING'
                          ? 'bg-blue-500/20 text-blue-300'
                          : pkt.direction === 'INCOMING'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {pkt.direction === 'SERVER_BROADCAST'
                        ? 'BCast'
                        : pkt.direction === 'OUTGOING'
                        ? 'TX'
                        : 'RX'}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-slate-300 overflow-x-auto">
                    <div className="text-[10px] text-slate-500 mb-1">
                      JSON Payload Data:
                    </div>
                    <pre className="text-emerald-400 text-[11px] leading-relaxed">
                      {JSON.stringify(pkt.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
