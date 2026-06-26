"use client";

import { useState } from "react";
import type { FormSchema, FormField, PricingRule, BetRow } from "@/lib/types";

interface DynamicFormProps {
  schema: FormSchema;
  pricingRules: PricingRule[];
  betRows: BetRow[];
  onChange: (rows: BetRow[]) => void;
}

function shouldShowField(
  field: FormField,
  formData: Record<string, string>
): boolean {
  if (!field.visibility_condition) return true;
  const cond = field.visibility_condition;
  const val = formData[cond.field];
  if (cond.operator === "eq") return val === cond.value;
  if (cond.operator === "neq") return val !== cond.value;
  if (cond.operator === "in" && Array.isArray(cond.value))
    return cond.value.includes(val);
  return true;
}

function renderStaticField(
  field: FormField,
  value: string,
  onChange: (val: string) => void
) {
  if (field.type === "date") {
    return (
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field"
      />
    );
  }

  if (field.type === "enum" && field.options) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field"
      >
        <option value="">— เลือก —</option>
        {field.options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }

  if (field.type === "number") {
    return (
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={field.min}
        max={field.max}
        className="input-field"
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      pattern={field.pattern}
      className="input-field"
      placeholder={field.required ? "จำเป็น" : ""}
    />
  );
}

export default function DynamicForm({
  schema,
  pricingRules,
  betRows,
  onChange,
}: DynamicFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});

  const staticFields = schema.schema_json.filter(
    (f) => f.type !== "array" && f.name !== "number" && f.name !== "bet_type" && f.name !== "stake"
  );

  const arrayField = schema.schema_json.find((f) => f.type === "array");

  const betTypeOptions = arrayField?.items?.find((f) => f.name === "bet_type")?.options || [];

  const updateFormData = (name: string, val: string) => {
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  const addRow = () => {
    onChange([...betRows, { number: "", bet_type: "", stake: 0 }]);
  };

  const removeRow = (idx: number) => {
    if (betRows.length <= 1) return;
    const updated = betRows.filter((_, i) => i !== idx);
    onChange(updated);
  };

  const updateRow = (idx: number, field: keyof BetRow, value: string | number) => {
    const updated = [...betRows];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      {/* Static fields from schema */}
      {staticFields.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            ข้อมูลทั่วไป
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {staticFields.map((field) =>
              shouldShowField(field, formData) ? (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.name}
                    {field.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  {renderStaticField(field, formData[field.name] || "", (val) =>
                    updateFormData(field.name, val)
                  )}
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Dynamic bet rows */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          รายการเลข (Bet Rows)
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
                  เลข (Number)
                </th>
                <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
                  ประเภท (Bet Type)
                </th>
                <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
                  เรท (Stake ฿)
                </th>
                <th className="px-3 py-2 text-right text-sm font-medium text-gray-700">
                  ลบ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {betRows.map((row, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={row.number}
                      onChange={(e) => updateRow(idx, "number", e.target.value)}
                      placeholder="เลข 2-3 ตัว"
                      maxLength={3}
                      className="input-field w-24"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row.bet_type}
                      onChange={(e) => updateRow(idx, "bet_type", e.target.value)}
                      className="input-field w-32"
                    >
                      <option value="">— เลือก —</option>
                      {betTypeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={row.stake || ""}
                      onChange={(e) =>
                        updateRow(idx, "stake", parseFloat(e.target.value) || 0)
                      }
                      min={1}
                      className="input-field w-24"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => removeRow(idx)}
                      disabled={betRows.length <= 1}
                      className="text-red-500 hover:text-red-700 disabled:text-gray-300 text-sm"
                    >
                      ✕ ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <button onClick={addRow} className="btn-secondary">
            + เพิ่มรายการ
          </button>
        </div>
      </div>
    </div>
  );
}
