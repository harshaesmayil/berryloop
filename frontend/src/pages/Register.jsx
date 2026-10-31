import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import Logo from "../components/Logo.jsx";

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      await register(form);
      navigate("/", { replace: true });
    } catch (err) {
      const fieldErrors = {};
      if (err.data && typeof err.data === "object") {
        for (const [field, messages] of Object.entries(err.data)) {
          if (field === "non_field_errors") continue;
          fieldErrors[field] = Array.isArray(messages) ? messages[0] : String(messages);
        }
      }
      setErrors({ ...fieldErrors, general: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Logo size="large" />
        <h1>Create your account</h1>
        <p className="muted">Start managing your business subscriptions in minutes.</p>

        <form onSubmit={handleSubmit} className="form">
          <div className="form-row">
            <label>
              First name
              <input name="first_name" value={form.first_name} onChange={updateField} />
            </label>
            <label>
              Last name
              <input name="last_name" value={form.last_name} onChange={updateField} />
            </label>
          </div>
          <label>
            Work email
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={form.email}
              onChange={updateField}
              required
            />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              value={form.password}
              onChange={updateField}
              required
            />
            {errors.password && <span className="form-error">{errors.password}</span>}
          </label>
          <p className="muted small">At least 10 characters, not too common, and not similar to your name or email.</p>

          {errors.general && <p className="form-error" role="alert">{errors.general}</p>}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="muted">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
