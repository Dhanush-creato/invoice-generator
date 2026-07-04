import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { LayoutDashboard, PlusCircle, Tag, Settings, LogOut, Receipt, X, Menu } from "lucide-react";

export default function Sidebar({ userProfile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const menuItems = [
    { name: "Dashboard", path: "/", icon: <LayoutDashboard size={20} /> },
    { name: "Create Invoice", path: "/invoices/new", icon: <PlusCircle size={20} /> },
    { name: "Manage Items", path: "/items", icon: <Tag size={20} /> },
    { name: "Org Profile Settings", path: "/settings", icon: <Settings size={20} /> },
  ];

  const orgName = userProfile?.name || "Icon Systems";

  return (
    <>
      {/* ─── Mobile Hamburger Toggle Button ─── */}
      <button
        className={`sidebar-hamburger no-print${mobileOpen ? " sidebar-hamburger--hidden" : ""}`}
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        style={{
          display: "none", // base: hidden; shown via CSS .sidebar-hamburger on mobile when not open
          position: "fixed",
          top: "14px",
          left: "14px",
          zIndex: 200,
          background: "var(--accent-color)",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          width: "38px",
          height: "38px",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          cursor: "pointer",
        }}
      >
        <Menu size={20} />
      </button>

      {/* ─── Dark overlay backdrop ─── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 149,
            backgroundColor: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* ─── Sidebar panel ─── */}
      <aside
        className={`glass sidebar-panel no-print ${mobileOpen ? "sidebar-open" : ""}`}
        style={{
          width: "var(--sidebar-width)",
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 150,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid var(--card-border)",
          borderRadius: 0,
          background: "var(--bg-secondary)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Brand logo header */}
        <div style={{
          padding: "20px 20px 20px 24px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          borderBottom: "1px solid var(--border-color)",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img
              src="/logo.png"
              alt="Logo"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                objectFit: "contain",
                flexShrink: 0,
              }}
            />
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: "700", letterSpacing: "0.5px" }}>InvoiceGen</h2>
              <span style={{ fontSize: "10px", color: "var(--text-secondary)", fontWeight: "600" }}>ORGANIZATION SUITE</span>
            </div>
          </div>

          {/* Close button — only visible on mobile */}
          <button
            className="sidebar-close-btn"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            style={{
              display: "none", // shown via CSS on mobile
              background: "rgba(255,255,255,0.07)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              color: "var(--text-secondary)",
              width: "32px",
              height: "32px",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav style={{
          flexGrow: 1,
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          overflowY: "auto",
        }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  backgroundColor: isActive ? "var(--accent-glow)" : "transparent",
                  borderLeft: isActive ? "3px solid var(--accent-color)" : "3px solid transparent",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: isActive ? "600" : "500",
                  fontSize: "14px",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.03)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {item.icon}
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Organization / User Profile Footer */}
        <div style={{
          padding: "20px 16px",
          borderTop: "1px solid var(--border-color)",
          backgroundColor: "rgba(0, 0, 0, 0.1)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            {userProfile?.logo_url ? (
              <img src={userProfile.logo_url} alt="Org" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: "var(--border-color)",
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "12px",
                flexShrink: 0,
              }}>{orgName.charAt(0)}</div>
            )}
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <h4 style={{ fontSize: "13px", fontWeight: "600" }}>{orgName}</h4>
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Active Org</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: "10px",
              borderRadius: "8px",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              color: "var(--danger-color)",
              fontWeight: "600",
              fontSize: "13px",
              border: "1px solid rgba(239, 68, 68, 0.1)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.15)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)"; }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
