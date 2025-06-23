import React, { useState, useEffect } from 'react';

const createDataHandler = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch from ${url}`);
  }
  return await response.json();
};

const CATEGORY_API = 'https://mocki.io/v1/c66a9494-8044-46d6-8cd6-9295e367ac1b';
const SERVICE_API = 'https://mocki.io/v1/a1e7901c-1fd0-4e47-8954-c1d9e5899c90';
const PACKAGE_API = 'https://mocki.io/v1/75459841-da63-456c-9a16-59a57c74197c';

const CategoryTabs = ({ onAddItem, showToast, showErrToast, customer }) => {
  const [activeMainTab, setActiveMainTab] = useState('services');
  const [activeSubTab, setActiveSubTab] = useState('all');
  const [categories, setCategories] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [allPackages, setAllPackages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesData, servicesData, packagesData] = await Promise.all([
          createDataHandler(CATEGORY_API),
          createDataHandler(SERVICE_API),
          createDataHandler(PACKAGE_API)
        ]);

        const mappedCategories = categoriesData.slice(0, 4).map((item) => ({
          id: item.Ccode.toLowerCase(),
          label: item.CName,
          icon: getCategoryIcon(item.CName)
        }));

        const enrichedServices = servicesData.map((svc) => ({
          ...svc,
          categoryCode: mapServiceToCategory(svc.servicename)
        }));

       setCategories(mappedCategories);
       if (mappedCategories.length > 0) {
  setActiveSubTab(mappedCategories[0].id);
}
        setAllServices(enrichedServices);
        setAllPackages(packagesData);
      } catch (error) {
        console.error('Data fetch failed:', error);
      }
    };

    fetchData();
  }, []);

  const getCategoryIcon = (label) => {
    const lower = label.toLowerCase();
    if (lower.includes('consult')) return 'images/consult.svg';
    if (lower.includes('volume')) return 'images/filling.svg';
    if (lower.includes('hair')) return 'images/hair.svg';
    if (lower.includes('anti')) return 'images/antiage.svg';
    return 'images/default.svg';
  };

  const mapServiceToCategory = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes('volume')) return 'cc048';
    if (lower.includes('consult')) return 'cc07';
    if (lower.includes('anti')) return 'cc04';
    if (lower.includes('hair')) return 'cc025';
    return 'uncategorized';
  };

  const truncateName = (name, maxLength = 40) => {
    return name.length > maxLength ? name.slice(0, maxLength) + '...' : name;
  };

  const filteredServices = allServices.filter((svc) => {
   const matchesTab = svc.categoryCode === activeSubTab;
    const matchesSearch = svc.servicename.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const filteredPackages = allPackages.filter((pkg) => {
    const matchesTab = mapServiceToCategory(pkg.packageName) === activeSubTab;
    const matchesSearch = pkg.packageName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="srvlistdiv">
      <h3 className="sectttl">Categories</h3>

      

      <div className="pymntmode">
        <div className="pymttabswrp">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`pymnttab ${activeSubTab === cat.id ? 'activetab' : ''}`}
              onClick={() => setActiveSubTab(cat.id)}
            >
              <img src={cat.icon} alt={cat.label} />
              <span className="pymttxt">{cat.label}</span>
            </div>
          ))}
        </div>

        <div className='tabwrpdiv'>
          <div className="horizontal-tabs">
        <button
          className={`maintab ${activeMainTab === 'services' ? 'active' : ''}`}
          onClick={() => setActiveMainTab('services')}
        >
          Services
        </button>
        <button
          className={`maintab ${activeMainTab === 'packages' ? 'active' : ''}`}
          onClick={() => setActiveMainTab('packages')}
        >
          Packages
        </button>
      </div>

      <div className="subtabs">
          <div className="servhead" style={{ marginTop: '10px', marginBottom: '10px' }}>
            <input
              type="text"
              placeholder={`Search ${activeMainTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '6px 10px', width: '100%', borderRadius: '6px', border: '1px solid #ccc' }}
            />
          </div>

          <div className="ctlistwrp">
            {(activeMainTab === 'services' ? filteredServices : filteredPackages).map((item, idx) => (
              <div
                className="ctflx"
                key={idx}
                onClick={() => {
  if (!customer || !customer.firstname || !customer.mobile) {
    showErrToast?.("Please fill in the customer details before adding a service or package.");
    return;
  }

  onAddItem?.({
    name: item.servicename || item.packageName,
    price: parseFloat(item.price) || 0,
    discount: 0,
    taxpercent: item.taxpercent ?? '0.00',
    citizentax: item.citizentax ?? '0.00'
  });
  showToast?.(`${activeMainTab === 'services' ? 'Service' : 'Package'} added to invoice`);
}}

              >
                <div className="ctlft ctcell" title={item.servicename || item.packageName}>
                  {truncateName(item.servicename || item.packageName)}
                </div>
              </div>
            ))}
            {(activeMainTab === 'services' ? filteredServices.length : filteredPackages.length) === 0 && (
              <div className="notext">No {activeMainTab} found</div>
            )}
          </div>
        </div>
        </div>

        
      </div>
    </div>
  );
};

export default CategoryTabs;
