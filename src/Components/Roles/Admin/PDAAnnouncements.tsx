import React, { useState, useEffect, useMemo } from "react";
import { Bell, X, Send, Trash2, AlertCircle, Edit2 } from "lucide-react";
import {
  listPDAAnnouncements,
  createPDAAnnouncement,
  deletePDAAnnouncement,
  updatePDAAnnouncement,
} from "../../../services/pdaAnnouncementsService";
import type {
  PDAAnnouncement,
  PDAPriority,
} from "../../../services/pdaAnnouncementsService";
import LoadingSpinner from "../../common/LoadingSpinner";
import type { DateFilterType } from "./FilterComponents/DateFilterComponent";
import { useUsers } from "../../../context/UsersContext";

interface PDAAnnouncementsProps {
  dateFilter?: DateFilterType;
  customDateRange?: { start: string; end: string };
}

const PDAAnnouncements: React.FC<PDAAnnouncementsProps> = ({
  dateFilter,
  customDateRange,
}) => {
  const { getUserName } = useUsers();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<PDAPriority>("medium");
  const [announcements, setAnnouncements] = useState<PDAAnnouncement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Format date as dd/mm/yyyy, HH:mm:ss AM/PM (12-hour format)
  const formatDateTime = (dateString: string | null | undefined): string => {
    if (!dateString) return "Date not available";
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();

      // Convert to 12-hour format
      let hours = date.getHours();
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");

      // Format: dd/mm/yyyy, H:mm:ss AM/PM
      return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds} ${ampm}`;
    } catch {
      return "Invalid date";
    }
  };

  // Fetch announcements from API
  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listPDAAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch PDA announcements"
      );
      console.error("Error fetching PDA announcements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // Helper function to get date range from filter
  const getDateRange = (
    filter?: DateFilterType,
    customRange?: { start: string; end: string }
  ) => {
    if (!filter) return null;

    const today = new Date();
    let startDate: Date;
    let endDate: Date = new Date(today);

    switch (filter) {
      case "today":
        startDate = new Date(today);
        endDate = new Date(today);
        break;
      case "week":
        startDate = new Date(today);
        const dayOfWeek = today.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate.setDate(today.getDate() - daysToMonday);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      case "month":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case "quarter":
        const currentQuarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), currentQuarter * 3, 1);
        endDate = new Date(today.getFullYear(), (currentQuarter + 1) * 3, 0);
        break;
      case "year":
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        break;
      case "custom":
        if (customRange) {
          startDate = new Date(customRange.start);
          endDate = new Date(customRange.end);
        } else {
          return null;
        }
        break;
      default:
        return null;
    }

    return { startDate, endDate };
  };

  // Filter announcements based on date
  const filteredAnnouncements = useMemo(() => {
    if (!dateFilter) return announcements;

    const dateRange = getDateRange(dateFilter, customDateRange);
    if (!dateRange) return announcements;

    const { startDate, endDate } = dateRange;
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    return announcements.filter((ann) => {
      if (!ann.createdAt) return false;
      const createdAt = new Date(ann.createdAt);
      return createdAt >= startDate && createdAt <= endDate;
    });
  }, [announcements, dateFilter, customDateRange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !message.trim()) {
      alert("Please fill in both title and message");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      if (editingId) {
        // Update existing announcement
        await updatePDAAnnouncement(editingId, {
          title: title.trim(),
          message: message.trim(),
          priority,
        });
        alert("Announcement updated successfully!");
      } else {
        // Create new announcement
        await createPDAAnnouncement({
          title: title.trim(),
          message: message.trim(),
          priority,
        });
        alert("Announcement created successfully!");
      }

      // Refresh announcements
      await fetchAnnouncements();

      // Reset form
      setTitle("");
      setMessage("");
      setPriority("medium");
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : editingId
          ? "Failed to update announcement"
          : "Failed to create announcement";
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (announcement: PDAAnnouncement) => {
    setEditingId(announcement.id!);
    setTitle(announcement.title);
    setMessage(announcement.message);
    setPriority(announcement.priority);
    setShowForm(true);
    setError(null);
    // Scroll to form
    setTimeout(() => {
      document
        .querySelector("[data-announcement-form]")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  };

  const handleCancel = () => {
    setShowForm(false);
    setTitle("");
    setMessage("");
    setPriority("medium");
    setEditingId(null);
    setError(null);
  };

  const handleDelete = async (id: number | string) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) {
      return;
    }

    try {
      setError(null);
      await deletePDAAnnouncement(id);
      // Refresh announcements
      await fetchAnnouncements();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete announcement";
      setError(errorMessage);
      alert(errorMessage);
    }
  };

  const getPriorityColor = (priority: PDAPriority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-300";
      case "medium":
      case "normal":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <Bell className="text-blue-600" size={24} />
          <h3 className="text-lg font-semibold text-gray-800">
            PDA Announcements
          </h3>
        </div>
        <button
          onClick={() => {
            if (showForm && editingId) {
              handleCancel();
            } else {
              setShowForm(!showForm);
              if (!showForm) {
                setEditingId(null);
                setTitle("");
                setMessage("");
                setPriority("medium");
              }
            }
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <Bell size={18} />
          <span>
            {showForm && !editingId
              ? "Cancel"
              : editingId
              ? "Cancel Edit"
              : "New Announcement"}
          </span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
          <AlertCircle className="text-red-600" size={20} />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div
          className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6"
          data-announcement-form
        >
          <h4 className="text-md font-semibold text-gray-800 mb-4">
            {editingId ? "Edit Announcement" : "Create New Announcement"}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter announcement title..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Message Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message *
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter announcement message..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                required
              />
            </div>

            {/* Priority Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PDAPriority)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <Send size={18} />
                <span>
                  {submitting
                    ? editingId
                      ? "Updating..."
                      : "Publishing..."
                    : editingId
                    ? "Update Announcement"
                    : "Publish Announcement"}
                </span>
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={submitting}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Announcements List */}
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner size="md" variant="inline" />
          <span className="ml-3 text-gray-600">Loading announcements...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell size={48} className="mx-auto mb-4 text-gray-300" />
              <p>
                {announcements.length === 0
                  ? "No announcements yet"
                  : "No announcements found for selected date range"}
              </p>
              <p className="text-sm">
                {announcements.length === 0
                  ? "Create your first announcement to get started"
                  : "Try adjusting your date filter"}
              </p>
            </div>
          ) : (
            filteredAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                  announcement.isActive === false
                    ? "bg-gray-50 border-gray-300 opacity-60"
                    : "bg-blue-50 border-blue-200"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold text-gray-800">
                        {announcement.title}
                      </h4>
                      {announcement.priority && (
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(
                            announcement.priority
                          )}`}
                        >
                          {announcement.priority.toUpperCase()}
                        </span>
                      )}
                      {announcement.isActive === false && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600 border border-gray-300">
                          INACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {announcement.message}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(announcement)}
                      className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                      title="Edit announcement"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id!)}
                      className="text-gray-400 hover:text-red-600 transition-colors p-1"
                      title="Delete announcement"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                  <span>{formatDateTime(announcement.createdAt)}</span>
                  {announcement.createdBy && (
                    <span>By: {getUserName(announcement.createdBy)}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PDAAnnouncements;
