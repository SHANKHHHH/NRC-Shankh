import React from "react";
import { Briefcase, Package, X } from "lucide-react";
import type { JobDetailsWithPOData } from "../../utils/jobPoDetailsFetch";

export interface JobAndPODetailsModalProps {
  open: boolean;
  onClose: () => void;
  loadingJobDetails: boolean;
  jobDetailsError: string | null;
  jobDetailsWithPO: JobDetailsWithPOData | null;
  activeJobTab: "job" | "po";
  setActiveJobTab: (t: "job" | "po") => void;
  /** Used to filter PO list to the job plan row (e.g. Job Card Steps modal). */
  selectedJobPlan: { jobPlanId: number } | null;
  /** Use z-[60] when this modal stacks above another (e.g. Job Card Steps at z-50). */
  zIndexClass?: string;
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Job + Purchase Order details (tabs), shared by Admin Job Plans table and Production Head.
 */
const JobAndPODetailsModal: React.FC<JobAndPODetailsModalProps> = ({
  open,
  onClose,
  loadingJobDetails,
  jobDetailsError,
  jobDetailsWithPO,
  activeJobTab,
  setActiveJobTab,
  selectedJobPlan,
  zIndexClass = "z-50",
}) => {
  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 ${zIndexClass}`}
    >
      <div className="bg-white rounded-lg shadow-lg w-full max-w-7xl p-6 relative overflow-y-auto max-h-[90vh]">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <h2 className="text-xl font-semibold">Job & Purchase Order Details</h2>
          {jobDetailsWithPO?.jobDetails && (
            <span className="text-lg text-gray-600">
              - {jobDetailsWithPO.jobDetails.nrcJobNo}
            </span>
          )}
        </div>

        {loadingJobDetails && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <p className="ml-3 text-gray-600">Loading job details...</p>
          </div>
        )}

        {jobDetailsError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {jobDetailsError}
          </div>
        )}

        {jobDetailsWithPO?.jobDetails && !loadingJobDetails && (
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                type="button"
                onClick={() => setActiveJobTab("job")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeJobTab === "job"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Briefcase size={16} />
                  <span>Job Details</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setActiveJobTab("po")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeJobTab === "po"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Package size={16} />
                  <span>
                    Purchase Orders (
                    {(() => {
                      let filteredCount = 0;
                      if (
                        selectedJobPlan &&
                        selectedJobPlan.jobPlanId &&
                        jobDetailsWithPO?.poJobPlannings?.length > 0
                      ) {
                        const matchingPoJobPlanning =
                          jobDetailsWithPO.poJobPlannings.find(
                            (po: { jobPlanId?: number }) =>
                              po.jobPlanId === selectedJobPlan.jobPlanId
                          );
                        if (
                          matchingPoJobPlanning &&
                          matchingPoJobPlanning.poId
                        ) {
                          filteredCount =
                            jobDetailsWithPO.purchaseOrderDetails.filter(
                              (po: { id: number }) =>
                                po.id === matchingPoJobPlanning.poId
                            ).length;
                        } else {
                          const hasJobPlanningEntry =
                            jobDetailsWithPO.poJobPlannings.find(
                              (po: { hasJobPlanning?: boolean }) =>
                                po.hasJobPlanning === true
                            );
                          if (hasJobPlanningEntry) {
                            filteredCount =
                              jobDetailsWithPO.purchaseOrderDetails.filter(
                                (po: { id: number }) =>
                                  po.id === hasJobPlanningEntry.poId
                              ).length;
                          } else {
                            const poIds = jobDetailsWithPO.poJobPlannings.map(
                              (po: { poId: number }) => po.poId
                            );
                            filteredCount =
                              jobDetailsWithPO.purchaseOrderDetails.filter(
                                (po: { id: number }) => poIds.includes(po.id)
                              ).length;
                          }
                        }
                      } else if (jobDetailsWithPO?.poJobPlannings?.length > 0) {
                        const hasJobPlanningEntry =
                          jobDetailsWithPO.poJobPlannings.find(
                            (po: { hasJobPlanning?: boolean }) =>
                              po.hasJobPlanning === true
                          );
                        if (hasJobPlanningEntry) {
                          filteredCount =
                            jobDetailsWithPO.purchaseOrderDetails.filter(
                              (po: { id: number }) =>
                                po.id === hasJobPlanningEntry.poId
                            ).length;
                        } else {
                          const poIds = jobDetailsWithPO.poJobPlannings.map(
                            (po: { poId: number }) => po.poId
                          );
                          filteredCount =
                            jobDetailsWithPO.purchaseOrderDetails.filter(
                              (po: { id: number }) => poIds.includes(po.id)
                            ).length;
                        }
                      } else {
                        filteredCount =
                          jobDetailsWithPO?.purchaseOrderDetails?.length || 0;
                      }
                      return filteredCount;
                    })()}
                    )
                  </span>
                </div>
              </button>
            </nav>
          </div>
        )}

        {activeJobTab === "job" &&
          jobDetailsWithPO?.jobDetails &&
          !loadingJobDetails && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3">
                    Basic Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Style:</span>{" "}
                      {jobDetailsWithPO.jobDetails.styleItemSKU}
                    </div>
                    <div>
                      <span className="font-medium">Customer:</span>{" "}
                      {jobDetailsWithPO.jobDetails.customerName}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>{" "}
                      {jobDetailsWithPO.jobDetails.status}
                    </div>
                    <div>
                      <span className="font-medium">Demand:</span>{" "}
                      {jobDetailsWithPO.jobDetails.jobDemand === "medium"
                        ? "Regular"
                        : jobDetailsWithPO.jobDetails.jobDemand}
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-800 mb-3">
                    Pricing
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Latest Rate:</span> ₹
                      {jobDetailsWithPO.jobDetails.latestRate}
                    </div>
                    <div>
                      <span className="font-medium">Previous Rate:</span> ₹
                      {jobDetailsWithPO.jobDetails.preRate}
                    </div>
                    <div>
                      <span className="font-medium">Die Punch Code:</span>{" "}
                      {jobDetailsWithPO.jobDetails.diePunchCode}
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-purple-800 mb-3">
                    Dimensions
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Box Dimensions:</span>{" "}
                      {jobDetailsWithPO.jobDetails.boxDimensions}
                    </div>
                    <div>
                      <span className="font-medium">Board Size:</span>{" "}
                      {jobDetailsWithPO.jobDetails.boardSize}
                    </div>
                    <div>
                      <span className="font-medium">No of Ups:</span>{" "}
                      {jobDetailsWithPO.jobDetails.noUps}
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-orange-800 mb-3">
                    Material Specs
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Flute Type:</span>{" "}
                      {jobDetailsWithPO.jobDetails.fluteType}
                    </div>
                    <div>
                      <span className="font-medium">Board Category:</span>{" "}
                      {jobDetailsWithPO.jobDetails.boardCategory}
                    </div>
                    <div>
                      <span className="font-medium">Top Face GSM:</span>{" "}
                      {jobDetailsWithPO.jobDetails.topFaceGSM}
                    </div>
                    <div>
                      <span className="font-medium">Fluting GSM:</span>{" "}
                      {jobDetailsWithPO.jobDetails.flutingGSM}
                    </div>
                    <div>
                      <span className="font-medium">Bottom Liner GSM:</span>{" "}
                      {jobDetailsWithPO.jobDetails.bottomLinerGSM}
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-red-800 mb-3">
                    Color Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">No of Colors:</span>{" "}
                      {jobDetailsWithPO.jobDetails.noOfColor}
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-indigo-800 mb-3">
                    Important Dates
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Artwork Received:</span>{" "}
                      {formatDate(jobDetailsWithPO.jobDetails.artworkReceivedDate)}
                    </div>
                    <div>
                      <span className="font-medium">Artwork Approved:</span>{" "}
                      {formatDate(jobDetailsWithPO.jobDetails.artworkApprovedDate)}
                    </div>
                    <div>
                      <span className="font-medium">Shade Card Approval:</span>{" "}
                      {formatDate(
                        jobDetailsWithPO.jobDetails.shadeCardApprovalDate
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        {activeJobTab === "po" && jobDetailsWithPO && !loadingJobDetails && (
          <div className="space-y-6">
            {(() => {
              let filteredPOs: typeof jobDetailsWithPO.purchaseOrderDetails =
                [];

              if (
                selectedJobPlan &&
                selectedJobPlan.jobPlanId &&
                jobDetailsWithPO.poJobPlannings.length > 0
              ) {
                const matchingPoJobPlanning = jobDetailsWithPO.poJobPlannings.find(
                  (po: { jobPlanId?: number }) =>
                    po.jobPlanId === selectedJobPlan.jobPlanId
                );

                if (matchingPoJobPlanning && matchingPoJobPlanning.poId) {
                  filteredPOs = jobDetailsWithPO.purchaseOrderDetails.filter(
                    (po: { id: number }) =>
                      po.id === matchingPoJobPlanning.poId
                  );
                } else {
                  const hasJobPlanningEntry = jobDetailsWithPO.poJobPlannings.find(
                    (po: { hasJobPlanning?: boolean }) =>
                      po.hasJobPlanning === true
                  );

                  if (hasJobPlanningEntry) {
                    filteredPOs = jobDetailsWithPO.purchaseOrderDetails.filter(
                      (po: { id: number }) =>
                        po.id === hasJobPlanningEntry.poId
                    );
                  } else {
                    const poIds = jobDetailsWithPO.poJobPlannings.map(
                      (po: { poId: number }) => po.poId
                    );
                    filteredPOs = jobDetailsWithPO.purchaseOrderDetails.filter(
                      (po: { id: number }) => poIds.includes(po.id)
                    );
                  }
                }
              } else if (jobDetailsWithPO.poJobPlannings.length > 0) {
                const hasJobPlanningEntry = jobDetailsWithPO.poJobPlannings.find(
                  (po: { hasJobPlanning?: boolean }) =>
                    po.hasJobPlanning === true
                );

                if (hasJobPlanningEntry) {
                  filteredPOs = jobDetailsWithPO.purchaseOrderDetails.filter(
                    (po: { id: number }) => po.id === hasJobPlanningEntry.poId
                  );
                } else {
                  const poIds = jobDetailsWithPO.poJobPlannings.map(
                    (po: { poId: number }) => po.poId
                  );
                  filteredPOs = jobDetailsWithPO.purchaseOrderDetails.filter(
                    (po: { id: number }) => poIds.includes(po.id)
                  );
                }
              } else {
                filteredPOs = jobDetailsWithPO.purchaseOrderDetails;
              }

              return filteredPOs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p>No purchase orders found for this job.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {filteredPOs.map((po: any) => (
                    <div
                      key={po.id}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">
                          PO #{po.poNumber}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            po.status === "created"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {po.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">
                            Order Details
                          </h4>
                          <div className="space-y-1 text-sm">
                            <div>
                              <span className="font-medium">Customer:</span>{" "}
                              {po.customer || "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">Plant:</span>{" "}
                              {po.plant || "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">Unit:</span>{" "}
                              {po.unit || "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">Style:</span>{" "}
                              {po.style || "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">Job NRC No:</span>{" "}
                              {po.jobNrcJobNo || "N/A"}
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">
                            Specifications
                          </h4>
                          <div className="space-y-1 text-sm">
                            <div>
                              <span className="font-medium">Board Size:</span>{" "}
                              {po.boardSize || "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">Flute Type:</span>{" "}
                              {po.fluteType || "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">Die Code:</span>{" "}
                              {po.dieCode || "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">No. of Sheets:</span>{" "}
                              {po.noOfSheets?.toLocaleString() || "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">No. of Ups:</span>{" "}
                              {po.noOfUps || "N/A"}
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">
                            Quantities
                          </h4>
                          <div className="space-y-1 text-sm">
                            <div>
                              <span className="font-medium">Total PO Qty:</span>{" "}
                              {po.totalPOQuantity?.toLocaleString() || "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">Dispatch Qty:</span>{" "}
                              {po.dispatchQuantity?.toLocaleString() || "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">Pending Qty:</span>{" "}
                              {po.pendingQuantity?.toLocaleString() || "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">
                                Pending Validity:
                              </span>{" "}
                              {po.pendingValidity || "N/A"} days
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">
                            Dates
                          </h4>
                          <div className="space-y-1 text-sm">
                            <div>
                              <span className="font-medium">PO Date:</span>{" "}
                              {po.poDate ? formatDate(po.poDate) : "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">Delivery Date:</span>{" "}
                              {po.deliveryDate
                                ? formatDate(po.deliveryDate)
                                : "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">
                                NRC Delivery Date:
                              </span>{" "}
                              {po.nrcDeliveryDate
                                ? formatDate(po.nrcDeliveryDate)
                                : "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">
                                Shade Card Approval:
                              </span>{" "}
                              {po.shadeCardApprovalDate
                                ? formatDate(po.shadeCardApprovalDate)
                                : "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">Dispatch Date:</span>{" "}
                              {po.dispatchDate
                                ? formatDate(po.dispatchDate)
                                : "Not Dispatched"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobAndPODetailsModal;
