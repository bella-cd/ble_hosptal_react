import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Devices from "./components/Devices";
import AdminPanel from "./components/AdminPanel";
import LoginSignupForm from "./components/LoginSignupForm";
import RequireAuth from "./components/RequireAuth";

function DashboardLayout() {
  return (
    <>
      <Sidebar />
      <div style={{ marginLeft: 220, background: "#f6f8f9", minHeight: "100vh" }}>
        <Navbar />
        <div style={{ padding: 30 }}>
          <Routes>
            <Route path="/devices" element={
              <RequireAuth><Devices /></RequireAuth>
            } />
            <Route path="/admin" element={
              <RequireAuth><AdminPanel /></RequireAuth>
            } />
            <Route path="*" element={<Navigate to="/devices" />} />
          </Routes>
        </div>
      </div>
    </>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginSignupForm />} />
        <Route path="/signup" element={<LoginSignupForm />} />
        <Route path="/*" element={<DashboardLayout />} />
      </Routes>
    </Router>
  );
}

export default App;
