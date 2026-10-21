/** Primary destinations, shared by the header nav, mobile menu, and footer. */
export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/news", label: "News" },
  { href: "/squad", label: "Squad" },
  { href: "/matches", label: "Matches" },
];

/** True when `href` is the section the current pathname lives in. */
export function isActiveHref(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
