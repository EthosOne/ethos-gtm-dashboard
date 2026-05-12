import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ethos One — GTM Dashboard",
  description: "Grand Workflow — 6 Pillar Status",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f9fafb", minHeight: "100vh" }}>
        {children}
      </body>
    </html>
  );
}
