"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateInstanceDates, type RecurrenceType } from "@/lib/chores/schedule";
import { notifyChild } from "@/lib/notifications";
import { todayStrInTimezone } from "@/lib/chores/calendarDates";
import { getFamilyTimezone } from "@/lib/families";
import { embedText, choreEmbeddingText } from "@/lib/embeddings";

const RECURRENCE_TYPES: RecurrenceType[] = ["none", "daily", "weekly", "monthly", "manual"];
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
  // "Set Manually" — Calm Chore Creation.txt's 4th recurrence cadence,
  // alongside daily/weekly/monthly. Parallel arrays from the repeatable
  // date/time rows in CreateChoreForm (getAll preserves DOM order, so index
  // i in each array belongs to the same row).
  const manualDates = formData.getAll("manualDate").map(String);
  const manualTimes = formData.getAll("manualTime").map(String);

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
  if (recurrenceType === "manual") {
    if (manualDates.length === 0 || manualDates.some((d) => !d)) {
      return { error: "Enter at least one date for a manually-scheduled chore." };
    }
  } else if (!startDate) {
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

  // Best-effort — powers semantic search over the cross-family Chore Ideas
  // library (see match_chores RPC). Runs via next/server's after() rather
  // than a bare unawaited promise, since Vercel can freeze the serverless
  // function the instant the action returns — an un-awaited fetch could get
  // cut off mid-request otherwise. Failure here shouldn't block chore
  // creation itself; the chore just won't show up in semantic search until
  // a later edit or backfill retries it.
  after(async () => {
    const embedding = await embedText(choreEmbeddingText(name, info || null));
    if (embedding) {
      await supabase.from("chores").update({ embedding }).eq("id", chore.id);
    }
  });

  const instanceRows =
    recurrenceType === "manual"
      ? manualDates.map((scheduled_date, i) => ({
          chore_id: chore.id,
          scheduled_date,
          scheduled_time: manualTimes[i] || null,
          points,
        }))
      : generateInstanceDates({
          recurrenceType,
          startDate,
          endDate: recurrenceEndDate || null,
          count: recurrenceCount,
        }).dates.map((scheduled_date) => ({
          chore_id: chore.id,
          scheduled_date,
          scheduled_time: null,
          points,
        }));

  const { data: instances, error: instancesError } = await supabase
    .from("chore_instances")
    .insert(instanceRows)
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

  // Keep the embedding in sync with whatever name/info was just saved — see
  // the matching comment in createChore above.
  after(async () => {
    const embedding = await embedText(choreEmbeddingText(name, info || null));
    if (embedding) {
      await supabase.from("chores").update({ embedding }).eq("id", choreId);
    }
  });

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
    .select("id, name, points, assignment_type, family_id, recurrence_type")
    .eq("id", choreId)
    .maybeSingle();
  if (!chore) {
    return { error: "Chore not found." };
  }
  if (chore.recurrence_type === "none") {
    // "A chore that isn't recurring will have a single chore instance, with
    // no option to create a new instance." — Calm Chore Creation.txt. The UI
    // already hides this action for a non-recurring chore; this is just
    // defense in depth against a direct form submission.
    return { error: "This chore isn't recurring, so it can't have another instance added." };
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

  // A manually-added instance is exactly how a parent "extends" a recurring
  // chore after being warned its schedule was running low — clear the flag
  // so the warning can fire again once this newly-extended schedule runs
  // low in turn, instead of staying silently suppressed forever.
  await supabase.from("chores").update({ low_schedule_notified: false }).eq("id", choreId);

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

// Toggles the current parent's Like on a "Chore Idea from other families"
// row. chore_likes has no "liked" boolean to flip — presence of the
// (chore_id, parent_id) row IS the like — so this selects first to decide
// insert vs delete. chores.like_count stays in sync automatically via the
// trg_chore_likes_count trigger (already part of the original schema), so
// there's nothing else to update here.
export async function toggleChoreLike(_prevState: unknown, formData: FormData) {
  const choreId = String(formData.get("choreId") || "");
  if (!choreId) {
    return { error: "Missing chore." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: existing } = await supabase
    .from("chore_likes")
    .select("chore_id")
    .eq("chore_id", choreId)
    .eq("parent_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error: deleteError } = await supabase
      .from("chore_likes")
      .delete()
      .eq("chore_id", choreId)
      .eq("parent_id", user.id);
    if (deleteError) {
      return { error: deleteError.message };
    }
  } else {
    const { error: insertError } = await supabase
      .from("chore_likes")
      .insert({ chore_id: choreId, parent_id: user.id });
    if (insertError) {
      return { error: insertError.message };
    }
  }

  revalidatePath("/parent/dashboard/chores");
  return { success: true };
}

export type ChoreIdeaSearchResult = {
  id: string;
  name: string;
  info: string | null;
  points: number;
  likeCount: number;
  likedByMe: boolean;
  similarity: number;
};

// Semantic search over "Chore Ideas from Other Families" — embeds the
// parent's free-text query and calls the match_chores RPC (see
// add_chore_embeddings / match_chores_exclude_family migrations), which
// runs under this parent's own RLS just like the plain browse query does.
// Plain data fetch, not a form action, called directly from ChoresView the
// same way listChoreInstances is.
export async function searchChoreIdeas(query: string): Promise<{ results: ChoreIdeaSearchResult[]; error?: string }> {
  const trimmed = query.trim();
  if (!trimmed) return { results: [] };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { results: [], error: "You must be logged in." };
  }

  const { data: parent } = await supabase
    .from("parents")
    .select("family_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!parent) {
    return { results: [], error: "Could not find your family." };
  }

  const embedding = await embedText(trimmed);
  if (!embedding) {
    return { results: [], error: "Search is temporarily unavailable." };
  }

  // match_chores isn't in the generated Supabase types (it's a hand-written
  // RPC, not a table), so .rpc() can't infer its return shape on its own —
  // spell it out here rather than letting `matches` fall back to `any`.
  type MatchChoreRow = {
    id: string;
    name: string;
    info: string | null;
    points: number;
    like_count: number;
    similarity: number;
  };

  const { data: matches, error } = await supabase.rpc("match_chores", {
    query_embedding: embedding,
    match_count: 15,
    min_similarity: 0.15,
    exclude_family_id: parent.family_id,
  }) as { data: MatchChoreRow[] | null; error: { message: string } | null };
  if (error) {
    return { results: [], error: error.message };
  }

  const { data: myLikes } = await supabase.from("chore_likes").select("chore_id").eq("parent_id", user.id);
  const likedChoreIds = new Set((myLikes ?? []).map((l) => l.chore_id));

  const results: ChoreIdeaSearchResult[] = (matches ?? []).map((m: MatchChoreRow) => ({
    id: m.id,
    name: m.name,
    info: m.info,
    points: m.points,
    likeCount: m.like_count,
    likedByMe: likedChoreIds.has(m.id),
    similarity: m.similarity,
  }));

  return { results };
}
