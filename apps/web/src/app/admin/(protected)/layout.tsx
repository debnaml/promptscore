import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isAdminEmail } from "@/lib/supabase/server";
import { signOutAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-56 bg-slate-900 text-slate-100 flex flex-col">
        <div className="px-4 py-5 border-b border-slate-800">
          <div className="text-sm font-semibold">PromptScore</div>
          <div className="text-xs text-slate-400">Admin</div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5 text-sm">
          <NavLink href="/admin/leads">Leads</NavLink>
          <NavLink href="/admin/scans">Scans</NavLink>
          <NavLink href="/admin/benchmarks">Benchmarks</NavLink>
          <NavLink href="/admin/cost">Cost</NavLink>
          <NavLink href="/admin/settings">Settings</NavLink>
          <NavLink href="/admin/diagnostics">Diagnostics</NavLink>
          <NavLink href="/admin/audit-log">Audit log</NavLink>
        </nav>
        <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-400">
          <div className="truncate" title={user.email ?? ""}>{user.email}</div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="mt-2 text-slate-300 hover:text-white underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-md hover:bg-slate-800 text-slate-200"
    >
      {children}
    </Link>
  );
}
