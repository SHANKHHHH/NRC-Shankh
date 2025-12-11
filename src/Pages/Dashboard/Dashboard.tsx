// Nrc/src/Pages/Dashboard/Dashboard.tsx
import React, { lazy, Suspense, useEffect, useState } from "react";
// Import the Job interface from the centralized types file

const PlannerDashboardContainer = lazy(
  () => import("../../Components/Roles/Admin/Planner/PlannerDashboardContainer")
);

const DispatchOverview = lazy(
  () => import("../../Components/Roles/Admin/DispatchHead/DispatchOverview")
);
const QCDashboard = lazy(
  () => import("../../Components/Roles/Admin/QCManager/QCDashboard")
);
const PrintingDashboard = lazy(
  () => import("../../Components/Roles/Admin/PrintingManager/PrintingDashboard")
);
const AdminDashboard = lazy(
  () => import("../../Components/Roles/Admin/AdminDashboard.tsx")
);

import EditWorkingDetails from "../../Components/Roles/Admin/EditWorkingDetails";
import PrintingMgrJobCard from "../../Components/Roles/PrintingMgr/job"; // Renamed import to avoid conflict
import StopScreen from "../../Components/Roles/PrintingMgr/options/stop";
import DispatchExecutiveJobs from "../../Components/Roles/Dispatch_Executive/dispatch_jobs";
import ReadyDispatchForm from "../../Components/Roles/Dispatch_Executive/ReadytoDispatch/readyDispatch";
import ProductionSteps from "../../Components/Roles/ProductionHead/productionSteps/production_steps";
import ProductionHeadDashboard from "../../Components/Roles/ProductionHead/production_dashboard";

import StartNewJob from "../../Components/Roles/Planner/startNew_job";
import CreateNewJob from "../../Components/Roles/Planner/CreateNewJob";
import PlannerNotifications from "../../Components/Roles/Planner/planner_notifications";
import PlannerJobs from "../../Components/Roles/Planner/planner_jobs";
import JobAssigned from "../../Components/Roles/Planner/job_assigned"; // IMPORTED: New component
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

interface DashboardProps {
  tabValue: string;
  setTabValue: (value: string) => void;
  role: string;
}

// Re-added dummy job data for Printing Manager and Production Head sections,
// as they were previously using it. This is a temporary measure if these components
// don't yet fetch their own data. Ideally, these components should be self-sufficient.
interface DummyJob {
  // Re-defined a local dummy interface for these sections
  id: string;
  company: string;
  jobId: string;
  boardSize: string;
  gsm: string;
  artwork: string;
  approvalDate: string;
  dispatchDate: string;
}

const Dashboard: React.FC<DashboardProps> = ({
  tabValue,
  setTabValue,
  role,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // 🔥 BETTER LOGIC: Get the actual user role from localStorage
  const getActualUserRole = () => {
    try {
      const userData = localStorage.getItem("userData");
      if (userData) {
        const parsedData = JSON.parse(userData);
        return parsedData.roles?.[0] || "admin";
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
    return "admin"; // Default fallback
  };

  const actualUserRole = getActualUserRole();
  const isOnPlannerDashboardRoute = location.pathname === "/planner-dashboard";

  // Handle URL parameters for navigation
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "create-new-job") {
      // Set the correct tab based on user role
      if (actualUserRole === "admin") {
        setTabValue("admin-create-new-job");
      } else if (actualUserRole === "planner") {
        setTabValue("create new job");
      }

      // Clear the URL parameter to allow subsequent clicks to work
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("tab");
      const newUrl = newSearchParams.toString()
        ? `${location.pathname}?${newSearchParams.toString()}`
        : location.pathname;
      navigate(newUrl, { replace: true });
    }
  }, [searchParams, setTabValue, actualUserRole, navigate, location.pathname]);

  console.log(
    "Dashboard Debug - actualUserRole:",
    actualUserRole,
    "tabValue:",
    tabValue,
    "pathname:",
    location.pathname
  );

  // Re-added state for jobs, loading, error, etc.
  const [jobs, setJobs] = useState<DummyJob[]>([
    {
      id: "1",
      company: "Jockey India",
      jobId: "id_234566",
      boardSize: "64×64",
      gsm: "xyz",
      artwork: "id_123456",
      approvalDate: "15/04/2025",
      dispatchDate: "15/04/2025",
    },
    {
      id: "2",
      company: "Jockey India",
      jobId: "id_234567",
      boardSize: "64×64",
      gsm: "xyz",
      artwork: "id_123457",
      approvalDate: "16/04/2025",
      dispatchDate: "16/04/2025",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStopScreen, setShowStopScreen] = useState(false);
  const [activeJob, setActiveJob] = useState<DummyJob | null>(null);
  const [showReadyDispatch, setShowReadyDispatch] = useState(false);
  const [showProductionSteps, setShowProductionSteps] = useState(false);

  useEffect(() => {}, [activeJob]);

  return (
    <div className="px-4 sm:px-8 py-8 bg-[#f7f7f7] min-h-screen">
      <Suspense fallback={<div>Loading...</div>}>
        {/* 🔥 FIXED: Admin Dashboard - Only show when NOT on planner dashboard route */}
        {actualUserRole === "admin" &&
          tabValue === "dashboard" &&
          !isOnPlannerDashboardRoute && <AdminDashboard />}

        {/* 🔥 FIXED: Admin other tabs - show regardless of route */}
        {actualUserRole === "admin" && tabValue === "production" && (
          <ProductionHeadDashboard />
        )}
        {actualUserRole === "admin" && tabValue === "dispatch" && (
          <DispatchOverview />
        )}
        {actualUserRole === "admin" && tabValue === "qc" && <QCDashboard />}
        {actualUserRole === "admin" && tabValue === "printing" && (
          <PrintingDashboard />
        )}
        {actualUserRole === "admin" && tabValue === "edit-working-details" && (
          <EditWorkingDetails />
        )}

        {/* Admin job-related pages */}
        {actualUserRole === "admin" && tabValue === "admin-job-cards" && (
          <PlannerJobs />
        )}
        {actualUserRole === "admin" && tabValue === "admin-create-new-job" && (
          <CreateNewJob onBack={() => setTabValue("dashboard")} />
        )}
        {actualUserRole === "admin" && tabValue === "admin-start-new-job" && (
          <StartNewJob />
        )}

        {/* 🔥 FIXED: Planner Dashboard - Show when on planner route OR actual planner user OR admin user with planner tab */}
        {((actualUserRole === "planner" &&
          (tabValue === "planner" || tabValue === "dashboard")) ||
          (isOnPlannerDashboardRoute &&
            (tabValue === "planner" || tabValue === "dashboard")) ||
          (actualUserRole === "admin" && tabValue === "planner")) && (
          <PlannerDashboardContainer />
        )}

        {/* Planner role specific components - Only for actual planner users */}
        {actualUserRole === "planner" && tabValue === "start new job" && (
          <StartNewJob />
        )}
        {actualUserRole === "planner" && tabValue === "create new job" && (
          <CreateNewJob onBack={() => setTabValue("dashboard")} />
        )}
        {actualUserRole === "planner" && tabValue === "notifications" && (
          <PlannerNotifications />
        )}
        {actualUserRole === "planner" && tabValue === "jobs" && <PlannerJobs />}
        {actualUserRole === "planner" && tabValue === "job assigned" && (
          <JobAssigned />
        )}

        {/* Printing Manager Dashboard - Only show PrintingDashboard */}
        {actualUserRole === "printing_manager" && tabValue === "dashboard" && (
          <PrintingDashboard />
        )}

        {/* QC Head Dashboard - Only show QCDashboard */}
        {actualUserRole === "qc_head" && tabValue === "dashboard" && (
          <QCDashboard />
        )}

        {/* Dispatch Manager Dashboard - Only show DispatchOverview */}
        {actualUserRole === "dispatch_manager" && tabValue === "dashboard" && (
          <DispatchOverview />
        )}

        {/* Dispatch Executive jobs tab - Kept as is, assuming it fetches its own data */}
        {role === "dispatch_executive" &&
          tabValue === "jobs" &&
          (showReadyDispatch ? (
            <ReadyDispatchForm onBack={() => setShowReadyDispatch(false)} />
          ) : (
            <DispatchExecutiveJobs
              jobs={jobs.length > 0 ? jobs : undefined}
              onReadyDispatch={() => setShowReadyDispatch(true)}
            />
          ))}

        {/* Production Head Dashboard */}
        {(actualUserRole === "production_head" || role === "production_head") && tabValue === "dashboard" && (
          <ProductionHeadDashboard />
        )}

        {/* Production Head jobs tab - RESTORED ORIGINAL CONTENT */}
        {role === "production_head" && tabValue === "jobs" && (
          <div className="w-full flex flex-col items-center">
            {showProductionSteps ? (
              <ProductionSteps onBack={() => setShowProductionSteps(false)} />
            ) : (
              <>
                {loading && <div>Loading jobs...</div>}
                {error && <div className="text-red-500">{error}</div>}
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-4 justify-items-center">
                  {jobs.length > 0 ? (
                    jobs.map((job) => (
                      <PrintingMgrJobCard // Assuming ProductionHead also uses this card or a similar one
                        key={job.id}
                        company={job.company}
                        jobId={job.jobId}
                        boardSize={job.boardSize}
                        gsm={job.gsm}
                        artwork={job.artwork}
                        approvalDate={job.approvalDate}
                        dispatchDate={job.dispatchDate}
                        onStop={() => setShowProductionSteps(true)}
                      />
                    ))
                  ) : (
                    <div className="text-center col-span-full py-8">
                      <p className="text-gray-500">No jobs found</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Suspense>
    </div>
  );
};

export default Dashboard;
