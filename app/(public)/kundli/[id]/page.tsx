import { ExplanationPanel, PresentationModeSwitch } from '@/components/kundli/controls';
import { EmptyState } from '@/components/kundli/states';

export default function KundliDetailPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#795548]">Overview and current themes will appear when a verified calculation exists.</p>
        <PresentationModeSwitch basePath="/kundli/current" />
      </div>
      <EmptyState title="Calculation not available" />
      <ExplanationPanel />
    </div>
  );
}
