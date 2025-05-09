'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import SupportClassManagement from '../components/SupportClassManagement';

export default function SupportSpeakingPage() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') {
    return <div className="p-4">Loading...</div>;
  }
  
  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6 text-[#fc5d01]">Support Speaking Classes</h1>
      <p className="mb-6 text-gray-600">
        Manage support speaking classes that students can join in addition to their regular classes.
        These classes provide extra speaking practice and support for students who need it.
      </p>
      
      <SupportClassManagement isAdmin={true} />
    </div>
  );
}
