// src/pages/ApplicantDashboard/applicantDashboardDesign.tsx
import React from "react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Shield,
  Download,
  Clock,
  CheckCircle,
  FileText,
  LogOut,
} from "lucide-react";
import { StatusBadge } from "../../components/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import type { Application, MyCertificate } from "../../Types/types";

// ============================================================================
// PROPS INTERFACES
// ============================================================================

interface ApplicantDashboardDesignProps {
  activeTab: "overview" | "applications" | "certificates";
  setActiveTab: (tab: "overview" | "applications" | "certificates") => void;
  applications: Application[];
  certificates: MyCertificate[];
  currentApplication: Application | null;
  stats: {
    total: number;
    approved: number;
    pending: number;
  };
  userName: string;
  onNavigate: (page: string) => void;
  handleLogout: () => void;
  onViewDetails: (application: Application) => void;
}

interface ApplicationStepProps {
  title: string;
  description: string;
  status: "completed" | "current" | "pending";
}

// ============================================================================
// MAIN DESIGN COMPONENT
// ============================================================================

export function ApplicantDashboardDesign({
  activeTab,
  setActiveTab,
  applications,
  certificates,
  currentApplication,
  stats,
  userName,
  onNavigate,
  handleLogout,
  onViewDetails,
}: ApplicantDashboardDesignProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 to-white">
      {/* Header */}
      <div className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-foreground">ALGON - Applicant Portal</div>
                <div className="text-xs text-muted-foreground">
                  Welcome back, {userName}
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-8 border-b border-border">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("applications")}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === "applications"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            }`}
          >
            Applications
          </button>
          <button
            onClick={() => setActiveTab("certificates")}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === "certificates"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            }`}
          >
            Certificates
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <OverviewTab
            stats={stats}
            currentApplication={currentApplication}
            onNavigate={onNavigate}
          />
        )}

        {activeTab === "applications" && (
          <ApplicationsTab
            applications={applications}
            onNavigate={onNavigate}
            onViewDetails={onViewDetails}
          />
        )}

        {activeTab === "certificates" && (
          <CertificatesTab
            certificates={certificates}
            onNavigate={onNavigate}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TAB COMPONENTS
// ============================================================================

// Overview Tab
interface OverviewTabProps {
  stats: {
    total: number;
    approved: number;
    pending: number;
  };
  currentApplication: Application | null;
  onNavigate: (page: string) => void;
}

function OverviewTab({
  stats,
  currentApplication,
  onNavigate,
}: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Total Applications
                </p>
                <p className="text-3xl">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Approved</p>
                <p className="text-3xl">{stats.approved}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Pending</p>
                <p className="text-3xl">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Application Status */}
      {currentApplication ? (
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Current Application Status</CardTitle>
            <CardDescription>Track your application progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Application ID</p>
                <p>{currentApplication.id}</p>
              </div>
              <StatusBadge status={currentApplication.status} />
            </div>

            <div className="space-y-4">
              <ApplicationStep
                title="Application Submitted"
                description="Your application has been received"
                status="completed"
              />
              <ApplicationStep
                title="Payment Confirmed"
                description="Payment of ₦5,500 confirmed"
                status="completed"
              />
              <ApplicationStep
                title="Under Review"
                description="Your application is being reviewed by the LG Admin"
                status="current"
              />
              <ApplicationStep
                title="Approval"
                description="Pending approval"
                status="pending"
              />
              <ApplicationStep
                title="Certificate Ready"
                description="Download your certificate"
                status="pending"
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>No Applications Yet</CardTitle>
            <CardDescription>
              You haven't submitted any applications. Get started by applying
              for a certificate.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => onNavigate("application-form")}>
              Apply for Certificate
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="rounded-lg justify-start h-auto p-4"
            onClick={() => onNavigate("application-form")}
          >
            <div className="text-left">
              <p>New Application</p>
              <p className="text-xs text-muted-foreground mt-1">
                Apply for a new certificate
              </p>
            </div>
          </Button>
          <Button
            variant="outline"
            className="rounded-lg justify-start h-auto p-4 border-primary/30 bg-primary/5"
            onClick={() => onNavigate("digitization-flow")}
          >
            <div className="text-left">
              <p className="flex items-center gap-2">
                Already have a Certificate?
                <span className="text-xs bg-primary text-white px-2 py-0.5 rounded">
                  New
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Digitize your hard copy certificate
              </p>
            </div>
          </Button>
          <Button
            variant="outline"
            className="rounded-lg justify-start h-auto p-4"
            onClick={() => onNavigate("verify")}
          >
            <div className="text-left">
              <p>Verify Certificate</p>
              <p className="text-xs text-muted-foreground mt-1">
                Verify any certificate
              </p>
            </div>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Applications Tab
interface ApplicationsTabProps {
  applications: Application[];
  onNavigate: (page: string) => void;
  onViewDetails: (application: Application) => void;
}

function ApplicationsTab({
  applications,
  onNavigate,
  onViewDetails,
}: ApplicationsTabProps) {
  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle>My Applications</CardTitle>
        <CardDescription>
          View all your certificate applications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Application ID</TableHead>
              <TableHead>Local Government</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date Processed</TableHead>
              <TableHead>Date Applied</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((app) => (
              <TableRow key={app.id}>
                <TableCell>{app.id}</TableCell>
                <TableCell>{app.lga}</TableCell>
                <TableCell>
                  <StatusBadge status={app.status} />
                </TableCell>
                <TableCell>{app.dateProcessed}</TableCell>
                <TableCell>{app.dateApplied}</TableCell>
                <TableCell>
                  <span className="text-green-600 text-sm">{app.payment}</span>
                </TableCell>
                <TableCell>
                  {app.status === "approved" ? (
                    <Button
                      size="sm"
                      onClick={() => onNavigate("certificate-download")}
                    >
                      Download
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewDetails(app)}
                    >
                      View Details
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Certificates Tab
interface CertificatesTabProps {
  certificates: MyCertificate[];
  onNavigate: (page: string) => void;
}

function CertificatesTab({ certificates, onNavigate }: CertificatesTabProps) {
  const getExpiryStatus = (expiryDate: string) => {
    const now = new Date();
    const expiry = new Date(expiryDate);

    const nowUTC = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const expiryUTC = new Date(
      Date.UTC(
        expiry.getUTCFullYear(),
        expiry.getUTCMonth(),
        expiry.getUTCDate(),
      ),
    );

    const diffMs = expiryUTC.getTime() - nowUTC.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: "Expired",
        className: "text-red-600",
      };
    }

    if (diffDays <= 7) {
      return {
        text: `Expiring in ${diffDays} day${diffDays === 1 ? "" : "s"}`,
        className: "text-amber-600",
      };
    }

    return {
      text: "Valid",
      className: "text-green-600",
    };
  };

  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return "N/A";
    }
    return date.toLocaleDateString("en-NG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle>My Certificates</CardTitle>
        <CardDescription>Download your approved certificates</CardDescription>
      </CardHeader>
      <CardContent>
        {certificates.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No certificates available yet.
          </div>
        ) : (
          <div className="space-y-4">
            {certificates.map((certificate) => {
              const expiryStatus = getExpiryStatus(certificate.expiry_date);

              return (
                <div
                  key={certificate.id}
                  className="border border-border rounded-xl p-6 flex justify-between items-center gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4>{certificate.certificate_number}</h4>
                      {certificate.certificate_type === "digitized" ? (
                        <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                          Digitized
                        </Badge>
                      ) : (
                        <Badge>Original</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Verification Code: {certificate.verification_code}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Issued: {formatDisplayDate(certificate.issue_date)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Expires: {formatDisplayDate(certificate.expiry_date)}
                    </p>
                    <p className={`text-sm mt-2 ${expiryStatus.className}`}>
                      {expiryStatus.text}
                      {certificate.is_downloadable
                        ? " • Available for download"
                        : " • Not downloadable"}
                    </p>
                  </div>
                  {certificate.is_downloadable ? (
                    <Button onClick={() => onNavigate("certificate-download")}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Application Step Component
function ApplicationStep({ title, description, status }: ApplicationStepProps) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            status === "completed"
              ? "bg-green-500"
              : status === "current"
                ? "bg-primary"
                : "bg-gray-200"
          }`}
        >
          {status === "completed" && (
            <CheckCircle className="w-5 h-5 text-white" />
          )}
          {status === "current" && <Clock className="w-5 h-5 text-white" />}
        </div>
        {status !== "pending" && <div className="w-0.5 h-12 bg-border mt-2" />}
      </div>
      <div className="pb-8">
        <p className={status === "pending" ? "text-muted-foreground" : ""}>
          {title}
        </p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
