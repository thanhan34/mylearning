"use client";

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Notification, 
  subscribeToNotifications, 
  markNotificationAsRead,
  getUserByEmail,
  getUnreadNotifications
} from '../firebase/services';
import { Timestamp } from 'firebase/firestore';

interface NotificationBellProps {
  userRole: "teacher" | "admin" | "student";
}

export default function NotificationBell({ userRole }: NotificationBellProps) {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<(() => void) | undefined>();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const setupNotifications = async () => {
      // Clear any existing subscription
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = undefined;
      }

      console.log('NotificationBell useEffect:', {
        email: session?.user?.email,
        userRole,
        isTeacher: userRole === 'teacher'
      });

      if (!session?.user?.email || (userRole !== 'teacher' && userRole !== 'admin')) {
        console.log('NotificationBell: Conditions not met for notifications');
        setNotifications([]);
        setIsLoading(false);
        return;
      }

      try {
        // Reset state
        setError(null);
        setIsLoading(true);
        setNotifications([]);

        // Get initial notifications
        const initialNotifications = await getUnreadNotifications(session.user.email, userRole);
        console.log('Initial notifications:', {
          count: initialNotifications.length,
          notifications: initialNotifications.map(n => ({
            id: n.id,
            message: n.message,
            created_at: n.created_at instanceof Timestamp ? n.created_at.toDate().toISOString() : null
          }))
        });
        
        if (!initialNotifications.length) {
          setIsLoading(false);
        }

        setNotifications(initialNotifications);

        // Subscribe to real-time updates
        console.log('Setting up notifications subscription for:', session.user.email);
        const unsubscribe = await subscribeToNotifications(
          session.user.email,
          userRole,
          (newNotifications) => {
            console.log('Received notifications update:', {
              count: newNotifications.length,
              notifications: newNotifications.map(n => ({
                id: n.id,
                message: n.message,
                created_at: n.created_at instanceof Timestamp ? n.created_at.toDate().toISOString() : null
              }))
            });
            setNotifications(newNotifications);
            setIsLoading(false);
          },
          (error) => {
            console.error('Notification error:', {
              message: error.message,
              stack: error.stack,
              email: session.user.email
            });
            setError(error.message);
            setIsLoading(false);
          }
        );

        unsubscribeRef.current = unsubscribe;
      } catch (error) {
        console.error('Error in setupNotifications:', error);
        setError('Error setting up notifications');
        setIsLoading(false);
      }
    };

    setupNotifications();

    return () => {
      console.log('Cleaning up notification subscription');
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = undefined;
      }
      setNotifications([]);
      setError(null);
    };
  }, [session?.user?.email, userRole]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const success = await markNotificationAsRead(notificationId);
      if (success) {
        setNotifications(notifications.filter(n => n.id !== notificationId));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const formatDate = (timestamp: Timestamp | null | undefined) => {
    if (!timestamp || !(timestamp instanceof Timestamp)) {
      return 'Invalid date';
    }
    try {
      return timestamp.toDate().toLocaleString('vi-VN');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-[#fc5d01] focus:outline-none transition-colors duration-300"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 transform transition-transform duration-300 hover:scale-110"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-[#fc5d01] rounded-full animate-pulse">
            {notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-96 bg-white rounded-xl shadow-xl z-50 max-h-[80vh] overflow-y-auto transform transition-all duration-300 ease-out origin-top-right">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-[#fc5d01] mb-1">Thông báo</h3>
            <p className="text-xs text-gray-500">Nhấn X để xóa thông báo</p>
          </div>
          <div className="p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-[#fc5d01] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-red-500 text-center">
                  {error}. Vui lòng thử lại sau.
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 px-4">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="mt-4 text-gray-500">Không có thông báo mới</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="mx-2 p-4 bg-gradient-to-r from-[#fedac2] to-white rounded-lg relative group hover:shadow-lg transition-all duration-300 border border-[#fc5d01]/10"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-8">
                        <p className="text-gray-800 text-sm font-medium leading-relaxed">
                          {notification.message}
                        </p>
                        <span className="text-xs text-gray-500 mt-2 block">
                          {formatDate(notification.created_at)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="absolute top-2 right-2 p-2 text-[#fc5d01] hover:text-white hover:bg-[#fc5d01] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform hover:scale-110"
                        title="Xóa thông báo"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
