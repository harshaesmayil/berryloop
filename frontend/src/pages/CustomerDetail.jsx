import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api.js";
import { useAuth } from "../auth.jsx";
import "../customers.css";

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user.role === "admin" || user.role === "staff";
  const canDelete = user.role === "admin";

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    apiRequest(`/customers/${id}/`)
      .then((result) => {
        if (active) setCustomer(result);
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
  }, [id]);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete ${customer.name}? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setError("");
    try {
      await apiRequest(`/customers/${id}/`, { method: "DELETE" });
      navigate("/customers", { replace: true });
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  if (loading) return <p className="page-status">Loading customer…</p>;

  if (error && !customer) {
    return (
      <section>
        <p className="notice notice-error" role="alert">
          {error}
        </p>
        <Link to="/customers">Back to customers</Link>
      </section>
    );
  }

  const items = [
    ["Company", customer.company || "—"],
    ["Email", customer.email],
    ["Phone", customer.phone || "—"],
    ["Status", customer.status],
    ["Login account", customer.user_email || "Not linked"],
    ["Billing address", customer.billing_address || "—"],
    ["Created", new Date(customer.created_at).toLocaleDateString()],
    ["Last updated", new Date(customer.updated_at).toLocaleDateString()],
  ];

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>{customer.name}</h1>
          <p className="muted">
            <Link to="/customers">Back to customers</Link>
          </p>
        </div>
      </div>

      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}

      <dl className="detail-grid">
        {items.map(([label, value]) => (
          <div className="detail-item" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {canManage && (
        <div className="actions">
          <Link to={`/customers/${id}/edit`} className="btn btn-primary">
            Edit customer
          </Link>
          {canDelete && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete customer"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
