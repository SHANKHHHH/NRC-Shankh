import React from "react";
import { CheckCircle, Clock, AlertCircle, XCircle, Trash2 } from "lucide-react";

interface PurchaseOrder {
  id: number;
  boardSize: string | null;
  boxDimensions: string | null;
  jobBoardSize: string | null;
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
  processColors?: string;
  noOfColor?: string | null;
}

interface POdetailCardProps {
  po: PurchaseOrder;
  onClick: (po: PurchaseOrder) => void;
  jobCompletionStatus:
    | "artwork_pending"
    | "po_pending"
    | "more_info_pending"
    | "completed"
    | "dispatched";
  hasJobCreationNotification?: boolean;
  onDelete?: (po: PurchaseOrder) => void;
}

const POdetailCard: React.FC<POdetailCardProps> = ({
  po,
  onClick,
  jobCompletionStatus,
  hasJobCreationNotification = false,
  onDelete,
}) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "created":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "dispatched":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getCompletionStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />;
      case "dispatched":
        return <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />;
      case "artwork_pending":
        return (
          <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
        );
      case "po_pending":
        return <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />;
      case "more_info_pending":
        return <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />;
      default:
        return <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />;
    }
  };

  const getCompletionStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "dispatched":
        return "Dispatched";
      case "artwork_pending":
        return "Artwork Pending";
      case "po_pending":
        return "PO Pending";
      case "more_info_pending":
        return "More Info Pending";
      default:
        return "Unknown";
    }
  };

  const getCompletionStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-50";
      case "dispatched":
        return "text-purple-600 bg-purple-50";
      case "artwork_pending":
        return "text-yellow-600 bg-yellow-50";
      case "po_pending":
        return "text-orange-600 bg-orange-50";
      case "more_info_pending":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  console.log("Rendering POdetailCard with PO:", po);

  return (
    <div
      onClick={() => onClick(po)}
      className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-4 hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105 min-h-[280px] sm:min-h-[320px] flex flex-col"
    >
      {/* Header with PO Number and Status */}
      <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-gray-800 text-xs sm:text-sm truncate">
              PO: {po.poNumber}
            </h3>
            {hasJobCreationNotification && (
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
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(po);
                }}
                className="text-red-600 hover:text-red-900 transition-colors p-1 hover:bg-red-50 rounded ml-auto"
                title="Delete PO"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">
            {po.job?.nrcJobNo || "No Job Assigned"}
          </p>
        </div>
        <div className="flex flex-col items-end space-y-1 min-w-0">
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(
              po.status
            )} whitespace-nowrap`}
          >
            {po.status}
          </span>
          <div
            className={`px-2 py-1 text-xs font-medium rounded-full ${getCompletionStatusColor(
              jobCompletionStatus
            )} flex items-center space-x-1 whitespace-nowrap`}
          >
            {getCompletionStatusIcon(jobCompletionStatus)}
            <span className="text-xs hidden sm:inline">
              {getCompletionStatusText(jobCompletionStatus)}
            </span>
            <span className="text-xs sm:hidden">
              {getCompletionStatusText(jobCompletionStatus).split(" ")[0]}
            </span>
          </div>
        </div>
      </div>

      {/* Customer and Style */}
      <div className="mb-3 flex-1">
        <p className="font-medium text-gray-700 text-xs sm:text-sm truncate">
          {po.customer}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {po.style || "No Style"}
        </p>
      </div>

      {/* Key Details Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
        <div>
          <p className="text-xs text-gray-500">Board Size</p>
          <p className="text-xs sm:text-sm font-medium text-gray-700 truncate">
            {po.jobBoardSize || "N/A"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Unit</p>
          <p className="text-xs sm:text-sm font-medium text-gray-700 truncate">
            {po.unit}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Quantity</p>
          <p className="text-xs sm:text-sm font-medium text-gray-700">
            {po.totalPOQuantity || 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Sheets</p>
          <p className="text-xs sm:text-sm font-medium text-gray-700">
            {po.noOfSheets || 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">No. of Colors</p>
          <p className="text-xs sm:text-sm font-medium text-gray-700">
            {po.noOfColor || "0"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Die Code</p>
          <p className="text-xs sm:text-sm font-medium text-gray-700">
            {po.dieCode || "N/A"}
          </p>
        </div>
      </div>

      {/* Dates */}
      <div className="space-y-1 mb-3">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">PO Date:</span>
          <span className="text-gray-700 font-medium">
            {formatDate(po.poDate)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Delivery:</span>
          <span className="text-gray-700 font-medium">
            {formatDate(po.deliveryDate)}
          </span>
        </div>
      </div>

      {/* Flute Type and Plant */}
      <div className="mt-auto pt-3 border-t border-gray-100">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500">Flute:</span>
          <span className="text-gray-700 font-medium truncate max-w-[60px]">
            {po.fluteType || "N/A"}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs mt-1">
          <span className="text-gray-500">Plant:</span>
          <span className="text-gray-700 font-medium truncate max-w-[60px]">
            {po.plant || "N/A"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default POdetailCard;
