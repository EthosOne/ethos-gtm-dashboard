"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{
      background: "#E3E1E8", minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "2rem 1.5rem",
    }}>
      <div style={{ textAlign: "center" }}>
        <img src="/ethos-wordmark.png" alt="Ethos One"
          style={{ height: 28, marginBottom: 32, display: "block", marginLeft: "auto", marginRight: "auto" }} />
        <div style={{ fontSize: "4rem", fontWeight: 800, color: "#363541", letterSpacing: "-0.04em", lineHeight: 1 }}>
          404
        </div>
        <p style={{ color: "#4A4858", fontSize: "0.9rem", margin: "12px 0 28px" }}>
          This page doesn&apos;t exist.
        </p>
        <Link href="/" style={{
          background: "#363541", color: "#E3E1E8", textDecoration: "none",
          borderRadius: 999, padding: "8px 20px", fontSize: "0.78rem",
          fontWeight: 600, letterSpacing: "0.04em",
        }}>
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}
