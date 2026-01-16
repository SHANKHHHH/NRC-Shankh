import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Upload, X, Image as ImageIcon } from "lucide-react";

interface CreateNewJobFormData {
  nrcJobNo: string | null;
  styleItemSKU: string;
  customerName: string;
  fluteType: string;
  status: string;
  latestRate: number | null;
  preRate: number;
  length: number;
  width: number;
  height: number;
  boxDimensions: string;
  diePunchCode: number;
  boardCategory: string | null;
  noOfColor: string;
  processColors: string | null;
  specialColor1: string | null;
  specialColor2: string | null;
  specialColor3: string | null;
  specialColor4: string | null;
  overPrintFinishing: string | null;
  topFaceGSM: string;
  flutingGSM: string;
  bottomLinerGSM: string;
  decalBoardX: string;
  lengthBoardY: string;
  boardSize: string;
  noUps: string;
  artworkReceivedDate: string | null;
  artworkApprovedDate: string | null;
  shadeCardApprovalDate: string | null;
  srNo: number;
  imageURL: string | null;
}

interface CreateNewJobProps {
  onBack: () => void;
}

const CreateNewJob: React.FC<CreateNewJobProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Check for pre-filled data from notification
  const getPrefilledData = () => {
    try {
      const prefilledData = localStorage.getItem("createJobPrefilledData");
      if (prefilledData) {
        const data = JSON.parse(prefilledData);
        localStorage.removeItem("createJobPrefilledData"); // Clear after use
        return data;
      }
    } catch (error) {
      console.error("Error parsing prefilled data:", error);
    }
    return null;
  };

  const [formData, setFormData] = useState<CreateNewJobFormData>(() => {
    const prefilledData = getPrefilledData();
    return {
      nrcJobNo: null,
      styleItemSKU: prefilledData?.style || "",
      customerName: prefilledData?.customer || "",
      fluteType: prefilledData?.fluteType || "5PLY", // Set default value
      status: "ACTIVE", // Changed to uppercase enum value
      latestRate: null,
      preRate: 0,
      length: 0,
      width: 0,
      height: 0,
      boxDimensions: "",
      diePunchCode: 0,
      boardCategory: "",
      noOfColor: prefilledData?.noOfColor || "",
      processColors: "",
      specialColor1: "",
      specialColor2: "",
      specialColor3: "",
      specialColor4: "",
      overPrintFinishing: "",
      topFaceGSM: "",
      flutingGSM: "",
      bottomLinerGSM: "",
      decalBoardX: "",
      lengthBoardY: "",
      boardSize: prefilledData?.boardSize || "",
      noUps: "",
      artworkReceivedDate: "", // Use empty string for date inputs
      artworkApprovedDate: "", // Use empty string for date inputs
      shadeCardApprovalDate: "", // Use empty string for date inputs
      srNo: 0,
      imageURL: "",
    };
  });

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;

    if (type === "number") {
      setFormData((prev) => ({
        ...prev,
        [name]: value === "" ? null : parseFloat(value),
      }));
    } else if (type === "date") {
      setFormData((prev) => ({
        ...prev,
        [name]: value === "" ? null : value,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const formatBoxDimensions = (
    length: number | null,
    width: number | null,
    height: number | null
  ) => {
    const sanitizeDimension = (value: number | null) => {
      if (value === null || Number.isNaN(value)) return "0";
      return value.toString();
    };

    return `${sanitizeDimension(length)}x${sanitizeDimension(
      width
    )}x${sanitizeDimension(height)}`;
  };

  useEffect(() => {
    setFormData((prev) => {
      const formatted = formatBoxDimensions(
        prev.length,
        prev.width,
        prev.height
      );
      if (prev.boxDimensions === formatted) {
        return prev;
      }
      return {
        ...prev,
        boxDimensions: formatted,
      };
    });
  }, [formData.length, formData.width, formData.height]);

  // Convert file to Base64
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      setMessage({
        type: "error",
        text: "Please select a valid image file (PNG, JPG, JPEG, GIF, etc.)",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({
        type: "error",
        text: "Image size must be less than 5MB",
      });
      return;
    }

    try {
      setImageFile(file);

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      // Convert to Base64
      const base64String = await convertToBase64(file);
      setFormData((prev) => ({
        ...prev,
        imageURL: base64String,
      }));

      setMessage({
        type: "success",
        text: "Image uploaded successfully!",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to process image. Please try again.",
      });
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Remove image
  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData((prev) => ({
      ...prev,
      imageURL: "",
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Validate required fields
      if (
        !formData.styleItemSKU ||
        !formData.customerName ||
        !formData.fluteType ||
        !formData.noOfColor
      ) {
        throw new Error(
          "Please fill in all required fields: Style Item SKU, Customer Name, Flute Type, and Number of Colors"
        );
      }

      // Validate dimensions
      if (formData.length <= 0 || formData.width <= 0 || formData.height < 0) {
        throw new Error(
          "Please enter valid dimensions (Length and Width must be greater than 0, Height cannot be negative)"
        );
      }

      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("Authentication token not found. Please log in.");
      }

      // Prepare the data with proper type conversions to match endpoint format
      // Exclude database-generated fields like 'id' - let the database handle them
      const submitData = {
        // Basic fields
        nrcJobNo: formData.nrcJobNo || null,
        styleItemSKU: formData.styleItemSKU,
        customerName: formData.customerName,
        fluteType: formData.fluteType,
        status: formData.status,
        latestRate: formData.latestRate || null,
        preRate: Number(formData.preRate),

        // Dimension fields
        length: Number(formData.length),
        width: Number(formData.width),
        height: String(formData.height),
        boxDimensions: formData.boxDimensions,

        // Technical fields
        diePunchCode: Number(formData.diePunchCode),
        boardCategory: formData.boardCategory || null,
        noOfColor: formData.noOfColor,
        processColors: formData.processColors || null,

        // Special colors
        specialColor1: formData.specialColor1 || null,
        specialColor2: formData.specialColor2 || null,
        specialColor3: formData.specialColor3 || null,
        specialColor4: formData.specialColor4 || null,

        // Finishing and materials
        overPrintFinishing: formData.overPrintFinishing || null,
        topFaceGSM: formData.topFaceGSM,
        flutingGSM: formData.flutingGSM,
        bottomLinerGSM: formData.bottomLinerGSM,

        // Board details
        decalBoardX: formData.decalBoardX || null,
        lengthBoardY: formData.lengthBoardY || null,
        boardSize: formData.boardSize,
        noUps: formData.noUps || null,

        // Dates
        artworkReceivedDate: formData.artworkReceivedDate
          ? new Date(formData.artworkReceivedDate).toISOString()
          : null,
        artworkApprovedDate: formData.artworkApprovedDate
          ? new Date(formData.artworkApprovedDate).toISOString()
          : null,
        shadeCardApprovalDate: formData.shadeCardApprovalDate
          ? new Date(formData.shadeCardApprovalDate).toISOString()
          : null,

        // Reference number
        srNo: Number(formData.srNo),

        // Image URL (Base64)
        imageURL: formData.imageURL || null,
      };

      console.log("Submitting data to API:", submitData);

      const response = await fetch("https://nrprod.nrcontainers.com/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error Response:", {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData,
          requestData: submitData,
        });
        throw new Error(
          errorData.error ||
            `Failed to create job: ${response.status} - ${response.statusText}`
        );
      }

      const result = await response.json();

      // Auto-update POs with matching style and remove notifications
      await updatePOsAndRemoveNotifications(
        result.data?.nrcJobNo,
        formData.styleItemSKU
      );

      setMessage({
        type: "success",
        text: "Job created successfully! POs updated and notifications cleared.",
      });

      // Reset form immediately after successful creation
      resetForm();

      // Navigate back to dashboard after showing success message
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create job",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    onBack();
  };

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      nrcJobNo: null,
      styleItemSKU: "",
      customerName: "",
      fluteType: "5PLY",
      status: "ACTIVE",
      latestRate: null,
      preRate: 0,
      length: 0,
      width: 0,
      height: 0,
      boxDimensions: "",
      diePunchCode: 0,
      boardCategory: "",
      noOfColor: "",
      processColors: "",
      specialColor1: "",
      specialColor2: "",
      specialColor3: "",
      specialColor4: "",
      overPrintFinishing: "",
      topFaceGSM: "",
      flutingGSM: "",
      bottomLinerGSM: "",
      decalBoardX: "",
      lengthBoardY: "",
      boardSize: "",
      noUps: "",
      artworkReceivedDate: "",
      artworkApprovedDate: "",
      shadeCardApprovalDate: "",
      srNo: 0,
      imageURL: "",
    });

    // Clear image states
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </button>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
            Create New Job
          </h1>

          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === "success"
                  ? "bg-green-100 border border-green-400 text-green-700"
                  : "bg-red-100 border border-red-400 text-red-700"
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Style Item SKU
                </label>
                <input
                  type="text"
                  name="styleItemSKU"
                  value={formData.styleItemSKU}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 8KGC.TBOXMASTERCARTON"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., SAKATASEEDS, Company Name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Flute Type
                </label>
                <select
                  name="fluteType"
                  value={formData.fluteType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Flute Type</option>
                  <option value="2PLY">2PLY</option>
                  <option value="3PLY">3PLY</option>
                  <option value="5PLY">5PLY</option>
                  <option value="7PLY">7PLY</option>
                  <option value="FOLDER">FOLDER</option>
                  <option value="INSERTER">INSERTER</option>
                  <option value="SINGLE PC">SINGLE PC</option>
                  <option value="TAG">TAG</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PENDING">Pending</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pre Rate
                </label>
                <input
                  type="number"
                  name="preRate"
                  value={formData.preRate}
                  onChange={handleInputChange}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 79.76, 100.50"
                  required
                />
              </div>
            </div>

            {/* Dimensions */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Box Dimensions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Length (mm)
                  </label>
                  <input
                    type="number"
                    name="length"
                    value={formData.length}
                    onChange={handleInputChange}
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 460.0, 500.0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Width (mm)
                  </label>
                  <input
                    type="number"
                    name="width"
                    value={formData.width}
                    onChange={handleInputChange}
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 350.0, 400.0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height (mm)
                  </label>
                  <input
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleInputChange}
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 310.0, 350.0"
                    required
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Box Dimensions (LxWxH)
                </label>
                <input
                  type="text"
                  name="boxDimensions"
                  value={formData.boxDimensions}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 focus:outline-none"
                  placeholder="Auto-generated from Length x Width x Height"
                />
              </div>
            </div>

            {/* Technical Specifications */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Technical Specifications
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Die Punch Code
                  </label>
                  <input
                    type="number"
                    name="diePunchCode"
                    value={formData.diePunchCode}
                    onChange={handleInputChange}
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 1.0, 2.0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Colors
                  </label>
                  <input
                    type="text"
                    name="noOfColor"
                    value={formData.noOfColor}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 4, 6, 8"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Top Face GSM
                  </label>
                  <input
                    type="text"
                    name="topFaceGSM"
                    value={formData.topFaceGSM}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 300, 350, 400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fluting GSM
                  </label>
                  <textarea
                    name="flutingGSM"
                    value={formData.flutingGSM}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 120&#10;120, 150&#10;150"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bottom Liner GSM
                  </label>
                  <textarea
                    name="bottomLinerGSM"
                    value={formData.bottomLinerGSM}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 120&#10;120, 150&#10;150"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Board Size
                  </label>
                  <input
                    type="text"
                    name="boardSize"
                    value={formData.boardSize}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 70x86, 80x90"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    No. of Ups
                  </label>
                  <input
                    type="text"
                    name="noUps"
                    value={formData.noUps}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 0,2, 4, 6"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Special Colors */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Special Colors
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Color 1
                  </label>
                  <input
                    type="text"
                    name="specialColor1"
                    value={formData.specialColor1 || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Pantone 123C, Metallic Gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Color 2
                  </label>
                  <input
                    type="text"
                    name="specialColor2"
                    value={formData.specialColor2 || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Pantone 456C, UV Blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Color 3
                  </label>
                  <input
                    type="text"
                    name="specialColor3"
                    value={formData.specialColor3 || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Pantone 789C, Fluorescent Pink"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Color 4
                  </label>
                  <input
                    type="text"
                    name="specialColor4"
                    value={formData.specialColor4 || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Pantone 012C, Silver Foil"
                  />
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Important Dates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Artwork Received Date
                  </label>
                  <input
                    type="date"
                    name="artworkReceivedDate"
                    value={
                      formData.artworkReceivedDate
                        ? formData.artworkReceivedDate.split("T")[0]
                        : ""
                    }
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Artwork Approved Date
                  </label>
                  <input
                    type="date"
                    name="artworkApprovedDate"
                    value={
                      formData.artworkApprovedDate
                        ? formData.artworkApprovedDate.split("T")[0]
                        : ""
                    }
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shade Card Approval Date
                  </label>
                  <input
                    type="date"
                    name="shadeCardApprovalDate"
                    value={
                      formData.shadeCardApprovalDate
                        ? formData.shadeCardApprovalDate.split("T")[0]
                        : ""
                    }
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Additional Fields */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Additional Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SR Number
                  </label>
                  <input
                    type="number"
                    name="srNo"
                    value={formData.srNo}
                    onChange={handleInputChange}
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 196.0, 200.0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Over Print Finishing
                  </label>
                  <input
                    type="text"
                    name="overPrintFinishing"
                    value={formData.overPrintFinishing || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Varnish, Lamination, Foil Stamping"
                  />
                </div>
              </div>

              {/* Image Upload Field - Full Width */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Image
                </label>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {/* Upload Area */}
                {!imagePreview ? (
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    <div className="flex flex-col items-center space-y-4">
                      <div className="p-4 bg-gray-100 rounded-full">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-gray-700">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          PNG, JPG, JPEG, GIF up to 5MB
                        </p>
                      </div>
                      <button
                        type="button"
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Choose File
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full border border-gray-300 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            {imageFile?.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {((imageFile?.size || 0) / 1024 / 1024).toFixed(2)}{" "}
                            MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeImage}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Image Preview */}
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-contain bg-gray-50 rounded border"
                      />
                    </div>

                    {/* Replace Button */}
                    <div className="mt-4 text-center">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Replace Image
                      </button>
                    </div>
                  </div>
                )}

                {/* <p className="mt-2 text-xs text-gray-500">
                  Image will be automatically converted to Base64 format for
                  storage
                </p> */}
              </div>
            </div>

            {/* Submit Button */}
            <div className="border-t pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#00AEEF] text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Creating Job...</span>
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    <span>Create Job</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateNewJob;
