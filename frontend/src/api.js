// Small helper for calling the Django API.
// All requests go to /api/... which Vite forwards to the backend in development.

const TOKEN_KEY = "berryloop_token";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function extractMessage(data) {
  if (data && typeof data.detail === "string") return data.detail;
  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue) && firstValue.length > 0) return String(firstValue[0]);
    if (typeof firstValue === "string") return firstValue;
  }
  return "Something went wrong. Please try again.";
}

export async function apiRequest(path, { method = "GET", body } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const token = getToken();
  if (token) headers.Authorization = `Token ${token}`;

  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Cannot reach the server. Is the Django backend running?", 0);
  }

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new ApiError(extractMessage(data), response.status);
    error.data = data; // Field-level errors, e.g. { password: ["Too short"] }
    throw error;
  }
  return data;
}
