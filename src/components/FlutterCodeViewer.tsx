import React, { useState } from 'react';
import { FLUTTER_SOURCE_FILES, FLUTTER_PROJECT_STRUCTURE, FlutterFile } from '../data/flutterSourceCode';
import {
  FileCode,
  FolderTree,
  Copy,
  Check,
  Download,
  Search,
  ExternalLink,
  Code2,
  Terminal,
  Layers,
} from 'lucide-react';
import JSZip from 'jszip';

export const FlutterCodeViewer: React.FC = () => {
  const [selectedFilePath, setSelectedFilePath] = useState<string>(FLUTTER_SOURCE_FILES[0].path);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isZipping, setIsZipping] = useState(false);

  const selectedFile =
    FLUTTER_SOURCE_FILES.find((f) => f.path === selectedFilePath) || FLUTTER_SOURCE_FILES[0];

  const filteredFiles = FLUTTER_SOURCE_FILES.filter((file) => {
    const matchesSearch =
      file.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || file.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();

      // Add README.md
      zip.file(
        'README.md',
        `# Draw & Guess LAN - Flutter Cross-Platform Game\n\nỨng dụng game vẽ hình đoán chữ đa nền tảng không cần server internet.\nChạy hoàn toàn qua UDP Broadcast (Port 8888) và local WebSocket Server trên máy Host.\n`
      );

      // Add all project files
      FLUTTER_SOURCE_FILES.forEach((f) => {
        zip.file(f.path, f.code);
      });

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'draw_and_guess_lan_flutter.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating zip:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Banner with Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-800 border-b border-slate-700">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Code2 className="w-5 h-5 text-indigo-400" />
            KHO MÃ NGUỒN FLUTTER DỰ ÁN (PRODUCTION READY)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Đầy đủ kiến trúc: UDP Broadcast 8888, WebSocket Server (dart:io), Canvas 0.0→1.0 & Quyền Native
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-colors border border-slate-600"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">Đã sao chép!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Sao chép file này
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isZipping ? 'Đang nén ZIP...' : 'Tải trọn bộ Flutter (.ZIP)'}
          </button>
        </div>
      </div>

      {/* Main File Explorer & Code Pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: File Tree & Category Filter */}
        <div className="w-72 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0">
          {/* Search box */}
          <div className="p-3 border-b border-slate-800">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Tìm kiếm file..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1 p-2 border-b border-slate-800 bg-slate-900/40 text-[10px]">
            {['all', 'network', 'models', 'widgets', 'screens', 'native', 'config'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-2 py-0.5 rounded capitalize ${
                  activeCategory === cat
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-800/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* File List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
            {filteredFiles.map((f) => {
              const isSelected = f.path === selectedFilePath;
              return (
                <button
                  key={f.path}
                  type="button"
                  onClick={() => setSelectedFilePath(f.path)}
                  className={`w-full text-left p-2 rounded-lg transition-colors flex items-start gap-2 ${
                    isSelected
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <FileCode
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      isSelected ? 'text-indigo-400' : 'text-slate-500'
                    }`}
                  />
                  <div className="truncate">
                    <div className="font-mono text-[11px] font-medium text-slate-200 truncate">
                      {f.path}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      {f.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Info Box */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300 mb-1">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              Lệnh chạy dự án:
            </div>
            <code className="block bg-slate-950 p-1.5 rounded text-[10px] text-emerald-400 font-mono">
              flutter pub get<br />
              flutter run
            </code>
          </div>
        </div>

        {/* Right Pane: Code Viewer */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          {/* File Meta Header */}
          <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/30">
                {selectedFile.path}
              </span>
              <span className="text-xs text-slate-400">
                • {selectedFile.description}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              {selectedFile.code.split('\n').length} dòng
            </span>
          </div>

          {/* Code content */}
          <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-300 leading-relaxed bg-[#0b0f19]">
            <pre>
              <code>{selectedFile.code}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
