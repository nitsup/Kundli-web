import { DateSelector, ExplanationPanel } from '@/components/kundli/controls';
import { DetailPanel } from '@/components/kundli/viewer';

export default function KundliTransitsPage() {
  return <div className="space-y-5"><DateSelector /><DetailPanel title="Transit explorer" /><ExplanationPanel /></div>;
}
