// Import Link and useNavigate for navigation
import { Link, useNavigate } from "react-router-dom";

// Navbar component for top navigation
function Navbar() {
  const navigate = useNavigate(); // For navigation

  // Handle user logout
  function handleLogout() {
    localStorage.removeItem("username");
    navigate("/login");
  }

  // Render navigation bar
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary px-3">
      <Link className="navbar-brand" to="/devices">BLE Dashboard</Link>
      <div className="collapse navbar-collapse">
        <ul className="navbar-nav me-auto">
          <li className="nav-item">
            <Link className="nav-link" to="/devices">Live Devices</Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="/admin">Admin Panel</Link>
          </li>
        </ul>
        <button className="btn btn-outline-light" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}

export default Navbar;
