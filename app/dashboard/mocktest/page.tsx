import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/config";
import { redirect } from "next/navigation";
import { getUserById } from "../../firebase/services/user";
import { getClassById } from "../../firebase/services/class";
import MocktestClient from "./components/page-client";

export default async function MocktestPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");


  const user = await getUserById(session.user.id);
  if (!user) {
    console.error("User not found in database");
    redirect("/login");
  }


  let classData = null;
  if (user.classId) {
    classData = await getClassById(user.classId);
  } else {
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
