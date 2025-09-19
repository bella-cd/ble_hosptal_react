import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("username");
    navigate("/login");
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary px-3">
      <Link className="navbar-brand" to="/devices">BLE Dashboard</Link>

      <div className="collapse navbar-collapse">
        <ul className="navbar-nav me-auto">
          <li className="nav-item">
            <Link className="nav-link" to="/devices">Live Devices</Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="/admin">ESP Mapping</Link>
          </li>
        </ul>
        <button className="btn btn-outline-light" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}
