export function assetUrl(path: string) {
  if (/^https?:\/\//.test(path) || path.startsWith("mailto:")) return path;

  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
