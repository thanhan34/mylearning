import { addNotification } from './notification';

export const sendTestNotificationToAdmin = async (adminEmail: string): Promise<boolean> => {
  try {
    
    const result = await addNotification(
      adminEmail,
      'Đây là thông báo kiểm tra cho admin. Nếu bạn nhìn thấy thông báo này, tính năng thông báo đã hoạt động bình thường.',
      'admin'
    );
    
    return result;
  } catch (error) {
    console.error('Error sending test notification:', error);
    return false;
  }
};
