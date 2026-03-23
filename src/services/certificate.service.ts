import apiClient from "./api";
import { mockCertificateService } from "./mock.service"; // ✅ Import correct mock
import type {
  CertificateVerificationResponse,
  MyCertificate,
} from "../Types/types";

const USE_MOCK = false; // API integration enabled

interface CertificateServiceErrorData {
  message?: string;
  error?: string;
}

interface CertificateServiceError {
  response?: {
    status?: number;
    data?: Blob | CertificateServiceErrorData;
  };
}

const toCertificateServiceError = (error: unknown): CertificateServiceError => {
  if (typeof error === "object" && error !== null) {
    return error as CertificateServiceError;
  }
  return {};
};

class CertificateService {
  async getMyCertificates(): Promise<{
    message: string;
    data: MyCertificate[];
  }> {
    if (USE_MOCK) {
      return {
        message: "Certificates retrieved successfully",
        data: [],
      };
    }

    const response = await apiClient.get<{
      message: string;
      data: MyCertificate[];
    }>("/my-certificates");

    return response.data;
  }

  async downloadCertificate(
    certificateNumber: string,
    type: "certificate" | "digitization" = "certificate",
  ): Promise<Blob> {
    if (USE_MOCK) {
      return mockCertificateService.downloadCertificate(certificateNumber); // ✅ Use correct mock
    }

    try {
      const response = await apiClient.get(`/my-certificates/download`, {
        params: {
          cert_id: certificateNumber,
          type: type,
        },
        responseType: "blob",
      });
      return response.data;
    } catch (error: unknown) {
      const certificateError = toCertificateServiceError(error);
      const status = certificateError.response?.status;

      // Try to parse error message from blob response
      let message = "Failed to download certificate";
      if (certificateError.response?.data instanceof Blob) {
        try {
          const text = await certificateError.response.data.text();
          const errorData = JSON.parse(text) as CertificateServiceErrorData;
          message = errorData.error || errorData.message || message;
        } catch (e) {
          // Keep default message if parsing fails
        }
      } else {
        const responseData = certificateError.response?.data as
          | CertificateServiceErrorData
          | undefined;
        message = responseData?.error || responseData?.message || message;
      }

      if (status === 400) {
        if (message.includes("missing")) {
          throw new Error("Certificate ID is required.");
        } else if (message.includes("Unsupported")) {
          throw new Error("Unsupported certificate type.");
        }
        throw new Error(message);
      } else if (status === 403) {
        if (message.includes("expired")) {
          throw new Error(
            "Certificate expired. Please make payment for certificate regeneration to download.",
          );
        } else if (message.includes("another user")) {
          throw new Error("You cannot access another user's certificate.");
        }
        throw new Error("Access denied. " + message);
      } else if (status === 404) {
        throw new Error("Certificate not found.");
      } else if (status === 401) {
        throw new Error(
          "Unauthorized. Please log in to download certificates.",
        );
      } else if (status >= 500) {
        throw new Error("Server error. Please try again later.");
      }

      throw new Error(message);
    }
  }

  async verifyCertificate(
    certificateNumber: string,
  ): Promise<CertificateVerificationResponse> {
    if (USE_MOCK) {
      return mockCertificateService.verifyCertificate(certificateNumber); // ✅ Use correct mock
    }

    try {
      const response = await apiClient.post(`/certificate/verify`, {
        cert_id: certificateNumber,
      });
      return response.data;
    } catch (error: unknown) {
      const certificateError = toCertificateServiceError(error);
      const status = certificateError.response?.status;
      const responseData = certificateError.response?.data as
        | CertificateServiceErrorData
        | undefined;
      const message =
        responseData?.message || "Certificate verification failed";

      if (status === 400) {
        throw new Error(
          "Invalid or missing certificate ID. Please check the certificate number.",
        );
      } else if (status === 401 || status === 403) {
        throw new Error("Unauthorized. Please log in to verify certificates.");
      } else if (status === 404) {
        throw new Error(
          "Certificate not found. Please verify the certificate number.",
        );
      } else if (status >= 500) {
        throw new Error("Server error. Please try again later.");
      }

      throw new Error(message);
    }
  }

  async getCertificatePreview(applicationId: string) {
    if (USE_MOCK) {
      return mockCertificateService.getCertificatePreview(applicationId); // ✅ Use correct mock
    }
    const response = await apiClient.get(
      `/certificates/preview/${applicationId}/`,
    );
    return response.data;
  }
}

export default new CertificateService();
