"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Order, PaymentChannel } from "@/lib/types";
import { formatThaiBaht } from "@/lib/calculator";
import PaymentStep from "@/components/PaymentStep";

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [channels, setChannels] = useState<PaymentChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const orderRes = await fetch(`/api/orders?order_id=${orderId}`);
        if (!orderRes.ok) throw new Error("Failed to fetch order");
        const orderData = await orderRes.json();
        setOrder(orderData);

        const channelsRes = await fetch(`/api/payments?channels=true`);
        if (!channelsRes.ok) throw new Error("Failed to fetch payment channels");
        const channelsData = await channelsRes.json();
        setChannels(channelsData.channels || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [orderId]);

  if (loading) {
    return (
      <main className="py-10 text-center">
        <p className="text-gray-500">กำลังโหลดข้อมูลคำสั่งซื้อ...</p>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="py-10 text-center">
        <p className="text-red-600">{error || "ไม่พบคำสั่งซื้อ"}</p>
        <button onClick={() => router.push("/")} className="btn-secondary mt-4">
          กลับหน้าหลัก
        </button>
      </main>
    );
  }

  return (
    <main className="py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          ชำระเงิน (Payment)
        </h1>
        <button onClick={() => router.push("/")} className="btn-secondary">
          กลับหน้าหลัก
        </button>
      </div>

      {/* Order summary */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          สรุปคำสั่งซื้อ
        </h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-gray-600">หวย:</div>
          <div className="text-gray-900 font-medium">
            {order.lottery_type === "thai"
              ? "สลากกินแบ่งรัฐบาล"
              : order.lottery_type === "hanoi"
              ? "หวยฮานอย"
              : "หวยนิเคอิ"}
          </div>
          <div className="text-gray-600">งวดวันที่:</div>
          <div className="text-gray-900 font-medium">{order.draw_date}</div>
          <div className="text-gray-600">สถานะ:</div>
          <div className="text-gray-900 font-medium">{order.status}</div>
          <div className="text-gray-600">ยอดรวม:</div>
          <div className="text-gray-900 font-medium">{formatThaiBaht(order.total_amount)}</div>
          <div className="text-gray-600">ส่วนลด:</div>
          <div className="text-red-600 font-medium">-{formatThaiBaht(order.discount)}</div>
          <div className="text-gray-600">ยอดสุทธิ:</div>
          <div className="text-indigo-600 font-bold text-lg">{formatThaiBaht(order.net_amount)}</div>
        </div>
      </div>

      <PaymentStep
        orderId={order.id}
        amount={order.net_amount}
        channels={channels}
        onPaymentComplete={() => router.push("/")}
      />
    </main>
  );
}
