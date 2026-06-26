"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import type { FormSchema, PricingRule, BetRow, OrderItem } from "@/lib/types";
import { matchPricingRule, calculateItem } from "@/lib/calculator";
import DynamicForm from "@/components/DynamicForm";
import CalculationSummary from "@/components/CalculationSummary";

export default function FormPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = params.type as string;
  const drawDate = searchParams.get("draw_date") || new Date().toISOString().split("T")[0];

  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [betRows, setBetRows] = useState<BetRow[]>([
    { number: "", bet_type: "", stake: 0 },
  ]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSchema() {
      try {
        const res = await fetch(`/api/config/schemas?lottery_type=${type}`);
        if (!res.ok) throw new Error("Failed to fetch schema");
        const data = await res.json();
        setSchema(data.schema);
        setPricingRules(data.pricing_rules);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchSchema();
  }, [type]);

  const handleBetRowsChange = useCallback((rows: BetRow[]) => {
    setBetRows(rows);
  }, []);

  const computedItems: OrderItem[] = betRows
    .filter((r) => r.number && r.bet_type && r.stake > 0)
    .map((row, idx) => {
      const rule = matchPricingRule(type, row.bet_type, pricingRules);
      const payout_rate = rule?.payout ?? 0;
      const discount_rate = rule?.discount ?? 0;
      const calc = calculateItem({
        stake: row.stake,
        payout_rate,
        discount_rate,
      });
      return {
        id: `temp-${idx}`,
        order_id: "",
        number: row.number,
        bet_type: row.bet_type,
        stake: row.stake,
        payout_rate,
        discount_rate,
        net_amount: calc.net,
      };
    });

  const handleSubmit = async () => {
    if (computedItems.length === 0) {
      setError("กรุณาเพิ่มรายการเลขอย่างน้อย 1 รายการ");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const stored = localStorage.getItem("lottery_user");
      if (!stored) {
        router.push("/login");
        return;
      }
      const { id: userId } = JSON.parse(stored);

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          lottery_type: type,
          draw_date: drawDate,
          items: betRows.filter((r) => r.number && r.bet_type && r.stake > 0),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create order");
      }

      const order = await res.json();
      router.push(`/payment/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="py-10 text-center">
        <p className="text-gray-500">กำลังโหลดแบบฟอร์ม...</p>
      </main>
    );
  }

  if (error && !schema) {
    return (
      <main className="py-10 text-center">
        <p className="text-red-600">{error}</p>
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
          แบบฟอร์มสั่งซื้อ — {schema?.lottery_type === "thai" ? "สลากกินแบ่งรัฐบาล" : schema?.lottery_type === "hanoi" ? "หวยฮานอย" : "หวยนิเคอิ"}
        </h1>
        <button onClick={() => router.push("/")} className="btn-secondary">
          กลับ
        </button>
      </div>

      <div className="text-sm text-gray-600 mb-4">
        งวดวันที่: <strong>{drawDate}</strong>
      </div>

      {schema && (
        <DynamicForm
          schema={schema}
          pricingRules={pricingRules}
          betRows={betRows}
          onChange={handleBetRowsChange}
        />
      )}

      <CalculationSummary items={computedItems} />

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button onClick={() => router.push("/")} className="btn-secondary">
          ยกเลิก
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || computedItems.length === 0}
          className="btn-primary"
        >
          {submitting ? "กำลังส่ง..." : "ส่งคำสั่งซื้อ"}
        </button>
      </div>
    </main>
  );
}
