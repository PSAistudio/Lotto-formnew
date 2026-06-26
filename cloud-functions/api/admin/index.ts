import { createClient } from "@supabase/supabase-js";

function getClient(context: any) {
  const url = context.env?.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = context.env?.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export async function onRequestGet(context: any) {
  try {
    const url = new URL(context.request.url);
    const resource = url.searchParams.get("resource");
    const status = url.searchParams.get("status");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const supabase = getClient(context);

    if (resource === "payment_channels") {
      const { data, error } = await supabase
        .from("payment_channels")
        .select("*");

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ channels: data || [] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (resource === "audit_logs") {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ audit_logs: data || [] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (resource === "schemas") {
      const { data, error } = await supabase
        .from("form_schemas")
        .select("*");

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ schemas: data || [] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Default: list orders with pagination
    let query = supabase
      .from("orders")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status) query = query.eq("status", status);

    const { data: orders, count, error } = await query;

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Calculate stats
    const { data: allOrders, error: statsError } = await supabase
      .from("orders")
      .select("net_amount, status");

    const total_count = allOrders?.length || 0;
    const total_revenue = allOrders?.reduce((sum: number, o: any) => sum + (o.net_amount || 0), 0) || 0;

    return new Response(
      JSON.stringify({
        orders: orders || [],
        total_count,
        total_revenue,
        page,
        limit,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function onRequestPatch(context: any) {
  try {
    const body = await context.request.json();
    const { action, order_id, status, schema_id, schema_json, channel_id, active } = body;

    const supabase = getClient(context);

    if (action === "update_order_status" && order_id && status) {
      const { data, error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", order_id)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      await supabase.from("audit_logs").insert({
        actor_id: "admin",
        action: "update_order_status",
        target_type: "order",
        target_id: order_id,
        meta: { status },
      });

      return new Response(
        JSON.stringify(data),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (action === "update_schema" && schema_id && schema_json) {
      const { data, error } = await supabase
        .from("form_schemas")
        .update({ schema_json, updated_at: new Date().toISOString() })
        .eq("id", schema_id)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      await supabase.from("audit_logs").insert({
        actor_id: "admin",
        action: "update_schema",
        target_type: "form_schema",
        target_id: schema_id,
        meta: {},
      });

      return new Response(
        JSON.stringify(data),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (action === "toggle_channel" && channel_id) {
      const { data: channel } = await supabase
        .from("payment_channels")
        .select("active")
        .eq("id", channel_id)
        .single();

      const newActive = active !== undefined ? active : !channel?.active;

      const { data, error } = await supabase
        .from("payment_channels")
        .update({ active: newActive })
        .eq("id", channel_id)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify(data),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
