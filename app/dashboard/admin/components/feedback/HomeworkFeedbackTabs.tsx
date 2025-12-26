'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/app/firebase/config';
import { Class } from '@/app/firebase/services/types';
import { User, getUserByEmail } from '@/app/firebase/services/user';
import { getTeacherClasses, getAssistantClasses } from '@/app/firebase/services/class';

// Import sub-components
import FilterBar from './FilterBar';
import OverviewStats from './OverviewStats';
import AllHomeworkTable from './AllHomeworkTable';

interface HomeworkFeedbackTabsProps {
  userRole?: 'admin' | 'teacher' | 'assistant';
}

export default function HomeworkFeedbackTabs({ userRole = 'admin' }: HomeworkFeedbackTabsProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'overview' | 'all-homework' | 'with-feedback' | 'without-feedback'>('all-homework');
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('7'); // Giảm từ 30 xuống 7 ngày để load nhanh hơn
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [allowedClassIds, setAllowedClassIds] = useState<string[]>([]);

  // Fetch static data (classes and teachers) - with role-based filtering
  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        if (!session?.user?.email) return;

        // Get current user info
        const user = await getUserByEmail(session.user.email);
        if (!user) return;
        
        setCurrentUserId(user.id);

        let classesData: Class[] = [];

        if (userRole === 'admin') {
          // Admin sees all classes - no filtering
          const classesQuery = collection(db, 'classes');
          const unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
            classesData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as Class[];
            setClasses(classesData);
          });
          setAllowedClassIds([]); // Empty means see all
        } else if (userRole === 'teacher') {
          // Teacher sees only their classes
          classesData = await getTeacherClasses(session.user.email);
          setClasses(classesData);
          
          // Set allowed class IDs for filtering homework
          setAllowedClassIds(classesData.map(c => c.id));
          
          // Auto-select teacher's own ID if they're viewing
          setSelectedTeacher(user.id);
        } else if (userRole === 'assistant') {
          // Assistant sees ALL classes (like admin) but gets their assigned classes
          const assignedClasses = await getAssistantClasses(session.user.email);
          
          // Fetch ALL classes for assistant to see all homework
          const allClassesQuery = collection(db, 'classes');
          const allClassesSnapshot = await getDocs(allClassesQuery);
          classesData = allClassesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Class[];
          
          setClasses(classesData);
          setAllowedClassIds([]); // Empty means see all (assistant can see everything)
          
          // Auto-select assistant's teacher ID
          setSelectedTeacher('all');
        }

        // Fetch teachers with real-time updates (for filter dropdown)
        const teachersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'teacher')
        );
        const unsubscribeTeachers = onSnapshot(teachersQuery, (snapshot) => {
          const teachersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as User[];
          setTeachers(teachersData);
        });

        return () => {
          if (unsubscribeTeachers) unsubscribeTeachers();
        };
      } catch (error) {
        console.error('Error fetching static data:', error);
      }
    };

    fetchStaticData();
  }, [session, userRole]);

  const tabs = [
    {
      id: 'overview' as const,
      name: 'Tổng quan Feedback',
      icon: '📊',
      description: 'Thống kê và phân tích feedback'
    },
    {
      id: 'all-homework' as const,
      name: 'Toàn bộ bài tập',
      icon: '📚',
      description: 'Xem tất cả bài tập về nhà'
    },
    {
      id: 'with-feedback' as const,
      name: 'Đã có feedback',
      icon: '✅',
      description: 'Bài tập đã được sửa'
    },
    {
      id: 'without-feedback' as const,
      name: 'Chưa có feedback',
      icon: '⏳',
      description: 'Bài tập chờ sửa'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex flex-wrap gap-2 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#fc5d01] text-[#fc5d01]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{tab.icon}</span>
                  <div className="flex flex-col items-start">
                    <span className="whitespace-nowrap">{tab.name}</span>
                    <span className="text-xs text-gray-400 font-normal">{tab.description}</span>
                  </div>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab
          selectedTimeframe={selectedTimeframe}
          setSelectedTimeframe={setSelectedTimeframe}
          selectedTeacher={selectedTeacher}
          setSelectedTeacher={setSelectedTeacher}
          selectedClass={selectedClass}
          setSelectedClass={setSelectedClass}
          teachers={teachers}
          classes={classes}
          allowedClassIds={allowedClassIds}
        />
      )}

      {activeTab === 'all-homework' && (
        <AllHomeworkTab
          selectedTimeframe={selectedTimeframe}
          setSelectedTimeframe={setSelectedTimeframe}
          selectedTeacher={selectedTeacher}
          setSelectedTeacher={setSelectedTeacher}
          selectedClass={selectedClass}
          setSelectedClass={setSelectedClass}
          teachers={teachers}
          classes={classes}
          allowedClassIds={allowedClassIds}
        />
      )}

      {activeTab === 'with-feedback' && (
        <WithFeedbackTab
          selectedTimeframe={selectedTimeframe}
          setSelectedTimeframe={setSelectedTimeframe}
          selectedTeacher={selectedTeacher}
          setSelectedTeacher={setSelectedTeacher}
          selectedClass={selectedClass}
          setSelectedClass={setSelectedClass}
          teachers={teachers}
          classes={classes}
          allowedClassIds={allowedClassIds}
        />
      )}

      {activeTab === 'without-feedback' && (
        <WithoutFeedbackTab
          selectedTimeframe={selectedTimeframe}
          setSelectedTimeframe={setSelectedTimeframe}
          selectedTeacher={selectedTeacher}
          setSelectedTeacher={setSelectedTeacher}
          selectedClass={selectedClass}
          setSelectedClass={setSelectedClass}
          teachers={teachers}
          classes={classes}
          allowedClassIds={allowedClassIds}
        />
      )}
    </div>
  );
}

// Overview Tab Component
function OverviewTab({
  selectedTimeframe,
  setSelectedTimeframe,
  selectedTeacher,
  setSelectedTeacher,
  selectedClass,
  setSelectedClass,
  teachers,
  classes,
  allowedClassIds
}: {
  selectedTimeframe: string;
  setSelectedTimeframe: (value: string) => void;
  selectedTeacher: string;
  setSelectedTeacher: (value: string) => void;
  selectedClass: string;
  setSelectedClass: (value: string) => void;
  teachers: User[];
  classes: Class[];
  allowedClassIds?: string[];
}) {
  return (
    <div className="space-y-6">
      <FilterBar 
        selectedTimeframe={selectedTimeframe}
        setSelectedTimeframe={setSelectedTimeframe}
        selectedTeacher={selectedTeacher}
        setSelectedTeacher={setSelectedTeacher}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        teachers={teachers}
        classes={classes}
      />

      <OverviewStats
        selectedTimeframe={selectedTimeframe}
        selectedTeacher={selectedTeacher}
        selectedClass={selectedClass}
        teachers={teachers}
        classes={classes}
        allowedClassIds={allowedClassIds}
      />
    </div>
  );
}

// All Homework Tab Component
function AllHomeworkTab({
  selectedTimeframe,
  setSelectedTimeframe,
  selectedTeacher,
  setSelectedTeacher,
  selectedClass,
  setSelectedClass,
  teachers,
  classes,
  allowedClassIds
}: {
  selectedTimeframe: string;
  setSelectedTimeframe: (value: string) => void;
  selectedTeacher: string;
  setSelectedTeacher: (value: string) => void;
  selectedClass: string;
  setSelectedClass: (value: string) => void;
  teachers: User[];
  classes: Class[];
  allowedClassIds?: string[];
}) {
  return (
    <div className="space-y-6">
      <FilterBar 
        selectedTimeframe={selectedTimeframe}
        setSelectedTimeframe={setSelectedTimeframe}
        selectedTeacher={selectedTeacher}
        setSelectedTeacher={setSelectedTeacher}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        teachers={teachers}
        classes={classes}
      />

      <AllHomeworkTable
        selectedTimeframe={selectedTimeframe}
        selectedTeacher={selectedTeacher}
        selectedClass={selectedClass}
        teachers={teachers}
        classes={classes}
        allowedClassIds={allowedClassIds}
      />
    </div>
  );
}

// With Feedback Tab Component
function WithFeedbackTab({
  selectedTimeframe,
  setSelectedTimeframe,
  selectedTeacher,
  setSelectedTeacher,
  selectedClass,
  setSelectedClass,
  teachers,
  classes,
  allowedClassIds
}: {
  selectedTimeframe: string;
  setSelectedTimeframe: (value: string) => void;
  selectedTeacher: string;
  setSelectedTeacher: (value: string) => void;
  selectedClass: string;
  setSelectedClass: (value: string) => void;
  teachers: User[];
  classes: Class[];
  allowedClassIds?: string[];
}) {
  return (
    <div className="space-y-6">
      <FilterBar 
        selectedTimeframe={selectedTimeframe}
        setSelectedTimeframe={setSelectedTimeframe}
        selectedTeacher={selectedTeacher}
        setSelectedTeacher={setSelectedTeacher}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        teachers={teachers}
        classes={classes}
      />

      <FilteredHomeworkTable
        selectedTimeframe={selectedTimeframe}
        selectedTeacher={selectedTeacher}
        selectedClass={selectedClass}
        teachers={teachers}
        classes={classes}
        filterType="with-feedback"
        title="Bài tập đã có feedback"
        emptyMessage="Không có bài tập nào đã được feedback trong khoảng thời gian này"
        emptyIcon="✅"
        allowedClassIds={allowedClassIds}
        showFeedbackByFilter={true}
      />
    </div>
  );
}

// Without Feedback Tab Component
function WithoutFeedbackTab({
  selectedTimeframe,
  setSelectedTimeframe,
  selectedTeacher,
  setSelectedTeacher,
  selectedClass,
  setSelectedClass,
  teachers,
  classes,
  allowedClassIds
}: {
  selectedTimeframe: string;
  setSelectedTimeframe: (value: string) => void;
  selectedTeacher: string;
  setSelectedTeacher: (value: string) => void;
  selectedClass: string;
  setSelectedClass: (value: string) => void;
  teachers: User[];
  classes: Class[];
  allowedClassIds?: string[];
}) {
  return (
    <div className="space-y-6">
      <FilterBar 
        selectedTimeframe={selectedTimeframe}
        setSelectedTimeframe={setSelectedTimeframe}
        selectedTeacher={selectedTeacher}
        setSelectedTeacher={setSelectedTeacher}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        teachers={teachers}
        classes={classes}
      />

      <FilteredHomeworkTable
        selectedTimeframe={selectedTimeframe}
        selectedTeacher={selectedTeacher}
        selectedClass={selectedClass}
        teachers={teachers}
        classes={classes}
        filterType="without-feedback"
        title="Bài tập chưa có feedback"
        emptyMessage="Tuyệt vời! Tất cả bài tập đã được feedback"
        emptyIcon="🎉"
        allowedClassIds={allowedClassIds}
      />
    </div>
  );
}

// Filtered Homework Table Component
function FilteredHomeworkTable({
  selectedTimeframe,
  selectedTeacher,
  selectedClass,
  teachers,
  classes,
  filterType,
  title,
  emptyMessage,
  emptyIcon,
  allowedClassIds,
  showFeedbackByFilter
}: {
  selectedTimeframe: string;
  selectedTeacher: string;
  selectedClass: string;
  teachers: User[];
  classes: Class[];
  filterType: 'with-feedback' | 'without-feedback';
  title: string;
  emptyMessage: string;
  emptyIcon: string;
  allowedClassIds?: string[];
  showFeedbackByFilter?: boolean;
}) {
  return (
    <AllHomeworkTable
      selectedTimeframe={selectedTimeframe}
      selectedTeacher={selectedTeacher}
      selectedClass={selectedClass}
      teachers={teachers}
      classes={classes}
      feedbackFilter={filterType}
      customTitle={title}
      customEmptyMessage={emptyMessage}
      customEmptyIcon={emptyIcon}
      allowedClassIds={allowedClassIds}
      showFeedbackByFilter={showFeedbackByFilter}
    />
  );
}
