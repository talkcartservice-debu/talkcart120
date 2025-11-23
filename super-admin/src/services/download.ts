import { fetchWithAuth } from './auth';

export async function downloadCsvWithAuth(url: string, filename: string) {
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    // Try to parse the error response
    try {
      const errorData = await res.json();
      throw new Error(errorData.message || `Failed to download: ${res.status} ${res.statusText}`);
    } catch (e) {
      // If we can't parse the JSON, throw a generic error
      throw new Error(`Failed to download: ${res.status} ${res.statusText}`);
    }
  }
  const blob = await res.blob();
  const link = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}