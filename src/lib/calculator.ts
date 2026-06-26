import type {
  PricingRule,
  CalculateItemInput,
  CalculateItemResult,
  CalculateOrderResult,
  OrderItem,
} from "./types";

export function calculateItem(input: CalculateItemInput): CalculateItemResult {
  const gross = input.stake * input.payout_rate;
  const discount_amount = input.stake * input.discount_rate;
  const net = input.stake - discount_amount;
  return { gross, discount_amount, net };
}

export function calculateOrder(items: OrderItem[]): CalculateOrderResult {
  const total = items.reduce((sum, item) => sum + item.stake, 0);
  const total_discount = items.reduce(
    (sum, item) => sum + item.stake * item.discount_rate,
    0
  );
  const net_amount = total - total_discount;
  return { total, total_discount, net_amount };
}

export function matchPricingRule(
  lottery_type: string,
  bet_type: string,
  rules: PricingRule[]
): PricingRule | null {
  const exact = rules.find(
    (r) =>
      r.when.lottery_type === lottery_type && r.when.bet_type === bet_type
  );
  if (exact) return exact;

  const fallback = rules.find(
    (r) => r.when.lottery_type === lottery_type && !r.when.bet_type
  );
  return fallback || null;
}

export function formatThaiBaht(amount: number): string {
  return `฿${amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
