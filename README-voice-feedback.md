# Voice Feedback Feature

## 📝 Tổng quan

Tính năng Voice Feedback cho phép giáo viên và trợ giảng cung cấp phản hồi bằng giọng nói cho bài tập của học viên, bên cạnh feedback bằng văn bản truyền thống.

## 🚀 Tính năng chính

- ✅ Ghi âm feedback trực tiếp từ trình duyệt
- ✅ Player tùy chỉnh với điều khiển đầy đủ
- ✅ Lưu trữ tự động trên Firebase Storage
- ✅ Phân quyền truy cập theo vai trò
- ✅ Fallback mechanism cho CORS issues
- ✅ Responsive design

## 📁 Cấu trúc file

```
app/
├── components/
│   ├── VoiceRecorder.tsx          # Component ghi âm
│   ├── VoiceFeedbackPlayer.tsx    # Component phát lại
│   └── VoiceFeedbackDemo.tsx      # Demo component
├── firebase/services/
│   └── voice-feedback.ts          # Service quản lý voice feedback
└── dashboard/admin/components/feedback/
    └── FeedbackDetailsModal.tsx   # Modal tích hợp voice feedback

docs/
└── voice-feedback-guide.md       # Hướng dẫn chi tiết

scripts/
└── setup-firebase-storage-cors.sh # Script cấu hình CORS

storage.cors.json                  # Cấu hình CORS cho Firebase Storage
firestore.rules                    # Cập nhật rules cho voiceFeedback collection
```

## 🛠️ Cài đặt và cấu hình

### 1. Cấu hình Firebase Storage CORS

```bash
# Cấp quyền thực thi cho script
chmod +x scripts/setup-firebase-storage-cors.sh

# Chạy script cấu hình CORS
./scripts/setup-firebase-storage-cors.sh
```

### 2. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 3. Kiểm tra quyền truy cập

Đảm bảo website chạy trên HTTPS và có quyền truy cập microphone.

## 🎯 Cách sử dụng

### Cho Giáo viên/Trợ giảng:

1. Vào trang `/dashboard/teacher/feedback`
2. Chọn lớp học và bài tập cần feedback
3. Click "Xem chi tiết" để mở modal
4. Click nút "Ghi âm" bên cạnh "Chỉnh sửa"
5. Ghi âm feedback và lưu

### Cho Học viên:

1. Voice feedback sẽ hiển thị trong phần feedback của bài tập
2. Click play để nghe feedback
3. Sử dụng player controls để điều khiển

## 🔧 API Reference

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

## 🐛 Troubleshooting

### CORS Error
Nếu gặp lỗi CORS khi upload:

1. Chạy script setup CORS:
   ```bash
   ./scripts/setup-firebase-storage-cors.sh
   ```

2. Hoặc cấu hình thủ công:
   ```bash
   gsutil cors set storage.cors.json gs://YOUR_PROJECT_ID.appspot.com
   ```

3. Hệ thống sẽ tự động fallback sang data URL nếu CORS vẫn lỗi

### Microphone Access
- Đảm bảo website chạy trên HTTPS
- Cho phép truy cập microphone trong browser
- Refresh trang nếu cần

## 🔒 Bảo mật

- Chỉ giáo viên/trợ giảng có thể tạo voice feedback
- Học viên chỉ có thể xem voice feedback của mình
- Admin có quyền truy cập đầy đủ
- File audio được lưu trữ an toàn trên Firebase Storage

## 📱 Browser Support

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## 🎨 UI/UX Features

- Sử dụng color scheme của hệ thống (#fc5d01, #fedac2, etc.)
- Responsive design cho mobile
- Loading states và error handling
- Accessible controls

## 🚀 Roadmap

- [ ] Transcription tự động (Speech-to-Text)
- [ ] Voice feedback templates
- [ ] Batch voice feedback
- [ ] Voice feedback analytics
- [ ] Mobile app support
- [ ] Offline recording capability

## 📚 Tài liệu tham khảo

- [Hướng dẫn chi tiết](docs/voice-feedback-guide.md)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Firebase Storage](https://firebase.google.com/docs/storage)

## 🤝 Đóng góp

Để test tính năng, sử dụng component demo:
```typescript
import VoiceFeedbackDemo from '@/app/components/VoiceFeedbackDemo';
```

---

**Lưu ý**: Tính năng này yêu cầu HTTPS và quyền truy cập microphone để hoạt động đúng cách.
