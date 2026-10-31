import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import Layout from "./components/Layout.jsx";
import CustomerDetail from "./pages/CustomerDetail.jsx";
import CustomerForm from "./pages/CustomerForm.jsx";
import Customers from "./pages/Customers.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Invoices from "./pages/Invoices.jsx";
import InvoiceDetail from "./pages/InvoiceDetail.jsx";
import Login from "./pages/Login.jsx";
import PlanDetail from "./pages/PlanDetail.jsx";
import PlanForm from "./pages/PlanForm.jsx";
import Plans from "./pages/Plans.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import ProductForm from "./pages/ProductForm.jsx";
import Products from "./pages/Products.jsx";
import SubscriptionDetail from "./pages/SubscriptionDetail.jsx";
import SubscriptionForm from "./pages/SubscriptionForm.jsx";
import Subscriptions from "./pages/Subscriptions.jsx";
import Register from "./pages/Register.jsx";

// Pages inside this wrapper are only shown to logged-in users.
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="page-status">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/new" element={<CustomerForm />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="customers/:id/edit" element={<CustomerForm />} />
        <Route path="products" element={<Products />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="products/:id/edit" element={<ProductForm />} />
        <Route path="plans" element={<Plans />} />
        <Route path="plans/new" element={<PlanForm />} />
        <Route path="plans/:id" element={<PlanDetail />} />
        <Route path="plans/:id/edit" element={<PlanForm />} />
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route path="subscriptions/new" element={<SubscriptionForm />} />
        <Route path="subscriptions/:id" element={<SubscriptionDetail />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/:id" element={<InvoiceDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
