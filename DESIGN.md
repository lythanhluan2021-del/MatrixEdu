# BẢN THIẾT KẾ HỆ THỐNG: AI RA ĐỀ KIỂM TRA TỰ ĐỘNG
*(Phục vụ Giáo viên Tiểu học, THCS và THPT theo Chương trình GDPT 2018)*

---

## 1. TỔNG QUAN & MỤC TIÊU HỆ THỐNG

**Tên ứng dụng:** **AI RA ĐỀ KIỂM TRA TỰ ĐỘNG**  
**Đối tượng sử dụng:** Giáo viên Tiểu học (Lớp 1–5), THCS (Lớp 6–9), THPT (Lớp 10–12) trên toàn quốc.  
**Mục tiêu cốt lõi:**
1. Chuẩn hóa quy trình xây dựng hồ sơ đề kiểm tra định kỳ và thường xuyên theo đúng văn bản pháp규 của Bộ GD&ĐT:
   - **Cấp Tiểu học:** Áp dụng **Thông tư 27/2020/TT-BGDĐT** (3 mức độ đánh giá: *Mức 1 – Nhận biết*, *Mức 2 – Kết nối/Thông hiểu*, *Mức 3 – Vận dụng*).
   - **Cấp THCS & THPT:** Áp dụng **Thông tư 22/2021/TT-BGDĐT** và **Công văn 7991/BGDĐT-GDTrH** (3 mức độ nhận thức: *Biết*, *Hiểu*, *Vận dụng*; đồng thời hỗ trợ tùy chỉnh 4 mức độ *NB – TH – VD – VDC* hoặc mẫu riêng của Sở/Phòng/Nhà trường).
2. Tự động hóa nhưng **giáo viên nắm quyền kiểm soát tuyệt đối**: Mỗi bước trong chuỗi **PHÂN TÍCH TÀI LIỆU → LẬP MA TRẬN → TẠO BẢN ĐẶC TẢ → SOẠN ĐỀ → TẠO ĐÁP ÁN → XUẤT WORD** đều có vùng xem trước, chỉnh sửa trực tiếp trên bảng, kiểm tra đối soát tự động (Auto-QA) và nút xác nhận trước khi chuyển bước.
3. Cá biệt hóa cấu trúc đánh giá theo đặc thù từng môn học (Toán/KHTN có công thức & ký hiệu chuẩn; Ngữ văn có ngữ liệu đọc hiểu & hướng dẫn chấm nghị luận; Tiếng Anh có phần Nghe/Listening kèm Transcript lời thoại; Tin học/Lý/Hóa/Sinh hỗ trợ trắc nghiệm nhiều lựa chọn, Đúng/Sai chùm 4 ý a-b-c-d, Trả lời ngắn và Tự luận).
4. Bảo mật khóa API AI ở phía máy chủ (Server-side Proxy/Engine), không nhúng khóa bí mật trong HTML phía trình duyệt.

---

## 2. KIẾN TRÚC KỸ THUẬT (SYSTEM ARCHITECTURE)

```
+-----------------------------------------------------------------------------------+
|                        GIAO DIỆN NGƯỜI DÙNG (FRONTEND SPA)                        |
|  - Single-file / Modular HTML5 + CSS3 (Responsive Desktop & Mobile) + Vanilla JS  |
|  - Trình soạn thảo bảng trực tiếp (Inline Editable Data Grids)                    |
|  - Bộ dựng công thức Toán/Khoa học (KaTeX / Unicode / MathML cho Word)            |
|  - Bộ kiểm định độc lập (Client + Server QA Validator & Math Evaluator)           |
+-----------------------------------------+-----------------------------------------+
                                          | REST API (JSON / Multipart Form-Data)
                                          v
+-----------------------------------------------------------------------------------+
|                        MÁY CHỦ ỨNG DỤNG (BACKEND SERVER)                          |
|  - Quản lý cấu hình & Bảo mật API Key (Gemini / OpenAI / Anthropic / Custom LLM)  |
|  - Bộ đọc tài liệu đa định dạng: Word (.docx), PDF (.pdf), Text (.txt/.md), Ảnh   |
|  - Bộ máy AI sinh nội dung theo bước (Prompt Engineering chuẩn TT27 & CV7991)     |
|  - Bộ trộn mã đề thông minh (Hoán vị câu hỏi & đáp án, giữ nguyên cấu trúc phần)  |
|  - Bộ kết xuất Word (.docx) chuẩn A4, Times New Roman 13-14pt, bảng không tràn    |
|  - Kho lưu trữ Hồ sơ đề kiểm tra (Lưu/Mở lại/Nhân bản/Xuất JSON & DOCX)           |
+-----------------------------------------------------------------------------------+
```

---

## 3. QUY TRÌNH NGHIỆP VỤ 6 BƯỚC (WORKFLOW CHI TIẾT)

### Bước 1: Thiết lập thông tin & Phân tích tài liệu (`PHÂN TÍCH TÀI LIỆU`)
- **Thông tin hành chính & chuyên môn:**
  - Cấp học: Tiểu học | THCS | THPT.
  - Lớp: Lớp 1 → Lớp 12 (tự động lọc theo cấp học).
  - Môn học: Toán, Tiếng Việt / Ngữ văn, Tiếng Anh, Khoa học tự nhiên, Vật lí, Hóa học, Sinh học, Tin học, Lịch sử và Địa lí, Lịch sử, Địa lí, Giáo dục công dân / GDKT&PL, Công nghệ, Khoa học.
  - Bộ sách giáo khoa: *Kết nối tri thức với cuộc sống*, *Chân trời sáng tạo*, *Cánh Diều*, hoặc *Tích hợp / Tự chọn theo KHGD nhà trường*.
  - Kỳ kiểm tra: Giữa học kỳ I, Cuối học kỳ I, Giữa học kỳ II, Cuối học kỳ II, Kiểm tra thường xuyên (15 phút / 45 phút).
  - Thời lượng làm bài (phút): 15, 35, 40, 45, 60, 90, 120.
  - Số lượng mã đề cần tạo: 1 → 8 mã đề (ví dụ: 101, 102, 103, 104).
  - Quy chuẩn áp dụng: Tự động chọn *Thông tư 27/2020/TT-BGDĐT* (Tiểu học) hoặc *Thông tư 22/2021 + Công văn 7991/BGDĐT-GDTrH* (THCS/THPT), kèm ô nhập **Hướng dẫn chuyên môn / Mẫu riêng của địa phương, nhà trường**.
- **Tải tài liệu đầu vào:**
  - Hỗ trợ tải lên tệp `.docx`, `.pdf`, `.txt`, `.md`, hình ảnh (`.png`, `.jpg`) hoặc dán trực tiếp nội dung SGK, Kế hoạch giáo dục, Phạm vi kiến thức, Mẫu ma trận.
- **Kết quả phân tích:**
  - Bóc tách danh sách **Chủ đề / Chương / Bài học**, **Nội dung / Đơn vị kiến thức**, **Yêu cầu cần đạt (YCCĐ)** theo từng mức độ nhận thức và **Thời lượng / Tỷ trọng điểm dự kiến**.
  - Giáo viên có thể thêm, xóa, sửa từng đơn vị kiến thức trước khi xác nhận chuyển sang Bước 2.

### Bước 2: Lập Ma trận đề kiểm tra (`LẬP MA TRẬN`)
- **Thiết lập cấu trúc điểm & dạng thức câu hỏi:**
  - Cho phép bật/tắt và cấu hình điểm cho từng dạng câu hỏi phù hợp đặc thù môn học:
    1. **Trắc nghiệm nhiều lựa chọn (TNKQ - 4 phương án A, B, C, D):** Cấu hình số câu, điểm/câu.
    2. **Trắc nghiệm Đúng - Sai (TN Đúng/Sai - mỗi câu gồm 4 ý a, b, c, d):** Cấu hình số câu lớn (mỗi câu 4 lệnh hỏi), cách tính điểm (chuẩn CV 7991: 0.1 - 0.25 - 0.5 - 1.0 điểm hoặc 0.25đ/ý).
    3. **Trắc nghiệm Trả lời ngắn (TLN):** Cấu hình số câu, điểm/câu.
    4. **Tự luận (TL):** Cấu hình số câu, điểm từng câu (hoặc 100% Tự luận đối với môn Ngữ văn).
    5. **Kỹ năng đặc thù (Listening / Đọc hiểu / Viết):** Dành cho Tiếng Anh và Ngữ văn.
- **Bảng Ma trận tương tác:**
  - Hiển thị đầy đủ các cột: TT, Chủ đề/Chương, Nội dung/Đơn vị kiến thức, Số câu và Điểm số phân bổ theo từng Dạng câu hỏi × Mức độ nhận thức (*Mức 1, Mức 2, Mức 3* cho Tiểu học; *Biết, Hiểu, Vận dụng* cho THCS/THPT), Tổng số câu, Tổng điểm, Tỷ lệ %.
  - **Tính toán thời gian thực (Real-time Calculation):** Khi giáo viên sửa bất kỳ ô số câu hoặc điểm số nào, bảng tự động tính lại tổng điểm dòng, tổng điểm cột, tỷ lệ % từng mức độ và cảnh báo ngay nếu tổng điểm ≠ 10.0.

### Bước 3: Tạo Bản đặc tả đề kiểm tra (`TẠO BẢN ĐẶC TẢ`)
- Dựa trên Ma trận đã chốt ở Bước 2, hệ thống sinh **Bản đặc tả chi tiết**:
  - Mỗi đơn vị kiến thức trong Ma trận được ánh xạ 1-1 sang Bản đặc tả.
  - Trình bày rõ **Yêu cầu cần đạt** chia theo từng mức độ:
    - *Nhận biết / Mức 1:* Nêu/nhận diện/chỉ ra...
    - *Thông hiểu / Mức 2:* Giải thích/phân biệt/kết nối/tính toán cơ bản...
    - *Vận dụng / Mức 3:* Giải quyết bài toán thực tiễn/vận dụng tổng hợp...
  - Gắn **Mã vị trí câu hỏi** (ví dụ: `C1`, `C2`, `ĐS1a`, `ĐS1b`, `TLN1`, `TL1`) khớp tuyệt đối với số lượng câu trong Ma trận.
- Giáo viên sửa trực tiếp nội dung Yêu cầu cần đạt hoặc mã câu hỏi trên bảng trước khi xác nhận.

### Bước 4: Soạn Đề kiểm tra & Nhân bản mã đề (`SOẠN ĐỀ`)
- Sinh bộ câu hỏi hoàn chỉnh bám sát **Tài liệu đã tải + Ma trận + Bản đặc tả**:
  - Mỗi câu hỏi đều có:
    - `question_id` và `matrix_ref` (Mã liên kết trực tiếp tới dòng Ma trận & Bản đặc tả, ví dụ: `[MT-01 | Chủ đề 1 | Mức: Biết | 0.25đ]`).
    - Nội dung câu hỏi (hỗ trợ công thức Toán/Lý/Hóa, bảng biểu, ngữ liệu đọc hiểu, hoặc bài nghe + Transcript cho Tiếng Anh).
    - Các phương án trả lời (A/B/C/D cho MCQ; 4 mệnh đề a/b/c/d cho Đúng-Sai; ô đáp số cho Trả lời ngắn; yêu cầu chi tiết cho Tự luận).
- **Công cụ cho Giáo viên tại Bước 4:**
  - Xem trước đề ở 2 chế độ: **Chế độ Chuyên môn (hiện mã liên kết ma trận & mức độ)** và **Chế độ Bản in Học sinh (ẩn toàn bộ nhãn mức độ và đáp án)**.
  - Chỉnh sửa trực tiếp nội dung từng câu hỏi, phương án, điểm số.
  - Nút **"Tạo lại câu này bằng AI" (Regenerate Single Question)** cho phép yêu cầu AI viết lại riêng 1 câu bất kỳ mà vẫn giữ đúng ma trận.
  - Nút **"Trộn & Nhân bản Mã đề"**: Tự động sinh các mã đề (101, 102, 103, 104...) bằng thuật toán hoán vị câu hỏi trong cùng phần/mức độ và đảo phương án A/B/C/D, đồng thời tự động cập nhật bảng đáp án cho từng mã đề.

### Bước 5: Tạo Đáp án, Hướng dẫn chấm & Kiểm định chất lượng (`TẠO ĐÁP ÁN & KIỂM ĐỊNH`)
- **Bảng Đáp án & Hướng dẫn chấm chi tiết:**
  - Phần Trắc nghiệm nhiều lựa chọn: Bảng đáp án chuẩn cho tất cả các mã đề + lời giải chi tiết từng câu.
  - Phần Trắc nghiệm Đúng - Sai: Đáp án Đúng/Sai cho từng ý a, b, c, d + giải thích chi tiết + quy tắc tính điểm từng câu.
  - Phần Trả lời ngắn: Đáp số chuẩn + các bước giải tóm tắt.
  - Phần Tự luận / Ngữ văn / Viết: Biểu điểm chi tiết từng ý (0.25đ – 0.5đ), hướng dẫn chấm cho học sinh giải cách khác.
- **Bộ Kiểm định Tự động (Automated QA & Consistency Engine):**
  - Kiểm tra đối chiếu 4 chiều: **Ma trận ↔ Bản đặc tả ↔ Đề kiểm tra ↔ Đáp án**.
  - Kiểm tra tổng điểm (= 10.0 điểm), tổng số câu, tỷ lệ % các mức độ nhận thức.
  - Kiểm tra độc lập các phép tính số học và tính hợp lệ của đáp án (đảm bảo câu MCQ có đúng 1 đáp án đúng trong A/B/C/D, câu Đúng/Sai đủ 4 ý a-b-c-d, câu Trả lời ngắn có đáp số rõ ràng).

### Bước 6: Xuất Hồ sơ Word & Lưu trữ (`XUẤT WORD & LƯU HỒ SƠ`)
- **Xuất file Word (`.docx`) chuẩn thể thức hành chính - giáo dục:**
  - Khổ giấy **A4** (`210mm x 297mm`), lề chuẩn (Trái 2.5cm, Phải 2.0cm, Trên 2.0cm, Dưới 2.0cm).
  - Phông chữ **Times New Roman**, cỡ chữ **13pt – 14pt**, giãn dòng 1.15–1.3, bảng biểu tự động co giãn vừa khung trang (`AutoFit to Window`), lặp tiêu đề bảng khi sang trang.
  - Tùy chọn tải xuống:
    1. **Xuất Trọn bộ Hồ sơ (`.docx`):** Gồm Bìa/Tiêu đề + Ma trận + Bản đặc tả + Đề kiểm tra (các mã đề) + Đáp án & Hướng dẫn chấm.
    2. **Xuất riêng Ma trận & Bản đặc tả (`.docx`).**
    3. **Xuất riêng Đề kiểm tra Học sinh (`.docx`):** Tuyệt đối **không chứa đáp án**, không chứa gợi ý hay nhãn mức độ nhận thức; có khung thông tin Trường, Lớp, Họ tên, Số báo danh, Mã đề, Chữ ký giám thị.
    4. **Xuất riêng Đáp án & Hướng dẫn chấm (`.docx`).**
- **Quản lý Hồ sơ đề kiểm tra:**
  - Lưu hồ sơ vào hệ thống (Server + LocalStorage backup).
  - Mở lại hồ sơ đã lưu, tìm kiếm/lọc theo môn/lớp, nhân bản hồ sơ cho kỳ kiểm tra mới, xuất/nhập file dự phòng `.json`.

---

## 4. CẤU TRÚC DỮ LIỆU CHUẨN (DATA SCHEMA)

```json
{
  "id": "exam_2026_math12_gk1",
  "title": "Đề kiểm tra Giữa học kỳ I - Toán 12",
  "metadata": {
    "schoolName": "TRƯỜNG THPT CHU VĂN AN",
    "departmentName": "TỔ TOÁN - TIN",
    "schoolYear": "2026 - 2027",
    "level": "THPT",
    "grade": "12",
    "subject": "Toán",
    "textbook": "Kết nối tri thức với cuộc sống",
    "examPeriod": "Giữa học kỳ I",
    "duration": 90,
    "numVariants": 2,
    "regulation": "CV7991_TT22",
    "localGuidelines": "Cấu trúc 3 phần: Phần I (12 câu MCQ - 3đ), Phần II (4 câu Đúng/Sai - 4đ), Phần III (6 câu Trả lời ngắn - 3đ)."
  },
  "documents": [
    {
      "name": "KHGD_Toan12_GK1.docx",
      "extractedText": "...",
      "topics": []
    }
  ],
  "matrix": {
    "levels": ["Biết", "Hiểu", "Vận dụng"],
    "questionTypes": ["MCQ", "TF", "SA", "ESSAY"],
    "rows": [
      {
        "id": "row_1",
        "topic": "Chương I. Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số",
        "unit": "1. Tính đơn điệu và cực trị của hàm số",
        "counts": {
          "MCQ": { "Biết": 4, "Hiểu": 2, "Vận dụng": 0 },
          "TF":  { "Biết": 2, "Hiểu": 1, "Vận dụng": 1 },
          "SA":  { "Biết": 0, "Hiểu": 1, "Vận dụng": 2 },
          "ESSAY": { "Biết": 0, "Hiểu": 0, "Vận dụng": 0 }
        },
        "points": 3.5
      }
    ],
    "pointRules": {
      "MCQ": 0.25,
      "TF_item": 0.25,
      "SA": 0.5,
      "ESSAY": 1.0
    }
  },
  "specification": [
    {
      "rowId": "row_1",
      "topic": "Chương I. Ứng dụng đạo hàm...",
      "unit": "1. Tính đơn điệu và cực trị của hàm số",
      "outcomes": {
        "Biết": "Nhận biết được tính đồng biến, nghịch biến, điểm cực trị của hàm số thông qua bảng biến thiên hoặc đồ thị.",
        "Hiểu": "Xác định được khoảng đơn điệu, điểm cực trị của hàm số bằng đạo hàm.",
        "Vận dụng": "Vận dụng đạo hàm giải quyết bài toán tối ưu thực tiễn và bài toán chứa tham số."
      },
      "questionRefs": {
        "MCQ": ["C1", "C2", "C3", "C4", "C5", "C6"],
        "TF": ["ĐS1(a,b,c,d)"],
        "SA": ["TLN1", "TLN2", "TLN3"],
        "ESSAY": []
      }
    }
  ],
  "questions": [],
  "variants": []
}
```

