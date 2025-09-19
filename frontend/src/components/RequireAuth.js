// RequireAuth protects routes from unauthenticated access
import { Navigate } from "react-router-dom";

export default function RequireAuth({ children }) {
  const username = localStorage.getItem("username"); // Get username
  if (!username) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }
  // Render children if authenticated
  return children;
}
