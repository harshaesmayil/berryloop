import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api.js";
import { useAuth } from "../auth.jsx";
import { INTERVAL_LABELS, StatusBadge, formatDate, formatMoney } from "../billing.js";
import "../customers.css";

export default function Subscriptions() {
  const { user } = useAuth();
  const canManage = user.role === "admin" || user.role === "staff";

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState({ search: "", status: "", page: 1 });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(query.page) });
    if (query.search) params.set("search", query.search);
    if (query.status) params.set("status", query.status);
    setLoading(true);
    setError("");
    apiRequest(`/subscriptions/?${params.toString()}`)
      .then((result) => active && setData(result))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [query.search, query.status, query.page]);

  function handleSearch(event) {
    event.preventDefault();
    setQuery((c) => ({ ...c, search: searchInput.trim(), page: 1 }));
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.count / 20)) : 1;

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Subscriptions</h1>
          <p className="muted">
            {data ? `${data.count} subscription${data.count === 1 ? "" : "s"}` : "Loading subscriptions…"}
          </p>
        </div>
        {canManage && (
          <Link to="/subscriptions/new" className="btn btn-primary">New subscription</Link>
        )}
      </div>

      <form className="toolbar" onSubmit={handleSearch}>
        <input
          type="search"
          placeholder="Search by customer, plan or product"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          aria-label="Search subscriptions"
        />
        <button type="submit" className="btn btn-ghost">Search</button>
        <select value={query.status} onChange={(e) => setQuery((c) => ({ ...c, status: e.target.value, page: 1 }))} aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
      </form>

      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {loading && !data && <p className="page-status">Loading subscriptions…</p>}

      {data && data.results.length === 0 && (
        <div className="table-wrap">
          <div className="empty-state">
            {query.search || query.status
              ? "No subscriptions match these filters."
              : "No subscriptions yet. Create one for a customer to start billing."}
          </div>
        </div>
      )}

      {data && data.results.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="customers">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Plan</th>
                  <th>Price</th>
                  <th>Next billing</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((sub) => (
                  <tr key={sub.id}>
                    <td><Link to={`/subscriptions/${sub.id}`}>{sub.customer_name}</Link></td>
                    <td>{sub.product_name} – {sub.plan_name} <span className="muted small">({INTERVAL_LABELS[sub.billing_interval]})</span></td>
                    <td>{formatMoney(sub.price, sub.currency)}</td>
                    <td>{formatDate(sub.next_billing_date)}</td>
                    <td><StatusBadge value={sub.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button type="button" className="btn btn-ghost" disabled={!data.previous || loading}
              onClick={() => setQuery((c) => ({ ...c, page: c.page - 1 }))}>Previous</button>
            <span className="muted small">Page {query.page} of {totalPages}</span>
            <button type="button" className="btn btn-ghost" disabled={!data.next || loading}
              onClick={() => setQuery((c) => ({ ...c, page: c.page + 1 }))}>Next</button>
          </div>
        </>
      )}
    </section>
  );
}
