import { DetailPanel } from '@/components/kundli/viewer';

export default async function KundliPlanetPage({ params }: { params: Promise<{ planet: string }> }) {
  const { planet } = await params;
  return <DetailPanel title={`${planet} detail`} />;
}
