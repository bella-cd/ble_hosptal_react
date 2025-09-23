import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DashboardLayout from "./components/DashboardLayout";
import LoginSignupForm from "./components/LoginSignupForm";

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
