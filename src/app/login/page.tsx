import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-6">
        <h1 className="mb-1 text-xl font-bold">SuperMovie</h1>
        <p className="mb-6 text-sm text-muted">Sign in to continue</p>
        <LoginForm />
      </div>
    </main>
  );
}
