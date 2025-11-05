import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SuperAdminDashboardDesign } from "./superAdminDashboardDesign";
import type { LocalGovernment, AuditLogEntry, MonthlyData } from "../../Types/types";
import { adminService } from "../../services"; // ✅ Use service
import { toast } from "sonner";

export function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ✅ State for data
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [lgas, setLgas] = useState<LocalGovernment[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ Load data on mount and tab change
  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    
    try {
      if (activeTab === 'lgas') {
        const data = await adminService.getAllLGAs();
        setLgas(data.results || []);
      } else if (activeTab === 'audit') {
        const data = await adminService.getAuditLog();
        setAuditLog(data.results || []);
      } else if (activeTab === 'dashboard') {
        const stats = await adminService.getDashboardStats();
        setMonthlyData(stats.monthlyData || []);
      }
    } catch (error: any) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLGAs = lgas.filter(lga => 
    lga.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lga.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lga.admin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      navigate('/');
    }
  };

  // ✅ Show loading
  if (isLoading && lgas.length === 0) {
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
    <SuperAdminDashboardDesign
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      monthlyData={monthlyData}
      lgas={lgas}
      filteredLGAs={filteredLGAs}
      auditLog={auditLog}
      handleLogout={handleLogout}
      onNavigate={(page: string) => navigate(`/${page}`)}
    />
  );
}