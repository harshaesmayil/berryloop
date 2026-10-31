import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api.js";
import { useAuth } from "../auth.jsx";
import { INTERVAL_LABELS, StatusBadge, formatMoney } from "../billing.js";
import "../customers.css";

export default function Plans() {
  const { user } = useAuth();
  const canManage = user.role === "admin" || user.role === "staff";

  const [products, setProducts] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState({ search: "", status: "", billing_interval: "", product: "", page: 1 });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/products/options/").then(setProducts).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(query.page) });
    for (const key of ["search", "status", "billing_interval", "product"]) {
      if (query[key]) params.set(key, query[key]);
    }
    setLoading(true);
    setError("");
    apiRequest(`/plans/?${params.toString()}`)
      .then((result) => active && setData(result))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [query]);

  function setFilter(key, value) {
    setQuery((current) => ({ ...current, [key]: value, page: 1 }));
  }

  function handleSearch(event) {
    event.preventDefault();
    setFilter("search", searchInput.trim());
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.count / 20)) : 1;

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Plans</h1>
          <p className="muted">
            {data ? `${data.count} plan${data.count === 1 ? "" : "s"}` : "Loading plans…"}
          </p>
        </div>
        {canManage && (
          <Link to="/plans/new" className="btn btn-primary">
            Add plan
          </Link>
        )}
      </div>

      <form className="toolbar" onSubmit={handleSearch}>
        <input
          type="search"
          placeholder="Search by plan or product name"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          aria-label="Search plans"
        />
        <button type="submit" className="btn btn-ghost">Search</button>
        <select value={query.product} onChange={(e) => setFilter("product", e.target.value)} aria-label="Filter by product">
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select value={query.billing_interval} onChange={(e) => setFilter("billing_interval", e.target.value)} aria-label="Filter by billing interval">
          <option value="">All billing intervals</option>
          {Object.entries(INTERVAL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select value={query.status} onChange={(e) => setFilter("status", e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </form>

      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {loading && !data && <p className="page-status">Loading plans…</p>}

      {data && data.results.length === 0 && (
        <div className="table-wrap">
          <div className="empty-state">
            {query.search || query.status || query.product || query.billing_interval
              ? "No plans match these filters."
              : "No plans yet. Create a product first, then add its plans."}
          </div>
        </div>
      )}

      {data && data.results.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="customers">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Billing</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((plan) => (
                  <tr key={plan.id}>
                    <td><Link to={`/plans/${plan.id}`}>{plan.name}</Link></td>
                    <td>{plan.product_name}</td>
                    <td>{formatMoney(plan.price, plan.currency)}</td>
                    <td>{INTERVAL_LABELS[plan.billing_interval]}</td>
                    <td><StatusBadge value={plan.status} /></td>
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
