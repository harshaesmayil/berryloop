import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api.js";
import { useAuth } from "../auth.jsx";
import { INTERVAL_LABELS, StatusBadge, fetchAll, formatMoney } from "../billing.js";
import "../customers.css";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user.role === "admin" || user.role === "staff";
  const canDelete = user.role === "admin";

  const [product, setProduct] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([apiRequest(`/products/${id}/`), fetchAll(`/plans/?product=${id}`)])
      .then(([productData, planList]) => {
        if (!active) return;
        setProduct(productData);
        setPlans(planList);
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  async function handleDelete() {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    try {
      await apiRequest(`/products/${id}/`, { method: "DELETE" });
      navigate("/products", { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p className="page-status">Loading product…</p>;
  if (error && !product) {
    return (
      <section>
        <p className="notice notice-error" role="alert">{error}</p>
        <Link to="/products">Back to products</Link>
      </section>
    );
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>{product.name}</h1>
          <p className="muted">
            <Link to="/products">Back to products</Link>
          </p>
        </div>
      </div>

      {error && <p className="notice notice-error" role="alert">{error}</p>}

      <dl className="detail-grid">
        <div className="detail-item">
          <dt>Status</dt>
          <dd><StatusBadge value={product.status} /></dd>
        </div>
        <div className="detail-item">
          <dt>Description</dt>
          <dd>{product.description || "—"}</dd>
        </div>
        <div className="detail-item">
          <dt>Plans</dt>
          <dd>{plans.length}</dd>
        </div>
      </dl>

      {canManage && (
        <div className="actions">
          <Link to={`/products/${id}/edit`} className="btn btn-primary">Edit product</Link>
          <Link to={`/plans/new?product=${id}`} className="btn btn-ghost">Add plan</Link>
          {canDelete && (
            <button type="button" className="btn btn-danger" onClick={handleDelete}>
              Delete product
            </button>
          )}
        </div>
      )}

      <h2>Plans</h2>
      {plans.length === 0 ? (
        <div className="table-wrap">
          <div className="empty-state">No plans yet for this product.</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="customers">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Price</th>
                <th>Billing</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id}>
                  <td><Link to={`/plans/${plan.id}`}>{plan.name}</Link></td>
                  <td>{formatMoney(plan.price, plan.currency)}</td>
                  <td>{INTERVAL_LABELS[plan.billing_interval]}</td>
                  <td><StatusBadge value={plan.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
