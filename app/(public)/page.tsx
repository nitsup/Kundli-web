import { Card } from '@/components/ui/card';

export default function PublicHomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
          Foundation architecture
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Kundli-Web</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          This placeholder establishes the public platform shell while the calculation engines,
          report system, and Pandit workflow are implemented later.
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-3">
        <Card title="Kundli" description="Birth profile, chart generation, and charts are intentionally deferred behind a clean abstraction." />
        <Card title="Panchang" description="Location-aware daily computations and festival metadata are reserved for a future provider adapter." />
        <Card title="Pandit workspace" description="Client, consultation, and report ownership are modeled with secure access boundaries." />
      </div>
    </div>
  );
}
