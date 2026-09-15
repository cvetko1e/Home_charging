export function formatDateTime(value?: string) {
  if (!value) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Belgrade",
  }).format(new Date(value));
}
