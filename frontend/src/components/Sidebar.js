import { Link, useLocation } from "react-router-dom";

const sidebarStyle = {
  width: "220px",
  minHeight: "100vh",
  background: "#4e73df", // SB Admin blue
  color: "#fff",
  position: "fixed",
  left: 0,
  top: 0,
  paddingTop: "25px",
};

const activeStyle = {
  background: "#f8f9fc", // SB Admin card bg
  color: "#4e73df", // SB Admin blue text
  fontWeight: "bold",
  borderRadius: "6px 0 0 6px"
};

const linkStyle = {
  display: "flex",
  gap: "10px",
  alignItems: "center",
  color: "#fff",
  padding: "15px 25px",
  textDecoration: "none",
  marginBottom: "4px",
  borderLeft: "4px solid transparent",
  fontWeight: 500,
  borderRadius: "6px 0 0 6px"
};

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside style={sidebarStyle}>
      <div style={{
        fontWeight: 700,
        fontSize: "1.3rem",
        padding: "0 25px 15px",
        letterSpacing: ".5px",
        color: "#fff"
      }}>
        <span style={{ color: "#36b9cc" }}>BLE</span> Dashboard
      </div>
      <nav>
        <Link
          to="/devices"
          style={{
            ...linkStyle,
            ...(location.pathname === "/devices" ? activeStyle : {}),
          }}
        >
          <span role="img" aria-label="devices">📡</span> Live Devices
        </Link>
        <Link
          to="/admin"
          style={{
            ...linkStyle,
            ...(location.pathname === "/admin" ? activeStyle : {}),
          }}
        >
          <span role="img" aria-label="admin">⚙️</span> ESP Mapping
        </Link>
      </nav>
    </aside>
  );
}
