const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api`;

export interface ProductionStep {
  id: number;
  stepNo: number;
  stepName: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  user: string | null;
  machineDetails: Array<{
    unit: string | null;
    machineId: string | number;
    machineCode: string | null;
    machineType: string;
    machine?: {
      id: string;
      description: string;
      status: string;
      capacity: number;
    };
  }>;
  createdAt: string;
  updatedAt: string;
  // Step-specific details (from allStepDetails)
  corrugation?: Array<{ status?: string; [key: string]: any }>;
  flutelam?: Array<{ status?: string; [key: string]: any }>;
  fluteLaminateBoardConversion?: Array<{ status?: string; [key: string]: any }>;
  punching?: Array<{ status?: string; [key: string]: any }>;
  sideFlapPasting?: Array<{ status?: string; [key: string]: any }>;
  [key: string]: any; // Allow other properties
}

export interface JobPlan {
  jobPlanId: number;
  nrcJobNo: string;
  jobDemand: string;
  createdAt: string;
  updatedAt: string;
  steps: ProductionStep[];
  allStepDetails?: {
    corrugation?: Array<{ status?: string; [key: string]: any }>;
    flutelam?: Array<{ status?: string; [key: string]: any }>;
    fluteLaminateBoardConversion?: Array<{
      status?: string;
      [key: string]: any;
    }>;
    punching?: Array<{ status?: string; [key: string]: any }>;
    sideFlapPasting?: Array<{ status?: string; [key: string]: any }>;
    [key: string]: any;
  };
  [key: string]: any; // Allow other properties
}

export interface ProductionData {
  corrugation: ProductionStep[];
  fluteLamination: ProductionStep[];
  punching: ProductionStep[];
  flapPasting: ProductionStep[];
}

export interface AggregatedProductionData {
  totalJobs: number;
  stepSummary: {
    corrugation: {
      total: number;
      planned: number;
      start: number;
      stop: number;
      completed: number;
      inProgress: number;
    };
    fluteLamination: {
      total: number;
      planned: number;
      start: number;
      stop: number;
      completed: number;
      inProgress: number;
    };
    punching: {
      total: number;
      planned: number;
      start: number;
      stop: number;
      completed: number;
      inProgress: number;
    };
    flapPasting: {
      total: number;
      planned: number;
      start: number;
      stop: number;
      completed: number;
      inProgress: number;
    };
  };
  overallEfficiency: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
}

class ProductionService {
  // Check if user is authenticated
  private isAuthenticated(): boolean {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) return false;

    try {
      // Check if token is expired
      const tokenData = JSON.parse(atob(accessToken.split(".")[1]));
      const currentTime = Date.now() / 1000;
      return tokenData.exp > currentTime;
    } catch {
      return false;
    }
  }

  // Check if token is about to expire (within 5 minutes)
  private isTokenExpiringSoon(): boolean {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) return false;

    try {
      const tokenData = JSON.parse(atob(accessToken.split(".")[1]));
      const currentTime = Date.now() / 1000;
      const fiveMinutes = 5 * 60; // 5 minutes in seconds
      return tokenData.exp - currentTime < fiveMinutes;
    } catch {
      return false;
    }
  }

  private async fetchFromApi<T>(endpoint: string): Promise<T> {
    try {
      // Check authentication first
      if (!this.isAuthenticated()) {
        throw new Error(
          "Authentication token not found or expired. Please log in."
        );
      }

      // Warn if token is expiring soon
      if (this.isTokenExpiringSoon()) {
        console.warn(
          "Warning: Your session will expire soon. Please save your work and log in again."
        );
      }

      // Get access token from localStorage
      const accessToken = localStorage.getItem("accessToken");

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication failed. Please log in again.");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<T> = await response.json();
      if (!result.success) {
        throw new Error(result.message || "API request failed");
      }
      return result.data;
    } catch (error) {
      console.error(`Error fetching from ${endpoint}:`, error);

      // Handle authentication errors
      if (error instanceof Error) {
        this.handleAuthError(error);
      }

      throw error;
    }
  }

  // Get all job plans from the comprehensive job-planning API
  async getAllJobPlans(): Promise<JobPlan[]> {
    const timestamp = new Date().getTime();
    return this.fetchFromApi<JobPlan[]>(`/job-planning?t=${timestamp}`);
  }

  // Get specific job plan by NRC Job No
  async getJobPlanByNrcJobNo(nrcJobNo: string): Promise<JobPlan | null> {
    try {
      const allJobs = await this.getAllJobPlans();
      const job = allJobs.find((job) => job.nrcJobNo === nrcJobNo);
      return job || null;
    } catch (error) {
      console.error("Error fetching job plan:", error);
      return null;
    }
  }

  // Get completed jobs data (includes allStepDetails)
  async getCompletedJobs(): Promise<any[]> {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(`${API_BASE_URL}/completed-jobs`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication failed. Please log in again.");
        }
        return [];
      }

      const result: ApiResponse<any[]> = await response.json();
      if (!result.success || !Array.isArray(result.data)) {
        return [];
      }
      return result.data;
    } catch (error) {
      console.error("Error fetching completed jobs:", error);
      return [];
    }
  }

  // Get aggregated production data for all jobs (4 production steps only)
  async getAggregatedProductionData(): Promise<AggregatedProductionData> {
    try {
      const [allJobPlans, completedJobs] = await Promise.all([
        this.getAllJobPlans(),
        this.getCompletedJobs(),
      ]);

      // Create a map of completed jobs by nrcJobNo for quick lookup
      const completedJobsMap = new Map<string, any>();
      completedJobs.forEach((job: any) => {
        completedJobsMap.set(job.nrcJobNo, job);
      });

      // Initialize counters for each step
      const stepSummary = {
        corrugation: {
          total: 0,
          planned: 0,
          start: 0,
          stop: 0,
          completed: 0,
          inProgress: 0,
        },
        fluteLamination: {
          total: 0,
          planned: 0,
          start: 0,
          stop: 0,
          completed: 0,
          inProgress: 0,
        },
        punching: {
          total: 0,
          planned: 0,
          start: 0,
          stop: 0,
          completed: 0,
          inProgress: 0,
        },
        flapPasting: {
          total: 0,
          planned: 0,
          start: 0,
          stop: 0,
          completed: 0,
          inProgress: 0,
        },
      };

      let totalJobs = 0;
      let completedSteps = 0;
      let totalSteps = 0;

      // Process each job plan
      allJobPlans.forEach((jobPlan) => {
        totalJobs++;

        // Get completed job data if available (for allStepDetails)
        const completedJob = completedJobsMap.get(jobPlan.nrcJobNo);
        const allStepDetails =
          completedJob?.allStepDetails || jobPlan.allStepDetails;

        // Filter only the 4 production steps we care about
        const productionSteps = jobPlan.steps.filter(
          (step) =>
            step.stepName === "Corrugation" ||
            step.stepName === "FluteLaminateBoardConversion" ||
            step.stepName === "Punching" ||
            step.stepName === "SideFlapPasting"
        );

        // Count statuses for each step
        productionSteps.forEach((step) => {
          totalSteps++;

          let stepKey: keyof typeof stepSummary;
          switch (step.stepName) {
            case "Corrugation":
              stepKey = "corrugation";
              break;
            case "FluteLaminateBoardConversion":
              stepKey = "fluteLamination";
              break;
            case "Punching":
              stepKey = "punching";
              break;
            case "SideFlapPasting":
              stepKey = "flapPasting";
              break;
            default:
              return; // Skip if not one of our 4 steps
          }

          stepSummary[stepKey].total++;

          // 🔥 NEW: Check if step.status is "stop" and check allStepDetails for "accept" status
          let isCompleted = false;
          if (step.status === "stop") {
            // Map step name to allStepDetails key
            const stepDetailKey =
              step.stepName === "FluteLaminateBoardConversion"
                ? "flutelam"
                : step.stepName === "SideFlapPasting"
                ? "sideFlapPasting"
                : step.stepName.toLowerCase();

            // FIRST: Check stepDetails.data[stepName].status (e.g., stepDetails.data.corrugation.status)
            // This is the most direct way to check accept status for each step
            if ((step as any).stepDetails?.data) {
              const stepDataKey =
                step.stepName === "FluteLaminateBoardConversion"
                  ? "flutelam"
                  : step.stepName === "SideFlapPasting"
                  ? "sideFlapPasting"
                  : step.stepName.toLowerCase();
              
              const stepData = ((step as any).stepDetails.data as any)[stepDataKey];
              if (stepData && stepData.status === "accept") {
                isCompleted = true;
              }
            }

            // SECOND: Check allStepDetails from completed job or jobPlan
            if (!isCompleted && allStepDetails) {
              const stepDetails =
                allStepDetails[stepDetailKey as keyof typeof allStepDetails];
              if (Array.isArray(stepDetails) && stepDetails.length > 0) {
                // Check if any step detail has "accept" status
                const hasAcceptStatus = stepDetails.some(
                  (detail: any) => detail.status === "accept"
                );
                if (hasAcceptStatus) {
                  isCompleted = true;
                }
              }
            }

            // THIRD: Check step-level details (for backward compatibility)
            if (!isCompleted) {
              const stepDetailProp =
                step.stepName === "FluteLaminateBoardConversion"
                  ? "flutelam"
                  : step.stepName === "SideFlapPasting"
                  ? "sideFlapPasting"
                  : step.stepName.toLowerCase();

              const stepDetails = (step as any)[stepDetailProp];
              if (Array.isArray(stepDetails) && stepDetails.length > 0) {
                const hasAcceptStatus = stepDetails.some(
                  (detail: any) => detail.status === "accept"
                );
                if (hasAcceptStatus) {
                  isCompleted = true;
                }
              }
            }
            
            // FOURTH: Check stepDetails.data.status and stepDetails.status (fallback)
            if (!isCompleted) {
              if ((step as any).stepDetails?.data?.status === "accept" || (step as any).stepDetails?.status === "accept") {
                isCompleted = true;
              }
            }
          }

          switch (step.status) {
            case "planned":
              stepSummary[stepKey].planned++;
              break;
            case "start":
              stepSummary[stepKey].start++;
              stepSummary[stepKey].inProgress++;
              break;
            case "stop":
              if (isCompleted) {
                // If step detail has "accept", count as completed (NOT as stop)
                stepSummary[stepKey].completed++;
                completedSteps++;
              } else {
                // Otherwise, count as stop and in progress
                stepSummary[stepKey].stop++;
                stepSummary[stepKey].inProgress++;
              }
              break;
            case "completed":
            case "accept": // 🔥 NEW: Treat 'accept' status as completed
              stepSummary[stepKey].completed++;
              completedSteps++;
              break;
            default:
              stepSummary[stepKey].planned++; // Default to planned
              break;
          }
        });
      });

      // Calculate overall efficiency
      const overallEfficiency =
        totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

      return {
        totalJobs,
        stepSummary,
        overallEfficiency,
      };
    } catch (error) {
      console.error("Error fetching aggregated production data:", error);
      throw error;
    }
  }

  // Add these methods to your ProductionService class

  // Get jobs by step and status
  async getJobsByStepAndStatus(
    stepName: string,
    status: string
  ): Promise<
    Array<{
      jobPlan: JobPlan;
      step: ProductionStep;
    }>
  > {
    try {
      const [allJobPlans, completedJobs] = await Promise.all([
        this.getAllJobPlans(),
        this.getCompletedJobs(),
      ]);

      // Create a map of completed jobs by nrcJobNo for quick lookup
      const completedJobsMap = new Map<string, any>();
      completedJobs.forEach((job: any) => {
        completedJobsMap.set(job.nrcJobNo, job);
      });

      const filteredJobs: Array<{ jobPlan: JobPlan; step: ProductionStep }> =
        [];

      // Map step names to match the data
      const stepNameMapping: { [key: string]: string } = {
        corrugation: "Corrugation",
        fluteLamination: "FluteLaminateBoardConversion",
        punching: "Punching",
        flapPasting: "SideFlapPasting",
      };

      const targetStepName = stepNameMapping[stepName];
      if (!targetStepName) return [];

      allJobPlans.forEach((jobPlan) => {
        // Get completed job data if available (for allStepDetails)
        const completedJob = completedJobsMap.get(jobPlan.nrcJobNo);
        const allStepDetails =
          completedJob?.allStepDetails || jobPlan.allStepDetails;

        const matchingSteps = jobPlan.steps.filter((step) => {
          if (step.stepName !== targetStepName) return false;

          // Helper function to check if step has "accept" status in allStepDetails
          const hasAcceptStatus = () => {
            // FIRST: Check stepDetails.data[stepName].status (e.g., stepDetails.data.corrugation.status)
            // This is the most direct way to check accept status for each step
            if ((step as any).stepDetails?.data) {
              const stepDataKey =
                step.stepName === "FluteLaminateBoardConversion"
                  ? "flutelam"
                  : step.stepName === "SideFlapPasting"
                  ? "sideFlapPasting"
                  : step.stepName.toLowerCase();
              
              const stepData = ((step as any).stepDetails.data as any)[stepDataKey];
              if (stepData && stepData.status === "accept") {
                return true;
              }
            }
            
            // SECOND: Check stepDetails.data.status (fallback)
            if ((step as any).stepDetails?.data?.status === "accept") {
              return true;
            }
            if ((step as any).stepDetails?.status === "accept") {
              return true;
            }

            const stepDetailKey =
              step.stepName === "FluteLaminateBoardConversion"
                ? "flutelam"
                : step.stepName === "SideFlapPasting"
                ? "sideFlapPasting"
                : step.stepName.toLowerCase();

            // THIRD: Check allStepDetails from completed job or jobPlan
            if (allStepDetails) {
              const stepDetails =
                allStepDetails[stepDetailKey as keyof typeof allStepDetails];
              if (Array.isArray(stepDetails) && stepDetails.length > 0) {
                if (
                  stepDetails.some((detail: any) => detail.status === "accept")
                ) {
                  return true;
                }
              }
            }

            // FOURTH: Check step-level details (direct properties on step)
            const stepDetailProp =
              step.stepName === "FluteLaminateBoardConversion"
                ? "flutelam"
                : step.stepName === "SideFlapPasting"
                ? "sideFlapPasting"
                : step.stepName.toLowerCase();

            const stepDetails = (step as any)[stepDetailProp];
            if (Array.isArray(stepDetails) && stepDetails.length > 0) {
              if (
                stepDetails.some((detail: any) => detail.status === "accept")
              ) {
                return true;
              }
            }
            return false;
          };

          // 🔥 NEW: If filtering for 'completed', check multiple conditions
          if (status === "completed") {
            // Direct status check
            if (step.status === "completed" || step.status === "accept") {
              return true;
            }

            // Check if step.status is "stop" and allStepDetails has "accept"
            if (step.status === "stop" && hasAcceptStatus()) {
              return true;
            }

            return false;
          }

          // 🔥 NEW: If filtering for 'stop', exclude steps that have "accept" status
          if (status === "stop") {
            // If step has "accept" status in allStepDetails, exclude it from stop list
            if (step.status === "stop" && hasAcceptStatus()) {
              return false;
            }
            return step.status === status;
          }

          return step.status === status;
        });

        matchingSteps.forEach((step) => {
          // 🔥 NEW: Check if step has "accept" status in allStepDetails and update status to "accepted"
          let displayStep = { ...step };
          if (step.status === "stop") {
            const stepDetailKey =
              step.stepName === "FluteLaminateBoardConversion"
                ? "flutelam"
                : step.stepName === "SideFlapPasting"
                ? "sideFlapPasting"
                : step.stepName.toLowerCase();

            // Check allStepDetails from completed job or jobPlan
            if (allStepDetails) {
              const stepDetails =
                allStepDetails[stepDetailKey as keyof typeof allStepDetails];
              if (Array.isArray(stepDetails) && stepDetails.length > 0) {
                const hasAcceptStatus = stepDetails.some(
                  (detail: any) => detail.status === "accept"
                );
                if (hasAcceptStatus) {
                  displayStep = { ...step, status: "accepted" };
                }
              }
            }

            // Check step-level details
            if (displayStep.status === "stop") {
              const stepDetailProp =
                step.stepName === "FluteLaminateBoardConversion"
                  ? "flutelam"
                  : step.stepName === "SideFlapPasting"
                  ? "sideFlapPasting"
                  : step.stepName.toLowerCase();

              const stepDetails = (step as any)[stepDetailProp];
              if (Array.isArray(stepDetails) && stepDetails.length > 0) {
                const hasAcceptStatus = stepDetails.some(
                  (detail: any) => detail.status === "accept"
                );
                if (hasAcceptStatus) {
                  displayStep = { ...step, status: "accepted" };
                }
              }
            }
          }

          filteredJobs.push({ jobPlan, step: displayStep });
        });
      });

      return filteredJobs;
    } catch (error) {
      console.error("Error fetching jobs by step and status:", error);
      return [];
    }
  }

  // Get all steps by status across all jobs
  async getAllStepsByStatus(status: string): Promise<
    Array<{
      jobPlan: JobPlan;
      step: ProductionStep;
    }>
  > {
    try {
      const [allJobPlans, completedJobs] = await Promise.all([
        this.getAllJobPlans(),
        this.getCompletedJobs(),
      ]);

      // Create a map of completed jobs by nrcJobNo for quick lookup
      const completedJobsMap = new Map<string, any>();
      completedJobs.forEach((job: any) => {
        completedJobsMap.set(job.nrcJobNo, job);
      });

      const filteredJobs: Array<{ jobPlan: JobPlan; step: ProductionStep }> =
        [];

      const productionStepNames = [
        "Corrugation",
        "FluteLaminateBoardConversion",
        "Punching",
        "SideFlapPasting",
      ];

      allJobPlans.forEach((jobPlan) => {
        // Get completed job data if available (for allStepDetails)
        const completedJob = completedJobsMap.get(jobPlan.nrcJobNo);
        const allStepDetails =
          completedJob?.allStepDetails || jobPlan.allStepDetails;

        const matchingSteps = jobPlan.steps.filter((step) => {
          if (!productionStepNames.includes(step.stepName)) return false;

          // Helper function to check if step has "accept" status in allStepDetails
          const hasAcceptStatus = () => {
            // FIRST: Check stepDetails.data[stepName].status (e.g., stepDetails.data.corrugation.status)
            // This is the most direct way to check accept status for each step
            if ((step as any).stepDetails?.data) {
              const stepDataKey =
                step.stepName === "FluteLaminateBoardConversion"
                  ? "flutelam"
                  : step.stepName === "SideFlapPasting"
                  ? "sideFlapPasting"
                  : step.stepName.toLowerCase();
              
              const stepData = ((step as any).stepDetails.data as any)[stepDataKey];
              if (stepData && stepData.status === "accept") {
                return true;
              }
            }
            
            // SECOND: Check stepDetails.data.status (fallback)
            if ((step as any).stepDetails?.data?.status === "accept") {
              return true;
            }
            if ((step as any).stepDetails?.status === "accept") {
              return true;
            }

            const stepDetailKey =
              step.stepName === "FluteLaminateBoardConversion"
                ? "flutelam"
                : step.stepName === "SideFlapPasting"
                ? "sideFlapPasting"
                : step.stepName.toLowerCase();

            // THIRD: Check allStepDetails from completed job or jobPlan
            if (allStepDetails) {
              const stepDetails =
                allStepDetails[stepDetailKey as keyof typeof allStepDetails];
              if (Array.isArray(stepDetails) && stepDetails.length > 0) {
                if (
                  stepDetails.some((detail: any) => detail.status === "accept")
                ) {
                  return true;
                }
              }
            }

            // FOURTH: Check step-level details (direct properties on step)
            const stepDetailProp =
              step.stepName === "FluteLaminateBoardConversion"
                ? "flutelam"
                : step.stepName === "SideFlapPasting"
                ? "sideFlapPasting"
                : step.stepName.toLowerCase();

            const stepDetails = (step as any)[stepDetailProp];
            if (Array.isArray(stepDetails) && stepDetails.length > 0) {
              if (
                stepDetails.some((detail: any) => detail.status === "accept")
              ) {
                return true;
              }
            }
            return false;
          };

          // 🔥 NEW: If filtering for 'completed', check multiple conditions
          if (status === "completed") {
            // Direct status check
            if (step.status === "completed" || step.status === "accept") {
              return true;
            }

            // Check if step.status is "stop" and allStepDetails has "accept"
            if (step.status === "stop" && hasAcceptStatus()) {
              return true;
            }

            return false;
          }

          // 🔥 NEW: If filtering for 'stop', exclude steps that have "accept" status
          if (status === "stop") {
            // If step has "accept" status in allStepDetails, exclude it from stop list
            if (step.status === "stop" && hasAcceptStatus()) {
              return false;
            }
            return step.status === status;
          }

          return step.status === status;
        });

        matchingSteps.forEach((step) => {
          // 🔥 NEW: Check if step has "accept" status in allStepDetails and update status to "accepted"
          let displayStep = { ...step };
          if (step.status === "stop") {
            const stepDetailKey =
              step.stepName === "FluteLaminateBoardConversion"
                ? "flutelam"
                : step.stepName === "SideFlapPasting"
                ? "sideFlapPasting"
                : step.stepName.toLowerCase();

            // Check allStepDetails from completed job or jobPlan
            if (allStepDetails) {
              const stepDetails =
                allStepDetails[stepDetailKey as keyof typeof allStepDetails];
              if (Array.isArray(stepDetails) && stepDetails.length > 0) {
                const hasAcceptStatus = stepDetails.some(
                  (detail: any) => detail.status === "accept"
                );
                if (hasAcceptStatus) {
                  displayStep = { ...step, status: "accepted" };
                }
              }
            }

            // Check step-level details
            if (displayStep.status === "stop") {
              const stepDetailProp =
                step.stepName === "FluteLaminateBoardConversion"
                  ? "flutelam"
                  : step.stepName === "SideFlapPasting"
                  ? "sideFlapPasting"
                  : step.stepName.toLowerCase();

              const stepDetails = (step as any)[stepDetailProp];
              if (Array.isArray(stepDetails) && stepDetails.length > 0) {
                const hasAcceptStatus = stepDetails.some(
                  (detail: any) => detail.status === "accept"
                );
                if (hasAcceptStatus) {
                  displayStep = { ...step, status: "accepted" };
                }
              }
            }
          }

          filteredJobs.push({ jobPlan, step: displayStep });
        });
      });

      return filteredJobs;
    } catch (error) {
      console.error("Error fetching all steps by status:", error);
      return [];
    }
  }

  // Get production data for a specific job (4 production steps only)
  async getProductionDataByJob(nrcJobNo: string): Promise<ProductionData> {
    try {
      const jobPlan = await this.getJobPlanByNrcJobNo(nrcJobNo);

      if (!jobPlan) {
        return {
          corrugation: [],
          fluteLamination: [],
          punching: [],
          flapPasting: [],
        };
      }

      // Filter and map only the 4 production steps
      const corrugation = jobPlan.steps.filter(
        (step) => step.stepName === "Corrugation"
      );
      const fluteLamination = jobPlan.steps.filter(
        (step) => step.stepName === "FluteLaminateBoardConversion"
      );
      const punching = jobPlan.steps.filter(
        (step) => step.stepName === "Punching"
      );
      const flapPasting = jobPlan.steps.filter(
        (step) => step.stepName === "SideFlapPasting"
      );

      return {
        corrugation,
        fluteLamination,
        punching,
        flapPasting,
      };
    } catch (error) {
      console.error("Error fetching production data for job:", error);
      return {
        corrugation: [],
        fluteLamination: [],
        punching: [],
        flapPasting: [],
      };
    }
  }

  // Search jobs by NRC Job No or partial match
  async searchJobs(searchTerm: string): Promise<
    Array<{
      nrcJobNo: string;
      jobDemand: string;
      totalSteps: number;
      hasProductionSteps: boolean;
    }>
  > {
    try {
      const allJobs = await this.getAllJobPlans();

      if (!searchTerm.trim()) {
        return allJobs.map((job) => {
          // Check if this job has any of the 4 production steps
          const hasProductionSteps = job.steps.some(
            (step) =>
              step.stepName === "Corrugation" ||
              step.stepName === "FluteLaminateBoardConversion" ||
              step.stepName === "Punching" ||
              step.stepName === "SideFlapPasting"
          );

          return {
            nrcJobNo: job.nrcJobNo,
            jobDemand: job.jobDemand,
            totalSteps: job.steps.length,
            hasProductionSteps,
          };
        });
      }

      const term = searchTerm.toLowerCase();
      const filteredJobs = allJobs.filter((job) =>
        job.nrcJobNo.toLowerCase().includes(term)
      );

      return filteredJobs.map((job) => {
        // Check if this job has any of the 4 production steps
        const hasProductionSteps = job.steps.some(
          (step) =>
            step.stepName === "Corrugation" ||
            step.stepName === "FluteLaminateBoardConversion" ||
            step.stepName === "Punching" ||
            step.stepName === "SideFlapPasting"
        );

        return {
          nrcJobNo: job.nrcJobNo,
          jobDemand: job.jobDemand,
          totalSteps: job.steps.length,
          hasProductionSteps,
        };
      });
    } catch (error) {
      console.error("Error searching jobs:", error);
      return [];
    }
  }

  // Get analytics data for charts
  getAnalyticsData(productionData: ProductionData) {
    // Production efficiency over time - include 'accept' status as completed
    const efficiencyData = {
      corrugation:
        productionData.corrugation.length > 0
          ? (productionData.corrugation.filter(
              (step) => step.status === "completed" || step.status === "accept"
            ).length /
              productionData.corrugation.length) *
            100
          : 0,
      fluteLamination:
        productionData.fluteLamination.length > 0
          ? (productionData.fluteLamination.filter(
              (step) => step.status === "completed" || step.status === "accept"
            ).length /
              productionData.fluteLamination.length) *
            100
          : 0,
      punching:
        productionData.punching.length > 0
          ? (productionData.punching.filter(
              (step) => step.status === "completed" || step.status === "accept"
            ).length /
              productionData.punching.length) *
            100
          : 0,
      flapPasting:
        productionData.flapPasting.length > 0
          ? (productionData.flapPasting.filter(
              (step) => step.status === "completed" || step.status === "accept"
            ).length /
              productionData.flapPasting.length) *
            100
          : 0,
    };

    // Machine utilization (if machine data is available)
    const machineData = {
      corrugation: productionData.corrugation
        .map((step) => step.machineDetails[0]?.machineType || "Unknown")
        .filter(Boolean),
      punching: productionData.punching
        .map((step) => step.machineDetails[0]?.machineType || "Unknown")
        .filter(Boolean),
      flapPasting: productionData.flapPasting
        .map((step) => step.machineDetails[0]?.machineType || "Unknown")
        .filter(Boolean),
    };

    return {
      efficiencyData,
      machineData,
    };
  }

  // Handle authentication errors
  private handleAuthError(error: Error): void {
    if (
      error.message.includes("Authentication") ||
      error.message.includes("log in")
    ) {
      // Clear invalid tokens
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userData");

      // Redirect to login page
      window.location.href = "/login";
    }
  }

  // Check authentication status
  checkAuthStatus(): { isAuthenticated: boolean; message: string } {
    if (!this.isAuthenticated()) {
      return {
        isAuthenticated: false,
        message: "Not authenticated. Please log in.",
      };
    }

    if (this.isTokenExpiringSoon()) {
      return {
        isAuthenticated: true,
        message: "Session expiring soon. Please save your work.",
      };
    }

    return {
      isAuthenticated: true,
      message: "Authenticated successfully.",
    };
  }
}

export const productionService = new ProductionService();
export default productionService;
