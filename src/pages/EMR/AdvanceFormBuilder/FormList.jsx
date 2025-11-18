import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../../config';
import { FormPreview } from './FormPreview';
import ToggleSwitch from './ToggleSwitch';

const FormList = () => {
  const [forms, setForms] = useState([]);
  const [selectedFormConfig, setSelectedFormConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [currentView, setCurrentView] = useState('list');

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/form`);
      if (!response.ok) throw new Error('Failed to fetch forms');
      const data = await response.json();
      setForms(data);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNameClick = async (formId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/form/by-name?name=${formId}`);
      if (!response.ok) throw new Error('Failed to fetch form config');
      const config = await response.json();
      setSelectedFormConfig(config);
      setCurrentView('preview');
    } catch (err) {
      console.error(err.message);
    }
  };

  const filteredForms = forms.filter(form => {
    if (statusFilter === '') return true;
    return form.status?.toLowerCase() === statusFilter?.toLowerCase();
  });

  const parsedSchema =
    selectedFormConfig && selectedFormConfig.schemaJson
      ? JSON.parse(selectedFormConfig.schemaJson)
      : null;

  if (loading) return <div>Loading...</div>;
  // if (error) return <div>Error: {error}</div>;
  return (
    <div>
      <div style={{flexDirection: "row",
          gap: '1.5rem',
          textAlign: 'center',
          padding: '0.5rem 1rem',
          display:'flex',
          justifyContent:'space-between',
          alignItems:'center',
          marginBottom:'10px'}}
      >
        <div>
          <h1 className="AdvFormBuilder-title">
            {currentView === 'preview' ? 'Form Preview' : 'List Forms'}
          </h1>
        </div>
        {currentView === 'preview' && (
          <div className="AdvFormBuilder-actions">
            <ToggleSwitch
              leftLabel="List"
              rightLabel="Preview"
              value={currentView === 'preview' ? 'Preview' : 'List'}
              onChange={(value) => setCurrentView(value === 'Preview' ? 'preview' : 'list')}
            />
          </div>
        )}
      </div>

      {currentView === 'list' ? (
        <>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="statusFilter">Filter by Status: </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Code</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Name</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Expiry</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Type</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredForms.map((form) => (
                <tr key={form.id}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{form.code}</td>
                  <td
                    style={{ border: '1px solid #ddd', padding: '8px', cursor: 'pointer', color: 'blue' }}
                    onClick={() => handleNameClick(form.name)}
                  >
                    {form.name}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{form.expiryDate}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{form.formType}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{form.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        parsedSchema && <FormPreview config={parsedSchema} />
      )}
    </div>
  );
};

export default FormList;
