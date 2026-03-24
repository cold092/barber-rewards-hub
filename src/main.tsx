import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    const registration = await navigator.serviceWorker.register("/sw.js");
    registration.update();

    let hasRefreshed = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hasRefreshed) return;
      hasRefreshed = true;
      window.location.reload();
    });
  });
}
