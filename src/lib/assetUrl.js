/** 将 public 或数据路径解析为含 Vite base 的 URL（如 GitHub Pages 的 /bible/） */
export function assetUrl(path) {
  if (!path) return import.meta.env.BASE_URL
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const relative = path.replace(/^\//, '')
  return `${import.meta.env.BASE_URL}${relative}`.replace(/\/+/g, '/')
}

export function dataUrl(path) {
  return assetUrl(path).replace(/\/$/, '') || '/'
}
