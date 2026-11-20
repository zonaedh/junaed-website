import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

/** Same host logic as the login action: loopback has no admin subdomain. */
async function dashboardPath(): Promise<string> {
  const host = (await headers()).get("host") ?? "";
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  const isAdminHost = hostname.startsWith("admin.");
  const isLoopback =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1";
  return isAdminHost || !isLoopback ? "/dashboard" : "/admin/dashboard";
}

export default async function LoginPage() {
  // Already signed in? Go straight to the dashboard.
  const session = await getSession();
  if (session) redirect(await dashboardPath());

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-7 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-11 place-items-center rounded-[14px] bg-linear-145 from-violet-500 to-violet-950 text-lg font-extrabold text-white"
          >
            J
          </span>
          <div>
            <p className="font-display text-base font-extrabold tracking-[-0.03em]">
              Junaed Hossain
            </p>
            <p className="text-xs text-muted">Admin panel</p>
          </div>
        </div>

        <div className="rounded-[20px] border border-line bg-white p-6 shadow-[0_18px_55px_rgb(39_17_100/0.07)] sm:p-8">
          <h1 className="mb-1.5 font-display text-2xl font-extrabold tracking-[-0.04em]">
            Sign in
          </h1>
          <p className="mb-6 text-sm leading-[1.6] text-muted">
            Use your staff account. Two-factor authentication is required for
            owner and admin roles.
          </p>

          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          This panel is private and excluded from search engines.
        </p>
      </div>
    </main>
  );
}
