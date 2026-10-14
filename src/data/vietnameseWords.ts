export interface WordItem {
  word: string;
  category: string;
  hint: string;
  difficulty: 'dễ' | 'vừa' | 'khó';
}

export const VIETNAMESE_WORD_BANK: WordItem[] = [
  // Động vật
  { word: 'Con mèo', category: 'Động vật', hint: 'Kêu meo meo, thích bắt chuột', difficulty: 'dễ' },
  { word: 'Con chó', category: 'Động vật', hint: 'Bạn thân của con người, giữ nhà', difficulty: 'dễ' },
  { word: 'Con voi', category: 'Động vật', hint: 'Có vòi dài và đôi ngà trắng', difficulty: 'dễ' },
  { word: 'Hươu cao cổ', category: 'Động vật', hint: 'Cổ rất dài, ăn lá trên ngọn cây', difficulty: 'vừa' },
  { word: 'Cá heo', category: 'Động vật', hint: 'Động vật biển thông minh, biết biểu diễn', difficulty: 'vừa' },
  { word: 'Chim cánh cụt', category: 'Động vật', hint: 'Sống ở Nam Cực, không biết bay', difficulty: 'vừa' },
  { word: 'Con sóc', category: 'Động vật', hint: 'Thích ăn hạt dẻ, đuôi xù', difficulty: 'dễ' },
  { word: 'Con nhện', category: 'Động vật', hint: 'Giăng tơ bắt mồi, có 8 chân', difficulty: 'dễ' },
  { word: 'Con ong', category: 'Động vật', hint: 'Hút mật hoa, chăm chỉ làm việc', difficulty: 'dễ' },
  { word: 'Khủng long', category: 'Động vật', hint: 'Sinh vật thời tiền sử đã tuyệt chủng', difficulty: 'vừa' },

  // Đồ ăn & Đồ uống
  { word: 'Bánh mì', category: 'Ẩm thực', hint: 'Món ăn đường phố nổi tiếng Việt Nam', difficulty: 'dễ' },
  { word: 'Phở bò', category: 'Ẩm thực', hint: 'Món nước truyền thống với bánh phở và thịt bò', difficulty: 'dễ' },
  { word: 'Cà phê sữa đá', category: 'Ẩm thực', hint: 'Đồ uống phổ biến buổi sáng ở Sài Gòn', difficulty: 'vừa' },
  { word: 'Trà sữa trân châu', category: 'Ẩm thực', hint: 'Món khoái khẩu của giới trẻ có viên trân châu', difficulty: 'vừa' },
  { word: 'Kem ốc quế', category: 'Ẩm thực', hint: 'Mát lạnh, đựng trong bánh quế giòn', difficulty: 'dễ' },
  { word: 'Pizza', category: 'Ẩm thực', hint: 'Bánh tròn nướng phủ phô mai kiểu Ý', difficulty: 'dễ' },
  { word: 'Trứng ốp la', category: 'Ẩm thực', hint: 'Món ăn sáng chiên trứng lòng đào', difficulty: 'dễ' },
  { word: 'Củ khoai lang', category: 'Ẩm thực', hint: 'Có thể luộc, nướng thơm lừng vào mùa đông', difficulty: 'dễ' },

  // Đồ vật & Thiết bị
  { word: 'Chiếc ô', category: 'Đồ vật', hint: 'Dùng che nắng và che mưa', difficulty: 'dễ' },
  { word: 'Điện thoại', category: 'Đồ vật', hint: 'Dùng để nghe gọi, nhắn tin, lướt mạng', difficulty: 'dễ' },
  { word: 'Máy bay', category: 'Phương tiện', hint: 'Bay trên bầu trời, chở khách liên lục địa', difficulty: 'dễ' },
  { word: 'Tàu hỏa', category: 'Phương tiện', hint: 'Chạy trên đường ray xình xịch', difficulty: 'dễ' },
  { word: 'Thuyền buồm', category: 'Phương tiện', hint: 'Lướt sóng nhờ sức gió thổi vào cánh buồm', difficulty: 'vừa' },
  { word: 'Xe đạp', category: 'Phương tiện', hint: 'Phương tiện 2 bánh dùng bàn đạp', difficulty: 'dễ' },
  { word: 'Đồng hồ cát', category: 'Đồ vật', hint: 'Đo thời gian bằng dòng cát chảy', difficulty: 'vừa' },
  { word: 'Cây đàn ghi ta', category: 'Đồ vật', hint: 'Nhạc cụ dây gảy bằng tay', difficulty: 'vừa' },
  { word: 'Kính râm', category: 'Đồ vật', hint: 'Đeo để bảo vệ mắt khỏi ánh nắng gắt', difficulty: 'dễ' },
  { word: 'Bóng bay', category: 'Đồ vật', hint: 'Bơm khí heli bay lơ lửng, nhiều màu', difficulty: 'dễ' },

  // Thiên nhiên & Cảnh quan
  { word: 'Cầu vồng', category: 'Thiên nhiên', hint: 'Bảy sắc xuất hiện sau cơn mưa', difficulty: 'dễ' },
  { word: 'Núi lửa', category: 'Thiên nhiên', hint: 'Phun trào nham thạch đỏ rực', difficulty: 'vừa' },
  { word: 'Mặt trời', category: 'Thiên nhiên', hint: 'Chiếu sáng ban ngày, toả nhiệt', difficulty: 'dễ' },
  { word: 'Bãi biển', category: 'Thiên nhiên', hint: 'Có cát trắng, hàng dừa và sóng vỗ', difficulty: 'vừa' },
  { word: 'Ngọn hải đăng', category: 'Kiến trúc', hint: 'Tháp đèn rọi sáng dẫn đường cho tàu thuyền ban đêm', difficulty: 'khó' },
  { word: 'Cối xay gió', category: 'Kiến trúc', hint: 'Cánh quạt khổng lồ quay đón gió ở Hà Lan', difficulty: 'khó' }
];

export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .normalize('NFC')
    .replace(/\s+/g, ' ');
}

export function removeVietnameseAccents(text: string): string {
  let result = normalizeText(text);
  const patterns: [RegExp, string][] = [
    [/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a'],
    [/[èéẹẻẽêềếệểễ]/g, 'e'],
    [/[ìíịỉĩ]/g, 'i'],
    [/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o'],
    [/[ùúụủũưừứựửữ]/g, 'u'],
    [/[ỳýỵỷỹ]/g, 'y'],
    [/đ/g, 'd'],
    [/[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ]/g, 'A'],
    [/[ÈÉẸẺẼÊỀẾỆỂỄ]/g, 'E'],
    [/[ÌÍỊỈĨ]/g, 'I'],
    [/[ÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]/g, 'O'],
    [/[ÙÚỤỦŨƯỪỨỰỬỮ]/g, 'U'],
    [/[ỲÝỴỶỸ]/g, 'Y'],
    [/Đ/g, 'D'],
  ];

  for (const [pattern, replacement] of patterns) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function calculateLevenshtein(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

export interface GuessCheckResult {
  isCorrect: boolean;
  isClose: boolean;
  feedback?: string;
}

export function checkAnswer(guess: string, targetWord: string): GuessCheckResult {
  const normGuess = normalizeText(guess);
  const normTarget = normalizeText(targetWord);

  // 1. So khớp chính xác có dấu
  if (normGuess === normTarget) {
    return { isCorrect: true, isClose: false };
  }

  // 2. So khớp chính xác không dấu
  const unaccentedGuess = removeVietnameseAccents(normGuess);
  const unaccentedTarget = removeVietnameseAccents(normTarget);

  if (unaccentedGuess === unaccentedTarget) {
    return { isCorrect: true, isClose: false };
  }

  // 3. So khớp gần đúng (Levenshtein Distance <= 1 trên chuỗi không dấu)
  // Chỉ áp dụng khi từ khóa có độ dài >= 3 ký tự để tránh báo nhầm từ 1-2 ký tự
  if (unaccentedTarget.length >= 3) {
    const dist = calculateLevenshtein(unaccentedGuess, unaccentedTarget);
    if (dist === 1) {
      return { isCorrect: false, isClose: true, feedback: 'Đoán gần đúng rồi!' };
    }
  }

  return { isCorrect: false, isClose: false };
}

export function generateMaskedWord(word: string): string {
  const chars = word.split('');
  return chars
    .map((c) => {
      if (c === ' ') return '  ';
      return '_ ';
    })
    .join('');
}
