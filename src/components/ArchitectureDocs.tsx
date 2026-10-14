import React from 'react';
import {
  Network,
  Radio,
  Server,
  Smartphone,
  Cpu,
  Layers,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  FileCode,
} from 'lucide-react';

export const ArchitectureDocs: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-xl overflow-y-auto p-6 space-y-8 text-slate-300 text-sm">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold mb-2">
          <Network className="w-3.5 h-3.5" />
          SYSTEMS & FLUTTER LAN ARCHITECTURE
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Kiến Trúc Game Draw & Guess Trong Mạng Nội Bộ (LAN Only)
        </h1>
        <p className="text-slate-400 mt-1">
          Thiết kế hệ thống thời gian thực hoàn toàn phi tập trung không phụ thuộc vào máy chủ Cloud, tối ưu hóa độ trễ &lt; 5ms và đồng bộ hóa đồ họa đa màn hình.
        </p>
      </div>

      {/* 1. Topology Diagram */}
      <section className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Radio className="w-5 h-5 text-amber-400" />
          1. Mô Hình Mạng & Cơ Chế Khám Phá Phòng (Discovery & Communication)
        </h2>
        <p className="text-slate-400 text-xs leading-relaxed">
          Không cần Cloud Server hay Firebase! Toàn bộ trò chơi vận hành bằng 2 tầng mạng độc lập bên trong cùng mạng Wi-Fi:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          {/* UDP Layer */}
          <div className="bg-slate-900/90 p-4 rounded-xl border border-amber-500/30">
            <div className="flex items-center justify-between text-amber-300 font-bold mb-2">
              <span className="flex items-center gap-1.5">
                <Radio className="w-4 h-4" /> TẦNG 1: UDP BROADCAST
              </span>
              <span>Port 8888</span>
            </div>
            <p className="text-slate-400 font-sans mb-3 text-[11px]">
              Host định kỳ gửi beacon broadcast mỗi 1.5s tới địa chỉ <code>255.255.255.255</code>. Client lắng nghe cổng 8888 để tự động bắt IP mà không cần gõ tay.
            </p>
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-[10px] text-amber-200">
              {`{
  "header": "DRAW_GUESS_ROOM_ANNOUNCE",
  "roomName": "Phòng Chiến Hữu",
  "hostIp": "192.168.1.105",
  "port": 8080,
  "players": 3
}`}
            </div>
          </div>

          {/* WebSocket Layer */}
          <div className="bg-slate-900/90 p-4 rounded-xl border border-sky-500/30">
            <div className="flex items-center justify-between text-sky-300 font-bold mb-2">
              <span className="flex items-center gap-1.5">
                <Server className="w-4 h-4" /> TẦNG 2: WEBSOCKET SERVER
              </span>
              <span>Port 8080</span>
            </div>
            <p className="text-slate-400 font-sans mb-3 text-[11px]">
              Host khởi chạy <code>HttpServer</code> cục bộ qua <code>dart:io</code>. Client thiết lập kết nối song công 2 chiều (Full-Duplex) với độ trễ &lt; 5ms.
            </p>
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-[10px] text-sky-200">
              {`ws://192.168.1.105:8080
Actions:
  → JOIN, DRAW_POINT, CLEAR_CANVAS, CHAT_GUESS
  ← ROOM_STATE, CORRECT_GUESS, TICK, ROUND_SUMMARY`}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Coordinate Normalization Deep Dive */}
      <section className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-indigo-400" />
          2. Bài Toán Đồng Bộ Tọa Độ Canvas Đa Màn Hình (Coordinate Normalization)
        </h2>
        <p className="text-slate-300 leading-relaxed text-xs">
          Trong Flutter, các thiết bị có kích thước và tỉ lệ màn hình rất khác nhau: iPhone mini (375x812), iPad Pro (1024x1366), hay Windows Desktop (1920x1080). Nếu gửi tọa độ pixel thực, nét vẽ sẽ bị lệch hoàn toàn hoặc tràn ra ngoài khung vẽ.
        </p>

        <div className="bg-slate-900 p-4 rounded-xl border border-indigo-500/20 space-y-3 font-mono text-xs">
          <div className="text-indigo-300 font-bold">
            📐 Công thức chuẩn hóa toán học (Mathematical Normalization):
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-xs">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="font-semibold text-white block mb-1">
                Tại máy vẽ (Drawer Device):
              </span>
              <p className="text-slate-400 text-[11px] mb-2">
                Khi ngón tay kéo tại vị trí pixel <code>(dx, dy)</code> trên Canvas có kích thước <code>(W_draw, H_draw)</code>:
              </p>
              <code className="text-amber-300 text-[11px] block bg-slate-900 p-2 rounded">
                nx = (dx / W_draw).clamp(0.0, 1.0);<br />
                ny = (dy / H_draw).clamp(0.0, 1.0);
              </code>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="font-semibold text-white block mb-1">
                Tại máy nhận (Guesser Device):
              </span>
              <p className="text-slate-400 text-[11px] mb-2">
                Khi nhận gói tin <code>(nx, ny)</code>, CustomPainter nhân tỉ lệ với kích thước Canvas hiện tại <code>(W_recv, H_recv)</code>:
              </p>
              <code className="text-emerald-300 text-[11px] block bg-slate-900 p-2 rounded">
                renderX = nx * W_recv;<br />
                renderY = ny * H_recv;
              </code>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Game Flow State Machine */}
      <section className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-400" />
          3. Cỗ Máy Trạng Thái Trò Chơi (Game State Machine)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-center text-xs">
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-700">
            <div className="text-amber-400 font-bold mb-1">1. LOBBY</div>
            <p className="text-slate-400 text-[10px]">
              Chờ người chơi vào phòng. Host chọn thời gian (60s/90s) & bấm Bắt đầu.
            </p>
          </div>
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-700">
            <div className="text-sky-400 font-bold mb-1">2. PICK WORD</div>
            <p className="text-slate-400 text-[10px]">
              Lấy ngẫu nhiên từ khóa tiếng Việt. Gửi từ thực cho Drawer, gửi <code>_ _ _ _</code> cho Guesser.
            </p>
          </div>
          <div className="bg-slate-900 p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20">
            <div className="text-emerald-400 font-bold mb-1">3. DRAWING</div>
            <p className="text-slate-400 text-[10px]">
              Đồng hồ đếm ngược tick mỗi giây. Người đoán chat từ khóa, trúng thưởng điểm theo thời gian.
            </p>
          </div>
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-700">
            <div className="text-purple-400 font-bold mb-1">4. SUMMARY</div>
            <p className="text-slate-400 text-[10px]">
              Hết giờ hoặc tất cả đoán trúng. Hiện từ khóa bí mật trong 5s và cộng điểm.
            </p>
          </div>
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-700">
            <div className="text-rose-400 font-bold mb-1">5. GAME OVER</div>
            <p className="text-slate-400 text-[10px]">
              Xong hết số hiệp. Trao cúp vinh danh người chiến thắng và quay về sảnh.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Cross-Platform Pitfalls */}
      <section className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          4. Cấu Hình Native Quan Trọng (Bẫy Thường Gặp Khi Chạy LAN)
        </h2>

        <div className="space-y-3 text-xs">
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-700">
            <span className="font-bold text-rose-400 block mb-1">
              ⚠️ Android 12+ (Multicast Packet Filtering):
            </span>
            <p className="text-slate-400 text-[11px]">
              Android mặc định drop các gói tin UDP Broadcast để tiết kiệm pin. Trong <code>AndroidManifest.xml</code>, bắt buộc phải có <code>android.permission.CHANGE_WIFI_MULTICAST_STATE</code> và có thể kích hoạt <code>WifiManager.createMulticastLock()</code> nếu chạy trên thiết bị vật lý thật.
            </p>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-700">
            <span className="font-bold text-amber-400 block mb-1">
              ⚠️ iOS 14+ (Local Network Privacy Restriction):
            </span>
            <p className="text-slate-400 text-[11px]">
              Apple yêu cầu popup xin quyền người dùng trước khi quét bất kỳ IP cục bộ nào. Bắt buộc khai báo <code>NSLocalNetworkUsageDescription</code> trong <code>ios/Runner/Info.plist</code>, nếu không ứng dụng sẽ âm thầm chặn socket UDP mà không báo lỗi!
            </p>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-700">
            <span className="font-bold text-sky-400 block mb-1">
              ⚠️ Desktop (Windows / macOS / Linux Firewall):
            </span>
            <p className="text-slate-400 text-[11px]">
              Lần đầu tiên Host chạy WebSocket server, hệ điều hành sẽ hỏi &ldquo;Allow app to communicate on Private networks&rdquo;. Cần tích chọn Allow để cho phép cổng 8080 và 8888 nhận dữ liệu từ các điện thoại trong nhà.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
