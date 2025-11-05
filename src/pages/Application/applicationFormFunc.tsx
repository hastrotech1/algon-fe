import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApplicationFormDesign } from "./applicationFormDesign";
import { toast } from "sonner";
import type { ApplicationFormData } from "../../Types/types";
import { validateApplicationForm } from "../../utils/validation";
import { applicationService } from "../../services";
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
    paymentMethod: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ Use enhanced file upload hooks
  const profilePhoto = useFileUploadEnhanced({
    maxSizeMB: 2,
    allowedTypes: ['image/jpeg', 'image/png'],
    compressImages: true,
    onUpload: (file) => setFormData({ ...formData, profilePhoto: file }),
  });

  const ninSlip = useFileUploadEnhanced({
    maxSizeMB: 5,
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    compressImages: true,
    onUpload: (file) => setFormData({ ...formData, ninSlip: file }),
  });

  // Step Validation
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
        if (!formData.paymentMethod) {
          toast.error("Please select a payment method");
          return false;
        }
        return true;

      case 4:
        return true;

      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
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

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);

    try {
      const result = await applicationService.submitApplication(formData);
      
      console.log('Application submitted:', result);
      
      toast.success('Application submitted successfully!');
      
      setTimeout(() => {
        navigate('/applicant-dashboard');
      }, 1500);
    } catch (error: any) {
      console.error('Submission error:', error);
      
      const errors = error.response?.data;
      
      if (typeof errors === 'object' && errors !== null) {
        const firstError = Object.values(errors)[0];
        if (Array.isArray(firstError)) {
          toast.error(firstError[0]);
        } else {
          toast.error(errors.message || 'Failed to submit application');
        }
      } else {
        toast.error('Failed to submit application. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (
      window.confirm(
        "Are you sure you want to cancel your application? All entered data will be lost."
      )
    ) {
      navigate('/');
    }
  };

  return (
    <ApplicationFormDesign
      currentStep={currentStep}
      totalSteps={totalSteps}
      progress={progress}
      formData={formData}
      setFormData={setFormData}
      
      // Profile Photo
      photoPreview={profilePhoto.preview}
      photoFile={profilePhoto.file}
      photoUploading={profilePhoto.isUploading}
      photoProgress={profilePhoto.uploadProgress}
      photoError={profilePhoto.error}
      handlePhotoUpload={profilePhoto.handleUpload}
      removePhoto={() => profilePhoto.remove()}
      
      // NIN Slip
      ninSlipPreview={ninSlip.preview}
      ninSlipFile={ninSlip.file}
      ninSlipUploading={ninSlip.isUploading}
      ninSlipProgress={ninSlip.uploadProgress}
      ninSlipError={ninSlip.error}
      handleNinSlipUpload={ninSlip.handleUpload}
      removeNinSlip={() => ninSlip.remove()}
      
      handleNext={handleNext}
      handleBack={handleBack}
      handleSubmit={handleSubmit}
      onCancel={handleCancel}
      isSubmitting={isSubmitting}
    />
  );
}