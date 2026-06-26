"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Order } from "@/lib/types";
import { formatThaiBaht } from "@/lib/calculator";

type StatusFilter = "all" | "pending" | "confirmed" | "paid" | "cancelled";

export default function DashboardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0 });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch(`/api/admin?status=${filter}`);
        if (!res.ok) throw new Error("Failed to fetch orders");
        const data = await res.json();
        setOrders(data.orders || []);
        setStats({
          totalOrders: data.total_count || 0,
          totalRevenue: data.total_revenue || 0,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [filter]);

  const exportCSV = () => {
    const headers = ["ID", "User", "Lottery", "Draw Date", "Total", "Discount", "Net", "Status", "Created"];
    const rows = orders.map((o) =>
      [o.id, o.user_id, o.lottery_type, o.draw_date, o.total_amount, o.discount, o.net_amount, o.status, o.created_at].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_${filter}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
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
          แดชบอร์ดแอดมิน (Admin Dashboard)
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/dashboard/config")}
            className="btn-secondary"
          >
            ⚙ ตั้งค่า
          </button>
          <button onClick={() => router.push("/")} className="btn-secondary">
            กลับหน้าหลัก
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card text-center">
          <p className="text-sm text-gray-600">จำนวนคำสั่งซื้อ</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-600">ยอดรายได้รวม</p>
          <p className="text-2xl font-bold text-indigo-600">
            {formatThaiBaht(stats.totalRevenue)}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium text-gray-700">สถานะ:</span>
        {(["all", "pending", "confirmed", "paid", "cancelled"] as StatusFilter[]).map(
          (s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                filter === s
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {s === "all" ? "ทั้งหมด" : s}
            </button>
          )
        )}
        <button onClick={exportCSV} className="btn-secondary ml-auto">
          📥 Export CSV
        </button>
      </div>

      {/* Orders table */}
      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ผู้ใช้</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">หวย</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">งวด</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ยอดสุทธิ</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">สถานะ</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">ดู</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{order.id}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{order.user_id}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{order.lottery_type}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{order.draw_date}</td>
                <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                  {formatThaiBaht(order.net_amount)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || "bg-gray-100 text-gray-600"}`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="text-indigo-600 hover:text-indigo-800 text-sm"
                  >
                    ดูรายละเอียด
                  </button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  ไม่มีคำสั่งซื้อ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Order detail modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              รายละเอียดคำสั่งซื้อ
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">ID:</span>
                <span className="text-gray-900">{selectedOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ผู้ใช้:</span>
                <span className="text-gray-900">{selectedOrder.user_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">หวย:</span>
                <span className="text-gray-900">{selectedOrder.lottery_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">งวด:</span>
                <span className="text-gray-900">{selectedOrder.draw_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ยอดรวม:</span>
                <span className="text-gray-900">{formatThaiBaht(selectedOrder.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ส่วนลด:</span>
                <span className="text-red-600">-{formatThaiBaht(selectedOrder.discount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ยอดสุทธิ:</span>
                <span className="text-indigo-600 font-bold">{formatThaiBaht(selectedOrder.net_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">สถานะ:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[selectedOrder.status]}`}>
                  {selectedOrder.status}
                </span>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="btn-secondary"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
