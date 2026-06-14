import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../../config";

const TOKEN = () => localStorage.getItem("token");

const authFetch = async (url) => {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN()}` },
  });
  if (!response.ok) throw new Error(`Fetch failed: ${url}`);
  const json = await response.json();
  return json.data ?? json;
};

const getCenterCode = () => {
  try {
    const stored = localStorage.getItem("user") || sessionStorage.getItem("user");
    return stored ? JSON.parse(stored).centerCode : "";
  } catch { return ""; }
};

const truncate = (str = "", max = 35) =>
  str.length > max ? str.slice(0, max) + "…" : str;

const CategoryTabs = ({ onAddItem, showToast, showErrToast, customer }) => {
  const CATEGORIES = [
    { id: "CC04",  label: "Antiageing Services", icon: "images/antiage.svg" },
    { id: "CC048", label: "Volume filling",      icon: "images/filling.svg" },
    { id: "CC07",  label: "Consultation",        icon: "images/consult.svg" },
    { id: "CC030", label: "Hair Reduction",      icon: "images/hair.svg"    },
  ];

  const [services,    setServices]    = useState([]);
  const [activeTab,   setActiveTab]   = useState("services");
  const [activeCat,   setActiveCat]   = useState(CATEGORIES[0].id);
  const [searchTerm,  setSearchTerm]  = useState("");
  const [svcLoading,  setSvcLoading]  = useState(false);
  const [allPackages, setAllPackages] = useState([]);
  const [pkgLoading,  setPkgLoading]  = useState(false);

  // ── Load Quick Cart packages once on mount ────────────────────────────────
  useEffect(() => {
    (async () => {
      setPkgLoading(true);
      try {
        const u   = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
        const res = await fetch(
          `${API_BASE_URL}/api/Package/List?status=Active&centerCode=${encodeURIComponent(u.centerCode || "")}`,
          { headers: { Authorization: `Bearer ${TOKEN()}` } }
        );
        const json = await res.json();
        const data = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        setAllPackages(data.filter(p => p.ADDTOQUICKCART && p.RELEASEDTOCENTRE));
      } catch { setAllPackages([]); }
      finally { setPkgLoading(false); }
    })();
  }, []);

  // ── Load services when category changes ──────────────────────────────────
  useEffect(() => {
    if (activeTab !== "services") return;
    (async () => {
      try {
        setSvcLoading(true);
        setServices([]);
        const centerCode = getCenterCode();
        const data = await authFetch(
          `${API_BASE_URL}/api/Master/GetServiceByCategory/${encodeURIComponent(activeCat)}/${encodeURIComponent(centerCode)}`
        );
        setServices(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load services:", e);
        setServices([]);
      } finally {
        setSvcLoading(false);
      }
    })();
  }, [activeCat, activeTab]);

  // ── Filter packages by active category ───────────────────────────────────
  const filteredPackages = allPackages.filter(p => {
    const matchesCat    = p.CATEGORYCODE === activeCat;
    const matchesSearch = !searchTerm || (p.PACKAGENAME || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // ── Add service to cart ───────────────────────────────────────────────────
  const handleAddService = (item) => {
    const cid = customer?.custid || customer?.custId || customer?.custID || customer?.id || "";
    if (!cid) { showErrToast?.("Please select a customer before adding a service."); return; }
    onAddItem?.({
      name:       item.serviceName,
      code:       item.serviceCode,
      type:       "service",
      price:      parseFloat(item.price) || 0,
      discount:   0,
      taxpercent: item.taxPercent ?? "0.00",
      citizentax: item.taxPercent ?? "0.00",
    });
    showToast?.(`${truncate(item.serviceName)} added`);
  };

  // ── Add package to cart ───────────────────────────────────────────────────
  const handleAddPackage = (pkg) => {
    const cid = customer?.custid || customer?.custId || customer?.id || "";
    if (!cid) { showErrToast?.("Please select a customer before adding a package."); return; }
    onAddItem?.({
      name:        pkg.PACKAGENAME,
      code:        pkg.PACKAGECODE,
      servicecode: pkg.PACKAGECODE,
      type:        "package",
      itemType:    "package",
      price:       parseFloat(pkg.SELLINGPRICE) || 0,
      discount:    0,
      taxpercent:  parseFloat(pkg.TAXPERCENT)   || 0,
      citizentax:  parseFloat(pkg.TAXPERCENT)   || 0,
      taxincluded: pkg.TAXINCLUDED || "No",
    });
    showToast?.(`${truncate(pkg.PACKAGENAME)} added`);
  };

  const filteredServices = services.filter(s =>
    (s.serviceName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="srvlistdiv">
      <h3 className="sectttl">Categories</h3>

      <div className="pymntmode">
        {/* Left — category tabs */}
        <div className="pymttabswrp">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className={`pymnttab ${activeCat === cat.id ? "activetab" : ""}`}
              onClick={() => { setActiveCat(cat.id); setSearchTerm(""); }}
            >
              <img src={cat.icon} alt={cat.label}
                onError={e => { e.target.style.display = "none"; }} />
              <span className="pymttxt">{cat.label}</span>
            </div>
          ))}
        </div>

        {/* Right — content panel */}
        <div className="tabwrpdiv">
          {/* Services / Packages toggle */}
          <div className="horizontal-tabs">
            <button
              className={`maintab ${activeTab === "services" ? "active" : ""}`}
              onClick={() => setActiveTab("services")}
            >Services</button>
            <button
              className={`maintab ${activeTab === "packages" ? "active" : ""}`}
              onClick={() => setActiveTab("packages")}
            >Packages</button>
          </div>

          <div className="subtabs">
            {/* Search */}
            <div className="servhead" style={{ margin: "10px 0" }}>
              <input
                type="text"
                placeholder={`Search ${activeTab}…`}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ padding: "6px 10px", width: "100%", borderRadius: "6px", border: "1px solid #ccc" }}
              />
            </div>

            {/* Services list */}
            {activeTab === "services" && (
              <div className="ctlistwrp">
                {svcLoading ? (
                  <div className="notext">Loading…</div>
                ) : filteredServices.length === 0 ? (
                  <div className="notext">No services found</div>
                ) : (
                  filteredServices.map((item, idx) => (
                    <div className="ctflx" key={idx} onClick={() => handleAddService(item)}>
                      <div className="ctlft ctcell" title={item.serviceName}>
                        {truncate(item.serviceName)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Packages list */}
            {activeTab === "packages" && (
              <div className="ctlistwrp">
                {pkgLoading ? (
                  <div className="notext">Loading packages…</div>
                ) : filteredPackages.length === 0 ? (
                  <div className="notext">
                    No packages in this category.
                    <br />
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>
                      Packages must be in Quick Cart and released to this centre.
                    </span>
                  </div>
                ) : (
                  filteredPackages.map((pkg, idx) => (
                    <div className="ctflx" key={idx} onClick={() => handleAddPackage(pkg)}>
                      <div className="ctlft ctcell" title={pkg.PACKAGENAME}>
                        {truncate(pkg.PACKAGENAME)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryTabs;