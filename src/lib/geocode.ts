export interface Coords {
  lat: number;
  lng: number;
}

export async function geocode(
  address: string,
  city: string
): Promise<Coords | null> {
  const q = encodeURIComponent(`${address}, ${city}, France`);
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "BIS-Invest/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}
