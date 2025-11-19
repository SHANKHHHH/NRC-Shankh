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
import { Trash2, ChevronDown } from "lucide-react";
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
  hasJobPlan?: boolean;
  jobPlanId?: number;
}

interface FilterState {
  noOfColors: string[];
  boardSizes: string[];
  deliveryDateFrom: string;
  deliveryDateTo: string;
}

interface ColumnFilters {
  style: string[];
  customer: string[];
  poNumber: string[];
  poDate: string[];
  deliveryDate: string[];
  totalPOQuantity: string[];
  boardSize: string[];
  dieCode: string[];
  status: string[];
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
  const [poToDelete, setPOToDelete] = useState<PurchaseOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Column filters state
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
    style: [],
    customer: [],
    poNumber: [],
    poDate: [],
    deliveryDate: [],
    totalPOQuantity: [],
    boardSize: [],
    dieCode: [],
    status: [],
  });
  const [activeColumnFilter, setActiveColumnFilter] = useState<string | null>(null);
  const [filterSearch, setFilterSearch] = useState<string>("");
  const [filterDropdownPosition, setFilterDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Lazy loading state
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Format date helper function
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

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

            // Check if this job has major hold - using same logic as AdminDashboard
            const jobWithMajorHold = stepsWithDetails.some((step: any) => {
              // Check direct step status
              if (step.status === "major_hold") {
                return true;
              }

              // Check step-specific properties (paperStore, printingDetails, etc.)
              if (
                step.paperStore?.status === "major_hold" ||
                step.printingDetails?.status === "major_hold" ||
                step.corrugation?.status === "major_hold" ||
                step.flutelam?.status === "major_hold" ||
                step.fluteLaminateBoardConversion?.status === "major_hold" ||
                step.punching?.status === "major_hold" ||
                step.sideFlapPasting?.status === "major_hold" ||
                step.qualityDept?.status === "major_hold" ||
                step.dispatchProcess?.status === "major_hold"
              ) {
                return true;
              }

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

  // Apply column filters and table search filter
  const searchedPOs = useMemo(() => {
    let result = filteredPOs;

    // Apply column filters
    result = result.filter((po) => {
      // Style filter
      if (
        columnFilters.style.length > 0 &&
        !columnFilters.style.includes(po.style || "")
      ) {
        return false;
      }

      // Customer filter
      if (
        columnFilters.customer.length > 0 &&
        !columnFilters.customer.includes(po.customer || "")
      ) {
        return false;
      }

      // PO Number filter
      if (
        columnFilters.poNumber.length > 0 &&
        !columnFilters.poNumber.includes(po.poNumber || "")
      ) {
        return false;
      }

      // PO Date filter
      if (columnFilters.poDate.length > 0) {
        const poDateFormatted = po.poDate ? formatDate(po.poDate) : "";
        if (!columnFilters.poDate.includes(poDateFormatted)) {
          return false;
        }
      }

      // Delivery Date filter
      if (columnFilters.deliveryDate.length > 0) {
        const deliveryDateFormatted = po.deliveryDate ? formatDate(po.deliveryDate) : "";
        if (!columnFilters.deliveryDate.includes(deliveryDateFormatted)) {
          return false;
        }
      }

      // Quantity filter
      if (columnFilters.totalPOQuantity.length > 0) {
        const poQuantity = po.totalPOQuantity?.toString() || "";
        if (!columnFilters.totalPOQuantity.includes(poQuantity)) {
          return false;
        }
      }

      // Board Size filter
      if (
        columnFilters.boardSize.length > 0 &&
        !columnFilters.boardSize.includes(po.boxDimensions || po.jobBoardSize || po.boardSize || "")
      ) {
        return false;
      }

      // Die Code filter
      if (columnFilters.dieCode.length > 0) {
        const poDieCode = po.dieCode?.toString() || "";
        if (!columnFilters.dieCode.includes(poDieCode)) {
          return false;
        }
      }

      // Status filter
      if (columnFilters.status.length > 0) {
        const completionStatus = checkPOCompletionStatus(po);
        let statusLabel = "";
        switch (completionStatus) {
          case "artwork_pending":
            statusLabel = "Artwork Pending";
            break;
          case "po_pending":
            statusLabel = "PO Pending";
            break;
          case "more_info_pending":
            statusLabel = "More Info Pending";
            break;
          case "completed":
            statusLabel = "Completed";
            break;
          default:
            statusLabel = "Unknown";
        }
        if (!columnFilters.status.includes(statusLabel)) {
          return false;
        }
      }

      return true;
    });

    // Apply table search
    if (!tableSearch.trim()) {
      return result;
    }

    const searchTerm = tableSearch.toLowerCase();
    return result.filter((po) => {
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
  }, [filteredPOs, tableSearch, columnFilters]);

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

  // Column filter functions
  const getUniqueColumnValues = (columnName: keyof ColumnFilters): string[] => {
    const values = new Set<string>();
    const dateMap = new Map<string, string>(); // Map formatted date to original date string
    
    filteredPOs.forEach((po) => {
      let value: string = "";
      if (columnName === "style") {
        value = po.style || "";
      } else if (columnName === "customer") {
        value = po.customer || "";
      } else if (columnName === "poNumber") {
        value = po.poNumber || "";
      } else if (columnName === "poDate") {
        if (po.poDate) {
          value = formatDate(po.poDate);
          dateMap.set(value, po.poDate);
        }
      } else if (columnName === "deliveryDate") {
        if (po.deliveryDate) {
          value = formatDate(po.deliveryDate);
          dateMap.set(value, po.deliveryDate);
        }
      } else if (columnName === "totalPOQuantity") {
        value = po.totalPOQuantity?.toString() || "";
      } else if (columnName === "boardSize") {
        value = po.boxDimensions || po.jobBoardSize || po.boardSize || "";
      } else if (columnName === "dieCode") {
        value = po.dieCode?.toString() || "";
      } else if (columnName === "status") {
        const completionStatus = checkPOCompletionStatus(po);
        switch (completionStatus) {
          case "artwork_pending":
            value = "Artwork Pending";
            break;
          case "po_pending":
            value = "PO Pending";
            break;
          case "more_info_pending":
            value = "More Info Pending";
            break;
          case "completed":
            value = "Completed";
            break;
          default:
            value = "Unknown";
        }
      }
      values.add(value);
    });
    
    const valuesArray = Array.from(values);
    
    // Sort dates chronologically for date columns
    if (columnName === "poDate" || columnName === "deliveryDate") {
      return valuesArray.sort((a, b) => {
        const dateA = dateMap.get(a);
        const dateB = dateMap.get(b);
        if (!dateA || !dateB) return 0;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      });
    }
    
    // Sort numbers numerically for quantity and dieCode columns
    if (columnName === "totalPOQuantity" || columnName === "dieCode") {
      return valuesArray.sort((a, b) => {
        const numA = parseInt(a) || 0;
        const numB = parseInt(b) || 0;
        return numA - numB;
      });
    }
    
    // Default alphabetical sort for other columns
    return valuesArray.sort();
  };

  const toggleColumnFilter = (
    columnName: keyof ColumnFilters,
    value: string
  ) => {
    setColumnFilters((prev) => {
      const currentValues = prev[columnName];
      return {
        ...prev,
        [columnName]: currentValues.includes(value)
          ? currentValues.filter((v) => v !== value)
          : [...currentValues, value],
      };
    });
  };

  const clearColumnFilter = (columnName: keyof ColumnFilters) => {
    setColumnFilters((prev) => ({
      ...prev,
      [columnName]: [],
    }));
  };

  const handleToggleFilterDropdown = (
    columnName: string,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    if (activeColumnFilter !== columnName) {
      setFilterSearch("");
    }

    const newState = activeColumnFilter === columnName ? null : columnName;
    setActiveColumnFilter(newState);

    if (newState) {
      // Calculate position for fixed dropdown
      const buttonRect = event.currentTarget.getBoundingClientRect();
      const dropdownTop = buttonRect.bottom + 4; // 4px gap
      const dropdownLeft = buttonRect.left;

      setFilterDropdownPosition({ top: dropdownTop, left: dropdownLeft });
    } else {
      setFilterDropdownPosition(null);
    }
  };

  const areAllVisibleValuesSelected = (columnName: keyof ColumnFilters): boolean => {
    const visibleValues = getUniqueColumnValues(columnName).filter(
      (value) =>
        filterSearch === "" ||
        value.toLowerCase().includes(filterSearch.toLowerCase())
    );
    return visibleValues.every((value) =>
      columnFilters[columnName].includes(value)
    );
  };

  const handleSelectAllFilter = (columnName: keyof ColumnFilters) => {
    const visibleValues = getUniqueColumnValues(columnName).filter(
      (value) =>
        filterSearch === "" ||
        value.toLowerCase().includes(filterSearch.toLowerCase())
    );
    const allSelected = areAllVisibleValuesSelected(columnName);

    setColumnFilters((prev) => {
      if (allSelected) {
        return {
          ...prev,
          [columnName]: prev[columnName].filter(
            (v) => !visibleValues.includes(v)
          ),
        };
      } else {
        const newValues = [...prev[columnName]];
        visibleValues.forEach((value) => {
          if (!newValues.includes(value)) {
            newValues.push(value);
          }
        });
        return {
          ...prev,
          [columnName]: newValues,
        };
      }
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (activeColumnFilter && !target.closest(".filter-dropdown-container")) {
        setActiveColumnFilter(null);
        setFilterDropdownPosition(null);
        setFilterSearch("");
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [activeColumnFilter]);

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

  // Snackbar function
  const showSnackbar = (message: string, type: "success" | "error" | "warning" | "info" = "info") => {
    alert(message); // Simple alert for now, can be upgraded to a snackbar component
  };

  // Handle single PO delete
  const handleSinglePODelete = async () => {
    if (!poToDelete) return;

    setIsDeleting(true);
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("Authentication token not found. Please log in.");
      }

      // Check if PO has job planning
      if (
        poToDelete.hasJobPlan === true ||
        poToDelete.jobPlanId ||
        poToDelete.jobPlanningId
      ) {
        showSnackbar(
          `Cannot delete PO ${
            poToDelete.poNumber || poToDelete.style
          } with job planning. Please delete the job planning first.`,
          "error"
        );
        setIsDeleting(false);
        setPOToDelete(null);
        return;
      }

      // Delete the PO
      const response = await fetch(
        `https://nrprod.nrcontainers.com/api/purchase-orders/${poToDelete.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Failed to delete PO with ID ${poToDelete.id}`
        );
      }

      showSnackbar(
        `Successfully deleted purchase order ${
          poToDelete.poNumber || poToDelete.style
        }`,
        "success"
      );

      // Clear and refresh
      setPOToDelete(null);
      await fetchPurchaseOrders();
    } catch (error: any) {
      console.error("Error deleting purchase order:", error);
      showSnackbar(error.message || "Failed to delete purchase order", "error");
    } finally {
      setIsDeleting(false);
    }
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
                {majorHoldJobsCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold leading-none text-white bg-red-600 rounded-full animate-pulse">
                    {majorHoldJobsCount}
                  </span>
                )}
              </button>
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
              {/* Bulk Job Planning Button for Selected POs */}
              {selectedPOs.length > 0 && (
                <button
                  onClick={() => setShowBulkPlanningModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <Cog6ToothIcon className="h-4 w-4" />
                  <span>Bulk Planning ({selectedPOs.length} selected)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Old filter panel removed - using column filters instead */}

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
          {tableSearch && (
            <div className="mt-2 text-sm text-gray-600">
              Showing {deferredSearchedPOs.length} of {filteredPOs.length} POs
            </div>
          )}
          {selectedPOs.length > 0 && (
            <div className="mt-2 text-sm text-green-600 font-medium">
              • {selectedPOs.length} selected
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
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">
                    <div className="flex items-center justify-between filter-dropdown-container">
                      <div className="flex items-center space-x-1">
                        <span>Style</span>
                        {columnFilters.style.length > 0 && (
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full">
                            {columnFilters.style.length}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleToggleFilterDropdown("style", e)}
                        className="ml-2 hover:bg-gray-200 rounded p-1"
                      >
                        <ChevronDown
                          size={16}
                          className={
                            activeColumnFilter === "style" ? "rotate-180" : ""
                          }
                        />
                      </button>
                    </div>
                    {activeColumnFilter === "style" &&
                      filterDropdownPosition && (
                        <div
                          className="fixed w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] max-h-80 overflow-hidden flex flex-col filter-dropdown-container"
                          style={{
                            top: `${filterDropdownPosition.top}px`,
                            left: `${filterDropdownPosition.left}px`,
                          }}
                        >
                          <div className="p-2 border-b border-gray-200">
                            <input
                              type="text"
                              placeholder="Search..."
                              value={filterSearch}
                              onChange={(e) => {
                                e.stopPropagation();
                                setFilterSearch(e.target.value);
                              }}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="px-2 py-1 border-b border-gray-200">
                            <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={areAllVisibleValuesSelected("style")}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleSelectAllFilter("style");
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm font-semibold text-gray-900">
                                Select All
                              </span>
                            </label>
                          </div>
                          <div className="overflow-y-auto max-h-64 p-2">
                            {getUniqueColumnValues("style")
                              .filter(
                                (value) =>
                                  filterSearch === "" ||
                                  value
                                    .toLowerCase()
                                    .includes(filterSearch.toLowerCase())
                              )
                              .map((value) => (
                                <label
                                  key={value}
                                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                                >
                                  <input
                                    type="checkbox"
                                    checked={columnFilters.style.includes(
                                      value
                                    )}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      toggleColumnFilter("style", value);
                                    }}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700 truncate">
                                    {value || "(Blank)"}
                                  </span>
                                </label>
                              ))}
                          </div>
                          <div className="p-2 border-t border-gray-200">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                clearColumnFilter("style");
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Clear Filter
                            </button>
                          </div>
                        </div>
                      )}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">
                    <div className="flex items-center justify-between filter-dropdown-container">
                      <div className="flex items-center space-x-1">
                        <span>Customer</span>
                        {columnFilters.customer.length > 0 && (
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full">
                            {columnFilters.customer.length}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleToggleFilterDropdown("customer", e)}
                        className="ml-2 hover:bg-gray-200 rounded p-1"
                      >
                        <ChevronDown
                          size={16}
                          className={activeColumnFilter === "customer" ? "rotate-180" : ""}
                        />
                      </button>
                    </div>
                    {activeColumnFilter === "customer" && filterDropdownPosition && (
                        <div
                          className="fixed w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] max-h-80 overflow-hidden flex flex-col filter-dropdown-container"
                          style={{
                            top: `${filterDropdownPosition.top}px`,
                            left: `${filterDropdownPosition.left}px`,
                          }}
                        >
                        <div className="p-2 border-b border-gray-200">
                          <input
                            type="text"
                            placeholder="Search..."
                            value={filterSearch}
                            onChange={(e) => {
                              e.stopPropagation();
                              setFilterSearch(e.target.value);
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="px-2 py-1 border-b border-gray-200">
                          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={areAllVisibleValuesSelected("customer")}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSelectAllFilter("customer");
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-semibold text-gray-900">Select All</span>
                          </label>
                        </div>
                        <div className="overflow-y-auto max-h-64 p-2">
                          {getUniqueColumnValues("customer")
                            .filter((value) => filterSearch === "" || value.toLowerCase().includes(filterSearch.toLowerCase()))
                            .map((value) => (
                              <label
                                key={value}
                                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={columnFilters.customer.includes(value)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleColumnFilter("customer", value);
                                  }}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 truncate">{value || "(Blank)"}</span>
                              </label>
                            ))}
                        </div>
                        <div className="p-2 border-t border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearColumnFilter("customer");
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Clear Filter
                          </button>
                        </div>
                      </div>
                    )}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">
                    <div className="flex items-center justify-between filter-dropdown-container">
                      <div className="flex items-center space-x-1">
                        <span>PO Number</span>
                        {columnFilters.poNumber.length > 0 && (
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full">
                            {columnFilters.poNumber.length}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleToggleFilterDropdown("poNumber", e)}
                        className="ml-2 hover:bg-gray-200 rounded p-1"
                      >
                        <ChevronDown
                          size={16}
                          className={activeColumnFilter === "poNumber" ? "rotate-180" : ""}
                        />
                      </button>
                    </div>
                    {activeColumnFilter === "poNumber" && filterDropdownPosition && (
                        <div
                          className="fixed w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] max-h-80 overflow-hidden flex flex-col filter-dropdown-container"
                          style={{
                            top: `${filterDropdownPosition.top}px`,
                            left: `${filterDropdownPosition.left}px`,
                          }}
                        >
                        <div className="p-2 border-b border-gray-200">
                          <input
                            type="text"
                            placeholder="Search..."
                            value={filterSearch}
                            onChange={(e) => {
                              e.stopPropagation();
                              setFilterSearch(e.target.value);
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="px-2 py-1 border-b border-gray-200">
                          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={areAllVisibleValuesSelected("poNumber")}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSelectAllFilter("poNumber");
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-semibold text-gray-900">
                              Select All
                            </span>
                          </label>
                        </div>
                        <div className="overflow-y-auto max-h-64 p-2">
                          {getUniqueColumnValues("poNumber")
                            .filter(
                              (value) =>
                                filterSearch === "" ||
                                value.toLowerCase().includes(filterSearch.toLowerCase())
                            )
                            .map((value) => (
                              <label
                                key={value}
                                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={columnFilters.poNumber.includes(value)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleColumnFilter("poNumber", value);
                                  }}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 truncate">
                                  {value || "(Blank)"}
                                </span>
                              </label>
                            ))}
                        </div>
                        <div className="p-2 border-t border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearColumnFilter("poNumber");
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Clear Filter
                          </button>
                        </div>
                      </div>
                    )}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">
                    <div className="flex items-center justify-between filter-dropdown-container">
                      <div className="flex items-center space-x-1">
                        <span>PO Date</span>
                        {columnFilters.poDate.length > 0 && (
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full">
                            {columnFilters.poDate.length}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleToggleFilterDropdown("poDate", e)}
                        className="ml-2 hover:bg-gray-200 rounded p-1"
                      >
                        <ChevronDown
                          size={16}
                          className={activeColumnFilter === "poDate" ? "rotate-180" : ""}
                        />
                      </button>
                    </div>
                    {activeColumnFilter === "poDate" && filterDropdownPosition && (
                        <div
                          className="fixed w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] max-h-80 overflow-hidden flex flex-col filter-dropdown-container"
                          style={{
                            top: `${filterDropdownPosition.top}px`,
                            left: `${filterDropdownPosition.left}px`,
                          }}
                        >
                        <div className="p-2 border-b border-gray-200">
                          <input
                            type="text"
                            placeholder="Search..."
                            value={filterSearch}
                            onChange={(e) => {
                              e.stopPropagation();
                              setFilterSearch(e.target.value);
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="px-2 py-1 border-b border-gray-200">
                          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={areAllVisibleValuesSelected("poDate")}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSelectAllFilter("poDate");
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-semibold text-gray-900">
                              Select All
                            </span>
                          </label>
                        </div>
                        <div className="overflow-y-auto max-h-64 p-2">
                          {getUniqueColumnValues("poDate")
                            .filter(
                              (value) =>
                                filterSearch === "" ||
                                value.toLowerCase().includes(filterSearch.toLowerCase())
                            )
                            .map((value) => (
                              <label
                                key={value}
                                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={columnFilters.poDate.includes(value)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleColumnFilter("poDate", value);
                                  }}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 truncate">
                                  {value || "(Blank)"}
                                </span>
                              </label>
                            ))}
                        </div>
                        <div className="p-2 border-t border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearColumnFilter("poDate");
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Clear Filter
                          </button>
                        </div>
                      </div>
                    )}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">
                    <div className="flex items-center justify-between filter-dropdown-container">
                      <div className="flex items-center space-x-1">
                        <span className="font-bold">Delivery Date</span>
                        {columnFilters.deliveryDate.length > 0 && (
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full">
                            {columnFilters.deliveryDate.length}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleToggleFilterDropdown("deliveryDate", e)}
                        className="ml-2 hover:bg-gray-200 rounded p-1"
                      >
                        <ChevronDown
                          size={16}
                          className={activeColumnFilter === "deliveryDate" ? "rotate-180" : ""}
                        />
                      </button>
                    </div>
                    {activeColumnFilter === "deliveryDate" && filterDropdownPosition && (
                        <div
                          className="fixed w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] max-h-80 overflow-hidden flex flex-col filter-dropdown-container"
                          style={{
                            top: `${filterDropdownPosition.top}px`,
                            left: `${filterDropdownPosition.left}px`,
                          }}
                        >
                        <div className="p-2 border-b border-gray-200">
                          <input
                            type="text"
                            placeholder="Search..."
                            value={filterSearch}
                            onChange={(e) => {
                              e.stopPropagation();
                              setFilterSearch(e.target.value);
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="px-2 py-1 border-b border-gray-200">
                          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={areAllVisibleValuesSelected("deliveryDate")}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSelectAllFilter("deliveryDate");
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-semibold text-gray-900">
                              Select All
                            </span>
                          </label>
                        </div>
                        <div className="overflow-y-auto max-h-64 p-2">
                          {getUniqueColumnValues("deliveryDate")
                            .filter(
                              (value) =>
                                filterSearch === "" ||
                                value.toLowerCase().includes(filterSearch.toLowerCase())
                            )
                            .map((value) => (
                              <label
                                key={value}
                                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={columnFilters.deliveryDate.includes(value)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleColumnFilter("deliveryDate", value);
                                  }}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 truncate">
                                  {value || "(Blank)"}
                                </span>
                              </label>
                            ))}
                        </div>
                        <div className="p-2 border-t border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearColumnFilter("deliveryDate");
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Clear Filter
                          </button>
                        </div>
                      </div>
                    )}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">
                    <div className="flex items-center justify-between filter-dropdown-container">
                      <div className="flex items-center space-x-1">
                        <span className="font-bold">Qty</span>
                        {columnFilters.totalPOQuantity.length > 0 && (
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full">
                            {columnFilters.totalPOQuantity.length}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleToggleFilterDropdown("totalPOQuantity", e)}
                        className="ml-2 hover:bg-gray-200 rounded p-1"
                      >
                        <ChevronDown
                          size={16}
                          className={activeColumnFilter === "totalPOQuantity" ? "rotate-180" : ""}
                        />
                      </button>
                    </div>
                    {activeColumnFilter === "totalPOQuantity" && filterDropdownPosition && (
                        <div
                          className="fixed w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] max-h-80 overflow-hidden flex flex-col filter-dropdown-container"
                          style={{
                            top: `${filterDropdownPosition.top}px`,
                            left: `${filterDropdownPosition.left}px`,
                          }}
                        >
                        <div className="p-2 border-b border-gray-200">
                          <input
                            type="text"
                            placeholder="Search..."
                            value={filterSearch}
                            onChange={(e) => {
                              e.stopPropagation();
                              setFilterSearch(e.target.value);
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="px-2 py-1 border-b border-gray-200">
                          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={areAllVisibleValuesSelected("totalPOQuantity")}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSelectAllFilter("totalPOQuantity");
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-semibold text-gray-900">
                              Select All
                            </span>
                          </label>
                        </div>
                        <div className="overflow-y-auto max-h-64 p-2">
                          {getUniqueColumnValues("totalPOQuantity")
                            .filter(
                              (value) =>
                                filterSearch === "" ||
                                value.toLowerCase().includes(filterSearch.toLowerCase())
                            )
                            .map((value) => (
                              <label
                                key={value}
                                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={columnFilters.totalPOQuantity.includes(value)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleColumnFilter("totalPOQuantity", value);
                                  }}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 truncate">
                                  {value || "(Blank)"}
                                </span>
                              </label>
                            ))}
                        </div>
                        <div className="p-2 border-t border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearColumnFilter("totalPOQuantity");
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Clear Filter
                          </button>
                        </div>
                      </div>
                    )}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">
                    <div className="flex items-center justify-between filter-dropdown-container">
                      <div className="flex items-center space-x-1">
                        <span>Board Size</span>
                        {columnFilters.boardSize.length > 0 && (
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full">
                            {columnFilters.boardSize.length}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleToggleFilterDropdown("boardSize", e)}
                        className="ml-2 hover:bg-gray-200 rounded p-1"
                      >
                        <ChevronDown
                          size={16}
                          className={activeColumnFilter === "boardSize" ? "rotate-180" : ""}
                        />
                      </button>
                    </div>
                    {activeColumnFilter === "boardSize" && filterDropdownPosition && (
                        <div
                          className="fixed w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] max-h-80 overflow-hidden flex flex-col filter-dropdown-container"
                          style={{
                            top: `${filterDropdownPosition.top}px`,
                            left: `${filterDropdownPosition.left}px`,
                          }}
                        >
                        <div className="p-2 border-b border-gray-200">
                          <input
                            type="text"
                            placeholder="Search..."
                            value={filterSearch}
                            onChange={(e) => {
                              e.stopPropagation();
                              setFilterSearch(e.target.value);
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="px-2 py-1 border-b border-gray-200">
                          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={areAllVisibleValuesSelected("boardSize")}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSelectAllFilter("boardSize");
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-semibold text-gray-900">Select All</span>
                          </label>
                        </div>
                        <div className="overflow-y-auto max-h-64 p-2">
                          {getUniqueColumnValues("boardSize")
                            .filter((value) => filterSearch === "" || value.toLowerCase().includes(filterSearch.toLowerCase()))
                            .map((value) => (
                              <label
                                key={value}
                                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={columnFilters.boardSize.includes(value)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleColumnFilter("boardSize", value);
                                  }}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 truncate">{value || "(Blank)"}</span>
                              </label>
                            ))}
                        </div>
                        <div className="p-2 border-t border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearColumnFilter("boardSize");
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Clear Filter
                          </button>
                        </div>
                      </div>
                    )}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">
                    <div className="flex items-center justify-between filter-dropdown-container">
                      <div className="flex items-center space-x-1">
                        <span>Die Code</span>
                        {columnFilters.dieCode.length > 0 && (
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full">
                            {columnFilters.dieCode.length}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleToggleFilterDropdown("dieCode", e)}
                        className="ml-2 hover:bg-gray-200 rounded p-1"
                      >
                        <ChevronDown
                          size={16}
                          className={activeColumnFilter === "dieCode" ? "rotate-180" : ""}
                        />
                      </button>
                    </div>
                    {activeColumnFilter === "dieCode" && filterDropdownPosition && (
                        <div
                          className="fixed w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] max-h-80 overflow-hidden flex flex-col filter-dropdown-container"
                          style={{
                            top: `${filterDropdownPosition.top}px`,
                            left: `${filterDropdownPosition.left}px`,
                          }}
                        >
                        <div className="p-2 border-b border-gray-200">
                          <input
                            type="text"
                            placeholder="Search..."
                            value={filterSearch}
                            onChange={(e) => {
                              e.stopPropagation();
                              setFilterSearch(e.target.value);
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="px-2 py-1 border-b border-gray-200">
                          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={areAllVisibleValuesSelected("dieCode")}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSelectAllFilter("dieCode");
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-semibold text-gray-900">Select All</span>
                          </label>
                        </div>
                        <div className="overflow-y-auto max-h-64 p-2">
                          {getUniqueColumnValues("dieCode")
                            .filter((value) => filterSearch === "" || value.toLowerCase().includes(filterSearch.toLowerCase()))
                            .map((value) => (
                              <label
                                key={value}
                                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={columnFilters.dieCode.includes(value)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleColumnFilter("dieCode", value);
                                  }}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 truncate">{value || "(Blank)"}</span>
                              </label>
                            ))}
                        </div>
                        <div className="p-2 border-t border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearColumnFilter("dieCode");
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Clear Filter
                          </button>
                        </div>
                      </div>
                    )}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">
                    <div className="flex items-center justify-between filter-dropdown-container">
                      <div className="flex items-center space-x-1">
                        <span>Status</span>
                        {columnFilters.status.length > 0 && (
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full">
                            {columnFilters.status.length}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleToggleFilterDropdown("status", e)}
                        className="ml-2 hover:bg-gray-200 rounded p-1"
                      >
                        <ChevronDown
                          size={16}
                          className={activeColumnFilter === "status" ? "rotate-180" : ""}
                        />
                      </button>
                    </div>
                    {activeColumnFilter === "status" && filterDropdownPosition && (
                        <div
                          className="fixed w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] max-h-80 overflow-hidden flex flex-col filter-dropdown-container"
                          style={{
                            top: `${filterDropdownPosition.top}px`,
                            left: `${filterDropdownPosition.left}px`,
                          }}
                        >
                        <div className="p-2 border-b border-gray-200">
                          <input
                            type="text"
                            placeholder="Search..."
                            value={filterSearch}
                            onChange={(e) => {
                              e.stopPropagation();
                              setFilterSearch(e.target.value);
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="px-2 py-1 border-b border-gray-200">
                          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={areAllVisibleValuesSelected("status")}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSelectAllFilter("status");
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-semibold text-gray-900">Select All</span>
                          </label>
                        </div>
                        <div className="overflow-y-auto max-h-64 p-2">
                          {getUniqueColumnValues("status")
                            .filter((value) => filterSearch === "" || value.toLowerCase().includes(filterSearch.toLowerCase()))
                            .map((value) => (
                              <label
                                key={value}
                                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={columnFilters.status.includes(value)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleColumnFilter("status", value);
                                  }}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 truncate">{value || "(Blank)"}</span>
                              </label>
                            ))}
                        </div>
                        <div className="p-2 border-t border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearColumnFilter("status");
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Clear Filter
                          </button>
                        </div>
                      </div>
                    )}
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
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePOClick(po);
                            }}
                            className="text-blue-600 hover:text-blue-900 text-sm"
                          >
                            View
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPOToDelete(po);
                            }}
                            className="text-red-600 hover:text-red-900 transition-colors p-1 hover:bg-red-50 rounded"
                            title="Delete PO"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
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
            selectedPOs.length > 0 ? getSelectedPOObjects() : filteredPOs
          }
          onSave={handleBulkJobPlanning}
          onClose={() => {
            setShowBulkPlanningModal(false);
            setSelectedPOs([]);
          }}
          onRefresh={fetchPurchaseOrders}
        />
      )}

      {/* Delete Confirmation Modal */}
      {poToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Deletion
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete PO{" "}
              <strong>{poToDelete.poNumber || poToDelete.style}</strong>? This
              action cannot be undone.
              {(poToDelete.hasJobPlan === true ||
                poToDelete.jobPlanId ||
                poToDelete.jobPlanningId) && (
                <span className="block mt-2 text-red-600 font-medium">
                  Warning: This PO has job planning and cannot be deleted.
                </span>
              )}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setPOToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSinglePODelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlannerDashboard;
