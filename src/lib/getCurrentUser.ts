import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { AppUser } from "./auth/roles";

export async function getCurrentUser(): Promise<AppUser | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();

      if (!user) {
        resolve(null);
        return;
      }

      const userSnap = await getDoc(doc(db, "users", user.uid));

      if (!userSnap.exists()) {
        resolve(null);
        return;
      }

      resolve({
        userId: user.uid,
        ...userSnap.data(),
      } as AppUser);
    });
  });
}