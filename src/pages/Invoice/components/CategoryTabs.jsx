import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../../config";

const createDataHandler = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch failed from ${url}`);
  return await response.json();
};

const CATEGORY_API = `${API_BASE_URL}/api/Master/LoadAllCategory`;

const CategoryTabs = ({ onAddItem, showToast, showErrToast, customer }) => {
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [activeMainTab, setActiveMainTab] = useState("services");
  const [activeSubTab, setActiveSubTab] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const getCenterCode = () => {
    const stored =localStorage.getItem("user") || sessionStorage.getItem("user");
    return stored ? JSON.parse(stored).centerCode : "";
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await createDataHandler(CATEGORY_API);
        if (Array.isArray(data)) {
          const mapped = data
            .filter((c) => c.ccode && c.cName)
            .map((c) => ({
              id: c.ccode,
              label: c.cName,
              icon: getCategoryIcon(c.cName),
            }));
          setCategories(mapped);
          if (mapped.length > 0) setActiveSubTab(mapped[0].id);
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const loadServices = async () => {
      if (!activeSubTab || activeMainTab !== "services") return;
      try {
        const centerCode = getCenterCode();
        const url = `${API_BASE_URL}/api/Master/GetServiceByCategory/${activeSubTab}/${centerCode}`;
        const data = await createDataHandler(url);
        if (Array.isArray(data)) setServices(data);
        else setServices([]);
      } catch (error) {
        console.error("Failed to load services:", error);
        setServices([]);
      }
    };
    loadServices();
  }, [activeSubTab, activeMainTab]);
const truncateName = (name, maxLength = 35) => {
  return name.length > maxLength ? name.slice(0, maxLength) + '...' : name;
};

  const getCategoryIcon = (label) => {
    const lower = label?.toLowerCase() || "";
    if (lower.includes("consult")) return "images/consult.svg";
    if (lower.includes("volume")) return "images/filling.svg";
    if (lower.includes("hair")) return "images/hair.svg";
    if (lower.includes("anti")) return "images/antiage.svg";
    return "images/default.svg";
  };
const getCustomerId = (c) =>
  c?.custid || c?.custId || c?.custID || c?.id || c?.customerId || "";
 const handleAddService = (item) => {
  const cid = getCustomerId(customer);
  if (!cid) {
    showErrToast?.("Please select a customer before adding a service.");
    return;
  }

  onAddItem?.({
    name: item.serviceName,
    price: parseFloat(item.price) || 0,
    discount: 0,
    taxpercent: item.taxPercent ?? "0.00",
    citizentax: item.taxPercent ?? "0.00",
    servicecode: item.serviceCode
  });

  showToast?.("Service added to invoice");
};



  const filteredServices = services.filter((svc) =>
    svc.serviceName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="srvlistdiv">
      <h3 className="sectttl">Categories</h3>

      <div className="pymntmode">
        <div className="pymttabswrp">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`pymnttab ${activeSubTab === cat.id ? "activetab" : ""}`}
              onClick={() => setActiveSubTab(cat.id)}
            >
              <img src={cat.icon} alt={cat.label} />
              <span className="pymttxt">{cat.label}</span>
            </div>
          ))}
        </div>

        <div className="tabwrpdiv">
          <div className="horizontal-tabs">
            <button
              className={`maintab ${activeMainTab === "services" ? "active" : ""}`}
              onClick={() => setActiveMainTab("services")}
            >
              Services
            </button>
            <button
              className={`maintab ${activeMainTab === "packages" ? "active" : ""}`}
              onClick={() => setActiveMainTab("packages")}
            >
              Packages
            </button>
          </div>

          <div className="subtabs">
            <div className="servhead" style={{ margin: "10px 0" }}>
              <input
                type="text"
                placeholder={`Search ${activeMainTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: "6px 10px",
                  width: "100%",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                }}
              />
            </div>

            {activeMainTab === "services" ? (
              <div className="ctlistwrp">
                {filteredServices.map((item, idx) => (
                  <div
                    className="ctflx"
                    key={idx}
                    onClick={() => handleAddService(item)}
                  >
                    <div className="ctlft ctcell" title={item.serviceName}>
                      {truncateName(item.serviceName)}
                    </div>
                  </div>
                ))}
                {filteredServices.length === 0 && <div className="notext">No services found</div>}
              </div>
            ) : (
              <div className="ctlistwrp">
                <div className="notext">Package tab not yet implemented</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryTabs;
