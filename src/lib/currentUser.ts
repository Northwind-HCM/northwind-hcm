import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { AppUser, UserRole } from "@/lib/rbac";

export async function getCurrentAppUser(): Promise<AppUser | null> {
  const firebaseUser = auth.currentUser;

  if (!firebaseUser) {
    return null;
  }

  const userRef = doc(db, "users", firebaseUser.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || "",
      role: "employee",
      companyIds: [],
    };
  }

  const data = userSnap.data();

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email || data.email || "",
    role: (data.role || "employee") as UserRole,
    companyId: data.companyId || "",
    companyIds: data.companyIds || [],
    employeeId: data.employeeId || "",
    teamIds: data.teamIds || [],
  };
}

export function requireAppUser(user: AppUser | null) {
  if (!user) {
    throw new Error("Nicht angemeldet.");
  }

  return user;
}