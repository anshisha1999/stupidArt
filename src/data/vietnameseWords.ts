export interface WordItem {
  word: string;
  category: string;
}

const WORDS_BY_CATEGORY: Record<string, string[]> = {
  'Động vật': [
    'Con mèo', 'Con chó', 'Con voi', 'Hươu cao cổ', 'Cá heo', 'Chim cánh cụt', 'Con sóc', 'Con nhện',
    'Con ong', 'Khủng long', 'Con gà', 'Con vịt', 'Con lợn', 'Con bò', 'Con trâu', 'Con ngựa',
    'Con dê', 'Con cừu', 'Con thỏ', 'Con chuột', 'Con hổ', 'Sư tử', 'Con khỉ', 'Con gấu',
    'Gấu trúc', 'Con cáo', 'Con sói', 'Ngựa vằn', 'Tê giác', 'Hà mã', 'Lạc đà', 'Chuột túi',
    'Con rùa', 'Con rắn', 'Cá sấu', 'Con ếch', 'Con cua', 'Con tôm', 'Bạch tuộc', 'Cá mập',
    'Cá voi', 'Sứa biển', 'Sao biển', 'Con bướm', 'Con kiến', 'Con muỗi', 'Ốc sên', 'Con cú',
    'Đại bàng', 'Con vẹt', 'Chim công', 'Hồng hạc', 'Con dơi', 'Con nhím',
  ],
  'Ẩm thực': [
    'Bánh mì', 'Phở bò', 'Cà phê sữa đá', 'Trà sữa trân châu', 'Kem ốc quế', 'Pizza', 'Trứng ốp la',
    'Củ khoai lang', 'Bánh chưng', 'Bánh xèo', 'Bún chả', 'Cơm tấm', 'Gỏi cuốn', 'Bánh bao',
    'Xôi gấc', 'Chè ba màu', 'Hamburger', 'Xúc xích', 'Mì tôm', 'Bánh kem', 'Bánh trung thu',
    'Nồi lẩu', 'Gà rán', 'Khoai tây chiên', 'Bỏng ngô', 'Kẹo mút', 'Sô cô la', 'Bánh quy',
    'Quả chuối', 'Quả táo', 'Quả dưa hấu', 'Quả dứa', 'Quả cam', 'Quả xoài', 'Quả dừa',
    'Quả nho', 'Quả dâu tây', 'Sầu riêng', 'Thanh long', 'Quả ớt', 'Cà rốt', 'Bắp ngô',
    'Cây nấm', 'Quả trứng',
  ],
  'Đồ vật': [
    'Chiếc ô', 'Điện thoại', 'Đồng hồ cát', 'Kính râm', 'Bóng bay', 'Cái kéo', 'Cái bút chì',
    'Quyển sách', 'Cái ghế', 'Cái bàn', 'Cái giường', 'Cái gối', 'Bóng đèn', 'Cây nến',
    'Chìa khóa', 'Ổ khóa', 'Cái cốc', 'Cái thìa', 'Đôi đũa', 'Con dao', 'Cái nồi', 'Cái chảo',
    'Ấm trà', 'Bàn chải đánh răng', 'Kem đánh răng', 'Cái lược', 'Cái gương', 'Máy giặt',
    'Tủ lạnh', 'Ti vi', 'Quạt điện', 'Điều hòa', 'Máy tính', 'Bàn phím', 'Con chuột máy tính',
    'Máy ảnh', 'Tai nghe', 'Cái ba lô', 'Cái ví', 'Cái túi xách', 'Cái chổi', 'Thùng rác',
    'Cái thang', 'Cái búa', 'Cái đinh', 'Cục pin', 'Phong bì', 'Món quà', 'Cái khung ảnh',
    'Cái đồng hồ báo thức', 'Cái nhiệt kế',
  ],
  'Phương tiện': [
    'Máy bay', 'Tàu hỏa', 'Thuyền buồm', 'Xe đạp', 'Xe máy', 'Ô tô', 'Xe buýt', 'Xe tải',
    'Xe cứu thương', 'Xe cứu hỏa', 'Xe cảnh sát', 'Trực thăng', 'Tàu ngầm', 'Tên lửa',
    'Khinh khí cầu', 'Xe xích lô', 'Ca nô', 'Du thuyền', 'Xe lăn', 'Ván trượt', 'Xe ủi',
    'Máy cày', 'Taxi', 'Đĩa bay',
  ],
  'Thiên nhiên': [
    'Cầu vồng', 'Núi lửa', 'Mặt trời', 'Bãi biển', 'Mặt trăng', 'Ngôi sao', 'Đám mây', 'Tia sét',
    'Bông tuyết', 'Người tuyết', 'Cơn mưa', 'Cái cây', 'Bông hoa', 'Hoa sen', 'Hoa hướng dương',
    'Cây xương rồng', 'Cây dừa', 'Lá cây', 'Ngọn núi', 'Dòng sông', 'Thác nước', 'Hòn đảo',
    'Sa mạc', 'Hang động', 'Sao chổi', 'Trái Đất', 'Ngọn lửa', 'Cơn lốc xoáy',
  ],
  'Địa điểm & Công trình': [
    'Ngọn hải đăng', 'Cối xay gió', 'Ngôi nhà', 'Trường học', 'Bệnh viện', 'Chợ', 'Siêu thị',
    'Công viên', 'Sân bay', 'Nhà ga', 'Cây cầu', 'Lâu đài', 'Kim tự tháp', 'Tháp Eiffel',
    'Chùa Một Cột', 'Sở thú', 'Rạp chiếu phim', 'Thư viện', 'Bể bơi', 'Sân bóng đá', 'Nhà thờ',
    'Bến xe', 'Cột đèn giao thông', 'Đèn lồng', 'Hàng rào', 'Giếng nước',
  ],
  'Nghề nghiệp': [
    'Bác sĩ', 'Y tá', 'Giáo viên', 'Cảnh sát', 'Lính cứu hỏa', 'Đầu bếp', 'Phi công',
    'Nông dân', 'Ngư dân', 'Thợ xây', 'Thợ cắt tóc', 'Ca sĩ', 'Họa sĩ', 'Nhiếp ảnh gia',
    'Phi hành gia', 'Thám tử', 'Ảo thuật gia', 'Chú hề', 'Người máy', 'Shipper',
  ],
  'Thể thao & Hoạt động': [
    'Bóng đá', 'Bóng rổ', 'Cầu lông', 'Bơi lội', 'Chạy bộ', 'Đá cầu', 'Nhảy dây', 'Bóng chuyền',
    'Quần vợt', 'Võ thuật', 'Cử tạ', 'Lướt sóng', 'Trượt tuyết', 'Leo núi', 'Câu cá', 'Cắm trại',
    'Thả diều', 'Đánh răng', 'Ngủ trưa', 'Nấu ăn', 'Hát karaoke', 'Chụp ảnh tự sướng', 'Đi chợ',
    'Tập yoga', 'Kéo co',
  ],
  'Trang phục & Phụ kiện': [
    'Áo dài', 'Nón lá', 'Mũ bảo hiểm', 'Đôi giày', 'Đôi dép', 'Cái váy', 'Quần jean',
    'Áo mưa', 'Cà vạt', 'Khăn quàng cổ', 'Găng tay', 'Đôi tất', 'Chiếc nhẫn', 'Vòng cổ',
    'Đồng hồ đeo tay', 'Vương miện', 'Mặt nạ', 'Khẩu trang', 'Thắt lưng', 'Bộ vest',
  ],
  'Âm nhạc & Giải trí': [
    'Cây đàn ghi ta', 'Đàn piano', 'Cái trống', 'Kèn trumpet', 'Đàn violin', 'Cây sáo', 'Micro',
    'Loa', 'Con diều', 'Con quay', 'Búp bê', 'Gấu bông', 'Xếp hình', 'Cầu trượt', 'Xích đu',
    'Bộ bài', 'Xúc xắc', 'Bàn cờ vua', 'Pháo hoa', 'Đu quay',
  ],
  'Cơ thể & Cảm xúc': [
    'Con mắt', 'Cái mũi', 'Cái miệng', 'Cái tai', 'Bàn tay', 'Bàn chân', 'Trái tim', 'Bộ não',
    'Cái răng', 'Mái tóc', 'Bộ râu', 'Nụ cười', 'Giọt nước mắt', 'Cái hắt xì', 'Cái ngáp',
    'Bộ xương',
  ],
  'Lễ hội & Văn hóa': [
    'Tết Nguyên Đán', 'Bao lì xì', 'Cây nêu', 'Hoa mai', 'Hoa đào', 'Mâm ngũ quả', 'Múa lân',
    'Ông già Noel', 'Cây thông Noel', 'Bí ngô Halloween', 'Đèn ông sao', 'Rước đèn',
    'Đám cưới', 'Sinh nhật', 'Tượng Nữ thần Tự do', 'Con rồng', 'Kỳ lân', 'Nàng tiên cá',
    'Ma cà rồng', 'Phù thủy',
  ],
};

export const VIETNAMESE_WORD_BANK: WordItem[] = Object.entries(WORDS_BY_CATEGORY).flatMap(
  ([category, words]) => words.map((word) => ({ word, category }))
);

export const CUSTOM_WORD_CATEGORY = 'Người vẽ tự đặt';

export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFC')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/** Validates a word typed by the drawer; returns the cleaned word or null. */
export function cleanCustomWord(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const word = input.normalize('NFC').trim().replace(/\s+/g, ' ');
  if (word.length < 2 || word.length > 30) return null;
  if (!/^[\p{L}\p{M} ]+$/u.test(word)) return null;
  return word;
}

export function removeVietnameseAccents(text: string): string {
  return normalizeText(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
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
}

export function checkAnswer(guess: string, targetWord: string): GuessCheckResult {
  const normGuess = normalizeText(guess);
  const normTarget = normalizeText(targetWord);

  // Đúng: chỉ khi khớp chính xác (có dấu) sau khi chuyển về chữ thường.
  // "chó", "chó con", "con cho" đều KHÔNG đúng với "con chó".
  if (normGuess === normTarget) {
    return { isCorrect: true, isClose: false };
  }

  // Gần đúng: bỏ dấu đi thì trùng khớp hoặc chỉ lệch 1 ký tự (với từ khóa >= 3 ký tự).
  const plainGuess = removeVietnameseAccents(normGuess);
  const plainTarget = removeVietnameseAccents(normTarget);
  if (plainGuess === plainTarget || (plainTarget.length >= 3 && calculateLevenshtein(plainGuess, plainTarget) <= 1)) {
    return { isCorrect: false, isClose: true };
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
