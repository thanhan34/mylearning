import { getServerSession } from "next-auth";
import { authOptions } from "../../../api/auth/config";
import { redirect } from "next/navigation";
import { getUserById } from "../../../firebase/services/user";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { Class } from "../../../firebase/services/types";
import AdminMocktestClient from "./components/page-client";

async function getAllClasses(): Promise<Class[]> {
  const classesRef = collection(db, "classes");
  const snapshot = await getDocs(classesRef);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Class));
}

export default async function AdminMocktestPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await getUserById(session.user.id);
  if (!user || user.role !== "admin") redirect("/dashboard");

  const classes = await getAllClasses();

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminMocktestClient 
        admin={user}
        classes={classes}
      />
    </div>
  );
}
