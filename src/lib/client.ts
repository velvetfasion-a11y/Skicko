export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  })
  const data = (await response.json().catch(() => ({}))) as { error?: string }
  if (!response.ok) throw new Error(data.error || "Request failed")
  return data as T
}
