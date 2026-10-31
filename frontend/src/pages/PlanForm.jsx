import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiRequest } from "../api.js";
import { INTERVAL_LABELS, fieldErrorsFrom } from "../billing.js";
import "../customers.css";

export default function PlanForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    product: searchParams.get("product") || "",
    name: "",
    description: "",
    price: "",
    currency: "INR",
    billing_interval: "monthly",
    status: "active",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let active = true;
    const requests = [apiRequest("/products/options/")];
    if (isEdit) requests.push(apiRequest(`/plans/${id}/`));
    Promise.all(requests)
      .then(([productList, plan]) => {
        if (!active) return;
        setProducts(productList);
        if (plan) {
          setForm({
            product: String(plan.product),
            name: plan.name,
            description: plan.description || "",
            price: plan.price,
            currency: plan.currency,
            billing_interval: plan.billing_interval,
            status: plan.status,
          });
        }
      })
      .catch((err) => active && setFormError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, isEdit]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFieldErrors({});
    setFormError("");
    setSubmitting(true);
    const body = { ...form, product: Number(form.product), price: form.price };
    try {
      const saved = isEdit
        ? await apiRequest(`/plans/${id}/`, { method: "PATCH", body })
        : await apiRequest("/plans/", { method: "POST", body });
      navigate(`/plans/${saved.id}`, { replace: true });
    } catch (err) {
      setFieldErrors(fieldErrorsFrom(err));
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="page-status">Loading…</p>;

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>{isEdit ? "Edit plan" : "Add plan"}</h1>
          <p className="muted">
            <Link to={isEdit ? `/plans/${id}` : "/plans"}>Back</Link>
          </p>
        </div>
      </div>

      {formError && <p className="notice notice-error" role="alert">{formError}</p>}

      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          Product
          <select name="product" value={form.product} onChange={updateField} required>
            <option value="">Choose a product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {fieldErrors.product && <span className="field-error">{fieldErrors.product}</span>}
        </label>

        <label className="field">
          Plan name
          <input name="name" value={form.name} onChange={updateField} required />
          {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
        </label>

        <label className="field">
          Price
          <input type="number" name="price" step="0.01" min="0.01" value={form.price} onChange={updateField} required />
          {fieldErrors.price && <span className="field-error">{fieldErrors.price}</span>}
        </label>

        <label className="field">
          Currency
          <input name="currency" value={form.currency} onChange={updateField} maxLength={3} required />
          {fieldErrors.currency && <span className="field-error">{fieldErrors.currency}</span>}
        </label>

        <label className="field">
          Billing interval
          <select name="billing_interval" value={form.billing_interval} onChange={updateField}>
            {Object.entries(INTERVAL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {fieldErrors.billing_interval && <span className="field-error">{fieldErrors.billing_interval}</span>}
        </label>

        <label className="field">
          Status
          <select name="status" value={form.status} onChange={updateField}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {fieldErrors.status && <span className="field-error">{fieldErrors.status}</span>}
        </label>

        <label className="field wide">
          Description
          <textarea name="description" value={form.description} onChange={updateField} />
          {fieldErrors.description && <span className="field-error">{fieldErrors.description}</span>}
        </label>

        <div className="field wide actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create plan"}
          </button>
          <Link to={isEdit ? `/plans/${id}` : "/plans"} className="btn btn-ghost">Cancel</Link>
        </div>
      </form>
    </section>
  );
}
