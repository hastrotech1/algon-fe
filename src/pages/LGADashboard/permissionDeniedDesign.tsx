import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Logo } from "../../DesignSystem/designSyetem";
import { Shield, Lock, AlertTriangle, Home, LogOut } from "lucide-react";

interface PermissionDeniedDesignProps {
  adminName?: string;
  requiredPermissions?: string[];
  onLogout: () => void;
}

export function PermissionDeniedDesign({
  adminName = "Administrator",
  requiredPermissions = ["Dashboard Access"],
  onLogout,
}: PermissionDeniedDesignProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600 mt-2">
            You don't have permission to access this resource
          </p>
        </div>

        <Card className="rounded-xl shadow-lg border-red-200 bg-white">
          <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Permission Denied
            </CardTitle>
            <CardDescription>
              Your account does not have the required permissions to access the
              administrator dashboard
            </CardDescription>
          </CardHeader>

          <CardContent className="mt-6 space-y-6">
            {/* Admin Information */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-medium">Admin Account:</span>
              </p>
              <p className="text-lg font-semibold text-gray-900">{adminName}</p>
            </div>

            {/* Missing Permissions */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">
                Required Permissions:
              </p>
              <div className="space-y-2">
                {requiredPermissions.map((permission, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200"
                  >
                    <Shield className="w-4 h-4 text-orange-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{permission}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Information Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <span className="font-medium">What to do next:</span>
              </p>
              <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
                <li>Contact your Super Administrator</li>
                <li>Request the necessary permissions</li>
                <li>Verify your account status</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <Button
                onClick={() => navigate("/")}
                className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg gap-2"
              >
                <Home className="w-4 h-4" />
                Return to Home
              </Button>

              <Button
                onClick={onLogout}
                variant="outline"
                className="w-full rounded-lg gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>

            {/* Support Information */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-600 mb-2">
                <span className="font-medium">Need Help?</span>
              </p>
              <div className="space-y-1 text-xs text-gray-700">
                <p>📧 Email: support@algon.gov.ng</p>
                <p>📞 Phone: +234 800 000 0000</p>
                <p>🕐 Available: Mon - Fri, 9AM - 5PM (WAT)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <Logo size="sm" showText={false} />
            <span className="text-sm text-gray-600">ALGON Admin Portal</span>
          </div>
          <p className="text-xs text-gray-500">
            © 2025 ALGON. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
