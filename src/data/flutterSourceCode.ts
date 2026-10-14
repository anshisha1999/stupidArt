export interface FlutterFile {
  path: string;
  category: 'config' | 'network' | 'models' | 'screens' | 'widgets' | 'services' | 'utils' | 'native';
  title: string;
  description: string;
  code: string;
}

export const FLUTTER_PROJECT_STRUCTURE = `
draw_and_guess_lan/
├── pubspec.yaml
├── android/app/src/main/AndroidManifest.xml
├── ios/Runner/Info.plist
└── lib/
    ├── main.dart
    ├── utils/
    │   └── vietnamese_matcher.dart
    ├── models/
    │   ├── drawing_point.dart
    │   └── game_models.dart
    ├── network/
    │   ├── udp_discovery.dart
    │   ├── local_game_server.dart
    │   └── game_client.dart
    ├── services/
    │   └── word_bank_service.dart
    ├── widgets/
    │   └── drawing_canvas.dart
    └── screens/
        ├── room_browser_screen.dart
        ├── lobby_screen.dart
        └── game_screen.dart
`;

export const FLUTTER_SOURCE_FILES: FlutterFile[] = [
  {
    path: 'pubspec.yaml',
    category: 'config',
    title: 'pubspec.yaml',
    description: 'File cấu hình dependencies chuẩn cho ứng dụng Flutter Draw & Guess LAN',
    code: `name: draw_and_guess_lan
description: "Cross-platform LAN Multiplayer Draw & Guess game with real UDP discovery & local WebSocket server."
publish_to: "none"
version: 1.0.0+1

environment:
  sdk: ">=3.3.0 <4.0.0"
  flutter: ">=3.19.0"

dependencies:
  flutter:
    sdk: flutter

  web_socket_channel: ^3.0.1
  network_info_plus: ^5.0.3
  uuid: ^4.3.3
  confetti: ^0.7.0
  cupertino_icons: ^1.0.8

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
`
  },
  {
    path: 'lib/utils/vietnamese_matcher.dart',
    category: 'utils',
    title: 'vietnamese_matcher.dart',
    description: 'Thuật toán chuẩn hóa tiếng Việt, khử dấu Regex và tính khoảng cách Levenshtein <= 1',
    code: `import 'dart:math';

class GuessMatchResult {
  final bool isCorrect;
  final bool isClose;
  final String? feedback;

  const GuessMatchResult({
    required this.isCorrect,
    required this.isClose,
    this.feedback,
  });
}

class VietnameseMatcher {
  static String normalizeText(String input) {
    if (input.isEmpty) return '';
    return input
        .toLowerCase()
        .trim()
        .replaceAll(RegExp(r'\\s+'), ' ');
  }

  static String removeVietnameseAccents(String input) {
    String str = normalizeText(input);

    const patterns = [
      {'regex': r'[àáạảãâầấậẩẫăằắặẳẵ]', 'replace': 'a'},
      {'regex': r'[èéẹẻẽêềếệểễ]', 'replace': 'e'},
      {'regex': r'[ìíịỉĩ]', 'replace': 'i'},
      {'regex': r'[òóọỏõôồốộổỗơờớợởỡ]', 'replace': 'o'},
      {'regex': r'[ùúụủũưừứựửữ]', 'replace': 'u'},
      {'regex': r'[ỳýỵỷỹ]', 'replace': 'y'},
      {'regex': r'[đ]', 'replace': 'd'},
    ];

    for (final p in patterns) {
      str = str.replaceAll(RegExp(p['regex']!), p['replace']!);
    }

    return str;
  }

  static int levenshteinDistance(String s1, String s2) {
    final m = s1.length;
    final n = s2.length;
    final dp = List.generate(m + 1, (_) => List.filled(n + 1, 0));

    for (int i = 0; i <= m; i++) dp[i][0] = i;
    for (int j = 0; j <= n; j++) dp[0][j] = j;

    for (int i = 1; i <= m; i++) {
      for (int j = 1; j <= n; j++) {
        if (s1[i - 1] == s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + min(dp[i - 1][j], min(dp[i][j - 1], dp[i - 1][j - 1]));
        }
      }
    }

    return dp[m][n];
  }

  static GuessMatchResult checkAnswer({
    required String guess,
    required String targetWord,
  }) {
    final normGuess = normalizeText(guess);
    final normTarget = normalizeText(targetWord);

    if (normGuess == normTarget) {
      return const GuessMatchResult(isCorrect: true, isClose: false);
    }

    final unaccentedGuess = removeVietnameseAccents(normGuess);
    final unaccentedTarget = removeVietnameseAccents(normTarget);

    if (unaccentedGuess == unaccentedTarget) {
      return const GuessMatchResult(isCorrect: true, isClose: false);
    }

    if (unaccentedTarget.length >= 3) {
      final distance = levenshteinDistance(unaccentedGuess, unaccentedTarget);
      if (distance == 1) {
        return const GuessMatchResult(
          isCorrect: false,
          isClose: true,
          feedback: "Đoán gần đúng rồi! Hãy kiểm tra lại chính tả nhé!",
        );
      }
    }

    return const GuessMatchResult(isCorrect: false, isClose: false);
  }
}
`
  },
  {
    path: 'lib/models/drawing_point.dart',
    category: 'models',
    title: 'drawing_point.dart',
    description: 'Chuẩn hóa tọa độ nét vẽ 0.0 -> 1.0 (Normalized Offset) và serialization',
    code: `import 'package:flutter/material.dart';

class NormalizedPoint {
  final double nx;
  final double ny;

  const NormalizedPoint({required this.nx, required this.ny});

  factory NormalizedPoint.fromOffset(Offset offset, Size canvasSize) {
    if (canvasSize.width <= 0 || canvasSize.height <= 0) {
      return const NormalizedPoint(nx: 0.0, ny: 0.0);
    }
    return NormalizedPoint(
      nx: (offset.dx / canvasSize.width).clamp(0.0, 1.0),
      ny: (offset.dy / canvasSize.height).clamp(0.0, 1.0),
    );
  }

  Offset toOffset(Size canvasSize) {
    return Offset(nx * canvasSize.width, ny * canvasSize.height);
  }

  Map<String, dynamic> toJson() => {
    'x': double.parse(nx.toStringAsFixed(4)),
    'y': double.parse(ny.toStringAsFixed(4)),
  };

  factory NormalizedPoint.fromJson(Map<String, dynamic> json) => NormalizedPoint(
    nx: (json['x'] as num).toDouble(),
    ny: (json['y'] as num).toDouble(),
  );
}

class DrawStroke {
  final String id;
  final List<NormalizedPoint> points;
  final Color color;
  final double strokeWidth;
  final bool isEraser;

  DrawStroke({
    required this.id,
    required this.points,
    required this.color,
    this.strokeWidth = 4.0,
    this.isEraser = false,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'points': points.map((p) => p.toJson()).toList(),
    'color': color.value,
    'strokeWidth': strokeWidth,
    'isEraser': isEraser,
  };

  factory DrawStroke.fromJson(Map<String, dynamic> json) => DrawStroke(
    id: json['id'] as String,
    points: (json['points'] as List)
        .map((p) => NormalizedPoint.fromJson(p as Map<String, dynamic>))
        .toList(),
    color: Color(json['color'] as int),
    strokeWidth: (json['strokeWidth'] as num?)?.toDouble() ?? 4.0,
    isEraser: json['isEraser'] as bool? ?? false,
  );
}
`
  },
  {
    path: 'lib/models/game_models.dart',
    category: 'models',
    title: 'game_models.dart',
    description: 'Player, GamePhase, ChatMessage không chứa dữ liệu giả lập',
    code: `enum GamePhase {
  lobby,
  drawing,
  roundSummary,
  gameOver,
}

class Player {
  final String id;
  final String name;
  final String avatar;
  final bool isHost;
  int score;
  bool hasGuessedCorrectly;

  Player({
    required this.id,
    required this.name,
    required this.avatar,
    this.isHost = false,
    this.score = 0,
    this.hasGuessedCorrectly = false,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'avatar': avatar,
    'isHost': isHost,
    'score': score,
    'hasGuessedCorrectly': hasGuessedCorrectly,
  };

  factory Player.fromJson(Map<String, dynamic> json) => Player(
    id: json['id'] as String,
    name: json['name'] as String,
    avatar: json['avatar'] as String? ?? '🎨',
    isHost: json['isHost'] as bool? ?? false,
    score: json['score'] as int? ?? 0,
    hasGuessedCorrectly: json['hasGuessedCorrectly'] as bool? ?? false,
  );
}

class ChatMessage {
  final String id;
  final String senderId;
  final String senderName;
  final String text;
  final int timestamp;
  final bool isSystem;

  ChatMessage({
    required this.id,
    required this.senderId,
    required this.senderName,
    required this.text,
    required this.timestamp,
    this.isSystem = false,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'senderId': senderId,
    'senderName': senderName,
    'text': text,
    'timestamp': timestamp,
    'isSystem': isSystem,
  };

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
    id: json['id'] as String,
    senderId: json['senderId'] as String,
    senderName: json['senderName'] as String,
    text: json['text'] as String,
    timestamp: json['timestamp'] as int,
    isSystem: json['isSystem'] as bool? ?? false,
  );
}
`
  },
  {
    path: 'lib/network/udp_discovery.dart',
    category: 'network',
    title: 'udp_discovery.dart',
    description: 'Phát và lắng nghe gói UDP broadcast thật trên port 8888 và truy xuất IP LAN chính xác',
    code: `import 'dart:async';
import 'dart:convert';
import 'dart:io';

class UdpDiscoveryService {
  static const int broadcastPort = 8888;
  static const String magicHeader = "DRAW_GUESS_ROOM_ANNOUNCE";

  RawDatagramSocket? _broadcastSocket;
  RawDatagramSocket? _listenerSocket;
  Timer? _beaconTimer;

  final _roomDiscoveredController = StreamController<LanDiscoveredRoom>.broadcast();
  Stream<LanDiscoveredRoom> get onRoomDiscovered => _roomDiscoveredController.stream;

  /// Lấy địa chỉ IP mạng LAN thật của máy hiện tại
  /// Quét qua toàn bộ NetworkInterface để lấy địa chỉ IPv4 không phải loopback (192.168.x.x / 10.x.x.x)
  static Future<String> getDeviceLanIp() async {
    try {
      final interfaces = await NetworkInterface.list(
        type: InternetAddressType.IPv4,
        includeLoopback: false,
      );

      for (final interface in interfaces) {
        for (final addr in interface.addresses) {
          if (!addr.isLoopback && !addr.address.startsWith('127.')) {
            return addr.address;
          }
        }
      }
    } catch (_) {}
    return '127.0.0.1';
  }

  /// HOST: Phát broadcast beacon lên cổng 8888 mỗi 1.5 giây
  Future<void> startHostBroadcast({
    required String roomName,
    required String hostName,
    required String hostIp,
    required int wsPort,
    required int maxPlayers,
  }) async {
    stop();

    try {
      // Bind port 0 (ephemeral port) để phát, bật cờ broadcast
      _broadcastSocket = await RawDatagramSocket.bind(
        InternetAddress.anyIPv4,
        0,
        reuseAddress: true,
      );
      _broadcastSocket!.broadcastEnabled = true;

      final payload = jsonEncode({
        'header': magicHeader,
        'roomName': roomName,
        'hostName': hostName,
        'hostIp': hostIp,
        'port': wsPort,
        'maxPlayers': maxPlayers,
      });

      final bytes = utf8.encode(payload);

      _beaconTimer = Timer.periodic(const Duration(milliseconds: 1500), (_) {
        try {
          _broadcastSocket?.send(
            bytes,
            InternetAddress("255.255.255.255"),
            broadcastPort,
          );
        } catch (_) {}
      });
    } catch (e) {
      print("Lỗi khởi tạo UDP Broadcaster: \$e");
    }
  }

  /// CLIENT: Lắng nghe cổng UDP 8888
  Future<void> startClientDiscovery() async {
    stop();

    try {
      _listenerSocket = await RawDatagramSocket.bind(
        InternetAddress.anyIPv4,
        broadcastPort,
        reuseAddress: true,
        reusePort: true,
      );

      _listenerSocket!.listen((RawSocketEvent event) {
        if (event == RawSocketEvent.read) {
          final datagram = _listenerSocket?.receive();
          if (datagram != null) {
            try {
              final rawString = utf8.decode(datagram.data);
              final json = jsonDecode(rawString) as Map<String, dynamic>;

              if (json['header'] == magicHeader) {
                // Ưu tiên IP trong gói tin, fallback bằng IP socket nguồn
                final realIp = json['hostIp'] ?? datagram.address.address;

                _roomDiscoveredController.add(LanDiscoveredRoom(
                  roomName: json['roomName'] ?? 'Phòng LAN',
                  hostName: json['hostName'] ?? 'Chủ phòng',
                  hostIp: realIp,
                  wsPort: json['port'] ?? 8080,
                  maxPlayers: json['maxPlayers'] ?? 8,
                  lastSeen: DateTime.now(),
                ));
              }
            } catch (_) {}
          }
        }
      });
    } catch (e) {
      print("Lỗi khởi tạo UDP Listener: \$e");
    }
  }

  void stop() {
    _beaconTimer?.cancel();
    _beaconTimer = null;
    _broadcastSocket?.close();
    _broadcastSocket = null;
    _listenerSocket?.close();
    _listenerSocket = null;
  }

  void dispose() {
    stop();
    _roomDiscoveredController.close();
  }
}

class LanDiscoveredRoom {
  final String roomName;
  final String hostName;
  final String hostIp;
  final int wsPort;
  final int maxPlayers;
  DateTime lastSeen;

  LanDiscoveredRoom({
    required this.roomName,
    required this.hostName,
    required this.hostIp,
    required this.wsPort,
    required this.maxPlayers,
    required this.lastSeen,
  });

  String get connectionUrl => 'ws://\$hostIp:\$wsPort';
}
`
  },
  {
    path: 'lib/network/local_game_server.dart',
    category: 'network',
    title: 'local_game_server.dart',
    description: 'WebSocket Server chạy thật trên máy Host: bind anyIPv4, bảo vệ try/catch chống sập socket',
    code: `import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:uuid/uuid.dart';
import '../models/drawing_point.dart';
import '../models/game_models.dart';
import '../services/word_bank_service.dart';
import '../utils/vietnamese_matcher.dart';

class LocalGameServer {
  final int port;
  HttpServer? _server;
  final Map<WebSocket, Player> _clients = {};
  final List<DrawStroke> _strokes = [];

  GamePhase _phase = GamePhase.lobby;
  int _currentRound = 1;
  int _totalRounds = 3;
  int _roundDuration = 60;
  int _remainingTime = 60;
  Timer? _countdownTimer;

  int _drawerIndex = 0;
  Player? _currentDrawer;
  String _currentSecretWord = '';
  String _currentCategory = '';

  LocalGameServer({this.port = 8080});

  Future<void> startServer({
    required String hostPlayerName,
    int totalRounds = 3,
    int roundDuration = 60,
  }) async {
    _totalRounds = totalRounds;
    _roundDuration = roundDuration;
    _remainingTime = roundDuration;

    // BẮT BUỘC BIND anyIPv4 (0.0.0.0) ĐỂ TOÀN MẠNG LAN TRUY CẬP ĐƯỢC
    _server = await HttpServer.bind(InternetAddress.anyIPv4, port);
    _server!.listen((HttpRequest request) {
      if (WebSocketTransformer.isUpgradeRequest(request)) {
        WebSocketTransformer.upgrade(request).then(_handleNewClient).catchError((_) {});
      } else {
        request.response.statusCode = HttpStatus.forbidden;
        request.response.close();
      }
    });
  }

  void _handleNewClient(WebSocket socket) {
    socket.listen(
      (data) {
        try {
          final msg = jsonDecode(data as String) as Map<String, dynamic>;
          _processMessage(socket, msg);
        } catch (_) {}
      },
      onDone: () => _handleClientDisconnect(socket),
      onError: (_) => _handleClientDisconnect(socket),
    );
  }

  void _processMessage(WebSocket socket, Map<String, dynamic> msg) {
    final action = msg['action'] as String?;

    switch (action) {
      case 'JOIN':
        final player = Player(
          id: msg['playerId'] ?? const Uuid().v4(),
          name: msg['name'] ?? 'Khách',
          avatar: msg['avatar'] ?? '👤',
          isHost: msg['isHost'] ?? false,
        );
        _clients[socket] = player;
        _broadcastSystemChat("\${player.name} đã tham gia phòng!");
        _broadcastRoomState();
        break;

      case 'START_GAME':
        if (_clients[socket]?.isHost == true && _phase == GamePhase.lobby) {
          _startGame();
        }
        break;

      case 'DRAW_POINT':
        if (_clients[socket]?.id == _currentDrawer?.id) {
          final stroke = DrawStroke.fromJson(msg['stroke']);
          _strokes.add(stroke);
          _broadcast({'action': 'DRAW_POINT', 'stroke': stroke.toJson()}, excludeSocket: socket);
        }
        break;

      case 'CLEAR_CANVAS':
        if (_clients[socket]?.id == _currentDrawer?.id) {
          _strokes.clear();
          _broadcast({'action': 'CLEAR_CANVAS'});
        }
        break;

      case 'CHAT_GUESS':
        _handleChatGuess(socket, msg['text'] as String);
        break;

      case 'LEAVE_ROOM':
        _handleClientDisconnect(socket);
        break;
    }
  }

  void _handleChatGuess(WebSocket socket, String text) {
    final player = _clients[socket];
    if (player == null || text.trim().isEmpty) return;

    if (player.id == _currentDrawer?.id || player.hasGuessedCorrectly) {
      return;
    }

    final matchResult = VietnameseMatcher.checkAnswer(
      guess: text,
      targetWord: _currentSecretWord,
    );

    // 1. Đoán đúng
    if (matchResult.isCorrect && _phase == GamePhase.drawing) {
      player.hasGuessedCorrectly = true;
      final scoreGained = 100 + (_remainingTime * 5);
      player.score += scoreGained;

      if (_currentDrawer != null) _currentDrawer!.score += 35;

      _broadcast({
        'action': 'CORRECT_GUESS',
        'playerId': player.id,
        'playerName': player.name,
        'scoreGained': scoreGained,
      });

      _broadcastSystemChat("🎉 \${player.name} ĐÃ ĐOÁN ĐÚNG (+ \$scoreGained điểm)!");
      _broadcastRoomState();

      final guessers = _clients.values.where((p) => p.id != _currentDrawer?.id).toList();
      if (guessers.isNotEmpty && guessers.every((p) => p.hasGuessedCorrectly)) {
        _countdownTimer?.cancel();
        _endRound(reason: "Tất cả mọi người đều đã đoán đúng!");
      }
      return;
    }

    // 2. Đoán gần đúng
    if (matchResult.isClose && _phase == GamePhase.drawing) {
      _broadcastChatMessage(ChatMessage(
        id: const Uuid().v4(),
        senderId: player.id,
        senderName: player.name,
        text: text,
        timestamp: DateTime.now().millisecondsSinceEpoch,
      ));

      try {
        socket.add(jsonEncode({
          'action': 'CLOSE_GUESS',
          'message': matchResult.feedback ?? "Đoán gần đúng rồi!",
        }));
      } catch (_) {}
      return;
    }

    // 3. Đoán sai
    _broadcastChatMessage(ChatMessage(
      id: const Uuid().v4(),
      senderId: player.id,
      senderName: player.name,
      text: text,
      timestamp: DateTime.now().millisecondsSinceEpoch,
    ));
  }

  void _handleClientDisconnect(WebSocket socket) {
    final player = _clients.remove(socket);
    if (player == null) return;

    _broadcastSystemChat("\${player.name} đã rời khỏi phòng.");

    // Người vẽ thoát đột ngột -> Chuyển vòng an toàn, không sập app
    if (player.id == _currentDrawer?.id && _phase == GamePhase.drawing) {
      _broadcastSystemChat("⚠️ Người đang vẽ đã ngắt kết nối! Đang chuyển quyền vẽ...");
      _countdownTimer?.cancel();
      _broadcast({
        'action': 'FORCE_NEXT_ROUND',
        'reason': 'Người vẽ đã ngắt kết nối.',
      });

      Timer(const Duration(seconds: 2), () {
        if (_clients.isNotEmpty) {
          _drawerIndex++;
          _startRound();
        } else {
          _resetToLobby();
        }
      });
    } else {
      _broadcastRoomState();
    }
  }

  void _startGame() {
    _currentRound = 1;
    _drawerIndex = 0;
    for (var p in _clients.values) p.score = 0;
    _startRound();
  }

  void _startRound() {
    _phase = GamePhase.drawing;
    _strokes.clear();
    _remainingTime = _roundDuration;

    final playersList = _clients.values.toList();
    if (playersList.isEmpty) return;

    for (var p in playersList) p.hasGuessedCorrectly = false;

    _currentDrawer = playersList[_drawerIndex % playersList.length];
    final wordItem = WordBankService.getRandomWord();
    _currentSecretWord = wordItem.word;
    _currentCategory = wordItem.category;

    _broadcastRoomState();
    _broadcastSystemChat("Hiệp \$_currentRound/$_totalRounds: \${_currentDrawer!.name} bắt đầu vẽ!");

    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _remainingTime--;
      _broadcast({'action': 'TICK', 'timeRemaining': _remainingTime});

      if (_remainingTime <= 0) {
        timer.cancel();
        _endRound(reason: "Hết thời gian vẽ!");
      }
    });
  }

  void _endRound({required String reason}) {
    _countdownTimer?.cancel();
    _phase = GamePhase.roundSummary;

    _broadcast({
      'action': 'ROUND_SUMMARY',
      'secretWord': _currentSecretWord,
      'reason': reason,
      'players': _clients.values.map((p) => p.toJson()).toList(),
    });

    Timer(const Duration(seconds: 5), () {
      final playersList = _clients.values.toList();
      if (playersList.isEmpty) return;

      _drawerIndex++;
      if (_drawerIndex % playersList.length == 0) _currentRound++;

      if (_currentRound > _totalRounds) {
        _phase = GamePhase.gameOver;
        _broadcast({'action': 'GAME_OVER'});
      } else {
        _startRound();
      }
    });
  }

  void _resetToLobby() {
    _countdownTimer?.cancel();
    _phase = GamePhase.lobby;
    _strokes.clear();
    _broadcastRoomState();
  }

  void _broadcastRoomState() {
    for (final entry in _clients.entries) {
      final isDrawer = (entry.value.id == _currentDrawer?.id);
      try {
        entry.key.add(jsonEncode({
          'action': 'ROOM_STATE',
          'phase': _phase.name,
          'currentRound': _currentRound,
          'totalRounds': _totalRounds,
          'roundDuration': _roundDuration,
          'timeRemaining': _remainingTime,
          'currentDrawerId': _currentDrawer?.id,
          'currentDrawerName': _currentDrawer?.name,
          'secretWord': isDrawer ? _currentSecretWord : WordBankService.maskWord(_currentSecretWord),
          'category': _currentCategory,
          'players': _clients.values.map((p) => p.toJson()).toList(),
        }));
      } catch (_) {}
    }
  }

  void _broadcast(Map<String, dynamic> data, {WebSocket? excludeSocket}) {
    final encoded = jsonEncode(data);
    for (final socket in _clients.keys) {
      if (socket != excludeSocket) {
        try {
          socket.add(encoded);
        } catch (_) {}
      }
    }
  }

  void _broadcastSystemChat(String text) {
    _broadcastChatMessage(ChatMessage(
      id: const Uuid().v4(),
      senderId: 'SYSTEM',
      senderName: 'Hệ Thống',
      text: text,
      timestamp: DateTime.now().millisecondsSinceEpoch,
      isSystem: true,
    ));
  }

  void _broadcastChatMessage(ChatMessage message) {
    _broadcast({'action': 'CHAT_MESSAGE', 'message': message.toJson()});
  }

  Future<void> stopServer() async {
    _countdownTimer?.cancel();
    _broadcast({'action': 'ROOM_CLOSED', 'reason': 'Chủ phòng đã giải tán phòng.'});
    await Future.delayed(const Duration(milliseconds: 200));

    for (final socket in _clients.keys) {
      try {
        await socket.close();
      } catch (_) {}
    }
    _clients.clear();
    try {
      await _server?.close(force: true);
    } catch (_) {}
    _server = null;
  }
}
`
  },
  {
    path: 'lib/network/game_client.dart',
    category: 'network',
    title: 'game_client.dart',
    description: 'WebSocket Client giao tiếp với Host server, bảo vệ ngắt kết nối an toàn',
    code: `import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../models/drawing_point.dart';
import '../models/game_models.dart';

class GameClient extends ChangeNotifier {
  WebSocketChannel? _channel;
  bool _isConnected = false;
  String? _myPlayerId;

  final _roomStateController = StreamController<Map<String, dynamic>>.broadcast();
  final _newStrokeController = StreamController<DrawStroke>.broadcast();
  final _clearCanvasController = StreamController<void>.broadcast();
  final _chatMessageController = StreamController<ChatMessage>.broadcast();
  final _tickController = StreamController<int>.broadcast();
  final _correctGuessController = StreamController<Map<String, dynamic>>.broadcast();
  final _closeGuessController = StreamController<String>.broadcast();
  final _roomClosedController = StreamController<String>.broadcast();

  Stream<Map<String, dynamic>> get onRoomState => _roomStateController.stream;
  Stream<DrawStroke> get onNewStroke => _newStrokeController.stream;
  Stream<void> get onClearCanvas => _clearCanvasController.stream;
  Stream<ChatMessage> get onChatMessage => _chatMessageController.stream;
  Stream<int> get onTick => _tickController.stream;
  Stream<Map<String, dynamic>> get onCorrectGuess => _correctGuessController.stream;
  Stream<String> get onCloseGuess => _closeGuessController.stream;
  Stream<String> get onRoomClosed => _roomClosedController.stream;

  bool get isConnected => _isConnected;
  String? get myPlayerId => _myPlayerId;

  Future<bool> connect({
    required String hostUrl,
    required String playerId,
    required String playerName,
    required String avatar,
    bool isHost = false,
  }) async {
    _myPlayerId = playerId;

    try {
      _channel = WebSocketChannel.connect(Uri.parse(hostUrl));
      await _channel!.ready;
      _isConnected = true;
      notifyListeners();

      sendAction('JOIN', {
        'playerId': playerId,
        'name': playerName,
        'avatar': avatar,
        'isHost': isHost,
      });

      _channel!.stream.listen(
        _onMessageReceived,
        onDone: () => _handleDisconnect(),
        onError: (_) => _handleDisconnect(),
      );

      return true;
    } catch (_) {
      _isConnected = false;
      notifyListeners();
      return false;
    }
  }

  void _onMessageReceived(dynamic rawData) {
    try {
      final data = jsonDecode(rawData as String) as Map<String, dynamic>;
      final action = data['action'] as String?;

      switch (action) {
        case 'ROOM_STATE':
          _roomStateController.add(data);
          break;
        case 'DRAW_POINT':
          _newStrokeController.add(DrawStroke.fromJson(data['stroke']));
          break;
        case 'CLEAR_CANVAS':
          _clearCanvasController.add(null);
          break;
        case 'CHAT_MESSAGE':
          _chatMessageController.add(ChatMessage.fromJson(data['message']));
          break;
        case 'TICK':
          _tickController.add(data['timeRemaining'] as int);
          break;
        case 'CORRECT_GUESS':
          _correctGuessController.add(data);
          break;
        case 'CLOSE_GUESS':
          _closeGuessController.add(data['message'] as String);
          break;
        case 'ROOM_CLOSED':
          _roomClosedController.add(data['reason'] ?? 'Phòng đã đóng');
          disconnect();
          break;
      }
    } catch (_) {}
  }

  void sendAction(String action, [Map<String, dynamic>? payload]) {
    if (_channel != null && _isConnected) {
      try {
        _channel!.sink.add(jsonEncode({'action': action, ...?payload}));
      } catch (_) {}
    }
  }

  void sendStroke(DrawStroke stroke) => sendAction('DRAW_POINT', {'stroke': stroke.toJson()});
  void sendClearCanvas() => sendAction('CLEAR_CANVAS');
  void sendChatGuess(String text) => sendAction('CHAT_GUESS', {'text': text});
  void sendStartGame() => sendAction('START_GAME');

  void leaveRoom() {
    if (_isConnected) {
      sendAction('LEAVE_ROOM', {'playerId': _myPlayerId});
    }
    disconnect();
  }

  void _handleDisconnect() {
    _isConnected = false;
    notifyListeners();
  }

  void disconnect() {
    try {
      _channel?.sink.close();
    } catch (_) {}
    _channel = null;
    _isConnected = false;
    notifyListeners();
  }

  @override
  void dispose() {
    disconnect();
    _roomStateController.close();
    _newStrokeController.close();
    _clearCanvasController.close();
    _chatMessageController.close();
    _tickController.close();
    _correctGuessController.close();
    _closeGuessController.close();
    _roomClosedController.close();
    super.dispose();
  }
}
`
  },
  {
    path: 'lib/services/word_bank_service.dart',
    category: 'services',
    title: 'word_bank_service.dart',
    description: 'Từ điển tiếng Việt thực tế và tạo chuỗi gạch ngang ẩn chữ',
    code: `import 'dart:math';

class WordItem {
  final String word;
  final String category;

  const WordItem({required this.word, required this.category});
}

class WordBankService {
  static const List<WordItem> words = [
    WordItem(word: 'Con mèo', category: 'Động vật'),
    WordItem(word: 'Con chó', category: 'Động vật'),
    WordItem(word: 'Con voi', category: 'Động vật'),
    WordItem(word: 'Hươu cao cổ', category: 'Động vật'),
    WordItem(word: 'Cá heo', category: 'Động vật'),
    WordItem(word: 'Chim cánh cụt', category: 'Động vật'),
    WordItem(word: 'Con nhện', category: 'Động vật'),
    WordItem(word: 'Bánh mì', category: 'Ẩm thực'),
    WordItem(word: 'Phở bò', category: 'Ẩm thực'),
    WordItem(word: 'Cà phê sữa đá', category: 'Ẩm thực'),
    WordItem(word: 'Trà sữa', category: 'Ẩm thực'),
    WordItem(word: 'Kem ốc quế', category: 'Ẩm thực'),
    WordItem(word: 'Máy bay', category: 'Phương tiện'),
    WordItem(word: 'Tàu hỏa', category: 'Phương tiện'),
    WordItem(word: 'Xe đạp', category: 'Phương tiện'),
    WordItem(word: 'Chiếc ô', category: 'Đồ vật'),
    WordItem(word: 'Điện thoại', category: 'Đồ vật'),
    WordItem(word: 'Đồng hồ cát', category: 'Đồ vật'),
    WordItem(word: 'Cầu vồng', category: 'Thiên nhiên'),
    WordItem(word: 'Mặt trời', category: 'Thiên nhiên'),
    WordItem(word: 'Núi lửa', category: 'Thiên nhiên'),
  ];

  static WordItem getRandomWord() {
    final rand = Random();
    return words[rand.nextInt(words.length)];
  }

  static String maskWord(String word) {
    return word.split('').map((c) {
      if (c == ' ') return '   ';
      return '_ ';
    }).join('');
  }
}
`
  },
  {
    path: 'lib/widgets/drawing_canvas.dart',
    category: 'widgets',
    title: 'drawing_canvas.dart',
    description: 'Bảng vẽ CustomPaint & GestureDetector chuẩn hóa tỉ lệ màn hình 0.0 -> 1.0',
    code: `import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../models/drawing_point.dart';

class DrawingCanvas extends StatefulWidget {
  final bool isDrawer;
  final Color selectedColor;
  final double strokeWidth;
  final bool isEraser;
  final List<DrawStroke> strokes;
  final Function(DrawStroke stroke)? onStrokeCompleted;

  const DrawingCanvas({
    super.key,
    required this.isDrawer,
    required this.selectedColor,
    required this.strokeWidth,
    required this.isEraser,
    required this.strokes,
    this.onStrokeCompleted,
  });

  @override
  State<DrawingCanvas> createState() => _DrawingCanvasState();
}

class _DrawingCanvasState extends State<DrawingCanvas> {
  List<NormalizedPoint> _activePoints = [];
  String _activeStrokeId = '';

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final canvasSize = Size(constraints.maxWidth, constraints.maxHeight);

        return ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Container(
            color: Colors.white,
            child: GestureDetector(
              onPanStart: widget.isDrawer
                  ? (details) {
                      _activeStrokeId = const Uuid().v4();
                      setState(() {
                        _activePoints = [NormalizedPoint.fromOffset(details.localPosition, canvasSize)];
                      });
                    }
                  : null,

              onPanUpdate: widget.isDrawer
                  ? (details) {
                      setState(() {
                        _activePoints.add(NormalizedPoint.fromOffset(details.localPosition, canvasSize));
                      });
                    }
                  : null,

              onPanEnd: widget.isDrawer
                  ? (_) {
                      if (_activePoints.isNotEmpty) {
                        final stroke = DrawStroke(
                          id: _activeStrokeId,
                          points: List.from(_activePoints),
                          color: widget.isEraser ? Colors.white : widget.selectedColor,
                          strokeWidth: widget.strokeWidth,
                          isEraser: widget.isEraser,
                        );

                        widget.onStrokeCompleted?.call(stroke);
                        setState(() => _activePoints.clear());
                      }
                    }
                  : null,

              child: CustomPaint(
                size: canvasSize,
                painter: CanvasPainter(
                  strokes: widget.strokes,
                  activePoints: _activePoints,
                  activeColor: widget.isEraser ? Colors.white : widget.selectedColor,
                  activeWidth: widget.strokeWidth,
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class CanvasPainter extends CustomPainter {
  final List<DrawStroke> strokes;
  final List<NormalizedPoint> activePoints;
  final Color activeColor;
  final double activeWidth;

  CanvasPainter({
    required this.strokes,
    required this.activePoints,
    required this.activeColor,
    required this.activeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    for (final s in strokes) {
      if (s.points.isEmpty) continue;

      final paint = Paint()
        ..color = s.color
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..strokeWidth = s.strokeWidth
        ..isAntiAlias = true
        ..style = PaintingStyle.stroke;

      if (s.points.length == 1) {
        final offset = s.points.first.toOffset(size);
        canvas.drawCircle(offset, s.strokeWidth / 2, paint..style = PaintingStyle.fill);
      } else {
        final path = Path();
        final first = s.points.first.toOffset(size);
        path.moveTo(first.dx, first.dy);

        for (int i = 1; i < s.points.length; i++) {
          final pt = s.points[i].toOffset(size);
          path.lineTo(pt.dx, pt.dy);
        }
        canvas.drawPath(path, paint);
      }
    }

    if (activePoints.isNotEmpty) {
      final activePaint = Paint()
        ..color = activeColor
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..strokeWidth = activeWidth
        ..isAntiAlias = true
        ..style = PaintingStyle.stroke;

      if (activePoints.length == 1) {
        final offset = activePoints.first.toOffset(size);
        canvas.drawCircle(offset, activeWidth / 2, activePaint..style = PaintingStyle.fill);
      } else {
        final path = Path();
        final first = activePoints.first.toOffset(size);
        path.moveTo(first.dx, first.dy);

        for (int i = 1; i < activePoints.length; i++) {
          final pt = activePoints[i].toOffset(size);
          path.lineTo(pt.dx, pt.dy);
        }
        canvas.drawPath(path, activePaint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CanvasPainter oldDelegate) => true;
}
`
  },
  {
    path: 'lib/screens/room_browser_screen.dart',
    category: 'screens',
    title: 'room_browser_screen.dart',
    description: 'Màn hình duyệt phòng LAN qua UDP thật, lấy IP thật bằng NetworkInterface và fallback thủ công',
    code: `import 'dart:async';
import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../network/udp_discovery.dart';
import '../network/local_game_server.dart';
import '../network/game_client.dart';
import 'lobby_screen.dart';

class RoomBrowserScreen extends StatefulWidget {
  const RoomBrowserScreen({super.key});

  @override
  State<RoomBrowserScreen> createState() => _RoomBrowserScreenState();
}

class _RoomBrowserScreenState extends State<RoomBrowserScreen> {
  final _nameController = TextEditingController(text: 'Họa Sĩ Vui Vẻ');
  final _udpDiscovery = UdpDiscoveryService();
  final Map<String, LanDiscoveredRoom> _rooms = {};

  String? _myWifiIp;
  Timer? _pruneTimer;

  @override
  void initState() {
    super.initState();
    _fetchWifiIp();
    _startScanning();
    _pruneTimer = Timer.periodic(const Duration(seconds: 4), (_) => _pruneStaleRooms());
  }

  Future<void> _fetchWifiIp() async {
    final ip = await UdpDiscoveryService.getDeviceLanIp();
    if (mounted) {
      setState(() => _myWifiIp = ip);
    }
  }

  void _startScanning() {
    setState(() => _rooms.clear());
    _udpDiscovery.startClientDiscovery();
    _udpDiscovery.onRoomDiscovered.listen((room) {
      if (mounted) {
        setState(() {
          _rooms[room.connectionUrl] = room;
        });
      }
    });
  }

  void _pruneStaleRooms() {
    final now = DateTime.now();
    setState(() {
      _rooms.removeWhere((_, room) => now.difference(room.lastSeen).inSeconds > 6);
    });
  }

  Future<void> _showCreateRoomDialog() async {
    final roomNameController = TextEditingController(text: 'Phòng của \${_nameController.text}');

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Tạo phòng chơi mới (Host)'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: roomNameController,
              decoration: const InputDecoration(labelText: 'Tên phòng', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            Text('IP máy Host: \${_myWifiIp ?? "Đang tải..."}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Hủy')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Tạo ngay'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      final hostIp = _myWifiIp ?? await UdpDiscoveryService.getDeviceLanIp();
      final server = LocalGameServer(port: 8080);
      final rName = roomNameController.text.trim().isNotEmpty ? roomNameController.text.trim() : 'Phòng LAN';

      await server.startServer(hostPlayerName: _nameController.text.trim());
      await _udpDiscovery.startHostBroadcast(
        roomName: rName,
        hostName: _nameController.text.trim(),
        hostIp: hostIp,
        wsPort: 8080,
        maxPlayers: 8,
      );

      final client = GameClient();
      await client.connect(
        hostUrl: 'ws://127.0.0.1:8080',
        playerId: const Uuid().v4(),
        playerName: _nameController.text.trim(),
        avatar: '🎨',
        isHost: true,
      );

      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => LobbyScreen(
              client: client,
              isHost: true,
              server: server,
              udpService: _udpDiscovery,
              roomName: rName,
            ),
          ),
        ).then((_) => _startScanning());
      }
    }
  }

  Future<void> _showManualIpDialog() async {
    final ipController = TextEditingController(text: '192.168.1.');

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Kết nối IP thủ công'),
        content: TextField(
          controller: ipController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Địa chỉ IP của Host', border: OutlineInputBorder()),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Hủy')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Kết nối'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      final ip = ipController.text.trim();
      if (ip.isNotEmpty) {
        _joinRoom('ws://\$ip:8080', 'Phòng IP: \$ip');
      }
    }
  }

  Future<void> _joinRoom(String wsUrl, String roomTitle) async {
    final client = GameClient();
    final ok = await client.connect(
      hostUrl: wsUrl,
      playerId: const Uuid().v4(),
      playerName: _nameController.text.trim(),
      avatar: '🚀',
      isHost: false,
    );

    if (ok && mounted) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => LobbyScreen(
            client: client,
            isHost: false,
            roomName: roomTitle,
          ),
        ),
      ).then((_) => _startScanning());
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Không thể kết nối! Kiểm tra lại kết nối cùng Wi-Fi.')),
      );
    }
  }

  @override
  void dispose() {
    _pruneTimer?.cancel();
    _udpDiscovery.dispose();
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Draw & Guess LAN'),
        backgroundColor: Colors.indigo,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _startScanning,
          ),
          IconButton(
            icon: const Icon(Icons.settings_ethernet),
            onPressed: _showManualIpDialog,
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _nameController,
                    decoration: const InputDecoration(
                      labelText: 'Tên của bạn',
                      prefixIcon: Icon(Icons.person),
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    const Text('IP máy bạn:', style: TextStyle(fontSize: 11, color: Colors.grey)),
                    Text(_myWifiIp ?? 'Đang lấy...', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.indigo)),
                  ],
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Phòng tìm thấy (\${_rooms.length})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                TextButton(onPressed: _showManualIpDialog, child: const Text('Nhập IP thủ công')),
              ],
            ),
          ),
          Expanded(
            child: _rooms.isEmpty
                ? const Center(child: Text('Đang quét phòng trên mạng Wi-Fi...', style: TextStyle(color: Colors.grey)))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _rooms.length,
                    itemBuilder: (context, idx) {
                      final room = _rooms.values.elementAt(idx);
                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: ListTile(
                          leading: const CircleAvatar(backgroundColor: Colors.indigo, child: Icon(Icons.gamepad, color: Colors.white)),
                          title: Text(room.roomName, style: const TextStyle(fontWeight: FontWeight.bold)),
                          subtitle: Text('Chủ phòng: \${room.hostName} (\${room.hostIp})'),
                          trailing: ElevatedButton(
                            style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo, foregroundColor: Colors.white),
                            onPressed: () => _joinRoom(room.connectionUrl, room.roomName),
                            child: const Text('Tham gia'),
                          ),
                        ),
                      );
                    },
                  ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.add_circle),
                  label: const Text('TẠO PHÒNG MỚI (LÀM HOST)'),
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo, foregroundColor: Colors.white),
                  onPressed: _showCreateRoomDialog,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
`
  },
  {
    path: 'lib/screens/lobby_screen.dart',
    category: 'screens',
    title: 'lobby_screen.dart',
    description: 'Sảnh chờ thuần túy: cấu hình Host và danh sách người chơi thật kết nối qua WebSocket',
    code: `import 'package:flutter/material.dart';
import '../models/game_models.dart';
import '../network/game_client.dart';
import '../network/local_game_server.dart';
import '../network/udp_discovery.dart';
import 'game_screen.dart';

class LobbyScreen extends StatefulWidget {
  final GameClient client;
  final bool isHost;
  final LocalGameServer? server;
  final UdpDiscoveryService? udpService;
  final String roomName;

  const LobbyScreen({
    super.key,
    required this.client,
    required this.isHost,
    this.server,
    this.udpService,
    required this.roomName,
  });

  @override
  State<LobbyScreen> createState() => _LobbyScreenState();
}

class _LobbyScreenState extends State<LobbyScreen> {
  final List<Player> _players = [];
  int _selectedDuration = 60;
  int _selectedRounds = 3;

  @override
  void initState() {
    super.initState();
    _setupListeners();
  }

  void _setupListeners() {
    widget.client.onRoomState.listen((data) {
      if (!mounted) return;
      setState(() {
        final playersJson = data['players'] as List? ?? [];
        _players.clear();
        for (var p in playersJson) {
          _players.add(Player.fromJson(p));
        }

        if (data['phase'] == 'drawing') {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (_) => GameScreen(
                client: widget.client,
                isHost: widget.isHost,
                server: widget.server,
                udpService: widget.udpService,
                roomName: widget.roomName,
              ),
            ),
          );
        }
      });
    });

    widget.client.onRoomClosed.listen((reason) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(reason), backgroundColor: Colors.red));
      Navigator.popUntil(context, (route) => route.isFirst);
    });
  }

  Future<void> _handleConfirmLeave() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Rời phòng'),
        content: Text(widget.isHost ? 'Rời phòng sẽ giải tán toàn bộ phòng chơi. Bạn có chắc không?' : 'Bạn có chắc muốn rời phòng?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Ở lại')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Rời phòng'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      if (widget.isHost) {
        await widget.server?.stopServer();
        widget.udpService?.stop();
      } else {
        widget.client.leaveRoom();
      }
      if (mounted) Navigator.popUntil(context, (route) => route.isFirst);
    }
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        await _handleConfirmLeave();
        return false;
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.roomName),
          backgroundColor: Colors.indigo,
          foregroundColor: Colors.white,
          leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: _handleConfirmLeave),
          actions: [
            IconButton(icon: const Icon(Icons.exit_to_app), onPressed: _handleConfirmLeave),
          ],
        ),
        body: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (widget.isHost) ...[
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            const Text('Thời gian vẽ: '),
                            const Spacer(),
                            DropdownButton<int>(
                              value: _selectedDuration,
                              items: const [
                                DropdownMenuItem(value: 60, child: Text('60 giây')),
                                DropdownMenuItem(value: 90, child: Text('90 giây')),
                              ],
                              onChanged: (val) => setState(() => _selectedDuration = val!),
                            ),
                          ],
                        ),
                        Row(
                          children: [
                            const Text('Số hiệp: '),
                            const Spacer(),
                            DropdownButton<int>(
                              value: _selectedRounds,
                              items: const [
                                DropdownMenuItem(value: 2, child: Text('2 hiệp')),
                                DropdownMenuItem(value: 3, child: Text('3 hiệp')),
                                DropdownMenuItem(value: 5, child: Text('5 hiệp')),
                              ],
                              onChanged: (val) => setState(() => _selectedRounds = val!),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
              ],
              Text('Người chơi (\${_players.length}):', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 8),
              Expanded(
                child: ListView.builder(
                  itemCount: _players.length,
                  itemBuilder: (context, idx) {
                    final p = _players[idx];
                    return Card(
                      child: ListTile(
                        leading: CircleAvatar(child: Text(p.avatar)),
                        title: Text(p.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                        trailing: p.isHost ? const Chip(label: Text('Host')) : const Text('Sẵn sàng', style: TextStyle(color: Colors.green)),
                      ),
                    );
                  },
                ),
              ),
              if (widget.isHost)
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  onPressed: _players.isEmpty ? null : () => widget.client.sendStartGame(),
                  child: const Text('BẮT ĐẦU TRÒ CHƠI', style: TextStyle(fontWeight: FontWeight.bold)),
                )
              else
                const Center(child: Text('Đang đợi chủ phòng bấm bắt đầu...')),
            ],
          ),
        ),
      ),
    );
  }
}
`
  },
  {
    path: 'lib/screens/game_screen.dart',
    category: 'screens',
    title: 'game_screen.dart',
    description: 'Màn hình trong trận thuần túy: Canvas, Đồng hồ đếm ngược, Bảng điểm và Chat đoán chữ',
    code: `import 'package:flutter/material.dart';
import 'package:confetti/confetti.dart';
import '../models/drawing_point.dart';
import '../models/game_models.dart';
import '../network/game_client.dart';
import '../network/local_game_server.dart';
import '../network/udp_discovery.dart';
import '../widgets/drawing_canvas.dart';

class GameScreen extends StatefulWidget {
  final GameClient client;
  final bool isHost;
  final LocalGameServer? server;
  final UdpDiscoveryService? udpService;
  final String roomName;

  const GameScreen({
    super.key,
    required this.client,
    required this.isHost,
    this.server,
    this.udpService,
    required this.roomName,
  });

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  final List<DrawStroke> _strokes = [];
  final List<ChatMessage> _messages = [];
  final List<Player> _players = [];
  final TextEditingController _chatController = TextEditingController();
  final ConfettiController _confettiController = ConfettiController(duration: const Duration(seconds: 2));

  int _currentRound = 1;
  int _totalRounds = 3;
  int _timeRemaining = 60;
  String? _currentDrawerId;
  String _secretWordOrMasked = '...';
  String _categoryHint = '';

  Color _selectedColor = Colors.black;
  double _strokeWidth = 4.0;
  bool _isEraser = false;

  bool get _isMyTurnToDraw => widget.client.myPlayerId == _currentDrawerId;

  @override
  void initState() {
    super.initState();
    _setupClientListeners();
  }

  void _setupClientListeners() {
    widget.client.onRoomState.listen((data) {
      if (!mounted) return;
      setState(() {
        _currentRound = data['currentRound'] ?? 1;
        _totalRounds = data['totalRounds'] ?? 3;
        _timeRemaining = data['timeRemaining'] ?? 60;
        _currentDrawerId = data['currentDrawerId'];
        _secretWordOrMasked = data['secretWord'] ?? '';
        _categoryHint = data['category'] ?? '';

        final playersJson = data['players'] as List? ?? [];
        _players.clear();
        for (var p in playersJson) {
          _players.add(Player.fromJson(p));
        }
      });
    });

    widget.client.onNewStroke.listen((stroke) {
      if (mounted) setState(() => _strokes.add(stroke));
    });

    widget.client.onClearCanvas.listen((_) {
      if (mounted) setState(() => _strokes.clear());
    });

    widget.client.onChatMessage.listen((msg) {
      if (mounted) setState(() => _messages.add(msg));
    });

    widget.client.onTick.listen((seconds) {
      if (mounted) setState(() => _timeRemaining = seconds);
    });

    widget.client.onCorrectGuess.listen((data) {
      if (data['playerId'] == widget.client.myPlayerId) {
        _confettiController.play();
      }
    });

    widget.client.onCloseGuess.listen((feedback) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("💡 \$feedback"), backgroundColor: Colors.amber.shade800, duration: const Duration(seconds: 2)),
      );
    });

    widget.client.onRoomClosed.listen((reason) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(reason), backgroundColor: Colors.red));
      Navigator.popUntil(context, (route) => route.isFirst);
    });
  }

  Future<void> _handleConfirmLeave() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Rời trận đấu'),
        content: Text(widget.isHost ? 'Bạn là chủ phòng. Rời đi sẽ giải tán trận đấu!' : 'Bạn có chắc chắn muốn rời trận?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Ở lại')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Rời trận'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      if (widget.isHost) {
        await widget.server?.stopServer();
        widget.udpService?.stop();
      } else {
        widget.client.leaveRoom();
      }
      if (mounted) Navigator.popUntil(context, (route) => route.isFirst);
    }
  }

  void _handleSendStroke(DrawStroke stroke) {
    setState(() => _strokes.add(stroke));
    widget.client.sendStroke(stroke);
  }

  void _handleClearCanvas() {
    setState(() => _strokes.clear());
    widget.client.sendClearCanvas();
  }

  void _handleSendChat() {
    final text = _chatController.text.trim();
    if (text.isEmpty) return;
    widget.client.sendChatGuess(text);
    _chatController.clear();
  }

  @override
  void dispose() {
    _confettiController.dispose();
    _chatController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        await _handleConfirmLeave();
        return false;
      },
      child: Scaffold(
        appBar: AppBar(
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Hiệp \$_currentRound/$_totalRounds | Còn: \${_timeRemaining}s', style: const TextStyle(fontSize: 15)),
              Text(
                _isMyTurnToDraw ? "Từ khóa: \$_secretWordOrMasked" : "Đoán: \$_secretWordOrMasked (\$_categoryHint)",
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.amberAccent),
              ),
            ],
          ),
          backgroundColor: Colors.indigo,
          actions: [
            IconButton(icon: const Icon(Icons.exit_to_app), onPressed: _handleConfirmLeave),
          ],
        ),
        body: Stack(
          children: [
            Row(
              children: [
                Expanded(
                  flex: 3,
                  child: Column(
                    children: [
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.all(8.0),
                          child: DrawingCanvas(
                            isDrawer: _isMyTurnToDraw,
                            selectedColor: _selectedColor,
                            strokeWidth: _strokeWidth,
                            isEraser: _isEraser,
                            strokes: _strokes,
                            onStrokeCompleted: _handleSendStroke,
                          ),
                        ),
                      ),
                      if (_isMyTurnToDraw) _buildDrawingTools(),
                    ],
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Container(
                    color: Colors.grey.shade100,
                    child: Column(
                      children: [
                        Container(
                          height: 100,
                          padding: const EdgeInsets.all(6),
                          child: ListView.builder(
                            scrollDirection: Axis.horizontal,
                            itemCount: _players.length,
                            itemBuilder: (context, idx) {
                              final p = _players[idx];
                              return Container(
                                margin: const EdgeInsets.only(right: 6),
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(
                                  color: (p.id == _currentDrawerId) ? Colors.amber.shade100 : Colors.white,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: p.hasGuessedCorrectly ? Colors.green : Colors.grey.shade300),
                                ),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(p.avatar, style: const TextStyle(fontSize: 18)),
                                    Text(p.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                                    Text('\${p.score} đ', style: const TextStyle(color: Colors.indigo, fontSize: 11, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              );
                            },
                          ),
                        ),
                        Expanded(
                          child: ListView.builder(
                            padding: const EdgeInsets.all(8),
                            itemCount: _messages.length,
                            itemBuilder: (context, idx) {
                              final m = _messages[idx];
                              if (m.isSystem) {
                                return Center(
                                  child: Container(
                                    margin: const EdgeInsets.symmetric(vertical: 2),
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(8)),
                                    child: Text(m.text, style: const TextStyle(fontSize: 11, color: Colors.green, fontWeight: FontWeight.bold)),
                                  ),
                                );
                              }
                              return Padding(
                                padding: const EdgeInsets.symmetric(vertical: 2),
                                child: RichText(
                                  text: TextSpan(
                                    children: [
                                      TextSpan(text: "\${m.senderName}: ", style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.black87)),
                                      TextSpan(text: m.text, style: const TextStyle(color: Colors.black54)),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(8.0),
                          child: Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _chatController,
                                  enabled: !_isMyTurnToDraw,
                                  onSubmitted: (_) => _handleSendChat(),
                                  decoration: InputDecoration(
                                    hintText: _isMyTurnToDraw ? 'Bạn đang vẽ' : 'Nhập từ khóa đoán...',
                                    filled: true,
                                    fillColor: Colors.white,
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                  ),
                                ),
                              ),
                              IconButton(icon: const Icon(Icons.send, color: Colors.indigo), onPressed: _isMyTurnToDraw ? null : _handleSendChat),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            Align(
              alignment: Alignment.topCenter,
              child: ConfettiWidget(
                confettiController: _confettiController,
                blastDirectionality: BlastDirectionality.explosive,
                shouldLoop: false,
                colors: const [Colors.green, Colors.blue, Colors.pink, Colors.orange, Colors.purple],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawingTools() {
    final colors = [Colors.black, Colors.red, Colors.blue, Colors.green, Colors.amber, Colors.purple];

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          for (final c in colors)
            GestureDetector(
              onTap: () => setState(() { _selectedColor = c; _isEraser = false; }),
              child: Container(
                margin: const EdgeInsets.only(right: 8),
                width: 26,
                height: 26,
                decoration: BoxDecoration(
                  color: c,
                  shape: BoxShape.circle,
                  border: Border.all(color: _selectedColor == c && !_isEraser ? Colors.indigo : Colors.grey, width: 2),
                ),
              ),
            ),
          const Spacer(),
          IconButton(
            icon: Icon(Icons.cleaning_services, color: _isEraser ? Colors.indigo : Colors.grey),
            onPressed: () => setState(() => _isEraser = true),
          ),
          IconButton(
            icon: const Icon(Icons.delete_forever, color: Colors.red),
            onPressed: _handleClearCanvas,
          ),
        ],
      ),
    );
  }
}
`
  },
  {
    path: 'lib/main.dart',
    category: 'config',
    title: 'main.dart',
    description: 'Entry point của ứng dụng Flutter khởi động thẳng vào RoomBrowserScreen',
    code: `import 'package:flutter/material.dart';
import 'screens/room_browser_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const DrawAndGuessApp());
}

class DrawAndGuessApp extends StatelessWidget {
  const DrawAndGuessApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Draw & Guess LAN',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      ),
      home: const RoomBrowserScreen(),
    );
  }
}
`
  },
  {
    path: 'android/app/src/main/AndroidManifest.xml',
    category: 'native',
    title: 'AndroidManifest.xml',
    description: 'Quyền mạng Android: INTERNET, ACCESS_WIFI_STATE, CHANGE_WIFI_MULTICAST_STATE & usesCleartextTraffic',
    code: `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.CHANGE_WIFI_MULTICAST_STATE" />

    <application
        android:label="Draw &amp; Guess LAN"
        android:name="\${applicationName}"
        android:icon="@mipmap/ic_launcher"
        android:usesCleartextTraffic="true">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
    </application>
</manifest>
`
  },
  {
    path: 'ios/Runner/Info.plist',
    category: 'native',
    title: 'Info.plist',
    description: 'Quyền mạng iOS 14+: NSLocalNetworkUsageDescription, NSBonjourServices và NSAllowsLocalNetworking',
    code: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>Draw &amp; Guess LAN</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>$(FLUTTER_BUILD_NAME)</string>
    <key>CFBundleVersion</key>
    <string>$(FLUTTER_BUILD_NUMBER)</string>

    <!-- BẮT BUỘC TRÊN iOS 14+: Khai báo quyền quét mạng nội bộ -->
    <key>NSLocalNetworkUsageDescription</key>
    <string>Ứng dụng cần quyền quét Wi-Fi cục bộ để tìm và kết nối các phòng chơi trong cùng mạng LAN.</string>

    <!-- Khai báo Bonjour Service cho mDNS/UDP nội bộ -->
    <key>NSBonjourServices</key>
    <array>
        <string>_http._tcp</string>
        <string>_websocket._tcp</string>
    </array>

    <!-- Cho phép kết nối WebSocket không mã hóa ws:// trong mạng LAN -->
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsLocalNetworking</key>
        <true/>
    </dict>

    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>
</dict>
</plist>
`
  }
];
