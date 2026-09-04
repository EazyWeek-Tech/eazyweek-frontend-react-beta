import { API_BASE_URL } from "../../config";

/* ---- endpoints ---- */
export const ENDPOINTS = {
  vendorList: "/api/SupplyChain/Vendor/List",
  vendorGet: (code) => `/api/SupplyChain/Vendor/${encodeURIComponent(code)}`,
  vendorCreate: "/api/SupplyChain/Vendor/Create",
  vendorUpdate: (code) => `/api/SupplyChain/Vendor/${encodeURIComponent(code)}`,
  groupList: "/api/SupplyChain/VendorGroup/List",
  groupSave: "/api/SupplyChain/VendorGroup/Save",
  groupStatus: "/api/SupplyChain/VendorGroup/Status",
  codeConfigGet: "/api/Settings/LegalEntity/VendorCodeConfig",
  codeConfigSave: "/api/Settings/LegalEntity/VendorCodeConfig",
  countries: "/api/Master/GetCountries",
  currencies: "/api/Master/GetCurrencies",
};

const token = () => localStorage.getItem("token") || "";

const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token()}`,
});

async function parse(res) {
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`HTTP ${res.status} — unexpected response from server`);
  }
  if (!res.ok || (body && body.success === false)) {
    throw new Error((body && body.message) || `HTTP ${res.status}`);
  }
  return body && Object.prototype.hasOwnProperty.call(body, "data")
    ? body.data
    : body;
}

export async function apiGet(path, params) {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
  const res = await fetch(`${API_BASE_URL}${path}${qs}`, {
    method: "GET",
    headers: headers(),
  });
  return parse(res);
}

export async function apiPost(path, payload) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload || {}),
  });
  return parse(res);
}

export async function apiPut(path, payload) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(payload || {}),
  });
  return parse(res);
}

/* ---- vendor ---- */
export const listVendors = (params) => apiGet(ENDPOINTS.vendorList, params);
export const getVendor = (code) => apiGet(ENDPOINTS.vendorGet(code));
export const createVendor = (payload) => apiPost(ENDPOINTS.vendorCreate, payload);
export const updateVendor = (code, payload) =>
  apiPut(ENDPOINTS.vendorUpdate(code), payload);

/* ---- vendor group ---- */
export const listVendorGroups = (params) => apiGet(ENDPOINTS.groupList, params);
export const saveVendorGroup = (payload) => apiPost(ENDPOINTS.groupSave, payload);
export const setVendorGroupStatus = (groupCode, status) =>
  apiPost(ENDPOINTS.groupStatus, { groupCode, status });

/* ---- vendor code configuration ---- */
export const getVendorCodeConfig = () => apiGet(ENDPOINTS.codeConfigGet);
export const saveVendorCodeConfig = (payload) =>
  apiPost(ENDPOINTS.codeConfigSave, payload);

/* ---- masters ---- */
export const getCountries = () => apiGet(ENDPOINTS.countries);
export const getCurrencies = () => apiGet(ENDPOINTS.currencies);