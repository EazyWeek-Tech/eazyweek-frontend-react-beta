// src/auth/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { isLoggedIn } from "./sso";

const ProtectedRoute = ({ children }) => {
  if (!isLoggedIn()) {
    // user is not logged in via SSO – send to login or a message page
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
