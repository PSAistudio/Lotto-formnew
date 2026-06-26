"use client";

import type { OrderItem } from "@/lib/types";
import { calculateItem, calculateOrder, formatThaiBaht } from "@/lib/calculator";

interface CalculationSummaryProps {
  items: OrderItem[];
}

export default function CalculationSummary({ items }: CalculationSummaryProps) {
  if (items.length === 0) {
    return (
      <div className="card mt-6">
        <p className="text-gray-500 text-center">กรุณาเพิ่มรายการเลขเพื่อคำนวณ</p>
      </div>
    );
  }

  const orderTotals = calculateOrder(items);

  return (
    <div className="card mt-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        สรุปยอดคำนวณ (Calculation Summary)
      </h2>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                เลข
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                ประเภท
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                เรท
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                ราคา
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                ส่วนลด
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                ยอดสุทธิ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, idx) => {
              const calc = calculateItem({
                stake: item.stake,
                payout_rate: item.payout_rate,
                discount_rate: item.discount_rate,
              });
              return (
                <tr key={idx}>
                  <td className="px-3 py-2 text-sm font-medium text-gray-900">
                    {item.number}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600">
                    {item.bet_type}
                  </td>
                  <td className="px-3 py-2 text-sm text-right text-gray-600">
                    {item.payout_rate}x / {(item.discount_rate * 100).toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-sm text-right text-gray-900">
                    {formatThaiBaht(item.stake)}
                  </td>
                  <td className="px-3 py-2 text-sm text-right text-red-600">
                    -{formatThaiBaht(calc.discount_amount)}
                  </td>
                  <td className="px-3 py-2 text-sm text-right font-medium text-indigo-600">
                    {formatThaiBaht(calc.net)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 border-t pt-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>ยอดรวม (Total)</span>
          <span>{formatThaiBaht(orderTotals.total)}</span>
        </div>
        <div className="flex justify-between text-sm text-red-600 mb-1">
          <span>ส่วนลดรวม (Total Discount)</span>
          <span>-{formatThaiBaht(orderTotals.total_discount)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold text-gray-900">
          <span>ยอดสุทธิ (Net Amount)</span>
          <span>{formatThaiBaht(orderTotals.net_amount)}</span>
        </div>
      </div>
    </div>
  );
}
