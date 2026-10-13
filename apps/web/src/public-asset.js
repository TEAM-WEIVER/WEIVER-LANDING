// Keep public images under the landing namespace alongside Vite's built assets.
export function publicAsset(filename) {
  return `${import.meta.env.BASE_URL}${filename.replace(/^\/+/, '')}`;
}
