import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Logo from "../assets/Login/logo.jpg"; // Assuming this is the correct path to your logo
import LoadingSpinner from "../Components/common/LoadingSpinner";
import { Eye, EyeOff } from "lucide-react";

/**
 * Type for form data used in login
 */
interface LoginFormData {
  email: string;
  password: string;
  role: string; // For UI display only
}

/**
 * Props for Login component
 */
interface LoginProps {
  setIsAuthenticated: (value: boolean) => void;
  setUserRole: (role: string | null) => void;
  setTabValue: (tab: string) => void; // Add this
}

export default function Login({
  setIsAuthenticated,
  setUserRole,
  setTabValue,
}: LoginProps) {
  const navigate = useNavigate();

  // ---------------------- State Declarations ---------------------- //
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
    role: "planner",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "success" | "error" | "already_logged_in" | null
  >(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showAlreadyLoggedInModal, setShowAlreadyLoggedInModal] =
    useState(false);

  // ---------------------- Handlers ---------------------- //

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { email, password } = formData;

    try {
      // Simple frontend validation
      if (!email.trim() || !password.trim()) {
        throw new Error("All fields are required.");
      }

      // API endpoint - using localhost for development
      const API_ENDPOINT = `${
        import.meta.env.VITE_API_URL || "https://nrprod.nrcontainers.com"
      }/api/auth/login`;

      // 🔥 Make the API call - this was missing!
      const response = await axios.post(API_ENDPOINT, { email, password });

      // If login successful
      if (response.data.success) {
        setSubmitStatus("success");

        // Log the response for debugging
        console.log("Login response:", response.data);

        // Store the access token in localStorage
        localStorage.setItem("accessToken", response.data.acessToken);

        // Store user data in localStorage for persistence
        localStorage.setItem("userData", JSON.stringify(response.data.data));

        const userData = response.data.data;

        // Set authentication state and user role
        setIsAuthenticated(true);

        // Handle roles array from backend response
        if (userData.roles && userData.roles.length > 0) {
          const userRole = userData.roles[0];
          setUserRole(userRole);

          // 🔥 Initialize default tab based on role
          setTabValue("dashboard"); // Always start with dashboard tab

          console.log("User role set to:", userRole);
          console.log("Tab value initialized to: dashboard");

          // Clear form first
          setFormData({ email: "", password: "", role: "planner" });

          // 🔥 UPDATED: Role-based navigation
          if (userRole === "planner") {
            console.log(
              "Planner role detected, navigating to /planner-dashboard"
            );
            navigate("/planner-dashboard");
            setTabValue("planner");
          } else {
            console.log("Admin/other role detected, navigating to /dashboard");
            navigate("/dashboard");
          }
        } else {
          console.error("No roles found in user data:", userData);
          setUserRole(null);
          setTabValue("dashboard"); // Default fallback

          // Clear form and navigate to default dashboard
          setFormData({ email: "", password: "", role: "planner" });
          navigate("/dashboard");
        }
      } else {
        setSubmitStatus("error");
        setTimeout(() => setSubmitStatus(null), 3000);
      }
    } catch (error: any) {
      console.error("Login Error:", error);

      // Check if the error is due to user already being logged in
      const errorMessage =
        error?.response?.data?.message || error?.message || "";
      const isAlreadyLoggedIn =
        errorMessage.toLowerCase().includes("already logged in") ||
        errorMessage.toLowerCase().includes("user already logged in") ||
        errorMessage.toLowerCase().includes("session exists") ||
        errorMessage.toLowerCase().includes("already active") ||
        error?.response?.status === 409; // Conflict status code often used for "already exists" scenarios

      if (isAlreadyLoggedIn) {
        setSubmitStatus("already_logged_in");
        setShowAlreadyLoggedInModal(true);
      } else {
        setSubmitStatus("error");
        setTimeout(() => setSubmitStatus(null), 3000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------- JSX ---------------------- //

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-md w-full mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 sm:p-8 md:p-10">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={Logo} alt="NR Containers" className="h-20 w-auto" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-bold text-center text-[#00AEEF]">
              Login
            </h2>

            {/* ID Input */}
            <input
              type="text"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Employee ID"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00AEEF]"
              required
            />

            {/* Password Input */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00AEEF]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Role Selection Dropdown (for UI only) */}
            {/* <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00AEEF]"
            >
              <option value="admin">Admin</option>
              <option value="printing_manager">Printing Manager</option>
              <option value="dispatch_executive">Dispatch Executive</option>
              <option value="production_head">Production Head</option>
              <option value="planner">Planner</option>
              Add more roles as needed
            </select> */}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#00AEEF] hover:bg-[#0095cc] text-white font-medium py-3 px-4 rounded-lg transition duration-300 flex justify-center items-center hover:cursor-pointer"
            >
              {isSubmitting && (
                <LoadingSpinner
                  size="sm"
                  variant="button"
                  color="white"
                  text=""
                />
              )}
              {isSubmitting ? "Logging in..." : "Login"}
            </button>

            {/* Temporary Login Button for Testing - IMPORTANT: Uses your provided valid token */}
            {/* <button
              type="button"
              onClick={() => {
                // Simulate successful login with test data using correct payload structure
                const testUserData = {
                  id: formData.role === "admin" ? "NRC001" : "NRC002",
                  userActive: true,
                  roles: [formData.role] // Use the ACTUAL selected role from form
                };

                // Store test data in localStorage with the correct key 'accessToken'
                localStorage.setItem("accessToken", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ik5SQzAwMSIsImlhdCI6MTc1NTk0NjI4MiwiZXhwIjoxNzU4NTM4MjgyfQ.x96Yh3gBmDv1tcKxXBGQK2tAExAwMfuYyVvqZsg2Q3s");
                localStorage.setItem("userData", JSON.stringify(testUserData));

                setIsAuthenticated(true);
                
                // Use the ACTUAL selected role, not the backend response
                setUserRole(formData.role); // This will use "planner" when you select planner
                console.log('Test login - User role set to:', formData.role);
                
                navigate('/dashboard');
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition duration-300 hover:cursor-pointer"
            >
              Test Login as {formData.role
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
              }
            </button> */}

            {/* Status Messages */}
            {submitStatus === "success" && (
              <div
                className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative text-sm"
                role="alert"
              >
                Login successful!
              </div>
            )}

            {submitStatus === "error" && (
              <div
                className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-sm"
                role="alert"
              >
                Login failed. Please try again.
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Already Logged In Modal */}
      {showAlreadyLoggedInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-orange-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  User Already Logged In
                </h3>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600">
                This user is already logged in on another device. For security
                reasons, only one active session is allowed per user.
              </p>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => {
                  setShowAlreadyLoggedInModal(false);
                  setSubmitStatus(null);
                }}
                className="bg-[#00AEEF] hover:bg-[#0095cc] text-white font-medium py-2 px-6 rounded-lg transition duration-300"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
