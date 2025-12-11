import React, { useState, useEffect } from "react";
import {
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  CogIcon,
  UserGroupIcon,
  TruckIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { productionService } from "./productionService";
import type {
  ProductionData,
  ProductionStep,
  AggregatedProductionData,
  JobPlan,
} from "./productionService";
import LoadingSpinner from "../../common/LoadingSpinner";
import ProductionDetailModal from "./ProductionDetailModal";

const ProductionHeadDashboard: React.FC = () => {
  const [aggregatedData, setAggregatedData] =
    useState<AggregatedProductionData | null>(null);
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [productionData, setProductionData] = useState<ProductionData>({
    corrugation: [],
    fluteLamination: [],
    punching: [],
    flapPasting: [],
  });
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchResults, setSearchResults] = useState<
    Array<{
      nrcJobNo: string;
      jobDemand: string;
      totalSteps: number;
      hasProductionSteps: boolean;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAggregated, setIsLoadingAggregated] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "details" | "analytics"
  >("overview");
  const [error, setError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<{
    isAuthenticated: boolean;
    message: string;
  } | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [selectedJobDetails, setSelectedJobDetails] = useState<JobPlan | null>(
    null
  );
  const [showJobDetailsModal, setShowJobDetailsModal] = useState(false);
  const [modalJobData, setModalJobData] = useState<
    Array<{ jobPlan: JobPlan; step: ProductionStep }>
  >([]);
  const [modalTitle, setModalTitle] = useState("");
  const [isLoadingModalData, setIsLoadingModalData] = useState(false);

  // Check authentication status
  useEffect(() => {
    const checkAuth = () => {
      const status = productionService.checkAuthStatus();
      setAuthStatus(status);

      if (!status.isAuthenticated) {
        setError(status.message);
      }
    };

    checkAuth();
  }, []);

  // Load aggregated production data
  useEffect(() => {
    const loadAggregatedData = async () => {
      if (authStatus?.isAuthenticated) {
        try {
          setIsLoadingAggregated(true);
          setError(null);
          const data = await productionService.getAggregatedProductionData();
          setAggregatedData(data);
        } catch (error) {
          console.error("Error loading aggregated data:", error);
          setError(
            "Failed to load production overview data. Please try again."
          );
        } finally {
          setIsLoadingAggregated(false);
        }
      }
    };

    loadAggregatedData();
  }, [authStatus]);

  // Search jobs
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const results = await productionService.searchJobs(searchTerm);
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching jobs:", error);
      setError("Failed to search jobs. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Load production data for specific job
  const loadJobProductionData = async (nrcJobNo: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await productionService.getProductionDataByJob(nrcJobNo);
      setProductionData(data);
      setSelectedJob(nrcJobNo);
    } catch (error) {
      console.error("Error loading job production data:", error);
      setError("Failed to load job production data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle job selection from search results
  const handleJobSelect = async (nrcJobNo: string) => {
    await loadJobProductionData(nrcJobNo);
    setSearchResults([]);
    setSearchTerm("");
  };

  // Show job details in side panel
  const handleShowJobDetails = async (nrcJobNo: string) => {
    try {
      const jobDetails = await productionService.getJobPlanByNrcJobNo(nrcJobNo);
      if (jobDetails) {
        setSelectedJobDetails(jobDetails);
        setShowDetailPanel(true);
      }
    } catch (error) {
      console.error("Error loading job details:", error);
      setError("Failed to load job details. Please try again.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "accept":
      case "accepted":
        return "bg-green-100 text-green-800 border-green-200";
      case "start":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "stop":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "planned":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "accepted":
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case "start":
        return <ClockIcon className="h-5 w-5 text-blue-600" />;
      case "stop":
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      case "planned":
        return <ClockIcon className="h-5 w-5 text-gray-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not started";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStepDisplayName = (stepName: string) => {
    switch (stepName) {
      case "Corrugation":
        return "Corrugation";
      case "FluteLaminateBoardConversion":
        return "Flute Lamination";
      case "Punching":
        return "Punching";
      case "SideFlapPasting":
        return "Flap Pasting";
      default:
        return stepName;
    }
  };

  // Show loading if authentication is still pending
  if (!authStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" text="Checking authentication..." />
      </div>
    );
  }

  if (isLoadingAggregated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" text="Loading production overview..." />
      </div>
    );
  }

  const handleStatusCardClick = async (
    stepKey: string,
    status: string,
    stepName: string
  ) => {
    try {
      setIsLoadingModalData(true);
      let jobData: Array<{ jobPlan: JobPlan; step: ProductionStep }> = [];
      let title = "";

      if (stepKey === "all") {
        // Show all jobs with this status across all steps
        jobData = await productionService.getAllStepsByStatus(status);
        title = `All ${status.charAt(0).toUpperCase() + status.slice(1)} Steps`;
      } else {
        // Show jobs for specific step and status
        jobData = await productionService.getJobsByStepAndStatus(
          stepKey,
          status
        );
        title = `${stepName} - ${
          status.charAt(0).toUpperCase() + status.slice(1)
        } Jobs`;
      }

      setModalJobData(jobData);
      setModalTitle(title);
      setShowJobDetailsModal(true);
    } catch (error) {
      console.error("Error loading job details:", error);
      setError("Failed to load job details. Please try again.");
    } finally {
      setIsLoadingModalData(false);
    }
  };

  console.log("productionData:", aggregatedData);

  return (
    <div className="min-h-screen sm:p-6 lg:p-8">
      {/* Header */}
      <div className="bg-[#00AEEF] rounded-lg text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            {/* Left side */}
            <div>
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-3 rounded-xl">
                  <CogIcon className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">
                    Production Head Dashboard
                  </h1>
                  <p className="text-blue-100">
                    Monitor and manage production operations across all jobs
                  </p>
                </div>
              </div>

              {/* Auth Status (mobile & tablet only) */}
              {authStatus && (
                <div
                  className={`mt-3 px-3 py-2 rounded-lg text-sm font-medium lg:hidden ${
                    authStatus.isAuthenticated
                      ? authStatus.message.includes("expiring")
                        ? "bg-yellow-500/20 text-yellow-100"
                        : "bg-green-500/20 text-green-100"
                      : "bg-red-500/20 text-red-100"
                  }`}
                >
                  {authStatus.message}
                </div>
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4 mt-4 lg:mt-0">
              {/* Auth Status (desktop only) */}
              {authStatus && (
                <div
                  className={`px-3 py-2 rounded-lg text-sm font-medium hidden lg:block ${
                    authStatus.isAuthenticated
                      ? authStatus.message.includes("expiring")
                        ? "bg-yellow-500/20 text-yellow-100"
                        : "bg-green-500/20 text-green-100"
                      : "bg-red-500/20 text-red-100"
                  }`}
                >
                  {authStatus.message}
                </div>
              )}

              {/* Refresh Button */}
              <button
                onClick={() => {
                  const loadAggregatedData = async () => {
                    try {
                      setIsLoadingAggregated(true);
                      setError(null);
                      const data =
                        await productionService.getAggregatedProductionData();
                      setAggregatedData(data);
                    } catch (error) {
                      console.error("Error refreshing data:", error);
                      setError(
                        "Failed to refresh production data. Please try again."
                      );
                    } finally {
                      setIsLoadingAggregated(false);
                    }
                  };
                  loadAggregatedData();
                }}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoadingAggregated}
              >
                {isLoadingAggregated ? (
                  <LoadingSpinner
                    size="sm"
                    variant="button"
                    color="white"
                    text="Refreshing..."
                  />
                ) : (
                  <>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <span>Refresh</span>
                  </>
                )}
              </button>

              {/* Last Updated */}
              <div className="bg-white/20 px-4 py-2 rounded-lg">
                <span className="text-sm">
                  Last Updated: {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Job Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <label
                htmlFor="jobSearch"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Search Jobs by NRC Job No
              </label>
              <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                <input
                  id="jobSearch"
                  type="text"
                  placeholder="Enter NRC Job No (e.g., VIP- FRENCHIE ARROW FOLDER-5)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !searchTerm.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <MagnifyingGlassIcon className="h-4 w-4" />
                  <span>{isSearching ? "Searching..." : "Search"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Search Results:
              </h3>
              <div className="space-y-2">
                {searchResults.map((job, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {job.nrcJobNo}
                      </p>
                      <p className="text-sm text-gray-600">
                        Demand: {job.jobDemand} • Steps: {job.totalSteps}
                        {!job.hasProductionSteps && (
                          <span className="ml-2 text-orange-600 font-medium">
                            ⚠️ No Production Steps
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleJobSelect(job.nrcJobNo)}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          job.hasProductionSteps
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "bg-gray-400 text-white cursor-not-allowed"
                        }`}
                        disabled={!job.hasProductionSteps}
                        title={
                          !job.hasProductionSteps
                            ? "This job has no production steps to view"
                            : "View production steps"
                        }
                      >
                        {job.hasProductionSteps
                          ? "View Production"
                          : "No Production Steps"}
                      </button>
                      <button
                        onClick={() => handleShowJobDetails(job.nrcJobNo)}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Job Info */}
          {selectedJob && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-blue-800">
                    Selected Job:
                  </span>
                  <span className="ml-2 text-sm text-blue-600 font-mono">
                    {selectedJob}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedJob("");
                    setProductionData({
                      corrugation: [],
                      fluteLamination: [],
                      punching: [],
                      flapPasting: [],
                    });
                  }}
                  className="text-blue-400 hover:text-blue-600 text-sm"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col sm:flex-row sm:space-x-1 p-1 space-y-1 sm:space-y-0">
            {[
              {
                id: "overview",
                label: "Production Overview",
                icon: ChartBarIcon,
              },
              { id: "details", label: "Job Details", icon: DocumentTextIcon },
              {
                id: "analytics",
                label: "Analytics",
                icon: ArrowTrendingUpIcon,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-[#00AEEF] text-white shadow-md"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
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

        {/* Overview Tab - Aggregated Data */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Overall Efficiency
                    </p>
                    <p className="text-3xl font-bold text-blue-600">
                      {aggregatedData?.overallEfficiency || 0}%
                    </p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-xl">
                    <ArrowTrendingUpIcon className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${aggregatedData?.overallEfficiency || 0}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Jobs
                    </p>
                    <p className="text-3xl font-bold text-green-600">
                      {aggregatedData?.totalJobs || 0}
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-xl">
                    <DocumentTextIcon className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">Jobs in system</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Production Steps
                    </p>
                    <p className="text-3xl font-bold text-purple-600">
                      {aggregatedData
                        ? Object.values(aggregatedData.stepSummary).reduce(
                            (total, step) => total + step.total,
                            0
                          )
                        : 0}
                    </p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-xl">
                    <UserGroupIcon className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">Across all jobs</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Active Steps
                    </p>
                    <p className="text-3xl font-bold text-orange-600">
                      {aggregatedData
                        ? Object.values(aggregatedData.stepSummary).reduce(
                            (total, step) => total + step.inProgress,
                            0
                          )
                        : 0}
                    </p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-xl">
                    <CogIcon className="h-8 w-8 text-orange-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Currently in progress
                </p>
              </div>
            </div>

            {/* Production Steps Overview */}
            {/* Production Steps Overview - Make it clickable */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Production Steps Status Overview
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    name: "Corrugation",
                    key: "corrugation",
                    color: "blue",
                    icon: CogIcon,
                  },
                  {
                    name: "Flute Lamination",
                    key: "fluteLamination",
                    color: "green",
                    icon: BuildingOfficeIcon,
                  },
                  {
                    name: "Punching",
                    key: "punching",
                    color: "purple",
                    icon: DocumentTextIcon,
                  },
                  {
                    name: "Flap Pasting",
                    key: "flapPasting",
                    color: "orange",
                    icon: TruckIcon,
                  },
                ].map((step, index) => {
                  const stepData =
                    aggregatedData?.stepSummary[
                      step.key as keyof typeof aggregatedData.stepSummary
                    ];

                  return (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`bg-${step.color}-100 p-2 rounded-lg`}>
                          <step.icon
                            className={`h-6 w-6 text-${step.color}-600`}
                          />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {step.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Production Step {index + 1}
                          </p>
                        </div>
                      </div>

                      {stepData ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {/* Completed - Clickable */}
                            <button
                              onClick={() =>
                                handleStatusCardClick(
                                  step.key,
                                  "completed",
                                  step.name
                                )
                              }
                              className="text-center p-2 bg-green-100 rounded hover:bg-green-200 transition-colors cursor-pointer"
                              disabled={isLoadingModalData}
                            >
                              <p className="font-semibold text-green-800">
                                {stepData.completed}
                              </p>
                              <p className="text-green-600">Completed</p>
                            </button>

                            {/* In Progress - Clickable */}
                            <button
                              onClick={() =>
                                handleStatusCardClick(
                                  step.key,
                                  "start",
                                  step.name
                                )
                              }
                              className="text-center p-2 bg-blue-100 rounded hover:bg-blue-200 transition-colors cursor-pointer"
                              disabled={isLoadingModalData}
                            >
                              <p className="font-semibold text-blue-800">
                                {stepData.start}
                              </p>
                              <p className="text-blue-600">In Progress</p>
                            </button>

                            {/* Planned - Clickable */}
                            <button
                              onClick={() =>
                                handleStatusCardClick(
                                  step.key,
                                  "planned",
                                  step.name
                                )
                              }
                              className="text-center p-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors cursor-pointer"
                              disabled={isLoadingModalData}
                            >
                              <p className="font-semibold text-gray-800">
                                {stepData.planned}
                              </p>
                              <p className="text-gray-600">Planned</p>
                            </button>

                            {/* Stopped - Clickable */}
                            <button
                              onClick={() =>
                                handleStatusCardClick(
                                  step.key,
                                  "stop",
                                  step.name
                                )
                              }
                              className="text-center p-2 bg-yellow-100 rounded hover:bg-yellow-200 transition-colors cursor-pointer"
                              disabled={isLoadingModalData}
                            >
                              <p className="font-semibold text-yellow-800">
                                {stepData.stop}
                              </p>
                              <p className="text-yellow-600">Stopped</p>
                            </button>
                          </div>
                          <div className="text-center pt-2 border-t border-gray-200">
                            <p className="text-sm font-semibold text-gray-900">
                              Total: {stepData.total}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-500">
                            No data available
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Job Details Tab */}
        {activeTab === "details" && (
          <div className="space-y-6">
            {selectedJob ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Production Details - {selectedJob}
                </h2>

                {/* Check if job has production steps */}
                {(() => {
                  const hasProductionSteps =
                    productionData.corrugation.length > 0 ||
                    productionData.fluteLamination.length > 0 ||
                    productionData.punching.length > 0 ||
                    productionData.flapPasting.length > 0;

                  if (!hasProductionSteps) {
                    return (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center space-x-3">
                          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                          <div>
                            <h3 className="text-sm font-medium text-yellow-800">
                              No Production Steps Found
                            </h3>
                            <p className="text-sm text-yellow-700">
                              This job doesn't contain the 4 production steps
                              (Corrugation, Flute Lamination, Punching, Flap
                              Pasting). It may be a different type of job or use
                              different step names.
                            </p>
                            <p className="text-sm text-yellow-600 mt-1">
                              Use the "View Details" button to see all steps for
                              this job.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {isLoading ? (
                  <div className="text-center py-8">
                    <LoadingSpinner
                      size="md"
                      text="Loading production data..."
                    />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {[
                      {
                        name: "Corrugation",
                        data: productionData.corrugation,
                        color: "blue",
                        icon: CogIcon,
                      },
                      {
                        name: "Flute Lamination",
                        data: productionData.fluteLamination,
                        color: "green",
                        icon: BuildingOfficeIcon,
                      },
                      {
                        name: "Punching",
                        data: productionData.punching,
                        color: "purple",
                        icon: DocumentTextIcon,
                      },
                      {
                        name: "Flap Pasting",
                        data: productionData.flapPasting,
                        color: "orange",
                        icon: TruckIcon,
                      },
                    ].map((step, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-center space-x-3 mb-4">
                          <div
                            className={`bg-${step.color}-100 p-2 rounded-lg`}
                          >
                            <step.icon
                              className={`h-6 w-6 text-${step.color}-600`}
                            />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {step.name}
                          </h3>
                        </div>

                        {step.data.length > 0 ? (
                          <div className="space-y-3">
                            {step.data.map((stepDetail, stepIndex) => (
                              <div
                                key={stepIndex}
                                className="bg-gray-50 rounded-lg p-3"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span
                                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                      stepDetail.status
                                    )}`}
                                  >
                                    {getStatusIcon(stepDetail.status)}
                                    <span className="ml-1">
                                      {stepDetail.status}
                                    </span>
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    Step {stepDetail.stepNo}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <p className="text-gray-600">
                                      Started:{" "}
                                      {formatDate(stepDetail.startDate)}
                                    </p>
                                    <p className="text-gray-600">
                                      Ended: {formatDate(stepDetail.endDate)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600">
                                      Operator:{" "}
                                      {stepDetail.user || "Not assigned"}
                                    </p>
                                    <p className="text-gray-600">
                                      Machine:{" "}
                                      {stepDetail.machineDetails[0]
                                        ?.machineType || "Not assigned"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <p className="text-gray-500">
                              No {step.name} steps found for this job
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
                <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Job Selected
                </h3>
                <p className="text-gray-600 mb-4">
                  Search for a job above to view its production details
                </p>
                <div className="text-sm text-gray-500">
                  <p>• Search by NRC Job No to find specific jobs</p>
                  <p>• View production status for all 4 production steps</p>
                  <p>• Monitor step progress and machine assignments</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Production Analytics
              </h2>

              {selectedJob ? (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-800">
                    Analytics for {selectedJob}
                  </h3>

                  {/* Check if job has production steps */}
                  {(() => {
                    const hasProductionSteps =
                      productionData.corrugation.length > 0 ||
                      productionData.fluteLamination.length > 0 ||
                      productionData.punching.length > 0 ||
                      productionData.flapPasting.length > 0;

                    if (!hasProductionSteps) {
                      return (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                          <div className="flex items-center space-x-3">
                            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                            <div>
                              <h3 className="text-sm font-medium text-yellow-800">
                                No Production Analytics Available
                              </h3>
                              <p className="text-sm text-yellow-700">
                                This job doesn't contain the 4 production steps,
                                so production analytics are not available.
                              </p>
                              <p className="text-sm text-yellow-600 mt-1">
                                Use the "View Details" button to see all steps
                                and their status for this job.
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Step Efficiency */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { name: "Corrugation", data: productionData.corrugation },
                      {
                        name: "Flute Lamination",
                        data: productionData.fluteLamination,
                      },
                      { name: "Punching", data: productionData.punching },
                      {
                        name: "Flap Pasting",
                        data: productionData.flapPasting,
                      },
                    ].map((step, index) => {
                      const efficiency =
                        step.data.length > 0
                          ? (step.data.filter(
                              (s) =>
                                s.status === "completed" ||
                                s.status === "accept"
                            ).length /
                              step.data.length) *
                            100
                          : 0;

                      return (
                        <div
                          key={index}
                          className="bg-gray-50 rounded-lg p-4 text-center"
                        >
                          <h4 className="font-medium text-gray-900 mb-2">
                            {step.name}
                          </h4>
                          <p className="text-2xl font-bold text-blue-600">
                            {Math.round(efficiency)}%
                          </p>
                          <p className="text-sm text-gray-600">Efficiency</p>
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${efficiency}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Machine Utilization */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">
                      Machine Utilization
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        {
                          name: "Corrugation",
                          data: productionData.corrugation,
                        },
                        {
                          name: "Flute Lamination",
                          data: productionData.fluteLamination,
                        },
                        { name: "Punching", data: productionData.punching },
                        {
                          name: "Flap Pasting",
                          data: productionData.flapPasting,
                        },
                      ].map((step, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <h5 className="font-medium text-gray-800 mb-2">
                            {step.name}
                          </h5>
                          <div className="space-y-1">
                            {step.data.map((stepDetail, stepIndex) => (
                              <div key={stepIndex} className="text-sm">
                                <span className="text-gray-600">Machine: </span>
                                <span className="font-medium">
                                  {stepDetail.machineDetails[0]?.machineType ||
                                    "Not assigned"}
                                </span>
                                {stepDetail.machineDetails[0]?.machine && (
                                  <span className="text-gray-500 ml-2">
                                    (Capacity:{" "}
                                    {stepDetail.machineDetails[0].machine.capacity.toLocaleString()}
                                    )
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ChartBarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Job Selected for Analytics
                  </h3>
                  <p className="text-gray-600">
                    Select a job to view detailed analytics and performance
                    metrics
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Detail Side Panel */}
      {showDetailPanel && selectedJobDetails && (
        <div className="fixed inset-0 bg-transparent bg-opacity-50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Job Details
                </h2>
                <button
                  onClick={() => setShowDetailPanel(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
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

              <div className="space-y-6">
                {/* Job Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Job Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">NRC Job No:</p>
                      <p className="font-medium text-gray-900">
                        {selectedJobDetails.nrcJobNo}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Demand Level:</p>
                      <p className="font-medium text-gray-900 capitalize">
                        {selectedJobDetails.jobDemand}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Created:</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(selectedJobDetails.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Last Updated:</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(selectedJobDetails.updatedAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* All Steps */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    All Production Steps
                  </h3>
                  <div className="space-y-3">
                    {selectedJobDetails.steps.map((step, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                              Step {step.stepNo}
                            </span>
                            <h4 className="font-medium text-gray-900">
                              {getStepDisplayName(step.stepName)}
                            </h4>
                          </div>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                              step.status
                            )}`}
                          >
                            {getStatusIcon(step.status)}
                            <span className="ml-1">{step.status}</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600">
                              Started: {formatDate(step.startDate)}
                            </p>
                            <p className="text-gray-600">
                              Ended: {formatDate(step.endDate)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">
                              Operator: {step.user || "Not assigned"}
                            </p>
                            <p className="text-gray-600">
                              Machine:{" "}
                              {step.machineDetails[0]?.machineType ||
                                "Not assigned"}
                            </p>
                          </div>
                        </div>

                        {step.machineDetails.length > 0 &&
                          step.machineDetails[0].machine && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <h5 className="font-medium text-gray-800 mb-2">
                                Machine Details
                              </h5>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-gray-600">Machine ID:</p>
                                  <p className="font-medium">
                                    {step.machineDetails[0].machine.id}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Capacity:</p>
                                  <p className="font-medium">
                                    {step.machineDetails[0].machine.capacity.toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Status:</p>
                                  <p className="font-medium capitalize">
                                    {step.machineDetails[0].machine.status}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Description:</p>
                                  <p className="font-medium">
                                    {step.machineDetails[0].machine.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Job Details Modal */}
      {showJobDetailsModal && (
        <ProductionDetailModal
          jobs={modalJobData}
          title={modalTitle}
          onClose={() => {
            setShowJobDetailsModal(false);
            setModalJobData([]);
            setModalTitle("");
          }}
        />
      )}

      {/* Loading overlay for modal data */}
      {isLoadingModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <LoadingSpinner size="md" />
              <span className="text-gray-700">Loading job details...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionHeadDashboard;
