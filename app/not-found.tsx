import type { Metadata } from "next";

import TempDown from "@/components/TempDown";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you asked for does not exist on SRHXtra.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return <TempDown />;
}
