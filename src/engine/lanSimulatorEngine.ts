import {
  Player,
  RoomState,
  DrawStroke,
  ChatMessage,
  NetworkPacket,
  DiscoveredRoom,
  NormalizedPoint,
} from '../types/game';
import {
  VIETNAMESE_WORD_BANK,
  WordItem,
  checkAnswer,
  generateMaskedWord,
} from '../data/vietnameseWords';

export class LanSimulatorEngine {
  private roomState: RoomState;
  private packets: NetworkPacket[] = [];
  private packetListeners: Array<(packet: NetworkPacket) => void> = [];
  private stateListeners: Array<(state: RoomState) => void> = [];
  private chatListeners: Array<(chat: ChatMessage) => void> = [];
  private correctGuessListeners: Array<(playerId: string, word: string) => void> = [];
  private roomClosedListeners: Array<(reason: string) => void> = [];

  // Simulated LAN rooms in the same Wi-Fi subnet
  private discoveredRooms: DiscoveredRoom[] = [];
  private discoveredRoomsListeners: Array<(rooms: DiscoveredRoom[]) => void> = [];

  private timerInterval: any = null;
  private udpInterval: any = null;
  private botInterval: any = null;
  private currentWordItem: WordItem | null = null;
  private drawerIndex = 0;

  constructor() {
    this.roomState = {
      roomId: 'room_lan_001',
      settings: {
        roomName: 'Phòng Chiến Hữu (LAN)',
        port: 8080,
        hostIp: '192.168.1.105',
        totalRounds: 3,
        roundDurationSeconds: 60,
        maxPlayers: 6,
      },
      phase: 'LOBBY',
      currentRound: 1,
      totalRounds: 3,
      currentDrawerId: 'player_host',
      secretWord: '',
      maskedWord: '',
      category: '',
      timeRemaining: 60,
      players: [
        {
          id: 'player_host',
          name: 'Họa Sĩ Host (Bạn)',
          avatar: '🎨',
          isHost: true,
          score: 0,
          hasGuessedCorrectly: false,
          isConnected: true,
          pingMs: 1,
        },
        {
          id: 'player_client_1',
          name: 'Bé Thỏ 🐰',
          avatar: '🐰',
          isHost: false,
          score: 0,
          hasGuessedCorrectly: false,
          isConnected: true,
          pingMs: 4,
        },
        {
          id: 'player_client_2',
          name: 'Gấu Trúc 🐼',
          avatar: '🐼',
          isHost: false,
          score: 0,
          hasGuessedCorrectly: false,
          isConnected: true,
          pingMs: 6,
        },
      ],
      strokes: [],
      roundPointsGained: {},
    };

    this.initMockDiscoveredRooms();
    this.startUdpBroadcast();
  }

  private initMockDiscoveredRooms() {
    this.discoveredRooms = [
      {
        roomName: 'Văn Phòng Tầng 3',
        hostName: 'Minh Tuấn 💻',
        hostIp: '192.168.1.102',
        port: 8080,
        playerCount: 4,
        maxPlayers: 8,
        phase: 'LOBBY',
        lastSeen: Date.now(),
      },
      {
        roomName: 'Trà Sữa Game Đêm',
        hostName: 'Bảo Anh 🧋',
        hostIp: '192.168.1.145',
        port: 8080,
        playerCount: 3,
        maxPlayers: 6,
        phase: 'DRAWING',
        lastSeen: Date.now(),
      },
    ];
  }

  public getDiscoveredRooms(): DiscoveredRoom[] {
    // Include current room if running as host
    const currentAsDiscovered: DiscoveredRoom = {
      roomName: this.roomState.settings.roomName,
      hostName: this.roomState.players.find((p) => p.isHost)?.name || 'Chủ phòng',
      hostIp: this.roomState.settings.hostIp,
      port: this.roomState.settings.port,
      playerCount: this.roomState.players.length,
      maxPlayers: this.roomState.settings.maxPlayers,
      phase: this.roomState.phase,
      lastSeen: Date.now(),
    };

    return [currentAsDiscovered, ...this.discoveredRooms];
  }

  public subscribeDiscoveredRooms(listener: (rooms: DiscoveredRoom[]) => void): () => void {
    this.discoveredRoomsListeners.push(listener);
    listener(this.getDiscoveredRooms());
    return () => {
      this.discoveredRoomsListeners = this.discoveredRoomsListeners.filter((l) => l !== listener);
    };
  }

  private notifyDiscoveredRooms() {
    const rooms = this.getDiscoveredRooms();
    this.discoveredRoomsListeners.forEach((fn) => fn(rooms));
  }

  public getState(): RoomState {
    return JSON.parse(JSON.stringify(this.roomState));
  }

  public getPackets(): NetworkPacket[] {
    return [...this.packets];
  }

  public subscribeState(listener: (state: RoomState) => void): () => void {
    this.stateListeners.push(listener);
    listener(this.getState());
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== listener);
    };
  }

  public subscribePackets(listener: (packet: NetworkPacket) => void): () => void {
    this.packetListeners.push(listener);
    return () => {
      this.packetListeners = this.packetListeners.filter((l) => l !== listener);
    };
  }

  public subscribeChat(listener: (chat: ChatMessage) => void): () => void {
    this.chatListeners.push(listener);
    return () => {
      this.chatListeners = this.chatListeners.filter((l) => l !== listener);
    };
  }

  public subscribeCorrectGuess(listener: (playerId: string, word: string) => void): () => void {
    this.correctGuessListeners.push(listener);
    return () => {
      this.correctGuessListeners = this.correctGuessListeners.filter((l) => l !== listener);
    };
  }

  public subscribeRoomClosed(listener: (reason: string) => void): () => void {
    this.roomClosedListeners.push(listener);
    return () => {
      this.roomClosedListeners = this.roomClosedListeners.filter((l) => l !== listener);
    };
  }

  private notifyState() {
    const stateCopy = this.getState();
    this.stateListeners.forEach((fn) => fn(stateCopy));
    this.notifyDiscoveredRooms();
  }

  private logPacket(
    protocol: 'UDP_BROADCAST' | 'WEBSOCKET',
    direction: 'INCOMING' | 'OUTGOING' | 'SERVER_BROADCAST',
    action: string,
    sender: string,
    payload: any
  ) {
    const rawStr = JSON.stringify(payload);
    const packet: NetworkPacket = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      protocol,
      direction,
      action,
      sender,
      payload,
      byteSize: rawStr.length + 42,
    };

    this.packets.unshift(packet);
    if (this.packets.length > 80) {
      this.packets.pop();
    }
    this.packetListeners.forEach((fn) => fn(packet));
  }

  private startUdpBroadcast() {
    if (this.udpInterval) clearInterval(this.udpInterval);
    this.udpInterval = setInterval(() => {
      this.logPacket(
        'UDP_BROADCAST',
        'OUTGOING',
        'ROOM_ANNOUNCE',
        '255.255.255.255:8888',
        {
          header: 'DRAW_GUESS_ROOM_ANNOUNCE',
          roomName: this.roomState.settings.roomName,
          hostIp: this.roomState.settings.hostIp,
          port: this.roomState.settings.port,
          players: this.roomState.players.length,
          maxPlayers: this.roomState.settings.maxPlayers,
          phase: this.roomState.phase,
        }
      );
    }, 3500);
  }

  public createNewRoom(roomName: string, hostName = 'Họa Sĩ Host (Bạn)') {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.botInterval) clearInterval(this.botInterval);

    this.roomState = {
      roomId: 'room_' + Math.random().toString(36).substring(2, 8),
      settings: {
        roomName: roomName.trim() || 'Phòng Mới Tạo',
        port: 8080,
        hostIp: '192.168.1.105',
        totalRounds: 3,
        roundDurationSeconds: 60,
        maxPlayers: 8,
      },
      phase: 'LOBBY',
      currentRound: 1,
      totalRounds: 3,
      currentDrawerId: 'player_host',
      secretWord: '',
      maskedWord: '',
      category: '',
      timeRemaining: 60,
      players: [
        {
          id: 'player_host',
          name: hostName,
          avatar: '🎨',
          isHost: true,
          score: 0,
          hasGuessedCorrectly: false,
          isConnected: true,
          pingMs: 1,
        },
      ],
      strokes: [],
      roundPointsGained: {},
    };

    this.logPacket('WEBSOCKET', 'SERVER_BROADCAST', 'CREATE_ROOM', 'HostServer', {
      roomName: this.roomState.settings.roomName,
      port: 8080,
    });

    this.sendSystemChat(`Đã tạo phòng mới: "${this.roomState.settings.roomName}". Máy chủ đang phát UDP Broadcast trên cổng 8888.`);
    this.notifyState();
  }

  public connectToRoom(ip: string, port = 8080, playerName = 'Người chơi mới') {
    this.logPacket('WEBSOCKET', 'OUTGOING', 'JOIN', playerName, {
      target: `ws://${ip}:${port}`,
    });

    this.addPlayer(playerName, '🚀');
  }

  public setRoomSettings(settings: Partial<typeof this.roomState.settings>) {
    this.roomState.settings = { ...this.roomState.settings, ...settings };
    this.roomState.totalRounds = this.roomState.settings.totalRounds;
    this.notifyState();
  }

  public addPlayer(name: string, avatar = '👤'): Player {
    const newId = 'player_' + Math.random().toString(36).substring(2, 7);
    const newPlayer: Player = {
      id: newId,
      name,
      avatar,
      isHost: false,
      score: 0,
      hasGuessedCorrectly: false,
      isConnected: true,
      pingMs: Math.floor(Math.random() * 8) + 3,
    };
    this.roomState.players.push(newPlayer);
    this.logPacket('WEBSOCKET', 'INCOMING', 'JOIN', newPlayer.name, newPlayer);
    this.sendSystemChat(`${newPlayer.name} đã kết nối vào phòng LAN!`);
    this.notifyState();
    return newPlayer;
  }

  // Handle player leaving room (Client or Host)
  public leaveRoom(playerId: string) {
    const player = this.roomState.players.find((p) => p.id === playerId);
    if (!player) return;

    if (player.isHost) {
      // Host leaves -> Room closed for everyone
      this.logPacket('WEBSOCKET', 'SERVER_BROADCAST', 'ROOM_CLOSED', 'HostServer', {
        reason: 'Chủ phòng đã giải tán phòng.',
      });
      this.sendSystemChat('⚠️ CHỦ PHÒNG ĐÃ RỜI ĐI. Phòng chơi đã giải tán!');
      this.roomClosedListeners.forEach((fn) => fn('Chủ phòng đã giải tán phòng'));

      if (this.timerInterval) clearInterval(this.timerInterval);
      if (this.botInterval) clearInterval(this.botInterval);

      this.roomState.phase = 'LOBBY';
      this.roomState.players = [];
      this.roomState.strokes = [];
      this.notifyState();
      return;
    }

    // Client leaves
    this.logPacket('WEBSOCKET', 'INCOMING', 'LEAVE_ROOM', player.name, {
      playerId: player.id,
    });

    const wasDrawer = this.roomState.currentDrawerId === player.id;
    this.roomState.players = this.roomState.players.filter((p) => p.id !== playerId);
    this.sendSystemChat(`${player.name} đã rời phòng.`);

    // If the disconnecting client was the active drawer -> FORCE NEXT ROUND!
    if (wasDrawer && this.roomState.phase === 'DRAWING') {
      this.logPacket('WEBSOCKET', 'SERVER_BROADCAST', 'FORCE_NEXT_ROUND', 'HostServer', {
        reason: 'Người vẽ đã ngắt kết nối.',
      });
      this.sendSystemChat('⚠️ Người đang vẽ đã thoát! Tự động chuyển quyền vẽ sang người tiếp theo...');

      if (this.timerInterval) clearInterval(this.timerInterval);
      if (this.botInterval) clearInterval(this.botInterval);

      setTimeout(() => {
        if (this.roomState.players.length > 0) {
          this.startRound();
        } else {
          this.resetToLobby();
        }
      }, 1500);
    } else {
      this.notifyState();
    }
  }

  public startGame() {
    if (this.roomState.players.length === 0) return;
    this.roomState.phase = 'DRAWING';
    this.roomState.currentRound = 1;
    this.drawerIndex = 0;
    this.roomState.players.forEach((p) => {
      p.score = 0;
      p.hasGuessedCorrectly = false;
    });

    this.logPacket('WEBSOCKET', 'SERVER_BROADCAST', 'START_GAME', 'HostServer', {
      totalRounds: this.roomState.totalRounds,
      roundDuration: this.roomState.settings.roundDurationSeconds,
    });

    this.startRound();
  }

  public startRound() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.botInterval) clearInterval(this.botInterval);

    this.roomState.phase = 'DRAWING';
    this.roomState.strokes = [];
    this.roomState.roundPointsGained = {};
    this.roomState.timeRemaining = this.roomState.settings.roundDurationSeconds;

    this.roomState.players.forEach((p) => {
      p.hasGuessedCorrectly = false;
    });

    if (this.roomState.players.length === 0) return;

    // Pick drawer
    const drawer = this.roomState.players[this.drawerIndex % this.roomState.players.length];
    this.roomState.currentDrawerId = drawer.id;

    // Pick word
    const wordItem =
      VIETNAMESE_WORD_BANK[Math.floor(Math.random() * VIETNAMESE_WORD_BANK.length)];
    this.currentWordItem = wordItem;
    this.roomState.secretWord = wordItem.word;
    this.roomState.category = wordItem.category;
    this.roomState.maskedWord = generateMaskedWord(wordItem.word);

    this.sendSystemChat(
      `--- Hiệp ${this.roomState.currentRound}/${this.roomState.totalRounds}: ${drawer.name} bắt đầu vẽ! ---`
    );

    this.logPacket('WEBSOCKET', 'SERVER_BROADCAST', 'ROOM_STATE', 'HostServer', {
      phase: 'DRAWING',
      currentDrawer: drawer.name,
      category: wordItem.category,
      wordLength: wordItem.word.length,
    });

    this.notifyState();

    // Start countdown
    this.timerInterval = setInterval(() => {
      if (this.roomState.timeRemaining > 0) {
        this.roomState.timeRemaining--;

        if (this.roomState.timeRemaining === Math.floor(this.roomState.settings.roundDurationSeconds / 2)) {
          this.sendSystemChat(`💡 Gợi ý chủ đề: ${wordItem.hint}`);
        }

        this.notifyState();
      } else {
        clearInterval(this.timerInterval);
        this.endRound('Hết thời gian!');
      }
    }, 1000);

    this.startBotGuesses();
  }

  private startBotGuesses() {
    const bots = this.roomState.players.filter(
      (p) => p.id !== 'player_host' && p.id !== this.roomState.currentDrawerId
    );
    if (bots.length === 0) return;

    let botIndex = 0;
    this.botInterval = setInterval(() => {
      if (this.roomState.phase !== 'DRAWING' || !this.currentWordItem) return;
      const activeBots = bots.filter((b) => !b.hasGuessedCorrectly);
      if (activeBots.length === 0) return;

      const bot = activeBots[botIndex % activeBots.length];
      botIndex++;

      const shouldGuessCorrectly =
        this.roomState.timeRemaining < this.roomState.settings.roundDurationSeconds - 12 &&
        Math.random() > 0.45;

      if (shouldGuessCorrectly) {
        this.submitGuess(bot.id, this.currentWordItem.word);
      } else {
        const dummyGuesses = [
          'con gì thế?',
          'trông quen quen',
          'bánh mì hả?',
          'cây bút chì?',
        ];
        const randomGuess = dummyGuesses[Math.floor(Math.random() * dummyGuesses.length)];
        this.submitGuess(bot.id, randomGuess);
      }
    }, 9000);
  }

  public endRound(reason: string) {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.botInterval) clearInterval(this.botInterval);

    this.roomState.phase = 'ROUND_SUMMARY';
    this.sendSystemChat(
      `🏁 ${reason} Từ khóa chính xác là: "${this.roomState.secretWord}".`
    );

    this.logPacket('WEBSOCKET', 'SERVER_BROADCAST', 'ROUND_SUMMARY', 'HostServer', {
      word: this.roomState.secretWord,
      reason,
      scores: this.roomState.players.map((p) => ({ name: p.name, score: p.score })),
    });

    this.notifyState();

    setTimeout(() => {
      this.drawerIndex++;
      if (this.drawerIndex % this.roomState.players.length === 0) {
        this.roomState.currentRound++;
      }

      if (this.roomState.currentRound > this.roomState.totalRounds) {
        this.endGame();
      } else {
        this.startRound();
      }
    }, 4500);
  }

  public endGame() {
    this.roomState.phase = 'GAME_OVER';
    const sorted = [...this.roomState.players].sort((a, b) => b.score - a.score);
    const winner = sorted[0];

    this.sendSystemChat(`🏆 TRÒ CHƠI KẾT THÚC! Chúc mừng ${winner?.name} đã giành chiến thắng!`);
    this.logPacket('WEBSOCKET', 'SERVER_BROADCAST', 'GAME_OVER', 'HostServer', {
      winner: winner?.name,
      leaderboard: sorted,
    });
    this.notifyState();
  }

  public resetToLobby() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.botInterval) clearInterval(this.botInterval);
    this.roomState.phase = 'LOBBY';
    this.roomState.strokes = [];
    this.roomState.currentRound = 1;
    this.roomState.players.forEach((p) => {
      p.score = 0;
      p.hasGuessedCorrectly = false;
    });
    this.sendSystemChat('Đã quay về phòng chờ (Lobby). Sẵn sàng bắt đầu ván mới!');
    this.notifyState();
  }

  public addStroke(stroke: DrawStroke, senderId: string) {
    if (this.roomState.phase !== 'DRAWING') return;
    if (senderId !== this.roomState.currentDrawerId) return;

    this.roomState.strokes.push(stroke);
    this.logPacket('WEBSOCKET', 'OUTGOING', 'DRAW_POINT', senderId, {
      strokeId: stroke.id,
      pointsCount: stroke.points.length,
      color: stroke.color,
      strokeWidth: stroke.strokeWidth,
    });
    this.notifyState();
  }

  public clearCanvas(senderId: string) {
    if (senderId !== this.roomState.currentDrawerId) return;
    this.roomState.strokes = [];
    this.logPacket('WEBSOCKET', 'OUTGOING', 'CLEAR_CANVAS', senderId, {});
    this.notifyState();
  }

  public submitGuess(playerId: string, text: string) {
    const player = this.roomState.players.find((p) => p.id === playerId);
    if (!player || !text.trim()) return;

    const isDrawer = playerId === this.roomState.currentDrawerId;
    const isAlreadyGuessed = player.hasGuessedCorrectly;

    // Use Host-side 2-layer and Levenshtein matcher!
    const matchResult = this.currentWordItem
      ? checkAnswer(text, this.currentWordItem.word)
      : { isCorrect: false, isClose: false };

    // Log packet
    this.logPacket('WEBSOCKET', 'INCOMING', 'CHAT_GUESS', player.name, {
      text,
      isDrawer,
      isCorrect: matchResult.isCorrect,
      isClose: matchResult.isClose,
    });

    if (isDrawer) {
      this.broadcastChat({
        id: Math.random().toString(36).substring(2, 9),
        senderId: player.id,
        senderName: player.name,
        text,
        timestamp: Date.now(),
        type: 'chat',
      });
      return;
    }

    if (isAlreadyGuessed) {
      // Guess already submitted correctly, mask to avoid spoilers
      this.broadcastChat({
        id: Math.random().toString(36).substring(2, 9),
        senderId: player.id,
        senderName: player.name,
        text: '*** (đã đoán đúng)',
        timestamp: Date.now(),
        type: 'chat',
      });
      return;
    }

    // 1. NẾU ĐOÁN ĐÚNG:
    // KHÔNG broadcast nội dung tin nhắn đó lên chat công cộng để tránh lộ bài!
    // Gửi event CORRECT_GUESS kèm playerId, tính điểm dựa theo thời gian còn lại, khóa quyền chat đoán.
    if (matchResult.isCorrect && this.roomState.phase === 'DRAWING') {
      player.hasGuessedCorrectly = true;
      const scoreGain = 100 + this.roomState.timeRemaining * 5;
      player.score += scoreGain;
      this.roomState.roundPointsGained[player.id] = scoreGain;

      // Thưởng cho người vẽ
      const drawer = this.roomState.players.find((p) => p.id === this.roomState.currentDrawerId);
      if (drawer) {
        drawer.score += 35;
      }

      this.logPacket('WEBSOCKET', 'SERVER_BROADCAST', 'CORRECT_GUESS', 'HostServer', {
        playerId: player.id,
        playerName: player.name,
        scoreGain,
        timeRemaining: this.roomState.timeRemaining,
      });

      this.broadcastChat({
        id: Math.random().toString(36).substring(2, 9),
        senderId: player.id,
        senderName: 'Hệ thống',
        text: `🎉 ${player.name} ĐÃ ĐOÁN ĐÚNG TỪ KHÓA! (+${scoreGain} điểm)`,
        timestamp: Date.now(),
        type: 'correct_guess',
      });

      this.correctGuessListeners.forEach((fn) =>
        fn(player.id, this.roomState.secretWord)
      );

      this.notifyState();

      // Kiểm tra nếu tất cả Guesser đều đã đoán đúng -> Chuyển vòng ngay lập tức!
      const guessers = this.roomState.players.filter(
        (p) => p.id !== this.roomState.currentDrawerId
      );
      const allGuessed = guessers.length > 0 && guessers.every((p) => p.hasGuessedCorrectly);
      if (allGuessed) {
        this.endRound('Tất cả người chơi đều đã đoán đúng!');
      }
      return;
    }

    // 2. NẾU ĐOÁN GẦN ĐÚNG (Levenshtein Distance <= 1):
    // Broadcast tin nhắn bình thường để mọi người cùng thấy, đồng thời gửi thông báo "Đoán gần đúng rồi!"
    if (matchResult.isClose && this.roomState.phase === 'DRAWING') {
      this.broadcastChat({
        id: Math.random().toString(36).substring(2, 9),
        senderId: player.id,
        senderName: player.name,
        text,
        timestamp: Date.now(),
        type: 'chat',
      });

      this.broadcastChat({
        id: Math.random().toString(36).substring(2, 9),
        senderId: player.id,
        senderName: 'Hệ thống',
        text: `💡 ${player.name}: Đoán gần đúng rồi! Hãy kiểm tra lại chính tả nhé!`,
        timestamp: Date.now() + 1,
        type: 'close_guess',
      });
      return;
    }

    // 3. ĐOÁN SAI BÌNH THƯỜNG:
    this.broadcastChat({
      id: Math.random().toString(36).substring(2, 9),
      senderId: player.id,
      senderName: player.name,
      text,
      timestamp: Date.now(),
      type: 'chat',
    });
  }

  public sendSystemChat(text: string) {
    this.broadcastChat({
      id: Math.random().toString(36).substring(2, 9),
      senderId: 'SYSTEM',
      senderName: 'Hệ Thống',
      text,
      timestamp: Date.now(),
      type: 'system',
    });
  }

  private broadcastChat(msg: ChatMessage) {
    this.chatListeners.forEach((fn) => fn(msg));
  }

  public destroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.udpInterval) clearInterval(this.udpInterval);
    if (this.botInterval) clearInterval(this.botInterval);
  }
}
