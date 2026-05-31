/**
 * useEntityLevel — shared utility for rights-based access in master pages
 *
 * Reads the user object from localStorage and returns:
 *   isEntityLevel  — true if logged in at Legal Entity level (Centriq)
 *   isAdmin        — true if user's role is Admin or Manager
 *   canCreate      — can create new records (Admin + Entity level)
 *   canEdit        — can edit records (Admin — at any level)
 *   canDelete      — can delete records (Admin + Entity level only)
 *   centerCode     — current centre/entity code
 *   legalEntityCode— the LE code
 *   user           — raw user object
 *
 * Usage:
 *   import { useEntityLevel } from "../../hooks/useEntityLevel";
 *   const { isEntityLevel, canCreate, canEdit, canDelete } = useEntityLevel();
 */

import { useMemo } from "react";

export const useEntityLevel = () => {
  return useMemo(() => {
    try {
      const user = JSON.parse(
        localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"
      );

      const role = (
        user.role || user.userRole || user.securityRole || ""
      ).toLowerCase().replace(/\s/g, "");

      const isAdmin = role === "admin" || role === "manager";

      // isEntityLevel: explicitly set on switch, or detected from centerCode matching leCode
      const isEntityLevel =
        user.isEntityLevel === true ||
        (user.legalEntityCode && user.legalEntityCode === user.centerCode) ||
        false;

      return {
        user,
        isEntityLevel,
        isAdmin,
        canCreate: isAdmin && isEntityLevel,   // Create only at LE level
        canEdit:   isAdmin,                     // Edit at any level (admin)
        canDelete: isAdmin && isEntityLevel,    // Delete only at LE level
        centerCode:      user.centerCode      || "",
        legalEntityCode: user.legalEntityCode || user.leCode || "",
      };
    } catch {
      return {
        user: {}, isEntityLevel: false, isAdmin: false,
        canCreate: false, canEdit: false, canDelete: false,
        centerCode: "", legalEntityCode: "",
      };
    }
  }, []);
};

export default useEntityLevel;