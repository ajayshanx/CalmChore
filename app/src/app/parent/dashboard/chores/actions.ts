"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateInstanceDates, type RecurrenceType } from "@/lib/chores/schedule";
import { notifyChild } from "@/lib/notifications";
import { todayStrInTimezone } from "@/lib/chores/calendarDates";
import { getFamilyTimezone } from "@/lib/families";

const RECURRENCE_TYPES: RecurrenceType[] = ["none", "daily", "weekly", "monthly"];
const CHORE_STATUSES = ["active", "inactive"];

export async function createChore(_prevState: unknown, formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const info = String(formData.get("info") || "").trim();
  const points = Number(formData.get("points") || 0);
  const requiresProof = formData.get("requiresProof") === "on";
  const assignmentType = String(formData.get("assignmentType") || "single");
  const recurrenceType = String(formData.get("recurrenceType") || "none") as RecurrenceType;
  const startDate = String(formData.get("startDate") || "");
  const recurrenceEndDate = String(formData.get("recurrenceEndDate") || "");
  const recurrenceCount = formData.get("recurrenceCount")
    ? Number(formData.get("recurrenceCount"))
    : null;
  const assignedTo = formData.getAll("assignedTo").map(String).filter(Boolean);

  if (!name) {
    return { error: "Chore name is required." };
  }
  if (!Number.isFinite(points) || points < 1) {
    return { error: "Points must be at least 1." };
  }
  if (assignmentType !== "single" && assignmentType !== "multi") {
    return { error: "Invalid assignment type." };
  }
  if (assignmentType === "single" && assignedTo.length > 1) {
    return { error: "A single-assignment chore can only be assigned to one child." };
  }
  if (!RECURRENCE_TYPES.includes(recurrenceType)) {
    return { error: "Invalid recurrence type." };
  }
  if (!startDate) {
    return { error: "Start date is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: parent } = await supabase
    .from("parents")
    .select("family_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!parent) {
    return { error: "Could not find your family." };
  }

  const { data: chore, error: choreError } = await supabase
    .from("chores")
    .insert({
      family_id: parent.family_id,
      created_by_parent_id: user.id,
      name,
      info: info || null,
      points,
      requires_proof: requiresProof,
      assignment_type: assignmentType,
      recurrence_type: recurrenceType,
      recurrence_end_date: recurrenceEndDate || null,
      recurrence_count: recurrenceCount,
      has_schedule: true,
    })
    .select("id")
    .single();

  if (choreError || !chore) {
    return { error: choreError?.message || "Could not create the chore." };
  }

  const dates = generateInstanceDates({
    recurrenceType,
    startDate,
    endDate: recurrenceEndDate || null,
    count: recurrenceCount,
  });

  const { data: instances, error: instancesError } = await supabase
    .from("chore_instances")
    .insert(dates.map((scheduled_date) => ({ chore_id: chore.id, scheduled_date, points })))
    .select("id");

  if (instancesError || !instances) {
    return { error: instancesError?.message || "Chore created, but could not schedule it." };
  }

  if (assignedTo.length > 0) {
    const assignmentRows = instances.flatMap((instance) =>
      assignedTo.map((childId) => ({
        chore_instance_id: instance.id,
        child_id: childId,
        status: "assigned" as const,
      }))
    );
    const { data: newAssignments, error: assignError } = await supabase
      .from("chore_assignments")
      .insert(assignmentRows)
      .select("id");
    if (assignError) {
      return { error: `Chore scheduled, but assignment failed: ${assignError.message}` };
    }
    if (newAssignments && newAssignments.length > 0) {
      await supabase.from("chore_status_events").insert(
        newAssignments.map((a) => ({ chore_assignment_id: a.id, event_type: "assigned" as const }))
      );
    }

    for (const childId of assignedTo) {
      await notifyChild(supabase, {
        familyId: parent.family_id,
        childId,
        action: "chore_assignment",
        message: `You were assigned a new chore: ${name}.`,
        link: "/child/dashboard/calendar",
      });
    }
  } else {
    // Left open for anyone to accept — "chore addition" rather than a
    // targeted assignment.
    const { data: familyChildren } = await supabase
      .from("children")
      .select("id")
      .eq("family_id", parent.family_id);
    for (const child of familyChildren ?? []) {
      await notifyChild(supabase, {
        familyId: parent.family_id,
        childId: child.id,
        action: "chore_addition",
        message: `A new chore is available: ${name}.`,
        link: "/child/dashboard/calendar",
      });
    }
  }

  revalidatePath("/parent/dashboard/chores");
  revalidatePath("/parent/dashboard/calendar");
  return { success: true };
}

// Edits the chore's own stored fields — name, info, default points,
// proof requirement, assignment type, and active/inactive status. This does
// NOT touch any existing chore_instances rows: per spec, instance points
// only *populate from* the chore's points at creation time and remain
// independently editable afterward, so changing the default here only
// affects instances created from this point on.
export async function updateChore(_prevState: unknown, formData: FormData) {
  const choreId = String(formData.get("choreId") || "");
  const name = String(formData.get("name") || "").trim();
  const info = String(formData.get("info") || "").trim();
  const points = Number(formData.get("points") || 0);
  const requiresProof = formData.get("requiresProof") === "on";
  const assignmentType = String(formData.get("assignmentType") || "single");
  const status = String(formData.get("status") || "active");

  if (!choreId) {
    return { error: "Missing chore." };
  }
  if (!name) {
    return { error: "Chore name is required." };
  }
  if (!Number.isFinite(points) || points < 1) {
    return { error: "Points must be at least 1." };
  }
  if (assignmentType !== "single" && assignmentType !== "multi") {
    return { error: "Invalid assignment type." };
  }
  if (!CHORE_STATUSES.includes(status)) {
    return { error: "Invalid status." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const { error } = await supabase
    .from("chores")
    .update({
      name,
      info: info || null,
      points,
      requires_proof: requiresProof,
      assignment_type: assignmentType,
      status,
    })
    .eq("id", choreId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/parent/dashboard/chores");
  revalidatePath("/parent/dashboard/calendar");
  return { success: true };
}

export type ChoreInstanceRow = {
  id: string;
  scheduledDate: string;
  scheduledTime: string | null;
  deadlineAt: string | null;
  points: number;
  assignments: { childLabel: string; status: string }[];
};

// Plain data fetch (not a form action) — called directly from the chore
// detail popup when it opens, so the Instances list doesn't need to be
// preloaded for every chore on the main Chores tab.
export async function listChoreInstances(choreId: string): Promise<ChoreInstanceRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows } = await supabase
    .from("chore_instances")
    .select(
      `id, scheduled_date, scheduled_time, deadline_at, points,
       chore_assignments ( status, children ( nickname, username ) )`
    )
    .eq("chore_id", choreId)
    .order("scheduled_date", { ascending: true });

  return (rows ?? []).map((row) => ({
    id: row.id,
    scheduledDate: row.scheduled_date,
    scheduledTime: row.scheduled_time,
    deadlineAt: row.deadline_at,
    points: row.points,
    assignments: (row.chore_assignments ?? []).map((a) => {
      const child = Array.isArray(a.children) ? a.children[0] : a.children;
      return {
        childLabel: child?.nickname || child?.username || "Child",
        status: a.status,
      };
    }),
  }));
}

// Manual single-instance add for an existing chore, per "Calm Chore
// Creation.txt": "the option to create a manual instance of an existing
// chore selecting all instance level fields."
export async function addChoreInstance(_prevState: unknown, formData: FormData) {
  const choreId = String(formData.get("choreId") || "");
  const scheduledDate = String(formData.get("scheduledDate") || "");
  const scheduledTime = String(formData.get("scheduledTime") || "");
  const deadlineAt = String(formData.get("deadlineAt") || "");
  const pointsRaw = String(formData.get("points") || "");
  const assignedTo = formData.getAll("assignedTo").map(String).filter(Boolean);

  if (!choreId) {
    return { error: "Missing chore." };
  }
  if (!scheduledDate) {
    return { error: "Date is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: chore } = await supabase
    .from("chores")
    .select("id, name, points, assignment_type, family_id")
    .eq("id", choreId)
    .maybeSingle();
  if (!chore) {
    return { error: "Chore not found." };
  }

  if (chore.assignment_type === "single" && assignedTo.length > 1) {
    return { error: "A single-assignment chore can only be assigned to one child." };
  }

  const points = pointsRaw ? Number(pointsRaw) : chore.points;
  if (!Number.isFinite(points) || points < 1) {
    return { error: "Points must be at least 1." };
  }

  const { data: instance, error: instanceError } = await supabase
    .from("chore_instances")
    .insert({
      chore_id: choreId,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime || null,
      deadline_at: deadlineAt ? new Date(deadlineAt).toISOString() : null,
      points,
    })
    .select("id")
    .single();

  if (instanceError || !instance) {
    return { error: instanceError?.message || "Could not create the instance." };
  }

  if (assignedTo.length > 0) {
    const { data: newAssignments, error: assignError } = await supabase
      .from("chore_assignments")
      .insert(
        assignedTo.map((childId) => ({
          chore_instance_id: instance.id,
          child_id: childId,
          status: "assigned" as const,
        }))
      )
      .select("id");
    if (assignError) {
      return { error: `Instance created, but assignment failed: ${assignError.message}` };
    }
    if (newAssignments && newAssignments.length > 0) {
      await supabase.from("chore_status_events").insert(
        newAssignments.map((a) => ({ chore_assignment_id: a.id, event_type: "assigned" as const }))
      );
    }

    for (const childId of assignedTo) {
      await notifyChild(supabase, {
        familyId: chore.family_id,
        childId,
        action: "chore_assignment",
        message: `You were assigned a new chore: ${chore.name}.`,
        link: "/child/dashboard/calendar",
      });
    }
  }

  revalidatePath("/parent/dashboard/chores");
  revalidatePath("/parent/dashboard/calendar");
  return { success: true };
}

// Deletes a scheduled instance. Guards, per "Calm Chore Creation.txt":
// "A past schedule cannot be deleted and schedule accepted by a child
// requires confirmation before deletion." A past date is always blocked
// outright; an instance any child has moved past "assigned" on (accepted,
// submitted, or already validated) requires the caller to resubmit with
// confirmed=true after being warned.
export async function deleteChoreInstance(_prevState: unknown, formData: FormData) {
  const instanceId = String(formData.get("instanceId") || "");
  const confirmed = formData.get("confirmed") === "true";

  if (!instanceId) {
    return { error: "Missing instance." };
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
    .select(
      `id, scheduled_date, chores ( family_id ), chore_assignments ( id, status )`
    )
    .eq("id", instanceId)
    .maybeSingle();
  if (!instance) {
    return { error: "Instance not found." };
  }

  const chore = Array.isArray(instance.chores) ? instance.chores[0] : instance.chores;
  const timezone = chore?.family_id ? await getFamilyTimezone(supabase, chore.family_id) : "UTC";
  const today = todayStrInTimezone(timezone);

  if (instance.scheduled_date < today) {
    return { error: "A past schedule can't be deleted." };
  }

  const assignments = instance.chore_assignments ?? [];
  const hasProgressed = assignments.some((a) => a.status !== "assigned");
  if (hasProgressed && !confirmed) {
    return {
      needsConfirm: true,
      error: "A child has already accepted or submitted this chore. Delete anyway?",
    };
  }

  if (assignments.length > 0) {
    const { error: unassignError } = await supabase
      .from("chore_assignments")
      .delete()
      .eq("chore_instance_id", instanceId);
    if (unassignError) {
      return { error: unassignError.message };
    }
  }

  const { error } = await supabase.from("chore_instances").delete().eq("id", instanceId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/parent/dashboard/chores");
  revalidatePath("/parent/dashboard/calendar");
  return { success: true };
}
