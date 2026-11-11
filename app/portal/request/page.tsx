import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RequestForm } from "./request-form";

export const dynamic = "force-dynamic";

export default async function RequestPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?next=%2Fportal%2Frequest");
  }

  const servicesResult = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("name");

  const services = servicesResult.data || [];
  const hasLoadError = Boolean(servicesResult.error);
  const isEmpty = !hasLoadError && services.length === 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Submit a Request</h1>
        <p className="mt-1 text-foreground/60">
          Fill out the form below and we will get back to you during business hours.
        </p>
      </div>

      <RequestForm
        services={services}
        hasLoadError={hasLoadError}
        isEmpty={isEmpty}
      />
    </div>
  );
}

