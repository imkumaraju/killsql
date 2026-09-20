import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="text-sm uppercase tracking-[0.2em] text-lime-400">404</p>
      <h1 className="mt-3 text-3xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-zinc-400">That route does not exist. Try the problem list.</p>
      <Link href="/problems" className="mt-6 inline-block text-sm text-lime-300 hover:underline">
        Browse problems
      </Link>
    </div>
  );
}
