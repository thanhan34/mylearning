# Hướng dẫn Chức năng Điểm danh cho Trợ giảng

## Tổng quan

Chức năng điểm danh cho trợ giảng cho phép trợ giảng thực hiện điểm danh cho các lớp học mà họ được phân công hỗ trợ. Đây là một tính năng quan trọng giúp trợ giảng có thể hỗ trợ giáo viên trong việc quản lý sự tham gia của học viên.

## Tính năng chính

### 1. Xem danh sách lớp được phân công
- Trợ giảng chỉ có thể xem và điểm danh các lớp mà họ được admin phân công
- Hiển thị thông báo rõ ràng nếu chưa được phân công lớp nào

### 2. Tạo điểm danh mới
- Chọn lớp học từ danh sách được phân công
- Chọn ngày điểm danh
- Tạo bản ghi điểm danh với trạng thái mặc định là "vắng mặt"

### 3. Quản lý điểm danh
- Xem danh sách các buổi điểm danh đã tạo
- Chỉnh sửa trạng thái điểm danh của từng học viên
- Thêm ghi chú cho từng học viên
- Xóa bản ghi điểm danh (nếu cần)

### 4. Trạng thái điểm danh
- **Có mặt**: Học viên tham gia đầy đủ
- **Vắng mặt**: Học viên không tham gia
- **Đi muộn**: Học viên tham gia nhưng đến muộn
- **Có phép**: Học viên xin phép không tham gia

### 5. Tính năng hỗ trợ
- Đánh dấu nhanh tất cả học viên cùng một trạng thái
- Ghi chú riêng cho từng học viên
- Thống kê số lượng học viên có mặt/vắng mặt

## Cách sử dụng

### Bước 1: Truy cập trang điểm danh
1. Đăng nhập với tài khoản trợ giảng
2. Vào menu "Quản lý" > "Điểm danh"
3. Hệ thống sẽ hiển thị trang điểm danh dành riêng cho trợ giảng

### Bước 2: Chọn lớp và ngày
1. Chọn lớp học từ dropdown "Chọn lớp học được phân công"
2. Chọn ngày cần điểm danh
3. Nhấn "Tạo điểm danh" để tạo bản ghi mới

### Bước 3: Thực hiện điểm danh
1. Chọn bản ghi điểm danh từ danh sách bên trái
2. Nhấn "Chỉnh sửa" để bắt đầu điểm danh
3. Cập nhật trạng thái cho từng học viên:
   - Sử dụng dropdown để chọn trạng thái
   - Thêm ghi chú nếu cần
4. Sử dụng các nút "Tất cả có mặt", "Tất cả vắng mặt", v.v. để đánh dấu nhanh
5. Nhấn "Lưu" để hoàn tất

### Bước 4: Quản lý bản ghi
- Xem lại các buổi điểm danh đã tạo
- Chỉnh sửa lại nếu cần thiết
- Xóa bản ghi điểm danh (với xác nhận)

## Quyền hạn và giới hạn

### Quyền được phép:
- Xem danh sách lớp được phân công
- Tạo điểm danh cho các lớp được phân công
- Chỉnh sửa và cập nhật điểm danh
- Xóa bản ghi điểm danh đã tạo
- Thêm ghi chú cho học viên

### Giới hạn:
- Chỉ có thể điểm danh các lớp được admin phân công
- Không thể xem điểm danh của lớp khác
- Không thể thay đổi danh sách học viên trong lớp
- Không có quyền xem thống kê tổng quan của toàn hệ thống

## Lưu ý quan trọng

1. **Phân công lớp**: Trợ giảng cần được admin phân công vào lớp trước khi có thể điểm danh
2. **Trùng lặp**: Hệ thống tự động kiểm tra và ngăn tạo điểm danh trùng lặp cho cùng một ngày
3. **Đồng bộ**: Điểm danh được lưu trữ chung với hệ thống, giáo viên và admin đều có thể xem
4. **Backup**: Nên lưu điểm danh ngay sau khi hoàn tất để tránh mất dữ liệu

## Giao diện người dùng

### Màn hình chính
- Header: "Điểm danh lớp học - Trợ giảng"
- Panel trái: Danh sách các buổi điểm danh
- Panel phải: Chi tiết điểm danh và danh sách học viên
- Thanh công cụ: Các nút tác vụ nhanh

### Màu sắc trạng thái
- **Xanh lá**: Có mặt
- **Đỏ**: Vắng mặt  
- **Vàng**: Đi muộn
- **Xanh dương**: Có phép

## Hỗ trợ kỹ thuật

Nếu gặp vấn đề khi sử dụng chức năng điểm danh:
1. Kiểm tra kết nối internet
2. Đảm bảo đã được phân công vào lớp
3. Liên hệ admin để được hỗ trợ
4. Báo cáo lỗi qua hệ thống nếu có

## Cập nhật và phát triển

Chức năng này sẽ được cập nhật thêm:
- Xuất báo cáo điểm danh
- Thống kê chi tiết theo thời gian
- Thông báo tự động cho giáo viên
- Tích hợp với lịch học

---

*Tài liệu này được cập nhật lần cuối: Tháng 1/2025*
