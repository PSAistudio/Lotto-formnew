export interface User {
  id: string;
  name: string;
  phone: string;
  role: "user" | "admin";
  status: "active" | "suspended";
  created_at: string;
}

export interface LotteryType {
  id: string;
  name: string;
  slug: "thai" | "hanoi" | "nikkei";
  description: string;
}

export interface FormSchema {
  id: string;
  lottery_type: string;
  schema_json: FormField[];
  pricing_rules: PricingRule[];
  created_at: string;
  updated_at: string;
}

export interface FormField {
  name: string;
  type: "string" | "number" | "date" | "enum" | "array";
  required?: boolean;
  pattern?: string;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
  items?: FormField[];
  visibility_condition?: {
    field: string;
    operator: "eq" | "neq" | "in";
    value: string | string[];
  };
}

export interface PricingRule {
  when: {
    lottery_type: string;
    bet_type?: string;
  };
  payout: number;
  discount?: number;
  fee?: number;
}

export interface Order {
  id: string;
  user_id: string;
  lottery_type: string;
  draw_date: string;
  total_amount: number;
  discount: number;
  net_amount: number;
  status: "pending" | "confirmed" | "paid" | "cancelled";
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  number: string;
  bet_type: string;
  stake: number;
  payout_rate: number;
  discount_rate: number;
  net_amount: number;
}

export interface Payment {
  id: string;
  order_id: string;
  method: string;
  amount: number;
  slip_url?: string;
  txn_ref?: string;
  status: "pending" | "confirmed" | "failed";
  created_at: string;
}

export interface PaymentChannel {
  id: string;
  method: "bank_transfer" | "promptpay" | "gateway";
  account_info: string;
  active: boolean;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface CalculateItemInput {
  stake: number;
  payout_rate: number;
  discount_rate: number;
}

export interface CalculateItemResult {
  gross: number;
  discount_amount: number;
  net: number;
}

export interface CalculateOrderResult {
  total: number;
  total_discount: number;
  net_amount: number;
}

export interface BetRow {
  number: string;
  bet_type: string;
  stake: number;
}

export interface CreateOrderInput {
  user_id: string;
  lottery_type: string;
  draw_date: string;
  items: BetRow[];
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface SchemaResponse {
  schema: FormSchema;
  pricing_rules: PricingRule[];
}
