import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest } from "../api.js";
import Logo from "../components/Logo.jsx";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    if (password !== confirm) return setMessage("The two passwords do not match.");
    setSubmitting(true);
    try {
      const result = await apiRequest("/auth/password-reset/confirm/", {
        method: "POST",
        body: { uid: searchParams.get("uid"), token: searchParams.get("token"), password },
      });
      setMessage(result.detail);
      setDone(true);
    } catch (err) {
      setMessage(err.data?.password ? err.data.password.join(" ") : err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Logo size="full" />
        <h1>Choose a new password</h1>
        <p className="muted">At least 9 characters, with an uppercase letter, a lowercase letter and a special character.</p>
        {done ? (
          <p><Link to="/login">Go to sign in</Link></p>
        ) : (
          <form onSubmit={handleSubmit} className="form">
            <label>
              New password
              <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <label>
              Confirm password
              <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </label>
            {message && <p className="form-error" role="alert">{message}</p>}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving…" : "Save new password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
