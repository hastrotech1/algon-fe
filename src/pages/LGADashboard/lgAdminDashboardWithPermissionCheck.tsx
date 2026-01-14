import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { PermissionDeniedDesign } from "./permissionDeniedDesign";
import { LGAdminDashboard } from "./lgAdminDashboardFunc";
import { useEffect, useState } from "react";

interface LGAdminDashboardWrapperProps {
  requiredPermissions?: string[];
}

/**
 * Wrapper component that checks if LG Admin has required permissions
 * If not, displays a permission denied interface
 * If yes, renders the actual dashboard
 */
export function LGAdminDashboardWithPermissionCheck({
  requiredPermissions = ["approveApplications", "viewAnalytics"],
}: LGAdminDashboardWrapperProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user has required permissions
    if (!user) {
      navigate("/login");
      return;
    }

    // Get user permissions from localStorage or auth context
    const userPermissions = JSON.parse(
      localStorage.getItem("userPermissions") || "[]"
    );

    // Check if user has at least one of the required permissions
    const hasAccess = requiredPermissions.some((perm) =>
      userPermissions.includes(perm)
    );

    setHasPermission(hasAccess);
    setIsLoading(false);
  }, [user, navigate, requiredPermissions]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary/10 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    // Get missing permissions for display
    const userPermissions = JSON.parse(
      localStorage.getItem("userPermissions") || "[]"
    );
    const missingPermissions = requiredPermissions.filter(
      (perm) => !userPermissions.includes(perm)
    );

    const permissionLabels: { [key: string]: string } = {
      approveApplications: "Approve Applications",
      manageFees: "Manage Fees",
      manageRequirements: "Manage Requirements",
      viewAnalytics: "View Analytics",
      exportData: "Export Data",
      viewCertificates: "View Certificates",
      manageDynamicFields: "Manage Custom Fields",
    };

    const displayMissingPermissions = missingPermissions.map(
      (perm) => permissionLabels[perm] || perm
    );

    return (
      <PermissionDeniedDesign
        adminName={user?.name || "Administrator"}
        requiredPermissions={
          displayMissingPermissions.length > 0
            ? displayMissingPermissions
            : ["Dashboard Access", "Application Management", "Analytics View"]
        }
        onLogout={logout}
      />
    );
  }

  // User has required permissions, render the dashboard
  return <LGAdminDashboard />;
}

export default LGAdminDashboardWithPermissionCheck;
