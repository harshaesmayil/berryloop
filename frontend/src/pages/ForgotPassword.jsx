import { useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api.js";
import Logo from "../components/Logo.jsx";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await apiRequest("/auth/password-reset/", { method: "POST", body: { email } });
      setMessage(result.detail);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Logo size="full" />
        <h1>Reset your password</h1>
        <p className="muted">Enter your registered email and we will send a reset link.</p>
        <form onSubmit={handleSubmit} className="form">
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {message && <p className="form-error" role="status">{message}</p>}
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
        <p className="muted"><Link to="/login">Back to sign in</Link></p>
      </div>
    </div>
  );
}
