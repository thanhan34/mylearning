# Discord Webhook Integration - Hướng Dẫn

## Tổng Quan

Hệ thống đã được tích hợp Discord webhook notifications để gửi thông báo real-time đến Discord channel khi có các sự kiện quan trọng xảy ra trong hệ thống MyLearning PTE.

## Các Tính Năng Đã Tích Hợp

### 1. 🎓 Học viên nộp bài tập (Homework Submission)
**Trigger**: Khi học viên nộp bài tập thành công

**Thông tin gửi**:
- Tên học viên
- Loại bài tập (Read aloud, Retell lecture, etc.)
- Ngày nộp
- Số lượng bài tập
- **Danh sách tất cả links đã nộp** (tối đa 10 links hiển thị)

**File liên quan**:
- `app/dashboard/submit/page.tsx` - Gọi `sendHomeworkNotification()`
- `app/firebase/services/discord.ts` - Function `sendHomeworkNotification()`

### 2. ✏️ Giáo viên feedback bài tập (Homework Feedback)
**Trigger**: Khi giáo viên lưu feedback cho bài tập

**Thông tin gửi**:
- Tên giáo viên
- Tên học viên
- Loại bài tập
- Câu số
- Ngày bài tập

**File liên quan**:
- `app/dashboard/admin/components/feedback/FeedbackDetailsModal.tsx` - Gọi `sendHomeworkFeedbackNotification()`
- `app/firebase/services/discord.ts` - Function `sendHomeworkFeedbackNotification()`

### 3. 📝 Học viên nộp mocktest (Mocktest Submission)
**Trigger**: Khi học viên nộp mocktest thành công

**Thông tin gửi**:
- Tên học viên
- Tên lớp học
- Ngày nộp
- Link mocktest

**File liên quan**:
- `app/dashboard/mocktest/components/MocktestForm.tsx` - Pass parameters
- `app/firebase/services/mocktest.ts` - Function `addMocktest()` gọi `sendMocktestNotification()`
- `app/firebase/services/discord.ts` - Function `sendMocktestNotification()`

### 4. 💬 Giáo viên feedback mocktest (Mocktest Feedback)
**Trigger**: Khi giáo viên lưu feedback cho mocktest

**Thông tin gửi**:
- Tên giáo viên
- Tên học viên
- Tên lớp học

**File liên quan**:
- `app/dashboard/mocktest/components/TeacherFeedback.tsx` - Pass parameters
- `app/firebase/services/mocktest.ts` - Function `addFeedback()` gọi `sendMocktestFeedbackNotification()`
- `app/firebase/services/discord.ts` - Function `sendMocktestFeedbackNotification()`

## Cấu Trúc Kỹ Thuật

### Discord Service Module
**File**: `app/firebase/services/discord.ts`

Chứa 4 functions chính:
1. `sendHomeworkNotification()` - Gửi thông báo homework submission
2. `sendHomeworkFeedbackNotification()` - Gửi thông báo homework feedback
3. `sendMocktestNotification()` - Gửi thông báo mocktest submission
4. `sendMocktestFeedbackNotification()` - Gửi thông báo mocktest feedback

### Webhook URL Configuration
Hệ thống sử dụng **3 webhook URLs riêng biệt** cho từng loại thông báo:

#### 1. Homework Submissions (Học viên nộp bài)
```typescript
const HOMEWORK_WEBHOOK_URL = 
  'https://discord.com/api/webhooks/1452552521146175582/UGncmc0Zp-2ej8aoT2p3kY6ItP7DV3WQJMg_w4GLZNHyTib1eRPMOyCTIe4TEIRNgZ3J';
```

#### 2. Mocktest Submissions (Học viên nộp mocktest)
```typescript
const MOCKTEST_WEBHOOK_URL = 
  'https://discord.com/api/webhooks/1452552781495013527/qyHiuI_6bGf2-opOGtKoYwhdXjx6wE_Vp3S7DMwF2E1Rx6Le-iepmNn46ntHygcvgedb';
```

#### 3. Teacher Feedback (Giáo viên feedback - cả bài tập và mocktest)
```typescript
const FEEDBACK_WEBHOOK_URL = 
  'https://discord.com/api/webhooks/1452552894912925828/Sm3BJemKuQ0cAuaP0KeEcwkm4pmStbdYLP0EDoFAq2s0cdSX3d8RUdLgBSlV_xhSh8d2';
```

**Lợi ích của việc phân chia webhooks**:
- Dễ dàng quản lý và theo dõi từng loại thông báo
- Có thể assign notification đến các Discord channels khác nhau
- Giảm spam và tăng tính tổ chức
- Dễ dàng filter và tìm kiếm thông báo

Có thể override bằng environment variables:
```
NEXT_PUBLIC_HOMEWORK_WEBHOOK_URL=your_homework_webhook_url
NEXT_PUBLIC_MOCKTEST_WEBHOOK_URL=your_mocktest_webhook_url
NEXT_PUBLIC_FEEDBACK_WEBHOOK_URL=your_feedback_webhook_url
```

### Discord Embed Format
Tất cả notifications sử dụng Discord embed với:
- **Color**: `#fc5d01` (màu cam của hệ thống)
- **Title**: Icon + Tiêu đề sự kiện
- **Fields**: Thông tin chi tiết (inline layout)
- **Description**: Nội dung bổ sung (như links)
- **Timestamp**: Thời gian gửi notification
- **Footer**: "MyLearning PTE System"

## Error Handling

Tất cả Discord notifications được wrap trong try-catch để đảm bảo:
- **Non-blocking**: Lỗi Discord không ảnh hưởng đến chức năng chính
- **Graceful degradation**: Nếu Discord fail, hệ thống vẫn hoạt động bình thường
- **Logging**: Errors được log ra console để debug

Ví dụ:
```typescript
try {
  await sendHomeworkNotification(...);
} catch (discordError) {
  console.error('Error sending Discord notification:', discordError);
  // Don't fail the submission if Discord fails
}
```

## Link Extraction

Đối với homework submissions, hệ thống tự động extract APEUni URLs từ text:
```typescript
const extractedUrls = links.map(link => {
  const match = link.match(/https?:\/\/(?:www\.)?apeuni\.com\/[^\s]+/);
  return match ? match[0] : link;
}).filter(link => link.trim() !== '');
```

Giới hạn hiển thị tối đa 10 links để tránh message quá dài.

## Testing

### Test Homework Submission
1. Login với tài khoản học viên
2. Vào `/dashboard/submit`
3. Chọn loại bài tập và ngày
4. Paste links bài tập
5. Submit
6. ✅ Check Discord channel để xem notification

### Test Homework Feedback
1. Login với tài khoản giáo viên
2. Vào `/dashboard/teacher/feedback`
3. Chọn lớp học
4. Click "Xem chi tiết" trên một bài tập
5. Nhập feedback và lưu
6. ✅ Check Discord channel để xem notification

### Test Mocktest Submission
1. Login với tài khoản học viên
2. Vào `/dashboard/mocktest`
3. Thêm mocktest mới với link
4. Submit
5. ✅ Check Discord channel để xem notification

### Test Mocktest Feedback
1. Login với tài khoản giáo viên
2. Vào `/dashboard/mocktest/teacher`
3. Click feedback trên một mocktest
4. Nhập feedback và lưu
5. ✅ Check Discord channel để xem notification

## Troubleshooting

### Không nhận được notification trên Discord
1. Kiểm tra webhook URL có đúng không
2. Kiểm tra console logs để xem error messages
3. Verify Discord webhook vẫn còn active
4. Check network tab trong DevTools để xem request có được gửi không

### Notification thiếu thông tin
1. Verify các parameters được pass đúng từ components
2. Check console logs để debug
3. Ensure session data có đầy đủ user information

### Rate Limiting
Discord có rate limit cho webhooks (30 requests/minute). Nếu gặp rate limit:
1. Implement queuing mechanism
2. Add delay between requests
3. Batch multiple notifications nếu cần

## Maintenance

### Thay đổi Webhook URL
Update constant trong `app/firebase/services/discord.ts` hoặc set environment variable.

### Customize Message Format
Edit các functions trong `app/firebase/services/discord.ts` để thay đổi:
- Title
- Fields
- Description format
- Colors
- Icons

### Thêm Notification Mới
1. Tạo function mới trong `discord.ts`
2. Call function từ nơi cần trigger notification
3. Wrap trong try-catch
4. Test thoroughly

## Files Modified

### New Files
- ✅ `app/firebase/services/discord.ts` - Discord service module
- ✅ `docs/discord-webhook-integration.md` - Documentation

### Modified Files
- ✅ `app/dashboard/submit/page.tsx` - Added homework notification
- ✅ `app/dashboard/admin/components/feedback/FeedbackDetailsModal.tsx` - Added feedback notification
- ✅ `app/firebase/services/mocktest.ts` - Added mocktest notifications
- ✅ `app/dashboard/mocktest/components/MocktestForm.tsx` - Pass className parameter
- ✅ `app/dashboard/mocktest/components/TeacherFeedback.tsx` - Pass studentName & className

## Future Enhancements

Các cải tiến có thể thêm trong tương lai:
1. Notification cho voice feedback
2. Batch notifications để tránh spam
3. Different channels cho different event types
4. Mention specific roles khi cần urgent attention
5. Rich embeds với thumbnails và images
6. Notification preferences per user
7. Daily/Weekly summary notifications
8. Error notifications cho admins

## Liên Hệ

Nếu có vấn đề hoặc câu hỏi về Discord integration, liên hệ development team.

---
**Last Updated**: 22/12/2025
**Version**: 1.1.0 - Phân loại webhook theo loại thông báo
