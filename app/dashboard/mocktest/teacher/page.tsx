import { getServerSession } from "next-auth";
import { authOptions } from "../../../api/auth/config";
import { redirect } from "next/navigation";
import { getUserById } from "../../../firebase/services/user";
import { getTeacherClasses } from "../../../firebase/services/class";
import TeacherMocktestClient from "./components/page-client";

export default async function TeacherMocktestPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await getUserById(session.user.id);
  if (!user || user.role !== "teacher") redirect("/dashboard");

  const classes = await getTeacherClasses(user.email);

  return (
    <div className="container mx-auto px-4 py-8">
      <TeacherMocktestClient 
        teacher={user}
        classes={classes}
      />
    </div>
  );
}
