import { cookies } from "next/headers";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser } from "@/lib/auth/roles";

export async function getCurrentUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const uid = cookieStore.get("uid")?.value;

  if (!uid) {
    return null;
  }

  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  const data = userSnap.data();

  return {
    uid,
    email: data.email,
    role: data.role,
    companyId: data.companyId,
    employeeId: data.employeeId,
    accessScope: data.accessScope ?? "company",
    teamEmployeeIds: data.teamEmployeeIds ?? [],
  };
}