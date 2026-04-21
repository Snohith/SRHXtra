export function compareDatesDesc(left: string, right: string) {
  return new Date(right).getTime() - new Date(left).getTime();
}

export function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

