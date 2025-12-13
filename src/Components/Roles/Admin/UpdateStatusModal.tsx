import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface JobStep {
  id: number;
  stepNo: number;
  stepName: string;
  machineDetails: any[];
  status: 'planned' | 'start' | 'stop' | 'major_hold';
  startDate: string | null;
  endDate: string | null;
  user: string | null;
  createdAt: string;
  updatedAt: string;
}

interface JobPlan {
  jobPlanId: number;
  nrcJobNo: string;
  jobDemand: 'high' | 'medium' | 'low' | null;
  createdAt: string;
  updatedAt: string;
  steps: JobStep[];
}

interface UpdateStatusModalProps {
  step: JobStep;
  job: JobPlan;
  onClose: () => void;
  onUpdate: () => void;
}

const UpdateStatusModal: React.FC<UpdateStatusModalProps> = ({
  step,
  job,
  onClose,
  onUpdate
}) => {
  const [selectedStatus, setSelectedStatus] = useState(step.status);
  const [userId, setUserId] = useState(step.user || '');
  const [loading, setLoading] = useState(false);

  const statusOptions = [
    { value: 'planned', label: 'PLANNED', color: 'bg-blue-500' },
    { value: 'start', label: 'START', color: 'bg-green-500' },
    { value: 'stop', label: 'STOP', color: 'bg-red-500' },
    { value: 'major_hold', label: 'MAJOR HOLD', color: 'bg-orange-500' }
  ];

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    // Prepare ONLY the step data for the step-specific endpoint
    const stepUpdatePayload: any = {
      status: selectedStatus,
      user: userId || null,
    };

    // Handle dates based on status
    if (selectedStatus === 'planned') {
      stepUpdatePayload.startDate = null;
      stepUpdatePayload.endDate = null;
    } else if (selectedStatus === 'start') {
      stepUpdatePayload.startDate = new Date().toISOString();
      stepUpdatePayload.endDate = null;
    } else if (selectedStatus === 'stop') {
      stepUpdatePayload.endDate = new Date().toISOString();
      // Keep existing startDate
    } else if (selectedStatus === 'major_hold') {
      // Don't clear startDate or endDate for major_hold
      // Keep existing dates
    }

    console.log('🔍 Sending step update payload:', stepUpdatePayload);

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      throw new Error('Authentication token not found. Please log in again.');
    }

    // Make the API call with ONLY step data
    const response = await fetch(
      `https://nrprod.nrcontainers.com/api/job-planning/${encodeURIComponent(job.nrcJobNo)}/steps/${step.stepNo}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stepUpdatePayload) // Send only step data
      }
    );

    console.log('🔍 Response status:', response.status);
    console.log('🔍 Response ok:', response.ok);

    if (response.ok) {
      const responseData = await response.json();
      console.log('✅ Update successful:', responseData);
      onUpdate();
      onClose();
    } else {
      const errorText = await response.text();
      console.error('❌ Update failed:', errorText);
      throw new Error(`Failed to update status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error updating status:', error);
    alert('Failed to update status. Please try again.');
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-transparent backdrop-blur-md bg-opacity-50">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="bg-[#00AEEF] px-6 py-4 flex items-center justify-between rounded-sm">
            <h3 className="text-lg font-medium text-white">Update Step Details</h3>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 transition-colors hover:cursor-pointer"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="px-6 py-4">
            {/* Job Information */}
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-1">Job:</div>
              <div className="font-medium text-gray-900">{job.nrcJobNo}</div>
            </div>
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-1">Step:</div>
              <div className="font-medium text-gray-900">{step.stepNo}</div>
            </div>

            {/* Status Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select new status:
              </label>
              <div className="space-y-2">
                {statusOptions.map((option) => (
                  <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value={option.value}
                      checked={selectedStatus === option.value}
                      onChange={(e) => setSelectedStatus(e.target.value as any)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 border-gray-300 flex items-center justify-center ${
                      selectedStatus === option.value ? 'border-green-600' : ''
                    }`}>
                      {selectedStatus === option.value && (
                        <div className={`w-2 h-2 rounded-full ${option.color}`}></div>
                      )}
                    </div>
                    <span className="text-gray-900">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* User Assignment */}
            <div className="mb-6">
              <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-2">
                Assign User (Optional):
              </label>
              <input
                type="text"
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter user ID (e.g., NRC00...)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
                              <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : 'Update'}
                </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UpdateStatusModal; 