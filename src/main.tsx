import { createRoot } from "react-dom/client";
import App from "./App.tsx";

// Self-hosted fonts (faster than Google Fonts CDN)
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@fontsource/poppins/800.css';

import "./index.css";
import { consumeHandoffFromUrl } from "@/lib/productTesting/qaSessionHandoff";
import { installNetworkLogger } from "@/lib/productTesting/networkLog";

// Install the network ring buffer ASAP so it captures early app requests.
installNetworkLogger();

// Auto-recover from stale chunk references after a redeploy. When the
// cached index bundle points at a chunk hash that no longer exists, the
// dynamic import throws. Reload once (using a session flag to avoid loops)
// so the browser fetches the current index.html + chunk graph.
const CHUNK_RELOAD_KEY = "__chunk_reload_attempted__";
function isChunkLoadError(msg: string) {
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error loading dynamically imported module")
  );
}
function maybeReload(msg: string) {
  if (!isChunkLoadError(msg)) return;
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  window.location.reload();
}
window.addEventListener("error", (e) => maybeReload(String(e?.message || "")));
window.addEventListener("unhandledrejection", (e) =>
  maybeReload(String((e as PromiseRejectionEvent)?.reason?.message || (e as PromiseRejectionEvent)?.reason || ""))
);
// Clear the guard once the app successfully boots.
window.addEventListener("load", () => sessionStorage.removeItem(CHUNK_RELOAD_KEY));

// If the URL contains a QA session handoff token (#qa_session=...), restore
// it into the Supabase client BEFORE React mounts so AuthContext picks up the
// hydrated session on its first read.
consumeHandoffFromUrl().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
