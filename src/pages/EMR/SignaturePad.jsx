import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { FiRotateCcw } from 'react-icons/fi';

export default function SignaturePad({ onSave }) {
  const sigRef = useRef(null);

  const handleClear = () => {
    sigRef.current.clear();
    onSave('');
  };

  const handleEnd = () => {
    if (!sigRef.current.isEmpty()) {
      const dataUrl = sigRef.current.getCanvas().toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  return (
    <div style={{ marginTop: '1rem', maxWidth: '100%' }}>
      <label><strong>Signature</strong></label>
      <div style={{
        position: 'relative',
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#f9f9f1',
        width: '100%',
        height: '200px',
        overflow: 'hidden'
      }}>
        <SignatureCanvas
          ref={sigRef}
          backgroundColor="#f9f9f1"
          penColor="black"
          canvasProps={{
            width: 600,
            height: 200,
            style: { display: 'block' }
          }}
          onEnd={handleEnd}
        />
        <button
          onClick={handleClear}
          style={{
            position: 'absolute',
            top: '1px',
            background: 'none',
            border: 'none',
            padding: '4px',
            cursor: 'pointer',
            color: '#999',
            opacity: 0.6
          }}
        >
          🔄
        </button>
      </div>
      <div style={{ textAlign: 'center', color: '#888', marginTop: '0.5rem' }}>
        Sign above
      </div>
    </div>
  );
}
