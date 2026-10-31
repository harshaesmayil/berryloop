import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../api.js";
import { useAuth } from "../auth.jsx";
import { INTERVAL_LABELS, StatusBadge, fetchAll, formatDate, formatMoney } from "../billing.js";
import "../customers.css";

export default function SubscriptionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const canManage = user.role === "admin" || user.role === "staff";

  const [sub, setSub] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function loadInvoices() {
    return fetchAll(`/invoices/?subscription=${id}`).then(setInvoices);
  }

  useEffect(() => {
    let active = true;
    Promise.all([apiRequest(`/subscriptions/${id}/`), fetchAll(`/invoices/?subscription=${id}`)])
      .then(([subscription, invoiceList]) => {
        if (!active) return;
        setSub(subscription);
        setInvoices(invoiceList);
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  async function run(action) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const changeStatus = (status) =>
    run(async () => {
      setSub(await apiRequest(`/subscriptions/${id}/`, { method: "PATCH", body: { status } }));
    });

  const generateInvoice = () =>
    run(async () => {
      await apiRequest("/invoices/", { method: "POST", body: { subscription: Number(id) } });
      await loadInvoices();
    });

  const markPaid = (invoiceId) =>
    run(async () => {
      await apiRequest(`/invoices/${invoiceId}/mark-paid/`, { method: "POST" });
      await loadInvoices();
    });

  if (loading) return <p className="page-status">Loading subscription…</p>;
  if (!sub) {
    return (
      <section>
        <p className="notice notice-error" role="alert">{error || "Subscription not found."}</p>
        <Link to="/subscriptions">Back to subscriptions</Link>
      </section>
    );
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>{sub.customer_name} – {sub.plan_name}</h1>
          <p className="muted"><Link to="/subscriptions">Back to subscriptions</Link></p>
        </div>
      </div>

      {error && <p className="notice notice-error" role="alert">{error}</p>}

      <dl className="detail-grid">
        <div className="detail-item"><dt>Customer</dt><dd><Link to={`/customers/${sub.customer}`}>{sub.customer_name}</Link></dd></div>
        <div className="detail-item"><dt>Product</dt><dd>{sub.product_name}</dd></div>
        <div className="detail-item"><dt>Plan</dt><dd>{sub.plan_name}</dd></div>
        <div className="detail-item"><dt>Price</dt><dd>{formatMoney(sub.price, sub.currency)} ({INTERVAL_LABELS[sub.billing_interval]})</dd></div>
        <div className="detail-item"><dt>Status</dt><dd><StatusBadge value={sub.status} /></dd></div>
        <div className="detail-item"><dt>Start date</dt><dd>{formatDate(sub.start_date)}</dd></div>
        <div className="detail-item"><dt>Next billing date</dt><dd>{formatDate(sub.next_billing_date)}</dd></div>
      </dl>

      {canManage && (
        <div className="actions">
          {sub.status === "active" ? (
            <>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={generateInvoice}>
                Generate invoice
              </button>
              <button type="button" className="btn btn-danger" disabled={busy} onClick={() => changeStatus("cancelled")}>
                Cancel subscription
              </button>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => changeStatus("expired")}>
                Mark expired
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => changeStatus("active")}>
              Reactivate
            </button>
          )}
        </div>
      )}

      <h2>Invoices</h2>
      {invoices.length === 0 ? (
        <div className="table-wrap">
          <div className="empty-state">No invoices yet for this subscription.</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="customers">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Amount</th>
                <th>Due</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td><Link to={`/invoices/${inv.id}`}>{inv.invoice_number}</Link></td>
                  <td>{formatMoney(inv.amount, inv.currency)}</td>
                  <td>{formatDate(inv.due_date)}</td>
                  <td><StatusBadge value={inv.effective_status} /></td>
                  <td>
                    {canManage && inv.status === "pending" && (
                      <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => markPaid(inv.id)}>
                        Mark paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
