export function toUrlSearchParams(
  searchParams?: Record<string, string | string[] | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry));
    } else if (value !== undefined) {
      params.set(key, value);
    }
  }

  return params;
}

export function createPageHref(query: URLSearchParams, page: number) {
  const params = new URLSearchParams(query);
  params.set("page", String(page));

  return `/admin/dashboard?${params.toString()}`;
}
