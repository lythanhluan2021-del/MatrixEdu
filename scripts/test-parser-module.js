const { parseTextAnswerKey, parseAnyAnswerKeyFile } = require('../src/answer-key-parser');

// Test 1: Bảng CSV
const csv = `Câu,101,102,103,104
1,A,B,C,D
2,B,C,D,A
3,C,D,A,B
4,D,A,B,C`;

const res1 = parseTextAnswerKey(csv);
console.log('Test 1 (CSV Matrix): Codes =', Object.keys(res1), '101 Answers =', res1['101'].part1);

// Test 2: Tin nhắn Zalo thực tế
const zaloText = `
ĐÁP ÁN MÔN TOÁN 12 - THI GIỮA KỲ 1
Mã đề 101:
1.A 2.B 3.C 4.D 5.B 6.C 7.A 8.D 9.C 10.B
Phần II:
Câu 1: a-Đ, b-S, c-Đ, d-S
Câu 2: a-S, b-Đ, c-S, d-Đ

Mã đề 102:
1.B 2.C 3.D 4.A 5.C 6.D 7.B 8.A 9.D 10.C
Phần II:
Câu 1: a-S, b-Đ, c-S, d-Đ
Câu 2: a-Đ, b-S, c-Đ, d-S
`;

const res2 = parseTextAnswerKey(zaloText);
console.log('Test 2 (Zalo Text): Codes =', Object.keys(res2));
console.log('101 Part 1 count:', res2['101'].part1.length, 'Answers:', res2['101'].part1);
console.log('101 Part 2:', res2['101'].part2);
console.log('102 Part 2:', res2['102'].part2);

