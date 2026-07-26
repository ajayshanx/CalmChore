import { redirect } from "next/navigation";
import { getChildSession } from "@/lib/childSession";
import { createServiceClient } from "@/lib/supabase/service";
import { pillClass } from "@/lib/chores/calendarColours";
import ProfileForm from "./ProfileForm";

export default async function ChildSetupPage() {
  const session = await getChildSession();
  if (!session) {
    redirect("/child");
  }

  const supabase = createServiceClient();
  const { data: badges } = await supabase
    .from("child_badges")
    .select("id, emoji, label, note, created_at")
    .eq("child_id", session.childId)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-md flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold text-calm-green">Setup</h1>
      <section>
        <h2 className="mb-3 text-lg font-medium text-calm-green">My Profile</h2>
        <ProfileForm nickname={session.nickname} accentColour={session.accentColour} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-calm-green">Badges</h2>
        {badges && badges.length > 0 ? (
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
            {badges.map((b) => (
              <div key={b.id} className="flex flex-col items-center gap-1.5 text-center">
                <div
                  title={b.note ?? undefined}
                  className={`flex h-16 w-16 items-center justify-center rounded-full text-3xl ${pillClass(
                    session.accentColour
                  )}`}
                >
                  {b.emoji}
                </div>
                <p className="text-xs font-medium leading-tight text-calm-text">{b.label}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-calm-text/60">
            No badges yet — keep at it and your parents might give you one!
          </p>
        )}
      </section>
    </main>
  );
}
