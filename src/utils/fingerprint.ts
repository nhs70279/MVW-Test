export async function calcFP(pass: string) {
    const norm = pass.trim().toLowerCase();
    const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(norm));
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }
  