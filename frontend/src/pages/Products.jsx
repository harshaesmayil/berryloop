import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api.js";
import { useAuth } from "../auth.jsx";
import { StatusBadge } from "../billing.js";
import "../customers.css";

export default function Products() {
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
    apiRequest(`/products/?${params.toString()}`)
      .then((result) => active && setData(result))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [query.search, query.status, query.page]);

  function handleSearch(event) {
    event.preventDefault();
    setQuery((current) => ({ ...current, search: searchInput.trim(), page: 1 }));
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.count / 20)) : 1;

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p className="muted">
            {data ? `${data.count} product${data.count === 1 ? "" : "s"}` : "Loading products…"}
          </p>
        </div>
        {canManage && (
          <Link to="/products/new" className="btn btn-primary">
            Add product
          </Link>
        )}
      </div>

      <form className="toolbar" onSubmit={handleSearch}>
        <input
          type="search"
          placeholder="Search by name or description"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          aria-label="Search products"
        />
        <button type="submit" className="btn btn-ghost">
          Search
        </button>
        <select
          value={query.status}
          onChange={(event) => setQuery((c) => ({ ...c, status: event.target.value, page: 1 }))}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </form>

      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      {loading && !data && <p className="page-status">Loading products…</p>}

      {data && data.results.length === 0 && (
        <div className="table-wrap">
          <div className="empty-state">
            {query.search || query.status
              ? "No products match these filters."
              : "No products yet. Add your first product, then create its plans."}
          </div>
        </div>
      )}

      {data && data.results.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="customers">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Plans</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <Link to={`/products/${product.id}`}>{product.name}</Link>
                    </td>
                    <td>{product.plan_count}</td>
                    <td>
                      <StatusBadge value={product.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!data.previous || loading}
              onClick={() => setQuery((c) => ({ ...c, page: c.page - 1 }))}
            >
              Previous
            </button>
            <span className="muted small">
              Page {query.page} of {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!data.next || loading}
              onClick={() => setQuery((c) => ({ ...c, page: c.page + 1 }))}
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
}
