import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api.js";
import { INTERVAL_LABELS, StatusBadge, fetchAll, formatDate, formatMoney } from "../billing.js";
import "../customers.css";

// Customer view: read-only list of their own subscriptions and invoices.
export default function Portal() {
  const [subs, setSubs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([fetchAll("/subscriptions/"), fetchAll("/invoices/")])
      .then(([s, i]) => {
        if (!active) return;
        setSubs(s);
        setInvoices(i);
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p className="page-status">Loading your account…</p>;

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>My subscriptions</h1>
          <p className="muted">Only your own subscriptions and invoices are shown here.</p>
        </div>
      </div>
      {error && <p className="notice notice-error" role="alert">{error}</p>}

      <h2>Subscriptions</h2>
      {subs.length === 0 ? (
        <div className="table-wrap"><div className="empty-state">You have no subscriptions yet.</div></div>
      ) : (
        <div className="table-wrap">
          <table className="customers">
            <thead><tr><th>Plan</th><th>Price</th><th>Next billing</th><th>Status</th></tr></thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id}>
                  <td>{s.product_name} – {s.plan_name}</td>
                  <td>{formatMoney(s.price, s.currency)} ({INTERVAL_LABELS[s.billing_interval]})</td>
                  <td>{formatDate(s.next_billing_date)}</td>
                  <td><StatusBadge value={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Invoices</h2>
      {invoices.length === 0 ? (
        <div className="table-wrap"><div className="empty-state">No invoices yet.</div></div>
      ) : (
        <div className="table-wrap">
          <table className="customers">
            <thead><tr><th>Invoice</th><th>Amount</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td><Link to={`/invoices/${i.id}`}>{i.invoice_number}</Link></td>
                  <td>{formatMoney(i.amount, i.currency)}</td>
                  <td>{formatDate(i.due_date)}</td>
                  <td><StatusBadge value={i.effective_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
