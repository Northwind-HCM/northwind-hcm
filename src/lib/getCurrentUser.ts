import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { AppUser } from "@/lib/auth/roles";

export function getCurrentUser(): Promise<AppUser | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();

      if (!user) {
        resolve(null);
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        resolve(null);
        return;
      }

      const data = userSnap.data();

      resolve({
        uid: user.uid,
        email: data.email,
        role: data.role,
        companyId: data.companyId,
        employeeId: data.employeeId,
        accessScope: data.accessScope ?? "company",
        teamEmployeeIds: data.teamEmployeeIds ?? [],
      });
    });
  });
}