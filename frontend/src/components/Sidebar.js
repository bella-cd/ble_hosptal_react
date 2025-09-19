// Sidebar component for navigation
import { Link, useLocation } from "react-router-dom";

// Sidebar container styles
const sidebarStyle = {
  width: "220px",
  minHeight: "100vh",
  background: "#173b51",
  color: "#fff",
  position: "fixed",
  left: 0,
  top: 0,
};

// Style for active navigation link
const activeStyle = {
  background: "#10639c",
  color: "#fff",
  fontWeight: "bold",
};

function Sidebar() {
  const location = useLocation(); // Get current route
  return (
    <aside style={sidebarStyle}>
      {/* Sidebar header */}
      <div style={{fontWeight: 700, fontSize: "1.3rem", padding: "28px 25px 15px", letterSpacing: ".5px"}}>
        <span style={{color: "#ffc200"}}>BLE</span> Dashboard
      </div>
      {/* Navigation links */}
      <nav style={{marginTop: 25}}>
        <ul style={{listStyle: "none", padding: 0}}>
          <li>
            {/* Link to live devices page */}
            <Link to="/devices" style={{ ...linkStyle, ...(location.pathname === "/devices" ? activeStyle : {}) }}>
              📡 Live Devices
            </Link>
          </li>
          <li>
            {/* Link to admin panel */}
            <Link to="/admin" style={{ ...linkStyle, ...(location.pathname === "/admin" ? activeStyle : {}) }}>
              ⚙️ ESP Mapping
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

// Style for navigation links
const linkStyle = {
  display: "block",
  color: "#fff",
  padding: "18px 25px",
  textDecoration: "none",
  margin: "0 0 1px 0",
  borderLeft: "4px solid transparent"
};

export default Sidebar;
