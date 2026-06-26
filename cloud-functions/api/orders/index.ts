import { createClient } from "@supabase/supabase-js";

function getClient(context: any) {
  const url = context.env?.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = context.env?.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

function matchPricingRule(
  lottery_type: string,
  bet_type: string,
  rules: any[]
): any | null {
  const exact = rules.find(
    (r: any) =>
      r.when.lottery_type === lottery_type && r.when.bet_type === bet_type
  );
  if (exact) return exact;
  const fallback = rules.find(
    (r: any) => r.when.lottery_type === lottery_type && !r.when.bet_type
  );
  return fallback || null;
}

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json();
    const { user_id, lottery_type, draw_date, items } = body;

    if (!user_id || !lottery_type || !draw_date || !items?.length) {
      return new Response(
        JSON.stringify({ error: "user_id, lottery_type, draw_date, and items are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = getClient(context);

    // Fetch pricing rules for this lottery type
    const { data: schemaData, error: schemaError } = await supabase
      .from("form_schemas")
      .select("pricing_rules")
      .eq("lottery_type", lottery_type)
      .single();

    if (schemaError || !schemaData) {
      return new Response(
        JSON.stringify({ error: "Schema not found for lottery type" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const pricingRules = schemaData.pricing_rules || [];

    // Calculate each item
    let total_amount = 0;
    let total_discount = 0;
    const orderItems = items.map((item: any, idx: number) => {
      const rule = matchPricingRule(lottery_type, item.bet_type, pricingRules);
      const payout_rate = rule?.payout ?? 0;
      const discount_rate = rule?.discount ?? 0;
      const discount_amount = item.stake * discount_rate;
      const net_amount = item.stake - discount_amount;

      total_amount += item.stake;
      total_discount += discount_amount;

      return {
        number: item.number,
        bet_type: item.bet_type,
        stake: item.stake,
        payout_rate,
        discount_rate,
        net_amount,
      };
    });

    const net_amount = total_amount - total_discount;

    // Insert order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id,
        lottery_type,
        draw_date,
        total_amount,
        discount: total_discount,
        net_amount,
        status: "pending",
      })
      .select()
      .single();

    if (orderError) {
      return new Response(
        JSON.stringify({ error: orderError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Insert order items
    const orderItemsWithOrderId = orderItems.map((item: any) => ({
      ...item,
      order_id: order.id,
    }));

    const { data: insertedItems, error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItemsWithOrderId)
      .select();

    if (itemsError) {
      return new Response(
        JSON.stringify({ error: itemsError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      actor_id: user_id,
      action: "create_order",
      target_type: "order",
      target_id: order.id,
      meta: { lottery_type, draw_date, total_amount, net_amount },
    });

    return new Response(
      JSON.stringify({ ...order, items: insertedItems }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function onRequestGet(context: any) {
  try {
    const url = new URL(context.request.url);
    const user_id = url.searchParams.get("user_id");
    const order_id = url.searchParams.get("order_id");
    const status = url.searchParams.get("status");

    const supabase = getClient(context);

    if (order_id) {
      // Get single order with items
      const { data: order, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", order_id)
        .single();

      if (error || !order) {
        return new Response(
          JSON.stringify({ error: "Order not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      const { data: items } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", order_id);

      return new Response(
        JSON.stringify({ ...order, items: items || [] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // List orders
    let query = supabase.from("orders").select("*").order("created_at", { ascending: false });

    if (user_id) query = query.eq("user_id", user_id);
    if (status) query = query.eq("status", status);

    const { data: orders, error } = await query;

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ orders: orders || [] }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
