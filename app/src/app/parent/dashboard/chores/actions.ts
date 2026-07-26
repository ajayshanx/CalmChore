"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateInstanceDates, type RecurrenceType } from "@/lib/chores/schedule";

const RECURRENCE_TYPES: RecurrenceType[] = ["none", "daily", "weekly", "monthly"];

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
    const { error: assignError } = await supabase.from("chore_assignments").insert(assignmentRows);
    if (assignError) {
      return { error: `Chore scheduled, but assignment failed: ${assignError.message}` };
    }
  }

  revalidatePath("/parent/dashboard/chores");
  revalidatePath("/parent/dashboard/calendar");
  return { success: true };
}
