# Hướng dẫn sử dụng Voice Feedback

## Tổng quan

Tính năng Voice Feedback cho phép giáo viên và trợ giảng cung cấp phản hồi bằng giọng nói cho bài tập của học viên, bên cạnh feedback bằng văn bản truyền thống.

## Tính năng chính

### 1. Ghi âm feedback
- Ghi âm trực tiếp từ trình duyệt
- Thời gian ghi âm tối đa: 3 phút (có thể tùy chỉnh)
- Chất lượng âm thanh cao với noise suppression
- Preview và phát lại trước khi lưu

### 2. Quản lý voice feedback
- Lưu trữ tự động trên Firebase Storage
- Metadata được lưu trong Firestore
- Phân quyền truy cập theo vai trò
- Tải xuống file âm thanh

### 3. Phát lại feedback
- Player tích hợp với thanh tiến trình
- Điều khiển phát/tạm dừng
- Tua nhanh/tua chậm
- Hiển thị thời gian phát

## Cách sử dụng

### Đối với Giáo viên/Trợ giảng

#### 1. Truy cập trang feedback
```
/dashboard/teacher/feedback
```

#### 2. Chọn lớp học và bài tập
- Chọn lớp học từ danh sách
- Xem danh sách bài tập cần feedback
- Click "Xem chi tiết" để mở modal feedback

#### 3. Ghi âm feedback
- Click nút "Ghi âm" bên cạnh nút "Chỉnh sửa"
- Cho phép truy cập microphone khi được yêu cầu
- Click "Bắt đầu ghi âm" để bắt đầu
- Nói feedback của bạn
- Click "Dừng ghi âm" khi hoàn thành
- Preview bằng cách click "Phát"
- Click "Lưu" để upload feedback

#### 4. Quản lý voice feedback
- Xem danh sách các voice feedback đã tạo
- Phát lại để kiểm tra nội dung
- Tải xuống file âm thanh nếu cần
- Xóa feedback không cần thiết

### Đối với Học viên

#### 1. Xem voice feedback
- Voice feedback sẽ hiển thị trong phần feedback của bài tập
- Click nút play để nghe feedback
- Sử dụng thanh tiến trình để tua
- Tải xuống file âm thanh nếu muốn

## Cấu trúc dữ liệu

### VoiceFeedback Interface
```typescript
interface VoiceFeedback {
  id?: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  submissionId: string;
  submissionType: string;
  submissionQuestionNumber: number;
  audioUrl: string;
  audioPath: string;
  duration: number; // in seconds
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Firebase Storage Structure
```
voice-feedback/
  {teacherId}/
    {studentId}/
      {submissionId}_{submissionType}_{questionNumber}_{timestamp}.webm
```

## API Functions

### Upload Voice Feedback
```typescript
uploadVoiceFeedback(
  audioBlob: Blob,
  studentId: string,
  studentName: string,
  teacherId: string,
  teacherName: string,
  submissionId: string,
  submissionType: string,
  submissionQuestionNumber: number,
  duration: number
): Promise<VoiceFeedback | null>
```

### Get Voice Feedback
```typescript
getVoiceFeedbackForSubmission(
  submissionId: string,
  submissionType: string,
  submissionQuestionNumber: number
): Promise<VoiceFeedback[]>
```

### Delete Voice Feedback
```typescript
deleteVoiceFeedback(voiceFeedbackId: string): Promise<boolean>
```

## Bảo mật

### Firestore Rules
```javascript
match /voiceFeedback/{voiceFeedbackId} {
  allow read: if isSignedIn() && (
    resource.data.studentId == request.auth.uid ||
    resource.data.teacherId == request.auth.uid ||
    isAdmin() ||
    isAssistant()
  );
  allow create: if isSignedIn() && (
    isTeacher() || 
    isAdmin() || 
    isAssistant()
  ) && request.resource.data.teacherId == request.auth.uid;
  allow update: if isSignedIn() && (
    resource.data.teacherId == request.auth.uid ||
    isAdmin()
  );
  allow delete: if isSignedIn() && (
    resource.data.teacherId == request.auth.uid ||
    isAdmin()
  );
}
```

## Yêu cầu kỹ thuật

### Browser Support
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

### Permissions
- Microphone access required
- HTTPS required for production

### File Format
- Audio format: WebM with Opus codec
- Fallback: MP4 with AAC codec (if WebM not supported)

## Troubleshooting

### Lỗi thường gặp

#### 1. "Không thể truy cập microphone"
- Kiểm tra quyền truy cập microphone trong browser
- Đảm bảo website chạy trên HTTPS
- Thử refresh trang và cho phép lại

#### 2. "Lỗi khi tải lên feedback" / CORS Error
- **Nguyên nhân**: Lỗi CORS khi upload lên Firebase Storage
- **Giải pháp**:
  1. Chạy script cấu hình CORS:
     ```bash
     chmod +x scripts/setup-firebase-storage-cors.sh
     ./scripts/setup-firebase-storage-cors.sh
     ```
  2. Hoặc cấu hình thủ công:
     ```bash
     gsutil cors set storage.cors.json gs://YOUR_PROJECT_ID.appspot.com
     ```
  3. Hệ thống sẽ tự động fallback sang data URL nếu CORS vẫn lỗi

#### 3. "Không thể phát audio"
- Kiểm tra volume của browser
- Thử refresh trang
- Kiểm tra codec support của browser

#### 4. "Access to XMLHttpRequest blocked by CORS policy"
- Đây là lỗi CORS phổ biến với Firebase Storage
- Chạy script setup CORS như hướng dẫn ở mục 2
- Kiểm tra Firebase project permissions
- Đảm bảo đã authenticate với Google Cloud SDK

### Performance Tips

#### 1. Tối ưu thời gian ghi âm
- Giữ feedback ngắn gọn (1-2 phút)
- Nói rõ ràng và chậm rãi
- Tránh tiếng ồn xung quanh

#### 2. Quản lý storage
- Xóa các voice feedback cũ không cần thiết
- Sử dụng compression nếu cần
- Monitor Firebase Storage usage

## Tích hợp với hệ thống hiện tại

### Components được sử dụng
- `VoiceRecorder`: Component ghi âm
- `VoiceFeedbackPlayer`: Component phát lại
- `FeedbackDetailsModal`: Modal chính chứa voice feedback

### Services
- `voice-feedback.ts`: Service quản lý voice feedback
- Firebase Storage: Lưu trữ file âm thanh
- Firestore: Lưu trữ metadata

### Styling
- Sử dụng color scheme của hệ thống
- Responsive design
- Accessible controls

## Roadmap

### Tính năng tương lai
- [ ] Transcription tự động (Speech-to-Text)
- [ ] Voice feedback templates
- [ ] Batch voice feedback
- [ ] Voice feedback analytics
- [ ] Mobile app support
- [ ] Offline recording capability
