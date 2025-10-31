import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Shield } from "lucide-react";

interface RegisterProps {
  onNavigate: (page: string) => void;
}

export function Register({ onNavigate }: RegisterProps) {
  const [formData, setFormData] = useState({
    nin: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock registration - redirect to application form
    onNavigate('application-form');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div className="text-left">
              <div className="text-xl text-foreground">LGCIVS</div>
              <div className="text-xs text-muted-foreground">Create your account</div>
            </div>
          </div>
        </div>

        <Card className="rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle>Register</CardTitle>
            <CardDescription>Create an account to apply for your certificate</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nin">National Identification Number (NIN)</Label>
                <Input 
                  id="nin"
                  type="text" 
                  placeholder="Enter your 11-digit NIN"
                  value={formData.nin}
                  onChange={(e) => setFormData({...formData, nin: e.target.value})}
                  className="rounded-lg"
                  maxLength={11}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email"
                  type="email" 
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="rounded-lg"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone"
                  type="tel" 
                  placeholder="080XXXXXXXX"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="rounded-lg"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password"
                  type="password" 
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="rounded-lg"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input 
                  id="confirmPassword"
                  type="password" 
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="rounded-lg"
                />
              </div>

              <div className="flex items-start gap-2">
                <input type="checkbox" className="mt-1 rounded" required />
                <span className="text-xs text-muted-foreground">
                  I agree to the Terms of Service and Privacy Policy
                </span>
              </div>

              <Button type="submit" className="w-full rounded-lg">
                Create Account
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button 
                onClick={() => onNavigate('login')}
                className="text-sm text-primary hover:underline"
              >
                Already have an account? Sign in
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <button 
            onClick={() => onNavigate('landing')}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
