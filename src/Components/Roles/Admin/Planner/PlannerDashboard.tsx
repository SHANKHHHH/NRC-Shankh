import React, { useState, useMemo, useEffect, useDeferredValue } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChartBarIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  PlayIcon,
  CogIcon,
  FunnelIcon,
  XMarkIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import JobAssigned from "../../Planner/job_assigned";
import JobModal from "./JobModal";
import PODetailModal from "../../Planner/jobCard/PODetailModal";
import { BulkJobPlanningModal } from "../../Planner/modal/BulkJobPlanning";
import { supabase } from "../../../../lib/supabaseClient";
import SingleJobPlanningModal from "../../Planner/modal/SingleJobPlanningModal";

interface PurchaseOrder {
  id: number;
  boardSize: string | null;
  customer: string;
  deliveryDate: string;
  dieCode: number | null;
  dispatchDate: string | null;
  dispatchQuantity: number | null;
  fluteType: string | null;
  jockeyMonth: string | null;
  noOfUps: number | null;
  nrcDeliveryDate: string | null;
  noOfSheets: number | null;
  poDate: string;
  poNumber: string;
  pendingQuantity: number | null;
  pendingValidity: number | null;
  plant: string | null;
  shadeCardApprovalDate: string | null;
  sharedCardDiffDate: number | null;
  srNo: number | null;
  style: string | null;
  totalPOQuantity: number | null;
  unit: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  jobNrcJobNo: string | null;
  userId: string | null;
  job: {
    nrcJobNo: string;
    customerName: string;
    styleItemSKU: string;
  } | null;
  user: any | null;
  boxDimensions: string | null;
  noOfColor?: string | null;
  jobBoardSize: string | null;
  steps?: any[];
  jobDemand?: string;
  jobPlanningId?: string | null;
}

interface FilterState {
  noOfColors: string[];
  boardSizes: string[];
  deliveryDateFrom: string;
  deliveryDateTo: string;
}

interface PlannerJob {
  nrcJobNo: string;
  styleItemSKU: string;
  customerName: string;
  status: string;
  poStatus: string;
  machineDetailsStatus: string;
  artworkStatus: string;
  overallProgress: number;
  createdAt: string | null;
  updatedAt: string;
  poCount: number;
  artworkCount: number;
  hasMachineDetails: boolean;
}

interface PlannerSummary {
  totalJobs: number;
  poCompleted: number;
  machineDetailsCompleted: number;
  artworkCompleted: number;
  fullyCompleted: number;
  partiallyCompleted: number;
  notStarted: number;
  totalActiveJobs: number;
  totalCompletedJobs: number;
}

interface PlannerDashboardData {
  summary: PlannerSummary;
  allJobs: PlannerJob[];
  activeJobs: PlannerJob[];
  completedJobs: PlannerJob[];
}

interface PlannerDashboardProps {
  data: PlannerDashboardData;
}

const PlannerDashboard: React.FC<PlannerDashboardProps> = ({ data }) => {
  const navigate = useNavigate();
  const [showJobAssigned, setShowJobAssigned] = useState(false);
  const [assignedJobsCount, setAssignedJobsCount] = useState<number>(0);
  const [isLoadingAssignedJobs, setIsLoadingAssignedJobs] =
    useState<boolean>(true);

  // Major hold jobs state
  const [majorHoldJobsCount, setMajorHoldJobsCount] = useState<number>(0);
  const [isLoadingMajorHoldJobs, setIsLoadingMajorHoldJobs] =
    useState<boolean>(true);

  // PO-related state
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [selectedPOForPlanning, setSelectedPOForPlanning] =
    useState<PurchaseOrder | null>(null);
  const [showBulkPlanningModal, setShowBulkPlanningModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPOs, setSelectedPOs] = useState<number[]>([]);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    noOfColors: [],
    boardSizes: [],
    deliveryDateFrom: "",
    deliveryDateTo: "",
  });

  const [availableNoOfColors, setAvailableNoOfColors] = useState<string[]>([]);
  const [availableBoardSizes, setAvailableBoardSizes] = useState<string[]>([]);
  const [noOfColorsSearch, setNoOfColorsSearch] = useState("");
  const [dimensionsSearch, setDimensionsSearch] = useState("");
  const [tableSearch, setTableSearch] = useState("");

  // Lazy loading state
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch assigned jobs count
  useEffect(() => {
    const fetchAssignedJobsCount = async () => {
      try {
        setIsLoadingAssignedJobs(true);
        const accessToken = localStorage.getItem("accessToken");

        if (!accessToken) {
          console.error("Authentication token not found");
          setAssignedJobsCount(0);
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
          throw new Error(
            `Failed to fetch job plans: ${response.status} ${response.statusText}`
          );
        }

        const assignedJobsData = await response.json();
        if (assignedJobsData.success && Array.isArray(assignedJobsData.data)) {
          setAssignedJobsCount(assignedJobsData.data.length);
        } else {
          setAssignedJobsCount(0);
        }
      } catch (error) {
        console.error("Error fetching assigned jobs count:", error);
        setAssignedJobsCount(0);
      } finally {
        setIsLoadingAssignedJobs(false);
      }
    };

    fetchAssignedJobsCount();
  }, []);

  // Fetch purchase orders
  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: pos, error: posError } = await supabase
        .from("PurchaseOrder")
        .select("*")
        .order("createdAt", { ascending: false });

      if (posError) throw posError;

      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) throw new Error("Authentication token not found");

      // Fetch jobs
      const jobsResponse = await fetch(
        "https://nrprod.nrcontainers.com/api/jobs",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!jobsResponse.ok) throw new Error("Failed to fetch jobs");
      const jobsData = await jobsResponse.json();

      // Fetch job plannings
      const jobPlanningResponse = await fetch(
        "https://nrprod.nrcontainers.com/api/job-planning/",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!jobPlanningResponse.ok)
        throw new Error("Failed to fetch job planning");
      const jobPlanningData = await jobPlanningResponse.json();

      // Merge data
      const mergedPOs = (pos || []).map((po: any) => {
        const matchingJob = jobsData?.data?.find(
          (job: any) =>
            job.nrcJobNo === po.jobNrcJobNo ||
            job.nrcJobNo === po.nrcJobNo ||
            (job.styleItemSKU === po.style && job.nrcJobNo === po.jobNrcJobNo)
        );

        // Match job planning by purchaseOrderId (unique) instead of nrcJobNo (can be shared)
        const matchingJobPlan = jobPlanningData?.data?.find(
          (jp: any) => jp.purchaseOrderId === po.id
        );

        return {
          ...po,
          job: matchingJob || null,
          // Enhanced job data merging - prioritize job data over PO data
          boxDimensions: matchingJob?.boxDimensions || po.boxDimensions || null,
          noOfColor: matchingJob?.noOfColor || po.noOfColor || null,
          jobBoardSize: matchingJob?.boardSize || po.boardSize || null,
          boardSize: matchingJob?.boardSize || po.boardSize || null,
          fluteType: matchingJob?.fluteType || po.fluteType,
          processColors: matchingJob?.processColors || po.processColors || null,
          overPrintFinishing:
            matchingJob?.overPrintFinishing || po.overPrintFinishing || null,
          topFaceGSM: matchingJob?.topFaceGSM || po.topFaceGSM || null,
          flutingGSM: matchingJob?.flutingGSM || po.flutingGSM || null,
          bottomLinerGSM:
            matchingJob?.bottomLinerGSM || po.bottomLinerGSM || null,
          diePunchCode: matchingJob?.diePunchCode || po.diePunchCode || null,
          boardCategory: matchingJob?.boardCategory || po.boardCategory || null,
          specialColor1: matchingJob?.specialColor1 || po.specialColor1 || null,
          specialColor2: matchingJob?.specialColor2 || po.specialColor2 || null,
          specialColor3: matchingJob?.specialColor3 || po.specialColor3 || null,
          specialColor4: matchingJob?.specialColor4 || po.specialColor4 || null,
          steps: matchingJobPlan?.steps || [],
          jobDemand: matchingJobPlan?.jobDemand || null,
          jobPlanningId: matchingJobPlan?.jobPlanId || null, // Track which PO has job planning
        };
      });

      setPurchaseOrders(mergedPOs);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching purchase orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  // Extract filter options
  const extractFilterOptions = useMemo(() => {
    return (pos: PurchaseOrder[]) => {
      const colors = new Set<string>();
      const sizes = new Set<string>();

      pos.forEach((po) => {
        if (po.noOfColor !== undefined && po.noOfColor !== null) {
          colors.add(String(po.noOfColor));
        } else {
          colors.add("0");
        }

        const dimension =
          po.boxDimensions || po.jobBoardSize || po.boardSize || "0x0x0";
        if (dimension) sizes.add(dimension);
      });

      setAvailableNoOfColors(Array.from(colors).sort());
      setAvailableBoardSizes(Array.from(sizes).sort());
    };
  }, []);

  // Check PO completion status
  const checkPOCompletionStatus = (
    po: PurchaseOrder
  ): "artwork_pending" | "po_pending" | "more_info_pending" | "completed" => {
    // Check if THIS specific PO has job planning (not just any PO with same nrcJobNo)
    const hasJobPlan = po.steps && po.steps.length > 0 && po.jobPlanningId;

    if (hasJobPlan) {
      return "completed";
    }

    const hasPO = po.poNumber && po.poDate;
    if (!hasPO) {
      return "po_pending";
    }

    const hasArtwork = po.shadeCardApprovalDate;
    if (!hasArtwork) {
      return "artwork_pending";
    }

    return "more_info_pending";
  };

  // Helper function to check if a job has major hold
  const isMajorHold = (po: PurchaseOrder): boolean => {
    if (!po.steps || !Array.isArray(po.steps)) {
      return false;
    }

    for (const step of po.steps) {
      // Check stepDetails.data.status for "major_hold"
      if (step?.stepDetails?.data?.status === "major_hold") {
        return true;
      }
      // Also check stepDetails.status
      if (step?.stepDetails?.status === "major_hold") {
        return true;
      }
      // Check for major hold remark
      if (
        step?.stepDetails?.data?.majorHoldRemark ||
        (step?.stepDetails?.data?.holdRemark &&
          /major/i.test(step.stepDetails.data.holdRemark))
      ) {
        return true;
      }
    }
    return false;
  };

  // Fetch major hold jobs count
  useEffect(() => {
    const fetchMajorHoldJobsCount = async () => {
      try {
        setIsLoadingMajorHoldJobs(true);
        const accessToken = localStorage.getItem("accessToken");

        if (!accessToken) {
          console.error("Authentication token not found");
          setMajorHoldJobsCount(0);
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
          throw new Error(
            `Failed to fetch job plans: ${response.status} ${response.statusText}`
          );
        }

        const jobPlanningData = await response.json();
        if (jobPlanningData.success && Array.isArray(jobPlanningData.data)) {
          // Fetch step details for each job plan to check for major hold
          let majorHoldCount = 0;

          for (const jobPlan of jobPlanningData.data) {
            // Fetch step details for steps that are started or stopped
            const stepsWithDetails = await Promise.all(
              (jobPlan.steps || []).map(async (step: any) => {
                if (step.status !== "start" && step.status !== "stop") {
                  return step;
                }

                try {
                  let endpoint = "";
                  switch (step.stepName) {
                    case "PaperStore":
                      endpoint = `https://nrprod.nrcontainers.com/api/paper-store/by-job/${encodeURIComponent(
                        jobPlan.nrcJobNo
                      )}`;
                      break;
                    case "PrintingDetails":
                      endpoint = `https://nrprod.nrcontainers.com/api/printing-details/by-job/${encodeURIComponent(
                        jobPlan.nrcJobNo
                      )}`;
                      break;
                    case "Corrugation":
                      endpoint = `https://nrprod.nrcontainers.com/api/corrugation/by-job/${encodeURIComponent(
                        jobPlan.nrcJobNo
                      )}`;
                      break;
                    case "FluteLaminateBoardConversion":
                      endpoint = `https://nrprod.nrcontainers.com/api/flute-laminate-board-conversion/by-job/${encodeURIComponent(
                        jobPlan.nrcJobNo
                      )}`;
                      break;
                    case "Punching":
                      endpoint = `https://nrprod.nrcontainers.com/api/punching/by-job/${encodeURIComponent(
                        jobPlan.nrcJobNo
                      )}`;
                      break;
                    case "SideFlapPasting":
                      endpoint = `https://nrprod.nrcontainers.com/api/side-flap-pasting/by-job/${encodeURIComponent(
                        jobPlan.nrcJobNo
                      )}`;
                      break;
                    case "QualityDept":
                      endpoint = `https://nrprod.nrcontainers.com/api/quality-dept/by-job/${encodeURIComponent(
                        jobPlan.nrcJobNo
                      )}`;
                      break;
                    case "DispatchProcess":
                      endpoint = `https://nrprod.nrcontainers.com/api/dispatch-process/by-job/${encodeURIComponent(
                        jobPlan.nrcJobNo
                      )}`;
                      break;
                    default:
                      return step;
                  }

                  if (endpoint) {
                    const stepResponse = await fetch(endpoint, {
                      headers: { Authorization: `Bearer ${accessToken}` },
                    });

                    if (stepResponse.ok) {
                      const stepResult = await stepResponse.json();
                      if (
                        stepResult.success &&
                        stepResult.data &&
                        stepResult.data.length > 0
                      ) {
                        return {
                          ...step,
                          stepDetails: { data: stepResult.data[0] },
                        };
                      }
                    }
                  }
                } catch (err) {
                  console.warn(`Error fetching ${step.stepName} details:`, err);
                }
                return step;
              })
            );

            // Check if this job has major hold
            const jobWithMajorHold = stepsWithDetails.some((step: any) => {
              if (step?.stepDetails?.data?.status === "major_hold") {
                return true;
              }
              if (step?.stepDetails?.status === "major_hold") {
                return true;
              }
              if (
                step?.stepDetails?.data?.majorHoldRemark ||
                (step?.stepDetails?.data?.holdRemark &&
                  /major/i.test(step.stepDetails.data.holdRemark))
              ) {
                return true;
              }
              return false;
            });

            if (jobWithMajorHold) {
              majorHoldCount++;
            }
          }

          setMajorHoldJobsCount(majorHoldCount);
        } else {
          setMajorHoldJobsCount(0);
        }
      } catch (error) {
        console.error("Error fetching major hold jobs count:", error);
        setMajorHoldJobsCount(0);
      } finally {
        setIsLoadingMajorHoldJobs(false);
      }
    };

    fetchMajorHoldJobsCount();
  }, []);

  // Apply filters - EXCLUDE COMPLETED POs
  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter((po) => {
      // Filter out completed POs
      const completionStatus = checkPOCompletionStatus(po);
      if (completionStatus === "completed") {
        return false;
      }

      // Only show "more_info_pending" POs when filters are active
      if (
        filters.noOfColors.length === 0 &&
        filters.boardSizes.length === 0 &&
        !filters.deliveryDateFrom &&
        !filters.deliveryDateTo
      ) {
        // No filters active - show only "more_info_pending"
        return completionStatus === "more_info_pending";
      }

      // Filters are active - apply them
      if (completionStatus !== "more_info_pending") {
        return false;
      }

      const matchesColor =
        filters.noOfColors.length === 0 ||
        filters.noOfColors.includes(String(po.noOfColor || "0"));

      const poDimension =
        po.boxDimensions || po.jobBoardSize || po.boardSize || "0x0x0";
      const matchesSize =
        filters.boardSizes.length === 0 ||
        filters.boardSizes.includes(poDimension);

      const matchesDateFrom =
        !filters.deliveryDateFrom ||
        new Date(po.deliveryDate) >= new Date(filters.deliveryDateFrom);

      const matchesDateTo =
        !filters.deliveryDateTo ||
        new Date(po.deliveryDate) <= new Date(filters.deliveryDateTo);

      return matchesColor && matchesSize && matchesDateFrom && matchesDateTo;
    });
  }, [purchaseOrders, filters]);

  // Apply table search filter
  const searchedPOs = useMemo(() => {
    if (!tableSearch.trim()) {
      return filteredPOs;
    }

    const searchTerm = tableSearch.toLowerCase();
    return filteredPOs.filter((po) => {
      return (
        po.poNumber?.toLowerCase().includes(searchTerm) ||
        po.style?.toLowerCase().includes(searchTerm) ||
        po.customer?.toLowerCase().includes(searchTerm) ||
        po.totalPOQuantity?.toString().includes(searchTerm) ||
        po.deliveryDate?.toLowerCase().includes(searchTerm) ||
        po.poDate?.toLowerCase().includes(searchTerm) ||
        po.dieCode?.toString().toLowerCase().includes(searchTerm) ||
        (po.boxDimensions || po.jobBoardSize || po.boardSize || "0x0x0")
          ?.toLowerCase()
          .includes(searchTerm)
      );
    });
  }, [filteredPOs, tableSearch]);

  // Use deferred value for smoother rendering
  const deferredSearchedPOs = useDeferredValue(searchedPOs);

  // Pagination logic
  const totalPages = Math.ceil(deferredSearchedPOs.length / itemsPerPage);
  const paginatedPOs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return deferredSearchedPOs.slice(startIndex, endIndex);
  }, [deferredSearchedPOs, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [tableSearch, filters]);

  // Clear selected POs when search or filters change
  useEffect(() => {
    setSelectedPOs([]);
  }, [tableSearch, filters]);

  // Update filter options based on POs that need job planning
  useEffect(() => {
    // Extract filter options from all POs that need job planning (more_info_pending)
    // This ensures users can see all available filter values
    const posNeedingPlanning = purchaseOrders.filter((po) => {
      const completionStatus = checkPOCompletionStatus(po);
      return completionStatus === "more_info_pending";
    });
    extractFilterOptions(posNeedingPlanning);
  }, [purchaseOrders, extractFilterOptions]);

  // Handle PO selection
  const handlePOSelection = (poId: number) => {
    setSelectedPOs((prev) =>
      prev.includes(poId) ? prev.filter((id) => id !== poId) : [...prev, poId]
    );
  };

  // Handle select all/none
  const handleSelectAll = () => {
    if (selectedPOs.length === paginatedPOs.length) {
      setSelectedPOs([]);
    } else {
      setSelectedPOs(paginatedPOs.map((po) => po.id));
    }
  };

  // Get selected PO objects
  const getSelectedPOObjects = () => {
    return paginatedPOs.filter((po) => selectedPOs.includes(po.id));
  };

  // Toggle filters
  const toggleNoOfColorFilter = (color: string) => {
    setFilters((prev) => ({
      ...prev,
      noOfColors: prev.noOfColors.includes(color)
        ? prev.noOfColors.filter((c) => c !== color)
        : [...prev.noOfColors, color],
    }));
  };

  const toggleBoardSizeFilter = (size: string) => {
    setFilters((prev) => ({
      ...prev,
      boardSizes: prev.boardSizes.includes(size)
        ? prev.boardSizes.filter((s) => s !== size)
        : [...prev.boardSizes, size],
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      noOfColors: [],
      boardSizes: [],
      deliveryDateFrom: "",
      deliveryDateTo: "",
    });
    setNoOfColorsSearch("");
    setDimensionsSearch("");
  };

  const activeFilterCount =
    filters.noOfColors.length +
    filters.boardSizes.length +
    (filters.deliveryDateFrom ? 1 : 0) +
    (filters.deliveryDateTo ? 1 : 0);

  // Handle PO click - Always open detail modal first
  const handlePOClick = (po: PurchaseOrder) => {
    setSelectedPO(po);
  };

  // Handle More Info button click from PODetailModal
  const handleNavigateToForm = (po: PurchaseOrder, formType: string) => {
    setSelectedPO(null); // Close the detail modal
    if (formType === "moreInfo") {
      setSelectedPOForPlanning(po); // Open the planning modal
    }
  };

  // Handle job planning save
  const handleJobPlanningSave = async (jobPlanningData: any) => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(
        "https://nrprod.nrcontainers.com/api/job-planning/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(jobPlanningData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save job planning");
      }

      const result = await response.json();
      console.log("✅ Job planning created successfully:", result);

      alert("Job planning created successfully!");
      setSelectedPOForPlanning(null);

      // Refresh the PO list to update the status
      await fetchPurchaseOrders();
    } catch (error: any) {
      console.error("❌ Job planning error:", error);
      alert(`Error: ${error.message}`);
    }
  };

  // Handle bulk job planning
  const handleBulkJobPlanning = async (jobPlanningData: any) => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(
        "https://nrprod.nrcontainers.com/api/job-planning/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(jobPlanningData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save job planning");
      }

      console.log("Job planning created successfully");
    } catch (error: any) {
      console.error("Bulk job planning error:", error);
      throw error;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "artwork_pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "po_pending":
        return "bg-red-100 text-red-800 border-red-200";
      case "more_info_pending":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    jobs: PlannerJob[];
  }>({
    isOpen: false,
    title: "",
    jobs: [],
  });

  const openModal = (title: string, jobs: PlannerJob[]) => {
    setModalState({
      isOpen: true,
      title,
      jobs,
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      title: "",
      jobs: [],
    });
  };

  // Chart data preparation - Based on POs
  const chartData = useMemo(() => {
    // Count POs by status
    const completedPOs = data.summary.totalCompletedJobs || 0; // From Completed Jobs API
    const plannedOrInProgressPOs = assignedJobsCount; // From job planning API
    const openPOs = purchaseOrders.filter(
      (po) => checkPOCompletionStatus(po) === "more_info_pending"
    ).length;

    const completionData = [
      {
        name: "Completed POs",
        value: completedPOs,
        color: "#10B981",
      },
      {
        name: "Planned/In Progress POs",
        value: plannedOrInProgressPOs,
        color: "#3B82F6",
      },
      {
        name: "Open POs (More Info Pending)",
        value: openPOs,
        color: "#F59E0B",
      },
    ].filter((item) => item.value > 0);

    const totalPOs = completedPOs + plannedOrInProgressPOs + openPOs;

    const comparisonData = [
      {
        name: "Completed POs",
        completed: completedPOs,
        total: totalPOs,
        color: "#10B981",
      },
      {
        name: "Planned/In Progress",
        completed: plannedOrInProgressPOs,
        total: totalPOs,
        color: "#3B82F6",
      },
      {
        name: "Open POs",
        completed: openPOs,
        total: totalPOs,
        color: "#F59E0B",
      },
    ];

    return { completionData, comparisonData };
  }, [purchaseOrders, assignedJobsCount, data.summary.totalCompletedJobs]);

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-2">
          <div className="bg-blue-500 p-3 rounded-xl">
            <ClipboardDocumentListIcon className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <p className="text-gray-600 text-2xl">
                Job planning overview and progress tracking
              </p>
              {majorHoldJobsCount >0 && (
                <button
                  onClick={() => navigate("/dashboard/major-hold-jobs")}
                  className="relative inline-flex items-center justify-center rounded-full p-2 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  title="View major hold jobs"
                >
                  <ExclamationTriangleIcon
                    className={`text-red-500 ${
                      majorHoldJobsCount > 0 ? "animate-pulse" : ""
                    }`}
                    width={24}
                    height={24}
                  />
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold leading-none text-white bg-red-600 rounded-full">
                    {majorHoldJobsCount}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          Last updated:{" "}
          {new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Completed Jobs Card */}
        <div
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 cursor-pointer hover:shadow-md transition-all duration-200 transform hover:-translate-y-1"
          onClick={() => openModal("Completed Jobs", data.completedJobs || [])}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-medium text-gray-600 mb-2">
                Completed Jobs
              </p>
              <p className="text-4xl font-bold text-green-600 mb-2">
                {data.summary.totalCompletedJobs || 0}
              </p>
              <p className="text-sm text-gray-500">
                Jobs that have been fully completed and processed
              </p>
            </div>
            <div className="bg-green-100 p-4 rounded-xl">
              <CheckCircleIcon className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center text-sm text-green-600">
              <span className="font-medium">View all completed jobs</span>
              <ChartBarIcon className="h-4 w-4 ml-2" />
            </div>
          </div>
        </div>

        {/* Planned/In Progress Jobs Card */}
        <div
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 cursor-pointer hover:shadow-md transition-all duration-200 transform hover:-translate-y-1"
          onClick={() => setShowJobAssigned(!showJobAssigned)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-medium text-gray-600 mb-2">
                Planned & In Progress
              </p>
              <p className="text-4xl font-bold text-blue-600 mb-2">
                {isLoadingAssignedJobs ? (
                  <span className="animate-pulse text-gray-400">...</span>
                ) : (
                  assignedJobsCount
                )}
              </p>
              <p className="text-sm text-gray-500">
                Jobs currently assigned and being planned for production
              </p>
            </div>
            <div className="bg-blue-100 p-4 rounded-xl">
              <div className="relative">
                <CogIcon className="h-10 w-10 text-blue-600" />
                <PlayIcon className="h-4 w-4 text-blue-800 absolute -bottom-1 -right-1" />
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center text-sm text-blue-600">
              <span className="font-medium">
                {showJobAssigned
                  ? "Hide planning details"
                  : "View planning details"}
              </span>
              <ChartBarIcon className="h-4 w-4 ml-2" />
            </div>
          </div>
        </div>
      </div>

      {/* Conditionally render JobAssigned Component */}
      {showJobAssigned && (
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Job Planning Details
              </h3>
              <button
                onClick={() => setShowJobAssigned(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="text-sm">Close</span>
              </button>
            </div>
            <JobAssigned />
          </div>
        </div>
      )}

      {/* Modal */}
      <JobModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        jobs={modalState.jobs}
      />

      {/* Purchase Orders Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Purchase Orders Needing Job Planning
              </h3>
              <p className="text-sm text-gray-600">
                {loading
                  ? "Loading..."
                  : `Showing ${filteredPOs.length} POs needing job planning`}
                {activeFilterCount > 0 &&
                  ` (${activeFilterCount} filters applied)`}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {/* Bulk Job Planning Button for Filtered POs */}
              {filteredPOs.length > 0 && activeFilterCount > 0 && (
                <button
                  onClick={() => setShowBulkPlanningModal(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <Cog6ToothIcon className="h-4 w-4" />
                  <span>Bulk Planning ({filteredPOs.length})</span>
                </button>
              )}
              {/* Bulk Job Planning Button for Selected POs */}
              {(tableSearch || activeFilterCount > 0) &&
                selectedPOs.length > 0 && (
                  <button
                    onClick={() => setShowBulkPlanningModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    <Cog6ToothIcon className="h-4 w-4" />
                    <span>Bulk Planning ({selectedPOs.length} selected)</span>
                  </button>
                )}
              {/* Filter Toggle Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  showFilters
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <FunnelIcon className="h-4 w-4" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="bg-white text-blue-600 rounded-full px-2 py-0.5 text-xs font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        {showFilters && (
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-700">
                Filter Purchase Orders
              </h4>
              <div className="flex items-center space-x-2">
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
                  >
                    <span>Clear All</span>
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Filters will only show Purchase Orders
                that need job planning (More Info Pending status)
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Number of Colors Filter */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Number of Colors
                </h4>
                <div className="mb-2">
                  <input
                    type="text"
                    placeholder="Search colors..."
                    value={noOfColorsSearch}
                    onChange={(e) => setNoOfColorsSearch(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {availableNoOfColors
                    .filter((color) =>
                      color
                        .toLowerCase()
                        .includes(noOfColorsSearch.toLowerCase())
                    )
                    .map((color) => (
                      <label
                        key={color}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={filters.noOfColors.includes(color)}
                          onChange={() => toggleNoOfColorFilter(color)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600 truncate">
                          {color}
                        </span>
                      </label>
                    ))}
                  {availableNoOfColors.filter((color) =>
                    color.toLowerCase().includes(noOfColorsSearch.toLowerCase())
                  ).length === 0 && (
                    <p className="text-sm text-gray-400">
                      {noOfColorsSearch
                        ? "No matching colors"
                        : "No colors available"}
                    </p>
                  )}
                </div>
              </div>

              {/* Dimensions Filter */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Dimensions
                </h4>
                <div className="mb-2">
                  <input
                    type="text"
                    placeholder="Search dimensions..."
                    value={dimensionsSearch}
                    onChange={(e) => setDimensionsSearch(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {availableBoardSizes
                    .filter((boardSize) =>
                      boardSize
                        .toLowerCase()
                        .includes(dimensionsSearch.toLowerCase())
                    )
                    .map((boardSize) => (
                      <label
                        key={boardSize}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={filters.boardSizes.includes(boardSize)}
                          onChange={() => toggleBoardSizeFilter(boardSize)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600 truncate">
                          {boardSize}
                        </span>
                      </label>
                    ))}
                  {availableBoardSizes.filter((boardSize) =>
                    boardSize
                      .toLowerCase()
                      .includes(dimensionsSearch.toLowerCase())
                  ).length === 0 && (
                    <p className="text-sm text-gray-400">
                      {dimensionsSearch
                        ? "No matching dimensions"
                        : "No board sizes available"}
                    </p>
                  )}
                </div>
              </div>

              {/* Delivery Date Filter */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Delivery Date Range
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      From
                    </label>
                    <input
                      type="date"
                      value={filters.deliveryDateFrom}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          deliveryDateFrom: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      To
                    </label>
                    <input
                      type="date"
                      value={filters.deliveryDateTo}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          deliveryDateTo: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Active Filters Display */}
            {activeFilterCount > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Active Filters:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {filters.noOfColors.map((color) => (
                    <span
                      key={`color-${color}`}
                      className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      Color: {color}
                      <button
                        onClick={() => toggleNoOfColorFilter(color)}
                        className="ml-1 hover:text-blue-900"
                      >
                        <XMarkIcon className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                  {filters.boardSizes.map((size) => (
                    <span
                      key={`size-${size}`}
                      className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full"
                    >
                      Size: {size}
                      <button
                        onClick={() => toggleBoardSizeFilter(size)}
                        className="ml-1 hover:text-purple-900"
                      >
                        <XMarkIcon className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                  {filters.deliveryDateFrom && (
                    <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      From: {formatDate(filters.deliveryDateFrom)}
                      <button
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            deliveryDateFrom: "",
                          }))
                        }
                        className="ml-1 hover:text-green-900"
                      >
                        <XMarkIcon className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  )}
                  {filters.deliveryDateTo && (
                    <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                      To: {formatDate(filters.deliveryDateTo)}
                      <button
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            deliveryDateTo: "",
                          }))
                        }
                        className="ml-1 hover:text-orange-900"
                      >
                        <XMarkIcon className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search Bar */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search POs by Style, Customer, PO Number, PO Date, Delivery Date, Quantity, Board Size, or Die Code..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full px-4 py-2 pl-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
            {tableSearch && (
              <button
                onClick={() => setTableSearch("")}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          {(tableSearch || activeFilterCount > 0) && (
            <div className="mt-2 text-sm text-gray-600">
              Showing {deferredSearchedPOs.length} of {filteredPOs.length} POs
              {selectedPOs.length > 0 && (
                <span className="ml-2 text-green-600 font-medium">
                  • {selectedPOs.length} selected
                </span>
              )}
            </div>
          )}
        </div>

        {/* PO List Table */}
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
              <p className="ml-4 text-lg text-gray-600">
                Loading purchase orders...
              </p>
            </div>
          ) : error ? (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded m-4"
              role="alert"
            >
              <strong className="font-bold">Error!</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          ) : deferredSearchedPOs.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {tableSearch
                  ? "No purchase orders found matching your search."
                  : activeFilterCount > 0
                  ? "No purchase orders found matching the current filters."
                  : "No purchase orders needing job planning."}
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  {(tableSearch || activeFilterCount > 0) && (
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={
                          selectedPOs.length === paginatedPOs.length &&
                          paginatedPOs.length > 0
                        }
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                  )}
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Style
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PO Number
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PO Date
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span className="font-bold">Delivery Date</span>
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span className="font-bold">Qty</span>
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Board Size
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Die Code
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedPOs.map((po) => {
                  const completionStatus = checkPOCompletionStatus(po);
                  return (
                    <tr
                      key={po.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handlePOClick(po)}
                    >
                      {(tableSearch || activeFilterCount > 0) && (
                        <td
                          className="px-4 py-2 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedPOs.includes(po.id)}
                            onChange={() => handlePOSelection(po.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                      )}
                      <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                        {po.style || "N/A"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                        {po.customer}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap font-medium text-gray-500">
                        {po.poNumber}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                        {formatDate(po.poDate)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                        <span className="font-bold">
                          {formatDate(po.deliveryDate)}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                        <span className="font-bold">
                          {po.totalPOQuantity || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                        {po.boxDimensions ||
                          po.jobBoardSize ||
                          po.boardSize ||
                          "0x0x0"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                        {po.dieCode || "N/A"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                            completionStatus
                          )}`}
                        >
                          {completionStatus.replace(/_/g, " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePOClick(po);
                          }}
                          className="text-blue-600 hover:text-blue-900 text-sm"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Pagination Controls */}
          {!loading && !error && deferredSearchedPOs.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(
                      currentPage * itemsPerPage,
                      deferredSearchedPOs.length
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium">
                    {deferredSearchedPOs.length}
                  </span>{" "}
                  results
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-700">
                    Items per page:
                  </label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  First
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pie Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            PO Distribution by Status
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.completionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value, percent }) =>
                    `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`
                  }
                >
                  {chartData.completionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            PO Completion Progress
          </h3>
          <div className="space-y-6">
            {chartData.comparisonData.map((item, index) => {
              const completionRate = (item.completed / item.total) * 100;
              return (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">
                      {item.name}
                    </span>
                    <span className="text-sm text-gray-600">
                      {item.completed}/{item.total} (
                      {Math.round(completionRate)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${completionRate}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 bg-gray-50 rounded-lg p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(
                  (chartData.comparisonData.reduce(
                    (sum, item) => sum + item.completed,
                    0
                  ) /
                    chartData.comparisonData.reduce(
                      (sum, item) => sum + item.total,
                      0
                    )) *
                    100
                )}
                %
              </div>
              <div className="text-sm text-gray-600">
                Overall Completion Rate
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedPO && (
        <PODetailModal
          po={selectedPO}
          onClose={() => setSelectedPO(null)}
          completionStatus={checkPOCompletionStatus(selectedPO)}
          onNavigateToForm={handleNavigateToForm}
          onRefresh={fetchPurchaseOrders}
        />
      )}

      {selectedPOForPlanning && (
        <SingleJobPlanningModal
          po={selectedPOForPlanning}
          onSave={handleJobPlanningSave}
          onClose={() => setSelectedPOForPlanning(null)}
        />
      )}

      {showBulkPlanningModal && (
        <BulkJobPlanningModal
          filteredPOs={
            (tableSearch || activeFilterCount > 0) && selectedPOs.length > 0
              ? getSelectedPOObjects()
              : filteredPOs
          }
          onSave={handleBulkJobPlanning}
          onClose={() => {
            setShowBulkPlanningModal(false);
            setSelectedPOs([]);
          }}
          onRefresh={fetchPurchaseOrders}
        />
      )}
    </div>
  );
};

export default PlannerDashboard;
