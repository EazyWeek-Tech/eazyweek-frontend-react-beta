import styles from './CreateForm.module.css';
import { useState } from 'react';
import Toggle from './Toggle';

export default function CreateForm() {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    formType: 'Service',
    createUsing: 'Form Builder',
    status: true,
    validity: 'None',
    expiryDate: '',
    options: {
      requireReview: false,
      readOnly: false,
      prefillData: false,
      copyOldVersion: false,
      emailToGuest: false,
      saveAndProceed: false,
    },
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name in formData.options) {
      setFormData(prev => ({
        ...prev,
        options: {
          ...prev.options,
          [name]: checked,
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Create Form</h1>

      <div className={styles.section}>
        <label>Form Name</label>
        <input name="name" value={formData.name} onChange={handleChange} />

        <label>Form Code</label>
        <input name="code" value={formData.code} onChange={handleChange} />

        <label>Description</label>
        <textarea name="description" value={formData.description} onChange={handleChange} />

        <label>Form Type</label>
        <select name="formType" value={formData.formType} onChange={handleChange}>
          <option>Service</option>
          <option>Guest</option>
        </select>

        <label>Create Form Using</label>
        <select name="createUsing" value={formData.createUsing} onChange={handleChange}>
          <option>Form Builder</option>
          <option>HTML</option>
          <option>V1</option>
        </select>

        <div className={styles.toggleRow}>
          <label>Status</label>
          <Toggle checked={formData.status} onChange={() => setFormData(prev => ({ ...prev, status: !prev.status }))} />
        </div>
      </div>

      <div className={styles.section}>
        <label>Form Validity</label>
        <select name="validity" value={formData.validity} onChange={handleChange}>
          <option>None</option>
          <option>Until Date</option>
        </select>

        {formData.validity === 'Until Date' && (
          <>
            <label>Valid Until</label>
            <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} />
          </>
        )}
      </div>

      <div className={styles.section}>
        <label><input type="checkbox" name="requireReview" checked={formData.options.requireReview} onChange={handleChange} /> Require Review</label>
        <label><input type="checkbox" name="readOnly" checked={formData.options.readOnly} onChange={handleChange} /> Read-only for guests</label>
        <label><input type="checkbox" name="prefillData" checked={formData.options.prefillData} onChange={handleChange} /> Prefill with previous data</label>
        <label><input type="checkbox" name="copyOldVersion" checked={formData.options.copyOldVersion} onChange={handleChange} /> Copy old version data</label>
        <label><input type="checkbox" name="emailToGuest" checked={formData.options.emailToGuest} onChange={handleChange} /> Email submission to guest</label>
        <label><input type="checkbox" name="saveAndProceed" checked={formData.options.saveAndProceed} onChange={handleChange} /> Show Save & Proceed button</label>
      </div>

      <div className={styles.actions}>
        <button className={styles.save}>Save</button>
        <button className={styles.cancel}>Cancel</button>
      </div>
    </div>
  );
}
