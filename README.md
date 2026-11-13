# Nguyen_Quang_Khai_website — Portfolio CNS&AI của Nguyễn Quang Khải

Portfolio học phần **Nhập môn Công nghệ số và ứng dụng trí tuệ nhân tạo (INF2501)** — sinh viên Sư phạm Âm nhạc, Trường ĐH Sư phạm Nghệ thuật Trung ương.

Deploy bằng **Netlify** (nối thẳng với repo này): mỗi lần push lên `main`, Netlify chạy lệnh trong `netlify.toml` rồi xuất bản thư mục `dist/`.

## Trạng thái
- ✅ Trang Giới thiệu: thông tin, sở thích và năng khiếu, mục tiêu học tập, định hướng phát triển, mục tiêu portfolio (giữ nguyên văn lời Khải)
- ✅ Đủ 6 bài tập theo tài liệu Google Docs "Bài tập các chương CNS&AI Quang Khải", kèm 30 ảnh minh chứng lấy từ tài liệu
- ✅ Trang Tổng kết (soạn dựa trên nội dung 6 bài và phần định hướng của Khải — nên để Khải đọc lại)
- ℹ️ Bài 1, 2, 6 chưa có dòng "AI đã sử dụng" vì bài làm gốc không ghi; thêm `ai_use:` vào `data.yaml` nếu cần
- ✅ Bài 4: minh chứng phối hợp trực tuyến của Nhóm 5 (quy trình, công cụ, bảng phân công, ảnh email), bài làm chung để trong mục mở rộng

## Giao diện — "Sáu dây"
Khải hát, biểu diễn sân khấu, chơi guitar và piano, thích nghiên cứu lý thuyết âm nhạc. Cả trang vì thế xoay quanh **cây đàn guitar sáu dây**: sáu bài tập của học phần là sáu dây đàn, gảy được thật.
- Màu theo yêu cầu của Khải: xanh navy `#0e1a36`, vàng nghệ `#e3a21a`, nâu trầm `#3a2416`, nền giấy ngà `#f5ecd9`
- Chữ: **Big Shoulders Display** (tiêu đề kiểu áp phích đêm nhạc), **Fraunces** nghiêng (lời trích), **Manrope** (nội dung), **JetBrains Mono** (tên tệp, prompt) — tự host, đủ dấu tiếng Việt
- Trang đầu: tên cỡ áp phích, ảnh Khải tách nền trên "mặt trời" vàng nghệ, sáu dây đàn chạy ngang — rê chuột hoặc vuốt để gảy (Mi La Rê Son Si Mi)
- Điều hướng là một **pedalboard** ghim ở đáy màn hình (Giới thiệu / Bài tập / Tổng kết / bật tắt tiếng đàn), có đèn LED báo trang đang mở
- Mục tiêu ngắn hạn = ba hợp âm **C – F – G** (chủ, hạ át, át) kèm sơ đồ thế bấm, bấm để nghe
- Ba dòng nhạc Khải thích (truyền thống, cách mạng, V-pop) = ba câu dạo ngắn
- Mỗi trang bài tập có một dây đàn riêng (bài 1 = dây 6 … bài 6 = dây 1)
- Bài 3: ba mức prompt mang ký hiệu cường độ *p / mf / f*; Bài 6: năm nguyên tắc = năm dòng kẻ khuông nhạc
- Trang Tổng kết khép lại bằng vòng kết **K⁶₄ – D⁷ – T** (hợp âm bốn sáu kết là chủ đề Khải chọn ở bài 3)
- Tiếng đàn tổng hợp bằng Web Audio (thuật toán Karplus–Strong), không dùng file âm thanh; tôn trọng *prefers-reduced-motion*

## Cấu trúc
```
students/nguyen_quang_khai/data.yaml      ← trang Giới thiệu, thông tin 6 bài, Tổng kết
students/nguyen_quang_khai/bai1…6.yaml    ← sản phẩm chi tiết của từng bài
students/nguyen_quang_khai/images/        ← ảnh cá nhân + ảnh minh chứng
template/*.html.j2, template/assets/      ← giao diện (Jinja2 + CSS/JS + phông chữ)
scripts/render.py                         ← YAML → HTML tĩnh vào dist/
netlify.toml                              ← lệnh build và thư mục xuất bản cho Netlify
```

## Dùng
```bash
pip install -r requirements.txt
python scripts/render.py
python -m http.server -d dist   # mở http://localhost:8000
```
