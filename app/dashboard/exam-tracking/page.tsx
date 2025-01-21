"use client";

import { useSession } from "next-auth/react";
import ExamTrackingForm from "./components/ExamTrackingForm";
import ExamTrackingList from "./components/ExamTrackingList";

export default function ExamTrackingPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const isTeacher = session?.user?.role === "teacher";

  return (
    <div className="container mx-auto py-8">
      {isAdmin || isTeacher ? (
        <ExamTrackingList />
      ) : (
        <ExamTrackingForm />
      )}
    </div>
  );
}
