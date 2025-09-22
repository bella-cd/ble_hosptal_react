// Import React, axios, and CSS
import React, { useState } from "react";
import axios from "axios";
import "./LoginSignupForm.css";

// LoginSignupForm handles login and signup forms
function LoginSignupForm() {
  const [mode, setMode] = useState("login"); // Track form mode
  const [email, setEmail] = useState(""); // User email
  const [password, setPassword] = useState(""); // User password
  const [msg, setMsg] = useState(""); // Message to show

  // Handle form submit for login/signup
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

  // Render login/signup form UI
  return (
    <div className="form-bg">
      <div className="center-card">
        <div className="tabs">
          <button
            className={mode === "login" ? "tab active" : "tab"}
            onClick={() => setMode("login")}
          >Login</button>
          <button
            className={mode === "signup" ? "tab active" : "tab"}
            onClick={() => setMode("signup")}
          >Signup</button>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>{mode === "login" ? "Admin Login" : "Signup"}</h2>
          {msg && <div className="msg">{msg}</div>}
          <input
            className="form-input"
            type="text"
            placeholder="Email Address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="form-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {mode === "login" && <a href="#" className="forgot-link">Forgot password?</a>}
          <button className="main-btn" type="submit">
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
