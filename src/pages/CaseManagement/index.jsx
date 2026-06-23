// src/pages/Cases/index.jsx
// The Case management screen now renders the combined CaseDashboard, which folds
// the overview (KPIs + charts), the filter toolbar, the case table, and the
// create-case modal into a single component (styled to match OpportunityDashboard).
//
// The previous composition (DashboardOverview + FilterBar + CaseTable + CreateCaseModel
// orchestrated here) now lives inside CaseDashboard.jsx. Keeping this file as a thin
// re-export means any existing route or import that points at the Cases folder /
// `./Cases/index` continues to work unchanged.
import CaseDashboard from "./CaseDashboard";

export default CaseDashboard;