import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="max-w-sm">
        <h1 className="text-2xl font-semibold text-calm-green">Check your email</h1>
        <p className="mt-3 text-calm-text/80">
          We&rsquo;ve sent a confirmation link to finish setting up your account. Click it to
          confirm your email — you&rsquo;ll be signed in automatically and taken straight to
          accepting the Terms &amp; Conditions.
        </p>
        <Link href="/parent" className="mt-6 inline-block text-calm-green underline">
          Back to login
        </Link>
      </div>
    </main>
  );
}
