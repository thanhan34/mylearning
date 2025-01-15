"use client";

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Notification, subscribeToNotifications, markNotificationAsRead } from '../firebase/services';

export default function NotificationBell() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    if (session?.user?.email) {
      setError(null);
      setIsLoading(true);
      
      // Subscribe to notifications
      const unsubscribe = subscribeToNotifications(
        session.user.email,
        (newNotifications) => {
          setNotifications(newNotifications);
          setIsLoading(false);
        },
        (error) => {
          console.error('Notification error:', error);
          setError(error.message);
          setIsLoading(false);
        }
      );

      return () => {
        unsubscribe();
      };
    }
  }, [session?.user?.email]);

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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 focus:outline-none"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
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
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-[#fc5d01] rounded-full">
            {notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông báo</h3>
            {isLoading ? (
              <p className="text-gray-500 text-center py-4">Đang tải thông báo...</p>
            ) : error ? (
              <p className="text-red-500 text-center py-4">
                Lỗi: {error}. Vui lòng thử lại sau.
              </p>
            ) : notifications.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Không có thông báo mới</p>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-3 bg-[#fedac2] rounded-lg relative group"
                  >
                    <p className="text-gray-800 text-sm">{notification.message}</p>
                    <span className="text-xs text-gray-500 mt-1 block">
                      {notification.created_at.toDate().toLocaleString('vi-VN')}
                    </span>
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="absolute top-2 right-2 text-xs text-[#fc5d01] hover:text-[#fd7f33] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Đánh dấu đã đọc
                    </button>
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
