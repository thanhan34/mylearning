# Write From Dictation (WFD) Feature Guide

## Tổng quan
Tính năng Write From Dictation (WFD) cho phép học viên luyện tập kỹ năng nghe và viết thông qua việc nghe audio và gõ lại chính xác nội dung đã nghe.

## Cấu trúc hệ thống

### 1. Firebase Configuration
- **Firebase chính (MyLearning)**: Lưu trữ tiến độ học tập của học viên
- **Firebase phụ (pteshadowing)**: Lưu trữ dữ liệu câu WFD và audio

### 2. Collections trong Database

#### Firebase phụ (pteshadowing):
- `writefromdictation`: Chứa các câu WFD
  ```typescript
  {
    id: string,
    text: string,
    audio: {
      Brian: string,
      Joanna: string, 
      Olivia: string
    },
    isHidden: boolean,
    occurrence: number,
    questionType: string,
    createdAt: string
  }
  ```

#### Firebase chính (MyLearning):
- `wfd_progress`: Tiến độ luyện tập của học viên
  ```typescript
  {
    userId: string,
    wfdId: string,
    correctAttempts: number,
    completedAt?: string,
    dailyDate: string,
    attempts: WFDAttempt[],
    createdAt: Timestamp,
    updatedAt: Timestamp
  }
  ```

- `wfd_daily_sessions`: Phiên luyện tập hàng ngày
  ```typescript
  {
    userId: string,
    date: string,
    sentences: string[], // Array of WFD sentence IDs
    completedSentences: string[],
    totalProgress: number, // 0-100%
    createdAt: Timestamp,
    updatedAt: Timestamp
  }
  ```

### 3. Cấu trúc Components

```
app/dashboard/practice/wfd/
├── page.tsx                    # Main WFD page
└── components/
    ├── WFDPracticeClient.tsx   # Main practice component
    ├── WFDProgressOverview.tsx # Progress overview
    └── WFDSentenceCard.tsx     # Individual sentence practice
```

## Tính năng chính

### 1. Luyện tập hàng ngày
- Mỗi ngày hiển thị 10 câu WFD mới
- Câu được chọn dựa trên `isHidden: false` và `occurrence` cao nhất
- Mỗi câu phải gõ đúng 10 lần để hoàn thành

### 2. Audio System
- Hỗ trợ 3 giọng đọc: Brian, Joanna, Olivia
- Audio tự động phát khi load câu đầu tiên
- Có thể chọn giọng đọc và replay audio
- Audio dừng khi thay đổi giọng đọc

### 3. Anti-cheat Measures
- Vô hiệu hóa copy/paste
- Vô hiệu hóa right-click
- Vô hiệu hóa keyboard shortcuts (Ctrl+C, Ctrl+V, etc.)
- Chỉ cho phép typing thủ công

### 4. Kiểm tra độ chính xác
- So sánh chính xác tuyệt đối (100%)
- Tính toán độ chính xác dựa trên character matching
- Hiển thị feedback ngay lập tức
- Lưu lại tất cả attempts

### 5. Progress Tracking
- Theo dõi số lần gõ đúng/tổng số lần thử
- Progress bar cho từng câu
- Tổng quan tiến độ hàng ngày
- Thống kê chi tiết

## Workflow sử dụng

### 1. Truy cập tính năng
- Đăng nhập vào hệ thống
- Vào menu "Học tập" → "Write From Dictation"
- URL: `/dashboard/practice/wfd`

### 2. Luyện tập
1. Hệ thống tự động load 10 câu cho ngày hôm nay
2. Audio của câu đầu tiên tự động phát
3. Học viên nghe và gõ lại nội dung
4. Nhấn "Kiểm tra" hoặc Enter để submit
5. Nhận feedback ngay lập tức
6. Lặp lại cho đến khi đạt 10/10 lần đúng

### 3. Chọn giọng đọc
- Chọn giọng Brian, Joanna, hoặc Olivia
- Audio hiện tại sẽ dừng khi thay đổi giọng
- Nhấn "Phát audio" để nghe với giọng mới

## API Functions

### WFD Service Functions
```typescript
// Lấy 10 câu WFD hàng ngày
getDailyWFDSentences(): Promise<WFDSentence[]>

// Lấy/tạo phiên luyện tập hàng ngày
getUserDailySession(userId: string, date: string): Promise<WFDDailySession | null>
createOrUpdateDailySession(userId: string, date: string, sentences: string[]): Promise<WFDDailySession>

// Quản lý tiến độ
getWFDProgress(userId: string, wfdId: string, dailyDate: string): Promise<WFDProgress | null>
updateWFDProgress(userId: string, wfdId: string, dailyDate: string, attempt: WFDAttempt): Promise<WFDProgress>

// Kiểm tra độ chính xác
checkTextAccuracy(userInput: string, correctText: string): { isCorrect: boolean; accuracy: number }

// Lấy audio URL
getAudioUrl(sentence: WFDSentence, voice: VoiceType): string
```

## Firestore Indexes

Các indexes cần thiết đã được thêm vào `firestore.indexes.json`:

```json
{
  "collectionGroup": "wfd_progress",
  "queryScope": "COLLECTION", 
  "fields": [
    {"fieldPath": "userId", "order": "ASCENDING"},
    {"fieldPath": "dailyDate", "order": "DESCENDING"}
  ]
},
{
  "collectionGroup": "wfd_progress",
  "queryScope": "COLLECTION",
  "fields": [
    {"fieldPath": "userId", "order": "ASCENDING"},
    {"fieldPath": "wfdId", "order": "ASCENDING"},
    {"fieldPath": "dailyDate", "order": "ASCENDING"}
  ]
},
{
  "collectionGroup": "wfd_daily_sessions",
  "queryScope": "COLLECTION",
  "fields": [
    {"fieldPath": "userId", "order": "ASCENDING"},
    {"fieldPath": "date", "order": "DESCENDING"}
  ]
}
```

## Navigation Integration

Tính năng WFD đã được tích hợp vào Navigation cho học viên:
- Menu "Học tập" → "Write From Dictation"
- Chỉ hiển thị cho role "student"

## Troubleshooting

### 1. Audio không phát
- Kiểm tra URL audio trong Firebase
- Đảm bảo browser cho phép autoplay
- Kiểm tra network connection

### 2. Không load được câu WFD
- Kiểm tra Firebase WFD connection
- Đảm bảo có câu với `isHidden: false`
- Kiểm tra Firestore rules

### 3. Progress không được lưu
- Kiểm tra user authentication
- Đảm bảo Firestore indexes đã được deploy
- Kiểm tra network connection

## Security Considerations

1. **Anti-cheat**: Đã implement các biện pháp ngăn chặn copy/paste
2. **Data validation**: Server-side validation cho tất cả inputs
3. **Rate limiting**: Có thể thêm rate limiting cho API calls
4. **Firebase rules**: Đảm bảo chỉ user được phép truy cập data của mình

## Future Enhancements

1. **Difficulty levels**: Phân loại câu theo độ khó
2. **Statistics**: Thống kê chi tiết hơn về performance
3. **Leaderboard**: Bảng xếp hạng học viên
4. **Custom practice**: Cho phép luyện tập câu cụ thể
5. **Offline mode**: Hỗ trợ luyện tập offline
