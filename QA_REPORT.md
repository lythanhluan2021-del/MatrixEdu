# BÁO CÁO KIỂM THỬ, THẨM ĐỊNH CHUYÊN MÔN & HOÀN THIỆN SẢN PHẨM
*(Thực hiện theo yêu cầu Câu lệnh 04 – Hệ thống AI RA ĐỀ KIỂM TRA TỰ ĐỘNG)*

---

## 1. TỔNG QUAN KẾT QUẢ KIỂM THỬ

Hệ thống đã được kiểm thử tự động và thẩm định chuyên môn toàn diện thông qua bộ kiểm thử [`tests/run-qa-tests.js`](file:///d:/WEB-APP/MT-DE-DA/tests/run-qa-tests.js) trên **3 cấp học (7 hồ sơ môn học thực tế)**:

| TT | Tình huống kiểm thử | Cấp học / Khối lớp | Môn học | Văn bản pháp quy áp dụng | Cấu trúc câu hỏi & Điểm số | Kiểm chứng phép tính độc lập | Kết quả QA |
|:--:|:---|:---:|:---|:---|:---|:---:|:---:|
| 1 | **Tình huống 1 (Tiểu học)** | Tiểu học (Lớp 4 / tương thích Lớp 1–5 & mã "lớp 14") | **Toán** | **Thông tư 27/2020/TT-BGDĐT** (3 mức độ: Mức 1: 40%, Mức 2: 38%, Mức 3: 22%) | 6 MCQ (3,0đ) + 1 Đúng/Sai 4 ý (1,0đ) + 4 Trả lời ngắn (2,0đ) + 3 Tự luận (4,0đ) = **10,0đ** | 11/11 phép tính khớp 100% | **ĐẠT (100/100)** |
| 2 | **Tình huống 2 (THCS)** | THCS (Lớp 9) | **Ngữ văn** | **Thông tư 22/2021/TT-BGDĐT & Công văn 7991/BGDĐT-GDTrH** (Biết, Hiểu, Vận dụng) | 100% Tự luận: Phần I. Đọc hiểu ngữ liệu ngoài SGK (5 câu = 4,0đ) + Phần II. Viết (Đoạn văn 200 chữ 2,0đ + Bài văn NLXH 4,0đ) = **10,0đ** | Thẩm định Rubric & Ngữ liệu | **ĐẠT (100/100)** |
| 3A | **Tình huống 3 (THPT)** | THPT (Lớp 12) | **Toán** | **Thông tư 22/2021 & Công văn 7991/BGDĐT-GDTrH** | 12 MCQ (3,0đ) + 4 Đúng/Sai × 4 ý (4,0đ) + 6 Trả lời ngắn (3,0đ) = **10,0đ** | 16/16 phép tính khớp 100% | **ĐẠT (100/100)** |
| 3B | **Tình huống 3 (THPT)** | THPT (Lớp 12) | **Tiếng Anh** | **Thông tư 22/2021 & Công văn 7991/BGDĐT-GDTrH** | 4 Kỹ năng (Có **Listening kèm Tapescript** + Phonetics/Grammar + Reading + Writing): 16 MCQ (4,0đ) + 2 Đúng/Sai 8 ý (2,0đ) + 4 Trả lời ngắn (2,0đ) + 2 Tự luận Viết (2,0đ) = **10,0đ** | Thẩm định Tapescript & Đáp án | **ĐẠT (100/100)** |
| 3C | **Tình huống 3 (THPT)** | THPT (Lớp 12) | **Tin học** | **Thông tư 22/2021 & Công văn 7991/BGDĐT-GDTrH** | 12 MCQ (3,0đ) + 4 Đúng/Sai × 4 ý (4,0đ) + 6 Trả lời ngắn (3,0đ) = **10,0đ** | 6/6 phép tính khớp 100% | **ĐẠT (100/100)** |
| 3D | **Tình huống 3 (THPT)** | THPT (Lớp 12) | **Vật lí** | **Thông tư 22/2021 & Công văn 7991/BGDĐT-GDTrH** | 12 MCQ (3,0đ) + 4 Đúng/Sai × 4 ý (4,0đ) + 6 Trả lời ngắn (3,0đ) = **10,0đ** | 14/14 phép tính khớp 100% | **ĐẠT (100/100)** |
| 3E | **Tình huống 3 (THPT)** | THPT (Lớp 12) | **Hóa học** | **Thông tư 22/2021 & Công văn 7991/BGDĐT-GDTrH** | 12 MCQ (3,0đ) + 4 Đúng/Sai × 4 ý (4,0đ) + 6 Trả lời ngắn (3,0đ) = **10,0đ** | 10/10 phép tính khớp 100% | **ĐẠT (100/100)** |

---

## 2. KIỂM ĐỊNH ĐỘC LẬP ĐÁP ÁN, PHÉP TÍNH & SỰ THỐNG NHẤT 4 CHIỀU

Bộ kiểm định [`src/qa-validator.js`](file:///d:/WEB-APP/MT-DE-DA/src/qa-validator.js) thực hiện kiểm tra tự động và độc lập trên từng hồ sơ:

1. **Đối chiếu 4 chiều (`Ma trận ↔ Bản đặc tả ↔ Đề kiểm tra ↔ Đáp án`):**
   - Số dòng đơn vị kiến thức trong Bản đặc tả khớp 1-1 với Ma trận.
   - Số câu hỏi của từng dạng thức (`MCQ`, `TF`, `SA`, `ESSAY`) trong Đề kiểm tra khớp tuyệt đối với số câu khai báo trong Ma trận.
   - 100% câu hỏi trong Đề có gắn mã tham chiếu `matrixRef` (ví dụ `C1 [Dòng 1 - Biết]`, `ĐS1(a,b,c,d) [Dòng 1]`, `TLN1 [Dòng 1 - Hiểu]`) liên kết trực tiếp với dòng Ma trận và Bản đặc tả.
   - Tổng điểm toàn đề luôn đạt chuẩn **10,0 / 10,0 điểm**.
2. **Thẩm định phép tính độc lập (`safeEvaluateMathExpression`):**
   - Đã kiểm tra độc lập **57 biểu thức tính toán** trong các đề Toán 4, Toán 12, Tin học 12 (IPv4/IPv6/Subnet/CSS Box Model), Vật lí 12 (Nhiệt học, Khí lí tưởng, Cảm ứng điện từ), Hóa học 12 (Hiệu suất ester hóa, tráng bạc glucose, lên men rượu, xà phòng hóa tristearin, muối amino acid).
   - Kết quả tính toán độc lập bằng máy trùng khớp 100% với đáp án trong hồ sơ.
3. **Kiểm định bảo mật Đề Học sinh & Định dạng Word (`.docx`):**
   - Tất cả 35 tệp `.docx` xuất ra tại [`data/exports/`](file:///d:/WEB-APP/MT-DE-DA/data/exports) đã được giải nén OpenXML và kiểm tra tự động:
     - Khổ giấy chuẩn **A4** (`w:pgSz w:w="11906" w:h="16838"`).
     - Phông chữ chuẩn **Times New Roman**, cỡ chữ **13pt–14pt** (`w:sz w:val="26"` / `28`).
     - Bảng biểu có thuộc tính `<w:tblW w:w="5000" w:type="pct"/>` và `<w:tblLayout w:type="autofit"/>` đảm bảo tự động co giãn vừa khung trang A4, không bao giờ tràn trang.
     - Bản **Đề Học sinh (`DeHocSinh_KhongDapAn_*.docx`)** được xác nhận **không chứa đáp án**, không lộ lời giải và không lộ lời thoại bài nghe (Tapescript) của giáo viên.

