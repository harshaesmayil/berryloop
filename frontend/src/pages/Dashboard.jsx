import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { apiRequest } from "../api.js";
import { StatusBadge, formatMoney } from "../billing.js";
import "../customers.css";

function moneyLines(byCurrency) {
  const entries = Object.entries(byCurrency || {});
  if (entries.length === 0) return "—";
  return entries.map(([code, amount]) => formatMoney(amount, code)).join(" · ");
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user.role === "customer") return undefined;
    let active = true;
    apiRequest("/dashboard/summary/")
      .then((result) => active && setSummary(result))
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [user.role]);

  if (user.role === "customer") return <Navigate to="/portal" replace />;
  if (error) return <p className="notice notice-error" role="alert">{error}</p>;
  if (!summary) return <p className="page-status">Loading dashboard…</p>;

  const cards = [
    ["Total customers", summary.total_customers, "/customers"],
    ["Active subscriptions", summary.active_subscriptions, "/subscriptions"],
    ["Monthly recurring revenue", moneyLines(summary.mrr_by_currency), "/subscriptions"],
    ["Pending invoices", `${summary.pending_invoices} · ${moneyLines(summary.pending_amount_by_currency)}`, "/invoices"],
    ["Overdue invoices", summary.overdue_invoices, "/invoices?status=overdue"],
    ["Paid invoices", summary.paid_invoices, "/invoices"],
  ];

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Live figures from the database.</p>
        </div>
      </div>

      <div className="card-grid">
        {cards.map(([label, value, link]) => (
          <Link key={label} to={link} className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <h2 style={{ fontSize: "0.95rem" }}>{label}</h2>
            <p style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>{value}</p>
          </Link>
        ))}
      </div>

      <div className="card-grid">
        <div className="card">
          <h2>Recent subscriptions</h2>
          {summary.recent_subscriptions.length === 0 ? (
            <p className="muted">No subscriptions yet.</p>
          ) : (
            <ul>
              {summary.recent_subscriptions.map((s) => (
                <li key={s.id}>
                  <Link to={`/subscriptions/${s.id}`}>{s.customer_name}</Link> – {s.plan_name}{" "}
                  <StatusBadge value={s.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h2>Recent invoices</h2>
          {summary.recent_invoices.length === 0 ? (
            <p className="muted">No invoices yet.</p>
          ) : (
            <ul>
              {summary.recent_invoices.map((i) => (
                <li key={i.id}>
                  <Link to={`/invoices/${i.id}`}>{i.invoice_number}</Link> – {i.customer_name}{" "}
                  {formatMoney(i.amount, i.currency)} <StatusBadge value={i.effective_status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
