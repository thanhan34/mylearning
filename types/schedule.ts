export interface Schedule {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO datetime
  endTime: string;   // ISO datetime
  location?: string;
  type: 'class' | 'exam' | 'meeting' | 'other';
  
  // Participants
  classIds?: string[];     // Classes involved
  studentIds?: string[];   // Specific students
  teacherIds?: string[];   // Teachers involved
  
  // Recurring schedule fields
  isRecurring?: boolean;
  recurringPattern?: {
    frequency: 'weekly' | 'daily' | 'monthly';
    daysOfWeek?: number[]; // 0=Sunday, 1=Monday, etc.
    interval?: number;     // Every N weeks/days/months
    endDate?: string;      // When to stop recurring
    endAfter?: number;     // Stop after N occurrences
  };
  parentScheduleId?: string; // For recurring instances
  isRecurringInstance?: boolean;
  
  // Permissions & Creation
  createdBy: string;       // User ID who created
  createdAt: string;
  updatedAt: string;
  
  // Google Calendar integration
  googleEventId?: string;
  
  // Status
  status: 'active' | 'cancelled' | 'completed';
}

export interface SchedulePermission {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  canCreateSchedule: boolean;
  grantedBy: string;      // Admin who granted permission
  grantedByName: string;
  grantedAt: string;
}

export interface CreateScheduleData {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  type: 'class' | 'exam' | 'meeting' | 'other';
  classIds?: string[];
  studentIds?: string[];
  teacherIds?: string[];
  
  // Recurring schedule data
  isRecurring?: boolean;
  recurringPattern?: {
    frequency: 'weekly' | 'daily' | 'monthly';
    daysOfWeek?: number[];
    interval?: number;
    endDate?: string;
    endAfter?: number;
  };
}

export interface ScheduleFilter {
  type?: 'class' | 'exam' | 'meeting' | 'other' | 'all';
  status?: 'active' | 'cancelled' | 'completed' | 'all';
  dateRange?: {
    start: string;
    end: string;
  };
  classId?: string;
  teacherId?: string;
}
