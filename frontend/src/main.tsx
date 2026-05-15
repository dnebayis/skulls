import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const PrivyRoot = lazy(() => import("./PrivyRoot").then(module => ({ default: module.PrivyRoot })));

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <Suspense fallback={<div className="layout"><div className="tab-empty"><p className="tab-empty-text">Loading...</p></div></div>}>
      <PrivyRoot />
    </Suspense>
  </StrictMode>
);
