import { LogoutButton } from '@/components/auth/logout-button';

export default function DashboardPage() {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-slate-600">Dashboard workflows are reserved for the authenticated application phase.</p>
      <LogoutButton />
    </div>
  );
}
