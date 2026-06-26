"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LotteryType } from "@/lib/types";

const LOTTERY_TYPES: LotteryType[] = [
  {
    id: "1",
    name: "สลากกินแบ่งรัฐบาลไทย",
    slug: "thai",
    description: "Thai Government Lottery — bet types: บน, ล่าง, โต๊ด",
  },
  {
    id: "2",
    name: "หวยฮานอย",
    slug: "hanoi",
    description: "Hanoi Lottery — bet types: บน, ล่าง",
  },
  {
    id: "3",
    name: "หวยนิเคอิ",
    slug: "nikkei",
    description: "Nikkei Lottery — bet types: straight, box",
  },
];

const LOTTERY_ICONS: Record<string, string> = {
  thai: "🇹🇭",
  hanoi: "🇻🇳",
  nikkei: "🇯🇵",
};

export default function HomePage() {
  const router = useRouter();
  const [drawDate, setDrawDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  const handleSelect = (slug: string) => {
    router.push(`/form/${slug}?draw_date=${drawDate}`);
  };

  return (
    <main className="py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          ระบบสั่งซื้อหวยออนไลน์
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Lottery Dynamic Form System
        </p>
      </div>

      <div className="mb-8 flex justify-center">
        <div className="w-full max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            งวดวันที่ (Draw Date)
          </label>
          <input
            type="date"
            value={drawDate}
            onChange={(e) => setDrawDate(e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {LOTTERY_TYPES.map((lottery) => (
          <button
            key={lottery.id}
            onClick={() => handleSelect(lottery.slug)}
            className="card text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <div className="text-4xl mb-3">{LOTTERY_ICONS[lottery.slug]}</div>
            <h2 className="text-xl font-semibold text-gray-900">
              {lottery.name}
            </h2>
            <p className="mt-2 text-sm text-gray-600">{lottery.description}</p>
            <div className="mt-4 text-indigo-600 font-medium text-sm">
              เลือก →
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}
