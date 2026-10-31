// Shared helpers for the products, plans, subscriptions and invoices pages.
import { createElement } from "react";
import { apiRequest } from "./api.js";

// Loads every page of a paginated list endpoint. The path may include filters, e.g. "/plans/?status=active".
export async function fetchAll(path) {
  const results = [];
  let page = 1;
  for (;;) {
    const separator = path.includes("?") ? "&" : "?";
    const data = await apiRequest(`${path}${separator}page=${page}`);
    results.push(...data.results);
    if (!data.next) break;
    page += 1;
  }
  return results;
}

export function formatMoney(amount, currency) {
  const value = Number(amount);
  if (Number.isNaN(value)) return `${amount} ${currency || ""}`.trim();
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(value);
  } catch {
    return `${currency || ""} ${value.toFixed(2)}`.trim();
  }
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return date.toLocaleDateString();
}

export const STATUS_LABELS = {
  active: "Active",
  inactive: "Inactive",
  cancelled: "Cancelled",
  expired: "Expired",
  pending: "Pending",
  paid: "Paid",
  overdue: "Overdue",
};

export const INTERVAL_LABELS = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export function fieldErrorsFrom(err) {
  const errors = {};
  if (err.data && typeof err.data === "object") {
    for (const [field, messages] of Object.entries(err.data)) {
      if (field === "detail") continue;
      errors[field] = Array.isArray(messages) ? messages[0] : String(messages);
    }
  }
  return errors;
}

// Plain React call instead of JSX, because this file is .js and Vite cannot parse JSX in .js files.
export function StatusBadge({ value }) {
  return createElement("span", { className: `badge badge-${value}` }, STATUS_LABELS[value] || value);
}
