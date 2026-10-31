import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api.js";
import { useAuth } from "../auth.jsx";
import "../customers.css";

const STATUS_LABELS = { active: "Active", inactive: "Inactive" };

export default function Customers() {
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
    apiRequest(`/customers/?${params.toString()}`)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [query.search, query.status, query.page]);

  function handleSearch(event) {
    event.preventDefault();
    setQuery((current) => ({ ...current, search: searchInput.trim(), page: 1 }));
  }

  function handleStatus(event) {
    setQuery((current) => ({ ...current, status: event.target.value, page: 1 }));
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.count / 20)) : 1;

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p className="muted">
            {data ? `${data.count} customer${data.count === 1 ? "" : "s"}` : "Loading customers…"}
          </p>
        </div>
        {canManage && (
          <Link to="/customers/new" className="btn btn-primary">
            Add customer
          </Link>
        )}
      </div>

      <form className="toolbar" onSubmit={handleSearch}>
        <input
          type="search"
          placeholder="Search by name, email or company"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          aria-label="Search customers"
        />
        <button type="submit" className="btn btn-ghost">
          Search
        </button>
        <select value={query.status} onChange={handleStatus} aria-label="Filter by status">
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

      {loading && !data && <p className="page-status">Loading customers…</p>}

      {data && data.results.length === 0 && (
        <div className="table-wrap">
          <div className="empty-state">
            {query.search || query.status
              ? "No customers match these filters."
              : canManage
              ? "No customers yet. Add your first customer to get started."
              : "No customer records are available to you yet."}
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
                  <th>Company</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <Link to={`/customers/${customer.id}`}>{customer.name}</Link>
                    </td>
                    <td>{customer.company || "—"}</td>
                    <td>{customer.email}</td>
                    <td>
                      <span className={`badge badge-${customer.status}`}>
                        {STATUS_LABELS[customer.status] || customer.status}
                      </span>
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
              onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}
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
              onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
}
