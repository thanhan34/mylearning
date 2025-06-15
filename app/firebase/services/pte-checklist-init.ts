import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config';
import { createPTEChecklistProgress, getPTEChecklistProgress } from './pte-checklist';

export const initializeAllStudentChecklists = async (): Promise<{
  success: boolean;
  created: number;
  existing: number;
  errors: number;
}> => {
  try {
    // Get all users with role "student"
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'student'));
    const querySnapshot = await getDocs(q);
    
    let created = 0;
    let existing = 0;
    let errors = 0;
    
    console.log(`Found ${querySnapshot.docs.length} students to initialize checklists for`);
    
    for (const userDoc of querySnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      const userName = userData.name || 'Student';
      const userEmail = userData.email || '';
      
      try {
        // Check if checklist already exists
        const existingProgress = await getPTEChecklistProgress(userId);
        
        if (existingProgress) {
          existing++;
          console.log(`Checklist already exists for student: ${userName} (${userEmail})`);
        } else {
          // Create new checklist
          const progressId = await createPTEChecklistProgress(userId, userName, userEmail);
          
          if (progressId) {
            created++;
            console.log(`Created checklist for student: ${userName} (${userEmail})`);
          } else {
            errors++;
            console.error(`Failed to create checklist for student: ${userName} (${userEmail})`);
          }
        }
      } catch (error) {
        errors++;
        console.error(`Error processing student ${userName} (${userEmail}):`, error);
      }
    }
    
    console.log(`Initialization complete: ${created} created, ${existing} existing, ${errors} errors`);
    
    return {
      success: true,
      created,
      existing,
      errors
    };
  } catch (error) {
    console.error('Error initializing student checklists:', error);
    return {
      success: false,
      created: 0,
      existing: 0,
      errors: 1
    };
  }
};

export const initializeSingleStudentChecklist = async (
  userId: string,
  userName: string,
  userEmail: string
): Promise<boolean> => {
  try {
    // Check if checklist already exists
    const existingProgress = await getPTEChecklistProgress(userId);
    
    if (existingProgress) {
      console.log(`Checklist already exists for student: ${userName}`);
      return true;
    }
    
    // Create new checklist
    const progressId = await createPTEChecklistProgress(userId, userName, userEmail);
    
    if (progressId) {
      console.log(`Created checklist for student: ${userName}`);
      return true;
    } else {
      console.error(`Failed to create checklist for student: ${userName}`);
      return false;
    }
  } catch (error) {
    console.error(`Error creating checklist for student ${userName}:`, error);
    return false;
  }
};
