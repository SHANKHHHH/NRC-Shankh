// src/Components/Roles/Planner/job_assigned.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { type JobPlan } from "./Types/job.ts"; // Adjust path as needed
import JobPlanningCard from "./jobPlanningCard/JobPlanningCard.tsx"; // Import the new card component
import JobPlanningDetailModal from "./modal/JobPlanningDetailModal.tsx"; // Import the new detail modal
import LoadingSpinner from "../../common/LoadingSpinner";
import { Grid, List } from "lucide-react";

type ViewMode = "grid" | "list";

const JobAssigned: React.FC = () => {
  const [jobPlans, setJobPlans] = useState<JobPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobPlan, setSelectedJobPlan] = useState<JobPlan | null>(null); // For detail modal
  const [viewMode, setViewMode] = useState<ViewMode>("grid"); // View mode state
  const navigate = useNavigate(); // Initialize navigate

  // Function to fetch all job plans
  const fetchJobPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const accessToken = localStorage.getItem("accessToken");

      if (!accessToken) {
        setError("Authentication token not found. Please log in.");
        setLoading(false);
        return;
      }

      const response = await fetch(
        "https://nrprod.nrcontainers.com/api/job-planning/",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message ||
            `Failed to fetch job plans: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("🔍 Job Assigned - Raw API Response:", data);
      console.log("🔍 Job Assigned - Job Plans Data:", data.data);

      if (data.success && Array.isArray(data.data)) {
        // Filter out job plans with null purchaseOrderId or show all
        const filteredJobPlans = data.data.filter((jobPlan: any) => {
          console.log("🔍 Job Plan:", {
            jobPlanId: jobPlan.jobPlanId,
            nrcJobNo: jobPlan.nrcJobNo,
            purchaseOrderId: jobPlan.purchaseOrderId,
            jobDemand: jobPlan.jobDemand,
          });
          return true; // Show all job plans for now
        });

        console.log("🔍 Job Assigned - Filtered Job Plans:", filteredJobPlans);
        setJobPlans(filteredJobPlans);
      } else {
        setError("Unexpected API response format or data is not an array.");
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
      console.error("Fetch Job Plans Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchJobPlans();
    }, 50); // Small delay to ensure localStorage is ready

    return () => clearTimeout(timer);
  }, []);

  // Handler for clicking the JobPlanningCard itself
  const handleCardClick = (jobPlan: JobPlan) => {
    navigate(`/dashboard/planner/job-steps/${jobPlan.jobPlanId}`);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "N/A";
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8  min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Assigned Job Cards</h1>

        {/* View Mode Toggle */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              viewMode === "grid"
                ? "bg-white text-[#00AEEF] shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            <Grid size={20} />
            <span className="font-medium">Grid</span>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              viewMode === "list"
                ? "bg-white text-[#00AEEF] shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            <List size={20} />
            <span className="font-medium">List</span>
          </button>
        </div>
      </div>

      {loading && <LoadingSpinner size="lg" text="Loading job plans..." />}

      {error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6"
          role="alert"
        >
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {!loading && !error && (
        <>
          {jobPlans.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No job plans found.
            </p>
          ) : (
            <>
              {/* Grid View */}
              {viewMode === "grid" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {jobPlans.map((jobPlan) => (
                    <JobPlanningCard
                      key={jobPlan.jobPlanId}
                      jobPlan={jobPlan}
                      onClick={() => setSelectedJobPlan(jobPlan)} // Button click opens detail modal
                      onCardClick={handleCardClick} // New prop for card click navigation
                    />
                  ))}
                </div>
              )}

              {/* List View */}
              {viewMode === "list" && (
                <div className="space-y-4">
                  {jobPlans.map((jobPlan) => (
                    <div
                      key={jobPlan.jobPlanId}
                      className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => handleCardClick(jobPlan)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                          {/* Job Plan ID */}
                          <div className="flex flex-col">
                            <p className="text-sm text-gray-600 mb-1">
                              Job Plan ID
                            </p>
                            <p className="font-semibold text-gray-900 text-lg">
                              {jobPlan.jobPlanId}
                            </p>
                          </div>

                          {/* NRC Job No */}
                          <div className="flex flex-col">
                            <p className="text-sm text-gray-600 mb-1">
                              NRC Job No
                            </p>
                            <p className="font-medium text-gray-900">
                              {jobPlan.nrcJobNo}
                            </p>
                          </div>

                          {/* Job Demand */}
                          <div className="flex flex-col">
                            <p className="text-sm text-gray-600 mb-1">
                              Job Demand
                            </p>
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium w-fit ${
                                jobPlan.jobDemand === "high"
                                  ? "bg-red-500 text-white font-bold"
                                  : jobPlan.jobDemand === "medium"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {jobPlan.jobDemand === "high"
                                ? "Urgent"
                                : jobPlan.jobDemand === "medium"
                                ? "Regular"
                                : jobPlan.jobDemand || "N/A"}
                            </span>
                          </div>

                          {/* Created At */}
                          <div className="flex flex-col">
                            <p className="text-sm text-gray-600 mb-1">
                              Created At
                            </p>
                            <p className="font-medium text-gray-900">
                              {formatDate(jobPlan.createdAt)}
                            </p>
                          </div>
                        </div>

                        {/* Action Button */}
                        <button
                          className="ml-4 bg-[#00AEEF] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#0099cc] transition shadow-md"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedJobPlan(jobPlan);
                          }}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {selectedJobPlan && (
        <JobPlanningDetailModal
          jobPlan={selectedJobPlan}
          onClose={() => setSelectedJobPlan(null)}
        />
      )}
    </div>
  );
};

export default JobAssigned;
