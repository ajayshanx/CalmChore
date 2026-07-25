import Link from "next/link";

export default function ChildLoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold text-calm-green">Child Login</h1>
      <p className="mt-2 max-w-sm text-calm-text/70">
        Username + passcode login is built next — this is a placeholder so the route exists.
      </p>
      <Link href="/" className="mt-6 text-calm-text/50 underline">
        ← Back
      </Link>
    </main>
  );
}
