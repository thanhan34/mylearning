// Test script for assistant class management functionality
// This script demonstrates how to create an assistant user and assign classes

const admin = require('firebase-admin');

// Initialize Firebase Admin (make sure to set up your service account)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    // Add your Firebase project config here
  });
}

const db = admin.firestore();

async function createTestAssistant() {
  try {
    // Create a test assistant user
    const assistantData = {
      email: 'assistant@test.com',
      name: 'Test Assistant',
      role: 'assistant',
      assignedClassIds: [], // Will be populated when admin assigns classes
      createdAt: new Date().toISOString(),
      avatar: null,
      target: null,
      teacherId: '',
      passed: false
    };

    // Use sanitized email as document ID
    const sanitizedEmail = assistantData.email.replace(/[.#$[\]]/g, '_');
    
    await db.collection('users').doc(sanitizedEmail).set(assistantData);
    console.log('✅ Test assistant created successfully:', assistantData.email);
    
    return sanitizedEmail;
  } catch (error) {
    console.error('❌ Error creating test assistant:', error);
    return null;
  }
}

async function createTestClass() {
  try {
    // Create a test class
    const classData = {
      name: 'Test Class for Assistant',
      teacherId: 'test-teacher-id', // This should be a real teacher ID
      description: 'Test class for assistant management',
      schedule: 'Monday, Wednesday, Friday',
      studentCount: 0,
      students: [],
      createdAt: new Date().toISOString(),
      announcements: []
    };

    const classRef = await db.collection('classes').add(classData);
    console.log('✅ Test class created successfully:', classRef.id);
    
    return classRef.id;
  } catch (error) {
    console.error('❌ Error creating test class:', error);
    return null;
  }
}

async function assignClassToAssistant(assistantId, classId) {
  try {
    // Update assistant's assignedClassIds
    await db.collection('users').doc(assistantId).update({
      assignedClassIds: admin.firestore.FieldValue.arrayUnion(classId)
    });
    
    console.log('✅ Class assigned to assistant successfully');
    console.log(`   Assistant: ${assistantId}`);
    console.log(`   Class: ${classId}`);
  } catch (error) {
    console.error('❌ Error assigning class to assistant:', error);
  }
}

async function testAssistantClassManagement() {
  console.log('🚀 Starting assistant class management test...\n');
  
  // Step 1: Create test assistant
  console.log('1. Creating test assistant...');
  const assistantId = await createTestAssistant();
  if (!assistantId) return;
  
  // Step 2: Create test class
  console.log('\n2. Creating test class...');
  const classId = await createTestClass();
  if (!classId) return;
  
  // Step 3: Assign class to assistant
  console.log('\n3. Assigning class to assistant...');
  await assignClassToAssistant(assistantId, classId);
  
  console.log('\n✅ Test completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Login as assistant@test.com');
  console.log('2. Navigate to /dashboard/class');
  console.log('3. Verify that the assigned class appears');
  console.log('4. Test creating new classes');
  console.log('5. Test adding/removing students');
}

// Run the test
if (require.main === module) {
  testAssistantClassManagement()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = {
  createTestAssistant,
  createTestClass,
  assignClassToAssistant,
  testAssistantClassManagement
};
