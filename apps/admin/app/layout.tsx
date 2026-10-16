import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import Shell from "@/components/Shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "SRH News — Admin",
  description: "SRH editorial dashboard: drafts, review, and publishing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Shell>{children}</Shell>
        </AuthProvider>
      </body>
    </html>
  );
}
