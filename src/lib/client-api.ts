export async function getOrFetchCsrf(): Promise<string> {
  if (typeof window === "undefined") return "";

  let token = document.cookie
    .split("; ")
    .find((row) => row.startsWith("darex_csrf="))
    ?.split("=")[1];

  if (!token) {
    try {
      const res = await fetch("/api/security/csrf");
      if (res.ok) {
        const data = await res.json();
        token = data.csrfToken;
      }
    } catch (e) {
      console.error("Failed to fetch CSRF token", e);
    }
  }

  return token ? decodeURIComponent(token) : "";
}

export async function clientFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const csrfToken = await getOrFetchCsrf();
  const res = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json() as Promise<T>;
}
