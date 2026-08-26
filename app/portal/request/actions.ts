"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function submitRequest(formData: FormData) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const serviceId = formData.get("service_id") as string;
  const categoryId = formData.get("category_id") as string;
  const subject = formData.get("subject") as string;
  const description = formData.get("description") as string;
  const priority = formData.get("priority") as string;

  if (!serviceId || !categoryId || !subject || !description) {
    redirect("/portal/request?error=All+required+fields+must+be+filled");
  }

  const { data, error } = await supabase
    .from("tickets")
    .insert({
      requester_id: user.id,
      service_id: serviceId,
      category_id: categoryId,
      subject,
      description,
      priority: priority || "normal",
      status: "open",
    })
    .select()
    .single();

  if (error) {
    redirect("/portal/request?error=" + encodeURIComponent(error.message));
  }

  redirect(`/portal/tickets/${data.id}`);
}
