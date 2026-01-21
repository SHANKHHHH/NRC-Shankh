// src/Components/Roles/Planner/JobInitiationForm.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  useParams,
  useNavigate,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import { Search, CheckCircle, Clock } from "lucide-react";
import type { Job, PoDetailsPayload, JobPlanStep } from "../Types/job.ts";
import ArtworkDetailsForm from "./ArtworkDetailsForm.tsx";
import PODetailsForm from "./PODetailsForm.tsx";
import MoreInformationForm from "./MoreInformationForm.tsx";

interface JobInitiationFormProps {
  onJobUpdated: (updatedJob: Job) => void;
}

type FormStep = "artwork" | "po" | "moreInfo";

const JobInitiationForm: React.FC<JobInitiationFormProps> = ({
  onJobUpdated,
}) => {
   const { nrcJobNo } = useParams<{ nrcJobNo: string }>();
  const [searchParams] = useSearchParams(); // Only one navigate declaration needed
  const navigate = useNavigate();

const location = useLocation();

  const [job, setJob] = useState<Job | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [jobError, setJobError] = useState<string | null>(null);

  // New state for search functionality
  const [searchTerm, setSearchTerm] = useState("");
  const [searchedJob, setSearchedJob] = useState<Job | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState<FormStep>("artwork");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [typingTimeout, setTypingTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
const [jobOptions, setJobOptions] = useState<Job[]>([]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const isDragging = useRef(false);

  // Check if this is the "Add PO" mode (nrcJobNo === 'new' or undefined)
  const isAddPOMode = nrcJobNo === "new" || nrcJobNo === undefined;

  // Debug logging
  console.log("JobInitiationForm - nrcJobNo:", nrcJobNo);
  console.log("JobInitiationForm - isAddPOMode:", isAddPOMode);
  console.log("JobInitiationForm - job:", job);
  console.log("JobInitiationForm - jobError:", jobError);
  console.log("JobInitiationForm - loadingJob:", loadingJob);

  // Define the steps for the sidebar
  const formStepsConfig = [
    { id: "artwork", label: "Artwork Details", component: ArtworkDetailsForm },
    { id: "po", label: "P.O. Details", component: PODetailsForm },
    {
      id: "moreInfo",
      label: "More Information",
      component: MoreInformationForm,
    },
  ];
  useEffect(() => {
    const state = location.state as any;
    
    if (state?.searchJobId) {
      console.log("Auto-searching for job:", state.searchJobId);
      
      // Auto-fill the search and trigger search
      setSearchTerm(state.searchJobId);
      
      // You can also auto-trigger the search logic here
      // This mimics what happens when user types in search
      handleSearchChange({ target: { value: state.searchJobId } } as any);
      
      // Store the target step for later use
      if (state.targetStep) {
        // You might want to store this in state to use after job is found
        localStorage.setItem("targetStep", state.targetStep);
      }
      
      // Clear the state
      window.history.replaceState({}, "", location.pathname);
    }
  }, [location.state]);

//   useEffect(() => {
//   const state = location.state as any;
  
//   if (state?.searchJobId && state?.targetStep) {
//     console.log('Auto-navigating to job:', state.searchJobId, 'step:', state.targetStep);
    
//     // Auto search for the job
//     setSearchTerm(state.searchJobId);
    
//     // If you have a direct job lookup function, use it
//     const autoFindAndSetJob = async () => {
//       try {
//         setSearchLoading(true);
//         // Use your existing job search API
//         const response = await fetch(`/api/jobs/search?nrcJobNo=${encodeURIComponent(state.searchJobId)}`);
//         const jobs = await response.json();
//         const foundJob = jobs.find((job: Job) => job.nrcJobNo === state.searchJobId);
        
//         if (foundJob) {
//           setJob(foundJob);
//           setSearchedJob(foundJob);
//           setCurrentStep(state.targetStep as FormStep);
//         } else {
//           setSearchError(`Job not found: ${state.searchJobId}`);
//         }
//       } catch (error) {
//         console.error('Error finding job:', error);
//         setSearchError('Error searching for job');
//       } finally {
//         setSearchLoading(false);
//       }
//     };
    
//     autoFindAndSetJob();
//     window.history.replaceState({}, '', location.pathname);
//   }
// }, [location.state]);

  // ✅ CORRECTED: Regular job loading (for non-modal navigation)
  useEffect(() => {
    const loadJobData = async () => {
      if (isAddPOMode) {
        setLoadingJob(false);
        return;
      }

      if (!nrcJobNo) {
        setJobError("No job number provided");
        setLoadingJob(false);
        return;
      }

      try {
        setLoadingJob(true);
        // Replace with your actual API call
        const response = await fetch(`/api/jobs/${nrcJobNo}`);
        if (response.ok) {
          const jobData = await response.json();
          setJob(jobData);
          setCurrentStep(determineInitialStep(jobData));
        } else {
          setJobError("Failed to load job data");
        }
      } catch (error) {
        console.error("Error loading job:", error);
        setJobError("Error loading job data");
      } finally {
        setLoadingJob(false);
      }
    };

    // Only load job data if we're not handling URL parameters
    if (!searchParams.get("mode")) {
      loadJobData();
    }
  }, [nrcJobNo, isAddPOMode, searchParams]);
  // Helper function to check job completion status
  const checkJobCompletionStatus = (
    job: Job
  ): "artwork_pending" | "po_pending" | "more_info_pending" | "completed" => {
    // 1. Check Artwork Details
    if (
      !job.artworkReceivedDate ||
      !job.artworkApprovedDate ||
      !job.shadeCardApprovalDate
    ) {
      return "artwork_pending";
    }

    // 2. Check P.O. Details
    if (
      !job.poNumber ||
      !job.unit ||
      !job.plant ||
      job.totalPOQuantity === null ||
      job.dispatchQuantity === null ||
      job.pendingQuantity === null ||
      job.noOfSheets === null ||
      !job.poDate ||
      !job.deliveryDate ||
      !job.dispatchDate ||
      !job.nrcDeliveryDate
    ) {
      return "po_pending";
    }

    // 3. Check More Information
    if (
      !job.jobDemand ||
      !job.machineId ||
      !job.jobSteps ||
      job.jobSteps.length === 0
    ) {
      return "more_info_pending";
    }

    return "completed";
  };

  // Helper to determine the initial step based on fetched job data
  const determineInitialStep = (currentJob: Job): FormStep => {
    // Check if artwork details are missing
    if (
      !currentJob.artworkReceivedDate ||
      !currentJob.artworkApprovedDate ||
      !currentJob.shadeCardApprovalDate
    ) {
      return "artwork";
    }
    
    // Check if PO details are missing
    if (
      !currentJob.poNumber ||
      !currentJob.unit ||
      !currentJob.plant ||
      currentJob.totalPOQuantity === null ||
      currentJob.dispatchQuantity === null ||
      currentJob.pendingQuantity === null ||
      currentJob.noOfSheets === null ||
      !currentJob.poDate ||
      !currentJob.deliveryDate ||
      !currentJob.dispatchDate ||
      !currentJob.nrcDeliveryDate
    ) {
      return "po";
    }
    
    // Check if more info is missing
    if (
      !currentJob.jobDemand ||
      !currentJob.machineId ||
      !currentJob.jobSteps ||
      currentJob.jobSteps.length === 0
    ) {
      return "moreInfo";
    }

    return "artwork";
  };

  // Function to search jobs by NRC Job Number
  // const searchJob = async () => {
  //   if (!searchTerm.trim()) {
  //     setSearchedJob(null);
  //     return;
  //   }

  //   setSearchLoading(true);
  //   try {
  //     const accessToken = localStorage.getItem('accessToken');
  //     if (!accessToken) {
  //       throw new Error('Authentication token not found. Please log in.');
  //     }

  //     const response = await fetch('https://nrprod.nrcontainers.com/api/jobs', {
  //       method: 'GET',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${accessToken}`,
  //       },
  //     });

  //     if (!response.ok) {
  //       throw new Error(`Failed to search jobs: ${response.status}`);
  //     }

  //     const data = await response.json();
  //     if (data.success && Array.isArray(data.data)) {
  //       const foundJob = data.data.find((job: Job) => 
  //         job.nrcJobNo.toLowerCase().includes(searchTerm.toLowerCase()) && job.status === 'ACTIVE'
  //       );
        
  //       if (foundJob) {
  //         setSearchedJob(foundJob);
  //         // Check if this job has all forms completed
  //         const completionStatus = checkJobCompletionStatus(foundJob);
  //         if (completionStatus === 'completed') {
  //           // If completed, set the job and show forms as read-only
  //           setJob(foundJob);
  //           setCurrentStep('artwork'); // Start from first step
  //         }
  //       } else {
  //         setSearchedJob(null);
  //       }
  //     } else {
  //       setSearchError('Failed to fetch jobs data');
  //       setSearchedJob(null);
  //     }
  //   } catch (error) {
  //     setSearchError(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  //     setSearchedJob(null);
  //   } finally {
  //     setSearchLoading(false);
  //   }
  // };

  const searchJob = async (term: string) => {
  setSearchLoading(true);
  try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken)
        throw new Error("Authentication token not found. Please log in.");

      const response = await fetch("https://nrprod.nrcontainers.com/api/jobs", {
        method: "GET",
      headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
      },
    });

      if (!response.ok)
        throw new Error(`Failed to search jobs: ${response.status}`);

    const data = await response.json();
    if (data.success && Array.isArray(data.data)) {
        const matches = data.data.filter(
          (job: Job) =>
        job.nrcJobNo.toLowerCase().includes(term.toLowerCase()) &&
            job.status === "ACTIVE"
      );
      setJobOptions(matches);
    } else {
      setJobOptions([]);
    }
  } catch (error) {
      console.error("Search failed:", error);
    setJobOptions([]);
  } finally {
    setSearchLoading(false);
  }
};

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  setSearchTerm(value);

  if (typingTimeout) clearTimeout(typingTimeout);

  const timeout = setTimeout(() => {
    if (value.trim()) {
      searchJob(value); // pass search term
    } else {
      setJobOptions([]);
      setSearchedJob(null);
    }
  }, 300);

  setTypingTimeout(timeout);
};

  // Handle search form submit
  // const handleSearchSubmit = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   searchJob();
  // };

  // Fetch job details on component mount (only if not in Add PO mode)
  useEffect(() => {
    if (isAddPOMode) {
      setLoadingJob(false);
      return;
    }

    const fetchJobDetails = async () => {
      if (!nrcJobNo) {
        setJobError("Job number not provided in URL.");
        setLoadingJob(false);
        return;
      }

      setLoadingJob(true);
      setJobError(null);
      try {
        const accessToken = localStorage.getItem("accessToken");
        if (!accessToken) throw new Error("Authentication token not found.");

        const response = await fetch(
          `https://nrprod.nrcontainers.com/api/jobs/${nrcJobNo}`,
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
              `Failed to fetch job details: ${response.status} ${response.statusText}`
          );
        }
        const data = await response.json();
        if (data.success && data.data) {
          const fetchedJob: Job = {
            ...data.data,
            // Ensure all required fields have default values if missing from API
            poNumber: data.data.poNumber || null,
            unit: data.data.unit || null,
            plant: data.data.plant || null,
            totalPOQuantity: data.data.totalPOQuantity || null,
            dispatchQuantity: data.data.dispatchQuantity || null,
            pendingQuantity: data.data.pendingQuantity || null,
            noOfSheets: data.data.noOfSheets || null,
            poDate: data.data.poDate || null,
            deliveryDate: data.data.deliveryDate || null,
            dispatchDate: data.data.dispatchDate || null,
            nrcDeliveryDate: data.data.nrcDeliveryDate || null,
            jobSteps: data.data.jobSteps || null,
            jobDemand: data.data.jobDemand || null,
            machineId: data.data.machineId || null,
            artworkReceivedDate: data.data.artworkReceivedDate || null,
            artworkApprovedDate: data.data.artworkApprovedDate || null,
            shadeCardApprovalDate: data.data.shadeCardApprovalDate || null,
            imageURL: data.data.imageURL || null,
          };
          setJob(fetchedJob);
          setCurrentStep(determineInitialStep(fetchedJob));
        } else {
          setJobError("Unexpected API response format for job details.");
        }
      } catch (err) {
        setJobError(
          `Failed to load job: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
        console.error("Fetch Job Details Error:", err);
      } finally {
        setLoadingJob(false);
      }
    };

    fetchJobDetails();
  }, [nrcJobNo, isAddPOMode]);

  // --- API Handlers for each step ---

  // Function to update POs with matching style and remove notifications
  const updatePOsAndRemoveNotifications = async (
    nrcJobNo: string,
    styleItemSKU: string
  ) => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        console.error("No access token found");
        return;
      }

      // Step 1: Find POs with matching style and null nrcJobNo
      const poResponse = await fetch(
        "https://nrprod.nrcontainers.com/api/purchase-orders",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!poResponse.ok) {
        console.error("Failed to fetch POs:", poResponse.status);
        return;
      }

      const poData = await poResponse.json();
      if (!poData.success || !Array.isArray(poData.data)) {
        console.error("Invalid PO data structure");
        return;
      }

      // Find POs with matching style and no NRC job number
      const matchingPOs = poData.data.filter(
        (po: any) =>
          po.style === styleItemSKU &&
          (!po.jobNrcJobNo || po.jobNrcJobNo === null)
      );

      console.log(
        `Found ${matchingPOs.length} POs with matching style: ${styleItemSKU}`
      );

      // Step 2: Update each matching PO with the new NRC job number
      for (const po of matchingPOs) {
        try {
          const updateResponse = await fetch(
            `https://nrprod.nrcontainers.com/api/purchase-orders/${po.id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                jobNrcJobNo: nrcJobNo,
              }),
            }
          );

          if (updateResponse.ok) {
            console.log(
              `✅ Updated PO ${po.poNumber} with NRC job number: ${nrcJobNo}`
            );
          } else {
            console.error(
              `❌ Failed to update PO ${po.poNumber}:`,
              updateResponse.status
            );
          }
        } catch (error) {
          console.error(`❌ Error updating PO ${po.poNumber}:`, error);
        }
      }

      // Step 3: Remove job creation notifications for this style
      try {
        const notifications = JSON.parse(
          localStorage.getItem("activityLogNotifications") || "[]"
        );
        const updatedNotifications = notifications.filter(
          (notification: any) => notification.style !== styleItemSKU
        );
        localStorage.setItem(
          "activityLogNotifications",
          JSON.stringify(updatedNotifications)
        );
        console.log(`✅ Removed notifications for style: ${styleItemSKU}`);
      } catch (error) {
        console.error("❌ Error removing notifications:", error);
      }
    } catch (error) {
      console.error("❌ Error in updatePOsAndRemoveNotifications:", error);
    }
  };

  const handleArtworkSave = async (updatedFields: Partial<Job>) => {
    setError(null);
    if (!job) return;

    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) throw new Error("Authentication token not found.");

      const response = await fetch(
        `https://nrprod.nrcontainers.com/api/jobs/${job.nrcJobNo}`,
        {
          method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(updatedFields),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to update artwork details."
        );
      }
      const result = await response.json();
      if (result.success) {
        const updatedJob = {
          ...job,
          ...updatedFields,
          updatedAt: result.data.updatedAt,
        };
        setJob(updatedJob);
        onJobUpdated(updatedJob);
        
        // Show success message
        setError(null);
        setSuccessMessage(
          "Artwork details saved successfully! Moving to PO Details..."
        );
        
        // Auto-progress to next step after a short delay
        setTimeout(() => {
          setCurrentStep("po");
          setSuccessMessage(null);
        }, 1500);
      } else {
        throw new Error(result.message || "Failed to save artwork details.");
      }
    } catch (err) {
      setError(
        `Artwork Save Error: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      throw err;
    }
  };

const handlePOSave = async (poDetails: PoDetailsPayload) => {
  setError(null);
  if (!job) return;

    console.log("🔍 DEBUG - job object:", job);
    console.log("🔍 DEBUG - job.nrcJobNo:", job.nrcJobNo);
    console.log("🔍 DEBUG - poDetails received:", poDetails);

    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) throw new Error("Authentication token not found.");

    const payloadWithJobNo = { ...poDetails, jobNrcJobNo: job.nrcJobNo };

      const response = await fetch(
        "https://nrprod.nrcontainers.com/api/purchase-orders/create",
        {
          method: "POST",
      headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payloadWithJobNo),
        }
      );

    if (!response.ok) {
      const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create P.O. details.");
    }
    
    const result = await response.json();
    
    // 🎯 DEBUG: Log the full response to see the structure
      console.log("🔍 FULL PO Creation Response:", result);
      console.log("🔍 Response data:", result.data);
    
    if (result.success) {
      // 🎯 GET THE AUTO-GENERATED PO ID FROM THE RESPONSE
        const createdPOId =
          result.data?.id ||
          result.data?.poId ||
          result.data?.purchaseOrderId ||
          result.id;

        console.log("✅ Purchase Order created with ID:", createdPOId);
      
      // 🎯 UPDATE JOB OBJECT WITH PO ID AND OTHER DETAILS
      const updatedJob = { 
        ...job, 
        ...poDetails, 
        poId: createdPOId, // Store PO ID in job
        purchaseOrderId: createdPOId, // Alternative field name
          updatedAt: result.data?.updatedAt || new Date().toISOString(),
      };
      
        console.log("📝 Updated job object with PO ID:", updatedJob);
      
      setJob(updatedJob);
      onJobUpdated(updatedJob);
      
      // Show success message
      setError(null);
        setSuccessMessage(
          "PO details saved successfully! Moving to More Information..."
        );
      
      // Auto-progress to next step after a short delay
      setTimeout(() => {
          setCurrentStep("moreInfo");
        setSuccessMessage(null);
      }, 1500);
    } else {
        throw new Error(result.message || "Failed to save P.O. details.");
    }
  } catch (err) {
      setError(
        `P.O. Save Error: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    throw err;
  }
};

  const handleMoreInfoSave = async (
    updatedFields: Partial<Job>,
    jobPlanningPayload?: any
  ) => {
  setError(null);
  if (!job) return;

  try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) throw new Error("Authentication token not found.");

      console.log("🔍 === HANDLE MORE INFO SAVE DEBUGGING ===");
      console.log("Original job object:", JSON.stringify(job, null, 2));
      console.log("Updated fields:", JSON.stringify(updatedFields, null, 2));
      console.log(
        "Job planning payload:",
        JSON.stringify(jobPlanningPayload, null, 2)
      );
      console.log("=== END DEBUGGING ===");

      const response = await fetch(
        `https://nrprod.nrcontainers.com/api/jobs/${job.nrcJobNo}`,
        {
          method: "PUT",
      headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(updatedFields),
        }
      );

    if (!response.ok) {
      const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to update more information."
        );
    }
    
    const result = await response.json();
    if (result.success) {
        const updatedJob = {
          ...job,
          ...updatedFields,
          updatedAt: result.data.updatedAt,
        };
      setJob(updatedJob);
      onJobUpdated(updatedJob);
      
      // Create job plan entry after all forms are completed
      try {
        // Use the jobPlanningPayload if provided, otherwise create default
        if (jobPlanningPayload && jobPlanningPayload.steps) {
            await createJobPlanFromPayload(
              updatedJob,
              jobPlanningPayload,
              accessToken
            );
          
          // ✅ Update machine statuses to "busy" after successful job plan creation
          await updateMachineStatuses(jobPlanningPayload, accessToken);
        } else {
          await createJobPlan(updatedJob, accessToken);
          
          // ✅ Update machine status for single machine if applicable
          if (updatedFields.machineId) {
              await updateSingleMachineStatus(
                updatedFields.machineId,
                accessToken
              );
            }
          }
          // Auto-update POs with matching style and remove notifications
          await updatePOsAndRemoveNotifications(
            updatedJob.nrcJobNo,
            updatedJob.styleItemSKU
          );

          setSuccessMessage(
            "All forms completed successfully! Job plan created, POs updated, and notifications cleared. Redirecting to dashboard..."
          );
      } catch (jobPlanError) {
          console.warn(
            "Failed to create job plan or update machine status:",
            jobPlanError
          );
          setSuccessMessage(
            "Forms completed but job plan creation failed. Redirecting to dashboard..."
          );
      }
      
      // Redirect to dashboard after showing success message
      setTimeout(() => {
          navigate("/dashboard");
      }, 3000);
    } else {
        throw new Error(result.message || "Failed to save more information.");
    }
  } catch (err) {
      setError(
        `More Info Save Error: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    throw err;
  }
};

// ✅ Add this helper function to update machine statuses
  const updateMachineStatuses = async (
    jobPlanningPayload: any,
    accessToken: string
  ) => {
  if (!jobPlanningPayload.steps || !Array.isArray(jobPlanningPayload.steps)) {
      console.warn("No steps found in job planning payload");
    return;
  }

  const machineUpdatePromises: Promise<void>[] = [];
  const machineIds = new Set<string>();
  
  // ✅ Get machine IDs from steps
  jobPlanningPayload.steps.forEach((step: any) => {
    if (step.machineId) {
      machineIds.add(step.machineId);
    }
  });

  // ✅ Also get machine IDs from selectedMachines if available
    if (
      jobPlanningPayload.selectedMachines &&
      Array.isArray(jobPlanningPayload.selectedMachines)
    ) {
    jobPlanningPayload.selectedMachines.forEach((machine: any) => {
      if (machine.id) {
        machineIds.add(machine.id);
      }
    });
  }

    console.log(
      "Updating machine statuses for machines:",
      Array.from(machineIds)
    );

  if (machineIds.size === 0) {
      console.warn("No machine IDs found to update");
    return;
  }

  // Update each machine status to "busy"
  for (const machineId of machineIds) {
      machineUpdatePromises.push(
        updateSingleMachineStatus(machineId, accessToken)
      );
  }

  try {
    await Promise.all(machineUpdatePromises);
      console.log("✅ All machine statuses updated successfully");
  } catch (error) {
      console.error("❌ Failed to update some machine statuses:", error);
    // Don't throw error here - we don't want to fail the entire process
  }
};

// ✅ Add this helper function to update a single machine status
  const updateSingleMachineStatus = async (
    machineId: string,
    accessToken: string
  ): Promise<void> => {
    try {
      const response = await fetch(
        `https://nrprod.nrcontainers.com/api/machines/${machineId}/status`,
        {
          method: "PUT",
      headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
            status: "busy",
      }),
        }
      );

    if (!response.ok) {
      const errorData = await response.json();
        throw new Error(
          `Failed to update machine ${machineId}: ${
            errorData.message || response.statusText
          }`
        );
    }

    const result = await response.json();
    console.log(`✅ Machine ${machineId} status updated to busy:`, result);
  } catch (error) {
    console.error(`❌ Failed to update machine ${machineId} status:`, error);
    throw error;
  }
};

  // Function to create job plan from the actual selected steps
  const createJobPlanFromPayload = async (
    completedJob: Job,
    jobPlanningPayload: any,
    accessToken: string
  ) => {
  try {
    // Validate demand-based requirements
      const jobDemand = completedJob.jobDemand || "medium";
    const selectedSteps = jobPlanningPayload.steps || [];
    
    // Demand-specific validation
      if (jobDemand === "medium" && selectedSteps.length === 0) {
        throw new Error(
          "Regular demand requires at least one production step to be selected"
        );
      }
      // Machine assignment is no longer required for regular jobs

    // 🎯 EXTENSIVE DEBUGGING FOR PO ID
      console.log("🔍 === PO ID DEBUGGING ===");
      console.log("jobPlanningPayload.poId:", jobPlanningPayload.poId);
      console.log("completedJob.poId:", completedJob.poId);
      console.log(
        "completedJob.purchaseOrderId:",
        completedJob.purchaseOrderId
      );
      console.log(
        "Full jobPlanningPayload:",
        JSON.stringify(jobPlanningPayload, null, 2)
      );

    // Get PO ID with multiple fallback sources
      const poId =
        jobPlanningPayload.poId ||
                completedJob.poId || 
                completedJob.purchaseOrderId ||
                (completedJob as any).id ||
                null;

      console.log("📋 Final PO ID to be used:", poId);
      console.log("=== END DEBUGGING ===");

    const jobPlanData = {
      nrcJobNo: completedJob.nrcJobNo,
      jobDemand: jobDemand,
      purchaseOrderId: poId,
      steps: selectedSteps.map((step: any, index: number) => {
        // 🔥 NEW: Handle multiple machines from the payload
        let machineDetails = [];
        
        if (step.machineDetails && Array.isArray(step.machineDetails)) {
          // Use the machineDetails array from the payload (multiple machines)
          machineDetails = step.machineDetails;
        } else if (step.allMachineIds && Array.isArray(step.allMachineIds)) {
          // Fallback: construct from allMachineIds if available
          machineDetails = step.allMachineIds.map((machineId: string) => ({
            id: machineId,
              unit: completedJob.unit || "Mk",
            machineCode: step.machineCode || machineId,
              machineType: step.machineDetail || "Production Machine",
          }));
        } else {
          // No machine assigned - create empty machineDetails array
          // For regular jobs, machine assignment is optional
          machineDetails = [
            {
              unit: completedJob.unit || "Mk",
              machineCode: null,
              machineType: "Not Assigned",
            },
          ];
        }
        
          console.log(
            `🔍 Step ${step.stepName} machine details:`,
            machineDetails
          );
        
        return {
          jobStepId: index + 1,
          stepNo: step.stepNo || index + 1,
          stepName: step.stepName,
          machineDetails: machineDetails, // 🔥 This will be stored as JSON in DB
            status: "planned" as const,
          startDate: null,
          endDate: null,
          user: null,
          createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        }),
    };

      console.log(
        "📤 FINAL Job Plan Data with Multiple Machines:",
        JSON.stringify(jobPlanData, null, 2)
      );

    // Try to create job plan using the job-planning endpoint
      const jobPlanResponse = await fetch(
        "https://nrprod.nrcontainers.com/api/job-planning/",
        {
          method: "POST",
      headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(jobPlanData),
        }
      );

    const responseText = await jobPlanResponse.text();
      console.log("🔍 Raw API Response:", responseText);

    if (jobPlanResponse.ok) {
      try {
        const jobPlanResult = JSON.parse(responseText);
          console.log(
            "✅ Job plan created successfully with multiple machines:",
            jobPlanResult
          );
        return jobPlanResult;
      } catch (parseError) {
          console.error("❌ Failed to parse successful response:", parseError);
          throw new Error("Invalid response format from server");
      }
    } else {
        console.error(
          "❌ Job plan creation failed. Status:",
          jobPlanResponse.status
        );
        console.error("❌ Response:", responseText);
      
      // Try the fallback approach
        console.log("🔄 Trying alternative approach...");

        const statusUpdateResponse = await fetch(
          `https://nrprod.nrcontainers.com/api/jobs/${completedJob.nrcJobNo}`,
          {
            method: "PUT",
        headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
              status: "ACTIVE",
              jobDemand: completedJob.jobDemand || "medium",
          machineId: completedJob.machineId,
          purchaseOrderId: poId,
        }),
          }
        );

      if (statusUpdateResponse.ok) {
          console.log("✅ Job status updated with PO ID");
          return { success: true, message: "Job plan creation triggered" };
      } else {
          throw new Error("Failed to create job plan or update job status");
      }
    }
  } catch (error) {
      console.error("❌ Error in createJobPlanFromPayload:", error);
    throw error;
  }
};

  // Function to create job plan entry after all forms are completed
  const createJobPlan = async (completedJob: Job, accessToken: string) => {
    try {
      // Validate demand-based requirements
      const jobDemand = completedJob.jobDemand || "medium";
      
      // Demand-specific validation
      // Machine assignment is no longer required for regular jobs

      // Create a job plan with basic production steps
      console.log("🔍 === DEFAULT JOB PLAN PO ID DEBUGGING ===");
      console.log("completedJob.poId:", completedJob.poId);
      console.log(
        "completedJob.purchaseOrderId:",
        completedJob.purchaseOrderId
      );
      console.log("completedJob keys:", Object.keys(completedJob));
      console.log(
        "Full completedJob for default plan:",
        JSON.stringify(completedJob, null, 2)
      );

    const poId = completedJob.poId || completedJob.purchaseOrderId || null;
    
      console.log("📋 DEFAULT Job Plan PO ID:", poId);
      console.log("🔍 PO ID type:", typeof poId);
      console.log("=== END DEFAULT DEBUGGING ===");

    const jobPlanData = {
      nrcJobNo: completedJob.nrcJobNo,
      jobDemand: jobDemand,
      purchaseOrderId: poId, 
        steps: [
          {
            jobStepId: 1, // Temporary ID for new step
            stepNo: 1,
            stepName: "PaperStore",
            machineDetails: [], // PaperStore is always "Not Assigned"
            status: "planned" as const,
            startDate: null,
            endDate: null,
            user: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            jobStepId: 2, // Temporary ID for new step
            stepNo: 2,
            stepName: "PrintingDetails",
            machineDetails:
              completedJob.machineId && jobDemand === "medium"
                ? [
                    {
              id: completedJob.machineId,
                      unit: completedJob.unit || "Unit 1",
              machineCode: completedJob.machineId,
                      machineType: "Printing",
                    },
                  ]
                : [],
            status: "planned" as const,
            startDate: null,
            endDate: null,
            user: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            jobStepId: 3, // Temporary ID for new step
            stepNo: 3,
            stepName: "Corrugation",
            machineDetails:
              completedJob.machineId && jobDemand === "medium"
                ? [
                    {
              id: completedJob.machineId,
                      unit: completedJob.unit || "Unit 1",
              machineCode: completedJob.machineId,
                      machineType: "Corrugation",
                    },
                  ]
                : [],
            status: "planned" as const,
            startDate: null,
            endDate: null,
            user: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            jobStepId: 4, // Temporary ID for new step
            stepNo: 4,
            stepName: "FluteLaminateBoardConversion",
            machineDetails:
              completedJob.machineId && jobDemand === "medium"
                ? [
                    {
              id: completedJob.machineId,
                      unit: completedJob.unit || "Unit 1",
              machineCode: completedJob.machineId,
                      machineType: "Flute Lamination",
                    },
                  ]
                : [],
            status: "planned" as const,
            startDate: null,
            endDate: null,
            user: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            jobStepId: 5, // Temporary ID for new step
            stepNo: 5,
            stepName: "Punching",
            machineDetails:
              completedJob.machineId && jobDemand === "medium"
                ? [
                    {
              id: completedJob.machineId,
                      unit: completedJob.unit || "Unit 1",
              machineCode: completedJob.machineId,
                      machineType: "Punching",
                    },
                  ]
                : [],
            status: "planned" as const,
            startDate: null,
            endDate: null,
            user: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            jobStepId: 6, // Temporary ID for new step
            stepNo: 6,
            stepName: "SideFlapPasting",
            machineDetails:
              completedJob.machineId && jobDemand === "medium"
                ? [
                    {
              id: completedJob.machineId,
                      unit: completedJob.unit || "Unit 1",
              machineCode: completedJob.machineId,
                      machineType: "Side Flap Pasting",
                    },
                  ]
                : [],
            status: "planned" as const,
            startDate: null,
            endDate: null,
            user: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            jobStepId: 7, // Temporary ID for new step
            stepNo: 7,
            stepName: "QualityDept",
            machineDetails: [], // QC is always "Not Assigned"
            status: "planned" as const,
            startDate: null,
            endDate: null,
            user: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            jobStepId: 8, // Temporary ID for new step
            stepNo: 8,
            stepName: "DispatchProcess",
            machineDetails: [], // Dispatch is always "Not Assigned"
            status: "planned" as const,
            startDate: null,
            endDate: null,
            user: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ] as Omit<JobPlanStep, "id">[],
      };

      // Try to create job plan using the job-planning endpoint
      const jobPlanResponse = await fetch(
        "https://nrprod.nrcontainers.com/api/job-planning/",
        {
          method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(jobPlanData),
        }
      );

      if (jobPlanResponse.ok) {
        const jobPlanResult = await jobPlanResponse.json();
        console.log("Job plan created successfully:", jobPlanResult);
        return jobPlanResult;
      } else {
        // If POST doesn't work, try to update existing job to trigger job plan creation
        console.log("Job plan creation failed, trying alternative approach...");
        
        // Update job status to trigger job plan creation
        const statusUpdateResponse = await fetch(
          `https://nrprod.nrcontainers.com/api/jobs/${completedJob.nrcJobNo}`,
          {
            method: "PUT",
          headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
              status: "ACTIVE",
              jobDemand: completedJob.jobDemand || "medium",
            machineId: completedJob.machineId,
            // Add any other fields that might trigger job plan creation
          }),
          }
        );

        if (statusUpdateResponse.ok) {
          console.log("Job status updated to trigger job plan creation");
          return { success: true, message: "Job plan creation triggered" };
        } else {
          throw new Error("Failed to create job plan or update job status");
        }
      }
    } catch (error) {
      console.error("Error creating job plan:", error);
      throw error;
    }
  };

  // Helper function to check if a step is accessible (previous step must be completed)
  const isStepAccessible = (step: FormStep): boolean => {
    if (!job) return false;
    
    switch (step) {
      case "artwork":
        return true; // First step is always accessible
      case "po":
        return getStepCompletion("artwork"); // PO only accessible after artwork
      case "moreInfo":
        return getStepCompletion("po"); // More info only accessible after PO
      default:
        return false;
    }
  };

  // Helper function to check if a step is completed
  const getStepCompletion = (step: FormStep): boolean => {
    if (!job) return false;

    switch (step) {
      case "artwork":
        return !!(
          job.artworkReceivedDate &&
          job.artworkApprovedDate &&
          job.shadeCardApprovalDate
        );
      case "po":
        return !!(
          job.poNumber &&
          job.unit &&
          job.plant &&
          job.totalPOQuantity !== null &&
          job.dispatchQuantity !== null &&
          job.pendingQuantity !== null &&
          job.noOfSheets !== null &&
          job.poDate &&
          job.deliveryDate &&
          job.dispatchDate &&
          job.nrcDeliveryDate
        );
      case "moreInfo":
        return !!(
          job.jobDemand &&
          job.machineId &&
          job.jobSteps &&
          job.jobSteps.length > 0
        );
      default:
        return false;
    }
  };

  // Function to render the current form based on the current step
  const renderCurrentForm = () => {
    // If no job is selected, create a mock job with empty fields for the forms
    const currentJob = job || {
      id: 0,
      nrcJobNo: "",
      styleItemSKU: "",
      customerName: "",
      fluteType: null,
      status: "ACTIVE" as const,
      latestRate: null,
      preRate: null,
      length: null,
      width: null,
      height: null,
      boxDimensions: "",
      diePunchCode: null,
      boardCategory: null,
      noOfColor: null,
      processColors: null,
      specialColor1: null,
      specialColor2: null,
      specialColor3: null,
      specialColor4: null,
      overPrintFinishing: null,
      topFaceGSM: null,
      flutingGSM: null,
      bottomLinerGSM: null,
      decalBoardX: null,
      lengthBoardY: null,
      boardSize: "",
      noUps: null,
      artworkReceivedDate: null,
      artworkApprovedDate: null,
      shadeCardApprovalDate: null,
      srNo: null,
      jobDemand: null,
      imageURL: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: null,
      machineId: null,
      poNumber: null,
      unit: null,
      plant: null,
      totalPOQuantity: null,
      dispatchQuantity: null,
      pendingQuantity: null,
      noOfSheets: null,
      poDate: null,
      deliveryDate: null,
      dispatchDate: null,
      nrcDeliveryDate: null,
      poId: null, // Initialize as null
    purchaseOrderId: null, // Initialize as null
      jobSteps: [],
    };

    switch (currentStep) {
      case "artwork":
        return (
          <ArtworkDetailsForm
            job={currentJob}
            onSave={handleArtworkSave}
            onNext={() => setCurrentStep("po")}
            onClose={() => navigate("/dashboard")}
            isReadOnly={getStepCompletion("artwork")}
          />
        );
      case "po":
        return (
          <PODetailsForm
            job={currentJob}
            onSave={handlePOSave}
            onNext={() => setCurrentStep("moreInfo")}
            onClose={() => navigate("/dashboard")}
            isReadOnly={getStepCompletion("po")}
          />
        );
      case "moreInfo":
        return (
          <MoreInformationForm
            job={currentJob}
            onSave={handleMoreInfoSave}
            onClose={() => navigate("/dashboard")}
            isReadOnly={getStepCompletion("moreInfo")}
          />
        );
      default:
        return null;
    }
  };

  // Touch event handlers for mobile sidebar
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const currentX = e.touches[0].clientX;
    const diff = startX.current - currentX;
    
    if (diff > 50) {
      // Swipe left to close
      setIsSidebarOpen(false);
      isDragging.current = false;
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  const handleOverlayClick = () => {
    setIsSidebarOpen(false);
  };

  console.log("job options", jobOptions);
  // If in Add PO mode and no job is selected yet, show search interface
  if (isAddPOMode && !job) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
              Add Purchase Order
            </h1>
            <p className="text-gray-600">
              Search for an existing job to add purchase order details
            </p>
          </div>
          
          {/* Search Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Search Job
            </h2>
            <div className="max-w-md">
  <div className="relative mb-4">
    <input
      type="text"
      value={searchTerm}
      onChange={handleSearchChange}
      placeholder="Enter NRC Job Number..."
      className="w-full pl-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />

    {/* 🔽 Dropdown results */}
    {searchTerm && jobOptions.length > 0 && (
      <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
        {jobOptions.map((job) => (
          <li
            key={job.id}
            onClick={() => {
              setSearchTerm(job.nrcJobNo);
              setSearchedJob(job);
              setJobOptions([]); // close dropdown
              // ✅ also set completion status logic
                          const completionStatus =
                            checkJobCompletionStatus(job);
                          if (completionStatus === "completed") {
                setJob(job);
                            setCurrentStep("artwork");
              }
            }}
            className="px-3 py-2 cursor-pointer hover:bg-blue-100 text-sm"
          >
            {job.nrcJobNo}
          </li>
        ))}
      </ul>
    )}
  </div>
</div>

            {/* Search Error */}
            {searchError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {searchError}
              </div>
            )}

            {/* Search Success */}
            {searchedJob && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  Job Found!
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-green-600 font-medium">
                      NRC Job No
                    </p>
                    <p className="text-green-800 font-semibold">
                      {searchedJob.nrcJobNo}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-green-600 font-medium">
                      Customer
                    </p>
                    <p className="text-green-800 font-semibold">
                      {searchedJob.customerName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-green-600 font-medium">Style</p>
                    <p className="text-green-800 font-semibold">
                      {searchedJob.styleItemSKU}
                    </p>
                  </div>
                </div>
                
                {/* Show completion status */}
                {(() => {
                  const completionStatus =
                    checkJobCompletionStatus(searchedJob);
                  return (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 font-medium">
                        Completion Status:
                      </p>
                      <p className="text-blue-600">
                        {completionStatus === "completed"
                          ? "✅ All forms completed"
                          : completionStatus === "artwork_pending"
                          ? "⏳ Artwork Details pending"
                          : completionStatus === "po_pending"
                          ? "⏳ PO Details pending"
                          : "⏳ More Information pending"}
                      </p>
                    </div>
                  );
                })()}
                
                <div className="flex gap-3">
                  {(() => {
                    const completionStatus =
                      checkJobCompletionStatus(searchedJob);
                    if (completionStatus === "completed") {
                      return (
                        <button
                          onClick={() => {
                            setJob(searchedJob);
                            setCurrentStep("artwork"); // Start from first step to show all forms
                          }}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                          View Completed Forms
                        </button>
                      );
                    } else {
                      return (
                        <button
                          onClick={() => {
                            setJob(searchedJob);
                            setCurrentStep(determineInitialStep(searchedJob));
                          }}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                        >
                          Continue with This Job
                        </button>
                      );
                    }
                  })()}
                  <button
                    onClick={() => {
                      setSearchedJob(null);
                      setSearchTerm("");
                    }}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Back Button */}
          <div className="text-center">
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If in Add PO mode and job is found, show forms with completion status
  if (isAddPOMode && job) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] relative">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && window.innerWidth < 640 && (
          <div
            className="fixed inset-0 bg-transparent opacity-50 backdrop-blur-md z-40"
            onClick={handleOverlayClick}
          />
        )}

        {/* Sidebar - Fixed on all screen sizes */}
        <aside
          className={`fixed inset-y-0 left-0 w-64 bg-white shadow-md p-6 flex flex-col z-50 overflow-y-auto
            transform transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
            sm:translate-x-0`}
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Planning Details
          </h3>
          <ul className="space-y-2">
            {formStepsConfig.map((step) => {
              const isCompleted = getStepCompletion(step.id as FormStep);
              const isCurrentStep = step.id === currentStep;
              const isAccessible = isStepAccessible(step.id as FormStep);
              
              return (
                <li key={step.id}>
                  <button
                    className={`w-full text-left px-4 py-2 rounded-lg transition-colors duration-200
                      ${
                        isCurrentStep
                          ? "bg-[#00AEEF] text-white shadow-md"
                          : isCompleted
                          ? "bg-green-100 text-green-800"
                          : isAccessible
                          ? "text-gray-700 hover:bg-gray-100"
                          : "text-gray-400 cursor-not-allowed"
                      }
                    `}
                    onClick={() => {
                      if (isAccessible) {
                        setCurrentStep(step.id as FormStep);
                        if (window.innerWidth < 640) {
                          setIsSidebarOpen(false);
                        }
                      }
                    }}
                    disabled={!isAccessible}
                  >
                    <div className="flex items-center justify-between">
                      <span>{step.label}</span>
                      {isCompleted && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Main Content Area - Always has left margin to account for fixed sidebar */}
        <main className="ml-0 sm:ml-64 p-4 sm:p-8 overflow-y-auto min-h-screen">
          {/* Hamburger icon for mobile */}
          <div className="sm:hidden mb-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-md bg-white shadow-sm"
              aria-label="Open sidebar"
            >
              <svg
                className="h-6 w-6 text-gray-700"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="fixed top-20 right-8 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded text-sm z-50 shadow-lg">
              <strong className="font-bold">Success!</strong>
              <span className="block sm:inline"> {successMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="fixed top-20 right-8 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm z-50 shadow-lg">
              <strong className="font-bold">Error!</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          )}

          {/* Header with Job Info */}
          <div className="mb-8">
            {/* <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">Add Purchase Order</h1> */}
            <p className="text-gray-600 mb-6">
              Job: {job.nrcJobNo} - {job.customerName}
            </p>
            
            {/* Completion Status */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-8">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
                Completion Status
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  className={`p-3 sm:p-4 rounded-lg border-2 ${
                    getStepCompletion("artwork")
                      ? "border-green-500 bg-green-50"
                      : "border-gray-300 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {getStepCompletion("artwork") ? (
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    )}
                    <div>
                      <h3 className="text-sm sm:text-base font-medium text-gray-800">
                        Artwork Details
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {getStepCompletion("artwork") ? "Completed" : "Pending"}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div
                  className={`p-3 sm:p-4 rounded-lg border-2 ${
                    getStepCompletion("po")
                      ? "border-green-500 bg-green-50"
                      : "border-gray-300 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {getStepCompletion("po") ? (
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    )}
                    <div>
                      <h3 className="text-sm sm:text-base font-medium text-gray-800">
                        PO Details
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {getStepCompletion("po") ? "Completed" : "Pending"}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div
                  className={`p-3 sm:p-4 rounded-lg border-2 ${
                    getStepCompletion("moreInfo")
                      ? "border-green-500 bg-green-50"
                      : "border-gray-300 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {getStepCompletion("moreInfo") ? (
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    )}
                    <div>
                      <h3 className="text-sm sm:text-base font-medium text-gray-800">
                        More Information
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {getStepCompletion("moreInfo")
                          ? "Completed"
                          : "Pending"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Render Current Form */}
          {renderCurrentForm()}
        </main>
      </div>
    );
  }

  if (jobError && !isAddPOMode) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {jobError}</span>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-4 bg-[#00AEEF] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#0099cc] transition"
        >
          Back to Jobs
        </button>
      </div>
    );
  }

  if (!job && !isAddPOMode) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <p className="text-gray-500">Job not found or invalid URL.</p>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-4 bg-[#00AEEF] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#0099cc] transition"
        >
          Back to Jobs
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && window.innerWidth < 640 && (
        <div
          className="fixed inset-0 bg-transparent bg-opacity-50 z-40"
          onClick={handleOverlayClick}
        />
      )}

      {/* Sidebar - Fixed on all screen sizes */}
      <aside
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 w-64 bg-white shadow-md p-6 flex flex-col z-50 overflow-y-auto
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          sm:translate-x-0`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Planning Details
        </h3>
        <ul className="space-y-2">
          {formStepsConfig.map((step, index) => {
            const isCompleted = getStepCompletion(step.id as FormStep);
            const isAccessible = isStepAccessible(step.id as FormStep);
            const isActive = step.id === currentStep;

            return (
              <li key={step.id}>
                <button
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors duration-200
                    ${
                      isActive
                        ? "bg-[#00AEEF] text-white shadow-md"
                        : "text-gray-700 hover:bg-gray-100"
                    }
                    ${
                      !isAccessible && !isActive
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                    }
                  `}
                  onClick={() => {
                    if (isAccessible) {
                      setCurrentStep(step.id as FormStep);
                      if (window.innerWidth < 640) {
                        setIsSidebarOpen(false);
                      }
                    }
                  }}
                  disabled={!isAccessible}
                >
                  {step.label}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Main Content Area - Always has left margin to account for fixed sidebar */}
      <main className="ml-0 sm:ml-64 p-4 sm:p-8 overflow-y-auto min-h-screen">
        {/* Hamburger icon for mobile */}
        <div className="sm:hidden mb-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-md bg-white shadow-sm"
            aria-label="Open sidebar"
          >
            <svg
              className="h-6 w-6 text-gray-700"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="fixed top-20 right-8 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded text-sm z-50 shadow-lg">
            <strong className="font-bold">Success!</strong>
            <span className="block sm:inline"> {successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="fixed top-20 right-8 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm z-50 shadow-lg">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {renderCurrentForm()}
      </main>
    </div>
  );
};

export default JobInitiationForm;
