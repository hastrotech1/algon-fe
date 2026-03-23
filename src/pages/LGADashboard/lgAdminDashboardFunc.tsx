import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LGAdminDashboardDesign } from "./lgAdminDashboardDesign";
import { toast } from "sonner";
import type {
  Application,
  DigitizationRequest,
  DynamicField,
} from "../../Types/types";
import {
  applicationService,
  digitizationService,
  adminService,
} from "../../services"; // ✅ Import services
import { useAuth } from "../../hooks/useAuth";
import { downloadCSV } from "../../utils/downloadHelpers";
import { getBackendErrorMessage } from "../../utils/errorHelpers";

export function LGAdminDashboard() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "applications" | "digitization" | "reports" | "settings"
  >("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  // ✅ State for API data
  const [applications, setApplications] = useState<Application[]>([]);
  const [digitizationRequests, setDigitizationRequests] = useState<
    DigitizationRequest[]
  >([]);
  const [dynamicFields, setDynamicFields] = useState<DynamicField[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [approvalData, setApprovalData] = useState<any[]>([]);
  const [digitizationOverview, setDigitizationOverview] = useState<any>(null);
  const [reportAnalytics, setReportAnalytics] = useState<any>(null);
  const [lgaFees, setLgaFees] = useState<any>(null);
  const [dashboardMetrics, setDashboardMetrics] = useState<{
    pending_applications: number;
    approved_certificates: number;
    rejected: number;
    total_revenue: number;
  } | null>(null);
  const [localGovernmentName, setLocalGovernmentName] =
    useState<string>("Local Government");
  const [isLoading, setIsLoading] = useState(true);

  const normalizeApplicationRecord = (record: any): Application => ({
    id: record?.id || "",
    name: record?.full_name || record?.name || "Unknown Applicant",
    nin: record?.nin || "N/A",
    status:
      record?.application_status ||
      record?.status ||
      (record?.verification_status === "approved" ? "approved" : "pending"),
    payment: record?.payment_status || record?.payment || "unpaid",
    dateProcessed: record?.approved_at || record?.updated_at || "Pending",
    dateApplied: record?.created_at || "N/A",
    village: record?.village || "N/A",
    lga:
      typeof record?.local_government === "object"
        ? record?.local_government?.name || "N/A"
        : record?.local_government || record?.lga || "N/A",
    state:
      typeof record?.state === "object"
        ? record?.state?.name || "N/A"
        : record?.state || "N/A",
    email: record?.email,
    phone: record?.phone_number || record?.phone,
  });

  const normalizeDigitizationRecord = (record: any): DigitizationRequest => ({
    id: record?.id || "",
    name: record?.full_name || record?.name || "Unknown Applicant",
    nin: record?.nin || "N/A",
    status:
      record?.verification_status ||
      record?.application_status ||
      record?.status ||
      "pending",
    payment: record?.payment_status || record?.payment || "unpaid",
    date: record?.created_at || record?.date || "N/A",
    certificateRef:
      record?.certificate_reference_number || record?.certificateRef || "",
    uploadPreview:
      record?.uploaded_certificate ||
      record?.uploadPreview ||
      "No upload available",
  });

  const toMetricNumber = (metric: unknown): number => {
    if (typeof metric === "number") {
      return metric;
    }

    if (
      typeof metric === "object" &&
      metric !== null &&
      typeof (metric as { value?: unknown }).value === "number"
    ) {
      return (metric as { value: number }).value;
    }

    return 0;
  };

  const normalizeWeeklyApplications = (weeklyApplications: any): any[] => {
    if (Array.isArray(weeklyApplications)) {
      return weeklyApplications.map((item: any, index: number) => ({
        name: item.name || item.day || item.label || `Item ${index + 1}`,
        value:
          typeof item.value === "number"
            ? item.value
            : typeof item.total === "number"
              ? item.total
              : 0,
      }));
    }

    if (typeof weeklyApplications === "number") {
      return [{ name: "This Week", value: weeklyApplications }];
    }

    return [];
  };

  const normalizeApprovalStatistics = (
    approvalStatistics: any,
    metricCards: any,
  ) => {
    if (Array.isArray(approvalStatistics)) {
      return approvalStatistics.map((item: any, index: number) => ({
        name: item.name || item.label || `Status ${index + 1}`,
        value:
          typeof item.value === "number"
            ? item.value
            : typeof item.total === "number"
              ? item.total
              : 0,
        color:
          item.color || ["#10B981", "#F59E0B", "#EF4444"][index] || "#6B7280",
      }));
    }

    if (approvalStatistics && typeof approvalStatistics === "object") {
      return [
        {
          name: "Approved",
          value: approvalStatistics.approved || 0,
          color: "#10B981",
        },
        {
          name: "Pending",
          value: approvalStatistics.pending || 0,
          color: "#F59E0B",
        },
        {
          name: "Rejected",
          value: approvalStatistics.rejected || 0,
          color: "#EF4444",
        },
      ];
    }

    return [
      {
        name: "Approved",
        value: metricCards?.approved_certificates?.value || 0,
        color: "#10B981",
      },
      {
        name: "Pending",
        value: metricCards?.pending_applications?.value || 0,
        color: "#F59E0B",
      },
      {
        name: "Rejected",
        value: metricCards?.rejected?.value || 0,
        color: "#EF4444",
      },
    ];
  };

  // ✅ Fetch data on mount and when pagination changes
  useEffect(() => {
    loadDashboardData();
  }, [activeTab, currentPage, pageSize]);

  const loadDashboardData = async () => {
    setIsLoading(true);

    try {
      // ✅ Load different data based on active tab
      if (activeTab === "dashboard") {
        const dashboardResponse = await adminService.getLGAdminDashboard();
        const dashboardData = dashboardResponse?.data || {};
        const metricCards = dashboardData.metric_cards || {};

        const recentApplications = Array.isArray(
          dashboardData.recent_applications,
        )
          ? dashboardData.recent_applications.map(normalizeApplicationRecord)
          : [];

        const dashboardLgaName =
          (typeof dashboardData?.local_government === "string"
            ? dashboardData.local_government
            : dashboardData?.local_government?.name) ||
          recentApplications[0]?.lga ||
          localGovernmentName;
        setLocalGovernmentName(dashboardLgaName);

        setApplications(recentApplications);
        setTotalItems(recentApplications.length);
        setHasNext(false);
        setHasPrevious(false);

        setDashboardMetrics({
          pending_applications: toMetricNumber(
            metricCards.pending_applications,
          ),
          approved_certificates: toMetricNumber(
            metricCards.approved_certificates,
          ),
          rejected: toMetricNumber(metricCards.rejected),
          total_revenue: toMetricNumber(metricCards.total_revenue),
        });

        setWeeklyData(
          normalizeWeeklyApplications(dashboardData.weekly_applications),
        );
        setApprovalData(
          normalizeApprovalStatistics(
            dashboardData.approval_statistics,
            metricCards,
          ),
        );
      } else if (activeTab === "applications") {
        const data = await adminService.getAllApplications({
          limit: pageSize,
          page: currentPage,
          status: statusFilter !== "all" ? statusFilter : undefined,
        });
        const applicationRows = Array.isArray(data.results)
          ? data.results.map(normalizeApplicationRecord)
          : [];
        setApplications(applicationRows);
        if (applicationRows.length > 0 && applicationRows[0].lga) {
          setLocalGovernmentName(applicationRows[0].lga);
        }
        setTotalItems(data.count || 0);
        setHasNext(!!data.next);
        setHasPrevious(!!data.previous);
      } else if (activeTab === "digitization") {
        const [digitizationData, overviewData] = await Promise.all([
          adminService.getAllApplications({
            application_type: "digitization",
            limit: pageSize,
            page: currentPage,
          }),
          adminService.getDigitizationOverview(),
        ]);

        setDigitizationOverview(overviewData.data || null);
        const digitizationRows = Array.isArray(digitizationData.results)
          ? digitizationData.results.map(normalizeDigitizationRecord)
          : [];
        setDigitizationRequests(digitizationRows);
        setTotalItems(digitizationData.count || 0);
        setHasNext(!!digitizationData.next);
        setHasPrevious(!!digitizationData.previous);
      } else if (activeTab === "reports") {
        const analytics = await adminService.getReportAnalytics();
        setReportAnalytics(analytics?.data || analytics);
      } else if (activeTab === "settings") {
        const [fields, fees] = await Promise.all([
          adminService.getDynamicFields(),
          adminService.getLGAFee(),
        ]);
        setDynamicFields(fields || []);
        setLgaFees(fees?.data?.[0] || null);
        const feeLgaName = fees?.data?.[0]?.local_government;
        if (feeLgaName) {
          setLocalGovernmentName(feeLgaName);
        }
      }
    } catch (error: unknown) {
      console.error("Failed to load dashboard data:", error);
      toast.error(getBackendErrorMessage(error, "Failed to load data"));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredApplications = applications.filter((app) => {
    const normalizedSearchTerm = searchTerm.toLowerCase();
    const name = (app.name || "").toLowerCase();
    const nin = app.nin || "";
    const applicationId = (app.id || "").toLowerCase();

    const matchesSearch =
      name.includes(normalizedSearchTerm) ||
      nin.includes(searchTerm) ||
      applicationId.includes(normalizedSearchTerm);
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    const matchesDate =
      !dateFilter ||
      (app.dateApplied && app.dateApplied.startsWith(dateFilter));
    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleLogout = async () => {
    toast("Are you sure you want to logout?", {
      action: {
        label: "Logout",
        onClick: async () => {
          try {
            await logout();
            navigate("/");
          } catch (error) {
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

  // ✅ Real handler for adding dynamic field
  const handleAddDynamicField = async (field: {
    field_label: string;
    field_name?: string;
    is_required: boolean;
    field_type: "text" | "number" | "date" | "file" | "dropdown";
    dropdown_options?: string[];
  }) => {
    try {
      const newField = await adminService.createDynamicField(field);
      setDynamicFields([...dynamicFields, newField]);
      toast.success("Field added successfully");
    } catch (error: unknown) {
      console.error("Failed to add field:", error);
      toast.error(getBackendErrorMessage(error, "Failed to add field"));
    }
  };

  // ✅ Real handler for updating dynamic field
  const handleUpdateDynamicField = async (
    fieldId: string,
    fieldData: {
      field_label: string;
      field_name: string;
      is_required: boolean;
      field_type: string;
    },
  ) => {
    try {
      const updatedField = await adminService.updateDynamicField(
        fieldId,
        fieldData,
      );
      setDynamicFields(
        dynamicFields.map((field) =>
          field.id === fieldId ? updatedField : field,
        ),
      );
      toast.success("Field updated successfully");
    } catch (error: unknown) {
      console.error("Failed to update field:", error);
      toast.error(getBackendErrorMessage(error, "Failed to update field"));
    }
  };

  // ✅ Real handler for deleting dynamic field
  const handleDeleteDynamicField = async (
    fieldId: string,
    fieldLabel: string,
  ) => {
    toast(`Are you sure you want to delete "${fieldLabel}"?`, {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await adminService.deleteDynamicField(fieldId);
            setDynamicFields(
              dynamicFields.filter((field) => field.id !== fieldId),
            );
            toast.success(`Field "${fieldLabel}" deleted successfully`);
          } catch (error: unknown) {
            console.error("Failed to delete field:", error);
            toast.error(
              getBackendErrorMessage(error, "Failed to delete field"),
            );
          }
        },
      },
      cancel: {
        label: "Cancel",
        onClick: () => {},
      },
    });
  };

  // ✅ Handler for creating/updating LGA fees
  const handleSaveFees = async (feeData: {
    application_fee: number;
    digitization_fee: number;
    regeneration_fee: number;
  }) => {
    const loadingToast = toast.loading(
      lgaFees ? "Updating fees..." : "Creating fees...",
    );
    try {
      let result;
      if (lgaFees) {
        result = await adminService.updateLGAFee(feeData);
        toast.success("Fees updated successfully", { id: loadingToast });
      } else {
        result = await adminService.createLGAFee(feeData);
        toast.success("Fees created successfully", { id: loadingToast });
      }
      // Extract fee data from response and update state
      const feeDataFromResponse = result?.data?.[0] || result?.data || null;
      setLgaFees(feeDataFromResponse);
    } catch (error: unknown) {
      console.error("Failed to save fees:", error);
      toast.error(getBackendErrorMessage(error, "Failed to save fees"), {
        id: loadingToast,
      });
    }
  };

  const handleUploadSignature = async (file: File) => {
    await toast.promise(adminService.uploadSignature(file), {
      loading: "Uploading signature...",
      success: "Signature uploaded successfully",
      error: (error: unknown) =>
        getBackendErrorMessage(error, "Failed to upload signature"),
    });
  };

  // ✅ Export applications as CSV
  const handleExportApplications = async () => {
    try {
      await toast.promise(
        adminService.exportCSV("applications").then((blob) => {
          downloadCSV(blob, "certificate-applications");
        }),
        {
          loading: "Exporting applications...",
          success: "Applications exported successfully",
          error: "Failed to export applications",
        },
      );
    } catch (error: any) {
      console.error("Export failed:", error);
    }
  };

  // ✅ Export digitization requests as CSV
  const handleExportDigitization = async () => {
    try {
      await toast.promise(
        adminService.exportCSV("digitizations").then((blob) => {
          downloadCSV(blob, "digitization-requests");
        }),
        {
          loading: "Exporting digitization requests...",
          success: "Digitization requests exported successfully",
          error: "Failed to export digitization requests",
        },
      );
    } catch (error: any) {
      console.error("Export failed:", error);
    }
  };

  const handleManageApplication = async (
    applicationId: string,
    applicationType: "certificate" | "digitization",
    action: "approved" | "rejected",
    remarks?: string,
  ) => {
    const actionLabel = action === "approved" ? "approved" : "rejected";
    const loadingToast = toast.loading(
      `${action === "approved" ? "Approving" : "Rejecting"} ${applicationType} request...`,
    );

    try {
      await adminService.manageApplication(applicationId, {
        application_type: applicationType,
        action,
        remarks,
      });

      toast.success(`Request ${actionLabel} successfully`, {
        id: loadingToast,
      });

      await loadDashboardData();
    } catch (error: unknown) {
      toast.error(
        getBackendErrorMessage(error, `Failed to ${actionLabel} request`),
        {
          id: loadingToast,
        },
      );
      throw error;
    }
  };

  // ✅ Download report analytics
  const handleDownloadReport = async (reportType: string) => {
    const loadingToast = toast.loading("Generating report...");
    try {
      const analyticsResponse = await adminService.getReportAnalytics();

      // Extract data from response
      const analyticsData = analyticsResponse?.data || analyticsResponse;

      // Convert analytics data to CSV format
      const csvContent = generateReportCSV(analyticsData, reportType);
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

      // Use downloadFile helper
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `analytics-report-${reportType}-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Report downloaded successfully", { id: loadingToast });
    } catch (error: unknown) {
      console.error("Report download failed:", error);
      toast.error(getBackendErrorMessage(error, "Failed to download report"), {
        id: loadingToast,
      });
    }
  };

  // Helper function to generate CSV from analytics data
  const generateReportCSV = (data: any, reportType: string): string => {
    let csv = "";

    // Add header
    csv += `Analytics Report - ${reportType}\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;

    // Metric Cards Section
    csv += "KEY METRICS\n";
    csv += "Metric,Value\n";
    csv += `Total Revenue,₦${
      data.metric_cards?.total_revenue?.toLocaleString() || 0
    }\n`;
    csv += `Total Requests,${data.metric_cards?.total_requests || 0}\n`;
    csv += `Approval Rate,${(
      (data.metric_cards?.approval_rate || 0) * 100
    ).toFixed(1)}%\n`;
    csv += `Average Processing Days,${
      data.metric_cards?.average_processing_days || 0
    }\n\n`;

    // Status Distribution Section
    csv += "STATUS DISTRIBUTION\n";
    csv += "Status,Count\n";
    csv += `Approved,${data.status_distribution?.approved || 0}\n`;
    csv += `Pending,${data.status_distribution?.pending || 0}\n`;
    csv += `Rejected,${data.status_distribution?.rejected || 0}\n\n`;

    // Monthly Breakdown - Certificates
    csv += "MONTHLY BREAKDOWN - CERTIFICATES\n";
    csv += "Month,Total\n";
    data.monthly_breakdown?.certificate?.forEach((item: any) => {
      const month = new Date(item.month).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
      csv += `${month},${item.total}\n`;
    });
    csv += "\n";

    // Monthly Breakdown - Digitizations
    csv += "MONTHLY BREAKDOWN - DIGITIZATIONS\n";
    csv += "Month,Total\n";
    data.monthly_breakdown?.digitizations?.forEach((item: any) => {
      const month = new Date(item.month).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
      csv += `${month},${item.total}\n`;
    });

    return csv;
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / pageSize);

  // ✅ Show loading state
  if (isLoading && applications.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <LGAdminDashboardDesign
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      dateFilter={dateFilter}
      setDateFilter={setDateFilter}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      applications={applications}
      filteredApplications={filteredApplications}
      digitizationRequests={digitizationRequests}
      digitizationOverview={digitizationOverview}
      reportAnalytics={reportAnalytics}
      dynamicFields={dynamicFields}
      lgaFees={lgaFees}
      dashboardMetrics={dashboardMetrics}
      weeklyData={weeklyData}
      approvalData={approvalData}
      handleManageApplication={handleManageApplication}
      handleLogout={handleLogout}
      handleAddDynamicField={handleAddDynamicField}
      handleUpdateDynamicField={handleUpdateDynamicField}
      handleDeleteDynamicField={handleDeleteDynamicField}
      handleSaveFees={handleSaveFees}
      handleUploadSignature={handleUploadSignature}
      handleExportApplications={handleExportApplications}
      handleExportDigitization={handleExportDigitization}
      handleDownloadReport={handleDownloadReport}
      currentPage={currentPage}
      pageSize={pageSize}
      totalItems={totalItems}
      totalPages={totalPages}
      hasNext={hasNext}
      hasPrevious={hasPrevious}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
      localGovernmentName={localGovernmentName}
      onNavigate={(page: string) => navigate(`/${page}`)}
    />
  );
}
