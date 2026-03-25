import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CertificateDownloadDesign } from "./certificateDownloadDesign";
import { toast } from "sonner";
import { certificateService } from "../../services"; // ✅ Import service
import type { MyCertificate } from "../../Types/types";

interface CertificatePreviewData {
  fullName?: string;
  dateOfBirth?: string;
  localGovernment?: string;
  state?: string;
}

interface CertificateDownloadProps {
  isDigitized?: boolean;
}

export function CertificateDownload({
  isDigitized = false,
}: CertificateDownloadProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const certificateId = searchParams.get("cert_id");
  const certificateTypeParam = searchParams.get("type");
  const certificateType: "certificate" | "digitization" =
    certificateTypeParam === "digitization" ? "digitization" : "certificate";
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedCertificate, setSelectedCertificate] =
    useState<MyCertificate | null>(null);
  const [previewData, setPreviewData] = useState<CertificatePreviewData | null>(
    null,
  );

  useEffect(() => {
    const loadCertificate = async () => {
      try {
        const response = await certificateService.getMyCertificates();
        if (!certificateId) {
          const fallbackCertificate = response.data.find(
            (certificate) =>
              (certificate.is_downloadable ?? !certificate.is_revoked) === true,
          );
          setSelectedCertificate(fallbackCertificate || response.data[0] || null);
          return;
        }

        const matchedCertificate = response.data.find(
          (certificate) =>
            certificate.certificate_number === certificateId ||
            certificate.id === certificateId ||
            certificate.application === certificateId,
        );

        setSelectedCertificate(matchedCertificate || null);
      } catch (error) {
        setSelectedCertificate(null);
      }
    };

    loadCertificate();
  }, [certificateId]);

  useEffect(() => {
    const loadCertificatePreview = async () => {
      const applicationId = selectedCertificate?.application;

      if (!applicationId) {
        setPreviewData(null);
        return;
      }

      try {
        const response =
          await certificateService.getCertificatePreview(applicationId);

        const payload =
          typeof response === "object" &&
          response !== null &&
          "data" in response
            ? (response as { data?: unknown }).data
            : response;

        const previewPayload =
          (payload as {
            full_name?: string;
            holderName?: string;
            name?: string;
            date_of_birth?: string;
            dob?: string;
            local_government?: { name?: string } | string;
            lga?: string;
            state?: { name?: string } | string;
          }) || {};

        const localGovernment =
          typeof previewPayload.local_government === "object"
            ? previewPayload.local_government?.name
            : previewPayload.local_government || previewPayload.lga;

        const state =
          typeof previewPayload.state === "object"
            ? previewPayload.state?.name
            : previewPayload.state;

        setPreviewData({
          fullName:
            previewPayload.full_name ||
            previewPayload.holderName ||
            previewPayload.name,
          dateOfBirth: previewPayload.date_of_birth || previewPayload.dob,
          localGovernment,
          state,
        });
      } catch (error) {
        setPreviewData(null);
      }
    };

    loadCertificatePreview();
  }, [selectedCertificate?.application]);

  // ✅ Real download handler
  const handleDownload = async () => {
    const downloadCertificateId =
      selectedCertificate?.certificate_number || certificateId;

    if (!downloadCertificateId) {
      toast.error("Certificate ID not found");
      return;
    }

    setIsDownloading(true);

    try {
      // ✅ Call API service
      const blob = await certificateService.downloadCertificate(
        downloadCertificateId,
        certificateType,
      );

      // ✅ Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `certificate-${downloadCertificateId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Certificate downloaded successfully!");
    } catch (error: any) {
      console.error("Download error:", error);
      toast.error(
        error.response?.data?.message || "Failed to download certificate",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <CertificateDownloadDesign
      onNavigate={(page: string) => {
        const routes: Record<string, string> = {
          verify: "/verify",
          "applicant-dashboard": "/applicant-dashboard",
        };
        navigate(routes[page] || "/");
      }}
      isDigitized={isDigitized}
      handleDownload={handleDownload}
      isDownloading={isDownloading} // ✅ Pass loading state
      certificateNumber={
        selectedCertificate?.certificate_number || certificateId || undefined
      }
      issueDate={selectedCertificate?.issue_date}
      verificationCode={selectedCertificate?.verification_code}
      fullName={previewData?.fullName}
      dateOfBirth={previewData?.dateOfBirth}
      localGovernment={previewData?.localGovernment}
      state={previewData?.state}
    />
  );
}
