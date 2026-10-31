import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../api.js";
import { useAuth } from "../auth.jsx";
import { StatusBadge, fetchAll, fieldErrorsFrom, formatDate, formatMoney } from "../billing.js";
import "../customers.css";

const METHODS = [
  ["bank_transfer", "Bank transfer"],
  ["card", "Card"],
  ["cash", "Cash"],
  ["cheque", "Cheque"],
  ["other", "Other"],
];

export default function InvoiceDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const canManage = user.role === "admin" || user.role === "staff";

  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [payForm, setPayForm] = useState({ amount: "", method: "bank_transfer", paid_on: new Date().toISOString().slice(0, 10), note: "" });

  function reload() {
    return Promise.all([apiRequest(`/invoices/${id}/`), fetchAll(`/payments/?invoice=${id}`)]).then(([inv, list]) => {
      setInvoice(inv);
      setPayments(list);
    });
  }

  useEffect(() => {
    let active = true;
    reload()
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function markPaid() {
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/invoices/${id}/mark-paid/`, { method: "POST" });
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function recordPayment(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      await apiRequest("/payments/", {
        method: "POST",
        body: { invoice: Number(id), amount: payForm.amount, method: payForm.method, paid_on: payForm.paid_on, note: payForm.note },
      });
      setPayForm({ ...payForm, amount: "", note: "" });
      await reload();
    } catch (err) {
      setFieldErrors(fieldErrorsFrom(err));
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="page-status">Loading invoice…</p>;
  if (!invoice) {
    return (
      <section>
        <p className="notice notice-error" role="alert">{error || "Invoice not found."}</p>
        <Link to="/invoices">Back to invoices</Link>
      </section>
    );
  }

  const isPaid = invoice.status === "paid";

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>{invoice.invoice_number}</h1>
          <p className="muted"><Link to="/invoices">Back to invoices</Link></p>
        </div>
      </div>

      {error && <p className="notice notice-error" role="alert">{error}</p>}

      <dl className="detail-grid">
        <div className="detail-item"><dt>Customer</dt><dd>{invoice.customer_name}</dd></div>
        <div className="detail-item"><dt>Subscription</dt><dd><Link to={`/subscriptions/${invoice.subscription}`}>{invoice.subscription_label}</Link></dd></div>
        <div className="detail-item"><dt>Amount</dt><dd>{formatMoney(invoice.amount, invoice.currency)}</dd></div>
        <div className="detail-item"><dt>Paid so far</dt><dd>{formatMoney(invoice.amount_paid, invoice.currency)}</dd></div>
        <div className="detail-item"><dt>Balance due</dt><dd>{formatMoney(invoice.balance_due, invoice.currency)}</dd></div>
        <div className="detail-item"><dt>Issue date</dt><dd>{formatDate(invoice.issue_date)}</dd></div>
        <div className="detail-item"><dt>Due date</dt><dd>{formatDate(invoice.due_date)}</dd></div>
        <div className="detail-item"><dt>Payment status</dt><dd><StatusBadge value={invoice.effective_status} /></dd></div>
      </dl>

      {canManage && !isPaid && (
        <>
          <h2>Record a payment</h2>
          <form className="form-grid" onSubmit={recordPayment}>
            <label className="field">
              Amount
              <input type="number" step="0.01" min="0.01" value={payForm.amount} required
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
              {fieldErrors.amount && <span className="field-error">{fieldErrors.amount}</span>}
            </label>
            <label className="field">
              Method
              <select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
                {METHODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="field">
              Date
              <input type="date" value={payForm.paid_on} onChange={(e) => setPayForm({ ...payForm, paid_on: e.target.value })} />
            </label>
            <label className="field">
              Note
              <input value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} />
            </label>
            <div className="field wide actions">
              <button type="submit" className="btn btn-primary" disabled={busy}>Record payment</button>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={markPaid}>
                Mark fully paid (record balance)
              </button>
            </div>
          </form>
        </>
      )}

      <h2>Payments</h2>
      {payments.length === 0 ? (
        <div className="table-wrap"><div className="empty-state">No payments recorded yet.</div></div>
      ) : (
        <div className="table-wrap">
          <table className="customers">
            <thead>
              <tr><th>Date</th><th>Method</th><th>Amount</th><th>Note</th></tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{formatDate(p.paid_on)}</td>
                  <td>{METHODS.find(([v]) => v === p.method)?.[1] || p.method}</td>
                  <td>{formatMoney(p.amount, invoice.currency)}</td>
                  <td>{p.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
