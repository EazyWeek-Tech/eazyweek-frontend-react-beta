// src/auth/sso.js

// Read token from URL (?token=...) and move it into sessionStorage
export function bootstrapAuthFromUrl() {
  try {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const token = params.get("token");

    if (token) {
      // Save token for this browser tab
      sessionStorage.setItem("authToken", token);

      // Optional: decode payload just for debugging
      // console.log("SSO Token:", token);

      // Clean the URL (remove the token from query string)
      params.delete("token");
      const cleanUrl = url.origin + url.pathname + (params.toString() ? "?" + params.toString() : "") + url.hash;
      window.history.replaceState({}, "", cleanUrl);
    }
  } catch (err) {
    console.error("Error bootstrapping SSO token:", err);
  }
}

export function getAuthToken() {
  return sessionStorage.getItem("authToken");
}

export function isLoggedIn() {
  return !!getAuthToken();
}

// simple logout helper if you ever need it
export function logout() {
  sessionStorage.removeItem("authToken");
  // window.location.href = "/login"; // or whatever your login route is
}
