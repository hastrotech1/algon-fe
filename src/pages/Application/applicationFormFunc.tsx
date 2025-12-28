import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ApplicationFormDesign } from "./applicationFormDesign";
import { toast } from "sonner";
import type { ApplicationFormData } from "../../Types/types";
import { validateApplicationForm } from "../../utils/validation";
import { applicationService, adminService } from "../../services";
import { useFileUploadEnhanced } from "../../hooks/useFileUploadEnhanced";

export function ApplicationForm() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const [formData, setFormData] = useState<ApplicationFormData>({
    fullName: "",
    nin: "",
    dob: "",
    state: "",
    lga: "",
    village: "",
    phone: "",
    email: "",
    profilePhoto: null,
    ninSlip: null,
    landmark: "",
    address: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitializingPayment, setIsInitializingPayment] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [applicationId, setApplicationId] = useState<string>("");
  const [certificateAmount, setCertificateAmount] = useState<number>(0);

  // States and LGAs
  const [states, setStates] = useState<any[]>([]);
  const [availableLGAs, setAvailableLGAs] = useState<any[]>([]);
  const [loadingStates, setLoadingStates] = useState(true);

  // Load states on mount
  useEffect(() => {
    loadStates();
  }, []);

  // Update available LGAs when state changes
  useEffect(() => {
    if (formData.state) {
      const selectedState = states.find((s) => s.id === formData.state);
      setAvailableLGAs(selectedState?.local_governtments || []);
    } else {
      setAvailableLGAs([]);
    }
  }, [formData.state, states]);

  const loadStates = async () => {
    setLoadingStates(true);
    try {
      const response = await adminService.getAllStatesAndLGs();
      // Handle paginated response: { data: { count, results: [...] } }
      const statesData = Array.isArray(response)
        ? response
        : response?.data?.results || response?.data || [];

      console.log("Loaded states:", statesData.length, "states");
      setStates(statesData);
    } catch (error: any) {
      console.error("Failed to load states:", error);
      toast.error("Failed to load states. Please refresh the page.");
    } finally {
      setLoadingStates(false);
    }
  };

  // File upload hooks
  const profilePhoto = useFileUploadEnhanced({
    maxSizeMB: 2,
    allowedTypes: ["image/jpeg", "image/png"],
    compressImages: true,
    onUpload: (file) => setFormData({ ...formData, profilePhoto: file }),
  });

  const ninSlip = useFileUploadEnhanced({
    maxSizeMB: 5,
    allowedTypes: ["image/jpeg", "image/png", "application/pdf"],
    compressImages: true,
    onUpload: (file) => setFormData({ ...formData, ninSlip: file }),
  });

  // Submit step 1: Personal info and documents
  const handleStep1Submit = async () => {
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    try {
      const response = await applicationService.submitCertificateApplication({
        date_of_birth: formData.dob,
        email: formData.email,
        full_name: formData.fullName,
        landmark: formData.landmark,
        local_government: formData.lga,
        phone_number: formData.phone,
        state: formData.state,
        village: formData.village,
        nin: formData.nin,
        nin_slip: ninSlip.file || undefined,
        profile_photo: profilePhoto.file || undefined,
      });

      setApplicationId(response.data.application_id);
      toast.success("Application step 1 completed!");
      setCurrentStep(2);
    } catch (error: any) {
      console.error("Step 1 submission error:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to submit application details";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit step 2: Address and additional info
  const handleStep2Submit = async () => {
    if (!validateCurrentStep()) return;

    if (!applicationId) {
      toast.error("Application ID missing. Please restart the application.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await applicationService.updateApplicationStep2(
        applicationId,
        {
          residential_address: formData.address,
          landmark: formData.landmark,
        }
      );

      // Set the fee amount from response
      const fee = response.data.fee.application_fee || 0;
      setCertificateAmount(fee);

      toast.success("Application step 2 completed!");

      // Verify NIN information
      try {
        await applicationService.verifyNIN(applicationId, "certificate");
        toast.success("NIN verified successfully!");
      } catch (ninError: any) {
        // Non-blocking - continue even if NIN verification fails
        console.warn("NIN verification warning:", ninError);
        toast.warning(
          ninError.response?.data?.message || "NIN verification pending"
        );
      }

      setCurrentStep(3);
    } catch (error: any) {
      console.error("Step 2 submission error:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to update application details";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initialize payment when clicking "Proceed to Payment"
  const handleProceedToPayment = async () => {
    if (!applicationId) {
      toast.error("Application ID missing. Please restart the application.");
      return;
    }

    setIsInitializingPayment(true);

    try {
      const result = await applicationService.initiatePayment({
        payment_type: "certificate",
        application_id: applicationId,
        amount: certificateAmount > 0 ? certificateAmount : undefined,
      });

      if (result.data.status) {
        setPaymentReference(result.data.data.reference);

        // Open Paystack in new window
        const paymentWindow = window.open(
          result.data.data.authorization_url,
          "Paystack Payment",
          "width=500,height=700,left=200,top=100"
        );

        toast.success("Payment window opened! Complete payment to continue.");

        // Move to review step
        setCurrentStep(4);

        // Optional: Poll for payment verification
        if (paymentWindow) {
          const pollTimer = setInterval(() => {
            if (paymentWindow.closed) {
              clearInterval(pollTimer);
              toast.info(
                "Payment window closed. Please check your application status."
              );
            }
          }, 1000);
        }
      } else {
        toast.error("Failed to initialize payment");
      }
    } catch (error: any) {
      console.error("Payment initialization error:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to initialize payment";
      toast.error(errorMessage);
    } finally {
      setIsInitializingPayment(false);
    }
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        const personalValidation = validateApplicationForm({
          fullName: formData.fullName,
          nin: formData.nin,
          dob: formData.dob,
          phone: formData.phone,
          state: formData.state,
          lga: formData.lga,
          village: formData.village,
        });

        if (!personalValidation.valid) {
          toast.error(personalValidation.message);
          return false;
        }

        if (!formData.email) {
          toast.error("Email is required");
          return false;
        }

        if (!profilePhoto.file) {
          toast.error("Please upload a profile photo");
          return false;
        }

        if (!ninSlip.file) {
          toast.error("Please upload your NIN slip");
          return false;
        }

        return true;

      case 2:
        if (!formData.address.trim()) {
          toast.error("Residential address is required");
          return false;
        }
        if (!formData.landmark.trim()) {
          toast.error("Landmark is required");
          return false;
        }
        return true;

      case 3:
        return true;

      case 4:
        return true;

      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      handleStep1Submit();
    } else if (currentStep === 2) {
      handleStep2Submit();
    } else if (validateCurrentStep()) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Final submission - just navigate since payment was already completed
  const handleSubmit = async () => {
    if (!paymentReference) {
      toast.error("Please complete payment first");
      return;
    }

    toast.success("Application submitted successfully!");
    setTimeout(() => {
      navigate("/applicant-dashboard");
    }, 1500);
  };

  const handleCancel = () => {
    navigate("/");
  };

  return (
    <ApplicationFormDesign
      currentStep={currentStep}
      totalSteps={totalSteps}
      progress={progress}
      formData={formData}
      setFormData={setFormData}
      states={states}
      availableLGAs={availableLGAs}
      loadingStates={loadingStates}
      photoPreview={profilePhoto.preview}
      photoFile={profilePhoto.file}
      photoUploading={profilePhoto.isUploading}
      photoProgress={profilePhoto.uploadProgress}
      photoError={profilePhoto.error}
      handlePhotoUpload={profilePhoto.handleUpload}
      removePhoto={() => profilePhoto.remove()}
      ninSlipPreview={ninSlip.preview}
      ninSlipFile={ninSlip.file}
      ninSlipUploading={ninSlip.isUploading}
      ninSlipProgress={ninSlip.uploadProgress}
      ninSlipError={ninSlip.error}
      handleNinSlipUpload={ninSlip.handleUpload}
      removeNinSlip={() => ninSlip.remove()}
      certificateAmount={certificateAmount || 5500}
      paymentReference={paymentReference}
      isInitializingPayment={isInitializingPayment}
      handleProceedToPayment={handleProceedToPayment}
      handleNext={handleNext}
      handleBack={handleBack}
      handleSubmit={handleSubmit}
      onCancel={handleCancel}
      isSubmitting={isSubmitting}
    />
  );
}
