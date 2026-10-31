import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api.js";
import { useAuth } from "../auth.jsx";
import { INTERVAL_LABELS, StatusBadge, formatDate, formatMoney } from "../billing.js";
import "../customers.css";

export default function PlanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user.role === "admin" || user.role === "staff";
  const canDelete = user.role === "admin";

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest(`/plans/${id}/`)
      .then((result) => active && setPlan(result))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  async function handleDelete() {
    if (!window.confirm(`Delete plan ${plan.name}? This cannot be undone.`)) return;
    try {
      await apiRequest(`/plans/${id}/`, { method: "DELETE" });
      navigate("/plans", { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p className="page-status">Loading plan…</p>;
  if (error && !plan) {
    return (
      <section>
        <p className="notice notice-error" role="alert">{error}</p>
        <Link to="/plans">Back to plans</Link>
      </section>
    );
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>{plan.name}</h1>
          <p className="muted">
            <Link to="/plans">Back to plans</Link>
          </p>
        </div>
      </div>

      {error && <p className="notice notice-error" role="alert">{error}</p>}

      <dl className="detail-grid">
        <div className="detail-item"><dt>Product</dt><dd><Link to={`/products/${plan.product}`}>{plan.product_name}</Link></dd></div>
        <div className="detail-item"><dt>Price</dt><dd>{formatMoney(plan.price, plan.currency)}</dd></div>
        <div className="detail-item"><dt>Billing</dt><dd>{INTERVAL_LABELS[plan.billing_interval]}</dd></div>
        <div className="detail-item"><dt>Status</dt><dd><StatusBadge value={plan.status} /></dd></div>
        <div className="detail-item"><dt>Description</dt><dd>{plan.description || "—"}</dd></div>
        <div className="detail-item"><dt>Last updated</dt><dd>{formatDate(plan.updated_at)}</dd></div>
      </dl>

      {canManage && (
        <div className="actions">
          <Link to={`/plans/${id}/edit`} className="btn btn-primary">Edit plan</Link>
          {canDelete && (
            <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete plan</button>
          )}
        </div>
      )}
    </section>
  );
}
