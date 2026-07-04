import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { auth, isFirebaseInitialized } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

// Views
import ConfigSetup from "./pages/ConfigSetup";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import InvoiceEditor from "./pages/InvoiceEditor";
import InvoiceDetails from "./pages/InvoiceDetails";
import Items from "./pages/Items";
import Settings from "./pages/Settings";
import PublicInvoice from "./pages/PublicInvoice";
import OfflineBanner from "./components/OfflineBanner";

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseInitialized) {
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg-primary)",
        color: "var(--text-primary)",
        gap: "10px"
      }}>
        <div style={{ width: "24px", height: "24px", border: "3px solid var(--accent-color)", borderTopColor: "transparent", borderRadius: "50%" }} className="animate-spin"></div>
        <span>Verifying secure session...</span>
      </div>
    );
  }

  // If Firebase credentials are not set up, show the credentials wizard
  if (!isFirebaseInitialized) {
    return (
      <Router>
        <Routes>
          <Route path="*" element={<ConfigSetup />} />
        </Routes>
      </Router>
    );
  }

  // Helper component to guard private routes
  function ProtectedRoute({ children }) {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    return children;
  }

  // Helper component to redirect logged in users from auth pages
  function AuthRoute({ children }) {
    if (user) {
      return <Navigate to="/" replace />;
    }
    return children;
  }

  return (
    <Router>
      <OfflineBanner />
      <Routes>
        
        {/* PUBLIC UNPROTECTED ROUTE (FOR QR SCAN TO PDF DOWNLOAD) */}
        <Route path="/public/invoice/:id" element={<PublicInvoice />} />

        {/* AUTHENTICATION ROUTES */}
        <Route path="/login" element={
          <AuthRoute>
            <Login />
          </AuthRoute>
        } />
        <Route path="/register" element={
          <AuthRoute>
            <Register />
          </AuthRoute>
        } />

        {/* PROTECTED USER ROUTES */}
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/invoices/new" element={
          <ProtectedRoute>
            <InvoiceEditor />
          </ProtectedRoute>
        } />
        <Route path="/invoices/edit/:id" element={
          <ProtectedRoute>
            <InvoiceEditor />
          </ProtectedRoute>
        } />
        <Route path="/invoices/view/:id" element={
          <ProtectedRoute>
            <InvoiceDetails />
          </ProtectedRoute>
        } />
        <Route path="/items" element={
          <ProtectedRoute>
            <Items />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />

        {/* FALLBACK REDIRECTS */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </Router>
  );
}
