import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../api.js";
import { useAuth } from "../auth.jsx";
import { StatusBadge, formatDate, formatMoney } from "../billing.js";
import "../customers.css";

export default function InvoiceDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const canManage = user.role === "admin" || user.role === "staff";

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest(`/invoices/${id}/`)
      .then((result) => active && setInvoice(result))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  async function markPaid() {
    setBusy(true);
    setError("");
    try {
      setInvoice(await apiRequest(`/invoices/${id}/mark-paid/`, { method: "POST" }));
    } catch (err) {
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
        <div className="detail-item"><dt>Issue date</dt><dd>{formatDate(invoice.issue_date)}</dd></div>
        <div className="detail-item"><dt>Due date</dt><dd>{formatDate(invoice.due_date)}</dd></div>
        <div className="detail-item"><dt>Payment status</dt><dd><StatusBadge value={invoice.effective_status} /></dd></div>
        <div className="detail-item"><dt>Paid on</dt><dd>{invoice.paid_at ? formatDate(invoice.paid_at) : "—"}</dd></div>
      </dl>

      {canManage && invoice.status === "pending" && (
        <div className="actions">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={markPaid}>
            {busy ? "Saving…" : "Mark as paid"}
          </button>
        </div>
      )}
    </section>
  );
}
