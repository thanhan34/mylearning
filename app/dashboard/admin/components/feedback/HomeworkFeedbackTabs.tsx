'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/app/firebase/config';
import { Class } from '@/app/firebase/services/types';
import { User } from '@/app/firebase/services/user';

// Import sub-components
import FilterBar from './FilterBar';
import StatsOverview from './StatsOverview';
import TeacherStatsTable from './TeacherStatsTable';
import ClassStatsTable from './ClassStatsTable';
import RecentSubmissionsTable from './RecentSubmissionsTable';
import AllHomeworkTable from './AllHomeworkTable';

export default function HomeworkFeedbackTabs() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'overview' | 'all-homework' | 'with-feedback' | 'without-feedback'>('all-homework');
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('30');

  // Fetch static data (classes and teachers)
  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        // Fetch classes with real-time updates
        const classesQuery = collection(db, 'classes');
        const unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
          const classesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Class[];
          setClasses(classesData);
        });

        // Fetch teachers with real-time updates
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
          unsubscribeClasses();
          unsubscribeTeachers();
        };
      } catch (error) {
        console.error('Error fetching static data:', error);
      }
    };

    fetchStaticData();
  }, []);

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
        />
      )}
    </div>
  );
}

// Overview Tab Component (existing functionality)
function OverviewTab({
  selectedTimeframe,
  setSelectedTimeframe,
  selectedTeacher,
  setSelectedTeacher,
  selectedClass,
  setSelectedClass,
  teachers,
  classes
}: {
  selectedTimeframe: string;
  setSelectedTimeframe: (value: string) => void;
  selectedTeacher: string;
  setSelectedTeacher: (value: string) => void;
  selectedClass: string;
  setSelectedClass: (value: string) => void;
  teachers: User[];
  classes: Class[];
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

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">🚧</div>
          <h3 className="text-lg font-medium mb-2">Tính năng đang phát triển</h3>
          <p className="text-sm">
            Tab tổng quan feedback sẽ hiển thị thống kê chi tiết về feedback của giảng viên.
            Hiện tại bạn có thể sử dụng các tab khác để xem bài tập theo trạng thái feedback.
          </p>
        </div>
      </div>
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
  classes
}: {
  selectedTimeframe: string;
  setSelectedTimeframe: (value: string) => void;
  selectedTeacher: string;
  setSelectedTeacher: (value: string) => void;
  selectedClass: string;
  setSelectedClass: (value: string) => void;
  teachers: User[];
  classes: Class[];
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
  classes
}: {
  selectedTimeframe: string;
  setSelectedTimeframe: (value: string) => void;
  selectedTeacher: string;
  setSelectedTeacher: (value: string) => void;
  selectedClass: string;
  setSelectedClass: (value: string) => void;
  teachers: User[];
  classes: Class[];
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
  classes
}: {
  selectedTimeframe: string;
  setSelectedTimeframe: (value: string) => void;
  selectedTeacher: string;
  setSelectedTeacher: (value: string) => void;
  selectedClass: string;
  setSelectedClass: (value: string) => void;
  teachers: User[];
  classes: Class[];
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
  emptyIcon
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
    />
  );
}
