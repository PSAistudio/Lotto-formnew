-- Thai Lottery Dynamic Form System - Database Schema
-- Supabase PostgreSQL Migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- USERS
-- ===========================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================
-- LOTTERY TYPES
-- ===========================================
CREATE TABLE lottery_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE CHECK (slug IN ('thai', 'hanoi', 'nikkei')),
  description TEXT NOT NULL
);

-- ===========================================
-- FORM SCHEMAS
-- ===========================================
CREATE TABLE form_schemas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lottery_type TEXT NOT NULL REFERENCES lottery_types(slug),
  schema_json JSONB NOT NULL,
  pricing_rules JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================
-- ORDERS
-- ===========================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  lottery_type TEXT NOT NULL,
  draw_date DATE NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================
-- ORDER ITEMS
-- ===========================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  bet_type TEXT NOT NULL,
  stake NUMERIC(12,2) NOT NULL,
  payout_rate NUMERIC(6,2) NOT NULL DEFAULT 0,
  discount_rate NUMERIC(6,4) NOT NULL DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- ===========================================
-- PAYMENTS
-- ===========================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id),
  method TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  slip_url TEXT,
  txn_ref TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================
-- PAYMENT CHANNELS
-- ===========================================
CREATE TABLE payment_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  method TEXT NOT NULL CHECK (method IN ('bank_transfer', 'promptpay', 'gateway')),
  account_info TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true
);

-- ===========================================
-- AUDIT LOGS
-- ===========================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================
-- INDEXES
-- ===========================================
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_lottery_type ON orders(lottery_type);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_types ENABLE ROW LEVEL SECURITY;

-- Users: can read own data
CREATE POLICY "users_read_own" ON users FOR SELECT USING (id = auth.uid());
-- Admins can read all users
CREATE POLICY "admins_read_all_users" ON users FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
-- Service role full access
CREATE POLICY "service_full_users" ON users FOR ALL USING (true);

-- Orders: users can CRUD own orders
CREATE POLICY "users_crud_own_orders" ON orders FOR ALL USING (user_id = auth.uid());
-- Admins can read all orders
CREATE POLICY "admins_read_all_orders" ON orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
-- Service role full access
CREATE POLICY "service_full_orders" ON orders FOR ALL USING (true);

-- Order items: follow order ownership
CREATE POLICY "service_full_order_items" ON order_items FOR ALL USING (true);

-- Payments: service role full access
CREATE POLICY "service_full_payments" ON payments FOR ALL USING (true);

-- Form schemas: read for all, write for admin/service
CREATE POLICY "public_read_schemas" ON form_schemas FOR SELECT USING (true);
CREATE POLICY "service_full_schemas" ON form_schemas FOR ALL USING (true);

-- Payment channels: read for all, write for admin/service
CREATE POLICY "public_read_channels" ON payment_channels FOR SELECT USING (active = true);
CREATE POLICY "service_full_channels" ON payment_channels FOR ALL USING (true);

-- Audit logs: service role full access
CREATE POLICY "service_full_audit" ON audit_logs FOR ALL USING (true);

-- Lottery types: read for all
CREATE POLICY "public_read_lottery_types" ON lottery_types FOR SELECT USING (true);
CREATE POLICY "service_full_lottery_types" ON lottery_types FOR ALL USING (true);

-- ===========================================
-- STORAGE BUCKET
-- ===========================================
-- Note: Create storage bucket "payment-slips" via Supabase dashboard
-- with public access for reading uploaded slips

-- ===========================================
-- SEED DATA
-- ===========================================

-- Lottery Types
INSERT INTO lottery_types (name, slug, description) VALUES
  ('สลากกินแบ่งรัฐบาลไทย', 'thai', 'Thai Government Lottery — bet types: บน, ล่าง, โต๊ด'),
  ('หวยฮานอย', 'hanoi', 'Hanoi Lottery — bet types: บน, ล่าง'),
  ('หวยนิเคอิ', 'nikkei', 'Nikkei Lottery — bet types: straight, box');

-- Form Schema: Thai
INSERT INTO form_schemas (lottery_type, schema_json, pricing_rules) VALUES
  ('thai',
   '[
     {"name": "draw_date", "type": "date", "required": true},
     {"name": "bet_rows", "type": "array", "required": true, "items": [
       {"name": "number", "type": "string", "required": true, "pattern": "^\\d{2,3}$", "min": 2, "max": 3},
       {"name": "bet_type", "type": "enum", "required": true, "options": [
         {"value": "บน", "label": "บน (Top)"},
         {"value": "ล่าง", "label": "ล่าง (Bottom)"},
         {"value": "โต๊ด", "label": "โต๊ด (Permutation)"}
       ]},
       {"name": "stake", "type": "number", "required": true, "min": 1}
     ]}
   ]'::jsonb,
   '[
     {"when": {"lottery_type": "thai", "bet_type": "บน"}, "payout": 90, "discount": 0.05},
     {"when": {"lottery_type": "thai", "bet_type": "ล่าง"}, "payout": 80, "discount": 0.05},
     {"when": {"lottery_type": "thai", "bet_type": "โต๊ด"}, "payout": 150, "discount": 0}
   ]'::jsonb
  );

-- Form Schema: Hanoi
INSERT INTO form_schemas (lottery_type, schema_json, pricing_rules) VALUES
  ('hanoi',
   '[
     {"name": "draw_date", "type": "date", "required": true},
     {"name": "bet_rows", "type": "array", "required": true, "items": [
       {"name": "number", "type": "string", "required": true, "pattern": "^\\d{2,3}$", "min": 2, "max": 3},
       {"name": "bet_type", "type": "enum", "required": true, "options": [
         {"value": "บน", "label": "บน (Top)"},
         {"value": "ล่าง", "label": "ล่าง (Bottom)"}
       ]},
       {"name": "stake", "type": "number", "required": true, "min": 1}
     ]}
   ]'::jsonb,
   '[
     {"when": {"lottery_type": "hanoi", "bet_type": "บน"}, "payout": 95, "discount": 0.03},
     {"when": {"lottery_type": "hanoi", "bet_type": "ล่าง"}, "payout": 95, "discount": 0.03}
   ]'::jsonb
  );

-- Form Schema: Nikkei
INSERT INTO form_schemas (lottery_type, schema_json, pricing_rules) VALUES
  ('nikkei',
   '[
     {"name": "draw_date", "type": "date", "required": true},
     {"name": "bet_rows", "type": "array", "required": true, "items": [
       {"name": "number", "type": "string", "required": true, "pattern": "^\\d{2,4}$", "min": 2, "max": 4},
       {"name": "bet_type", "type": "enum", "required": true, "options": [
         {"value": "straight", "label": "Straight"},
         {"value": "box", "label": "Box"}
       ]},
       {"name": "stake", "type": "number", "required": true, "min": 1}
     ]}
   ]'::jsonb,
   '[
     {"when": {"lottery_type": "nikkei", "bet_type": "straight"}, "payout": 110, "discount": 0},
     {"when": {"lottery_type": "nikkei", "bet_type": "box"}, "payout": 110, "discount": 0}
   ]'::jsonb
  );

-- Payment Channels
INSERT INTO payment_channels (method, account_info, active) VALUES
  ('bank_transfer', 'ธนาคารกสิกรไทย (KBANK) — เลขที่: 123-4-56789 — ชื่อ: สลากออนไลน์', true),
  ('promptpay', 'พร้อมเพย์ — เบอร์: 089-123-4567', true);

-- Admin user seed
INSERT INTO users (name, phone, role, status) VALUES
  ('Admin', '000-000-0000', 'admin', 'active');
