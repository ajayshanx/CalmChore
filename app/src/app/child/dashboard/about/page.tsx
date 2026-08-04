export default function ChildAboutPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-2xl flex-col gap-10 px-6 py-10">
      <h1 className="text-2xl font-semibold text-calm-green">About</h1>

      <section>
        <h2 className="mb-3 text-lg font-medium text-calm-green">Welcome to Calm Chore 👋</h2>
        <div className="rounded-lg border border-calm-green/20 bg-white px-4 py-4 text-sm text-calm-text/80">
          <p>
            Calm Chore is where you pick up chores, earn points for finishing them, and level up
            through tiers as you build a streak. Here&apos;s a quick guide to get you going.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-calm-green">How to use Calm Chore</h2>
        <div className="flex flex-col gap-4 rounded-lg border border-calm-green/20 bg-white px-4 py-4">
          <div>
            <p className="mb-1 text-sm font-semibold text-calm-green">Picking up chores</p>
            <p className="text-sm text-calm-text/80">
              Open Calendar or My Chores to see chores that are open or assigned to you. Tap one
              to accept it, then submit proof when it&apos;s done for a parent to review.
            </p>
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold text-calm-green">Viewing your calendar</p>
            <p className="text-sm text-calm-text/80">
              Calendar shows every chore by date so you can plan ahead and see what&apos;s
              waiting for you.
            </p>
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold text-calm-green">Tiers and levels</p>
            <p className="text-sm text-calm-text/80">
              Every day you complete a validated chore keeps your streak alive. The longer your
              streak, the higher your tier — from Rook all the way up to Demigod — and each tier
              has 3 levels inside it. Miss a day and your streak resets, so consistency is what
              moves you up.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-calm-green">Add Calm Chore to your home screen</h2>
        <div className="flex flex-col gap-4 rounded-lg border border-calm-green/20 bg-white px-4 py-4">
          <div>
            <p className="mb-1 text-sm font-semibold text-calm-green">iPhone / iPad</p>
            <p className="text-sm text-calm-text/80">
              Tap the Share icon in Safari, scroll down and tap &quot;Add to Home Screen,&quot;
              then tap &quot;Add.&quot;
            </p>
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold text-calm-green">Android</p>
            <p className="text-sm text-calm-text/80">
              Tap the three-dot menu in Chrome, then tap &quot;Add to Home screen&quot; and
              confirm.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
