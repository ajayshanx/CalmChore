import Link from "next/link";

export default function ParentAboutPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-2xl flex-col gap-10 px-6 py-10">
      <h1 className="text-2xl font-semibold text-calm-green">About</h1>

      <section>
        <h2 className="mb-3 text-lg font-medium text-calm-green">About the app</h2>
        <div className="flex flex-col gap-3 rounded-lg border border-calm-green/20 bg-white px-4 py-4 text-sm text-calm-text/80">
          <p>
            Calm Chore turns everyday household chores into a gentle, game-like routine kids
            actually want to show up for. Parents assign chores, kids complete them and submit
            proof, and points, streaks, and tiers do the rest of the motivating — no nagging
            required.
          </p>
          <p>
            The Calm Chore name is also a play on words, coming from the transliteration of the
            Hindi phrase for slacker.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-calm-green">Add Calm Chore to your home screen</h2>
        <div className="flex flex-col gap-4 rounded-lg border border-calm-green/20 bg-white px-4 py-4">
          <div>
            <p className="mb-1 text-sm font-semibold text-calm-green">iPhone / iPad (Safari)</p>
            <p className="text-sm text-calm-text/80">
              Tap the Share icon (the square with an arrow) in Safari&apos;s toolbar, scroll down
              and tap &quot;Add to Home Screen,&quot; then tap &quot;Add&quot; to confirm.
            </p>
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold text-calm-green">Android (Chrome)</p>
            <p className="text-sm text-calm-text/80">
              Tap the three-dot menu in the top right of Chrome, then tap &quot;Add to Home
              screen&quot; (or &quot;Install app&quot;), and confirm.
            </p>
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold text-calm-green">Desktop (Chrome / Edge)</p>
            <p className="text-sm text-calm-text/80">
              Look for an install icon in the address bar, or open the browser menu and choose
              &quot;Install Calm Chore.&quot;
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-calm-green">Your family&apos;s privacy</h2>
        <div className="rounded-lg border border-calm-green/20 bg-calm-greenLight px-4 py-3 text-sm text-calm-text">
          <p>
            Proof photos are deleted the moment you review a submission, and we never ask for or
            store a child&apos;s real name — only a chosen username and nickname. For the full
            details, see{" "}
            <Link href="/parent/dashboard/setup" className="underline text-calm-green">
              Setup → Privacy Policy
            </Link>
            .
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-calm-green">How to use Calm Chore</h2>
        <div className="flex flex-col gap-4 rounded-lg border border-calm-green/20 bg-white px-4 py-4">
          <div>
            <p className="mb-1 text-sm font-semibold text-calm-green">Creating and editing chores</p>
            <p className="text-sm text-calm-text/80">
              Head to Chores to create a chore with a point value and instructions. From the
              Calendar you can assign it to a specific child or leave it open for anyone to pick
              up.
            </p>
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold text-calm-green">Adding your children</p>
            <p className="text-sm text-calm-text/80">
              In Setup, use &quot;Add Child&quot; to create a profile and passcode for each kid —
              no email or real name required.
            </p>
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold text-calm-green">Adding other parents</p>
            <p className="text-sm text-calm-text/80">
              Also in Setup, invite a co-parent by email so you can both manage the same family
              account.
            </p>
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold text-calm-green">The chore calendar</p>
            <p className="text-sm text-calm-text/80">
              The Calendar shows every chore instance by date and who it&apos;s assigned to, so
              you can see what&apos;s coming up at a glance.
            </p>
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold text-calm-green">Points and redemption</p>
            <p className="text-sm text-calm-text/80">
              Kids earn points when you validate a completed chore. They can request to redeem
              points for a reward, which you approve or reject from Points Redemption.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
