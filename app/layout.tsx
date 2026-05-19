import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ethos One — Company OS",
  description: "Company OS — 6 Pillar Status",
  icons: { icon: "/ethos-symbol.png" },
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
