import { avatarColors, initials } from "@/lib/format";

/** Initials avatar with deterministic soft colors per person. */
export default function Avatar({
  name,
  size = 30,
}: {
  name: string | null | undefined;
  size?: number;
}) {
  const colors = avatarColors(name);
  return (
    <span
      className="avatar"
      style={{
        background: colors.bg,
        color: colors.ink,
        width: size,
        height: size,
        fontSize: size <= 30 ? 11 : 12.5,
      }}
      title={name ?? undefined}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
