import { Sidebar } from "@/components/sidebar";
import { AutoSyncProvider } from "@/components/auto-sync";
import { PermissionsProvider } from "@/hooks/use-permissions";
import { DisplayProvider } from "@/hooks/use-display";
import { RouteGuard } from "@/components/route-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PermissionsProvider>
      <DisplayProvider>
        <AutoSyncProvider intervalMinutes={5}>
          <div className="min-h-screen bg-background bg-grid">
            <Sidebar />
            {/* Responsive main: full width on mobile, margin on desktop */}
            <main className="min-h-screen transition-all duration-300 lg:ml-[260px] pt-16 lg:pt-0 px-4 lg:px-6 pb-6">
              <RouteGuard>
                {children}
              </RouteGuard>
            </main>
          </div>
        </AutoSyncProvider>
      </DisplayProvider>
    </PermissionsProvider>
  );
}
