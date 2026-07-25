"use server";

import { redirect } from "next/navigation";
import { clearChildSessionCookie } from "@/lib/childSession";

export async function logoutChild() {
  await clearChildSessionCookie();
  redirect("/child");
}
