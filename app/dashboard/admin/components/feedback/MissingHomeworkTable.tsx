'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getMissingHomeworkStudents, MissingHomeworkStudent } from '../../../../firebase/services/homework-missing';
import { Class } from '../../../../firebase/services/types';
import {
  followStudentForUser,
  getUserByEmail,
  initializeMissingHomeworkFollowForUser,
  unfollowStudentForUser,
  User,
} from '../../../../firebase/services/user';

interface MissingHomeworkTableProps {
  selectedTimeframe: string;
  selectedTeacher: string;
  selectedClass: string;
  classes: Class[];
  teachers: User[];
  allowedClassIds?: string[];
}

export default function MissingHomeworkTable({
  selectedTimeframe,
  selectedTeacher,
  selectedClass,
  classes,
  teachers,
  allowedClassIds,
}: MissingHomeworkTableProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [followLoadingId, setFollowLoadingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState<MissingHomeworkStudent[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [followingStudentIds, setFollowingStudentIds] = useState<string[]>([]);
  const [showUnfollowed, setShowUnfollowed] = useState(false);
  const [followInitialized, setFollowInitialized] = useState(false);

  const teacherMap = useMemo(() => {
    return teachers.reduce((acc, teacher) => {
      acc[teacher.id] = teacher.name || teacher.email || 'Unknown Teacher';
      return acc;
    }, {} as Record<string, string>);
  }, [teachers]);

  useEffect(() => {
    const loadCurrentUser = async () => {
      if (!session?.user?.email) return;

      try {
        const user = await getUserByEmail(session.user.email);
        if (!user) return;

        setCurrentUserId(user.id);
        setFollowingStudentIds(user.followingStudentIds || []);
        setFollowInitialized(!!user.missingHomeworkFollowInitialized);
      } catch (error) {
        console.error('Error loading current user follow list:', error);
      }
    };

    loadCurrentUser();
  }, [session?.user?.email]);

  useEffect(() => {
    const load = async () => {
      if (!classes.length) {
        setData([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const rows = await getMissingHomeworkStudents({
          classes,
          timeframeDays: parseInt(selectedTimeframe),
          allowedClassIds,
          selectedTeacher,
          selectedClass,
        });
        setData(rows);
      } catch (error) {
        console.error('Error loading missing-homework list:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [allowedClassIds, classes, selectedClass, selectedTeacher, selectedTimeframe]);

  useEffect(() => {
    const initializeDefaultFollow = async () => {
      if (!currentUserId || followInitialized || !data.length) {
        return;
      }

      const allStudentIds = data.map((item) => item.studentId);
      const success = await initializeMissingHomeworkFollowForUser(currentUserId, allStudentIds);
      if (!success) {
        return;
      }

      setFollowingStudentIds(allStudentIds);
      setFollowInitialized(true);
    };

    initializeDefaultFollow();
  }, [currentUserId, data, followInitialized]);

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;

    const term = searchTerm.toLowerCase();
    return data.filter((item) =>
      item.studentName.toLowerCase().includes(term)
      || item.studentEmail.toLowerCase().includes(term)
      || item.className.toLowerCase().includes(term)
      || (teacherMap[item.teacherId] || '').toLowerCase().includes(term)
    );
  }, [data, searchTerm, teacherMap]);

  const followedData = useMemo(() => {
    const followedSet = new Set(followingStudentIds);
    return filteredData.filter((item) => followedSet.has(item.studentId));
  }, [filteredData, followingStudentIds]);

  const unfollowedData = useMemo(() => {
    const followedSet = new Set(followingStudentIds);
    return filteredData.filter((item) => !followedSet.has(item.studentId));
  }, [filteredData, followingStudentIds]);

  const handleToggleFollow = async (studentId: string) => {
    if (!currentUserId || followLoadingId) return;

    setFollowLoadingId(studentId);
    try {
      const isFollowing = followingStudentIds.includes(studentId);
      const success = isFollowing
        ? await unfollowStudentForUser(currentUserId, studentId)
        : await followStudentForUser(currentUserId, studentId);

      if (!success) {
        return;
      }

      setFollowingStudentIds((prev) => {
        if (isFollowing) {
          return prev.filter((id) => id !== studentId);
        }
        if (prev.includes(studentId)) {
          return prev;
        }
        return [...prev, studentId];
      });
    } catch (error) {
      console.error('Error toggling follow student:', error);
    } finally {
      setFollowLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-10 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#fc5d01] mx-auto mb-4" />
        <p className="text-gray-600">Đang tải danh sách học viên chưa nộp bài...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-lg font-semibold text-[#fc5d01]">
          Học viên chưa nộp bài trong {selectedTimeframe} ngày (đang follow: {followedData.length})
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUnfollowed((prev) => !prev)}
            className="px-3 py-2 border border-[#fdbc94] rounded-lg text-sm text-[#fc5d01] bg-[#fedac2] hover:bg-[#fdbc94]"
          >
            {showUnfollowed ? 'Ẩn danh sách đã unfollow' : `Hiện danh sách đã unfollow (${unfollowedData.length})`}
          </button>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm học viên/lớp/giảng viên..."
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#fc5d01]"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#fedac2]/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Học viên</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Lớp</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">GV</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Lần nộp gần nhất</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Số ngày chưa nộp</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Theo dõi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {followedData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Không có học viên đang follow trong danh sách chưa nộp bài.
                </td>
              </tr>
            ) : (
              followedData.map((item) => (
                <tr key={item.studentId} className="hover:bg-[#fedac2]/20">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{item.studentName}</p>
                    <p className="text-xs text-gray-500">{item.studentEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.className}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{teacherMap[item.teacherId] || 'Unknown Teacher'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {item.lastSubmissionDate || 'Chưa từng nộp'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#fedac2] text-[#fc5d01]">
                      {item.daysSinceLastSubmission ?? `>${selectedTimeframe}`} ngày
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleFollow(item.studentId)}
                      disabled={followLoadingId === item.studentId || !currentUserId}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 ${
                        followingStudentIds.includes(item.studentId)
                          ? 'bg-[#fc5d01] text-[#ffffff] hover:bg-[#fd7f33]'
                          : 'bg-[#fedac2] text-[#fc5d01] hover:bg-[#fdbc94]'
                      }`}
                    >
                      {followLoadingId === item.studentId
                        ? 'Đang xử lý...'
                        : followingStudentIds.includes(item.studentId)
                          ? 'Unfollow'
                          : 'Follow'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showUnfollowed && (
        <div className="border-t border-gray-200 px-6 py-4 bg-[#fedac2]/20">
          <h4 className="text-sm font-semibold text-[#fc5d01] mb-3">
            Danh sách đã unfollow ({unfollowedData.length}) — có thể Follow lại bất cứ lúc nào
          </h4>
          <div className="space-y-2">
            {unfollowedData.length === 0 ? (
              <p className="text-sm text-gray-600">Không có học viên nào đang ở trạng thái unfollow.</p>
            ) : (
              unfollowedData.map((item) => (
                <div key={`unfollowed-${item.studentId}`} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-[#fdbc94]">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.studentName}</p>
                    <p className="text-xs text-gray-500">{item.className} • {item.studentEmail}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleFollow(item.studentId)}
                    disabled={followLoadingId === item.studentId || !currentUserId}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#fedac2] text-[#fc5d01] hover:bg-[#fdbc94] disabled:opacity-60"
                  >
                    {followLoadingId === item.studentId ? 'Đang xử lý...' : 'Follow lại'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
