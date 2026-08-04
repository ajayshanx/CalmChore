"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyChild } from "@/lib/notifications";

// Adds a child assignment to an instance (turns an unassigned chore into an
// assigned one, or adds another child to a multi-assignment chore). Doesn't
// touch existing assignments — reassigning/removing a child who has already
// accepted or submitted proof is a separate, more careful flow than this
// first pass covers.
export async function assignChildToInstance(_prevState: unknown, formData: FormData) {
  const instanceId = String(formData.get("instanceId") || "");
  const childId = String(formData.get("childId") || "");

  if (!instanceId || !childId) {
    return { error: "Missing chore or child." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: instance } = await supabase
    .from("chore_instances")
    .select("scheduled_date, chores ( name, family_id )")
    .eq("id", instanceId)
    .maybeSingle();
  const chore = Array.isArray(instance?.chores) ? instance.chores[0] : instance?.chores;
  if (instance?.scheduled_date) {
    const { data: activeBreak } = await supabase
      .from("chore_breaks")
      .select("id, chore_break_children!inner ( child_id )")
      .eq("status", "active")
      .eq("chore_break_children.child_id", childId)
      .lte("start_date", instance.scheduled_date)
      .gte("end_date", instance.scheduled_date)
      .maybeSingle();
    if (activeBreak) {
      return { error: "This child is on a Chore Break that day." };
    }
  }

  const { data: newAssignment, error } = await supabase
    .from("chore_assignments")
    .insert({ chore_instance_id: instanceId, child_id: childId, status: "assigned" })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  if (newAssignment) {
    await supabase
      .from("chore_status_events")
      .insert({ chore_assignment_id: newAssignment.id, event_type: "assigned" });
  }

  if (chore?.family_id) {
    await notifyChild(supabase, {
      familyId: chore.family_id,
      childId,
      action: "chore_assignment",
      message: `You were assigned a new chore: ${chore.name ?? "Chore"}.`,
      link: "/child/dashboard/calendar",
    });
  }

  revalidatePath("/parent/dashboard/calendar");
  return { success: true };
}

// Edits the instance's own schedule/deadline/points — the fields "Calm Chore
// Creation.txt" calls out as instance-level and independently editable from
// the chore's defaults. Fires the chore_value_update / chore_deadline_update
// notifications (pre-defined in the notification catalog, unused until now)
// to every child currently assigned to this instance when the relevant
// field actually changes.
export async function updateInstanceSchedule(_prevState: unknown, formData: FormData) {
  const instanceId = String(formData.get("instanceId") || "");
  const scheduledDate = String(formData.get("scheduledDate") || "");
  const scheduledTime = String(formData.get("scheduledTime") || "");
  const deadlineAt = String(formData.get("deadlineAt") || "");
  const points = Number(formData.get("points") || 0);

  if (!instanceId) {
    return { error: "Missing chore." };
  }
  if (!scheduledDate) {
    return { error: "Date is required." };
  }
  if (!Number.isFinite(points) || points < 1) {
    return { error: "Points must be at least 1." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: before } = await supabase
    .from("chore_instances")
    .select(
      `points, deadline_at, chores ( name, family_id ), chore_assignments ( child_id, status )`
    )
    .eq("id", instanceId)
    .maybeSingle();
  if (!before) {
    return { error: "Instance not found." };
  }
  const chore = Array.isArray(before.chores) ? before.chores[0] : before.chores;

  const newDeadlineIso = deadlineAt ? new Date(deadlineAt).toISOString() : null;
  const pointsChanged = before.points !== points;
  const deadlineChanged = (before.deadline_at ?? null) !== newDeadlineIso;

  const { error } = await supabase
    .from("chore_instances")
    .update({
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime || null,
      deadline_at: newDeadlineIso,
      points,
    })
    .eq("id", instanceId);

  if (error) {
    return { error: error.message };
  }

  if (chore?.family_id && (pointsChanged || deadlineChanged)) {
    const activeChildIds = (before.chore_assignments ?? [])
      .filter((a) => a.status !== "verified_complete" && a.status !== "verified_partially_complete")
      .map((a) => a.child_id);
    for (const childId of activeChildIds) {
      if (pointsChanged) {
        await notifyChild(supabase, {
          familyId: chore.family_id,
          childId,
          action: "chore_value_update",
          message: `The points for "${chore.name}" changed to ${points}.`,
          link: "/child/dashboard/calendar",
        });
      }
      if (deadlineChanged) {
        await notifyChild(supabase, {
          familyId: chore.family_id,
          childId,
          action: "chore_deadline_update",
          message: newDeadlineIso
            ? `The deadline for "${chore.name}" changed to ${new Date(newDeadlineIso).toLocaleString()}.`
            : `The deadline for "${chore.name}" was removed.`,
          link: "/child/dashboard/calendar",
        });
      }
    }
  }

  revalidatePath("/parent/dashboard/calendar");
  revalidatePath("/parent/dashboard/chores");
  return { success: true };
}

// Removes a single assignment from an instance — only while it's still
// "assigned" (the child hasn't accepted it yet). Once a child has accepted,
// submitted, or been validated, pulling the assignment out from under them
// is a different, more careful operation than this covers, so it's blocked
// here rather than silently discarding their progress.
export async function unassignChildFromInstance(_prevState: unknown, formData: FormData) {
  const assignmentId = String(formData.get("assignmentId") || "");
  if (!assignmentId) {
    return { error: "Missing assignment." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: assignment } = await supabase
    .from("chore_assignments")
    .select("id, status")
    .eq("id", assignmentId)
    .maybeSingle();
  if (!assignment) {
    return { error: "Assignment not found." };
  }
  if (assignment.status !== "assigned") {
    return { error: "This chore has already been accepted, so it can't be unassigned here." };
  }

  const { error } = await supabase.from("chore_assignments").delete().eq("id", assignmentId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/parent/dashboard/calendar");
  return { success: true };
}
