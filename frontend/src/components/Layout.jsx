import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import Logo from "./Logo.jsx";

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <Logo size="small" />
        <nav className="topnav" aria-label="Main">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          {(user.role === "admin" || user.role === "staff") && (
            <NavLink to="/customers">Customers</NavLink>
          )}
          {(user.role === "admin" || user.role === "staff") && (
            <NavLink to="/products">Products</NavLink>
          )}
          {(user.role === "admin" || user.role === "staff") && (
            <NavLink to="/plans">Plans</NavLink>
          )}
          {(user.role === "admin" || user.role === "staff") && (
            <NavLink to="/subscriptions">Subscriptions</NavLink>
          )}
          {(user.role === "admin" || user.role === "staff") && (
            <NavLink to="/invoices">Invoices</NavLink>
          )}
        </nav>
        <div className="topbar-user">
          <span className="user-email">{user.email}</span>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
