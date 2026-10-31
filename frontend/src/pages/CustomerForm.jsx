import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api.js";
import "../customers.css";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  company: "",
  billing_address: "",
  status: "active",
  user: "",
};

export default function CustomerForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [linkableUsers, setLinkableUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let active = true;
    const requests = [apiRequest("/customers/linkable-users/")];
    if (isEdit) requests.push(apiRequest(`/customers/${id}/`));

    Promise.all(requests)
      .then(([users, customer]) => {
        if (!active) return;
        let options = users;
        if (customer && customer.user && !users.some((u) => u.id === customer.user)) {
          // Keep the currently linked login visible while editing.
          options = [{ id: customer.user, email: customer.user_email }, ...users];
        }
        setLinkableUsers(options);
        if (customer) {
          setForm({
            name: customer.name || "",
            email: customer.email || "",
            phone: customer.phone || "",
            company: customer.company || "",
            billing_address: customer.billing_address || "",
            status: customer.status || "active",
            user: customer.user ? String(customer.user) : "",
          });
        }
      })
      .catch((err) => {
        if (active) setFormError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

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

    const body = {
      ...form,
      user: form.user ? Number(form.user) : null,
    };

    try {
      const saved = isEdit
        ? await apiRequest(`/customers/${id}/`, { method: "PATCH", body })
        : await apiRequest("/customers/", { method: "POST", body });
      navigate(`/customers/${saved.id}`, { replace: true });
    } catch (err) {
      const errors = {};
      if (err.data && typeof err.data === "object") {
        for (const [field, messages] of Object.entries(err.data)) {
          if (field === "detail") continue;
          errors[field] = Array.isArray(messages) ? messages[0] : String(messages);
        }
      }
      setFieldErrors(errors);
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
          <h1>{isEdit ? "Edit customer" : "Add customer"}</h1>
          <p className="muted">
            <Link to={isEdit ? `/customers/${id}` : "/customers"}>Back</Link>
          </p>
        </div>
      </div>

      {formError && (
        <p className="notice notice-error" role="alert">
          {formError}
        </p>
      )}

      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          Name
          <input name="name" value={form.name} onChange={updateField} required />
          {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
        </label>

        <label className="field">
          Email
          <input type="email" name="email" value={form.email} onChange={updateField} required />
          {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
        </label>

        <label className="field">
          Phone
          <input name="phone" value={form.phone} onChange={updateField} />
          {fieldErrors.phone && <span className="field-error">{fieldErrors.phone}</span>}
        </label>

        <label className="field">
          Company
          <input name="company" value={form.company} onChange={updateField} />
          {fieldErrors.company && <span className="field-error">{fieldErrors.company}</span>}
        </label>

        <label className="field wide">
          Billing address
          <textarea name="billing_address" value={form.billing_address} onChange={updateField} />
          {fieldErrors.billing_address && (
            <span className="field-error">{fieldErrors.billing_address}</span>
          )}
        </label>

        <label className="field">
          Status
          <select name="status" value={form.status} onChange={updateField}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {fieldErrors.status && <span className="field-error">{fieldErrors.status}</span>}
        </label>

        <label className="field">
          Customer login (optional)
          <select name="user" value={form.user} onChange={updateField}>
            <option value="">No login linked</option>
            {linkableUsers.map((option) => (
              <option key={option.id} value={option.id}>
                {option.email}
              </option>
            ))}
          </select>
          {fieldErrors.user && <span className="field-error">{fieldErrors.user}</span>}
        </label>

        <div className="field wide actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create customer"}
          </button>
          <Link to={isEdit ? `/customers/${id}` : "/customers"} className="btn btn-ghost">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
