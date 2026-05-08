// src/app/employee/self-service/page.tsx

export default function EmployeeSelfServiceRootPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold">Employee Self-Service</h1>

        <p className="mt-2 text-gray-600">
          Bitte melden Sie sich über Ihren persönlichen Einladungslink an.
        </p>

        <a
          href="/employee/login"
          className="mt-6 inline-block rounded-lg bg-blue-900 px-4 py-2 text-white"
        >
          Zum Login
        </a>
      </div>
    </main>
  );
}