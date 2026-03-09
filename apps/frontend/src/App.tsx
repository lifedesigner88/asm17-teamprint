import { Link, Outlet } from "react-router-dom";

export function App() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>PersonaMirror</h1>
      <nav style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <Link to="/">Home</Link>
        <Link to="/capture">Capture</Link>
      </nav>
      <Outlet />
    </main>
  );
}

export function HomePage() {
  return <p>Phase 0 frontend scaffold is ready.</p>;
}

export function CapturePage() {
  return <p>Camera/Mic capture UI will be implemented in Phase 1.</p>;
}

