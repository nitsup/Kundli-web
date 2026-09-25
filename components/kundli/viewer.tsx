import { UnavailableState } from './states';
export function ChartViewer() { return <div><UnavailableState feature="Chart viewer" /><p className="mt-4 text-xs text-[#795548]">Charts will render here once a calculation provider returns a validated chart contract.</p></div>; }
export function DashaTimeline() { return <UnavailableState feature="Dasha timeline" />; }
export function DetailPanel({ title }: { title: string }) { return <UnavailableState feature={title} />; }
