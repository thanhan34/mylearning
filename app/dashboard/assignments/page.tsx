import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { getTargetAssignments } from "../../firebase/services";
import SubmissionList from "./components/SubmissionList";

export default async function AssignmentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session?.user?.role) {
    console.log("No session or missing user data:", session);
    redirect("/login");
  }

  // Only allow students, teachers, and admins to access this page
  if (!["student", "teacher", "admin"].includes(session.user.role)) {
    console.log("Invalid role:", session.user.role);
    redirect("/dashboard");
  }

  console.log("User accessing assignments:", {
    id: session.user.id,
    role: session.user.role,
    email: session.user.email
  });

  // Get individual assignments
  const individualAssignments = await getTargetAssignments("individual", session.user.id);
  
  // Get class assignments
  const classAssignments = await getTargetAssignments("class", session.user.id);

  // Combine both types of assignments
  const assignments = [...individualAssignments, ...classAssignments];

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6 text-[#fc5d01]">Bài tập của bạn</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <SubmissionList assignments={assignments} studentId={session.user.id} />
      </div>
    </main>
  );
}
