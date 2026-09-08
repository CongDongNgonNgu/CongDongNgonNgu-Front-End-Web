import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import { App } from "./App";
import "./styles/global.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element was not found");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
