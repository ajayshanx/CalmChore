import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-6 text-center">
      <div>
        <Image
          src="/logo.png"
          alt="Calm Chore"
          width={160}
          height={160}
          priority
          unoptimized
          className="mx-auto mb-4"
        />
        <h1 className="text-4xl font-semibold text-calm-green">Calm Chore</h1>
        <p className="mt-2 max-w-sm text-calm-text/80">
          A calm, gamified way for your family to manage chores together.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-4">
        <Link
          href="/parent"
          className="rounded-xl bg-calm-green px-6 py-4 text-lg font-medium text-white shadow-sm transition hover:opacity-90"
        >
          Parent Login
        </Link>
        <Link
          href="/child"
          className="rounded-xl border-2 border-calm-green px-6 py-4 text-lg font-medium text-calm-green transition hover:bg-calm-greenLight"
        >
          Child Login
        </Link>
      </div>
    </main>
  );
}
