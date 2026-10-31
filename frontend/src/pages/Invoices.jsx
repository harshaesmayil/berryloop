import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest } from "../api.js";
import { useAuth } from "../auth.jsx";
import { StatusBadge, formatDate, formatMoney } from "../billing.js";
import "../customers.css";

export default function Invoices() {
  const { user } = useAuth();
  const canManage = user.role === "admin" || user.role === "staff";

  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set("status", status);
    setLoading(true);
    apiRequest(`/invoices/?${params.toString()}`)
      .then((result) => active && setData(result))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [status, page, reloadKey]);

  async function markPaid(id) {
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/invoices/${id}/mark-paid/`, { method: "POST" });
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.count / 20)) : 1;

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Invoices</h1>
          <p className="muted">
            {data ? `${data.count} invoice${data.count === 1 ? "" : "s"}` : "Loading invoices…"}
          </p>
        </div>
      </div>

      <form className="toolbar" onSubmit={(e) => e.preventDefault()}>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by payment status">
          <option value="">All invoices</option>
          <option value="pending">Pending (not yet due)</option>
          <option value="overdue">Overdue</option>
          <option value="paid">Paid</option>
        </select>
      </form>

      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {loading && !data && <p className="page-status">Loading invoices…</p>}

      {data && data.results.length === 0 && (
        <div className="table-wrap">
          <div className="empty-state">
            {status ? "No invoices match this filter." : "No invoices yet. Generate one from a subscription."}
          </div>
        </div>
      )}

      {data && data.results.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="customers">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Issued</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((inv) => (
                  <tr key={inv.id}>
                    <td><Link to={`/invoices/${inv.id}`}>{inv.invoice_number}</Link></td>
                    <td>{inv.customer_name}</td>
                    <td>{formatMoney(inv.amount, inv.currency)}</td>
                    <td>{formatDate(inv.issue_date)}</td>
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
          <div className="pagination">
            <button type="button" className="btn btn-ghost" disabled={!data.previous || loading} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <span className="muted small">Page {page} of {totalPages}</span>
            <button type="button" className="btn btn-ghost" disabled={!data.next || loading} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </>
      )}
    </section>
  );
}
