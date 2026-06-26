"use client";

import { useState, useRef } from "react";
import type { PaymentChannel } from "@/lib/types";
import { formatThaiBaht } from "@/lib/calculator";

interface PaymentStepProps {
  orderId: string;
  amount: number;
  channels: PaymentChannel[];
  onPaymentComplete: () => void;
}

export default function PaymentStep({
  orderId,
  amount,
  channels,
  onPaymentComplete,
}: PaymentStepProps) {
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlipFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setSlipPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!selectedChannel) {
      setError("กรุณาเลือกวิธีชำระเงิน");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      let slipUrl = "";

      // Upload slip to Supabase Storage if file selected
      if (slipFile) {
        const formData = new FormData();
        formData.append("file", slipFile);
        formData.append("orderId", orderId);

        const uploadRes = await fetch("/api/payments", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || "Upload failed");
        }

        const uploadData = await uploadRes.json();
        slipUrl = uploadData.slip_url || "";
      }

      // Create payment record
      const paymentRes = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          method: selectedChannel,
          amount,
          slip_url: slipUrl,
        }),
      });

      if (!paymentRes.ok) {
        const errData = await paymentRes.json();
        throw new Error(errData.error || "Payment creation failed");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="card text-center">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          ส่งสลิปเรียบร้อย
        </h2>
        <p className="text-gray-600 mb-4">
          รอแอดมินยืนยันการชำระเงิน
        </p>
        <button onClick={onPaymentComplete} className="btn-primary">
          กลับหน้าหลัก
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment channels */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          เลือกวิธีชำระเงิน
        </h2>

        {channels.length === 0 ? (
          <p className="text-gray-500">ไม่มีช่องทางชำระเงินในขณะนี้</p>
        ) : (
          <div className="space-y-3">
            {channels.map((channel) => (
              <label
                key={channel.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedChannel === channel.method
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value={channel.method}
                  checked={selectedChannel === channel.method}
                  onChange={() => setSelectedChannel(channel.method)}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {channel.method === "bank_transfer"
                      ? "🏦 โอนผ่านธนาคาร (Bank Transfer)"
                      : channel.method === "promptpay"
                      ? "📱 พร้อมเพย์ (PromptPay)"
                      : "💳 Payment Gateway"}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {channel.account_info}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
          ยอดชำระ: <strong>{formatThaiBaht(amount)}</strong>
        </div>
      </div>

      {/* Slip upload */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          อัปโหลดสลิป (Payment Slip)
        </h2>

        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-400 transition-colors"
        >
          {slipPreview ? (
            <div>
              <img
                src={slipPreview}
                alt="Slip preview"
                className="max-h-48 mx-auto rounded"
              />
              <p className="mt-2 text-sm text-gray-600">
                {slipFile?.name} — คลิกเพื่อเปลี่ยนไฟล์
              </p>
            </div>
          ) : (
            <div>
              <div className="text-3xl mb-2">📎</div>
              <p className="text-gray-500">
                คลิกเพื่ออัปโหลดสลิปการโอนเงิน
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PNG, JPG ขนาดไม่เกิน 5MB
              </p>
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={submitting || !selectedChannel}
          className="btn-primary"
        >
          {submitting ? "กำลังส่ง..." : "ยืนยันชำระเงิน"}
        </button>
      </div>
    </div>
  );
}
