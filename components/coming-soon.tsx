import Link from 'next/link';

export function ComingSoon({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <section className="mx-auto max-w-4xl py-8 text-center sm:py-16">
    <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#c2410c]">{eyebrow}</p>
    <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight text-[#7f1d1d] sm:text-6xl">{title}</h1>
    <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#795548]">{description}</p>
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-[#f1d7a6] bg-[#fff5e1] p-6 text-left shadow-sm">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-[#ffd166] text-xl text-[#7f1d1d]">✦</span><div><p className="font-semibold text-[#7f1d1d]">A little more time</p><p className="text-sm text-[#795548]">We’re preparing this with care.</p></div></div>
      <Link href="/signup" className="mt-5 inline-flex rounded-full bg-[#7f1d1d] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#991b1b]">Join the early list</Link>
    </div>
  </section>;
}
