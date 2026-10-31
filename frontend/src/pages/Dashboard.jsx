import { useEffect, useState } from "react";
import { apiRequest } from "../api.js";
import { useAuth } from "../auth.jsx";

export default function Dashboard() {
  const { user } = useAuth();
  const [connection, setConnection] = useState("checking");

  useEffect(() => {
    let active = true;
    apiRequest("/health/")
      .then(() => active && setConnection("connected"))
      .catch(() => active && setConnection("unreachable"));
    return () => {
      active = false;
    };
  }, []);

  const greetingName = user.first_name || user.email;
  const connectionText = {
    checking: "Checking…",
    connected: "Connected to the Django API.",
    unreachable: "Cannot reach the Django API. Check that it is running on port 8000.",
  }[connection];

  return (
    <section>
      <h1>Welcome, {greetingName}</h1>
      <p className="muted">Signed in as {user.role}.</p>

      <div className="card-grid">
        <div className="card">
          <h2>Backend connection</h2>
          <p>{connectionText}</p>
        </div>
        <div className="card">
          <h2>Coming in the next stages</h2>
          <p>
            Products, plans, subscriptions, quotations, invoices, payments and reports will appear
            here as they are built and connected to the database.
          </p>
        </div>
      </div>
    </section>
  );
}
