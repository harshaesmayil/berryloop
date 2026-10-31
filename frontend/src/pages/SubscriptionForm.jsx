import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api.js";
import { INTERVAL_LABELS, fetchAll, fieldErrorsFrom, formatMoney } from "../billing.js";
import "../customers.css";

export default function SubscriptionForm() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({ customer: "", plan: "", start_date: new Date().toISOString().slice(0, 10) });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([fetchAll("/customers/?status=active"), fetchAll("/plans/?status=active")])
      .then(([customerList, planList]) => {
        if (!active) return;
        setCustomers(customerList);
        setPlans(planList);
      })
      .catch((err) => active && setFormError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFieldErrors({});
    setFormError("");
    setSubmitting(true);
    try {
      const saved = await apiRequest("/subscriptions/", {
        method: "POST",
        body: { customer: Number(form.customer), plan: Number(form.plan), start_date: form.start_date },
      });
      navigate(`/subscriptions/${saved.id}`, { replace: true });
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
          <h1>New subscription</h1>
          <p className="muted"><Link to="/subscriptions">Back</Link></p>
        </div>
      </div>

      {formError && <p className="notice notice-error" role="alert">{formError}</p>}
      {customers.length === 0 && <p className="notice">Add an active customer before creating a subscription.</p>}
      {plans.length === 0 && <p className="notice">Create an active plan before creating a subscription.</p>}

      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          Customer
          <select name="customer" value={form.customer} onChange={updateField} required>
            <option value="">Choose a customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ""}</option>
            ))}
          </select>
          {fieldErrors.customer && <span className="field-error">{fieldErrors.customer}</span>}
        </label>

        <label className="field">
          Plan
          <select name="plan" value={form.plan} onChange={updateField} required>
            <option value="">Choose a plan</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.product_name} – {p.name} ({formatMoney(p.price, p.currency)} / {INTERVAL_LABELS[p.billing_interval].toLowerCase()})
              </option>
            ))}
          </select>
          {fieldErrors.plan && <span className="field-error">{fieldErrors.plan}</span>}
        </label>

        <label className="field">
          Start date
          <input type="date" name="start_date" value={form.start_date} onChange={updateField} required />
          {fieldErrors.start_date && <span className="field-error">{fieldErrors.start_date}</span>}
        </label>

        <div className="field wide actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Creating…" : "Create subscription"}
          </button>
          <Link to="/subscriptions" className="btn btn-ghost">Cancel</Link>
        </div>
      </form>
    </section>
  );
}
