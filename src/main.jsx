import React from "react";
import ReactDOM from "react-dom/client";
import Router from "./Router";
import SplashScreen from "./SplashScreen";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SplashScreen />
    <Router />
  </React.StrictMode>,
);
