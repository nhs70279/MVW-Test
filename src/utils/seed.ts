// SHA-512 → 先頭32byte (256bit)
export async function seedFromPassphrase(pass: string): Promise<Uint8Array> {
    const norm = pass.trim().toLowerCase();
    const buf  = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(norm));
    return new Uint8Array(buf).slice(0, 32);
  }
  