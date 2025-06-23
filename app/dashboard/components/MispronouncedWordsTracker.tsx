'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { getUserByEmail } from '../../firebase/services/user';
import { 
  addMispronouncedWord, 
  getPersonalWords, 
  getCommonWords,
  deleteMispronouncedWord 
} from '../../firebase/services/mispronounced-words';
import { migrateMispronouncedWords } from '../../firebase/services/migrate-mispronounced-words';
import type { PersonalWordCount, WordStatistic } from '../../../types/mispronounced-words';

interface MispronouncedWordsTrackerProps {
  userRole?: string;
}

// Cache for common words to reduce Firebase calls
let commonWordsCache: { data: WordStatistic[]; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function MispronouncedWordsTracker({ userRole }: MispronouncedWordsTrackerProps) {
  const { data: session } = useSession();
  // Set default tab based on user role
  const [activeTab, setActiveTab] = useState<'personal' | 'common'>(
    userRole === 'student' ? 'personal' : 'common'
  );
  const [newWord, setNewWord] = useState('');
  const [personalWords, setPersonalWords] = useState<PersonalWordCount[]>([]);
  const [commonWords, setCommonWords] = useState<WordStatistic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [dataLoaded, setDataLoaded] = useState({ personal: false, common: false });

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      if (session?.user?.email) {
        const user = await getUserByEmail(session.user.email);
        setCurrentUser(user);
      }
    };
    loadUser();
  }, [session]);

  // Optimized data loading with caching
  const loadPersonalWords = useCallback(async () => {
    if (!currentUser || dataLoaded.personal) return;
    
    setIsLoading(true);
    try {
      const words = await getPersonalWords(currentUser.id);
      setPersonalWords(words || []);
      setDataLoaded(prev => ({ ...prev, personal: true }));
    } catch (error) {
      console.error('Error loading personal words:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, dataLoaded.personal]);

  const loadCommonWords = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && commonWordsCache && 
        Date.now() - commonWordsCache.timestamp < CACHE_DURATION) {
      setCommonWords(commonWordsCache.data);
      setDataLoaded(prev => ({ ...prev, common: true }));
      return;
    }

    if (!forceRefresh && dataLoaded.common) return;

    setIsLoading(true);
    try {
      const words = await getCommonWords(30); // Limit to 30 words to reduce data usage
      setCommonWords(words || []);
      
      // Update cache
      commonWordsCache = {
        data: words || [],
        timestamp: Date.now()
      };
      
      setDataLoaded(prev => ({ ...prev, common: true }));
    } catch (error) {
      console.error('Error loading common words:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dataLoaded.common]);

  // Load data when user is loaded or tab changes
  useEffect(() => {
    if (!currentUser) return;

    if (activeTab === 'personal' && userRole === 'student') {
      loadPersonalWords();
    } else if (activeTab === 'common') {
      loadCommonWords();
    }
  }, [currentUser, activeTab, userRole, loadPersonalWords, loadCommonWords]);

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || !currentUser || userRole !== 'student') return;

    setIsSubmitting(true);
    try {
      const success = await addMispronouncedWord(
        currentUser.id,
        currentUser.name || session?.user?.name || 'Unknown',
        newWord.trim(),
        currentUser.classId
      );

      if (success) {
        setNewWord('');
        
        // Optimized data refresh - only reload what's needed
        if (activeTab === 'personal') {
          // Reset personal data loaded flag to force refresh
          setDataLoaded(prev => ({ ...prev, personal: false }));
          await loadPersonalWords();
        } else {
          // Invalidate cache and reload common words
          commonWordsCache = null;
          setDataLoaded(prev => ({ ...prev, common: false }));
          await loadCommonWords(true);
        }
      } else {
        // Word already exists for this student
        alert('Từ này đã có trong danh sách của bạn rồi!');
      }
    } catch (error) {
      console.error('Error adding word:', error);
      alert('Có lỗi xảy ra khi thêm từ. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMigration = async () => {
    if (userRole !== 'admin') return;
    
    const confirmed = confirm('Bạn có chắc chắn muốn đồng bộ dữ liệu cũ? Thao tác này sẽ tạo lại danh sách chung từ dữ liệu hiện có.');
    if (!confirmed) return;

    setIsMigrating(true);
    try {
      await migrateMispronouncedWords();
      alert('Đồng bộ dữ liệu thành công!');
      
      // Invalidate cache and reload common words after migration
      commonWordsCache = null;
      setDataLoaded(prev => ({ ...prev, common: false }));
      await loadCommonWords(true);
    } catch (error) {
      console.error('Error during migration:', error);
      alert('Có lỗi xảy ra khi đồng bộ dữ liệu. Vui lòng thử lại.');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDeleteWord = async (wordData: PersonalWordCount) => {
    if (!currentUser || userRole !== 'student' || !wordData.id) return;
    
    const confirmed = confirm(`Bạn có chắc chắn muốn xóa từ "${wordData.word}" khỏi danh sách cá nhân?`);
    if (!confirmed) return;

    try {
      const success = await deleteMispronouncedWord(
        wordData.id,
        currentUser.id,
        wordData.word,
        currentUser.name || session?.user?.name || 'Unknown'
      );

      if (success) {
        // Optimized data refresh - only reload what's needed
        if (activeTab === 'personal') {
          // Reset personal data loaded flag to force refresh
          setDataLoaded(prev => ({ ...prev, personal: false }));
          await loadPersonalWords();
        } else {
          // Invalidate cache and reload common words
          commonWordsCache = null;
          setDataLoaded(prev => ({ ...prev, common: false }));
          await loadCommonWords(true);
        }
      } else {
        alert('Có lỗi xảy ra khi xóa từ. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Error deleting word:', error);
      alert('Có lỗi xảy ra khi xóa từ. Vui lòng thử lại.');
    }
  };

  const canViewCommon = userRole === 'teacher' || userRole === 'assistant' || userRole === 'admin' || userRole === 'student';
  const canAddWords = userRole === 'student';

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#fc5d01] to-[#fd7f33] rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m0 0v8a2 2 0 002 2h6a2 2 0 002-2V8M9 12h6" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-[#fc5d01]">
              Từ phát âm sai thường gặp
            </h3>
            <p className="text-sm text-gray-600">Theo dõi và cải thiện phát âm của bạn</p>
          </div>
        </div>
        
        {/* Migration button for admin */}
        {userRole === 'admin' && (
          <button
            onClick={handleMigration}
            disabled={isMigrating}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isMigrating ? 'Đang đồng bộ...' : 'Đồng bộ dữ liệu cũ'}
          </button>
        )}
      </div>

      {/* Add Word Form - Only for students */}
      {canAddWords && (
        <div className="mb-6 p-4 bg-gradient-to-r from-[#fedac2] to-[#fdbc94] rounded-lg">
          <h4 className="text-sm font-medium text-[#fc5d01] mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Thêm từ mới
          </h4>
          <form onSubmit={handleAddWord}>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="Nhập từ tiếng Anh bạn thường phát âm sai..."
                className="flex-1 px-4 py-3 border border-white/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fc5d01] focus:border-transparent bg-white/80 backdrop-blur-sm placeholder-gray-500"
                disabled={isSubmitting}
              />
              <button
                type="submit"
                disabled={isSubmitting || !newWord.trim()}
                className="bg-[#fc5d01] text-white px-6 py-3 rounded-lg hover:bg-[#fd7f33] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Đang thêm...
                  </div>
                ) : (
                  'Thêm từ'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        {canAddWords && (
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'personal'
                ? 'bg-[#fc5d01] text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Danh sách cá nhân ({personalWords.length})
          </button>
        )}
        {canViewCommon && (
          <button
            onClick={() => setActiveTab('common')}
            className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'common'
                ? 'bg-[#fc5d01] text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Danh sách chung ({commonWords.length})
          </button>
        )}
      </div>

      {/* Content */}
      <div className="min-h-[200px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-3 border-[#fedac2] border-t-[#fc5d01] mb-4"></div>
            <p className="text-gray-500 text-sm">Đang tải dữ liệu...</p>
          </div>
        ) : (
          <>
            {/* Personal Words Tab */}
            {activeTab === 'personal' && canAddWords && (
              <div>
                {personalWords.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#fedac2] to-[#fdbc94] rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-[#fc5d01]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Chưa có từ nào trong danh sách</h4>
                    <p className="text-gray-500 text-sm max-w-md mx-auto">Hãy thêm những từ bạn thường phát âm sai để theo dõi và cải thiện!</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {personalWords.map((wordData, index) => (
                      <div
                        key={wordData.word}
                        className="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-lg hover:from-[#fedac2]/20 hover:to-[#fdbc94]/20 transition-all duration-200 border border-gray-200/50 hover:border-[#fc5d01]/30 hover:shadow-md"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-gradient-to-br from-[#fc5d01] to-[#fd7f33] rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900 text-lg">
                              {wordData.word}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              Thêm vào: {new Date(wordData.lastAdded).toLocaleDateString('vi-VN')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="bg-gradient-to-r from-[#fc5d01] to-[#fd7f33] text-white px-3 py-1.5 rounded-full text-sm font-medium shadow-sm">
                            {wordData.count} lần
                          </span>
                          <button
                            onClick={() => handleDeleteWord(wordData)}
                            className="opacity-0 group-hover:opacity-100 bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105"
                            title="Xóa từ"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Common Words Tab */}
            {activeTab === 'common' && canViewCommon && (
              <div>
                {commonWords.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#fedac2] to-[#fdbc94] rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-[#fc5d01]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Chưa có dữ liệu từ chung</h4>
                    <p className="text-gray-500 text-sm">Dữ liệu sẽ được cập nhật khi có học viên thêm từ mới.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {commonWords.map((wordStat, index) => (
                      <div
                        key={wordStat.word}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-lg border border-gray-200/50 hover:border-[#fc5d01]/30 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-gradient-to-br from-[#fc5d01] to-[#fd7f33] rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900 text-lg">
                              {wordStat.word}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              Cập nhật: {new Date(wordStat.lastUpdated).toLocaleDateString('vi-VN')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="bg-gradient-to-r from-[#fc5d01] to-[#fd7f33] text-white px-4 py-2 rounded-full text-sm font-medium shadow-sm">
                            {wordStat.totalCount} học viên
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
