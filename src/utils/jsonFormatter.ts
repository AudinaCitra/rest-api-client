/** Format JSON jika valid; jika bukan JSON, kembalikan teks asli. */
export function formatBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}
