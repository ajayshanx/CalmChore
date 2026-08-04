"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getChildSession } from "@/lib/childSession";
import { REDEMPTION_CATEGORIES, CATEGORY_LABELS, type RedemptionCategory, type RequestDetails } from "@/lib/redemption";
import { notifyAllParents } from "@/lib/notifications";

export async function requestRedemption(_prevState: unknown, formData: FormData) {
  const category = String(formData.get("category") || "") as RedemptionCategory;
  if (!REDEMPTION_CATEGORIES.includes(category)) {
    return { error: "Choose what you'd like to redeem for." };
  }

  const details: RequestDetails = {};
  if (category === "grocery" || category === "purchases" || category === "other") {
    details.whatWouldYouLike = String(formData.get("whatWouldYouLike") || "").trim();
    if (!details.whatWouldYouLike) {
      return { error: "Please say what you'd like." };
    }
  } else if (category === "eating_out") {
    details.restaurantCuisine = String(formData.get("restaurantCuisine") || "").trim();
    if (!details.restaurantCuisine) {
      return { error: "Please enter a restaurant, cuisine, or what you'd like." };
    }
  } else if (category === "screen_time") {
    details.interval = String(formData.get("interval") || "").trim();
    details.purpose = String(formData.get("purpose") || "").trim();
    if (!details.interval) {
      return { error: "Please choose a time interval." };
    }
    if (!details.purpose) {
      return { error: "Please enter the purpose of the time." };
    }
  } else if (category === "cash") {
    details.amount = String(formData.get("amount") || "").trim();
    if (!details.amount) {
      return { error: "Please enter an amount." };
    }
  }

  const session = await getChildSession();
  if (!session) {
    return { error: "Your session has expired. Please log in again." };
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("redemption_requests").insert({
    child_id: session.childId,
    category,
    request_details: details,
    status: "pending",
  });

  if (error) {
    return { error: error.message };
  }

  await notifyAllParents(supabase, {
    familyId: session.familyId,
    action: "point_redemption",
    message: `${session.nickname} requested a redemption: ${CATEGORY_LABELS[category]}.`,
    link: "/parent/dashboard/redemption",
  });

  revalidatePath("/child/dashboard/redeem");
  return { success: true };
}
