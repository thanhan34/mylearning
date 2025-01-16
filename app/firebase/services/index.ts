// Re-export types
export * from './types';

// Re-export services
export * from './user';
export * from './class';
export { getHomeworkSubmissions, saveHomeworkSubmission } from './homework';
export * from './notification';
export { getHomeworkProgress, getWeeklyProgress, getDailyProgress } from './progress';
export { getAdminStats } from './admin';

// Re-export specific functions for backward compatibility
export { getUserByEmail, createUser } from './user';
