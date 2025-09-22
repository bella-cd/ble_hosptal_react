import React, { useState } from "react";
import axios from "axios";
import "./LoginSignupForm.css";

function LoginSignupForm() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    const route = mode === "signup" ? "/api/signup" : "/api/login";
    axios.post(route, { username: email, password })
      .then(res => {
        if (mode === "login" && res.data.status === "ok") {
          localStorage.setItem("username", email);
          window.location.href = "/devices";
        } else if (mode === "signup" && res.data.status === "ok") {
          setMsg("Signup successful! Please login.");
          setMode("login");
        } else {
          setMsg(res.data.error || "Error");
        }
      })
      .catch(err => setMsg(err.response?.data?.error || "Request failed"));
  }

  return (
    <div className="form-bg">
      <div className="center-card">
        {/* Removed tab switcher for a cleaner look */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2 style={{ fontSize: "2.1rem", fontWeight: 400, letterSpacing: "1px", marginBottom: "24px" }}>
            {mode === "login" ? "ADMIN LOGIN" : "ADMIN SIGNUP"}
          </h2>
          {msg && <div className="msg">{msg}</div>}
          <div className="input-group">
            <input
              className="form-input"
              type="text"
              placeholder="Username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <span className="input-icon"><i className="fa fa-user" /></span>
          </div>
          <div className="input-group">
            <input
              className="form-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <span className="input-icon"><i className="fa fa-lock" /></span>
          </div>
          {mode === "login" && <a href="#" className="forgot-link">Lost Password?</a>}
          <button className="main-btn" type="submit" style={{ marginTop: "18px", fontSize: "1.15rem", borderRadius: "8px" }}>
            {mode === "login" ? "Login" : "Signup"}
          </button>
        </form>
        <div className="switch-link">
          {mode === "login"
            ? <>Create an account <span className="link-btn" onClick={() => setMode("signup")}>Signup now</span></>
            : <>Already have an account? <span className="link-btn" onClick={() => setMode("login")}>Log in</span></>
          }
        </div>
      </div>
    </div>
  );
}

export default LoginSignupForm;
