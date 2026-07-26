import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InviteParentForm from "./InviteParentForm";
import ResetPasscodeButton from "./ResetPasscodeButton";
import AddChildForm from "./AddChildForm";

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  invited: "Invited",
};

export default async function ParentSetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/parent");
  }

  const { data: me } = await supabase
    .from("parents")
    .select("first_name, last_name, email, family_id, status")
    .eq("id", user.id)
    .maybeSingle();

  if (!me || me.status !== "active") {
    redirect("/parent/finish-setup");
  }

  const [{ data: allParents }, { data: children }] = await Promise.all([
    supabase
      .from("parents")
      .select("id, first_name, last_name, status")
      .eq("family_id", me.family_id)
      .order("created_at", { ascending: true }),
    supabase
      .from("children")
      .select("id, username, nickname")
      .eq("family_id", me.family_id)
      .order("created_at", { ascending: true }),
  ]);

  const otherParents = (allParents ?? []).filter((p) => p.id !== user.id);

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-2xl flex-col gap-10 px-6 py-10">
      <h1 className="text-2xl font-semibold text-calm-green">Setup</h1>

      <section>
        <h2 className="mb-3 text-lg font-medium text-calm-green">Profiles</h2>

        <div className="rounded-lg border border-calm-green/20 bg-white px-4 py-3">
          <p className="text-sm font-medium text-calm-text/50">Your account</p>
          <p className="font-medium">
            {me.first_name} {me.last_name}
          </p>
          <p className="text-sm text-calm-text/60">{me.email}</p>
        </div>

        {otherParents.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-sm font-medium text-calm-text/50">Other parents on this account</p>
            {otherParents.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-calm-green/20 bg-white px-4 py-3"
              >
                <span className="font-medium">
                  {p.first_name} {p.last_name}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    p.status === "active"
                      ? "bg-calm-greenLight text-calm-green"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {STATUS_LABELS[p.status] ?? p.status}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 rounded-lg border border-calm-green/20 bg-white p-4">
          <p className="mb-3 text-sm font-medium text-calm-text/50">Invite a parent</p>
          <InviteParentForm />
        </div>

        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-calm-text/50">Children</p>
          {children && children.length > 0 ? (
            <div className="flex flex-col gap-2">
              {children.map((child) => {
                const label = child.nickname || child.username || "Unnamed child";
                return (
                  <div
                    key={child.id}
                    className="rounded-lg border border-calm-green/20 bg-white px-4 py-3"
                  >
                    <p className="font-medium">{label}</p>
                    {child.username && (
                      <p className="text-sm text-calm-text/60">@{child.username}</p>
                    )}
                    <div className="mt-1">
                      <ResetPasscodeButton childId={child.id} childLabel={label} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-calm-text/60">No children added yet.</p>
          )}
          <div className="mt-3">
            <AddChildForm />
          </div>
        </div>
      </section>
    </main>
  );
}
