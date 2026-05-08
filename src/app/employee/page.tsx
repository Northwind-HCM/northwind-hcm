// src/app/employee/page.tsx

import { redirect } from "next/navigation";

export default function EmployeeRootPage() {
  redirect("/employee/self-service");
}