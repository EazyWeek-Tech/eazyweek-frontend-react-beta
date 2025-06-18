import React, { useState, useEffect } from "react";
import App from "./App";
import Login from "./components/Login";

const Main2 = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("user");
    if (saved) setUser(JSON.parse(saved));
  }, []);

  return user ? (
    <App user={user} />
  ) : (
    <Login onLoginSuccess={(userData) => setUser(userData)} />
  );
};

export default Main2;
