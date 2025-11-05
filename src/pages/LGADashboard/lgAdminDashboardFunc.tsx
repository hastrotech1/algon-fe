import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LGAdminDashboardDesign } from "./lgAdminDashboardDesign";
import { toast } from "sonner";
import type { Application, DigitizationRequest, DynamicField } from "../../Types/types";
import { applicationService, digitizationService, adminService } from "../../services"; // ✅ Import services
import { useAuth } from "../../hooks/useAuth";

export function LGAdminDashboard() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'applications' | 'digitization' | 'reports' | 'settings'>('dashboard');
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ✅ State for API data
  const [applications, setApplications] = useState<Application[]>([]);
  const [digitizationRequests, setDigitizationRequests] = useState<DigitizationRequest[]>([]);
  const [dynamicFields, setDynamicFields] = useState<DynamicField[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [approvalData, setApprovalData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ Fetch data on mount
  useEffect(() => {
    loadDashboardData();
  }, [activeTab]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    
    try {
      // ✅ Load different data based on active tab
      if (activeTab === 'dashboard') {
        const [appsData, statsData] = await Promise.all([
          applicationService.getAllApplications({ limit: 10 }),
          adminService.getDashboardStats(),
        ]);
        
        setApplications(appsData.results || []);
        setWeeklyData(statsData.weeklyData || []);
        setApprovalData(statsData.approvalData || []);
      } else if (activeTab === 'applications') {
        const data = await applicationService.getAllApplications();
        setApplications(data.results || []);
      } else if (activeTab === 'digitization') {
        const data = await digitizationService.getAllDigitizationRequests();
        setDigitizationRequests(data.results || []);
      } else if (activeTab === 'settings') {
        const fields = await adminService.getDynamicFields();
        setDynamicFields(fields || []);
      }
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      toast.error(error.response?.data?.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         app.nin.includes(searchTerm) ||
                         app.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      try {
        await logout();
        navigate('/');
      } catch (error) {
        navigate('/');
      }
    }
  };

  // ✅ Real handler for adding dynamic field
  const handleAddDynamicField = async (field: Omit<DynamicField, 'id'>) => {
    try {
      const newField = await adminService.createDynamicField(field);
      setDynamicFields([...dynamicFields, newField]);
      toast.success("Field added successfully");
    } catch (error: any) {
      console.error('Failed to add field:', error);
      toast.error(error.response?.data?.message || 'Failed to add field');
    }
  };

  // ✅ Real handler for deleting dynamic field
  const handleDeleteDynamicField = async (fieldId: string, fieldLabel: string) => {
    if (window.confirm(`Are you sure you want to delete "${fieldLabel}"?`)) {
      try {
        await adminService.deleteDynamicField(fieldId);
        setDynamicFields(dynamicFields.filter(field => field.id !== fieldId));
        toast.success(`Field "${fieldLabel}" deleted successfully`);
      } catch (error: any) {
        console.error('Failed to delete field:', error);
        toast.error(error.response?.data?.message || 'Failed to delete field');
      }
    }
  };

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
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      applications={applications}
      filteredApplications={filteredApplications}
      digitizationRequests={digitizationRequests}
      dynamicFields={dynamicFields}
      weeklyData={weeklyData}
      approvalData={approvalData}
      handleLogout={handleLogout}
      handleAddDynamicField={handleAddDynamicField}
      handleDeleteDynamicField={handleDeleteDynamicField}
      onNavigate={(page: string) => navigate(`/${page}`)}
    />
  );
}