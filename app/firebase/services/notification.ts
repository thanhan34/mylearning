import { collection, doc, getDoc, getDocs, addDoc, deleteDoc, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../config';
import { Notification } from './types';
import { getUserByEmail } from './user';

export const addNotification = async (
  recipientEmail: string, 
  message: string, 
  type: 'teacher' | 'admin' | 'assistant'
): Promise<boolean> => {
  try {
    console.log('Adding notification:', { recipientEmail, type });
    
    const userDoc = await getUserByEmail(recipientEmail);
    if (!userDoc) {
      console.error('User not found:', recipientEmail);
      return false;
    }

    const notificationsRef = collection(db, 'notifications');
    const notificationData: any = {
      message,
      created_at: Timestamp.now(),
      is_read: false
    };

    if (type === 'teacher') {
      if (!userDoc.teacherId) {
        console.error('No teacher assigned to student:', {
          studentEmail: recipientEmail,
          studentId: userDoc.id
        });
        return false;
      }
      notificationData.teacher_id = userDoc.teacherId;
    } else if (type === 'admin') {
      notificationData.admin_id = userDoc.id;
    }

    const notificationDoc = await addDoc(notificationsRef, notificationData);

    console.log('Notification created successfully:', {
      notificationId: notificationDoc.id,
      recipientId: type === 'teacher' ? userDoc.teacherId : userDoc.id,
      type
    });

    return true;
  } catch (error) {
    console.error('Error adding notification:', error);
    return false;
  }
};

export const getUnreadNotifications = async (userEmail: string, type: 'teacher' | 'admin' | 'assistant'): Promise<Notification[]> => {
  try {
    const notificationsRef = collection(db, 'notifications');
    
    const userDoc = await getUserByEmail(userEmail);
    if (!userDoc) {
      console.error('User not found:', userEmail);
      return [];
    }
    
    
    
    // Determine the field to query based on user role
    const fieldName = type === 'teacher' ? 'teacher_id' : 'admin_id';
    
    const q = query(
      notificationsRef,
      where(fieldName, '==', userDoc.id),
      where('is_read', '==', false),
      orderBy('created_at', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Notification));
  } catch (error) {
    console.error('Error getting unread notifications:', error);
    return [];
  }
};

export const subscribeToNotifications = async (
  userEmail: string,
  type: 'teacher' | 'admin' | 'assistant',
  callback: (notifications: Notification[]) => void,
  onError?: (error: Error) => void
): Promise<() => void> => {
  try {
    
    
    const notificationsRef = collection(db, 'notifications');
    const userDoc = await getUserByEmail(userEmail);
    if (!userDoc) {
      throw new Error('User not found');
    }
    
    
    
    // Determine the field to query based on user role
    const fieldName = type === 'teacher' ? 'teacher_id' : 'admin_id';
    
    const q = query(
      notificationsRef,
      where(fieldName, '==', userDoc.id),
      where('is_read', '==', false),
      orderBy('created_at', 'desc')
    );

    try {
      const initialSnapshot = await getDocs(q);
      

      if (initialSnapshot.size > 0) {
        const notifications = initialSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Notification));
        callback(notifications);
      }
    } catch (error) {
      console.error('Error getting initial notifications:', error);
      if (onError && error instanceof Error) onError(error);
    }

    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        
        
        const notifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Notification));
        
        callback(notifications);
      },
      (error) => {
        console.error('Error in notifications subscription:', {
          error,
          email: userEmail,
          userId: userDoc.id,
          type,
          timestamp: new Date().toISOString()
        });
        if (onError) onError(error);
      }
    );

    return () => {
      console.log('Unsubscribing from notifications:', {
        email: userEmail,
        userId: userDoc.id,
        type,
        timestamp: new Date().toISOString()
      });
      unsubscribe();
    };
  } catch (error) {
    console.error('Error setting up notification subscription:', {
      error,
      email: userEmail,
      type,
      timestamp: new Date().toISOString()
    });
    if (onError && error instanceof Error) onError(error);
    return () => {};
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await deleteDoc(notificationRef);
    console.log('Notification deleted:', notificationId);
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
};
