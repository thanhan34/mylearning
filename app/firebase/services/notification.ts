import { collection, doc, getDoc, getDocs, addDoc, deleteDoc, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../config';
import { Notification } from './types';
import { getUserByEmail } from './user';

export const addNotification = async (studentEmail: string, message: string): Promise<boolean> => {
  try {
    console.log('Adding notification for student:', studentEmail);
    
    const userDoc = await getUserByEmail(studentEmail);
    if (!userDoc) {
      console.error('Student not found:', studentEmail);
      return false;
    }
    
    if (!userDoc.teacherId) {
      console.error('No teacher assigned to student:', {
        studentEmail,
        studentId: userDoc.id
      });
      return false;
    }

    console.log('Creating notification:', {
      studentEmail,
      teacherId: userDoc.teacherId,
      message
    });

    const notificationsRef = collection(db, 'notifications');
    const notificationDoc = await addDoc(notificationsRef, {
      teacher_id: userDoc.teacherId,
      message,
      created_at: Timestamp.now(),
      is_read: false
    });

    console.log('Notification created successfully:', {
      notificationId: notificationDoc.id,
      teacherId: userDoc.teacherId
    });

    return true;
  } catch (error) {
    console.error('Error adding notification:', error);
    return false;
  }
};

export const getUnreadNotifications = async (teacherEmail: string): Promise<Notification[]> => {
  try {
    const notificationsRef = collection(db, 'notifications');
    
    // Get the teacher's ID from their email
    const teacherDoc = await getUserByEmail(teacherEmail);
    if (!teacherDoc) {
      console.error('Teacher not found:', teacherEmail);
      return [];
    }
    
    console.log('Getting unread notifications for teacher:', {
      email: teacherEmail,
      id: teacherDoc.id
    });
    
    const q = query(
      notificationsRef,
      where('teacher_id', '==', teacherDoc.id),
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
  teacherEmail: string,
  callback: (notifications: Notification[]) => void,
  onError?: (error: Error) => void
): Promise<() => void> => {
  try {
    console.log('Subscribing to notifications for:', teacherEmail);
    
    const notificationsRef = collection(db, 'notifications');
    // Get the teacher's ID from their email
    const teacherDoc = await getUserByEmail(teacherEmail);
    if (!teacherDoc) {
      throw new Error('Teacher not found');
    }
    
    console.log('Found teacher:', {
      email: teacherEmail,
      id: teacherDoc.id
    });
    
    // Create the query with proper index usage
    const q = query(
      notificationsRef,
      where('teacher_id', '==', teacherDoc.id),
      where('is_read', '==', false),
      orderBy('created_at', 'desc')
    );

    // Log query parameters for debugging
    console.log('Setting up notifications query:', {
      teacherEmail,
      teacherId: teacherDoc.id,
      timestamp: new Date().toISOString()
    });

    try {
      // First, get initial notifications
      const initialSnapshot = await getDocs(q);
      console.log('Initial notifications:', {
        count: initialSnapshot.size,
        notifications: initialSnapshot.docs.map(doc => ({
          id: doc.id,
          teacher_id: doc.data().teacher_id,
          message: doc.data().message,
          created_at: doc.data().created_at?.toDate()?.toISOString()
        }))
      });

      // If we got initial notifications, call the callback
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
        console.log('Snapshot received:', {
          size: snapshot.size,
          empty: snapshot.empty,
          docs: snapshot.docs.map(doc => ({
            id: doc.id,
            teacher_id: doc.data().teacher_id,
            message: doc.data().message,
            is_read: doc.data().is_read,
            created_at: doc.data().created_at?.toDate()?.toISOString()
          }))
        });
        
        const notifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Notification));
        
        callback(notifications);
      },
      (error) => {
        console.error('Error in notifications subscription:', {
          error,
          email: teacherEmail,
          teacherId: teacherDoc.id,
          timestamp: new Date().toISOString()
        });
        if (onError) onError(error);
      }
    );

    // Return unsubscribe function
    return () => {
      console.log('Unsubscribing from notifications:', {
        email: teacherEmail,
        teacherId: teacherDoc.id,
        timestamp: new Date().toISOString()
      });
      unsubscribe();
    };
  } catch (error) {
    console.error('Error setting up notification subscription:', {
      error,
      email: teacherEmail,
      timestamp: new Date().toISOString()
    });
    if (onError && error instanceof Error) onError(error);
    return () => {}; // Return empty cleanup function
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
