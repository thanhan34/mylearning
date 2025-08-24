import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  writeBatch,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '../config';
import { Schedule, SchedulePermission, CreateScheduleData, ScheduleFilter } from '../../../types/schedule';
import { getUserById, User } from './user';
import { getClassById } from './class';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from './calendar';

// Helper function to delay execution (for rate limiting)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to implement exponential backoff
const retryOperation = async (
  operation: () => Promise<any>,
  maxRetries = 5,
  initialDelay = 1000
): Promise<any> => {
  let retries = 0;
  
  while (true) {
    try {
      return await operation();
    } catch (error: any) {
      retries++;
      
      if (retries >= maxRetries || 
          !(error?.code === 'resource-exhausted' || 
            (error?.name === 'FirebaseError' && error?.message?.includes('resource-exhausted')))) {
        throw error;
      }
      
      const waitTime = initialDelay * Math.pow(2, retries - 1);
      console.log(`Retrying operation after ${waitTime}ms (attempt ${retries})`);
      await delay(waitTime);
    }
  }
};

// Helper function to generate recurring schedule instances
const generateRecurringInstances = (
  scheduleData: CreateScheduleData,
  createdBy: string
): Omit<Schedule, 'id'>[] => {
  if (!scheduleData.isRecurring || !scheduleData.recurringPattern) {
    return [];
  }

  const instances: Omit<Schedule, 'id'>[] = [];
  const { daysOfWeek, interval = 1, endDate } = scheduleData.recurringPattern;
  
  if (!daysOfWeek || daysOfWeek.length === 0) {
    return [];
  }

  const startDate = new Date(scheduleData.startTime);
  const endDateTime = new Date(scheduleData.endTime);
  const duration = endDateTime.getTime() - startDate.getTime();
  
  const endLimit = endDate ? new Date(endDate) : new Date(startDate.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year max
  const now = new Date().toISOString();

  // Find the first occurrence for each day of week
  let currentWeek = new Date(startDate);
  currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay()); // Start of week (Sunday)

  let weekCount = 0;
  while (currentWeek <= endLimit && instances.length < 100) { // Max 100 instances
    if (weekCount % interval === 0) {
      for (const dayOfWeek of daysOfWeek) {
        const instanceDate = new Date(currentWeek);
        instanceDate.setDate(instanceDate.getDate() + dayOfWeek);
        instanceDate.setHours(startDate.getHours(), startDate.getMinutes(), startDate.getSeconds());

        if (instanceDate >= startDate && instanceDate <= endLimit) {
          const instanceEndDate = new Date(instanceDate.getTime() + duration);

          instances.push({
            title: scheduleData.title,
            description: scheduleData.description,
            startTime: instanceDate.toISOString(),
            endTime: instanceEndDate.toISOString(),
            location: scheduleData.location,
            type: scheduleData.type,
            classIds: scheduleData.classIds,
            studentIds: scheduleData.studentIds,
            teacherIds: scheduleData.teacherIds,
            isRecurring: false,
            isRecurringInstance: true,
            parentScheduleId: '', // Will be set after parent is created
            createdBy,
            createdAt: now,
            updatedAt: now,
            status: 'active'
          });
        }
      }
    }
    
    currentWeek.setDate(currentWeek.getDate() + 7);
    weekCount++;
  }

  return instances;
};

// Helper function to clean data for Firebase (remove undefined values)
const cleanDataForFirebase = (data: any): any => {
  if (data === null || data === undefined) {
    return null;
  }
  
  if (Array.isArray(data)) {
    return data.map(cleanDataForFirebase);
  }
  
  if (typeof data === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = cleanDataForFirebase(value);
      }
    }
    return cleaned;
  }
  
  return data;
};

// Schedule CRUD Operations
export const createSchedule = async (
  scheduleData: CreateScheduleData, 
  createdBy: string
): Promise<string | null> => {
  try {
    const now = new Date().toISOString();
    
    // Clean the schedule data to remove undefined values
    const cleanedScheduleData = cleanDataForFirebase(scheduleData);
    
    // Handle recurring schedules
    if (cleanedScheduleData.isRecurring) {
      const batch = writeBatch(db);
      const schedulesRef = collection(db, 'schedules');
      
      // Create parent schedule (template)
      const parentSchedule: Omit<Schedule, 'id'> = {
        ...cleanedScheduleData,
        createdBy,
        createdAt: now,
        updatedAt: now,
        status: 'active'
      };

      const parentRef = doc(schedulesRef);
      batch.set(parentRef, parentSchedule);
      
      // Generate recurring instances
      const instances = generateRecurringInstances(cleanedScheduleData, createdBy);
      
      // Create all instances
      for (const instance of instances) {
        const instanceRef = doc(schedulesRef);
        batch.set(instanceRef, {
          ...instance,
          parentScheduleId: parentRef.id
        });
      }
      
      await retryOperation(() => batch.commit());
      
      console.log(`Successfully created recurring schedule with ${instances.length} instances: ${parentRef.id}`);
      return parentRef.id;
    } else {
      // Create single schedule
      let googleEventId: string | null = null;
      try {
        googleEventId = await createCalendarEvent({
          name: scheduleData.title,
          examLocation: scheduleData.location || '',
          examDate: scheduleData.startTime.split('T')[0],
          target: scheduleData.description || '',
          className: '', // Will be populated if classIds exist
          teacherName: '' // Will be populated if teacherIds exist
        });
      } catch (error) {
        console.warn('Failed to create Google Calendar event:', error);
      }

      const newSchedule: Omit<Schedule, 'id'> = {
        ...cleanedScheduleData,
        createdBy,
        createdAt: now,
        updatedAt: now,
        status: 'active',
        ...(googleEventId && { googleEventId })
      };

      const schedulesRef = collection(db, 'schedules');
      const docRef = await retryOperation(() => addDoc(schedulesRef, newSchedule));
      
      console.log(`Successfully created schedule: ${docRef.id}`);
      return docRef.id;
    }
  } catch (error) {
    console.error('Error creating schedule:', error);
    return null;
  }
};

export const updateSchedule = async (
  scheduleId: string, 
  updateData: Partial<CreateScheduleData>
): Promise<boolean> => {
  try {
    const scheduleRef = doc(db, 'schedules', scheduleId);
    const scheduleDoc = await retryOperation(() => getDoc(scheduleRef));
    
    if (!scheduleDoc.exists()) {
      console.error('Schedule not found:', scheduleId);
      return false;
    }

    const currentSchedule = scheduleDoc.data() as Schedule;
    
    // Update Google Calendar event if it exists
    if (currentSchedule.googleEventId && (updateData.title || updateData.startTime || updateData.location)) {
      try {
        await updateCalendarEvent(currentSchedule.googleEventId, {
          name: updateData.title || currentSchedule.title,
          examLocation: updateData.location || currentSchedule.location || '',
          examDate: updateData.startTime ? updateData.startTime.split('T')[0] : currentSchedule.startTime.split('T')[0],
          target: updateData.description || currentSchedule.description || '',
          className: '',
          teacherName: ''
        });
      } catch (error) {
        console.warn('Failed to update Google Calendar event:', error);
      }
    }

    const updatedData = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    await retryOperation(() => updateDoc(scheduleRef, updatedData));
    
    console.log(`Successfully updated schedule: ${scheduleId}`);
    return true;
  } catch (error) {
    console.error('Error updating schedule:', error);
    return false;
  }
};

export const deleteSchedule = async (scheduleId: string): Promise<boolean> => {
  try {
    const scheduleRef = doc(db, 'schedules', scheduleId);
    const scheduleDoc = await retryOperation(() => getDoc(scheduleRef));
    
    if (!scheduleDoc.exists()) {
      console.error('Schedule not found:', scheduleId);
      return false;
    }

    const schedule = scheduleDoc.data() as Schedule;
    
    // Delete Google Calendar event if it exists
    if (schedule.googleEventId) {
      try {
        await deleteCalendarEvent(schedule.googleEventId);
      } catch (error) {
        console.warn('Failed to delete Google Calendar event:', error);
      }
    }

    await retryOperation(() => deleteDoc(scheduleRef));
    
    console.log(`Successfully deleted schedule: ${scheduleId}`);
    return true;
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return false;
  }
};

// Get schedules based on user role and permissions
export const getSchedulesByUser = async (
  userId: string, 
  userRole: string,
  filter?: ScheduleFilter
): Promise<Schedule[]> => {
  try {
    console.log('getSchedulesByUser called with:', { userId, userRole });
    
    const schedulesRef = collection(db, 'schedules');
    let q = query(schedulesRef, orderBy('startTime', 'desc'));

    // Apply role-based filtering
    if (userRole === 'student') {
      // Students can only see schedules they're involved in
      const user = await getUserById(userId);
      if (!user) return [];

      // Get schedules where student is directly assigned or through their class
      const queries = [];
      
      if (user.classId) {
        queries.push(
          query(schedulesRef, where('classIds', 'array-contains', user.classId), orderBy('startTime', 'desc'))
        );
      }
      
      queries.push(
        query(schedulesRef, where('studentIds', 'array-contains', userId), orderBy('startTime', 'desc'))
      );

      const allSchedules: Schedule[] = [];
      for (const studentQuery of queries) {
        const querySnapshot = await retryOperation(() => getDocs(studentQuery));
        querySnapshot.docs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          const schedule = { id: doc.id, ...doc.data() } as Schedule;
          // Avoid duplicates
          if (!allSchedules.find(s => s.id === schedule.id)) {
            allSchedules.push(schedule);
          }
        });
      }
      
      return allSchedules.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      
    } else if (userRole === 'teacher' || userRole === 'assistant') {
      // Teachers and assistants see schedules for their classes and schedules they're directly assigned to
      console.log('Processing teacher/assistant schedules for userId:', userId);
      
      const user = await getUserById(userId);
      console.log('User data retrieved:', user);
      
      if (!user) {
        console.log('No user found for userId:', userId);
        return [];
      }

      const allSchedules: Schedule[] = [];
      const processedScheduleIds = new Set<string>();
      
      // 1. Get schedules where they're directly assigned as teachers/assistants
      try {
        console.log('Querying schedules where teacherIds contains:', userId);
        const directAssignmentQuery = query(
          schedulesRef, 
          where('teacherIds', 'array-contains', userId), 
          orderBy('startTime', 'desc')
        );
        const directQuerySnapshot = await retryOperation(() => getDocs(directAssignmentQuery));
        
        console.log('Direct assignment query returned:', directQuerySnapshot.docs.length, 'documents');
        
        directQuerySnapshot.docs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          const schedule = { id: doc.id, ...doc.data() } as Schedule;
          console.log('Found directly assigned schedule:', schedule.title, schedule.id);
          if (!processedScheduleIds.has(schedule.id)) {
            allSchedules.push(schedule);
            processedScheduleIds.add(schedule.id);
          }
        });
      } catch (error) {
        console.warn('Error fetching directly assigned schedules:', error);
      }
      
      // 2. For teachers: get schedules for classes they teach
      if (userRole === 'teacher') {
        try {
          console.log('Querying classes where teacherId equals:', userId);
          const classesRef = collection(db, 'classes');
          const teacherClassesQuery = query(classesRef, where('teacherId', '==', userId));
          const classesSnapshot = await retryOperation(() => getDocs(teacherClassesQuery));
          
          const classIds = classesSnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => doc.id);
          console.log('Teacher classes found:', classIds);
          
          for (const classId of classIds) {
            try {
              console.log('Querying schedules for classId:', classId);
              const classScheduleQuery = query(
                schedulesRef, 
                where('classIds', 'array-contains', classId), 
                orderBy('startTime', 'desc')
              );
              const classQuerySnapshot = await retryOperation(() => getDocs(classScheduleQuery));
              
              console.log(`Found ${classQuerySnapshot.docs.length} schedules for class ${classId}`);
              
              classQuerySnapshot.docs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
                const schedule = { id: doc.id, ...doc.data() } as Schedule;
                console.log('Found class schedule:', schedule.title, schedule.id);
                if (!processedScheduleIds.has(schedule.id)) {
                  allSchedules.push(schedule);
                  processedScheduleIds.add(schedule.id);
                }
              });
            } catch (error) {
              console.warn(`Error fetching schedules for class ${classId}:`, error);
            }
          }
        } catch (error) {
          console.warn('Error fetching teacher classes:', error);
        }
      }
      
      // 3. For assistants: get schedules for assigned classes
      if (userRole === 'assistant' && user.assignedClassIds && user.assignedClassIds.length > 0) {
        for (const classId of user.assignedClassIds) {
          try {
            const assistantClassQuery = query(
              schedulesRef, 
              where('classIds', 'array-contains', classId), 
              orderBy('startTime', 'desc')
            );
            const assistantQuerySnapshot = await retryOperation(() => getDocs(assistantClassQuery));
            
            assistantQuerySnapshot.docs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
              const schedule = { id: doc.id, ...doc.data() } as Schedule;
              if (!processedScheduleIds.has(schedule.id)) {
                allSchedules.push(schedule);
                processedScheduleIds.add(schedule.id);
              }
            });
          } catch (error) {
            console.warn(`Error fetching schedules for assigned class ${classId}:`, error);
          }
        }
      }
      
      console.log('Total schedules found for teacher/assistant:', allSchedules.length);
      console.log('Schedule titles:', allSchedules.map(s => s.title));
      
      return allSchedules.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      
    } else if (userRole === 'admin') {
      // Admins can see all schedules
      const querySnapshot = await retryOperation(() => getDocs(q));
      return querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
        id: doc.id,
        ...doc.data()
      } as Schedule));
    }

    return [];
  } catch (error) {
    console.error('Error getting schedules by user:', error);
    return [];
  }
};

export const getScheduleById = async (scheduleId: string): Promise<Schedule | null> => {
  try {
    const scheduleRef = doc(db, 'schedules', scheduleId);
    const scheduleDoc = await retryOperation(() => getDoc(scheduleRef));
    
    if (scheduleDoc.exists()) {
      return {
        id: scheduleDoc.id,
        ...scheduleDoc.data()
      } as Schedule;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting schedule by ID:', error);
    return null;
  }
};

// Schedule Permissions Management
export const grantSchedulePermission = async (
  userId: string,
  grantedBy: string
): Promise<boolean> => {
  try {
    const user = await getUserById(userId);
    const admin = await getUserById(grantedBy);
    
    if (!user || !admin || admin.role !== 'admin') {
      console.error('Invalid user or admin not found');
      return false;
    }

    const permissionData: Omit<SchedulePermission, 'id'> = {
      userId,
      userName: user.name || user.email,
      userEmail: user.email,
      canCreateSchedule: true,
      grantedBy,
      grantedByName: admin.name || admin.email,
      grantedAt: new Date().toISOString()
    };

    const permissionsRef = collection(db, 'schedule_permissions');
    
    // Check if permission already exists
    const existingQuery = query(permissionsRef, where('userId', '==', userId));
    const existingSnapshot = await retryOperation(() => getDocs(existingQuery));
    
    if (!existingSnapshot.empty) {
      // Update existing permission
      const existingDoc = existingSnapshot.docs[0];
      await retryOperation(() => updateDoc(existingDoc.ref, {
        canCreateSchedule: true,
        grantedBy,
        grantedByName: admin.name || admin.email,
        grantedAt: new Date().toISOString()
      }));
    } else {
      // Create new permission
      await retryOperation(() => addDoc(permissionsRef, permissionData));
    }
    
    console.log(`Successfully granted schedule permission to user: ${userId}`);
    return true;
  } catch (error) {
    console.error('Error granting schedule permission:', error);
    return false;
  }
};

export const revokeSchedulePermission = async (userId: string): Promise<boolean> => {
  try {
    const permissionsRef = collection(db, 'schedule_permissions');
    const q = query(permissionsRef, where('userId', '==', userId));
    const querySnapshot = await retryOperation(() => getDocs(q));
    
    if (!querySnapshot.empty) {
      const batch = writeBatch(db);
      querySnapshot.docs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        batch.delete(doc.ref);
      });
      await retryOperation(() => batch.commit());
      
      console.log(`Successfully revoked schedule permission for user: ${userId}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error revoking schedule permission:', error);
    return false;
  }
};

export const getSchedulePermissions = async (): Promise<SchedulePermission[]> => {
  try {
    const permissionsRef = collection(db, 'schedule_permissions');
    const q = query(permissionsRef, orderBy('grantedAt', 'desc'));
    const querySnapshot = await retryOperation(() => getDocs(q));
    
    return querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data()
    } as SchedulePermission));
  } catch (error) {
    console.error('Error getting schedule permissions:', error);
    return [];
  }
};

export const checkSchedulePermission = async (userId: string): Promise<boolean> => {
  try {
    // Admins always have permission
    const user = await getUserById(userId);
    if (user?.role === 'admin') {
      return true;
    }

    const permissionsRef = collection(db, 'schedule_permissions');
    const q = query(permissionsRef, where('userId', '==', userId), where('canCreateSchedule', '==', true));
    const querySnapshot = await retryOperation(() => getDocs(q));
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking schedule permission:', error);
    return false;
  }
};
