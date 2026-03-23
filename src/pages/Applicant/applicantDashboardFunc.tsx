import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ApplicantDashboardDesign } from "./applicantDashboardDesign";
import { ApplicationDetailsModal } from "../../components/ApplicationDetailsModal";
import { toast } from "sonner";
import type { Application, MyCertificate } from "../../Types/types";
import { applicationService, certificateService } from "../../services"; // ✅ Import services
import { useAuth } from "../../hooks/useAuth"; // ✅ Import auth hook
import { formatDate } from "../../utils/validation"; // ✅ Import formatDate
import { getBackendErrorMessage } from "../../utils/errorHelpers";

type ApplicationApiItem = {
  id: string;
  full_name?: string;
  name?: string;
  nin: string;
  application_status?: string;
  status?: string;
  payment_status?: string;
  payment?: string;
  approved_at?: string;
  updated_at?: string;
  created_at?: string;
  village?: string;
  local_government?: { name?: string } | string;
  lga?: string;
  state?: { name?: string } | string;
  email?: string;
  phone_number?: string;
  phone?: string;
};

const normalizeArrayPayload = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (typeof payload === "object" && payload !== null) {
    const objectPayload = payload as {
      data?: unknown;
      results?: unknown;
    };

    if (Array.isArray(objectPayload.data)) {
      return objectPayload.data as T[];
    }

    if (
      typeof objectPayload.data === "object" &&
      objectPayload.data !== null &&
      Array.isArray((objectPayload.data as { results?: unknown }).results)
    ) {
      return (objectPayload.data as { results: T[] }).results;
    }

    if (Array.isArray(objectPayload.results)) {
      return objectPayload.results as T[];
    }
  }

  return [];
};

export function ApplicantDashboard() {
  const navigate = useNavigate();
  const { logout, user } = useAuth(); // ✅ Get user/logout from auth
  const [activeTab, setActiveTab] = useState<
    "overview" | "applications" | "certificates"
  >("overview");

  // ✅ Get user name from AuthContext user
  const userName = user?.name ?? "Applicant";

  // ✅ State for API data
  const [applications, setApplications] = useState<Application[]>([]);
  const [certificates, setCertificates] = useState<MyCertificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] =
    useState<Application | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // ✅ Fetch data on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [applicationsResponse, certificatesResponse] = await Promise.all([
        applicationService.getMyApplications({
          application_type: "certificate",
        }),
        certificateService.getMyCertificates(),
      ]);

      const applications =
        normalizeArrayPayload<ApplicationApiItem>(applicationsResponse);
      const myCertificates =
        normalizeArrayPayload<MyCertificate>(certificatesResponse);

      // Transform API response to match Application type
      const transformedApplications: Application[] = applications.map(
        (app) => ({
          id: app.id,
          name: app.full_name || app.name,
          nin: app.nin,
          status: app.application_status || app.status,
          payment: app.payment_status || app.payment,
          dateProcessed: app.approved_at
            ? formatDate(app.approved_at)
            : app.updated_at
              ? formatDate(app.updated_at)
              : "Pending",
          dateApplied: app.created_at ? formatDate(app.created_at) : "N/A",
          village: app.village,
          lga:
            typeof app.local_government === "object"
              ? app.local_government?.name
              : app.local_government || app.lga,
          state: typeof app.state === "object" ? app.state?.name : app.state,
          email: app.email,
          phone: app.phone_number || app.phone,
        }),
      );

      setApplications(transformedApplications);
      setCertificates(myCertificates);
    } catch (error: unknown) {
      console.error("Failed to load applications:", error);

      const dashboardError =
        typeof error === "object" && error !== null
          ? (error as {
              response?: { status?: number; data?: { message?: string } };
              message?: string;
            })
          : undefined;

      const status = dashboardError?.response?.status;
      const errorData = dashboardError?.response?.data;
      let errorMessage = "Failed to load applications. Please try again.";

      // Handle specific error status codes based on API documentation
      if (status === 401) {
        // Unauthorized: Missing/invalid/expired token
        errorMessage = "Session expired. Please login again.";
        setError(errorMessage);
        toast.error(errorMessage);
        setTimeout(() => {
          logout();
          navigate("/login");
        }, 2000);
        return;
      } else if (status === 403) {
        // Forbidden: Valid token but lacks required scope/role
        errorMessage = "You do not have permission to view applications.";
      } else if (status === 429) {
        // Too Many Requests: Rate limit
        errorMessage = "Too many requests. Please wait a moment and try again.";
      } else if (status >= 500) {
        // 5xx Server Errors
        errorMessage = "Server error. Please try again later.";
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      } else {
        errorMessage = getBackendErrorMessage(
          error,
          "Failed to load applications. Please try again.",
        );
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Calculate stats from real data
  const currentApplication =
    applications.find(
      (app) => app.status === "under-review" || app.status === "pending",
    ) ||
    applications[0] ||
    null;

  const stats = {
    total: applications.length,
    approved: applications.filter((app) => app.status === "approved").length,
    pending: applications.filter(
      (app) => app.status === "under-review" || app.status === "pending",
    ).length,
  };

  const handleLogout = async () => {
    toast("Are you sure you want to logout?", {
      action: {
        label: "Logout",
        onClick: async () => {
          try {
            await logout(); // ✅ Use auth service
            navigate("/");
          } catch (error) {
            console.error("Logout error:", error);
            // Clear local data even if API call fails
            navigate("/");
          }
        },
      },
      cancel: {
        label: "Cancel",
        onClick: () => {},
      },
    });
  };

  // ✅ Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your applications...</p>
        </div>
      </div>
    );
  }

  // ✅ Show error state
  if (error && applications.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="text-primary hover:underline"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const handleViewDetails = (application: Application) => {
    setSelectedApplication(application);
    setIsDetailsModalOpen(true);
  };

  return (
    <>
      <ApplicantDashboardDesign
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        applications={applications}
        certificates={certificates}
        currentApplication={currentApplication}
        stats={stats}
        userName={userName}
        onNavigate={(page: string) => {
          const routes: Record<string, string> = {
            "application-form": "/application-form",
            "digitization-flow": "/digitization-flow",
            verify: "/verify",
            "certificate-download": "/certificate-download",
          };
          navigate(routes[page] || "/");
        }}
        handleLogout={handleLogout}
        onViewDetails={handleViewDetails}
      />
      <ApplicationDetailsModal
        application={selectedApplication}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
      />
    </>
  );
}
