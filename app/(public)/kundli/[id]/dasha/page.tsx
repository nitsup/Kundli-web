import { DateSelector } from '@/components/kundli/controls';
import { DashaTimeline } from '@/components/kundli/viewer';

export default function KundliDashaPage() {
  return <div className="space-y-5"><DateSelector /><DashaTimeline /></div>;
}
