import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("username");
    navigate("/login");
  };

  return (
    <nav
      className="navbar navbar-expand-lg"
      style={{
        background: '#fff',
        color: '#5a5c69',
        borderBottom: '1px solid #e3e6f0',
        padding: '0 32px',
        minHeight: '72px',
        boxShadow: '0 2px 8px #0001',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Link className="navbar-brand" to="/devices" style={{ color: '#4e73df', fontWeight: 700, fontSize: '1.35rem' }}>BLE Dashboard</Link>

      <div className="collapse navbar-collapse">
        <ul className="navbar-nav me-auto">
          <li className="nav-item">
            <Link className="nav-link" to="/devices">Live Devices</Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="/admin">ESP Mapping</Link>
          </li>
        </ul>
        <button className="btn" style={{ background: '#f6c23e', color: '#fff', fontWeight: 600 }} onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}
