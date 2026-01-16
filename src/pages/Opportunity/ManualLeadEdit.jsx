import React from "react";
import { useLocation, useParams } from "react-router-dom";
import ManualOppCustomerDetails from "./ManualOppCustomerDetails";

export default function ManualLeadEdit() {
  const { leadOppId } = useParams();
  const { state } = useLocation();

  // prefer URL param, fallback to state
  const leadOpp_ID = Number(leadOppId) || Number(state?.leadOpp_ID) || 0;

  return (
    <ManualOppCustomerDetails
      leadOpp_ID={leadOpp_ID}
      oppCode={state?.oppCode}
      header={state?.header}
      salesOwnerRecId={state?.salesOwnerRecId}
      isManual={true}
      row={state?.row}
    />
  );
}
