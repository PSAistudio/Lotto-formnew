"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { FormSchema, PricingRule, PaymentChannel } from "@/lib/types";

export default function ConfigPage() {
  const router = useRouter();
  const [schemas, setSchemas] = useState<FormSchema[]>([]);
  const [channels, setChannels] = useState<PaymentChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSchema, setEditingSchema] = useState<FormSchema | null>(null);
  const [schemaJsonText, setSchemaJsonText] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const schemasRes = await fetch("/api/config/schemas");
        if (!schemasRes.ok) throw new Error("Failed to fetch schemas");
        const schemasData = await schemasRes.json();
        setSchemas(schemasData.schemas || []);

        const channelsRes = await fetch("/api/admin?resource=payment_channels");
        if (!channelsRes.ok) throw new Error("Failed to fetch channels");
        const channelsData = await channelsRes.json();
        setChannels(channelsData.channels || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleEditSchema = (schema: FormSchema) => {
    setEditingSchema(schema);
    setSchemaJsonText(JSON.stringify(schema.schema_json, null, 2));
  };

  const handleSaveSchema = async () => {
    if (!editingSchema) return;
    try {
      const parsed = JSON.parse(schemaJsonText);
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_schema",
          schema_id: editingSchema.id,
          schema_json: parsed,
        }),
      });
      if (!res.ok) throw new Error("Failed to save schema");
      const updated = await res.json();
      setSchemas((prev) =>
        prev.map((s) => s.id === editingSchema.id ? { ...s, schema_json: parsed, updated_at: updated.updated_at } : s)
      );
      setEditingSchema(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  if (loading) {
    return (
      <main className="py-10 text-center">
        <p className="text-gray-500">กำลังโหลด...</p>
      </main>
    );
  }

  return (
    <main className="py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          ตั้งค่าระบบ (System Config)
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="btn-secondary"
          >
            ← แดชบอร์ด
          </button>
          <button onClick={() => router.push("/")} className="btn-secondary">
            กลับหน้าหลัก
          </button>
        </div>
      </div>

      {/* Form schemas */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          แบบฟอร์ม Schema
        </h2>
        <div className="space-y-3">
          {schemas.map((schema) => (
            <div
              key={schema.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <span className="font-medium text-gray-900">
                  {schema.lottery_type}
                </span>
                <span className="text-sm text-gray-500 ml-2">
                  {schema.pricing_rules.length} pricing rules
                </span>
              </div>
              <button
                onClick={() => handleEditSchema(schema)}
                className="btn-secondary text-xs"
              >
                ✏ แก้ไข
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Schema JSON editor modal */}
      {editingSchema && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              แก้ไข Schema — {editingSchema.lottery_type}
            </h2>
            <textarea
              value={schemaJsonText}
              onChange={(e) => setSchemaJsonText(e.target.value)}
              rows={16}
              className="input-field font-mono text-xs w-full"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setEditingSchema(null)}
                className="btn-secondary"
              >
                ยกเลิก
              </button>
              <button onClick={handleSaveSchema} className="btn-primary">
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment channels */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          ช่องทางชำระเงิน (Payment Channels)
        </h2>
        <div className="space-y-3">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <span className="font-medium text-gray-900">
                  {channel.method === "bank_transfer"
                    ? "🏦 โอนผ่านธนาคาร"
                    : channel.method === "promptpay"
                    ? "📱 พร้อมเพย์"
                    : "💳 Gateway"}
                </span>
                <span className="text-sm text-gray-600 ml-2">
                  {channel.account_info}
                </span>
              </div>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  channel.active
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {channel.active ? "เปิด" : "ปิด"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing rules summary */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Pricing Rules
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">หวย</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bet Type</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Payout</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Discount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {schemas.flatMap((s) =>
                s.pricing_rules.map((rule, idx) => (
                  <tr key={`${s.id}-${idx}`}>
                    <td className="px-3 py-2 text-sm text-gray-900">{rule.when.lottery_type}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">{rule.when.bet_type || "default"}</td>
                    <td className="px-3 py-2 text-sm text-right text-gray-900">{rule.payout}x</td>
                    <td className="px-3 py-2 text-sm text-right text-red-600">
                      {rule.discount ? `${(rule.discount * 100).toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
