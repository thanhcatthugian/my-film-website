# 🎬 CoiPhim - Nền Tảng Xem Phim Online Hiện Đại

Trang web xem phim trực tuyến **CoiPhim** được phát triển với giao diện sang trọng, hiện đại, tối ưu trải nghiệm người dùng với sự phối hợp của 5 tông màu chủ đạo: **Đen tuyền, Trắng bạch kim, Vàng gold, Đỏ ruby và Xanh lưu ly**.

---

## 🌟 Tính Năng Nổi Bật

1. **Màn hình chuyển cảnh (Splash Screen):**
   - Logo quay tròn 360 độ kết hợp hiệu ứng hào quang vàng gold, đỏ ruby và xanh lưu ly.
   - Dòng thông báo *"Vui lòng đợi chút..."* cùng thanh tiến trình tải trang mượt mà trước khi vào giao diện chính.

2. **Thương hiệu & Phối màu chuẩn:**
   - Tên thương hiệu: **CoiPhim**
   - Chữ **Phim** sử dụng hiệu ứng gradient phối giữa màu **đen tuyền** và **vàng gold** ánh kim cực kỳ đẳng cấp.
   - Bảng màu:
     - **Đen tuyền (Jet Black):** Không gian rạp chiếu phim huyền bí.
     - **Trắng bạch kim (Platinum White):** Chữ hiển thị và giao diện nền Light Mode.
     - **Vàng gold (Metallic Gold):** Vương miện Top 1, sao đánh giá, nút VIP, viền nổi bật.
     - **Đỏ ruby (Ruby Red):** Nút *"Xem Phim Ngay"*, nhãn HOT, huy hiệu Top 3.
     - **Xanh lưu ly (Lapis Lazuli):** Thẻ thể loại, nút chức năng phụ, huy hiệu Top 2.

3. **Chế độ Sáng / Tối (Dark / Light Mode):**
   - Nút chuyển đổi nhanh ở Header với biểu tượng Mặt Trời / Mặt Trăng.
   - Tự động lưu trạng thái vào `localStorage` cho những lần truy cập sau.

4. **12+ Phim mẫu phong phú các thể loại:**
   - Hành Động, Viễn Tưởng, Tình Cảm, Kinh Dị, Hoạt Hình, Hài Hước, Cổ Trang, Tâm Lý - Giật Gân.
   - Đầy đủ thông tin: Poster dọc, Banner ngang, thời lượng, chất lượng 4K/FHD, đạo diễn, diễn viên, tóm tắt nội dung.

5. **Xem phim không cần đăng nhập:**
   - Khách vãng lai, thành viên hay quản trị viên đều có thể bấm vào phim và thưởng thức ngay lập tức.
   - Trình phát hỗ trợ 2 nguồn: **Server VIP 1 (Full HD)** và **Server Trailer HD (YouTube bản quyền)**.
   - Tự động tăng lượt xem (`viewsToday`, `viewsMonth`, `viewsSeason`) mỗi khi có người xem.

6. **Bảng xếp hạng lượt xem (Leaderboard):**
   - Chuyển đổi linh hoạt giữa 3 tab:
     - 🌟 **Trong Ngày**
     - 📅 **Trong Tháng**
     - 🏆 **Trong Mùa**
   - Top 1 vinh danh màu **Vàng Gold**, Top 2 màu **Xanh Lưu Ly**, Top 3 màu **Đỏ Ruby**.

7. **Phân quyền người dùng & Đánh giá sao (1 - 5 sao):**
   - Khách chưa đăng nhập: Xem được phim, nhưng khi muốn bình luận hay chấm điểm sao, hệ thống sẽ hiển thị thông báo khóa và nút mở đăng nhập nhanh.
   - Đã đăng nhập: Mở khóa chọn sao (tương tác trực quan 1-5 sao) và gửi bình luận.
   - Điểm đánh giá của người dùng tự động tính toán lại điểm trung bình của bộ phim.

8. **Quyền Quản Trị Viên (Role: Admin):**
   - Chỉ tài khoản có `role === 'admin'` mới thấy nút **"Quản Trị"** và truy cập được **Trung Tâm Quản Trị**:
     - **Thêm phim mới:** Nhập tên, thể loại, poster, banner, link video, diễn viên, nội dung.
     - **Cập nhật / Sửa phim:** Tải dữ liệu phim cũ lên form để chỉnh sửa và lưu lại.
     - **Xóa phim:** Xóa phim khỏi hệ thống (có hộp thoại xác nhận an toàn).
     - **Quản lý Thể loại (Category):** Thêm thể loại phim mới, cập nhật tức thì vào bộ lọc trên trang chủ.

---

## 🔑 Tài Khoản Thử Nghiệm Sẵn Có

Hệ thống đã chuẩn bị sẵn 2 tài khoản mẫu trong `localStorage` để bạn trải nghiệm ngay:

| Loại tài khoản | Tên đăng nhập | Mật khẩu | Quyền hạn |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin` | `123` | Toàn quyền: Xem phim, Comment, Đánh giá sao, **Thêm / Sửa / Xóa phim**, **Thêm Thể loại** |
| **Thành viên (User)** | `user` | `123` | Xem phim, Bình luận, Đánh giá từ 1 đến 5 sao |
| **Khách (Guest)** | *Không cần đăng nhập* | — | Xem phim thoải mái không giới hạn |

*(Bạn cũng có thể tự bấm **Đăng Ký** tài khoản mới bất kỳ lúc nào)*

---

## 🚀 Hướng Dẫn Sử Dụng

1. Mở file [index.html](file:///d:/IT103B/coi-phim/index.html) trực tiếp trên bất kỳ trình duyệt nào (Chrome, Edge, Firefox, Cốc Cốc, Safari...).
2. Chiêm ngưỡng màn hình chuyển cảnh **Splash Screen** với logo quay tròn và chữ *"Vui lòng đợi chút..."*.
3. Thử nghiệm các tính năng:
   - Bấm vào bất kỳ phim nào để xem ngay.
   - Thử bấm đổi chế độ Sáng / Tối trên thanh Header.
   - Chuyển đổi bảng xếp hạng Ngày / Tháng / Mùa.
   - Đăng nhập bằng tài khoản `admin` / `123` để mở nút **Quản Trị** và trải nghiệm Thêm/Sửa phim.
