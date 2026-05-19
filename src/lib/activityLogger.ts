import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export type ActivityType =
  | "employee_created"
  | "employee_updated"
  | "document_uploaded"
  | "absence_created"
  | "absence_approved"
  | "task_created"
  | "task_completed"
  | "payroll_started"
  | "payroll_completed"
  | "user_invited"
  | "user_deleted";

type AddActivityParams = {
  companyId: string;
  type: ActivityType;
  title: string;
  description?: string;
  userEmail?: string;
  employeeId?: string;
  employeeName?: string;
};

export async function addActivity({
  companyId,
  type,
  title,
  description,
  userEmail,
  employeeId,
  employeeName,
}: AddActivityParams) {
  try {
    await addDoc(
      collection(db, "companies", companyId, "activities"),
      {
        type,
        title,
        description: description || "",
        userEmail: userEmail || "",
        employeeId: employeeId || "",
        employeeName: employeeName || "",
        createdAt: serverTimestamp(),
      }
    );
  } catch (error) {
    console.error("Activity konnte nicht gespeichert werden", error);
  }
}