import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
// import App from './App.jsx'
import Main2 from "./Main2";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Main2 />
  </StrictMode>
);
