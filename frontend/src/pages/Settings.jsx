import { useEffect, useState } from "react";
import { apiRequest } from "../api.js";
import { useAuth } from "../auth.jsx";
import { fetchAll, fieldErrorsFrom, formatDate, formatMoney } from "../billing.js";
import "../customers.css";

const EMPTY_TAX = { name: "", rate: "" };
const EMPTY_DISCOUNT = { name: "", kind: "percent", value: "", scope: "all", product: "", min_amount: "0", start_date: new Date().toISOString().slice(0, 10), end_date: "", usage_limit: "" };
const EMPTY_STAFF = { email: "", password: "", first_name: "", last_name: "" };

// Admin: tax rules, discount rules and staff accounts. Staff: view only for tax and discounts.
export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user.role === "admin";

  const [taxes, setTaxes] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [products, setProducts] = useState([]);
  const [taxForm, setTaxForm] = useState(EMPTY_TAX);
  const [discountForm, setDiscountForm] = useState(EMPTY_DISCOUNT);
  const [staffForm, setStaffForm] = useState(EMPTY_STAFF);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});

  function reload() {
    return Promise.all([fetchAll("/tax-rules/"), fetchAll("/discount-rules/"), apiRequest("/products/options/")])
      .then(([t, d, p]) => {
        setTaxes(t);
        setDiscounts(d);
        setProducts(p);
      });
  }

  useEffect(() => {
    reload().catch((err) => setMessage(err.message));
  }, []);

  async function act(action, success, reset) {
    setMessage("");
    setErrors({});
    try {
      await action();
      setMessage(success);
      if (reset) reset();
      await reload();
    } catch (err) {
      setErrors(fieldErrorsFrom(err));
      setMessage(err.message);
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="muted">Tax rules, discount rules{isAdmin ? ", and staff accounts" : ""}.</p>
        </div>
      </div>
      {message && <p className="notice" role="status">{message}</p>}

      <h2>Tax rules</h2>
      {isAdmin && (
        <form className="form-grid" onSubmit={(e) => { e.preventDefault(); act(() => apiRequest("/tax-rules/", { method: "POST", body: { ...taxForm, rate: taxForm.rate } }), "Tax rule added.", () => setTaxForm(EMPTY_TAX)); }}>
          <label className="field">Name<input value={taxForm.name} onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })} required />
            {errors.name && <span className="field-error">{errors.name}</span>}</label>
          <label className="field">Rate %<input type="number" step="0.01" min="0" max="100" value={taxForm.rate} onChange={(e) => setTaxForm({ ...taxForm, rate: e.target.value })} required />
            {errors.rate && <span className="field-error">{errors.rate}</span>}</label>
          <div className="field wide actions"><button className="btn btn-primary" type="submit">Add tax rule</button></div>
        </form>
      )}
      <div className="table-wrap">
        <table className="customers">
          <thead><tr><th>Name</th><th>Rate</th><th>Active</th></tr></thead>
          <tbody>
            {taxes.length === 0 && <tr><td colSpan={3} className="empty-state">No tax rules yet.</td></tr>}
            {taxes.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>{t.rate}%</td>
                <td>
                  {isAdmin ? (
                    <button className="btn btn-ghost" onClick={() => act(() => apiRequest(`/tax-rules/${t.id}/`, { method: "PATCH", body: { active: !t.active } }), "Tax rule updated.")}>
                      {t.active ? "Turn off" : "Turn on"}
                    </button>
                  ) : (t.active ? "Yes" : "No")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Discount rules</h2>
      {isAdmin && (
        <form className="form-grid" onSubmit={(e) => {
          e.preventDefault();
          const body = { ...discountForm, product: discountForm.scope === "product" ? Number(discountForm.product) : null, usage_limit: discountForm.usage_limit ? Number(discountForm.usage_limit) : null };
          act(() => apiRequest("/discount-rules/", { method: "POST", body }), "Discount rule saved. It applies to new invoices automatically.", () => setDiscountForm(EMPTY_DISCOUNT));
        }}>
          <label className="field">Name<input value={discountForm.name} onChange={(e) => setDiscountForm({ ...discountForm, name: e.target.value })} required /></label>
          <label className="field">Type
            <select value={discountForm.kind} onChange={(e) => setDiscountForm({ ...discountForm, kind: e.target.value })}>
              <option value="percent">Percentage</option><option value="fixed">Fixed amount</option>
            </select></label>
          <label className="field">Value<input type="number" step="0.01" min="0.01" value={discountForm.value} onChange={(e) => setDiscountForm({ ...discountForm, value: e.target.value })} required />
            {errors.value && <span className="field-error">{errors.value}</span>}</label>
          <label className="field">Applies to
            <select value={discountForm.scope} onChange={(e) => setDiscountForm({ ...discountForm, scope: e.target.value })}>
              <option value="all">Whole subscription</option><option value="product">Specific product</option>
            </select></label>
          {discountForm.scope === "product" && (
            <label className="field">Product
              <select value={discountForm.product} onChange={(e) => setDiscountForm({ ...discountForm, product: e.target.value })} required>
                <option value="">Choose product</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {errors.product && <span className="field-error">{errors.product}</span>}</label>
          )}
          <label className="field">Minimum amount<input type="number" step="0.01" min="0" value={discountForm.min_amount} onChange={(e) => setDiscountForm({ ...discountForm, min_amount: e.target.value })} /></label>
          <label className="field">Start date<input type="date" value={discountForm.start_date} onChange={(e) => setDiscountForm({ ...discountForm, start_date: e.target.value })} required /></label>
          <label className="field">End date<input type="date" value={discountForm.end_date} onChange={(e) => setDiscountForm({ ...discountForm, end_date: e.target.value })} required />
            {errors.end_date && <span className="field-error">{errors.end_date}</span>}</label>
          <label className="field">Usage limit (blank = unlimited)<input type="number" min="1" value={discountForm.usage_limit} onChange={(e) => setDiscountForm({ ...discountForm, usage_limit: e.target.value })} /></label>
          <div className="field wide actions"><button className="btn btn-primary" type="submit">Save discount rule</button></div>
        </form>
      )}
      <div className="table-wrap">
        <table className="customers">
          <thead><tr><th>Name</th><th>Value</th><th>Applies to</th><th>Valid</th><th>Used</th></tr></thead>
          <tbody>
            {discounts.length === 0 && <tr><td colSpan={5} className="empty-state">No discount rules yet.</td></tr>}
            {discounts.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td>{d.kind === "percent" ? `${d.value}%` : formatMoney(d.value, "INR")}</td>
                <td>{d.scope === "all" ? "Whole subscription" : (products.find((p) => p.id === d.product)?.name || "Product")}</td>
                <td>{formatDate(d.start_date)} – {formatDate(d.end_date)}</td>
                <td>{d.times_used}{d.usage_limit ? ` / ${d.usage_limit}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdmin && (
        <>
          <h2>Add staff member</h2>
          <form className="form-grid" onSubmit={(e) => { e.preventDefault(); act(() => apiRequest("/auth/staff/", { method: "POST", body: staffForm }), "Staff member added.", () => setStaffForm(EMPTY_STAFF)); }}>
            <label className="field">Email<input type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} required />
              {errors.email && <span className="field-error">{errors.email}</span>}</label>
            <label className="field">Temporary password<input type="password" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} required />
              {errors.password && <span className="field-error">{errors.password}</span>}</label>
            <label className="field">First name<input value={staffForm.first_name} onChange={(e) => setStaffForm({ ...staffForm, first_name: e.target.value })} /></label>
            <label className="field">Last name<input value={staffForm.last_name} onChange={(e) => setStaffForm({ ...staffForm, last_name: e.target.value })} /></label>
            <div className="field wide actions"><button className="btn btn-primary" type="submit">Add staff member</button></div>
          </form>
        </>
      )}
    </section>
  );
}
