import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api.js";
import { fieldErrorsFrom } from "../billing.js";
import "../customers.css";

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", description: "", status: "active" });
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    let active = true;
    apiRequest(`/products/${id}/`)
      .then((product) => {
        if (active) {
          setForm({
            name: product.name,
            description: product.description || "",
            status: product.status,
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
    try {
      const saved = isEdit
        ? await apiRequest(`/products/${id}/`, { method: "PATCH", body: form })
        : await apiRequest("/products/", { method: "POST", body: form });
      navigate(`/products/${saved.id}`, { replace: true });
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
          <h1>{isEdit ? "Edit product" : "Add product"}</h1>
          <p className="muted">
            <Link to={isEdit ? `/products/${id}` : "/products"}>Back</Link>
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
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create product"}
          </button>
          <Link to={isEdit ? `/products/${id}` : "/products"} className="btn btn-ghost">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
