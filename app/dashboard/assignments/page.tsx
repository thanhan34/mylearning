import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { getTargetAssignments } from "../../firebase/services";
import SubmissionList from "./components/SubmissionList";

export default async function AssignmentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const assignments = await getTargetAssignments("individual", session.user.id);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6 text-[#fc5d01]">Bài tập của bạn</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <SubmissionList assignments={assignments} studentId={session.user.id} />
      </div>
    </main>
  );
}
