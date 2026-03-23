import {
  mockApplications,
  mockDigitizationRequests,
  mockDynamicFields,
  mockWeeklyData,
  mockApprovalData,
  mockMonthlyData,
  mockLocalGovernments,
  mockAuditLog,
  mockUsers,
  mockCertificateData,
} from "./mockData";
import type {
  Application,
  DigitizationRequest,
  DynamicField,
  ApplicationFormData,
  DigitizationFormData,
  OnboardingFormData,
  InviteLGAdminRequest,
  RegisterFormData,
  ApplicationStatus,
} from "../Types/types";
import type { RegisterRequest } from "./auth.service";

// Simulate network delay
const delay = (ms: number = 500) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Mock Authentication
// Mock Authentication
export const mockAuthService = {
  async login(email: string, _password: string) {
    await delay();

    const emailLower = email.toLowerCase();

    // ✅ Determine user type based on email
    let user;

    if (emailLower.includes("superadmin")) {
      user = {
        id: "3",
        email: email,
        role: "superAdmin" as const, // ✅ Matches UserRole type
        name: "Super Admin",
        phone: "080-SUPER-ADMIN",
      };
    } else if (emailLower.includes("admin")) {
      user = {
        id: "2",
        email: email,
        role: "admin" as const, // ✅ Matches UserRole type
        name: "LG Admin",
        phone: "080-LG-ADMIN",
      };
    } else {
      user = {
        id: "1",
        email: email,
        role: "applicant" as const, // ✅ Matches UserRole type
        name: "Applicant User",
        phone: "080-APPLICANT",
      };
    }

    console.log("🔐 Mock Login Response:", { email: emailLower, user });

    return {
      access: "mock-access-token-" + Date.now(),
      refresh: "mock-refresh-token-" + Date.now(),
      user,
    };
  },

  async register(data: RegisterFormData | RegisterRequest) {
    await delay();

    return {
      access: "mock-access-token-" + Date.now(),
      refresh: "mock-refresh-token-" + Date.now(),
      user: {
        id: "new-user-" + Date.now(),
        email: data.email,
        role: "applicant" as const,
        name: "New User",
        phone: "phone" in data ? data.phone : data.phone_number,
        nin: data.nin,
      },
    };
  },

  async logout() {
    await delay(300);
    return { success: true };
  },

  async getCurrentUser() {
    await delay();
    // Return stored user data or default applicant
    const userData = JSON.parse(sessionStorage.getItem("user_data") || "null");
    return (
      userData || {
        id: "1",
        email: "user@example.com",
        role: "applicant" as const,
        name: "Applicant User",
      }
    );
  },
};

// Mock Application Service
export const mockApplicationService = {
  async submitApplication(data: ApplicationFormData) {
    await delay(1500);

    const newApp: Application = {
      id: `APP-2025-${String(mockApplications.length + 1).padStart(3, "0")}`,
      name: data.fullName,
      nin: data.nin,
      status: "pending",
      payment: "Paid",
      dateProcessed: "-",
      dateApplied: new Date().toISOString().split("T")[0],
      village: data.village,
      lga: data.lga,
      state: data.state,
      email: data.email,
      phone: data.phone,
    };

    return newApp;
  },

  async getMyApplications() {
    await delay();
    return mockApplications.slice(0, 3); // Return first 3 as user's apps
  },

  async getApplicationById(id: string) {
    await delay();
    return mockApplications.find((app) => app.id === id) || mockApplications[0];
  },

  async getAllApplications(filters?: { status?: string }) {
    await delay();

    let filtered = [...mockApplications];

    if (filters?.status && filters.status !== "all") {
      filtered = filtered.filter((app) => app.status === filters.status);
    }

    return {
      results: filtered,
      count: filtered.length,
      next: null,
      previous: null,
    };
  },

  async updateApplicationStatus(id: string, status: string, comment?: string) {
    await delay();

    const app = mockApplications.find((a) => a.id === id);
    if (app) {
      app.status = status as ApplicationStatus;
      app.dateProcessed = new Date().toISOString().split("T")[0];
    }

    return app;
  },
};

// Mock Certificate Service
export const mockCertificateService = {
  async downloadCertificate(id: string) {
    await delay(1000);

    // Create a fake PDF blob
    const pdfContent = "Mock PDF content for certificate " + id;
    return new Blob([pdfContent], { type: "application/pdf" });
  },

  async verifyCertificate(certificateNumber: string) {
    await delay(1500);

    // Valid certificate IDs start with "CERT-"
    const isValid = certificateNumber.startsWith("CERT-");

    if (isValid) {
      return {
        valid: true,
        certificate: mockCertificateData,
      };
    } else {
      return {
        valid: false,
        message: "Certificate not found",
      };
    }
  },

  async getCertificatePreview(applicationId: string) {
    await delay();
    return mockCertificateData;
  },
};

// Mock Digitization Service
export const mockDigitizationService = {
  async submitDigitization(data: DigitizationFormData) {
    await delay(1500);

    const newReq: DigitizationRequest = {
      id: `DIGI-2025-${String(mockDigitizationRequests.length + 1).padStart(
        3,
        "0",
      )}`,
      name: data.full_name || "Applicant Name",
      nin: data.nin,
      status: "pending",
      payment: "Paid",
      date: new Date().toISOString().split("T")[0],
      certificateRef: data.certificateRef || "",
      uploadPreview: "uploaded_certificate.pdf",
    };

    return newReq;
  },

  async getMyDigitizationRequests() {
    await delay();
    return mockDigitizationRequests.slice(0, 2);
  },

  async getAllDigitizationRequests(filters?: { status?: string }) {
    await delay();
    void filters;
    return {
      results: mockDigitizationRequests,
      count: mockDigitizationRequests.length,
    };
  },

  async updateDigitizationStatus(id: string, status: string, comment?: string) {
    await delay();

    const req = mockDigitizationRequests.find((r) => r.id === id);
    if (req) {
      req.status = status as ApplicationStatus;
    }

    return req;
  },
};

// Mock Admin Service
export const mockAdminService = {
  async completeOnboarding(data: OnboardingFormData) {
    await delay(1000);
    void data;
    return { success: true, message: "Onboarding completed" };
  },

  async getDynamicFields(lgId?: string) {
    await delay();
    return mockDynamicFields;
  },

  async createDynamicField(fieldData: Omit<DynamicField, "id">) {
    await delay();

    const newField: DynamicField = {
      ...fieldData,
      id: String(mockDynamicFields.length + 1),
    };

    return newField;
  },

  async updateDynamicField(
    fieldId: string,
    fieldData: {
      field_label: string;
      field_name: string;
      is_required: boolean;
      field_type: string;
    },
  ) {
    await delay();
    return { ...fieldData, id: fieldId };
  },

  async deleteDynamicField(fieldId: string) {
    await delay();
    return { success: true };
  },

  async getDashboardStats(lgId?: string) {
    await delay();

    return {
      weeklyData: mockWeeklyData,
      approvalData: mockApprovalData,
      totalApplications: mockApplications.length,
      approvedCount: mockApplications.filter((a) => a.status === "approved")
        .length,
      pendingCount: mockApplications.filter((a) => a.status === "pending")
        .length,
      rejectedCount: mockApplications.filter((a) => a.status === "rejected")
        .length,
    };
  },

  async getApplicationTrends(period: string, lgId?: string) {
    await delay();
    return mockWeeklyData;
  },

  async getSettings(lgId?: string) {
    await delay();
    return {
      processingTimeDays: 7,
      applicationFee: 5000,
      processingFee: 500,
      autoApproval: false,
    };
  },

  async updateSettings(settings: {
    processingTimeDays?: number;
    applicationFee?: number;
    processingFee?: number;
    autoApproval?: boolean;
  }) {
    await delay();
    return { success: true, ...settings };
  },

  async getAllLGAs(filters?: { status?: string; state?: string }) {
    await delay();
    void filters;
    return {
      message: "Local governments retrieved successfully",
      data: mockLocalGovernments,
    };
  },

  async createLGAdmin(data: InviteLGAdminRequest) {
    await delay(1000);
    void data;
    return { success: true, message: "LG Admin created" };
  },

  async updateLGAStatus(lgaId: string, status: string) {
    await delay();
    return { success: true };
  },

  async getAuditLog(filters?: { page?: number; limit?: number }) {
    await delay();
    void filters;
    return {
      results: mockAuditLog,
      count: mockAuditLog.length,
    };
  },

  async getSuperAdminDashboard() {
    await delay();
    return {
      metric_cards: {
        total_lgas: mockLocalGovernments.length,
        total_applications: mockApplications.length,
        total_certificates: mockApplications.filter(
          (a) => a.status === "approved",
        ).length,
        total_revenue: mockLocalGovernments.reduce(
          (sum, lga) => sum + lga.revenue,
          0,
        ),
      },
      monthly_applications: mockMonthlyData.map((item) => ({
        month: `2024-${String(mockMonthlyData.indexOf(item) + 1).padStart(
          2,
          "0",
        )}-01`,
        total: item.applications,
      })),
      monthly_revenue: mockMonthlyData.map((item) => ({
        month: `2024-${String(mockMonthlyData.indexOf(item) + 1).padStart(
          2,
          "0",
        )}-01`,
        total: item.applications * 5500,
      })),
    };
  },

  async getLGAdminDashboard(lgId?: string) {
    await delay();
    return {
      metric_cards: {
        pending_applications: mockApplications.filter(
          (a) => a.status === "pending",
        ).length,
        approved_certificates: mockApplications.filter(
          (a) => a.status === "approved",
        ).length,
        rejected_applications: mockApplications.filter(
          (a) => a.status === "rejected",
        ).length,
        total_revenue:
          mockApplications.filter((a) => a.status === "approved").length * 5500,
      },
      weekly_data: mockWeeklyData,
      approval_data: mockApprovalData,
    };
  },

  async getAllStates() {
    await delay();

    const groupedStates = mockLocalGovernments.reduce(
      (acc, lga) => {
        const stateId = lga.state.id;
        if (!acc[stateId]) {
          acc[stateId] = {
            id: stateId,
            name: lga.state.name,
            code: null,
            created_at: lga.created_at,
            updated_at: lga.updated_at,
            local_governtments: [],
          };
        }

        acc[stateId].local_governtments.push({
          id: lga.id,
          name: lga.name,
        });

        return acc;
      },
      {} as Record<
        string,
        {
          id: string;
          name: string;
          code: string | null;
          created_at: string;
          updated_at: string;
          local_governtments: Array<{ id: string; name: string }>;
        }
      >,
    );

    return {
      data: {
        results: Object.values(groupedStates),
      },
    };
  },
};

// ============================================================================
// PAYMENT SERVICE MOCK
// ============================================================================

export const mockPaymentService = {
  async initializePayment(data: {
    email: string;
    amount: number;
    metadata?: Record<string, unknown>;
  }) {
    await delay(800);

    const reference = `PAY-${Date.now()}-${Math.floor(
      Math.random() * 1000000,
    )}`;

    console.log("Mock Payment Initialized:", {
      email: data.email,
      amount: data.amount,
      reference: reference,
      metadata: data.metadata,
    });

    return {
      status: true,
      message: "Authorization URL created",
      data: {
        authorization_url: `https://checkout.paystack.com/mock/${reference}`,
        access_code: "mock_access_code_" + Date.now(),
        reference: reference,
      },
    };
  },

  async verifyPayment(data: { reference: string }) {
    await delay(1500);

    console.log("Mock Payment Verified:", data.reference);

    // In mock mode, all payments succeed
    return {
      status: "success",
      message: "Verification successful",
      data: {
        reference: data.reference,
        amount: 550000, // Amount in kobo
        channel: "card",
        currency: "NGN",
        paid_at: new Date().toISOString(),
        status: "success",
      },
    };
  },

  async getPaymentHistory() {
    await delay();

    return [
      {
        id: 1,
        reference: "PAY-2025-123456",
        amount: 5500,
        status: "success",
        date: "2025-10-20",
        channel: "card",
      },
      {
        id: 2,
        reference: "PAY-2025-123457",
        amount: 2300,
        status: "success",
        date: "2025-10-18",
        channel: "bank_transfer",
      },
    ];
  },
};
