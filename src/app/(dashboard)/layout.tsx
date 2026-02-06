import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Sidebar, MobileNav } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="pb-16 md:ml-64 md:pb-0">
        <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">{children}</div>
      </main>
      <MobileNav />
    </div>
  );
}
