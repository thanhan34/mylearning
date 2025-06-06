const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to set up your service account)
const serviceAccount = require('../mylearning-447007-20089688b5f1.json'); // Update path as needed

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://mylearning-447007-default-rtdb.firebaseio.com" // Update as needed
});

const db = admin.firestore();

async function configureAssistant() {
  try {
    const assistantEmail = 'hadesdoan@gmail.com';
    const supportingTeacherEmails = [
      // Add teacher emails here that this assistant should support
      'teacher1@example.com',
      'teacher2@example.com'
    ];

    // Get assistant user document
    const usersRef = db.collection('users');
    const assistantQuery = await usersRef.where('email', '==', assistantEmail).get();
    
    if (assistantQuery.empty) {
      console.log('Assistant user not found');
      return;
    }

    const assistantDoc = assistantQuery.docs[0];
    console.log('Found assistant:', assistantDoc.id);

    // Get teacher IDs
    const teacherIds = [];
    for (const teacherEmail of supportingTeacherEmails) {
      const teacherQuery = await usersRef.where('email', '==', teacherEmail).get();
      if (!teacherQuery.empty) {
        teacherIds.push(teacherQuery.docs[0].id);
        console.log(`Found teacher: ${teacherEmail} -> ${teacherQuery.docs[0].id}`);
      } else {
        console.log(`Teacher not found: ${teacherEmail}`);
      }
    }

    if (teacherIds.length === 0) {
      console.log('No valid teachers found');
      return;
    }

    // Update assistant with supporting teacher IDs
    await assistantDoc.ref.update({
      role: 'assistant',
      supportingTeacherIds: teacherIds
    });

    console.log(`Successfully configured assistant ${assistantEmail} to support ${teacherIds.length} teachers`);
    console.log('Supporting teacher IDs:', teacherIds);

  } catch (error) {
    console.error('Error configuring assistant:', error);
  }
}

configureAssistant();
