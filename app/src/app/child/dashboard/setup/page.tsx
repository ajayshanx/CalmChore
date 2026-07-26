import { redirect } from "next/navigation";
import { getChildSession } from "@/lib/childSession";
import ProfileForm from "./ProfileForm";

export default async function ChildSetupPage() {
  const session = await getChildSession();
  if (!session) {
    redirect("/child");
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-md flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold text-calm-green">Setup</h1>
      <section>
        <h2 className="mb-3 text-lg font-medium text-calm-green">My Profile</h2>
        <ProfileForm nickname={session.nickname} accentColour={session.accentColour} />
      </section>
    </main>
  );
}
