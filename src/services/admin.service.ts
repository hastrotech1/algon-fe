import apiClient from "./api";
import type {
  DynamicField,
  LGAFeeData,
  OnboardingFormData,
  CreateDynamicFieldResponse,
  UpdateDynamicFieldResponse,
} from "../Types/types";
import { mockAdminService } from "./mock.service";
import { getBackendErrorMessage } from "../utils/errorHelpers";

const USE_MOCK = false;

interface AdminServiceErrorData {
  message?: string;
  error?: string | { local_government?: string[] };
  detail?: string;
}

interface AdminServiceError {
  response?: {
    status?: number;
    data?: AdminServiceErrorData;
  };
  message?: string;
}

class AdminService {
  private toServiceError(error: unknown): AdminServiceError {
    if (typeof error === "object" && error !== null) {
      return error as AdminServiceError;
    }
    return {};
  }

  private normalizeLgaFeeItem(fee: Partial<LGAFeeData>) {
    return {
      ...fee,
      application_fee: Number.parseFloat(fee?.application_fee ?? "0"),
      digitization_fee: Number.parseFloat(fee?.digitization_fee ?? "0"),
      regeneration_fee: Number.parseFloat(fee?.regeneration_fee ?? "0"),
    };
  }

  private normalizeDynamicField(field: {
    id?: unknown;
    field_label?: unknown;
    field_name?: unknown;
    field_type?: unknown;
    is_required?: unknown;
    dropdown_options?: unknown;
    local_government?: unknown;
  }): DynamicField {
    const localGovernment = field.local_government as
      | string
      | { id?: string; name?: string }
      | undefined;
    const parsedFieldType = String(field.field_type || "text");
    const allowedFieldTypes: DynamicField["field_type"][] = [
      "text",
      "number",
      "date",
      "file",
      "dropdown",
    ];
    const normalizedFieldType: DynamicField["field_type"] =
      allowedFieldTypes.includes(parsedFieldType as DynamicField["field_type"])
        ? (parsedFieldType as DynamicField["field_type"])
        : "text";

    return {
      id: String(field.id || ""),
      field_label: String(field.field_label || ""),
      field_name: String(field.field_name || ""),
      field_type: normalizedFieldType,
      is_required: Boolean(field.is_required),
      dropdown_options: Array.isArray(field.dropdown_options)
        ? (field.dropdown_options as string[])
        : undefined,
      local_government:
        typeof localGovernment === "string"
          ? localGovernment
          : localGovernment?.id
            ? {
                id: localGovernment.id,
                name: localGovernment.name || "",
              }
            : undefined,
    };
  }

  // Admin Onboarding
  async completeOnboarding(data: OnboardingFormData) {
    if (USE_MOCK) {
      return mockAdminService.completeOnboarding(data);
    }
    const response = await apiClient.post("/admin/onboarding/", data);
    return response.data;
  }

  // Dynamic Fields Management
  async getDynamicFields(lgId?: string) {
    if (USE_MOCK) {
      return mockAdminService.getDynamicFields(lgId);
    }

    try {
      const response = await apiClient.get("/admin/response-fields");
      const fields = response.data?.data || [];
      return Array.isArray(fields)
        ? fields.map((field: unknown) =>
            this.normalizeDynamicField(field as Record<string, unknown>),
          )
        : [];
    } catch (error: unknown) {
      console.error("Failed to fetch dynamic fields:", error);
      // Return empty array if endpoint fails
      return [];
    }
  }

  async createDynamicField(fieldData: {
    field_label: string;
    field_name?: string;
    is_required: boolean;
    field_type: "text" | "number" | "date" | "file" | "dropdown";
  }) {
    if (USE_MOCK) {
      return mockAdminService.createDynamicField({
        ...fieldData,
        field_name:
          fieldData.field_name ||
          fieldData.field_label.toLowerCase().replace(/\s+/g, "_"),
      });
    }

    try {
      // Get current user to extract local_government ID
      const authService = (await import("./auth.service")).default;
      const userInfo = await authService.getCurrentUser();

      const lgId = userInfo.local_government;

      if (!lgId) {
        throw new Error(
          "Local government not found. Please ensure you are logged in as an LG admin.",
        );
      }

      // Generate field_name from field_label if not provided
      const field_name =
        fieldData.field_name ||
        fieldData.field_label.toLowerCase().replace(/\s+/g, "_");

      const requestBody = {
        ...fieldData,
        field_name,
        local_government: lgId,
      };

      console.log("Creating dynamic field with data:", requestBody);

      const response = await apiClient.post(
        "/admin/create-response-field",
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      console.log("Create dynamic field response:", response.data);
      return this.normalizeDynamicField(response.data?.data);
    } catch (error: unknown) {
      const serviceError = this.toServiceError(error);
      // Log full error for debugging
      console.error("Create dynamic field error:", {
        status: serviceError.response?.status,
        data: serviceError.response?.data,
        message: serviceError.message,
        fullError: error,
      });

      const status = serviceError.response?.status;
      const message =
        serviceError.response?.data?.message ||
        (typeof serviceError.response?.data?.error === "string"
          ? serviceError.response?.data?.error
          : undefined) ||
        "Failed to create dynamic response field";

      if (status === 400) {
        throw new Error(
          message || "Invalid field data. Please check all required fields.",
        );
      } else if (status === 401) {
        throw new Error("Authentication failed. Please log in again.");
      } else if (status === 403) {
        throw new Error(
          "Access denied. You do not have permission to create response fields.",
        );
      } else if (status === 409) {
        throw new Error(
          "Duplicate field name. A field with this name already exists for this LGA.",
        );
      } else if (status === 422) {
        throw new Error(
          message || "Validation error. Please check the field data.",
        );
      } else if ((status || 0) >= 500) {
        throw new Error("Server error. Please try again later.");
      }

      throw new Error(message);
    }
  }

  async updateDynamicField(
    fieldId: string,
    fieldData: {
      field_label: string;
      field_name: string;
      is_required: boolean;
      field_type: string;
    },
  ) {
    if (USE_MOCK) {
      return mockAdminService.updateDynamicField(fieldId, fieldData);
    }

    try {
      // Validate user has local_government
      const authService = (await import("./auth.service")).default;
      const userInfo = await authService.getCurrentUser();

      const lgId = userInfo.local_government;

      if (!lgId) {
        throw new Error(
          "Local government not found. Please ensure you are logged in as an LG admin.",
        );
      }

      const response = await apiClient.patch<UpdateDynamicFieldResponse>(
        `/admin/response-fields/${fieldId}`,
        fieldData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      return this.normalizeDynamicField(response.data?.data);
    } catch (error: unknown) {
      const serviceError = this.toServiceError(error);
      const status = serviceError.response?.status;
      const message =
        serviceError.response?.data?.message ||
        "Failed to update dynamic field";

      if (status === 400) {
        throw new Error(
          message || "Invalid field data. Please check all fields.",
        );
      } else if (status === 401) {
        throw new Error("Authentication failed. Please log in again.");
      } else if (status === 403) {
        throw new Error(
          "Access denied. You do not have permission to update this field.",
        );
      } else if (status === 404) {
        throw new Error("Dynamic field not found. Please check the field ID.");
      } else if (status === 422) {
        throw new Error(
          message || "Validation error. Please check the field data.",
        );
      } else if ((status || 0) >= 500) {
        throw new Error("Server error. Please try again later.");
      }

      throw new Error(message);
    }
  }

  async deleteDynamicField(fieldId: string) {
    if (USE_MOCK) {
      return mockAdminService.deleteDynamicField(fieldId);
    }

    try {
      // Validate user has local_government
      const authService = (await import("./auth.service")).default;
      const userInfo = await authService.getCurrentUser();

      const lgId = userInfo.local_government;

      if (!lgId) {
        throw new Error(
          "Local government not found. Please ensure you are logged in as an LG admin.",
        );
      }

      const response = await apiClient.delete(
        `/admin/response-fields/${fieldId}`,
      );
      return response.data;
    } catch (error: unknown) {
      const serviceError = this.toServiceError(error);
      let message = "Failed to delete response field";

      if (serviceError.response?.status === 400) {
        message = "Invalid or malformed response field ID";
      } else if (serviceError.response?.status === 401) {
        message = "Authentication failed. Please log in again.";
      } else if (serviceError.response?.status === 403) {
        message = "You are not allowed to delete this response field";
      } else if (serviceError.response?.status === 404) {
        message = "Response field not found";
      } else if ((serviceError.response?.status || 0) >= 500) {
        message = "Server error. Please try again later.";
      }

      throw new Error(message);
    }
  }

  // Dashboard Analytics
  async getDashboardStats(lgId?: string) {
    if (USE_MOCK) {
      return mockAdminService.getDashboardStats(lgId);
    }
    const endpoint = lgId
      ? `/analytics/dashboard/?lg=${lgId}`
      : "/analytics/dashboard/";
    const response = await apiClient.get(endpoint);
    return response.data;
  }

  async getApplicationTrends(period: "week" | "month" | "year", lgId?: string) {
    if (USE_MOCK) {
      return mockAdminService.getApplicationTrends(period, lgId);
    }
    const params = new URLSearchParams({ period });
    if (lgId) params.append("lg", lgId);

    const response = await apiClient.get(
      `/analytics/trends/?${params.toString()}`,
    );
    return response.data;
  }

  // Settings
  async getSettings(lgId?: string) {
    const endpoint = lgId ? `/settings/?lg=${lgId}` : "/settings/";
    const response = await apiClient.get(endpoint);
    return response.data;
  }

  async updateSettings(settings: {
    processingTimeDays?: number;
    applicationFee?: number;
    processingFee?: number;
    autoApproval?: boolean;
  }) {
    const response = await apiClient.patch("/settings/", settings);
    return response.data;
  }

  async uploadSignature(file: File) {
    if (USE_MOCK) {
      return {
        message: "Signature uploaded successfully",
      };
    }

    const formData = new FormData();
    formData.append("signature", file);

    const response = await apiClient.post("/admin/signature-upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  }

  // Super Admin - LGA Management
  async getAllLGAs(filters?: { status?: string; state?: string }) {
    if (USE_MOCK) {
      return mockAdminService.getAllLGAs(filters);
    }

    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, value.toString());
          }
        });
      }

      const queryString = params.toString();
      const url = queryString
        ? `/admin/super/local-governments?${queryString}`
        : "/admin/super/local-governments";

      const response = await apiClient.get(url);
      return response.data;
    } catch (error: unknown) {
      const serviceError = this.toServiceError(error);
      const status = serviceError.response?.status;
      const message =
        serviceError.response?.data?.message ||
        "Failed to load local governments";

      if (status === 401) {
        throw new Error("Authentication failed. Please log in again.");
      } else if (status === 403) {
        throw new Error(
          "Access denied. Only super admins can view local governments.",
        );
      } else if (status === 429) {
        throw new Error(
          "Too many requests. Please wait a moment before trying again.",
        );
      } else if ((status || 0) >= 500) {
        throw new Error("Server error. Please try again later.");
      }

      throw new Error(message);
    }
  }

  async createLGAdmin(data: {
    state: string;
    lga: string;
    first_name: string;
    last_name: string;
    email: string;
  }) {
    if (USE_MOCK) {
      return mockAdminService.createLGAdmin(data);
    }

    try {
      const response = await apiClient.post("/admin/super/invite-lg", data);
      return response.data;
    } catch (error: unknown) {
      const serviceError = this.toServiceError(error);
      const status = serviceError.response?.status;
      const message =
        serviceError.response?.data?.message || "Failed to invite LG admin";

      if (status === 400) {
        throw new Error(
          message || "Invalid request. Please check all required fields.",
        );
      } else if (status === 401) {
        throw new Error("Authentication failed. Please log in again.");
      } else if (status === 403) {
        throw new Error(
          "Access denied. Only super admins can invite LG admins.",
        );
      } else if (status === 409) {
        throw new Error(
          "An LG admin with this email already exists for the specified LGA.",
        );
      } else if (status === 422) {
        throw new Error(
          message || "Validation error. Please check the form fields.",
        );
      } else if ((status || 0) >= 500) {
        throw new Error("Server error. Please try again later.");
      }

      throw new Error(message);
    }
  }

  async updateLGAStatus(lgaId: string, status: "active" | "inactive") {
    if (USE_MOCK) {
      return mockAdminService.updateLGAStatus(lgaId, status);
    }
    const response = await apiClient.patch(`/lgas/${lgaId}/`, { status });
    return response.data;
  }

  // Audit Log
  async getAuditLog(filters?: { page?: number; limit?: number }) {
    if (USE_MOCK) {
      return mockAdminService.getAuditLog(filters);
    }
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await apiClient.get(`/audit-log/?${params.toString()}`);
    return response.data;
  }

  // Super Admin - Audit Logs
  async getAuditLogs(params?: {
    page?: number;
    page_size?: number;
    action_type?: string;
    table_name?: string;
    user?: string;
  }) {
    if (USE_MOCK) {
      const mockResponse = await mockAdminService.getAuditLog(params);
      return {
        count: mockResponse.count || 0,
        next: null,
        previous: null,
        results: mockResponse.results || [],
      };
    }

    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const queryString = queryParams.toString();
    const url = queryString
      ? `/admin/super/audit-logs?${queryString}`
      : "/admin/super/audit-logs";

    const response = await apiClient.get(url);
    return (
      response.data?.data || {
        count: 0,
        next: null,
        previous: null,
        results: [],
      }
    );
  }

  async getAuditLogById(id: string) {
    if (USE_MOCK) {
      // Mock service returns single audit log by filtering
      const allLogs = await mockAdminService.getAuditLog();
      const log = allLogs.results?.find((log) => log.id === id);
      return log || null;
    }

    const response = await apiClient.get(`/admin/super/audit-log/${id}`);
    return response.data;
  }

  // Super Admin - Invite LG Admin
  async inviteLGAdmin(data: {
    state: string;
    lga: string;
    first_name: string;
    last_name: string;
    email: string;
  }) {
    if (USE_MOCK) {
      return mockAdminService.createLGAdmin(data);
    }

    try {
      const response = await apiClient.post("/admin/super/invite-lg", data, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      return response.data;
    } catch (error: unknown) {
      const serviceError = this.toServiceError(error);
      const status = serviceError.response?.status;
      const message =
        serviceError.response?.data?.message || "Failed to invite LG admin";

      if (status === 400) {
        throw new Error(
          message || "Invalid request. Please check all required fields.",
        );
      } else if (status === 401) {
        throw new Error("Authentication failed. Please log in again.");
      } else if (status === 403) {
        throw new Error(
          "Access denied. Only super admins can invite LG admins.",
        );
      } else if (status === 409) {
        throw new Error(
          "An LG admin with this email already exists for the specified LGA.",
        );
      } else if (status === 422) {
        throw new Error(
          message || "Validation error. Please check the form fields.",
        );
      } else if ((status || 0) >= 500) {
        throw new Error("Server error. Please try again later.");
      }

      throw new Error(message);
    }
  }

  // Super Admin - Update LG Admin
  async updateLGAdmin(
    adminId: string,
    data: {
      first_name?: string;
      last_name?: string;
      email?: string;
    },
  ) {
    if (USE_MOCK) {
      return {
        message: "LG admin updated successfully",
        data: {
          id: adminId,
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          role: "lg-admin",
          email_verified: false,
        },
      };
    }

    try {
      const response = await apiClient.put(
        `/admin/super/lg-update/${adminId}`,
        data,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      return response.data;
    } catch (error: unknown) {
      const serviceError = this.toServiceError(error);
      const status = serviceError.response?.status;
      const message =
        serviceError.response?.data?.message || "Failed to update LG admin";

      if (status === 400) {
        throw new Error(message || "Invalid request. Please check the fields.");
      } else if (status === 401) {
        throw new Error("Authentication failed. Please log in again.");
      } else if (status === 403) {
        throw new Error(
          "Access denied. Only super admins can update LG admins.",
        );
      } else if (status === 404) {
        throw new Error("LG admin not found. Please check the admin ID.");
      } else if (status === 422) {
        throw new Error(
          message || "Validation error. Please check the form fields.",
        );
      } else if ((status || 0) >= 500) {
        throw new Error("Server error. Please try again later.");
      }

      throw new Error(message);
    }
  }

  // Super Admin - Dashboard
  async getSuperAdminDashboard() {
    if (USE_MOCK) {
      return mockAdminService.getSuperAdminDashboard();
    }

    try {
      const response = await apiClient.get("/admin/super/dashboard");
      return response.data;
    } catch (error: unknown) {
      const serviceError = this.toServiceError(error);
      const status = serviceError.response?.status;
      const message =
        serviceError.response?.data?.message || "Failed to load dashboard";

      if (status === 401) {
        throw new Error("Authentication failed. Please log in again.");
      } else if (status === 403) {
        throw new Error(
          "Access denied. You do not have permission to view the super admin dashboard.",
        );
      } else if (status === 429) {
        throw new Error(
          "Too many requests. Please wait a moment before trying again.",
        );
      } else if ((status || 0) >= 500) {
        throw new Error("Server error. Please try again later.");
      }

      throw new Error(message);
    }
  }

  // LGA Fee Management
  // LGA Fee Management
  async getLGAFee() {
    try {
      const response = await apiClient.get(
        "/application-fees/local-government",
      );
      const fees = Array.isArray(response.data?.data)
        ? response.data.data.map((fee: unknown) =>
            this.normalizeLgaFeeItem(fee as Partial<LGAFeeData>),
          )
        : [];

      return {
        ...response.data,
        data: fees,
      };
    } catch (error: unknown) {
      const serviceError = this.toServiceError(error);
      const status = serviceError.response?.status;
      const message =
        serviceError.response?.data?.message ||
        "Failed to load LGA fee configuration";

      if (status === 401) {
        throw new Error("Authentication failed. Please log in again.");
      } else if (status === 403) {
        throw new Error(
          "Access denied. You do not have permission to view fee configuration.",
        );
      } else if (status === 404) {
        throw new Error("Fee configuration not found for this LGA.");
      } else if (status === 429) {
        throw new Error(
          "Too many requests. Please wait a moment before trying again.",
        );
      } else if ((status || 0) >= 500) {
        throw new Error("Server error. Please try again later.");
      }

      throw new Error(message);
    }
  }

  async createLGAFee(data: {
    application_fee: number;
    digitization_fee: number;
    regeneration_fee: number;
  }) {
    try {
      const response = await apiClient.post(
        "/application-fees/local-government",
        data,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      const normalizedData = Array.isArray(response.data?.data)
        ? response.data.data.map((fee: unknown) =>
            this.normalizeLgaFeeItem(fee as Partial<LGAFeeData>),
          )
        : response.data?.data
          ? this.normalizeLgaFeeItem(response.data.data as Partial<LGAFeeData>)
          : response.data?.data;

      return {
        ...response.data,
        data: normalizedData,
      };
    } catch (error: unknown) {
      const serviceError = this.toServiceError(error);
      const status = serviceError.response?.status;
      const message =
        serviceError.response?.data?.message ||
        "Failed to create LGA fee configuration";

      if (status === 400) {
        throw new Error(
          message || "Invalid fee data. Please check all fields.",
        );
      } else if (status === 401) {
        throw new Error("Authentication failed. Please log in again.");
      } else if (status === 403) {
        throw new Error(
          "Access denied. You do not have permission to create fee configuration.",
        );
      } else if (status === 409) {
        // Handle specific error format: {"error": { "local_government": [...] }}
        const structuredError = serviceError.response?.data?.error;
        const errorDetail =
          typeof structuredError === "object" && structuredError !== null
            ? structuredError.local_government
            : undefined;
        if (errorDetail && Array.isArray(errorDetail)) {
          const firstError =
            errorDetail[0] || "Fee configuration already exists for this LGA.";
          throw new Error(
            `${firstError} Please use Update Fees instead of creating a new one.`,
          );
        }
        throw new Error(
          "Fee configuration already exists for this Local Government. Please use Update Fees instead.",
        );
      } else if (status === 422) {
        throw new Error(
          message || "Validation error. Please check the fee amounts.",
        );
      } else if ((status || 0) >= 500) {
        throw new Error("Server error. Please try again later.");
      }

      throw new Error(message);
    }
  }

  async updateLGAFee(data: {
    application_fee: number;
    digitization_fee: number;
    regeneration_fee: number;
  }) {
    try {
      const response = await apiClient.patch(
        "/application-fees/local-government",
        data,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      const normalizedData = Array.isArray(response.data?.data)
        ? response.data.data.map((fee: unknown) =>
            this.normalizeLgaFeeItem(fee as Partial<LGAFeeData>),
          )
        : response.data?.data
          ? this.normalizeLgaFeeItem(response.data.data as Partial<LGAFeeData>)
          : response.data?.data;

      return {
        ...response.data,
        data: normalizedData,
      };
    } catch (error: unknown) {
      const serviceError = this.toServiceError(error);
      const status = serviceError.response?.status;
      const message =
        serviceError.response?.data?.message ||
        "Failed to update LGA fee configuration";

      if (status === 400) {
        throw new Error(
          message || "Invalid fee data. Please check all fields.",
        );
      } else if (status === 401) {
        throw new Error("Authentication failed. Please log in again.");
      } else if (status === 403) {
        throw new Error(
          "Access denied. You do not have permission to update fee configuration.",
        );
      } else if (status === 404) {
        throw new Error("Fee configuration not found for this LGA.");
      } else if (status === 422) {
        throw new Error(
          message || "Validation error. Please check the fee amounts.",
        );
      } else if ((status || 0) >= 500) {
        throw new Error("Server error. Please try again later.");
      }

      throw new Error(message);
    }
  }

  // Admin - Application Management
  async getApplicationsReport(params?: {
    application_type?: "certificate" | "digitization";
    [key: string]: string | number | boolean | undefined;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const queryString = queryParams.toString();
    const url = queryString
      ? `/certificates/applications?${queryString}`
      : "/certificates/applications";

    const response = await apiClient.get(url);
    return response.data;
  }

  async exportCSV(type: "applications" | "digitizations") {
    const response = await apiClient.post(
      `/admin/export-csv?type=${type}`,
      undefined,
      {
        responseType: "blob",
      },
    );
    return response.data;
  }

  async viewSingleApplication(
    applicationId: string,
    applicationType: "certificate" | "digitization",
  ) {
    try {
      const response = await apiClient.get(
        `/admin/applications/${applicationId}?application_type=${applicationType}`,
      );
      return response.data;
    } catch (error: unknown) {
      const serviceError = this.toServiceError(error);
      let message = "Failed to retrieve application details";

      if (serviceError.response?.status === 400) {
        message = "Invalid application ID or type";
      } else if (serviceError.response?.status === 401) {
        message = "Authentication failed. Please log in again.";
      } else if (serviceError.response?.status === 403) {
        message = "You are not authorized to view this application";
      } else if (serviceError.response?.status === 404) {
        message = "Application not found";
      } else if ((serviceError.response?.status || 0) >= 500) {
        message = "Server error. Please try again later.";
      }

      throw new Error(message);
    }
  }

  async getAllApplications(params?: {
    application_type?: "certificate" | "digitization";
    page?: number;
    limit?: number;
    status?: string;
  }) {
    try {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, value.toString());
          }
        });
      }

      const queryString = queryParams.toString();
      const url = queryString
        ? `/admin/applications?${queryString}`
        : "/admin/applications";

      const response = await apiClient.get(url);
      const payload = response.data as {
        count?: number;
        next?: string | null;
        previous?: string | null;
        results?: unknown[];
        data?: {
          count?: number;
          next?: string | null;
          previous?: string | null;
          results?: unknown[];
        };
      };

      if (payload?.data && Array.isArray(payload.data.results)) {
        return {
          count: payload.data.count ?? payload.data.results.length,
          next: payload.data.next ?? null,
          previous: payload.data.previous ?? null,
          results: payload.data.results,
        };
      }

      return {
        count:
          payload?.count ??
          (Array.isArray(payload?.results) ? payload.results.length : 0),
        next: payload?.next ?? null,
        previous: payload?.previous ?? null,
        results: Array.isArray(payload?.results) ? payload.results : [],
      };
    } catch (error: unknown) {
      const serviceError = this.toServiceError(error);
      let message = "Failed to retrieve applications";

      if (serviceError.response?.status === 400) {
        message = "Invalid query parameters";
      } else if (serviceError.response?.status === 401) {
        message = "Authentication failed. Please log in again.";
      } else if (serviceError.response?.status === 403) {
        message = "You do not have permission to view applications";
      } else if ((serviceError.response?.status || 0) >= 500) {
        message = "Server error. Please try again later.";
      }

      throw new Error(message);
    }
  }

  async getDigitizationOverview() {
    try {
      const response = await apiClient.get("/digitization/overview");
      return response.data;
    } catch (error: unknown) {
      const serviceError = this.toServiceError(error);
      let message = "Failed to retrieve digitization overview";

      if (serviceError.response?.status === 401) {
        message = "Authentication failed. Please log in again.";
      } else if (serviceError.response?.status === 403) {
        message = "You are not authorized to access digitization overview";
      } else if ((serviceError.response?.status || 0) >= 500) {
        message = "Server error. Please try again later.";
      }

      throw new Error(message);
    }
  }

  // Admin - Dynamic Fields
  async createDynamicResponseField(data: {
    local_government: string;
    field_label: string;
    field_name: string;
    is_required: boolean;
    field_type: "file" | "text" | "number" | "date" | "dropdown";
  }) {
    const response = await apiClient.post(
      "/admin/create-response-field",
      data,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  }

  // Admin - Application Actions
  async manageApplication(
    applicationId: string,
    data: {
      application_type: "certificate" | "digitization";
      action: "approved" | "rejected";
      remarks?: string;
    },
  ) {
    try {
      const response = await apiClient.patch(
        `/admin/applications/${applicationId}?application_type=${data.application_type}`,
        {
          application_type: data.application_type,
          action: data.action,
          remarks: data.remarks,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      return response.data;
    } catch (error: unknown) {
      const serviceError = this.toServiceError(error);
      let message = "Failed to manage application";
      const backendMessage = getBackendErrorMessage(error, message);

      if (serviceError.response?.status === 400) {
        message = backendMessage;
      } else if (serviceError.response?.status === 401) {
        message = "Authentication failed. Please log in again.";
      } else if (serviceError.response?.status === 403) {
        message = "You are not authorized to manage this application";
      } else if (serviceError.response?.status === 404) {
        message = "Application not found";
      } else if (serviceError.response?.status === 422) {
        message = backendMessage;
      } else if ((serviceError.response?.status || 0) >= 500) {
        message = "Server error. Please try again later.";
      } else {
        message = backendMessage;
      }

      throw new Error(message);
    }
  }

  // LG Admin Dashboard
  async getLGAdminDashboard() {
    if (USE_MOCK) {
      return mockAdminService.getDashboardStats();
    }

    try {
      const response = await apiClient.get("/admin/dashboard");
      return response.data;
    } catch (error: unknown) {
      const serviceError = this.toServiceError(error);
      let message = "Failed to retrieve dashboard data";

      if (serviceError.response?.status === 401) {
        message = "Authentication failed. Please log in again.";
      } else if (serviceError.response?.status === 403) {
        message = "You are not authorized to access the dashboard";
      } else if ((serviceError.response?.status || 0) >= 500) {
        message = "Server error. Please try again later.";
      }

      throw new Error(message);
    }
  }

  // Admin - Report Analytics
  async getReportAnalytics() {
    try {
      const response = await apiClient.get("/admin/report-analytics");
      return response.data;
    } catch (error: unknown) {
      const serviceError = this.toServiceError(error);
      let message = "Failed to retrieve report analytics";

      if (serviceError.response?.status === 401) {
        message = "Authentication failed. Please log in again.";
      } else if (serviceError.response?.status === 403) {
        message = "You are not authorized to view analytics";
      } else if ((serviceError.response?.status || 0) >= 500) {
        message = "Server error. Please try again later.";
      }

      throw new Error(message);
    }
  }

  // Utility - Get All States and LGs
  async getAllStatesAndLGs() {
    if (USE_MOCK) {
      return mockAdminService.getAllStates();
    }

    // Fetch all states at once with a high limit (Nigeria has 37 states)
    const response = await apiClient.get("/all-states?limit=100");
    return response.data;
  }
}

export default new AdminService();
