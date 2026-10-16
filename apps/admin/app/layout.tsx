import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SRH News — Admin",
  description: "SRH admin dashboard foundation (Step 1).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>{children}</body>
    </html>
  );
}
