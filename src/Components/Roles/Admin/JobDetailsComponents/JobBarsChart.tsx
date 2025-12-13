import React from "react";
import {
  TrendingUp,
  CheckCircle,
  PlayCircle,
  Clock,
  PauseCircle,
} from "lucide-react";
import { useUsers } from "../../../../context/UsersContext";

interface JobPlan {
  id: number;
  nrcJobNo: string;
  company: string;
  boardSize: string;
  gsm: string;
  artwork: string;
  approvalDate: string;
  dispatchDate: string;
  status: string;
  steps: JobPlanStep[];
  createdAt: string;
}

interface JobPlanStep {
  id: number;
  stepName: string;
  status: string;
  stepDetails?: any;
}

interface CompletedJob {
  id: number;
  nrcJobNo: string;
  jobPlanId: number;
  jobDemand: string;
  jobDetails: {
    id: number;
    srNo: number;
    noUps: string;
    width: number;
    height: string;
    length: number;
    status: string;
    preRate: number;
    styleId: string;
    clientId: string;
    boardSize: string;
    jobDemand: string;
    customerName: string;
    boxDimensions: string;
    processColors: string;
    artworkApprovedDate: string;
    artworkReceivedDate: string;
    shadeCardApprovalDate: string;
  };
  purchaseOrderDetails: {
    id: number;
    unit: string;
    poDate: string;
    status: string;
    customer: string;
    poNumber: string;
    noOfSheets: number;
    totalPOQuantity: number;
    deliveryDate: string;
  };
  allSteps: Array<{
    id: number;
    stepName: string;
    status: string;
    startDate: string;
    endDate: string;
    machineDetails: Array<{
      unit: string;
      machineId: string;
      machineCode: string;
      machineType: string;
    }>;
  }>;
  completedAt: string;
  completedBy: string;
  finalStatus: string;
  createdAt: string;
}

interface JobBarsChartProps {
  jobs: (CompletedJob | JobPlan)[];
  category: "completed" | "inProgress" | "planned" | "held";
  onJobClick: (job: CompletedJob | JobPlan) => void;
  searchTerm: string;
}

const JobBarsChart: React.FC<JobBarsChartProps> = ({
  jobs,
  category,
  onJobClick,
  searchTerm,
}) => {
  const { getUserName } = useUsers();

  // Format date as dd/mm/yyyy (date only, no time)
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return "Invalid date";
    }
  };
  // Helper function to get company/customer name
  const getCompanyName = (job: CompletedJob | JobPlan) => {
    if ("company" in job) {
      return job.company;
    } else {
      return job.jobDetails?.customerName;
    }
  };

  // Helper function to get steps
  const getSteps = (job: CompletedJob | JobPlan) => {
    if ("steps" in job) {
      return job.steps;
    } else {
      return job.allSteps;
    }
  };

  // Helper function to check if a step is completed
  const isStepCompleted = (step: any): boolean => {
    // Check if status is "stop" or "accept" (both indicate completion)
    if (step.status === "stop" || step.status === "accept") {
      return true;
    }

    // Check if step has an endDate (indicates completion)
    if (step.endDate !== null && step.endDate !== undefined) {
      return true;
    }

    // Check stepDetails status
    if (step.stepDetails?.data?.status === "accept") {
      return true;
    }
    if (step.stepDetails?.status === "accept") {
      return true;
    }

    // Check step-specific detail fields (e.g., paperStore, printingDetails, etc.)
    if (
      step.paperStore?.status === "accept" ||
      step.printingDetails?.status === "accept" ||
      step.corrugation?.status === "accept" ||
      step.flutelam?.status === "accept" ||
      step.fluteLaminateBoardConversion?.status === "accept" ||
      step.punching?.status === "accept" ||
      step.sideFlapPasting?.status === "accept" ||
      step.qualityDept?.status === "accept" ||
      step.dispatchProcess?.status === "accept"
    ) {
      return true;
    }

    return false;
  };

  // Filter jobs based on search term
  console.log(
    `🔍 JobBarsChart: Received ${jobs.length} jobs for category ${category}`
  );
  console.log(`🔍 JobBarsChart: Jobs data:`, jobs);

  const filteredJobs = jobs.filter((job) => {
    const jobNumber =
      job.nrcJobNo || (job as any).jobDetails?.nrcJobNo || job.id?.toString();
    console.log(`🔍 JobBarsChart: Job number for filtering: ${jobNumber}`);
    return (
      jobNumber && jobNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  console.log(`🔍 JobBarsChart: Filtered to ${filteredJobs.length} jobs`);

  // Get category-specific styling
  const getCategoryStyles = () => {
    switch (category) {
      case "completed":
        return {
          bgColor: "bg-green-500 hover:bg-green-600",
          borderColor: "border-green-600",
          icon: <CheckCircle className="h-4 w-4 text-white" />,
          label: "Completed",
        };
      case "inProgress":
        return {
          bgColor: "bg-yellow-500 hover:bg-yellow-600",
          borderColor: "border-yellow-600",
          icon: <PlayCircle className="h-4 w-4 text-white" />,
          label: "In Progress",
        };
      case "planned":
        return {
          bgColor: "bg-gray-500 hover:bg-gray-600",
          borderColor: "border-gray-600",
          icon: <Clock className="h-4 w-4 text-white" />,
          label: "Planned",
        };
      case "held":
        return {
          bgColor: "bg-orange-500 hover:bg-orange-600",
          borderColor: "border-orange-600",
          icon: <PauseCircle className="h-4 w-4 text-white" />,
          label: "Held",
        };
      default:
        return {
          bgColor: "bg-blue-500 hover:bg-blue-600",
          borderColor: "border-blue-600",
          icon: <TrendingUp className="h-4 w-4 text-white" />,
          label: "Unknown",
        };
    }
  };

  const styles = getCategoryStyles();

  if (filteredJobs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">
          {searchTerm
            ? "No jobs found matching your search."
            : `No ${styles.label.toLowerCase()} jobs found.`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 mb-4">
        {styles.icon}
        <h3 className="text-lg font-semibold text-gray-800">
          {styles.label} Jobs ({filteredJobs.length})
        </h3>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
        {filteredJobs.map((job, index) => (
          <div
            key={job.id || index}
            onClick={() => onJobClick(job)}
            className={`
              ${styles.bgColor} ${styles.borderColor}
              border-2 rounded-lg p-3 cursor-pointer transition-all duration-200
              transform hover:scale-105 hover:shadow-lg
              text-white
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-bold text-sm mb-1">{job.nrcJobNo}</h4>
                <p className="text-xs opacity-90">
                  {getCompanyName(job) || "N/A"}
                </p>
                {"completedBy" in job && job.completedBy && (
                  <p className="text-xs opacity-75 mt-1">
                    Completed by: {getUserName(job.completedBy)}
                  </p>
                )}

                {/* Show held step information for held jobs */}
                {category === "held" && "steps" in job && (
                  <p className="text-xs opacity-75 mt-1">
                    {(() => {
                      const heldStep = job.steps.find(
                        (step) =>
                          step.stepDetails?.data?.status === "hold" ||
                          step.stepDetails?.status === "hold"
                      );
                      return heldStep
                        ? `Held at: ${heldStep.stepName.replace(
                            /([a-z])([A-Z])/g,
                            "$1 $2"
                          )}`
                        : "On Hold";
                    })()}
                  </p>
                )}
              </div>

              <div className="text-right text-xs opacity-90">
                <div className="mb-1">
                  {job.createdAt && <p>Created: {formatDate(job.createdAt)}</p>}
                  {"completedAt" in job && job.completedAt && (
                    <p>Completed: {formatDate(job.completedAt)}</p>
                  )}
                </div>
                {"totalDuration" in job && (job as any).totalDuration && (
                  <p>Duration: {(job as any).totalDuration} days</p>
                )}
              </div>
            </div>

            {/* Progress indicator for in-progress jobs */}
            {category === "inProgress" && (
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Progress</span>
                  <span>
                    {(() => {
                      const completedSteps =
                        getSteps(job)?.filter((step: any) =>
                          isStepCompleted(step)
                        ).length || 0;
                      const totalSteps = getSteps(job)?.length || 0;

                      // Debug logging
                      console.log(`Job ${job.nrcJobNo} progress:`, {
                        completedSteps,
                        totalSteps,
                        steps: getSteps(job),
                        percentage:
                          totalSteps > 0
                            ? (completedSteps / totalSteps) * 100
                            : 0,
                      });

                      return `${completedSteps}/${totalSteps}`;
                    })()}
                  </span>
                </div>
                <div className="w-full bg-gray-300 bg-opacity-50 rounded-full h-3">
                  <div
                    className="bg-white h-3 rounded-full transition-all duration-500 ease-out shadow-lg border border-gray-400"
                    style={{
                      width: `${(() => {
                        const completedSteps =
                          getSteps(job)?.filter((step: any) =>
                            isStepCompleted(step)
                          ).length || 0;
                        const totalSteps = getSteps(job)?.length || 1;
                        const percentage = (completedSteps / totalSteps) * 100;
                        console.log(
                          `Progress bar width for ${job.nrcJobNo}: ${percentage}%`
                        );
                        // Only apply minimum width if there are completed steps
                        const finalPercentage =
                          completedSteps > 0
                            ? Math.max(percentage, 5)
                            : percentage;
                        console.log(
                          `Final progress bar percentage: ${finalPercentage}%`
                        );
                        return finalPercentage;
                      })()}%`,
                      minWidth: "2%", // Ensure minimum visibility
                    }}
                  />
                </div>
              </div>
            )}

            {/* Progress indicator for held jobs - show progress up to hold point */}
            {category === "held" && (
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Progress (Held)</span>
                  <span>
                    {(() => {
                      const completedSteps =
                        getSteps(job)?.filter((step: any) =>
                          isStepCompleted(step)
                        ).length || 0;
                      const totalSteps = getSteps(job)?.length || 0;

                      // Debug logging
                      console.log(`Held Job ${job.nrcJobNo} progress:`, {
                        completedSteps,
                        totalSteps,
                        steps: getSteps(job),
                        percentage:
                          totalSteps > 0
                            ? (completedSteps / totalSteps) * 100
                            : 0,
                      });

                      return `${completedSteps}/${totalSteps}`;
                    })()}
                  </span>
                </div>
                <div className="w-full bg-gray-300 bg-opacity-50 rounded-full h-3">
                  <div
                    className="bg-orange-300 h-3 rounded-full transition-all duration-500 ease-out shadow-lg border border-orange-400"
                    style={{
                      width: `${(() => {
                        const completedSteps =
                          getSteps(job)?.filter((step: any) =>
                            isStepCompleted(step)
                          ).length || 0;
                        const totalSteps = getSteps(job)?.length || 1;
                        const percentage = (completedSteps / totalSteps) * 100;
                        console.log(
                          `Held progress bar width for ${job.nrcJobNo}: ${percentage}%`
                        );
                        // Only apply minimum width if there are completed steps
                        const finalPercentage =
                          completedSteps > 0
                            ? Math.max(percentage, 5)
                            : percentage;
                        console.log(
                          `Final held progress bar percentage: ${finalPercentage}%`
                        );
                        return finalPercentage;
                      })()}%`,
                      minWidth: "2%", // Ensure minimum visibility
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobBarsChart;
