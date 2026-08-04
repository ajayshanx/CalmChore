"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABELS, formatRequestDetails, type RedemptionCategory } from "@/lib/redemption";

function revalidateAffectedPaths() {
  revalidatePath("/parent/dashboard/redemption");
  revalidatePath("/parent/dashboard");
  revalidatePath("/child/dashboard/redeem");
  revalidatePath("/child/dashboard/points");
}

export async function approveRedemption(_prevState: unknown, formData: FormData) {
  const requestId = String(formData.get("requestId") || "");
  const pointsRaw = formData.get("pointsToDebit");
  const pointsToDebit = Number(pointsRaw);

  if (!requestId) {
    return { error: "Missing request." };
  }
  if (!Number.isFinite(pointsToDebit) || pointsToDebit <= 0) {
    return { error: "Enter how many points to debit." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  // RLS (redemption_family) already scopes this to the parent's own family.
  const { data: request } = await supabase
    .from("redemption_requests")
    .select("id, child_id, category, request_details, status")
    .eq("id", requestId)
    .maybeSingle();

  if (!request) {
    return { error: "Request not found." };
  }
  if (request.status !== "pending") {
    return { error: "This request has already been decided." };
  }

  const { data: ledgerRows } = await supabase
    .from("points_ledger")
    .select("delta")
    .eq("child_id", request.child_id);
  const currentTotal = (ledgerRows ?? []).reduce((sum, row) => sum + row.delta, 0);

  if (pointsToDebit > currentTotal) {
    return { error: `This child only has ${currentTotal} points — can't debit more than that.` };
  }

  const { error: updateError } = await supabase
    .from("redemption_requests")
    .update({
      status: "approved",
      points_used: pointsToDebit,
      decided_by_parent_id: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) {
    return { error: updateError.message };
  }

  const categoryLabel = CATEGORY_LABELS[request.category as RedemptionCategory] ?? request.category;
  const detailsText = formatRequestDetails(request.category, request.request_details);

  const { error: ledgerError } = await supabase.from("points_ledger").insert({
    child_id: request.child_id,
    delta: -pointsToDebit,
    type: "redemption_debit",
    reference_id: requestId,
    description: `${categoryLabel} — ${detailsText}`,
  });

  if (ledgerError) {
    return { error: ledgerError.message };
  }

  revalidateAffectedPaths();
  return { success: true };
}

export async function rejectRedemption(_prevState: unknown, formData: FormData) {
  const requestId = String(formData.get("requestId") || "");
  const reason = String(formData.get("rejectionReason") || "").trim();

  if (!requestId) {
    return { error: "Missing request." };
  }
  if (!reason) {
    return { error: "Please enter a reason for declining." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: request } = await supabase
    .from("redemption_requests")
    .select("id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (!request) {
    return { error: "Request not found." };
  }
  if (request.status !== "pending") {
    return { error: "This request has already been decided." };
  }

  const { error } = await supabase
    .from("redemption_requests")
    .update({
      status: "rejected",
      rejection_reason: reason,
      decided_by_parent_id: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    return { error: error.message };
  }

  revalidateAffectedPaths();
  return { success: true };
}
