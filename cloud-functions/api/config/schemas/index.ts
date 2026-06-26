import { createClient } from "@supabase/supabase-js";

function getClient(context: any) {
  const url = context.env?.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = context.env?.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export async function onRequestGet(context: any) {
  try {
    const url = new URL(context.request.url);
    const lottery_type = url.searchParams.get("lottery_type");

    const supabase = getClient(context);

    if (lottery_type) {
      // Return schema + pricing rules for specific lottery type
      const { data: schema, error } = await supabase
        .from("form_schemas")
        .select("*")
        .eq("lottery_type", lottery_type)
        .single();

      if (error || !schema) {
        return new Response(
          JSON.stringify({ error: "Schema not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ schema, pricing_rules: schema.pricing_rules || [] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Return all schemas
    const { data: schemas, error } = await supabase
      .from("form_schemas")
      .select("*");

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ schemas: schemas || [] }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
