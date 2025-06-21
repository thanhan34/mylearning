# Assistant Class Management

Tài liệu này mô tả chức năng quản lý lớp học dành cho trợ giảng (Assistant) trong hệ thống.

## Tổng quan

Trợ giảng giờ đây có thể:
- Truy cập trang `/dashboard/class` để quản lý lớp học
- Xem danh sách các lớp được phân công
- Thêm/xóa học viên vào lớp
- Xem chi tiết và quản lý lớp như giáo viên

## Cấu trúc dữ liệu

### User Model (Assistant)
```typescript
interface User {
  id: string;
  email: string;
  role: "assistant";
  name?: string;
  assignedClassIds?: string[]; // Danh sách ID các lớp được phân công
  // ... other fields
}
```

### Class Model
```typescript
interface Class {
  id: string;
  name: string;
  teacherId: string; // ID của giáo viên hoặc trợ giảng tạo lớp
  students: ClassStudent[];
  // ... other fields
}
```

## Chức năng đã implement

### 1. Navigation Menu
- Thêm menu "Classes" vào navigation cho assistant
- Đặt trong category "Quản lý" cùng với các chức năng khác

### 2. Class Management Page (`/dashboard/class`)
- **Role Detection**: Tự động detect role assistant và sử dụng `getAssistantClasses()`
- **Class List**: Hiển thị danh sách lớp được phân công cho assistant
- **Student Management**: Thêm/xóa học viên như giáo viên
- **Class Details**: Xem chi tiết lớp và quản lý học viên
- **UI Restrictions**: Nút "Thêm lớp học" bị ẩn cho assistant

### 3. Firebase Services
- **getAssistantClasses()**: Lấy danh sách lớp được phân công cho assistant
- **createClass()**: Tạo lớp mới với assistant làm người quản lý
- **addStudentToClass()**: Thêm học viên vào lớp
- **removeStudentFromClass()**: Xóa học viên khỏi lớp

### 4. Authorization
- Middleware đã được cấu hình để cho phép assistant truy cập:
  - `/dashboard/class`
  - `/dashboard/teacher/*` (các chức năng giáo viên)

## Luồng hoạt động

### 1. Tạo Assistant
```javascript
// Tạo user với role assistant
const assistantData = {
  email: 'assistant@example.com',
  name: 'Assistant Name',
  role: 'assistant',
  assignedClassIds: [] // Sẽ được admin assign sau
};
```

### 2. Assign Classes cho Assistant
```javascript
// Admin assign class cho assistant
await db.collection('users').doc(assistantId).update({
  assignedClassIds: admin.firestore.FieldValue.arrayUnion(classId)
});
```

### 3. Assistant Login và Quản lý
1. Assistant đăng nhập
2. Thấy menu "Classes" trong navigation
3. Truy cập `/dashboard/class`
4. Xem danh sách lớp được phân công
5. Tạo lớp mới hoặc quản lý lớp hiện có

## Testing

### Chạy Test Script
```bash
node scripts/test-assistant-class.js
```

Script này sẽ:
1. Tạo test assistant user
2. Tạo test class
3. Assign class cho assistant
4. Cung cấp hướng dẫn test manual

### Manual Testing
1. Login với tài khoản assistant
2. Navigate to `/dashboard/class`
3. Verify các chức năng:
   - Xem danh sách lớp
   - Tạo lớp mới
   - Thêm/xóa học viên
   - Xem chi tiết lớp

## Quyền hạn

### Assistant có thể:
- ✅ Xem danh sách lớp được phân công
- ✅ Thêm/xóa học viên vào lớp
- ✅ Xem chi tiết lớp và bài tập
- ✅ Đánh dấu học viên đã đậu
- ✅ Truy cập các chức năng teacher (assignments, feedback, etc.)

### Assistant không thể:
- ❌ Tạo lớp học mới (chỉ admin/teacher có thể)
- ❌ Xem tất cả lớp trong hệ thống (chỉ lớp được assign)
- ❌ Truy cập admin functions
- ❌ Quản lý user khác

## Cấu hình Admin

### Assign Class cho Assistant
Admin có thể assign class cho assistant thông qua:
1. Admin dashboard (cần implement UI)
2. Firebase console
3. Script/API

```javascript
// Example: Assign class to assistant
const assignClassToAssistant = async (assistantEmail, classId) => {
  const assistantDoc = await getUserByEmail(assistantEmail);
  if (assistantDoc && assistantDoc.role === 'assistant') {
    await updateDoc(doc(db, 'users', assistantDoc.id), {
      assignedClassIds: arrayUnion(classId)
    });
  }
};
```

## Troubleshooting

### Common Issues

1. **Assistant không thấy menu Classes**
   - Kiểm tra role trong database
   - Verify session role

2. **Không thấy lớp nào**
   - Kiểm tra `assignedClassIds` trong user document
   - Verify class IDs tồn tại

3. **Lỗi permission**
   - Kiểm tra middleware configuration
   - Verify role trong session

### Debug Commands
```javascript
// Check assistant data
const assistant = await getUserByEmail('assistant@example.com');
console.log('Assistant data:', assistant);

// Check assigned classes
const classes = await getAssistantClasses('assistant@example.com');
console.log('Assigned classes:', classes);
```

## Future Enhancements

### Planned Features
- [ ] Admin UI để assign/unassign classes
- [ ] Assistant dashboard với statistics
- [ ] Notification system cho assistant
- [ ] Bulk operations cho class management
- [ ] Advanced permissions per class

### Considerations
- Performance optimization cho large number of classes
- Audit log cho assistant actions
- Role hierarchy (senior assistant, etc.)
