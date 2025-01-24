import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/config";
import { redirect } from "next/navigation";
import { getUserById } from "../../firebase/services/user";
import { getClassById } from "../../firebase/services/class";
import MocktestClient from "./components/page-client";

export default async function MocktestPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  console.log("Session user:", {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role
  });

  const user = await getUserById(session.user.id);
  if (!user) {
    console.error("User not found in database");
    redirect("/login");
  }

  console.log("Fetched user:", {
    id: user.id,
    email: user.email,
    role: user.role,
    classId: user.classId
  });

  let classData = null;
  if (user.classId) {
    console.log("Fetching class data for classId:", user.classId);
    classData = await getClassById(user.classId);
    console.log("Fetched class data:", classData);
  } else {
    console.log("User has no classId assigned");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <MocktestClient 
        user={user}
        classData={classData}
      />
    </div>
  );
}
