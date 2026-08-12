import React, { useState } from 'react';
import EInvoiceDashboard from './EInvoiceDashboard';
import EInvoiceDetail from './EInvoiceDetail';
import EInvoicePrint from './EInvoicePrint';
import EInvoiceDetailedReport from './EInvoiceDetailedReport';

const EInvoice = () => {
  const [view, setView] = useState({ screen: 'list', recId: null });

  if (view.screen === 'print') {
    return <EInvoicePrint recId={view.recId} onBack={() => setView({ screen: 'list', recId: null })} />;
  }

  if (view.screen === 'detail') {
    return (
      <EInvoiceDetail
        recId={view.recId}
        onBack={() => setView({ screen: 'list', recId: null })}
        onOpenPrint={(recId) => setView({ screen: 'print', recId })}
      />
    );
  }

  return (
    <EInvoiceDashboard
      onOpenDetail={(recId) => setView({ screen: 'detail', recId })}
      onOpenPrint={(recId) => setView({ screen: 'print', recId })}
    />
  );
};

export default EInvoice;
export { EInvoiceDashboard, EInvoiceDetail, EInvoicePrint, EInvoiceDetailedReport };