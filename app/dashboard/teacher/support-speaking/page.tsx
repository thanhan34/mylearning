'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import SupportClassManagement from '../../admin/components/SupportClassManagement';

export default function TeacherSupportSpeakingPage() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') {
    return <div className="p-4">Loading...</div>;
  }
  
  if (!session || (session.user.role !== 'teacher' && session.user.role !== 'admin')) {
    redirect('/login');
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6 text-[#fc5d01]">Support Speaking Classes</h1>
      <p className="mb-6 text-gray-600">
        View and manage attendance for support speaking classes you are assigned to.
        These classes provide extra speaking practice and support for students who need it.
      </p>
      
      {/* Pass the teacher's email to filter classes and set isAdmin to false */}
      <SupportClassManagement 
        teacherEmail={session.user.email || undefined} 
        isAdmin={session.user.role === 'admin'} 
      />
    </div>
  );
}
