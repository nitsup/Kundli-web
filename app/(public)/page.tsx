import Link from 'next/link';

const offerings = [
  ['☼', 'Kundli', 'A clear, grounded way to explore your birth chart.', '/kundli'],
  ['◒', 'Panchang', 'A daily rhythm for auspicious moments and observances.', '/panchang'],
  ['✧', 'Horoscope', 'Thoughtful guidance for the days ahead.', '/horoscope'],
  ['◇', 'Matching', 'A thoughtful foundation for exploring compatibility.', '/matching'],
  ['◌', 'Muhurat', 'Find space for intention around life’s important moments.', '/muhurat'],
];

export default function PublicHomePage() {
  return <div>
    <section className="relative overflow-hidden rounded-[2rem] bg-[#7f1d1d] px-6 py-16 text-center text-white sm:px-12 sm:py-24">
      <div className="absolute -right-16 -top-24 size-72 rounded-full border-[28px] border-[#c2410c]/40" aria-hidden="true" />
      <div className="absolute -bottom-28 -left-16 size-64 rounded-full border-[20px] border-[#ffd166]/25" aria-hidden="true" />
      <p className="relative text-sm font-bold uppercase tracking-[0.25em] text-[#ffd166]">A modern home for timeless wisdom</p>
      <h1 className="relative mx-auto mt-5 max-w-3xl font-serif text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">Find your rhythm in the stars.</h1>
      <p className="relative mx-auto mt-6 max-w-xl text-lg leading-8 text-red-100">Kundli brings the depth of Indian astrology into a calm, clear space for reflection and discovery.</p>
      <Link href="/kundli" className="relative mt-9 inline-flex rounded-full bg-[#ffd166] px-6 py-3 font-bold text-[#7f1d1d] transition hover:bg-[#ffe29a]">Explore your Kundli <span className="ml-2">→</span></Link>
    </section>
    <section className="py-16 sm:py-20"><div className="mb-8 max-w-xl"><p className="text-sm font-bold uppercase tracking-[0.2em] text-[#c2410c]">Made for meaning</p><h2 className="mt-3 font-serif text-3xl font-bold text-[#7f1d1d] sm:text-4xl">Start where curiosity takes you.</h2></div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{offerings.map(([icon, title, text, href]) => <Link href={href} key={title} className="group rounded-2xl border border-[#f1d7a6] bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-md"><span className="text-3xl text-[#ea580c]" aria-hidden="true">{icon}</span><h3 className="mt-6 font-serif text-2xl font-bold text-[#7f1d1d]">{title}</h3><p className="mt-2 leading-7 text-[#795548]">{text}</p><span className="mt-6 inline-block text-sm font-bold text-[#c2410c] group-hover:underline">Coming soon →</span></Link>)}</div>
    </section>
    <section className="border-y border-[#f1d7a6] py-16 sm:py-20">
      <div className="mb-10 max-w-xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#c2410c]">A clear beginning</p>
        <h2 className="mt-3 font-serif text-3xl font-bold text-[#7f1d1d] sm:text-4xl">A calmer way to explore.</h2>
        <p className="mt-4 leading-7 text-[#795548]">Start with what matters to you, understand what the tools can and cannot say, and keep your own reflection at the centre.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <div><span className="font-serif text-3xl font-bold text-[#c9962d]">01</span><h3 className="mt-3 font-semibold text-[#7f1d1d]">Choose a path</h3><p className="mt-2 text-sm leading-6 text-[#795548]">Begin with a Kundli, a daily Panchang, or a question about an important moment.</p></div>
        <div><span className="font-serif text-3xl font-bold text-[#c9962d]">02</span><h3 className="mt-3 font-semibold text-[#7f1d1d]">Bring your context</h3><p className="mt-2 text-sm leading-6 text-[#795548]">When a tool needs personal details, you decide what to share and why.</p></div>
        <div><span className="font-serif text-3xl font-bold text-[#c9962d]">03</span><h3 className="mt-3 font-semibold text-[#7f1d1d]">Reflect with care</h3><p className="mt-2 text-sm leading-6 text-[#795548]">Use clear explanations as a starting point for reflection, never as certainty.</p></div>
      </div>
    </section>
    <section className="rounded-2xl bg-[#fff0d2] px-6 py-10 text-center sm:px-10"><p className="font-serif text-2xl font-bold text-[#7f1d1d]">Built with reverence, not certainty.</p><p className="mx-auto mt-3 max-w-2xl text-[#795548]">We’re creating tools that invite reflection—not predictions presented as fact. Learn about our <Link className="font-semibold text-[#c2410c] underline" href="/methodology">methodology</Link>.</p></section>
  </div>;
}
