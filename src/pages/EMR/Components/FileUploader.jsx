import React from 'react';
import { useDropzone } from 'react-dropzone';

export default function FileUploader({ onFilesSelected }) {
  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: 10,
    maxSize: 10 * 1024 * 1024,
    onDrop: async acceptedFiles => {
      const filePromises = acceptedFiles.map(file => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              fileName: file.name,
              fileType: file.type,
              base64Data: reader.result.split(',')[1],
              preview: URL.createObjectURL(file)
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const filesWithBase64 = await Promise.all(filePromises);
      onFilesSelected(filesWithBase64);
    }
  });

  return (
    <section style={{ marginTop: '1rem' }}>
      <div
        {...getRootProps()}
        style={{
          border: '2px dashed #ccc',
          padding: '2rem',
          textAlign: 'center',
          borderRadius: '8px',
          backgroundColor: '#fcfcfc',
          cursor: 'pointer'
        }}
      >
        <input {...getInputProps()} />
        <p>
          <span role="img" aria-label="upload">📤</span>{' '}
          <strong>Drop files to attach, or <span style={{ color: '#007bff', textDecoration: 'underline' }}>browse</span></strong>
        </p>
        <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '1rem' }}>
          Upload a maximum of 10 files at a time. Each file cannot exceed 10MB.<br />
          If the form has more than a total of 20 files, the form may be slow to load.
        </p>
      </div>
    </section>
  );
}
