import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseUrl;

function getClient(context: any) {
  const url = context.env?.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = context.env?.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json();
    const { name, phone } = body;

    if (!name || !phone) {
      return new Response(
        JSON.stringify({ error: "name and phone are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = getClient(context);

    // Upsert user by phone
    const { data: existingUser, error: findError } = await supabase
      .from("users")
      .select("*")
      .eq("phone", phone)
      .single();

    if (existingUser) {
      // Return existing user
      const token = `tok_${existingUser.id}_${Date.now()}`;
      return new Response(
        JSON.stringify({ user: existingUser, token }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create new user
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({ name, phone, role: "user", status: "active" })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const token = `tok_${newUser.id}_${Date.now()}`;

    return new Response(
      JSON.stringify({ user: newUser, token }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
