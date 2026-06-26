import { createClient } from "@supabase/supabase-js";

function getClient(context: any) {
  const url = context.env?.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = context.env?.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export async function onRequestPost(context: any) {
  try {
    const contentType = context.request.headers.get("content-type") || "";

    // Handle file upload (FormData)
    if (contentType.includes("multipart/form-data")) {
      const formData = await context.request.formData();
      const file = formData.get("file") as File;
      const orderId = formData.get("orderId") as string;

      if (!file || !orderId) {
        return new Response(
          JSON.stringify({ error: "file and orderId are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const supabase = getClient(context);
      const fileName = `${orderId}/${Date.now()}_${file.name}`;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("payment-slips")
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        return new Response(
          JSON.stringify({ error: uploadError.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      const { data: urlData } = supabase.storage
        .from("payment-slips")
        .getPublicUrl(fileName);

      return new Response(
        JSON.stringify({ slip_url: urlData.publicUrl }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Handle JSON payment creation
    const body = await context.request.json();
    const { order_id, method, amount, slip_url } = body;

    if (!order_id || !method || !amount) {
      return new Response(
        JSON.stringify({ error: "order_id, method, and amount are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = getClient(context);

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        order_id,
        method,
        amount,
        slip_url: slip_url || null,
        status: "pending",
      })
      .select()
      .single();

    if (paymentError) {
      return new Response(
        JSON.stringify({ error: paymentError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Update order status to confirmed
    await supabase
      .from("orders")
      .update({ status: "confirmed" })
      .eq("id", order_id);

    // Audit log
    await supabase.from("audit_logs").insert({
      actor_id: "system",
      action: "submit_payment",
      target_type: "payment",
      target_id: payment.id,
      meta: { order_id, method, amount },
    });

    return new Response(
      JSON.stringify(payment),
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
    const channels = url.searchParams.get("channels");
    const order_id = url.searchParams.get("order_id");

    const supabase = getClient(context);

    // Return payment channels
    if (channels === "true") {
      const { data: channelData, error } = await supabase
        .from("payment_channels")
        .select("*")
        .eq("active", true);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ channels: channelData || [] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get payment status by order_id
    if (order_id) {
      const { data: payment, error } = await supabase
        .from("payments")
        .select("*")
        .eq("order_id", order_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error || !payment) {
        return new Response(
          JSON.stringify({ error: "Payment not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify(payment),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Missing query parameters" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
