import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SRH News — Public Site",
  description: "SRH public website foundation (Step 1).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>{children}</body>
    </html>
  );
}
