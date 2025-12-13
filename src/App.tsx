import { Suspense, lazy, useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";

import "./App.css";
import Header from "./Components/Navbar/Header/Header";
import Login from "./Pages/Login";
import ProtectedRoute from "./Routes/ProtectedRoute";
import { UsersProvider } from "./context/UsersContext";

const Dashboard = lazy(() => import("./Pages/Dashboard/Dashboard"));
const JobInitiationForm = lazy(
  () => import("./Components/Roles/Planner/Form/JobInitiationForm")
);
const JobStepsView = lazy(
  () => import("./Components/Roles/Planner/Form/JobStepsView")
); // IMPORTED: New component
const JobDetailsContainer = lazy(
  () =>
    import("./Components/Roles/Admin/JobDetailsComponents/JobDetailsContainer")
); // New job details page
const CompletedJobsView = lazy(
  () => import("./Components/Roles/Admin/CompletedJobsView")
); // New completed jobs view
const InProgressJobs = lazy(
  () => import("./Components/Roles/Admin/InProgressJobs")
); // New in-progress jobs view
const PlannedJobs = lazy(() => import("./Components/Roles/Admin/PlannedJobs")); // New planned jobs view
const EditMachinePage = lazy(
  () => import("./Components/Roles/Planner/EditMachinePage")
); // NEW: Edit Machine page
const UserDetailsPage = lazy(
  () => import("./Components/UserProfile/UserManagement/UserDetailsPage")
); // NEW: User Details page
const HeldJobs = lazy(() => import("./Components/Roles/Admin/HeldJobs")); // NEW: Held Jobs page
const MajorHoldJobs = lazy(
  () => import("./Components/Roles/Admin/MajorHoldJobs")
); // NEW: Major Hold Jobs page

// Wrapper component to use useNavigate
function AppContent() {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(() => {
    const path = window.location.pathname;
    if (path === "/planner-dashboard") return "planner";
    return "dashboard";
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Check for existing authentication on component mount
  useEffect(() => {
    const checkExistingAuth = () => {
      const accessToken = localStorage.getItem("accessToken");
      const userData = localStorage.getItem("userData");

      if (accessToken && userData) {
        try {
          // Verify token is valid by checking if it's not expired
          const tokenData = JSON.parse(atob(accessToken.split(".")[1]));
          const currentTime = Date.now() / 1000;

          if (tokenData.exp > currentTime) {
            // Token is valid, restore authentication state
            const parsedUserData = JSON.parse(userData);
            setIsAuthenticated(true);

            // Restore user role from stored data
            if (parsedUserData.roles && parsedUserData.roles.length > 0) {
              setUserRole(parsedUserData.roles[0]);
            }

            console.log("Authentication restored from localStorage");
          } else {
            // Token expired, clear localStorage
            console.log("Token expired, clearing authentication data");
            localStorage.removeItem("accessToken");
            localStorage.removeItem("userData");
          }
        } catch (error) {
          console.error("Error parsing token or user data:", error);
          // Clear invalid data
          localStorage.removeItem("accessToken");
          localStorage.removeItem("userData");
        }
      }
    };

    // Add a small delay to ensure localStorage is accessible
    const timer = setTimeout(checkExistingAuth, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = async () => {
    try {
      // Get the access token from localStorage
      const accessToken = localStorage.getItem("accessToken");

      if (accessToken) {
        // Call the logout API to update the database
        const response = await fetch(
          "https://nrprod.nrcontainers.com/api/auth/logout",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          console.error(
            "Logout API call failed:",
            response.status,
            response.statusText
          );
          // Continue with logout even if API call fails
        } else {
          console.log("Successfully logged out from server");
        }
      }
    } catch (error) {
      console.error("Error calling logout API:", error);
      // Continue with logout even if API call fails
    } finally {
      // Always clear local state and storage, regardless of API call result
      setIsAuthenticated(false);
      setUserRole(null);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userData");
    }
  };

  // This function is just to satisfy the prop requirement for JobInitiationForm when rendered directly by route.
  const handleJobUpdatedInApp = () => {
    console.log(
      "JobInitiationForm completed. A global state update or refetch in planner_jobs might be needed."
    );
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            // 🔥 Role-based redirect after login
            userRole === "planner" ? (
              <Navigate to="/planner-dashboard" replace />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          ) : (
            <Login
              setIsAuthenticated={setIsAuthenticated}
              setUserRole={setUserRole}
              setTabValue={setTabValue}
            />
          )
        }
      />

      {/* 🔥 NEW: Separate route for planner dashboard */}
      <Route
        path="/planner-dashboard"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <Header
              tabValue={tabValue}
              setTabValue={setTabValue}
              onLogout={handleLogout}
              role={userRole || "planner"}
            />
            <Dashboard
              tabValue={tabValue}
              setTabValue={setTabValue}
              role={userRole || "admin"}
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/*" // Use wildcard to allow nested routes under dashboard
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <Header
              tabValue={tabValue}
              setTabValue={setTabValue}
              onLogout={handleLogout}
              role={userRole || "admin"}
            />
            <Routes>
              <Route
                path="/"
                element={
                  <Dashboard
                    tabValue={tabValue}
                    setTabValue={setTabValue}
                    role={userRole || "admin"}
                  />
                }
              />
              {/* Nested Route for JobInitiationForm */}
              <Route
                path="planner/initiate-job/:nrcJobNo"
                element={
                  <JobInitiationForm onJobUpdated={handleJobUpdatedInApp} />
                }
              />
              {/* New route for Add PO (general form) */}
              <Route
                path="planner/initiate-job/new"
                element={
                  <JobInitiationForm onJobUpdated={handleJobUpdatedInApp} />
                }
              />
              {/* Nested Route for JobStepsView */}
              <Route
                path="planner/job-steps/:jobPlanId" // New route for JobStepsView
                element={<JobStepsView />}
              />
              {/* Nested Route for JobDetailsContainer */}
              <Route
                path="job-details" // New route for job details
                element={<JobDetailsContainer />}
              />
              {/* Nested Route for CompletedJobsView */}
              <Route
                path="completed-jobs" // New route for completed jobs
                element={<CompletedJobsView />}
              />
              {/* Nested Route for InProgressJobs */}
              <Route
                path="in-progress-jobs" // New route for in-progress jobs
                element={<InProgressJobs />}
              />
              {/* Nested Route for PlannedJobs */}
              <Route
                path="planned-jobs" // New route for planned jobs
                element={<PlannedJobs />}
              />

              <Route path="held-jobs" element={<HeldJobs />} />
              <Route path="major-hold-jobs" element={<MajorHoldJobs />} />

              {/* Nested Route for EditMachinePage */}
              <Route
                path="edit-machine" // New route for edit machine
                element={<EditMachinePage />}
              />
              {/* Nested Route for UserDetailsPage */}
              <Route
                path="user-details" // New route for user details
                element={
                  <UserDetailsPage onClose={() => navigate("/dashboard")} />
                }
              />
              {/* Test route for debugging */}
              <Route
                path="test-edit-machine" // Test route for debugging
                element={
                  <div className="p-8">
                    <h1 className="text-2xl font-bold">
                      Edit Machine Test Route
                    </h1>
                    <p>If you can see this, routing is working correctly.</p>
                    <button
                      onClick={() => window.history.back()}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
                    >
                      Go Back
                    </button>
                  </div>
                }
              />
            </Routes>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter basename="/">
      <UsersProvider>
        <Suspense fallback={<div>Loading...</div>}>
          <AppContent />
        </Suspense>
      </UsersProvider>
    </BrowserRouter>
  );
}

export default App;
