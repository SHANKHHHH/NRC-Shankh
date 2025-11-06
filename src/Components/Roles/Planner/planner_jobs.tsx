// src/Components/Roles/Planner/planner_jobs.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Upload,
  X,
  Settings,
  Download,
  ChevronDown,
} from "lucide-react";
import POdetailCard from "./jobCard/POdetailCard";
import PODetailModal from "./jobCard/PODetailModal";
import { supabase } from "../../../lib/supabaseClient";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { BulkJobPlanningModal } from "./modal/BulkJobPlanning";
import { Grid, List } from "lucide-react";

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
  // Extended fields from job data
  boxDimensions: string | null;
  processColors?: string;
  noOfColor?: string | null;
  jobBoardSize: string | null;
  // Job planning fields
  steps?: any[];
  jobSteps?: any[];
  hasJobPlan?: boolean;
  jobDemand?: string;
  machineId?: string | null;
  jobPlanId?: number;
  jobPlanningId?: string | null;
  jobPlanCreatedAt?: string;
  jobPlanUpdatedAt?: string;
}

interface Job {
  id: number;
  nrcJobNo: string;
  styleItemSKU: string;
  customerName: string;
  fluteType: string | null;
  status: "ACTIVE" | "INACTIVE";
  latestRate: number | null;
  preRate: number | null;
  length: number | null;
  width: number | null;
  hasJobPlan: boolean;
  height: number | null;
  boxDimensions: string;
  diePunchCode: number | null;
  boardCategory: string | null;
  noOfColor: string | null;
  processColors: string | null;
  specialColor1: string | null;
  specialColor2: string | null;
  specialColor3: string | null;
  specialColor4: string | null;
  overPrintFinishing: string | null;
  topFaceGSM: string | null;
  flutingGSM: string | null;
  bottomLinerGSM: string | null;
  decalBoardX: string | null;
  lengthBoardY: string | null;
  boardSize: string;
  noUps: string | null;
  artworkReceivedDate: string | null;
  artworkApprovedDate: string | null;
  shadeCardApprovalDate: string | null;
  srNo: number | null;
  jobDemand: "high" | "medium" | "low" | null;
  imageURL: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string | null;
  machineId: string | null;
  poNumber: string | null;
  unit: string | null;
  plant: string | null;
  totalPOQuantity: number | null;
  dispatchQuantity: number | null;
  pendingQuantity: number | null;
  noOfSheets: number | null;
  poDate: string | null;
  deliveryDate: string | null;
  dispatchDate: string | null;
  nrcDeliveryDate: string | null;
  jobSteps: any[] | null;
}

interface ColumnFilters {
  style: string[];
  customer: string[];
  poNumber: string[];
  poDate: string[];
  deliveryDate: string[];
  totalPOQuantity: string[];
  boardSize: string[];
  noOfColor: string[];
  dieCode: string[];
  status: string[];
}

interface FilterState {
  noOfColors: string[];
  boardSizes: string[];
  deliveryDateFrom: string;
  deliveryDateTo: string;
}

const PlannerJobs: React.FC = () => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message] = useState<string | null>(null);

  // State for PO data
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [filteredPOs, setFilteredPOs] = useState<PurchaseOrder[]>([]);

  // State for job search
  const [searchedJob, setSearchedJob] = useState<Job | null>(null);
  const [jobOptions, setJobOptions] = useState<Job[]>([]);
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  // Filter states
  const [filters, setFilters] = useState<FilterState>({
    noOfColors: [],
    boardSizes: [],
    deliveryDateFrom: "",
    deliveryDateTo: "",
  });

  // Column filters state for Excel-like filtering
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
    style: [],
    customer: [],
    poNumber: [],
    poDate: [],
    deliveryDate: [],
    totalPOQuantity: [],
    boardSize: [],
    noOfColor: [],
    dieCode: [],
    status: [],
  });

  // Dropdown visibility state for column filters
  const [activeColumnFilter, setActiveColumnFilter] = useState<string | null>(
    null
  );

  // Search state for filter dropdowns
  const [filterSearch, setFilterSearch] = useState<string>("");

  // Dropdown position state for fixed positioning
  const [filterDropdownPosition, setFilterDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Available filter options (extracted from data) - keeping for legacy compatibility but not used
  const [availableNoOfColors, setAvailableNoOfColors] = useState<string[]>([]);
  const [availableBoardSizes, setAvailableBoardSizes] = useState<string[]>([]);
  const [showBulkPlanningModal, setShowBulkPlanningModal] = useState(false);
  const [selectedPOs, setSelectedPOs] = useState<number[]>([]);

  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkUploadProgress, setBulkUploadProgress] = useState("");
  const [uploadMessage, setUploadMessage] = useState<{
    type: "success" | "error" | null;
    title: string;
    details: string;
  }>({ type: null, title: "", details: "" });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    type: "success" | "error" | "warning" | "info";
  }>({ open: false, message: "", type: "info" });

  // Helper function to show snackbar
  const showSnackbar = (
    message: string,
    type: "success" | "error" | "warning" | "info" = "info"
  ) => {
    setSnackbar({ open: true, message, type });
    setTimeout(
      () => setSnackbar({ open: false, message: "", type: "info" }),
      4000
    );
  };

  // Add this helper function for list view
  const getStatusColor = (status: string) => {
    switch (status) {
      case "artwork_pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "po_pending":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "more_info_pending":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Helper function to check job completion status
  const checkPOCompletionStatus = (
    po: any
  ): "artwork_pending" | "po_pending" | "more_info_pending" | "completed" => {
    // Check if THIS specific PO has job planning (not just any PO with same nrcJobNo)
    const hasJobPlan =
      (po.steps && po.steps.length > 0 && po.jobPlanningId) ||
      (po.jobSteps && po.jobSteps.length > 0 && po.jobPlanningId) ||
      (po.hasJobPlan && po.jobPlanningId);

    if (hasJobPlan) {
      return "completed";
    }

    if (!po.shadeCardApprovalDate) {
      return "artwork_pending";
    }

    if (!po.poNumber || !po.poDate) {
      return "po_pending";
    }

    return "more_info_pending";
  };

  // Enhanced function to merge PO data with job planning AND job details
  const mergePOWithJobPlanningAndJobs = (
    purchaseOrders: any[],
    jobPlannings: any[],
    jobs: any[]
  ) => {
    return purchaseOrders
      .map((po) => {
        // Find matching job planning by purchaseOrderId ONLY (strict PO-specific matching)
        const matchingJobPlan = jobPlannings.find((jp) => {
          const matchesPurchaseOrderId = jp.purchaseOrderId === po.id;

          // ONLY match by purchaseOrderId - no fallback to nrcJobNo
          // This ensures each PO gets its own specific job plan
          return matchesPurchaseOrderId;
        });

        // Find matching job details by nrcJobNo - try multiple matching strategies
        const matchingJob = jobs.find(
          (job) =>
            job.nrcJobNo === po.jobNrcJobNo ||
            job.nrcJobNo === po.nrcJobNo ||
            (job.styleItemSKU === po.style && job.nrcJobNo === po.jobNrcJobNo)
        );

        // Merge all the data
        return {
          ...po,
          // Add job planning fields
          jobDemand: matchingJobPlan?.jobDemand || null,
          machineId:
            matchingJobPlan?.steps?.[0]?.machineDetails?.[0]?.machineId ||
            matchingJobPlan?.steps?.[1]?.machineDetails?.[0]?.machineId ||
            null,
          jobSteps: matchingJobPlan?.steps || [],
          jobPlanId: matchingJobPlan?.jobPlanId || null,
          jobPlanningId: matchingJobPlan?.jobPlanId || null, // Track which PO has job planning
          jobPlanCreatedAt: matchingJobPlan?.createdAt || null,
          jobPlanUpdatedAt: matchingJobPlan?.updatedAt || null,
          hasJobPlan: !!matchingJobPlan,

          // Add job details fields for display and filtering - PRIORITIZE JOB DATA
          boxDimensions: matchingJob?.boxDimensions || po.boxDimensions || null,
          processColors: matchingJob?.processColors || po.processColors || null,
          jobBoardSize: matchingJob?.boardSize || po.boardSize || null,
          // Additional job fields that might be useful - prioritize job data over PO data
          fluteType: matchingJob?.fluteType || po.fluteType,
          noOfColor: matchingJob?.noOfColor || po.noOfColor || null,
          overPrintFinishing:
            matchingJob?.overPrintFinishing || po.overPrintFinishing || null,
          topFaceGSM: matchingJob?.topFaceGSM || po.topFaceGSM || null,
          flutingGSM: matchingJob?.flutingGSM || po.flutingGSM || null,
          bottomLinerGSM:
            matchingJob?.bottomLinerGSM || po.bottomLinerGSM || null,
          // Add more job fields that should be populated - PRIORITIZE JOB DATA
          boardSize: matchingJob?.boardSize || po.boardSize || null,
          diePunchCode: matchingJob?.diePunchCode || po.diePunchCode || null,
          boardCategory: matchingJob?.boardCategory || po.boardCategory || null,
          specialColor1: matchingJob?.specialColor1 || po.specialColor1 || null,
          specialColor2: matchingJob?.specialColor2 || po.specialColor2 || null,
          specialColor3: matchingJob?.specialColor3 || po.specialColor3 || null,
          specialColor4: matchingJob?.specialColor4 || po.specialColor4 || null,
        };
      })
      .map((mergedPO) => {
        return mergedPO;
      });
  };

  // Extract unique values for filter options
  // Extract unique values for filter options (only from POs that need job planning)
  const extractFilterOptions = (purchaseOrders: PurchaseOrder[]) => {
    const colors = new Set<string>();
    const boardSizes = new Set<string>();

    purchaseOrders.forEach((po) => {
      // ADDED: Only extract options from POs that need more information
      const completionStatus = checkPOCompletionStatus(po);
      if (completionStatus !== "more_info_pending") {
        return; // Skip this PO if it doesn't need job planning
      }

      // Extract number of colors from merged job data
      // If no job data exists for the PO, still include "0" as a selectable option
      if (po.noOfColor !== undefined && po.noOfColor !== null) {
        colors.add(String(po.noOfColor));
      } else {
        colors.add("0");
      }

      // Extract board sizes/dimensions - prioritize PO's boardSize over job/box dimensions
      const dimension =
        po.boardSize || po.jobBoardSize || po.boxDimensions || "0x0x0";
      if (dimension) boardSizes.add(dimension);
    });

    setAvailableNoOfColors(
      Array.from(colors).filter(
        (color) => color !== undefined && color !== null
      )
    );
    setAvailableBoardSizes(
      Array.from(boardSizes).filter((size) => size && size.trim())
    );
  };

  // Apply filters to purchase orders
  // Apply filters to purchase orders
  const applyFilters = (pos: PurchaseOrder[]) => {
    return pos.filter((po) => {
      // Apply column filters (Excel-like filtering)
      if (
        columnFilters.style.length > 0 &&
        !columnFilters.style.includes(po.style || "")
      ) {
        return false;
      }
      if (
        columnFilters.customer.length > 0 &&
        !columnFilters.customer.includes(po.customer || "")
      ) {
        return false;
      }
      if (
        columnFilters.poNumber.length > 0 &&
        !columnFilters.poNumber.includes(po.poNumber || "")
      ) {
        return false;
      }
      if (columnFilters.poDate.length > 0) {
        const poDateFormatted = formatDateDisplay(po.poDate);
        if (!columnFilters.poDate.includes(poDateFormatted)) {
          return false;
        }
      }
      if (columnFilters.deliveryDate.length > 0) {
        const poDateFormatted = formatDateDisplay(po.deliveryDate);
        if (!columnFilters.deliveryDate.includes(poDateFormatted)) {
          return false;
        }
      }
      if (columnFilters.totalPOQuantity.length > 0) {
        const poQuantity = po.totalPOQuantity ? String(po.totalPOQuantity) : "";
        if (!columnFilters.totalPOQuantity.includes(poQuantity)) {
          return false;
        }
      }
      if (
        columnFilters.boardSize.length > 0 &&
        !columnFilters.boardSize.includes(po.boardSize || "")
      ) {
        return false;
      }
      if (columnFilters.noOfColor.length > 0) {
        const poNoOfColor = po.noOfColor ? String(po.noOfColor) : "";
        if (!columnFilters.noOfColor.includes(poNoOfColor)) {
          return false;
        }
      }
      if (columnFilters.dieCode.length > 0) {
        const poDieCode = po.dieCode ? String(po.dieCode) : "";
        if (!columnFilters.dieCode.includes(poDieCode)) {
          return false;
        }
      }
      if (columnFilters.status.length > 0) {
        const status = checkPOCompletionStatus(po);
        let statusLabel = "";
        if (status === "artwork_pending") statusLabel = "Artwork Pending";
        else if (status === "po_pending") statusLabel = "PO Pending";
        else if (status === "more_info_pending")
          statusLabel = "More Info Pending";
        else if (status === "completed") statusLabel = "Completed";
        else statusLabel = "Unknown";

        if (!columnFilters.status.includes(statusLabel)) {
          return false;
        }
      }

      // Check if any old filters are active
      const hasActiveFilters =
        filters.noOfColors.length > 0 ||
        filters.boardSizes.length > 0 ||
        filters.deliveryDateFrom ||
        filters.deliveryDateTo;

      // ADDED: If any old filters are applied, only show POs that need more information (job planning)
      if (hasActiveFilters) {
        const completionStatus = checkPOCompletionStatus(po);
        if (completionStatus !== "more_info_pending") {
          return false; // Filter out completed, artwork_pending, and po_pending when filters are active
        }
      }

      // Number of colors filter
      if (filters.noOfColors.length > 0) {
        const poNoOfColor =
          po.noOfColor !== undefined && po.noOfColor !== null
            ? String(po.noOfColor)
            : "0";

        const hasMatchingColor = filters.noOfColors.includes(poNoOfColor);

        if (!hasMatchingColor) return false;
      }

      // Board size/dimensions filter - prioritize PO's boardSize
      if (filters.boardSizes.length > 0) {
        const poBoardSize =
          po.boardSize || po.jobBoardSize || po.boxDimensions || "0x0x0";
        if (
          !poBoardSize ||
          !filters.boardSizes.some((size) =>
            poBoardSize.toLowerCase().includes(size.toLowerCase())
          )
        ) {
          return false;
        }
      }

      // Delivery date filter
      if (filters.deliveryDateFrom || filters.deliveryDateTo) {
        const deliveryDate = po.deliveryDate;
        if (!deliveryDate) return false;

        const poDate = new Date(deliveryDate);

        if (filters.deliveryDateFrom) {
          const fromDate = new Date(filters.deliveryDateFrom);
          if (poDate < fromDate) return false;
        }

        if (filters.deliveryDateTo) {
          const toDate = new Date(filters.deliveryDateTo);
          if (poDate > toDate) return false;
        }
      }

      return true;
    });
  };

  // Handle filter changes - keeping for legacy compatibility but not used
  const handleFilterChange = (filterType: keyof FilterState, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  // Handle color filter toggle - keeping for legacy compatibility but not used
  const toggleNoOfColorFilter = (color: string) => {
    setFilters((prev) => ({
      ...prev,
      noOfColors: prev.noOfColors.includes(color)
        ? prev.noOfColors.filter((c) => c !== color)
        : [...prev.noOfColors, color],
    }));
  };

  // Handle board size filter toggle - keeping for legacy compatibility but not used
  const toggleBoardSizeFilter = (boardSize: string) => {
    setFilters((prev) => ({
      ...prev,
      boardSizes: prev.boardSizes.includes(boardSize)
        ? prev.boardSizes.filter((bs) => bs !== boardSize)
        : [...prev.boardSizes, boardSize],
    }));
  };

  // Clear all filters - keeping for legacy compatibility but not used
  const clearAllFilters = () => {
    setFilters({
      noOfColors: [],
      boardSizes: [],
      deliveryDateFrom: "",
      deliveryDateTo: "",
    });
  };

  // Count active filters (old filters + column filters)
  const activeFilterCount =
    filters.noOfColors.length +
    filters.boardSizes.length +
    (filters.deliveryDateFrom ? 1 : 0) +
    (filters.deliveryDateTo ? 1 : 0);

  // Check if any column filters are active
  const hasColumnFilters = Object.values(columnFilters).some(
    (value) => Array.isArray(value) && value.length > 0
  );

  // Format date for display as dd/mm/yyyy
  const formatDateDisplay = (dateString: string | null | undefined): string => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return "N/A";
    }
  };

  // Get unique values for a specific column
  const getUniqueColumnValues = (columnName: keyof ColumnFilters): string[] => {
    const values = new Set<string>();
    purchaseOrders.forEach((po) => {
      let value: string = "";
      switch (columnName) {
        case "style":
          value = po.style || "";
          break;
        case "customer":
          value = po.customer || "";
          break;
        case "poNumber":
          value = po.poNumber || "";
          break;
        case "poDate":
          value = formatDateDisplay(po.poDate);
          break;
        case "deliveryDate":
          value = formatDateDisplay(po.deliveryDate);
          break;
        case "totalPOQuantity":
          value = po.totalPOQuantity ? String(po.totalPOQuantity) : "";
          break;
        case "boardSize":
          value = po.boardSize || "";
          break;
        case "noOfColor":
          value = po.noOfColor ? String(po.noOfColor) : "";
          break;
        case "dieCode":
          value = po.dieCode ? String(po.dieCode) : "";
          break;
        case "status":
          const status = checkPOCompletionStatus(po);
          if (status === "artwork_pending") value = "Artwork Pending";
          else if (status === "po_pending") value = "PO Pending";
          else if (status === "more_info_pending") value = "More Info Pending";
          else if (status === "completed") value = "Completed";
          else value = "Unknown";
          break;
      }
      if (value) values.add(value);
    });
    return Array.from(values).sort();
  };

  // Handle column filter toggle
  const toggleColumnFilter = (
    columnName: keyof ColumnFilters,
    value: string
  ) => {
    setColumnFilters((prev) => {
      const currentValues = prev[columnName];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      return { ...prev, [columnName]: newValues };
    });
  };

  // Clear all filters for a specific column
  const clearColumnFilter = (columnName: keyof ColumnFilters) => {
    setColumnFilters((prev) => ({ ...prev, [columnName]: [] }));
  };

  // Handle select all for a specific column with search filter
  const handleSelectAllFilter = (columnName: keyof ColumnFilters) => {
    const filteredValues = getUniqueColumnValues(columnName).filter(
      (value) =>
        filterSearch === "" ||
        value.toLowerCase().includes(filterSearch.toLowerCase())
    );
    const currentValues = columnFilters[columnName];

    if (filteredValues.every((value) => currentValues.includes(value))) {
      // All visible selected, deselect all visible
      setColumnFilters({
        ...columnFilters,
        [columnName]: currentValues.filter((v) => !filteredValues.includes(v)),
      });
    } else {
      // Not all visible selected, select all visible
      setColumnFilters({
        ...columnFilters,
        [columnName]: [...new Set([...currentValues, ...filteredValues])],
      });
    }
  };

  // Check if all visible values are selected
  const areAllVisibleValuesSelected = (
    columnName: keyof ColumnFilters
  ): boolean => {
    const filteredValues = getUniqueColumnValues(columnName).filter(
      (value) =>
        filterSearch === "" ||
        value.toLowerCase().includes(filterSearch.toLowerCase())
    );
    return (
      filteredValues.length > 0 &&
      filteredValues.every((value) => columnFilters[columnName].includes(value))
    );
  };

  // Handle opening filter dropdown with positioning
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

  // Function to check if a PO has a job creation notification
  const hasJobCreationNotification = (po: PurchaseOrder): boolean => {
    try {
      // Check both possible localStorage keys
      const jobCreationNotifications = JSON.parse(
        localStorage.getItem("jobCreationNotifications") || "[]"
      );
      const activityLogNotifications = JSON.parse(
        localStorage.getItem("activityLogNotifications") || "[]"
      );

      // Combine both notification arrays
      const allNotifications = [
        ...jobCreationNotifications,
        ...activityLogNotifications,
      ];

      const hasNotification = allNotifications.some((notification: any) => {
        const matches =
          notification.style === po.style && notification.status === "pending";
        return matches;
      });

      return hasNotification;
    } catch (error) {
      console.error("Error checking job creation notifications:", error);
      return false;
    }
  };

  // Clear selected POs when search or filters change
  useEffect(() => {
    setSelectedPOs([]);
  }, [searchTerm, filters]);

  // Handle PO selection
  const handlePOSelection = (poId: number) => {
    setSelectedPOs((prev) =>
      prev.includes(poId) ? prev.filter((id) => id !== poId) : [...prev, poId]
    );
  };

  // Handle select all/none
  const handleSelectAll = () => {
    if (selectedPOs.length === filteredPOs.length) {
      setSelectedPOs([]);
    } else {
      setSelectedPOs(filteredPOs.map((po) => po.id));
    }
  };

  // Get selected PO objects
  const getSelectedPOObjects = () => {
    return filteredPOs.filter((po) => selectedPOs.includes(po.id));
  };

  // Apply filters whenever filters change or purchase orders change
  useEffect(() => {
    let basePOs = purchaseOrders;

    // If there's a searched job, filter by PO number first
    if (searchedJob) {
      basePOs = purchaseOrders.filter(
        (po) => po.poNumber === searchedJob.poNumber
      );
    }

    // Apply additional filters
    const filtered = applyFilters(basePOs);
    setFilteredPOs(filtered);
  }, [filters, columnFilters, purchaseOrders, searchedJob]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".filter-dropdown-container")) {
        setActiveColumnFilter(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".search-dropdown-container")) {
        setJobOptions([]); // Clear job options to close dropdown
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const handleBulkJobPlanning = async (jobPlanningData: any) => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) throw new Error("Authentication token not found.");

      // 🔥 FIXED: Now receives individual job planning data (same as single job planning)
      // Just forward it to the API
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
        const errorData = await response.json();
        throw new Error(
          `Failed to create job plan for ${jobPlanningData.nrcJobNo}: ${
            errorData.message || response.statusText
          }`
        );
      }

      const result = await response.json();

      // 🔥 FIXED: Update machine statuses to busy (extract from machineDetails)
      const allMachines: any[] = [];
      jobPlanningData.steps?.forEach((step: any) => {
        if (step.machineDetails && Array.isArray(step.machineDetails)) {
          step.machineDetails.forEach((md: any) => {
            if (md.id) {
              allMachines.push(md);
            }
          });
        }
      });

      // Update machine statuses
      if (allMachines.length > 0) {
        const machineUpdatePromises = allMachines.map(async (machine: any) => {
          try {
            const response = await fetch(
              `https://nrprod.nrcontainers.com/api/machines/${machine.id}/status`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ status: "busy" }),
              }
            );

            if (!response.ok) {
              console.warn(`Failed to update machine ${machine.id} status`);
            }
          } catch (error) {
            console.warn(`Error updating machine ${machine.id} status:`, error);
          }
        });

        await Promise.all(machineUpdatePromises);
      }

      // Note: Modal close and refresh are handled by BulkJobPlanningModal after all POs are processed
    } catch (err) {
      console.error("Job planning error:", err);
      throw err; // Re-throw to let BulkJobPlanningModal handle the error
    }
  };

  // Enhanced function to fetch all three APIs and merge data
  const fetchPurchaseOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        setError("Authentication token not found. Please log in.");
        setLoading(false);
        return;
      }

      // Fetch all three APIs simultaneously
      const [poResponse, jobPlanResponse, jobsResponse] = await Promise.all([
        fetch("https://nrprod.nrcontainers.com/api/purchase-orders", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }),
        fetch("https://nrprod.nrcontainers.com/api/job-planning/", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }),
        fetch("https://nrprod.nrcontainers.com/api/jobs", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      ]);

      // Check responses
      if (!poResponse.ok) {
        const errorData = await poResponse.json();
        throw new Error(
          errorData.message ||
            `Failed to fetch purchase orders: ${poResponse.status}`
        );
      }

      if (!jobPlanResponse.ok) {
        console.warn(
          "Job planning fetch failed, continuing without job planning data"
        );
      }

      if (!jobsResponse.ok) {
        console.warn("Jobs fetch failed, continuing without job details");
      }

      // Parse responses
      const poData = await poResponse.json();
      const jobPlanData = jobPlanResponse.ok
        ? await jobPlanResponse.json()
        : { success: true, data: [] };
      const jobsData = jobsResponse.ok
        ? await jobsResponse.json()
        : { success: true, data: [] };

      if (poData.success && Array.isArray(poData.data)) {
        // Merge all three data sources
        const mergedData = mergePOWithJobPlanningAndJobs(
          poData.data,
          jobPlanData.data || [],
          jobsData.data || []
        );

        setPurchaseOrders(mergedData);
        setFilteredPOs(mergedData);

        // Extract filter options from merged data
        extractFilterOptions(mergedData);
      } else {
        setError("Unexpected API response format or data is not an array.");
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
      console.error("Fetch Purchase Orders Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // If empty, clear search results and show all POs
    if (!value.trim()) {
      setJobOptions([]);
      setSearchedJob(null);
      setFilteredPOs(purchaseOrders); // Reset to all POs
      return;
    }

    // Filter POs locally by PO number, job number, style, or customer
    const filtered = purchaseOrders.filter((po) => {
      const searchLower = value.toLowerCase();

      // Search in PO number
      const poNumberMatch = po.poNumber?.toLowerCase().includes(searchLower);

      // Search in Job number (both from job object and direct field)
      const jobNumberMatch =
        po.job?.nrcJobNo?.toLowerCase().includes(searchLower) ||
        po.jobNrcJobNo?.toLowerCase().includes(searchLower);

      // Search in Style (both from PO and job)
      const styleMatch =
        po.style?.toLowerCase().includes(searchLower) ||
        po.job?.styleItemSKU?.toLowerCase().includes(searchLower);

      // Search in Customer name (both from PO and job)
      const customerMatch =
        po.customer?.toLowerCase().includes(searchLower) ||
        po.job?.customerName?.toLowerCase().includes(searchLower);

      return poNumberMatch || jobNumberMatch || styleMatch || customerMatch;
    });

    setFilteredPOs(filtered);

    // Create PO options for dropdown based on filtered results
    const timeout = setTimeout(() => {
      if (value.trim()) {
        // Create unique PO options for dropdown
        const poOptions = filtered.map((po) => ({
          id: po.id,
          poNumber: po.poNumber,
          style: po.style || po.job?.styleItemSKU,
          customer: po.customer || po.job?.customerName,
          nrcJobNo: po.jobNrcJobNo || po.job?.nrcJobNo,
        }));
        setJobOptions(poOptions as any); // Cast to match existing interface
      } else {
        setJobOptions([]);
        setSearchedJob(null);
      }
    }, 300);

    setTypingTimeout(timeout);
  };

  // Handle PO card click
  const handlePOClick = (po: PurchaseOrder) => {
    setSelectedPO(po);
    // Modal will be opened by setting selectedPO
  };

  // Handle Add PO button click
  const handleAddPO = () => {
    navigate("/dashboard/planner/initiate-job/new");
  };

  // Handle bulk download of PO data
  const handleBulkDownload = async () => {
    try {
      setLoading(true);

      // Fetch all PO data from the database
      const { data: poData, error } = await supabase
        .from("PurchaseOrder")
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch PO data: ${error.message}`);
      }

      if (!poData || poData.length === 0) {
        alert("No PO data found to download.");
        return;
      }

      // Prepare data for Excel export in the specified order
      const excelData = poData.map((po) => ({
        "Sr #": po.srNo || "",
        Style: po.style || "",
        Unit: po.unit || "",
        "Flute Type": po.fluteType || "",
        "Shade Card Approval Date": formatDateDisplay(po.shadeCardApprovalDate),
        "Pending Validity": po.pendingValidity || 0,
        "PO.NUMBER": po.poNumber || "",
        Plant: po.plant || "",
        "PO Date": formatDateDisplay(po.poDate),
        "Jockey Month": po.jockeyMonth || "",
        "Delivery Date": formatDateDisplay(po.deliveryDate),
        "Total PO Quantity": po.totalPOQuantity || 0,
        "Dispatch Quantity": po.dispatchQuantity || 0,
        "Dispatch Date": formatDateDisplay(po.dispatchDate),
        "Pending Quantity": po.pendingQuantity || 0,
        Customer: po.customer || "",
        "NO.of ups": po.noOfUps || 0,
        "No. Of Sheets": po.noOfSheets || 0,
        "Board Size": po.boardSize || "",
        "Die Code": po.dieCode || "",
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Set column widths for better visibility
      const columnWidths = [
        { wch: 8 }, // Sr #
        { wch: 20 }, // Style
        { wch: 8 }, // Unit
        { wch: 15 }, // Flute Type
        { wch: 20 }, // Shade Card Approval Date
        { wch: 15 }, // Pending Validity
        { wch: 12 }, // PO.NUMBER
        { wch: 12 }, // Plant
        { wch: 12 }, // PO Date
        { wch: 12 }, // Jockey Month
        { wch: 12 }, // Delivery Date
        { wch: 15 }, // Total PO Quantity
        { wch: 15 }, // Dispatch Quantity
        { wch: 12 }, // Dispatch Date
        { wch: 15 }, // Pending Quantity
        { wch: 25 }, // Customer
        { wch: 10 }, // NO.of ups
        { wch: 12 }, // No. Of Sheets
        { wch: 15 }, // Board Size
        { wch: 10 }, // Die Code
      ];

      worksheet["!cols"] = columnWidths;

      // Style the header row with yellow background and bold text
      const headerColumns = [
        "A1",
        "B1",
        "C1",
        "D1",
        "E1",
        "F1",
        "G1",
        "H1",
        "I1",
        "J1",
        "K1",
        "L1",
        "M1",
        "N1",
        "O1",
        "P1",
        "Q1",
        "R1",
        "S1",
        "T1",
      ];

      headerColumns.forEach((cell) => {
        if (worksheet[cell]) {
          worksheet[cell].s = {
            fill: {
              fgColor: { rgb: "FFFF00" }, // Yellow background
            },
            font: {
              bold: true, // Bold text
              sz: 11, // Font size
            },
            alignment: {
              horizontal: "center",
              vertical: "center",
            },
          };
        }
      });

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Orders");

      // Generate filename with current date
      const currentDate = new Date().toISOString().split("T")[0];
      const filename = `Purchase_Orders_${currentDate}.xlsx`;

      // Download the file
      XLSX.writeFile(workbook, filename);

      alert(`Successfully downloaded ${poData.length} PO records!`);
    } catch (err) {
      console.error("Download failed:", err);
      alert(
        `Download failed: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPurchaseOrders();
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  // Sync notifications with current POs when POs are loaded
  useEffect(() => {
    syncNotificationsWithCurrentPOs();
  }, [purchaseOrders]);

  // Completely sync notifications with current PO state
  const syncNotificationsWithCurrentPOs = () => {
    try {
      // Get all current POs that don't have a job
      const posWithoutJobs = purchaseOrders.filter(
        (po) => !po.jobNrcJobNo && !po.job?.nrcJobNo && po.style && po.customer
      );

      // If there are no POs without jobs, clear all pending notifications
      if (posWithoutJobs.length === 0) {
        localStorage.setItem("jobCreationNotifications", JSON.stringify([]));
        return;
      }

      // Get all current styles from POs (to validate notifications)
      const currentPOStyles = new Set(
        purchaseOrders.map((po) => po.style).filter(Boolean)
      );

      // Get existing notifications
      const existingNotifications = JSON.parse(
        localStorage.getItem("jobCreationNotifications") || "[]"
      );

      // Filter out notifications for styles that no longer exist in current POs
      const validNotifications = existingNotifications.filter((notif: any) => {
        const styleExistsInCurrentPOs = currentPOStyles.has(notif.style);
        const poStillNeedsJob = posWithoutJobs.some(
          (po) => po.style === notif.style
        );
        return (
          notif.status === "pending" &&
          styleExistsInCurrentPOs &&
          poStillNeedsJob
        );
      });

      // Get existing notification styles
      const existingStyles = new Set(
        validNotifications.map((notif: any) => notif.style)
      );

      // Create notifications for new POs without jobs
      const newNotifications = posWithoutJobs
        .filter((po) => !existingStyles.has(po.style))
        .map((po) => ({
          id: `job-creation-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          style: po.style || "N/A",
          customer: po.customer || "N/A",
          createdAt: new Date().toISOString(),
          status: "pending",
          // Include full PO details
          poNumber: po.poNumber || "N/A",
          poDate: po.poDate || null,
          deliveryDate: po.deliveryDate || null,
          totalPOQuantity: po.totalPOQuantity || null,
          unit: po.unit || "N/A",
          plant: po.plant || "N/A",
          boardSize: po.boardSize || po.jobBoardSize || "N/A",
          noOfColor: po.noOfColor || "N/A",
          fluteType: po.fluteType || "N/A",
        }));

      // Combine valid existing notifications with new ones
      const finalNotifications = [...validNotifications, ...newNotifications];

      // Update localStorage
      localStorage.setItem(
        "jobCreationNotifications",
        JSON.stringify(finalNotifications)
      );
    } catch (error) {
      console.error("Error syncing notifications with POs:", error);
    }
  };

  // Debug function to manually check notifications
  const debugNotifications = () => {
    const notifications = JSON.parse(
      localStorage.getItem("jobCreationNotifications") || "[]"
    );
    return notifications;
  };

  // Make debug function available globally for testing
  (window as any).debugNotifications = debugNotifications;

  const parseDate = (value: any) => {
    if (!value) return null;

    // Handle the DD-MMM-YY or DD/MMM/YY format (e.g., "8-Nov-25", "14-Oct-25", "25/Sep/25")
    const ddmmyyPattern = /^(\d{1,2})[/-]([A-Za-z]{3})[/-](\d{2})$/;
    const match = String(value).match(ddmmyyPattern);

    if (match) {
      const [, day, month, year] = match;

      // Convert 2-digit year to 4-digit year (assuming 20xx for years 00-99)
      const fullYear =
        parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);

      // Month name to number mapping
      const monthMap: { [key: string]: number } = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
      };

      const monthNum = monthMap[month];
      if (monthNum !== undefined) {
        const d = new Date(fullYear, monthNum, parseInt(day));

        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          const result = `${year}-${month}-${day}`;
          return result;
        }
      }
    }

    // Check if it's an Excel date serial number (e.g., 45000)
    if (typeof value === "number" && value > 25569) {
      // Excel epoch starts at 1900-01-01
      const excelEpoch = new Date(1900, 0, 1); // January 1, 1900
      const d = new Date(
        excelEpoch.getTime() + (value - 2) * 24 * 60 * 60 * 1000
      );

      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const result = `${year}-${month}-${day}`;

        return result;
      }
    }

    // Fallback to standard date parsing for other formats

    const d = new Date(value);
    if (isNaN(d.getTime())) {
      return null;
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const result = `${year}-${month}-${day}`;

    return result;
  };

  const handleBulkUpload = async () => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".csv,.xls,.xlsx";
      input.click();

      input.onchange = async (event: any) => {
        setIsBulkUploading(true);
        setBulkUploadProgress("Reading file...");
        const file = event.target.files?.[0];
        if (!file) return;

        let parsedData: any[] = [];

        if (file.name.endsWith(".csv")) {
          parsedData = await new Promise((resolve, reject) => {
            Papa.parse(file, {
              header: true,
              skipEmptyLines: true,
              complete: (results) => resolve(results.data),
              error: (err) => reject(err),
            });
          });
        }

        if (file.name.endsWith(".xls") || file.name.endsWith(".xlsx")) {
          setBulkUploadProgress(
            `Reading Excel file (${(file.size / 1024 / 1024).toFixed(2)} MB)...`
          );

          // Read file asynchronously
          const data = await file.arrayBuffer();

          // Yield control to allow UI update
          await new Promise((resolve) => setTimeout(resolve, 10));
          setBulkUploadProgress("Parsing Excel file...");

          // Aggressively optimize XLSX reading options for maximum performance
          const workbook = XLSX.read(data, {
            type: "array",
            cellDates: false, // Disable date parsing (we parse manually in parseDate)
            cellNF: false, // Disable number format parsing
            cellStyles: false, // Disable style parsing
            cellFormula: false, // Disable formula parsing (huge performance gain)
            cellHTML: false, // Disable HTML cell parsing
            bookSheets: false, // Don't load all sheet data upfront
            sheetStubs: false, // Don't create stub cells
            sheetRows: 0, // Read all rows
            dense: false, // Use sparse mode (faster for large files)
          });

          setBulkUploadProgress("Converting to JSON...");

          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          // Optimize sheet_to_json conversion - use raw:true for better performance
          // We'll handle date parsing in parseDate() function anyway
          parsedData = XLSX.utils.sheet_to_json(worksheet, {
            raw: true, // Use raw values (faster) - dates will be numbers/dates
            defval: null, // Default value for empty cells
            blankrows: false, // Skip blank rows (significant performance gain)
            range: undefined, // Process entire sheet
          });

          setBulkUploadProgress(`Loaded ${parsedData.length} rows from Excel`);
        }

        // Normalize headers by trimming spaces and standardizing column names
        // Process in batches to keep UI responsive
        const BATCH_SIZE = 50; // Process 50 rows at a time
        const normalizedData: any[] = [];

        const normalizeRow = (row: any) => {
          const normalizedRow: any = {};
          Object.keys(row).forEach((key) => {
            const trimmedKey = key.trim();
            // Additional normalization for common variations
            let normalizedKey = trimmedKey;

            // Handle common variations in column names
            if (trimmedKey.toLowerCase().includes("delivery date")) {
              normalizedKey = "Delivery Date";
            } else if (trimmedKey.toLowerCase().includes("po date")) {
              normalizedKey = "PO Date";
            } else if (trimmedKey.toLowerCase().includes("dispatch date")) {
              normalizedKey = "Dispatch Date";
            } else if (trimmedKey.toLowerCase().includes("shade card")) {
              normalizedKey = "Shade Card Approval Date";
            } else if (trimmedKey.toLowerCase().includes("total po quantity")) {
              normalizedKey = "Total PO Quantity";
            } else if (trimmedKey.toLowerCase().includes("dispatch quantity")) {
              normalizedKey = "Dispatch Quantity";
            } else if (trimmedKey.toLowerCase().includes("pending quantity")) {
              normalizedKey = "Pending Quantity";
            } else if (trimmedKey.toLowerCase().includes("no. of sheets")) {
              normalizedKey = "No. Of Sheets";
            } else if (trimmedKey.toLowerCase().includes("board size")) {
              normalizedKey = "Board Size";
            } else if (trimmedKey.toLowerCase().includes("die code")) {
              normalizedKey = "Die Code";
            } else if (trimmedKey.toLowerCase().includes("jockey month")) {
              normalizedKey = "Jockey Month";
            } else if (trimmedKey.toLowerCase().includes("pending validity")) {
              normalizedKey = "Pending Validity";
            } else if (trimmedKey.toLowerCase().includes("no.of ups")) {
              normalizedKey = "NO.of ups";
            } else if (trimmedKey.toLowerCase().includes("flute type")) {
              normalizedKey = "Flute Type";
            } else if (trimmedKey.toLowerCase().includes("customer")) {
              normalizedKey = "Customer";
            }

            normalizedRow[normalizedKey] = row[key];
          });
          return normalizedRow;
        };

        // Process normalization in batches
        for (let i = 0; i < parsedData.length; i += BATCH_SIZE) {
          const batch = parsedData.slice(i, i + BATCH_SIZE);
          normalizedData.push(...batch.map(normalizeRow));

          // Update progress and yield control to browser
          setBulkUploadProgress(
            `Normalizing data... ${Math.min(
              i + BATCH_SIZE,
              parsedData.length
            )}/${parsedData.length} rows`
          );
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        parsedData = normalizedData;

        // Debug: Log available headers to see what we're working with
        if (parsedData.length > 0) {
          console.log(
            "🔍 Available headers in Excel file:",
            Object.keys(parsedData[0])
          );
        }

        if (parsedData.length === 0) {
          setIsBulkUploading(false);
          setBulkUploadProgress("");
          showSnackbar("No records found in file!", "error");
          return;
        }

        setBulkUploadProgress(`Processing ${parsedData.length} records...`);

        const { data: maxIdData, error: maxIdError } = await supabase
          .from("PurchaseOrder")
          .select("id")
          .order("id", { ascending: false })
          .limit(1);

        if (maxIdError) {
          console.error("Error fetching last id:", maxIdError);
          setIsBulkUploading(false);
          setBulkUploadProgress("");
          showSnackbar("Failed to fetch last ID from database.", "error");
          return;
        }

        let nextId = maxIdData?.[0]?.id ? maxIdData[0].id + 1 : 1;

        setBulkUploadProgress("Fetching job data...");

        // Fetch all jobs from API to match styleItemSKU with style
        const accessToken = localStorage.getItem("accessToken");

        if (!accessToken) {
          setIsBulkUploading(false);
          setBulkUploadProgress("");
          showSnackbar(
            "Authentication token not found. Please log in.",
            "error"
          );
          return;
        }

        const jobsResponse = await fetch(
          "https://nrprod.nrcontainers.com/api/jobs",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!jobsResponse.ok) {
          console.error("Error fetching jobs from API:", jobsResponse.status);
          setIsBulkUploading(false);
          setBulkUploadProgress("");
          showSnackbar("Failed to fetch job data for matching.", "error");
          return;
        }

        const jobsApiData = await jobsResponse.json();
        const jobsData = jobsApiData.success ? jobsApiData.data : [];

        // Debug: Log raw API response for PKBB-1302-0105-N4
        // console.log("🔍 Raw API response for jobs:", jobsApiData);
        if (jobsData && Array.isArray(jobsData)) {
          const pkbbJobs = jobsData.filter(
            (job: any) =>
              job.styleItemSKU && job.styleItemSKU.includes("PKBB-1302-0105")
          );
          // console.log("🔍 Jobs containing PKBB-1302-0105:", pkbbJobs);
        }

        // Create a map for quick lookup: styleItemSKU -> nrcJobNo
        // Use case-insensitive and trimmed keys for better matching
        const jobMap = new Map();
        const jobMapDebug: { [key: string]: string } = {};

        // NEW: Create a map for full job details: styleItemSKU -> full job object
        const jobDetailsMap = new Map();

        if (jobsData && Array.isArray(jobsData)) {
          jobsData.forEach((job: any) => {
            if (job.styleItemSKU && job.nrcJobNo) {
              const normalizedStyle = job.styleItemSKU.trim().toUpperCase();
              jobMap.set(normalizedStyle, job.nrcJobNo);
              jobMapDebug[normalizedStyle] = job.nrcJobNo;
              // Store full job object for auto-population
              jobDetailsMap.set(normalizedStyle, job);
            }
          });
        }

        // console.log(
        //   "Job mapping created from API:",
        //   jobMapDebug,
        //   `(${jobMap.size} jobs)`
        // );

        // Debug: Log all available job styles for comparison
        // console.log(
        //   "🔍 All available job styles from API:",
        //   Array.from(jobMap.keys())
        // );

        // First pass: check if ALL styles can be matched (batched for performance)
        const unmatchedStyles: string[] = [];
        const styleMatchResults: {
          row: number;
          style: string;
          matched: boolean;
          jobNo: string | null;
        }[] = [];

        // Process style matching in batches
        for (let i = 0; i < parsedData.length; i += BATCH_SIZE) {
          const batch = parsedData.slice(i, i + BATCH_SIZE);

          batch.forEach((row: any, batchIdx: number) => {
            const idx = i + batchIdx;
            // Don't skip rows based on missing Customer - we'll handle it later with placeholder

            const styleValue = row["Style"];
            if (!styleValue) {
              unmatchedStyles.push(`Row ${idx + 1}: [EMPTY STYLE]`);
              styleMatchResults.push({
                row: idx + 1,
                style: "[EMPTY]",
                matched: false,
                jobNo: null,
              });
              return;
            }

            const normalizedStyle = styleValue.trim().toUpperCase();
            const matchedJobNo = jobMap.get(normalizedStyle);

            if (!matchedJobNo) {
              unmatchedStyles.push(`Row ${idx + 1}: "${styleValue}"`);
              styleMatchResults.push({
                row: idx + 1,
                style: styleValue,
                matched: false,
                jobNo: null,
              });
            } else {
              styleMatchResults.push({
                row: idx + 1,
                style: styleValue,
                matched: true,
                jobNo: matchedJobNo,
              });
            }
          });

          // Update progress and yield control
          setBulkUploadProgress(
            `Matching styles... ${Math.min(
              i + BATCH_SIZE,
              parsedData.length
            )}/${parsedData.length} rows`
          );
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        // Log all matching results for debugging
        // console.log("Style matching results:", styleMatchResults);

        // Collect unmatched styles for notification
        const unmatchedItems: Array<{ style: string; customer: string }> = [];

        // Proceed with formatting - include ALL rows (matched and unmatched)
        // Process in batches to keep UI responsive
        const formattedData: any[] = [];

        const formatRow = (row: any, idx: number) => {
          // Check for minimum required field: PO Number (the unique identifier)
          const styleValue = row["Style"];
          const poNumber = row["PO.NUMBER"];

          // PO Number is the only truly required field
          if (!poNumber) {
            console.warn(
              `Row ${
                idx + 1
              }: Skipping - PO Number is required to identify the purchase order`
            );
            return null;
          }

          // If no Style provided, use placeholder for tracking
          const isStyleMissing = !styleValue;
          const styleForProcessing = styleValue || "STYLE NOT PROVIDED";

          if (isStyleMissing) {
            console.warn(
              `Row ${
                idx + 1
              }: Style is missing - using placeholder. This PO will need manual completion.`
            );
          }

          const normalizedStyle = styleForProcessing.trim().toUpperCase();
          const matchedJobNo = jobMap.get(normalizedStyle);
          const matchedJobDetails = jobDetailsMap.get(normalizedStyle);

          // Get customer from Excel or job - use placeholder if not available
          const customerFromExcel = row["Customer"]?.trim() || null;
          const customerFromJob =
            matchedJobDetails?.customerName?.trim() || null;
          const customer =
            customerFromExcel || customerFromJob || "CUSTOMER NOT PROVIDED";

          // Track if customer is missing for notification
          const isCustomerMissing = !customerFromExcel && !customerFromJob;

          if (isCustomerMissing) {
            console.warn(
              `Row ${
                idx + 1
              }: Customer not found in Excel or matched job for style "${styleForProcessing}" - using placeholder. Will be added to notifications.`
            );
          }

          // Track unmatched styles OR missing customer OR missing style for notification
          if (!matchedJobNo || isCustomerMissing || isStyleMissing) {
            unmatchedItems.push({
              style: styleForProcessing,
              customer: customer,
            });

            if (!matchedJobNo && isCustomerMissing && isStyleMissing) {
              console.warn(
                `Row ${
                  idx + 1
                }: No matching job, customer missing, AND style missing - will be added to database and notification created`
              );
            } else if (!matchedJobNo && isCustomerMissing) {
              console.warn(
                `Row ${
                  idx + 1
                }: style "${styleForProcessing}" has no matching job AND customer is missing - will be added to database and notification created`
              );
            } else if (!matchedJobNo && isStyleMissing) {
              console.warn(
                `Row ${
                  idx + 1
                }: Style is missing AND no matching job - will be added to database and notification created`
              );
            } else if (isCustomerMissing && isStyleMissing) {
              console.warn(
                `Row ${
                  idx + 1
                }: Both customer and style are missing - will be added to database and notification created`
              );
            } else if (!matchedJobNo) {
              console.warn(
                `Row ${
                  idx + 1
                }: style "${styleForProcessing}" has no matching job - will be added to database and notification created`
              );
            } else if (isCustomerMissing) {
              console.warn(
                `Row ${
                  idx + 1
                }: style "${styleForProcessing}" has matching job but customer is missing - will be added to database and notification created`
              );
            } else if (isStyleMissing) {
              console.warn(
                `Row ${
                  idx + 1
                }: Style is missing but other data is present - will be added to database and notification created`
              );
            }
          } else {
            console.log(
              `Row ${
                idx + 1
              }: style="${styleForProcessing}" (normalized: "${normalizedStyle}") -> jobNo="${matchedJobNo}"`
            );
          }

          // Create base PO object from Excel data
          const basePOData = {
            // DON'T assign id here - we'll assign it after filtering duplicates
            // Map Excel columns to database fields according to the specified order
            srNo: row["Sr #"] ? parseInt(row["Sr #"]) : null,
            style: styleForProcessing, // Use the style with placeholder if missing
            unit: row["Unit"] || null,
            fluteType: row["Flute Type"] || null,
            shadeCardApprovalDate: row["Shade Card Approval Date"]
              ? parseDate(row["Shade Card Approval Date"])
              : null,
            pendingValidity: row["Pending Validity"]
              ? parseInt(row["Pending Validity"])
              : null,
            poNumber: row["PO.NUMBER"] || null,
            plant: row["Plant"] || null,
            poDate: row["PO Date"] ? parseDate(row["PO Date"]) : null,
            jockeyMonth: row["Jockey Month"] || null,
            deliveryDate: row["Delivery Date"]
              ? parseDate(row["Delivery Date"])
              : null,
            totalPOQuantity: row["Total PO Quantity"]
              ? parseInt(row["Total PO Quantity"])
              : null,
            dispatchQuantity: row["Dispatch Quantity"]
              ? parseInt(row["Dispatch Quantity"])
              : null,
            dispatchDate: row["Dispatch Date"]
              ? parseDate(row["Dispatch Date"])
              : null,
            pendingQuantity: row["Pending Quantity"]
              ? parseInt(row["Pending Quantity"])
              : null,
            customer: customer, // Use the validated customer value (from Excel or job)
            noOfUps: row["NO.of ups"] ? parseInt(row["NO.of ups"]) : null,
            noOfSheets: row["No. Of Sheets"]
              ? parseInt(row["No. Of Sheets"])
              : null,
            boardSize: row["Board Size"] || null,
            dieCode: row["Die Code"] ? parseInt(row["Die Code"]) : null,
            // Additional fields with defaults
            nrcDeliveryDate: null,
            sharedCardDiffDate: null,
            status: "created",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            jobNrcJobNo: matchedJobNo || null, // Allow null for unmatched styles
            userId: null,
          };

          // NEW: Auto-fill missing fields from job details if matched
          if (matchedJobDetails && matchedJobNo) {
            // Fill in ALL fields from job if Excel value is null/undefined/empty string
            // Note: customer is already set from the validation above, so we ensure it's not overwritten with null
            const enrichedPOData = {
              ...basePOData,
              // Basic fields
              boardSize:
                basePOData.boardSize ||
                matchedJobDetails.boardSize ||
                matchedJobDetails.boardCategory ||
                null,
              dieCode:
                basePOData.dieCode || matchedJobDetails.diePunchCode || null,
              fluteType:
                basePOData.fluteType || matchedJobDetails.fluteType || null,
              unit: basePOData.unit || matchedJobDetails.unit || null,
              customer:
                basePOData.customer ||
                matchedJobDetails.customerName ||
                customer, // Ensure customer is never null
              plant: basePOData.plant || matchedJobDetails.unit || null,
              // Shade card fields
              shadeCardApprovalDate:
                basePOData.shadeCardApprovalDate ||
                (matchedJobDetails.shadeCardApprovalDate
                  ? parseDate(matchedJobDetails.shadeCardApprovalDate)
                  : null) ||
                null,
              sharedCardDiffDate:
                basePOData.sharedCardDiffDate ||
                matchedJobDetails.sharedCardDiffDate ||
                null,
              // No of Ups and Sheets from job
              noOfUps: basePOData.noOfUps || matchedJobDetails.noUps || null,
              noOfSheets:
                basePOData.noOfSheets || matchedJobDetails.noOfSheets || null,
            };

            console.log(`Row ${idx + 1}: Auto-filled PO data from job:`, {
              style: styleForProcessing,
              baseData: {
                boardSize: basePOData.boardSize,
                dieCode: basePOData.dieCode,
                fluteType: basePOData.fluteType,
                shadeCardApprovalDate: basePOData.shadeCardApprovalDate,
                sharedCardDiffDate: basePOData.sharedCardDiffDate,
                noOfUps: basePOData.noOfUps,
                noOfSheets: basePOData.noOfSheets,
                plant: basePOData.plant,
                unit: basePOData.unit,
              },
              jobData: {
                boardSize: matchedJobDetails.boardSize,
                dieCode: matchedJobDetails.diePunchCode,
                fluteType: matchedJobDetails.fluteType,
                shadeCardApprovalDate: matchedJobDetails.shadeCardApprovalDate,
                sharedCardDiffDate: matchedJobDetails.sharedCardDiffDate,
                noUps: matchedJobDetails.noUps,
                noOfSheets: matchedJobDetails.noOfSheets,
                unit: matchedJobDetails.unit,
              },
              enrichedData: {
                boardSize: enrichedPOData.boardSize,
                dieCode: enrichedPOData.dieCode,
                fluteType: enrichedPOData.fluteType,
                shadeCardApprovalDate: enrichedPOData.shadeCardApprovalDate,
                sharedCardDiffDate: enrichedPOData.sharedCardDiffDate,
                noOfUps: enrichedPOData.noOfUps,
                noOfSheets: enrichedPOData.noOfSheets,
                plant: enrichedPOData.plant,
                unit: enrichedPOData.unit,
              },
            });

            return enrichedPOData;
          }

          return basePOData;
        };

        // Process formatting in batches
        for (let i = 0; i < parsedData.length; i += BATCH_SIZE) {
          const batch = parsedData.slice(i, i + BATCH_SIZE);

          batch.forEach((row: any, batchIdx: number) => {
            const idx = i + batchIdx;
            const formattedRow = formatRow(row, idx);
            if (formattedRow !== null) {
              // Ensure customer has at least a placeholder value
              if (
                !formattedRow.customer ||
                formattedRow.customer.trim() === ""
              ) {
                console.warn(
                  `Row ${
                    idx + 1
                  }: Customer is null or empty after formatting - applying default placeholder`
                );
                formattedRow.customer = "CUSTOMER NOT PROVIDED";
              }
              formattedData.push(formattedRow);
            }
          });

          // Update progress and yield control
          setBulkUploadProgress(
            `Formatting data... ${Math.min(
              i + BATCH_SIZE,
              parsedData.length
            )}/${parsedData.length} rows`
          );
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        if (formattedData.length === 0) {
          setIsBulkUploading(false);
          setBulkUploadProgress("");
          showSnackbar(
            "No valid rows found! Please ensure the Excel file has at least PO Number field.",
            "warning"
          );
          return;
        }

        // console.log(
        //   `✅ ${formattedData.length} POs prepared for upload (${unmatchedItems.length} need job creation). Checking for duplicates...`
        // );

        setBulkUploadProgress(
          `Checking for duplicates in ${formattedData.length} records...`
        );

        // ONLY TYPE ANNOTATION CHANGE HERE - Rest of logic EXACTLY the same
        interface DuplicateCheckResult {
          isDuplicate: boolean;
          po: any;
          existingPO?: any;
        }

        // Check for duplicates before uploading - batched for performance
        const duplicateCheckResults: DuplicateCheckResult[] = [];
        const DUPLICATE_CHECK_BATCH_SIZE = 20; // Smaller batch for DB queries

        for (
          let i = 0;
          i < formattedData.length;
          i += DUPLICATE_CHECK_BATCH_SIZE
        ) {
          const batch = formattedData.slice(i, i + DUPLICATE_CHECK_BATCH_SIZE);

          const batchPromises = batch.map(async (po) => {
            const { data: existingPOs, error: checkError } = await supabase
              .from("PurchaseOrder")
              .select(
                "id, poNumber, style, poDate, deliveryDate, totalPOQuantity"
              )
              .eq("poNumber", po.poNumber)
              .eq("style", po.style)
              .eq("poDate", po.poDate)
              .eq("deliveryDate", po.deliveryDate)
              .eq("totalPOQuantity", po.totalPOQuantity);

            if (checkError) {
              console.error("Error checking for duplicates:", checkError);
              return { isDuplicate: false, po };
            }

            return {
              isDuplicate: existingPOs && existingPOs.length > 0,
              po,
              existingPO: existingPOs?.[0],
            };
          });

          const batchResults = await Promise.all(batchPromises);
          duplicateCheckResults.push(...batchResults);

          // Update progress and yield control
          setBulkUploadProgress(
            `Checking duplicates... ${Math.min(
              i + DUPLICATE_CHECK_BATCH_SIZE,
              formattedData.length
            )}/${formattedData.length} records`
          );
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        // Separate duplicates from new records
        const duplicates = duplicateCheckResults.filter(
          (result) => result.isDuplicate
        );
        const newRecords = duplicateCheckResults
          .filter((result) => !result.isDuplicate)
          .map((result) => result.po);

        // NOW assign IDs only to non-duplicate records that will actually be uploaded
        const newRecordsWithIds = newRecords.map((po, idx) => ({
          ...po,
          id: nextId + idx,
        }));

        // console.log(
        //   `🔍 Duplicate check results: ${duplicates.length} duplicates found, ${newRecords.length} new records to upload`
        // );

        // Log duplicate details
        if (duplicates.length > 0) {
          console.log(
            "📋 Duplicate records found:",
            duplicates.map((d) => ({
              poNumber: d.po.poNumber,
              style: d.po.style,
              poDate: d.po.poDate,
              deliveryDate: d.po.deliveryDate,
              totalPOQuantity: d.po.totalPOQuantity,
              existingId: d.existingPO?.id,
            }))
          );
        }

        if (newRecords.length === 0) {
          setIsBulkUploading(false);
          setBulkUploadProgress("");
          showSnackbar(
            `All ${formattedData.length} records are duplicates and have been skipped. No new records uploaded.`,
            "info"
          );
          return;
        }

        setBulkUploadProgress(
          `Uploading ${newRecordsWithIds.length} new records...`
        );

        // Debug: Log sample data to check date parsing
        // console.log(
        //   "🔍 Sample new records with dates:",
        //   newRecordsWithIds.slice(0, 2).map((po) => ({
        //     id: po.id,
        //     poNumber: po.poNumber,
        //     poDate: po.poDate,
        //     deliveryDate: po.deliveryDate,
        //     dispatchDate: po.dispatchDate,
        //     shadeCardApprovalDate: po.shadeCardApprovalDate,
        //   }))
        // );

        const { error } = await supabase
          .from("PurchaseOrder")
          .insert(newRecordsWithIds);

        if (error) {
          console.error("Bulk upload failed:", error);
          setIsBulkUploading(false);
          setBulkUploadProgress("");
          showSnackbar("Upload failed. Check console for details.", "error");
        } else {
          setBulkUploadProgress("Upload successful! Reloading data...");

          // Notifications will be created automatically by syncNotificationsWithCurrentPOs()
          // when the POs are loaded and displayed

          // Show success message with details
          let successMessage = `✅ Successfully uploaded ${newRecordsWithIds.length} new POs!`;

          if (duplicates.length > 0) {
            successMessage += `\n\n📋 ${duplicates.length} duplicate record(s) were skipped:\n`;
            duplicates.slice(0, 5).forEach((dup) => {
              successMessage += `• PO: ${dup.po.poNumber} | Style: ${dup.po.style} | Qty: ${dup.po.totalPOQuantity}\n`;
            });
            if (duplicates.length > 5) {
              successMessage += `\n... and ${
                duplicates.length - 5
              } more duplicates`;
            }
            successMessage += `\n\nDuplicates are determined by matching: PO Number, Style, PO Date, Delivery Date, and Quantity.`;
          }

          if (unmatchedItems.length > 0) {
            successMessage += `\n\n⚠️ ${unmatchedItems.length} PO(s) need attention:\n\n`;
            unmatchedItems.forEach((item, idx) => {
              if (idx < 5) {
                // Show first 5
                const customerNote =
                  item.customer === "CUSTOMER NOT PROVIDED"
                    ? `Customer: [MISSING - NEEDS UPDATE]`
                    : `Customer: ${item.customer}`;
                successMessage += `• Style: ${item.style} | ${customerNote}\n`;
              }
            });
            if (unmatchedItems.length > 5) {
              successMessage += `\n... and ${unmatchedItems.length - 5} more`;
            }
            successMessage += `\n\nNotifications have been created. Please:\n`;
            successMessage += `- Create jobs for styles without matching jobs\n`;
            successMessage += `- Update customer information for incomplete POs`;
          }

          // Reload POs to sync with database and trigger notification sync
          await fetchPurchaseOrders();

          setIsBulkUploading(false);
          setBulkUploadProgress("");

          // Show success message in modal
          setUploadMessage({
            type: "success",
            title: `Successfully uploaded ${newRecordsWithIds.length} new POs!`,
            details: successMessage.replace(
              `✅ Successfully uploaded ${newRecordsWithIds.length} new POs!`,
              ""
            ),
          });
        }
      };
    } catch (err) {
      console.error("Bulk upload error:", err);
      setIsBulkUploading(false);
      setBulkUploadProgress("");
      showSnackbar(
        "Something went wrong during bulk upload. Please try again.",
        "error"
      );
    }
  };

  const handleNavigateToJobForm = (po: PurchaseOrder, formType: string) => {
    const jobId = po.jobNrcJobNo || po.job?.nrcJobNo;

    if (!jobId) {
      console.error("No job ID found in PO:", po);
      alert("Cannot navigate: Job ID not found");
      return;
    }

    navigate("/dashboard/planner/initiate-job/new", {
      state: {
        searchJobId: jobId,
        targetStep: formType,
      },
    });
  };

  // console.log("filtered pos", filteredPOs);
  // console.log("searched job", searchedJob);

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      {/* Header with Add PO Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
          Purchase Orders
        </h1>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={handleAddPO}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <Plus size={18} className="sm:w-5 sm:h-5" />
            <span>Add Purchase Order</span>
          </button>

          <button
            onClick={handleBulkUpload}
            className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <Upload size={18} className="sm:w-5 sm:h-5" />
            <span>Bulk PO Upload</span>
          </button>

          <button
            onClick={handleBulkDownload}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <Download size={18} className="sm:w-5 sm:h-5" />
            <span>{loading ? "Downloading..." : "Download PO Data"}</span>
          </button>
        </div>
      </div>

      {/* Search Bar and Filters */}
      <div className="mb-8 space-y-4">
        {/* Search Bar and Filter Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Search Bar */}
          <div className="relative max-w-md w-full search-dropdown-container">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by PO Number, Job Number, Style, or Customer..."
              className="w-full pl-10 pr-10 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
            />
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setJobOptions([]);
                  setSearchedJob(null);
                  setFilteredPOs(purchaseOrders);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            )}

            {/* PO Search Dropdown */}
            {searchTerm && jobOptions.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto search-dropdown-container">
                {jobOptions.map((po) => (
                  <li
                    key={po.id}
                    onClick={() => {
                      setSearchTerm(po.poNumber || "");
                      setJobOptions([]);
                      // Filter POs by the selected PO number - use exact match
                      const filtered = purchaseOrders.filter(
                        (p) => p.poNumber === po.poNumber
                      );
                      // console.log("🔍 Dropdown Click Debug:", {
                      //   clickedPO: po,
                      //   filteredPOs: filtered,
                      //   filteredCount: filtered.length,
                      //   purchaseOrdersCount: purchaseOrders.length,
                      // });
                      setFilteredPOs(filtered);
                      // Set the full PO object as searchedJob, not the simplified dropdown object
                      if (filtered.length > 0) {
                        setSearchedJob(filtered[0] as any);
                        // console.log("✅ Set searchedJob to:", filtered[0]);
                      } else {
                        setSearchedJob(null);
                        // console.log(
                        //   "❌ No matching PO found, set searchedJob to null"
                        // );
                      }
                    }}
                    className="px-3 py-2 cursor-pointer hover:bg-blue-100 text-sm border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900">
                          {po.poNumber}
                        </div>
                        <div className="text-xs text-gray-500">
                          {(po as any).style} • {(po as any).customer}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 ml-2">
                        {po.nrcJobNo}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* View Toggle Buttons */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-4 py-2 sm:py-3 flex items-center space-x-2 text-sm sm:text-base font-medium transition-colors ${
                viewMode === "grid"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Grid size={18} />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-4 py-2 sm:py-3 flex items-center space-x-2 text-sm sm:text-base font-medium transition-colors border-l border-gray-300 ${
                viewMode === "list"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <List size={18} />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>

        {/* Old filter panel removed - using column filters instead */}
      </div>

      {/* Results count */}
      {!loading && !error && (
        <div className="mb-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {activeFilterCount > 0 ? (
              <>
                Showing {filteredPOs.length} POs needing job planning
                {activeFilterCount > 0 &&
                  ` (${activeFilterCount} filters applied)`}
                {(searchTerm ||
                  filters.noOfColors.length > 0 ||
                  filters.boardSizes.length > 0 ||
                  filters.deliveryDateFrom ||
                  filters.deliveryDateTo) &&
                  selectedPOs.length > 0 && (
                    <span className="ml-2 text-green-600 font-medium">
                      • {selectedPOs.length} selected
                    </span>
                  )}
              </>
            ) : (
              <>
                Showing {filteredPOs.length} of {purchaseOrders.length} purchase
                orders (all statuses)
                {(searchTerm ||
                  filters.noOfColors.length > 0 ||
                  filters.boardSizes.length > 0 ||
                  filters.deliveryDateFrom ||
                  filters.deliveryDateTo) &&
                  selectedPOs.length > 0 && (
                    <span className="ml-2 text-green-600 font-medium">
                      • {selectedPOs.length} selected
                    </span>
                  )}
              </>
            )}
          </div>

          {/* Bulk Job Planning Button - Show if there are filtered POs with filters OR multiple POs from search */}
          {(() => {
            // Filter out completed POs for bulk planning
            const pendingPOs = filteredPOs.filter(
              (po) => checkPOCompletionStatus(po) !== "completed"
            );
            const shouldShowBulkButton =
              filteredPOs.length > 0 &&
              (hasColumnFilters ||
                activeFilterCount > 0 ||
                (searchedJob && pendingPOs.length > 1));

            return (
              <>
                {shouldShowBulkButton && (
                  <button
                    onClick={() => setShowBulkPlanningModal(true)}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 text-sm"
                  >
                    <Settings size={16} />
                    <span>Bulk Job Planning ({pendingPOs.length})</span>
                  </button>
                )}
                {/* Bulk Job Planning Button for Selected POs */}
                {(hasColumnFilters ||
                  searchTerm ||
                  filters.noOfColors.length > 0 ||
                  filters.boardSizes.length > 0 ||
                  filters.deliveryDateFrom ||
                  filters.deliveryDateTo) &&
                  selectedPOs.length > 0 && (
                    <button
                      onClick={() => setShowBulkPlanningModal(true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 text-sm"
                    >
                      <Settings size={16} />
                      <span>Bulk Planning ({selectedPOs.length} selected)</span>
                    </button>
                  )}
              </>
            );
          })()}
        </div>
      )}

      {showBulkPlanningModal && (
        <BulkJobPlanningModal
          filteredPOs={
            (hasColumnFilters ||
              searchTerm ||
              filters.noOfColors.length > 0 ||
              filters.boardSizes.length > 0 ||
              filters.deliveryDateFrom ||
              filters.deliveryDateTo) &&
            selectedPOs.length > 0
              ? getSelectedPOObjects().filter(
                  (po) => checkPOCompletionStatus(po) !== "completed"
                )
              : filteredPOs.filter(
                  (po) => checkPOCompletionStatus(po) !== "completed"
                )
          }
          onSave={handleBulkJobPlanning}
          onClose={() => {
            setShowBulkPlanningModal(false);
            setSelectedPOs([]);
          }}
          onRefresh={fetchPurchaseOrders}
        />
      )}

      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-t-4 border-b-4 border-blue-500"></div>
          <p className="ml-4 text-base sm:text-lg text-gray-600">
            Loading purchase orders...
          </p>
        </div>
      )}

      {error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded relative mb-6 text-sm sm:text-base"
          role="alert"
        >
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {message && (
        <div
          className={`px-3 sm:px-4 py-2 sm:py-3 rounded relative mb-6 text-sm sm:text-base ${
            message.includes("Error")
              ? "bg-red-100 border border-red-400 text-red-700"
              : "bg-green-100 border border-green-400 text-green-700"
          }`}
          role="alert"
        >
          <span className="block sm:inline">{message}</span>
        </div>
      )}

      {!loading && !error && (
        <>
          {filteredPOs.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <p className="text-gray-500 text-base sm:text-lg">
                {searchedJob || activeFilterCount > 0
                  ? "No purchase orders found matching the current search and filters."
                  : "No purchase orders found."}
              </p>
            </div>
          ) : (
            <>
              {/* Grid View */}
              {viewMode === "grid" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
                  {filteredPOs.map((po) => {
                    let completionStatus:
                      | "artwork_pending"
                      | "po_pending"
                      | "more_info_pending"
                      | "completed" = "po_pending";
                    completionStatus = checkPOCompletionStatus(po);

                    return (
                      <POdetailCard
                        key={po.id}
                        po={po}
                        onClick={handlePOClick}
                        jobCompletionStatus={completionStatus}
                        hasJobCreationNotification={hasJobCreationNotification(
                          po
                        )}
                      />
                    );
                  })}
                </div>
              )}

              {/* List View */}
              {viewMode === "list" && (
                <div
                  className={`bg-white shadow-sm border border-gray-200 rounded-lg ${
                    activeColumnFilter ? "overflow-visible" : "overflow-hidden"
                  }`}
                >
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {filteredPOs.length > 0 && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <input
                                type="checkbox"
                                checked={
                                  selectedPOs.length === filteredPOs.length &&
                                  filteredPOs.length > 0
                                }
                                onChange={handleSelectAll}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </th>
                          )}
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">
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
                                onClick={(e) =>
                                  handleToggleFilterDropdown("style", e)
                                }
                                className="ml-2 hover:bg-gray-200 rounded p-1"
                              >
                                <ChevronDown
                                  size={16}
                                  className={
                                    activeColumnFilter === "style"
                                      ? "rotate-180"
                                      : ""
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
                                        checked={areAllVisibleValuesSelected(
                                          "style"
                                        )}
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
                                            .includes(
                                              filterSearch.toLowerCase()
                                            )
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
                                              toggleColumnFilter(
                                                "style",
                                                value
                                              );
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
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">
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
                                onClick={(e) =>
                                  handleToggleFilterDropdown("customer", e)
                                }
                                className="ml-2 hover:bg-gray-200 rounded p-1"
                              >
                                <ChevronDown
                                  size={16}
                                  className={
                                    activeColumnFilter === "customer"
                                      ? "rotate-180"
                                      : ""
                                  }
                                />
                              </button>
                            </div>
                            {activeColumnFilter === "customer" &&
                              filterDropdownPosition && (
                                <div
                                  className="fixed w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] max-h-80 overflow-hidden flex flex-col filter-dropdown-container"
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
                                        checked={areAllVisibleValuesSelected(
                                          "customer"
                                        )}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          handleSelectAllFilter("customer");
                                        }}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                      />
                                      <span className="text-sm font-semibold text-gray-900">
                                        Select All
                                      </span>
                                    </label>
                                  </div>
                                  <div className="overflow-y-auto max-h-64 p-2">
                                    {getUniqueColumnValues("customer")
                                      .filter(
                                        (value) =>
                                          filterSearch === "" ||
                                          value
                                            .toLowerCase()
                                            .includes(
                                              filterSearch.toLowerCase()
                                            )
                                      )
                                      .map((value) => (
                                        <label
                                          key={value}
                                          className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={columnFilters.customer.includes(
                                              value
                                            )}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              toggleColumnFilter(
                                                "customer",
                                                value
                                              );
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
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">
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
                                onClick={(e) =>
                                  handleToggleFilterDropdown("poNumber", e)
                                }
                                className="ml-2 hover:bg-gray-200 rounded p-1"
                              >
                                <ChevronDown
                                  size={16}
                                  className={
                                    activeColumnFilter === "poNumber"
                                      ? "rotate-180"
                                      : ""
                                  }
                                />
                              </button>
                            </div>
                            {activeColumnFilter === "poNumber" &&
                              filterDropdownPosition && (
                                <div
                                  className="fixed w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] max-h-80 overflow-hidden flex flex-col filter-dropdown-container"
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
                                        checked={areAllVisibleValuesSelected(
                                          "poNumber"
                                        )}
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
                                          value
                                            .toLowerCase()
                                            .includes(
                                              filterSearch.toLowerCase()
                                            )
                                      )
                                      .map((value) => (
                                        <label
                                          key={value}
                                          className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={columnFilters.poNumber.includes(
                                              value
                                            )}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              toggleColumnFilter(
                                                "poNumber",
                                                value
                                              );
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
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">
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
                                onClick={(e) =>
                                  handleToggleFilterDropdown("poDate", e)
                                }
                                className="ml-2 hover:bg-gray-200 rounded p-1"
                              >
                                <ChevronDown
                                  size={16}
                                  className={
                                    activeColumnFilter === "poDate"
                                      ? "rotate-180"
                                      : ""
                                  }
                                />
                              </button>
                            </div>
                            {activeColumnFilter === "poDate" &&
                              filterDropdownPosition && (
                                <div
                                  className="fixed w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] max-h-80 overflow-hidden flex flex-col filter-dropdown-container"
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
                                        checked={areAllVisibleValuesSelected(
                                          "poDate"
                                        )}
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
                                          value
                                            .toLowerCase()
                                            .includes(
                                              filterSearch.toLowerCase()
                                            )
                                      )
                                      .map((value) => (
                                        <label
                                          key={value}
                                          className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={columnFilters.poDate.includes(
                                              value
                                            )}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              toggleColumnFilter(
                                                "poDate",
                                                value
                                              );
                                            }}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                          />
                                          <span className="text-sm text-gray-700">
                                            {value}
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
                                      className="w-full px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                                    >
                                      Clear Filter
                                    </button>
                                  </div>
                                </div>
                              )}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider relative">
                            <div className="flex items-center justify-between filter-dropdown-container">
                              <div className="flex items-center space-x-1">
                                <span>Delivery Date</span>
                                {columnFilters.deliveryDate.length > 0 && (
                                  <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full">
                                    {columnFilters.deliveryDate.length}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={(e) =>
                                  handleToggleFilterDropdown("deliveryDate", e)
                                }
                                className="ml-2 hover:bg-gray-200 rounded p-1"
                              >
                                <ChevronDown
                                  size={16}
                                  className={
                                    activeColumnFilter === "deliveryDate"
                                      ? "rotate-180"
                                      : ""
                                  }
                                />
                              </button>
                            </div>
                            {activeColumnFilter === "deliveryDate" &&
                              filterDropdownPosition && (
                                <div
                                  className="fixed w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] max-h-80 overflow-hidden flex flex-col filter-dropdown-container"
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
                                        checked={areAllVisibleValuesSelected(
                                          "deliveryDate"
                                        )}
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
                                          value
                                            .toLowerCase()
                                            .includes(
                                              filterSearch.toLowerCase()
                                            )
                                      )
                                      .map((value) => (
                                        <label
                                          key={value}
                                          className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={columnFilters.deliveryDate.includes(
                                              value
                                            )}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              toggleColumnFilter(
                                                "deliveryDate",
                                                value
                                              );
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
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider relative">
                            <div className="flex items-center justify-between filter-dropdown-container">
                              <div className="flex items-center space-x-1">
                                <span>Quantity</span>
                                {columnFilters.totalPOQuantity.length > 0 && (
                                  <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full">
                                    {columnFilters.totalPOQuantity.length}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={(e) =>
                                  handleToggleFilterDropdown(
                                    "totalPOQuantity",
                                    e
                                  )
                                }
                                className="ml-2 hover:bg-gray-200 rounded p-1"
                              >
                                <ChevronDown
                                  size={16}
                                  className={
                                    activeColumnFilter === "totalPOQuantity"
                                      ? "rotate-180"
                                      : ""
                                  }
                                />
                              </button>
                            </div>
                            {activeColumnFilter === "totalPOQuantity" &&
                              filterDropdownPosition && (
                                <div
                                  className="fixed w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] max-h-80 overflow-hidden flex flex-col filter-dropdown-container"
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
                                        checked={areAllVisibleValuesSelected(
                                          "totalPOQuantity"
                                        )}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          handleSelectAllFilter(
                                            "totalPOQuantity"
                                          );
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
                                          value
                                            .toLowerCase()
                                            .includes(
                                              filterSearch.toLowerCase()
                                            )
                                      )
                                      .map((value) => (
                                        <label
                                          key={value}
                                          className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={columnFilters.totalPOQuantity.includes(
                                              value
                                            )}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              toggleColumnFilter(
                                                "totalPOQuantity",
                                                value
                                              );
                                            }}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                          />
                                          <span className="text-sm text-gray-700">
                                            {value}
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
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">
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
                                onClick={(e) =>
                                  handleToggleFilterDropdown("boardSize", e)
                                }
                                className="ml-2 hover:bg-gray-200 rounded p-1"
                              >
                                <ChevronDown
                                  size={16}
                                  className={
                                    activeColumnFilter === "boardSize"
                                      ? "rotate-180"
                                      : ""
                                  }
                                />
                              </button>
                            </div>
                            {activeColumnFilter === "boardSize" &&
                              filterDropdownPosition && (
                                <div
                                  className="fixed w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] max-h-80 overflow-hidden flex flex-col filter-dropdown-container"
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
                                        checked={areAllVisibleValuesSelected(
                                          "boardSize"
                                        )}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          handleSelectAllFilter("boardSize");
                                        }}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                      />
                                      <span className="text-sm font-semibold text-gray-900">
                                        Select All
                                      </span>
                                    </label>
                                  </div>
                                  <div className="overflow-y-auto max-h-64 p-2">
                                    {getUniqueColumnValues("boardSize")
                                      .filter(
                                        (value) =>
                                          filterSearch === "" ||
                                          value
                                            .toLowerCase()
                                            .includes(
                                              filterSearch.toLowerCase()
                                            )
                                      )
                                      .map((value) => (
                                        <label
                                          key={value}
                                          className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={columnFilters.boardSize.includes(
                                              value
                                            )}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              toggleColumnFilter(
                                                "boardSize",
                                                value
                                              );
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
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">
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
                                onClick={(e) =>
                                  handleToggleFilterDropdown("dieCode", e)
                                }
                                className="ml-2 hover:bg-gray-200 rounded p-1"
                              >
                                <ChevronDown
                                  size={16}
                                  className={
                                    activeColumnFilter === "dieCode"
                                      ? "rotate-180"
                                      : ""
                                  }
                                />
                              </button>
                            </div>
                            {activeColumnFilter === "dieCode" &&
                              filterDropdownPosition && (
                                <div
                                  className="fixed w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] max-h-80 overflow-hidden flex flex-col filter-dropdown-container"
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
                                        checked={areAllVisibleValuesSelected(
                                          "dieCode"
                                        )}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          handleSelectAllFilter("dieCode");
                                        }}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                      />
                                      <span className="text-sm font-semibold text-gray-900">
                                        Select All
                                      </span>
                                    </label>
                                  </div>
                                  <div className="overflow-y-auto max-h-64 p-2">
                                    {getUniqueColumnValues("dieCode")
                                      .filter(
                                        (value) =>
                                          filterSearch === "" ||
                                          value
                                            .toLowerCase()
                                            .includes(
                                              filterSearch.toLowerCase()
                                            )
                                      )
                                      .map((value) => (
                                        <label
                                          key={value}
                                          className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={columnFilters.dieCode.includes(
                                              value
                                            )}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              toggleColumnFilter(
                                                "dieCode",
                                                value
                                              );
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
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">
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
                                onClick={(e) =>
                                  handleToggleFilterDropdown("status", e)
                                }
                                className="ml-2 hover:bg-gray-200 rounded p-1"
                              >
                                <ChevronDown
                                  size={16}
                                  className={
                                    activeColumnFilter === "status"
                                      ? "rotate-180"
                                      : ""
                                  }
                                />
                              </button>
                            </div>
                            {activeColumnFilter === "status" &&
                              filterDropdownPosition && (
                                <div
                                  className="fixed w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] max-h-80 overflow-hidden flex flex-col filter-dropdown-container"
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
                                        checked={areAllVisibleValuesSelected(
                                          "status"
                                        )}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          handleSelectAllFilter("status");
                                        }}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                      />
                                      <span className="text-sm font-semibold text-gray-900">
                                        Select All
                                      </span>
                                    </label>
                                  </div>
                                  <div className="overflow-y-auto max-h-64 p-2">
                                    {getUniqueColumnValues("status")
                                      .filter(
                                        (value) =>
                                          filterSearch === "" ||
                                          value
                                            .toLowerCase()
                                            .includes(
                                              filterSearch.toLowerCase()
                                            )
                                      )
                                      .map((value) => (
                                        <label
                                          key={value}
                                          className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={columnFilters.status.includes(
                                              value
                                            )}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              toggleColumnFilter(
                                                "status",
                                                value
                                              );
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
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredPOs.map((po) => {
                          let completionStatus:
                            | "artwork_pending"
                            | "po_pending"
                            | "more_info_pending"
                            | "completed" = "po_pending";
                          completionStatus = checkPOCompletionStatus(po);

                          const getStatusLabel = (status: string) => {
                            switch (status) {
                              case "artwork_pending":
                                return "Artwork Pending";
                              case "po_pending":
                                return "PO Pending";
                              case "more_info_pending":
                                return "More Info Pending";
                              case "completed":
                                return "Completed";
                              default:
                                return "Unknown";
                            }
                          };

                          return (
                            <tr
                              key={po.id}
                              className="hover:bg-gray-50 cursor-pointer transition-colors"
                              onClick={() => handlePOClick(po)}
                            >
                              <td
                                className="px-6 py-4 whitespace-nowrap"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedPOs.includes(po.id)}
                                  onChange={() => handlePOSelection(po.id)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  <div
                                    className="text-sm text-gray-900 max-w-xs truncate"
                                    title={po.style || undefined}
                                  >
                                    {po.style}
                                  </div>
                                  {hasJobCreationNotification(po) && (
                                    <div
                                      className="relative group"
                                      title="Job needs to be created for this PO"
                                    >
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                        Job needs to be created for this PO
                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div
                                  className="text-sm text-gray-900 max-w-xs truncate"
                                  title={po.customer}
                                >
                                  {po.customer}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {po.poNumber}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Plant: {po.plant}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {formatDateDisplay(po.poDate)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-gray-900">
                                  {formatDateDisplay(po.deliveryDate)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-gray-900">
                                  {po.totalPOQuantity?.toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {po.noOfSheets} sheets
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {po.boardSize}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {po.dieCode || "N/A"}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                                    completionStatus
                                  )}`}
                                >
                                  {getStatusLabel(completionStatus)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePOClick(po);
                                  }}
                                  className="text-blue-600 hover:text-blue-900 transition-colors"
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* PO Detail Modal */}
      {selectedPO && (
        <PODetailModal
          po={selectedPO}
          completionStatus={checkPOCompletionStatus(selectedPO)}
          onClose={() => {
            setSelectedPO(null);
          }}
          onNavigateToForm={(_po, formType) =>
            handleNavigateToJobForm(selectedPO, formType)
          }
          onRefresh={fetchPurchaseOrders}
        />
      )}

      {/* Bulk Upload Loading Modal */}
      {isBulkUploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
              <h3 className="text-lg font-semibold text-gray-900">
                Uploading Purchase Orders
              </h3>
              <p className="text-sm text-gray-600 text-center">
                {bulkUploadProgress || "Please wait..."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Result Modal */}
      {uploadMessage.type && !isBulkUploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              {uploadMessage.type === "success" ? (
                <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              ) : (
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              )}
              <h3 className="ml-3 text-lg font-semibold text-gray-900">
                {uploadMessage.title}
              </h3>
            </div>

            {uploadMessage.details && (
              <div
                className={`p-4 rounded-lg mb-4 text-sm whitespace-pre-line ${
                  uploadMessage.type === "success"
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-800"
                }`}
              >
                {uploadMessage.details}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() =>
                  setUploadMessage({ type: null, title: "", details: "" })
                }
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  uploadMessage.type === "success"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snackbar for small alerts */}
      {snackbar.open && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
          <div
            className={`flex items-center space-x-3 px-6 py-3 rounded-lg shadow-lg ${
              snackbar.type === "success"
                ? "bg-green-600 text-white"
                : snackbar.type === "error"
                ? "bg-red-600 text-white"
                : snackbar.type === "warning"
                ? "bg-yellow-600 text-white"
                : "bg-blue-600 text-white"
            }`}
          >
            {snackbar.type === "success" && (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            {snackbar.type === "error" && (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
            {snackbar.type === "warning" && (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}
            {snackbar.type === "info" && (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            <span className="font-medium">{snackbar.message}</span>
            <button
              onClick={() =>
                setSnackbar({ open: false, message: "", type: "info" })
              }
              className="ml-4 text-white hover:text-gray-200"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlannerJobs;
