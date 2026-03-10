import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DoctorNavbar from "../doctor-components/DoctorNavbar";
import { useToast } from "../../../contexts/ToastContext";
import {
  IoCalendarOutline,
  IoSearchOutline,
  IoTimeOutline,
  IoCheckmarkCircleOutline,
  IoPersonOutline,
  IoDocumentTextOutline,
  IoCloseCircleOutline,
  IoCloseOutline,
  IoRefreshOutline,
  IoInformationCircleOutline,
  IoCardOutline,
  IoVideocamOutline,
  IoCallOutline,
  IoWalletOutline,
  IoGiftOutline,
  IoCashOutline,
} from "react-icons/io5";
import {
  getDoctorAppointments,
  cancelDoctorAppointment,
  updateQueueStatus,
  markAppointmentAsPaid,
  getPatientById,
  getConsultationById,
  getDoctorConsultations,
} from "../doctor-services/doctorService";
import Pagination from "../../../components/Pagination";

// Default appointments (will be replaced by API data)
const defaultAppointments = [];

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (timeString) => {
  return timeString || "N/A";
};

const getTypeIcon = (type) => {
  const normalizedType = type?.toLowerCase() || "";
  if (normalizedType.includes("video")) return IoVideocamOutline;
  if (normalizedType.includes("call") || normalizedType.includes("voice")) return IoCallOutline;
  return IoPersonOutline;
};

// Map backend status to frontend display status
const mapBackendStatusToDisplay = (backendStatus) => {
  switch (backendStatus) {
    case "scheduled":
      return "pending"; // Backend 'scheduled' shows as 'pending' for doctor
    case "confirmed":
      return "confirmed";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    case "no_show":
      return "no_show";
    default:
      return backendStatus || "pending";
  }
};

// Map frontend display status back to backend status
const mapDisplayStatusToBackend = (displayStatus) => {
  switch (displayStatus) {
    case "pending":
      return "scheduled"; // Frontend 'pending' is backend 'scheduled'
    case "confirmed":
      return "confirmed";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    case "no_show":
      return "no_show";
    default:
      return displayStatus || "scheduled";
  }
};

const getStatusColor = (status) => {
  // Handle both backend and frontend statuses
  const displayStatus = status === "scheduled" ? "pending" : status;

  switch (displayStatus) {
    case "confirmed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "pending":
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "completed":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "cancelled":
      return "bg-red-50 text-red-700 border-red-200";
    case "no_show":
      return "bg-orange-50 text-orange-700 border-orange-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

const DoctorAppointments = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [appointments, setAppointments] = useState(defaultAppointments);
  const [statistics, setStatistics] = useState(null); // Statistics from backend
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("all"); // 'today', 'monthly', 'yearly', 'all'
  const [selectedDate, setSelectedDate] = useState(""); // YYYY-MM-DD date filter
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [pagination, setPagination] = useState(null);

  const handleMarkAsPaid = async (appointment) => {
    const remaining = appointment.remainingAmount || (appointment.fee - (appointment.paidAmount || 0));
    if (window.confirm(`Mark ₹${remaining} as paid in cash by ${appointment.patientName}? This will update your wallet earnings.`)) {
      try {
        await markAppointmentAsPaid(appointment._id || appointment.id);
        setAppointments(prev => prev.map(apt =>
          (apt.id === appointment.id || apt._id === appointment._id)
            ? {
              ...apt,
              paymentStatus: "paid",
              paidAmount: apt.fee,
              remainingAmount: 0,
              paymentMethod: "cash"
            }
            : apt
        ));
        toast.success("Payment marked as paid!");
      } catch (err) {
        toast.error(err.message || "Failed to mark as paid");
      }
    }
  };

  // Reset page when period filter or search changes
  useEffect(() => {
    setPage(1);
  }, [filterPeriod, searchTerm, selectedDate]);

  // Fetch appointments from API
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = {
          page,
          limit,
          ...(searchTerm && { search: searchTerm }), // Note: Backend may not support search, kept for future compatibility
          ...(selectedDate && { date: selectedDate }), // Let backend also filter by selected date
        };
        const data = await getDoctorAppointments(params);

        if (data) {
          // Handle both array and object with items/appointments property
          const appointmentsData = Array.isArray(data)
            ? data
            : data.items || data.appointments || [];

          // Set pagination data
          if (data.pagination) {
            setPagination(data.pagination);
          }

          // Store statistics from backend if available
          if (data.statistics) {
            console.log("📊 Backend statistics received:", data.statistics);
            setStatistics(data.statistics);
          } else {
            console.log(
              "⚠️ No statistics in backend response, will calculate client-side",
            );
            setStatistics(null);
          }

      // Transform API data to match component structure
          const transformed = appointmentsData.map((apt) => {
            // Normalize date - use appointmentDate from backend
            const appointmentDate = apt.appointmentDate || apt.date;
        const normalizedDate = appointmentDate
          ? new Date(appointmentDate)
          : new Date();

        // Local date string (YYYY-MM-DD) for reliable date filtering/display
        let localDate = null;
        if (!Number.isNaN(normalizedDate.getTime())) {
          const y = normalizedDate.getFullYear();
          const m = String(normalizedDate.getMonth() + 1).padStart(2, "0");
          const d = String(normalizedDate.getDate()).padStart(2, "0");
          localDate = `${y}-${m}-${d}`;
        }

            return {
              id: apt._id || apt.id,
              _id: apt._id || apt.id,
              patientId:
                apt.patientId?._id ||
                apt.patientId?.id ||
                apt.patientId ||
                "pat-unknown",
              patientName:
                apt.patientId?.firstName && apt.patientId?.lastName
                  ? `${apt.patientId.firstName} ${apt.patientId.lastName}`
                  : apt.patientId?.name || apt.patientName || "Unknown Patient",
              patientImage:
                apt.patientId?.profileImage ||
                apt.patientId?.image ||
                apt.patientImage ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(apt.patientId?.firstName || "Patient")}&background=0077C2&color=fff&size=160`,
          date: appointmentDate, // Raw backend date
          appointmentDate: appointmentDate, // Keep both for compatibility
          localDate, // Local YYYY-MM-DD (used for filtering/display)
              time: apt.time || "",
              // Format type for display
              // Normalized consultation mode for internal logic
              consultationMode: (() => {
                const rawMode = (apt.consultationMode || apt.appointmentType || apt.type || "").toLowerCase();
                if (rawMode.includes("video")) return "video_call";
                if (rawMode.includes("voice") || rawMode.includes("call") || rawMode.includes("online") || rawMode.includes("audio")) return "voice_call";
                return "in-person";
              })(),
              // Format type for display
              type: (() => {
                const rawMode = (apt.consultationMode || apt.appointmentType || apt.type || "In-person").toLowerCase();
                if (rawMode.includes("video")) return "Video Call";
                if (rawMode.includes("voice") || rawMode.includes("call") || rawMode.includes("online") || rawMode.includes("audio")) return "Voice Call";
                return "In-Person";
              })(),
              status: apt.status || "scheduled",
              duration: apt.duration || "30 min",
              reason: apt.reason || apt.chiefComplaint || "Consultation",
              appointmentType: apt.appointmentType || "New",
              // Preserve additional patient data
              patientPhone: apt.patientId?.phone || apt.patientPhone || "",
              patientEmail: apt.patientId?.email || apt.patientEmail || "",
              patientAddress: apt.patientId?.address
                ? [
                  apt.patientId.address.line1,
                  apt.patientId.address.line2,
                  apt.patientId.address.city,
                  apt.patientId.address.state,
                  apt.patientId.address.postalCode,
                  apt.patientId.address.country,
                ]
                  .filter(Boolean)
                  .join(", ")
                  .trim() || "Not provided"
                : apt.patientAddress || "Not provided",
              age: apt.patientId?.age || apt.age || 30,
              gender: apt.patientId?.gender || apt.gender || "male",
              // Rescheduled appointment data
              rescheduledAt: apt.rescheduledAt,
              rescheduledBy: apt.rescheduledBy,
              rescheduleReason: apt.rescheduleReason,
              isRescheduled: !!apt.rescheduledAt,
              // Payment data
              fee: apt.fee || 0,
              paidAmount: apt.paidAmount || 0,
              remainingAmount: apt.remainingAmount || 0,
              paymentStatus: apt.paymentStatus || "pending",
              paymentMethod: apt.paymentMethod, // Original payment method
              // Preserve original appointment data for reference
              originalData: apt,
            };
          });

          console.log("📋 Transformed appointments:", {
            count: transformed.length,
            sample: transformed[0] || null,
            dateFields: transformed
              .slice(0, 3)
              .map((apt) => ({
                id: apt.id,
                date: apt.date,
                appointmentDate: apt.appointmentDate,
              })),
          });

          setAppointments(transformed);
        }
      } catch (err) {
        console.error("Error fetching appointments:", err);
        // Check if it's a connection error
        const isConnectionError =
          err.message?.includes("Failed to fetch") ||
          err.message?.includes("ERR_CONNECTION_REFUSED") ||
          err.message?.includes("NetworkError") ||
          (err instanceof TypeError && err.message === "Failed to fetch");

        if (isConnectionError) {
          setError(
            "Unable to connect to server. Please check if the backend server is running.",
          );
          // Don't show toast for connection errors to avoid spam
        } else {
          setError(err.message || "Failed to load appointments");
          toast.error("Failed to load appointments");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
    // Refresh every 30 seconds to get new appointments
    const interval = setInterval(fetchAppointments, 30000);
    return () => clearInterval(interval);
  }, [toast, page, limit, searchTerm, selectedDate]);

  // Get today's date for filtering
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get current month start and end
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const currentMonthEnd = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  );
  currentMonthEnd.setHours(23, 59, 59, 999);

  // Get current year start and end
  const currentYearStart = new Date(today.getFullYear(), 0, 1);
  const currentYearEnd = new Date(today.getFullYear(), 11, 31);
  currentYearEnd.setHours(23, 59, 59, 999);

  // Filter appointments based on period
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    // Filter by period - normalize dates for comparison
    if (filterPeriod === "today") {
      filtered = filtered.filter((apt) => {
        const aptDate = new Date(apt.date || apt.appointmentDate);
        aptDate.setHours(0, 0, 0, 0);
        return (
          aptDate.getTime() >= today.getTime() &&
          aptDate.getTime() < tomorrow.getTime()
        );
      });
    } else if (filterPeriod === "monthly") {
      filtered = filtered.filter((apt) => {
        const aptDate = new Date(apt.date || apt.appointmentDate);
        aptDate.setHours(0, 0, 0, 0);
        return (
          aptDate.getTime() >= currentMonthStart.getTime() &&
          aptDate.getTime() <= currentMonthEnd.getTime()
        );
      });
    } else if (filterPeriod === "yearly") {
      filtered = filtered.filter((apt) => {
        const aptDate = new Date(apt.date || apt.appointmentDate);
        aptDate.setHours(0, 0, 0, 0);
        return (
          aptDate.getTime() >= currentYearStart.getTime() &&
          aptDate.getTime() <= currentYearEnd.getTime()
        );
      });
    }
    // 'all' shows all appointments

    // Filter by selected calendar date (overlays on top of period filter)
    if (selectedDate) {
      filtered = filtered.filter((apt) => {
        // Prefer precomputed localDate (YYYY-MM-DD); if missing, fall back to raw date
        if (apt.localDate) {
          return apt.localDate === selectedDate;
        }
        const raw = apt.date || apt.appointmentDate;
        if (!raw) return false;
        if (typeof raw === "string") {
          const datePart = raw.split("T")[0];
          return datePart === selectedDate;
        }
        const iso = raw.toISOString().slice(0, 10);
        return iso === selectedDate;
      });
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (apt) =>
          apt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          apt.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (apt.time &&
            apt.time.toLowerCase().includes(searchTerm.toLowerCase())),
      );
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.date || a.appointmentDate || 0);
      const dateB = new Date(b.date || b.appointmentDate || 0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [
    appointments,
    filterPeriod,
    searchTerm,
    selectedDate,
    today,
    tomorrow,
    currentMonthStart,
    currentMonthEnd,
    currentYearStart,
    currentYearEnd,
  ]);

  // Calculate statistics - use backend statistics if available, otherwise calculate from appointments
  const stats = useMemo(() => {
    // If backend statistics are available, use them
    if (statistics) {
      return {
        today: statistics.today || { scheduled: 0, rescheduled: 0, total: 0 },
        monthly: statistics.monthly || {
          scheduled: 0,
          rescheduled: 0,
          total: 0,
        },
        yearly: statistics.yearly || { scheduled: 0, rescheduled: 0, total: 0 },
        total: statistics.total || { scheduled: 0, rescheduled: 0, total: 0 },
      };
    }

    // Fallback: calculate from appointments (client-side)
    // Normalize dates for proper comparison
    const todayApts = appointments.filter((apt) => {
      const aptDate = new Date(apt.date || apt.appointmentDate);
      aptDate.setHours(0, 0, 0, 0);
      return (
        aptDate.getTime() >= today.getTime() &&
        aptDate.getTime() < tomorrow.getTime()
      );
    });
    const monthlyApts = appointments.filter((apt) => {
      const aptDate = new Date(apt.date || apt.appointmentDate);
      aptDate.setHours(0, 0, 0, 0);
      return (
        aptDate.getTime() >= currentMonthStart.getTime() &&
        aptDate.getTime() <= currentMonthEnd.getTime()
      );
    });
    const yearlyApts = appointments.filter((apt) => {
      const aptDate = new Date(apt.date || apt.appointmentDate);
      aptDate.setHours(0, 0, 0, 0);
      return (
        aptDate.getTime() >= currentYearStart.getTime() &&
        aptDate.getTime() <= currentYearEnd.getTime()
      );
    });

    // Calculate scheduled and rescheduled counts
    const todayScheduled = todayApts.filter((apt) => !apt.isRescheduled).length;
    const todayRescheduled = todayApts.filter(
      (apt) => apt.isRescheduled,
    ).length;
    const monthlyScheduled = monthlyApts.filter(
      (apt) => !apt.isRescheduled,
    ).length;
    const monthlyRescheduled = monthlyApts.filter(
      (apt) => apt.isRescheduled,
    ).length;
    const yearlyScheduled = yearlyApts.filter(
      (apt) => !apt.isRescheduled,
    ).length;
    const yearlyRescheduled = yearlyApts.filter(
      (apt) => apt.isRescheduled,
    ).length;
    const totalScheduled = appointments.filter(
      (apt) => !apt.isRescheduled,
    ).length;
    const totalRescheduled = appointments.filter(
      (apt) => apt.isRescheduled,
    ).length;

    return {
      today: {
        scheduled: todayScheduled,
        rescheduled: todayRescheduled,
        total: todayApts.length,
      },
      monthly: {
        scheduled: monthlyScheduled,
        rescheduled: monthlyRescheduled,
        total: monthlyApts.length,
      },
      yearly: {
        scheduled: yearlyScheduled,
        rescheduled: yearlyRescheduled,
        total: yearlyApts.length,
      },
      total: {
        scheduled: totalScheduled,
        rescheduled: totalRescheduled,
        total: appointments.length,
      },
    };
  }, [
    statistics,
    appointments,
    today,
    tomorrow,
    currentMonthStart,
    currentMonthEnd,
    currentYearStart,
    currentYearEnd,
  ]);

  const handleViewAppointment = async (appointment) => {
    try {
      // First, try to find existing consultation for this appointment
      const consultationsResponse = await getDoctorConsultations();
      let existingConsultation = null;

      if (consultationsResponse) {
        const consultations = Array.isArray(consultationsResponse)
          ? consultationsResponse
          : consultationsResponse.items ||
          consultationsResponse.consultations ||
          [];

        // Find consultation by appointmentId
        existingConsultation = consultations.find(
          (cons) =>
            cons.appointmentId?._id?.toString() ===
            appointment.id?.toString() ||
            cons.appointmentId?.id?.toString() === appointment.id?.toString() ||
            cons.appointmentId?.toString() === appointment.id?.toString(),
        );
      }

      // If consultation exists, fetch full consultation data
      if (existingConsultation) {
        try {
          const consultationResponse = await getConsultationById(
            existingConsultation._id || existingConsultation.id,
          );
          if (consultationResponse) {
            navigate("/doctor/consultations", {
              state: {
                selectedConsultation: consultationResponse,
                loadSavedData: true,
              },
            });
            return;
          }
        } catch (error) {
          console.error("Error fetching consultation:", error);
        }
      }

      // If no consultation exists, fetch patient data and create consultation object
      let patientData = null;
      if (appointment.patientId) {
        try {
          const patientResponse = await getPatientById(appointment.patientId);
          if (patientResponse) {
            patientData = patientResponse;
          }
        } catch (error) {
          console.error("Error fetching patient data:", error);
        }
      }

      // Calculate age from dateOfBirth
      const calculateAge = (dateOfBirth) => {
        if (!dateOfBirth) return null;
        try {
          const birthDate = new Date(dateOfBirth);
          if (isNaN(birthDate.getTime())) return null;
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birthDate.getDate())
          ) {
            age--;
          }
          return age;
        } catch (error) {
          return null;
        }
      };

      // Use patient data from API or fallback to appointment data
      const finalPatientData =
        patientData || appointment.originalData?.patientId || {};
      const patientDateOfBirth =
        finalPatientData.dateOfBirth ||
        appointment.originalData?.patientId?.dateOfBirth;
      const calculatedAge = patientDateOfBirth
        ? calculateAge(patientDateOfBirth)
        : finalPatientData.age || appointment.age || null;

      // Format address properly
      let formattedAddress = "Not provided";
      const address =
        finalPatientData.address ||
        appointment.originalData?.patientId?.address;
      if (address) {
        const addressParts = [
          address.line1,
          address.line2,
          address.city,
          address.state,
          address.postalCode,
          address.country,
        ].filter(Boolean);
        if (addressParts.length > 0) {
          formattedAddress = addressParts.join(", ");
        }
      } else if (
        appointment.patientAddress &&
        appointment.patientAddress !== "Address not provided"
      ) {
        formattedAddress = appointment.patientAddress;
      }

      // Format appointment date properly
      const appointmentDate = appointment.date || appointment.appointmentDate;
      const appointmentTime = appointment.time || "00:00";
      const formattedAppointmentTime = appointmentDate
        ? `${appointmentDate.split("T")[0]}T${appointmentTime}`
        : new Date().toISOString();

      // Create consultation object with real data
      const consultationData = {
        id: `cons-${appointment.id}-${Date.now()}`,
        _id: `cons-${appointment.id}-${Date.now()}`,
        patientId:
          appointment.patientId || finalPatientData._id || finalPatientData.id,
        patientName:
          finalPatientData.firstName && finalPatientData.lastName
            ? `${finalPatientData.firstName} ${finalPatientData.lastName}`
            : appointment.patientName || "Unknown Patient",
        age: calculatedAge,
        gender: finalPatientData.gender || appointment.gender || "male",
        appointmentTime: formattedAppointmentTime,
        appointmentDate: appointmentDate ? appointmentDate.split("T")[0] : null,
        appointmentType: appointment.appointmentType || "New",
        consultationMode: appointment.consultationMode || "in-person",
        status:
          appointment.status === "scheduled" ||
            appointment.status === "confirmed"
            ? "in-progress"
            : appointment.status,
        reason: appointment.reason || "Consultation",
        patientImage:
          finalPatientData.profileImage ||
          appointment.patientImage ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(finalPatientData.firstName || appointment.patientName || "Patient")}&background=0077C2&color=fff&size=160`,
        patientPhone: finalPatientData.phone || appointment.patientPhone || "",
        patientEmail: finalPatientData.email || appointment.patientEmail || "",
        patientAddress: formattedAddress,
        diagnosis: "",
        vitals: {},
        investigations: [],
        advice: "",
        attachments: [],
        appointmentId: appointment.id || appointment._id,
        originalAppointment: appointment.originalData || appointment,
      };

      navigate("/doctor/consultations", {
        state: {
          selectedConsultation: consultationData,
        },
      });
    } catch (error) {
      console.error("Error handling appointment view:", error);
      toast.error("Failed to load consultation data");
    }
  };

  const handleCancelClick = (e, appointment) => {
    e.stopPropagation(); // Prevent card click
    setAppointmentToCancel(appointment);
    setShowCancelModal(true);
  };
  const handleConfirmCancel = async () => {
    if (!appointmentToCancel || !cancelReason.trim()) {
      toast.warning("Please provide a reason for cancellation");
      return;
    }

    try {
      await cancelDoctorAppointment(
        appointmentToCancel._id || appointmentToCancel.id,
        cancelReason.trim(),
      );

      // ✅ UPDATE appointment instead of removing
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentToCancel.id ||
            apt._id === appointmentToCancel._id
            ? {
              ...apt,
              status: "cancelled",
              cancelledBy: "doctor",
              cancelReason: cancelReason.trim(),
            }
            : apt,
        ),
      );

      toast.success(
        `Appointment with ${appointmentToCancel.patientName} cancelled. You can reschedule it.`,
      );
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast.error(error.message || "Failed to cancel appointment");
      return;
    }

    setShowCancelModal(false);
    setAppointmentToCancel(null);
    setCancelReason("");
  };

  const handleCloseCancelModal = () => {
    setShowCancelModal(false);
    setAppointmentToCancel(null);
    setCancelReason("");
  };

  return (
    <>
      <DoctorNavbar />
      <section className="flex flex-col gap-4 pb-24">
        {/* Statistics Cards - Clickable */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <button
            type="button"
            onClick={() => setFilterPeriod("today")}
            className={`group relative overflow-hidden rounded-xl border p-3 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] ${filterPeriod === "today"
              ? "border-purple-400 bg-purple-100 ring-2 ring-purple-200"
              : "border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-300"
              }`}
          >
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/10 group-hover:to-purple-500/20 transition-all duration-300"></div>
            <div className="relative">
              <p className="text-[10px] font-semibold uppercase text-purple-700 mb-1 group-hover:text-purple-900 transition-colors">
                Today
              </p>
              <p className="text-xl font-bold text-purple-900 group-hover:text-purple-950 transition-colors duration-300">
                {stats.today?.total ?? 0}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[8px] text-purple-600">
                  Scheduled: {stats.today?.scheduled ?? 0}
                </span>
                <span className="text-[8px] text-purple-400">•</span>
                <span className="text-[8px] text-purple-600">
                  Rescheduled: {stats.today?.rescheduled ?? 0}
                </span>
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setFilterPeriod("monthly")}
            className={`group relative overflow-hidden rounded-xl border p-3 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] ${filterPeriod === "monthly"
              ? "border-blue-400 bg-blue-100 ring-2 ring-blue-200"
              : "border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300"
              }`}
          >
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/10 group-hover:to-blue-500/20 transition-all duration-300"></div>
            <div className="relative">
              <p className="text-[10px] font-semibold uppercase text-blue-700 mb-1 group-hover:text-blue-900 transition-colors">
                This Month
              </p>
              <p className="text-xl font-bold text-blue-900 group-hover:text-blue-950 transition-colors duration-300">
                {stats.monthly?.total ?? 0}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[8px] text-blue-600">
                  Scheduled: {stats.monthly?.scheduled ?? 0}
                </span>
                <span className="text-[8px] text-blue-400">•</span>
                <span className="text-[8px] text-blue-600">
                  Rescheduled: {stats.monthly?.rescheduled ?? 0}
                </span>
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setFilterPeriod("yearly")}
            className={`group relative overflow-hidden rounded-xl border p-3 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] ${filterPeriod === "yearly"
              ? "border-emerald-400 bg-emerald-100 ring-2 ring-emerald-200"
              : "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300"
              }`}
          >
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/10 group-hover:to-emerald-500/20 transition-all duration-300"></div>
            <div className="relative">
              <p className="text-[10px] font-semibold uppercase text-emerald-700 mb-1 group-hover:text-emerald-900 transition-colors">
                This Year
              </p>
              <p className="text-xl font-bold text-emerald-900 group-hover:text-emerald-950 transition-colors duration-300">
                {stats.yearly?.total ?? 0}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[8px] text-emerald-600">
                  Scheduled: {stats.yearly?.scheduled ?? 0}
                </span>
                <span className="text-[8px] text-emerald-400">•</span>
                <span className="text-[8px] text-emerald-600">
                  Rescheduled: {stats.yearly?.rescheduled ?? 0}
                </span>
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setFilterPeriod("all")}
            className={`group relative overflow-hidden rounded-xl border p-3 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] ${filterPeriod === "all"
              ? "border-slate-400 bg-slate-100 ring-2 ring-slate-200"
              : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300"
              }`}
          >
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-500/0 to-slate-500/0 group-hover:from-slate-500/10 group-hover:to-slate-500/20 transition-all duration-300"></div>
            <div className="relative">
              <p className="text-[10px] font-semibold uppercase text-slate-600 mb-1 group-hover:text-slate-900 transition-colors">
                Total
              </p>
              <p className="text-xl font-bold text-slate-900 group-hover:text-slate-950 transition-colors duration-300">
                {stats.total?.total ?? 0}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[8px] text-slate-600">
                  Scheduled: {stats.total?.scheduled ?? 0}
                </span>
                <span className="text-[8px] text-slate-400">•</span>
                <span className="text-[8px] text-slate-600">
                  Rescheduled: {stats.total?.rescheduled ?? 0}
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Search Bar */}
        <div className="space-y-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <IoSearchOutline className="h-5 w-5" aria-hidden="true" />
            </span>
            <input
              type="search"
              placeholder="Search by patient name, reason, or time..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm font-medium text-slate-900 shadow-sm transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-[rgba(0,119,194,0.2)]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Date filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600">
              Filter by date:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-[rgba(0,119,194,0.3)]"
            />
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate("")}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Appointments List */}
        <div className="space-y-4 sm:space-y-3 lg:grid lg:grid-cols-6 lg:gap-3 lg:space-y-0">
          {filteredAppointments.length === 0 ? (
            <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <IoCalendarOutline className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-sm font-medium text-slate-600">
                No appointments found
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            filteredAppointments.map((appointment) => {
              const TypeIcon = getTypeIcon(appointment.type);
              const displayStatus = mapBackendStatusToDisplay(appointment.status);
              const statusColor = getStatusColor(appointment.status);

              return (
                <div
                  key={appointment.id}
                  onClick={() => {
                    if (appointment.status === "cancelled") return;
                    handleViewAppointment(appointment);
                  }}
                  className="group relative overflow-hidden rounded-2xl sm:rounded-xl lg:rounded-lg border border-slate-200 bg-white p-4 sm:p-3 lg:p-2.5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30 cursor-pointer active:scale-[0.98] lg:hover:scale-[1.01]"
                >
                  {/* Hover Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0077C2]/0 to-[#0077C2]/0 group-hover:from-[#0077C2]/5 group-hover:to-[#0077C2]/10 transition-all duration-300"></div>

                  <div className="relative flex flex-col gap-3 sm:gap-2">
                    {/* Top Row: Image + Name + Status Badge */}
                    <div className="flex items-center gap-3 sm:gap-2">
                      {/* Patient Image */}
                      <div className="relative shrink-0">
                        <img
                          src={appointment.patientImage}
                          alt={appointment.patientName}
                          className="h-12 w-12 sm:h-10 sm:w-10 rounded-xl object-cover ring-2 ring-slate-100 group-hover:ring-primary/30 transition-all duration-300 group-hover:scale-105"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              appointment.patientName
                            )}&background=0077C2&color=fff&size=160`;
                          }}
                        />

                        {/* Status badges on avatar */}
                        {appointment.status === "completed" && (
                          <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 sm:h-3 sm:w-3 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
                            <IoCheckmarkCircleOutline className="h-2.5 w-2.5 sm:h-1.5 sm:w-1.5 text-white" />
                          </div>
                        )}

                        {displayStatus === "pending" && !appointment.isRescheduled && (
                          <div
                            className="absolute -top-0.5 -right-0.5 flex h-4 w-4 sm:h-3 sm:w-3 items-center justify-center rounded-full bg-amber-500 ring-2 ring-white"
                            title="Pending"
                          >
                            <IoTimeOutline className="h-2.5 w-2.5 sm:h-1.5 sm:w-1.5 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Name, Reason & Status Badge */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="text-base sm:text-sm font-bold text-slate-900 truncate group-hover:text-primary transition-colors">
                            {appointment.patientName}
                          </h3>
                          {/* Status Badge inline with name */}
                          <span
                            className={`inline-flex items-center gap-1 shrink-0 rounded-full border px-2 py-0.5 text-[10px] sm:text-[9px] font-semibold uppercase tracking-wide ${statusColor}`}
                          >
                            {displayStatus === "confirmed" && <IoCheckmarkCircleOutline className="h-2.5 w-2.5" />}
                            {displayStatus === "completed" && <IoCheckmarkCircleOutline className="h-2.5 w-2.5" />}
                            {displayStatus === "cancelled" && <IoCloseCircleOutline className="h-2.5 w-2.5" />}
                            {displayStatus === "pending" && <IoTimeOutline className="h-2.5 w-2.5" />}
                            {displayStatus}
                          </span>
                        </div>
                        <p className="text-sm sm:text-xs text-slate-600 truncate">
                          {appointment.reason}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons Row - Separate from patient info */}
                    {appointment.status !== "cancelled" && appointment.status !== "completed" && (
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                        {/* For scheduled/pending appointments - Show Confirm + Cancel */}
                        {appointment.status === "scheduled" && (
                          <>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await updateQueueStatus(appointment._id || appointment.id, "confirmed");
                                  setAppointments(prev => prev.map(apt =>
                                    (apt.id === appointment.id || apt._id === appointment._id)
                                      ? { ...apt, status: "confirmed" }
                                      : apt
                                  ));
                                  toast.success(`Appointment with ${appointment.patientName} confirmed!`);
                                } catch (err) {
                                  toast.error(err.message || "Failed to confirm");
                                }
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 sm:py-2 text-sm sm:text-xs font-bold text-white bg-gradient-to-r from-primary to-blue-600 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                            >
                              <IoCheckmarkCircleOutline className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                              <span>Confirm</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleCancelClick(e, appointment)}
                              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 sm:py-2 text-sm sm:text-xs font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-all active:scale-[0.98]"
                            >
                              <IoCloseCircleOutline className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                              <span>Cancel</span>
                            </button>
                          </>
                        )}

                        {/* For confirmed appointments - Show Complete only */}
                        {appointment.status === "confirmed" && (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (window.confirm(`Mark appointment with ${appointment.patientName} as completed?`)) {
                                try {
                                  await updateQueueStatus(appointment._id || appointment.id, "completed");
                                  setAppointments(prev => prev.map(apt =>
                                    (apt.id === appointment.id || apt._id === appointment._id)
                                      ? { ...apt, status: "completed" }
                                      : apt
                                  ));
                                  toast.success("Appointment completed! Earnings added to wallet.");
                                } catch (err) {
                                  toast.error(err.message || "Failed to complete");
                                }
                              }
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 sm:py-2 text-sm sm:text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                          >
                            <IoCheckmarkCircleOutline className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                            <span>Mark as Completed</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Rescheduled Notice */}
                    {appointment.isRescheduled && appointment.rescheduleReason && (
                      <div className="rounded-xl sm:rounded-lg border border-blue-200 bg-blue-50 p-2.5 sm:p-1.5">
                        <div className="flex items-start gap-2 sm:gap-1">
                          <IoInformationCircleOutline className="h-4 w-4 sm:h-3 sm:w-3 text-blue-600 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-[9px] font-semibold text-blue-800 mb-0.5">
                              Rescheduled
                            </p>
                            <p className="text-[11px] sm:text-[8px] text-blue-700 line-clamp-2">
                              {appointment.rescheduleReason}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cancelled Reason */}
                    {appointment.status === "cancelled" && appointment.cancelReason && (
                      <div className="rounded-xl sm:rounded-lg border border-red-200 bg-red-50 p-2.5 sm:p-1.5">
                        <div className="flex items-start gap-2 sm:gap-1">
                          <IoCloseCircleOutline className="h-4 w-4 sm:h-3 sm:w-3 text-red-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs sm:text-[9px] font-semibold text-red-800">
                              Cancelled by{" "}
                              {appointment.cancelledBy === "doctor"
                                ? "Doctor"
                                : "Patient"}
                            </p>
                            <p className="text-[11px] sm:text-[8px] text-red-700 line-clamp-2">
                              Reason: {appointment.cancelReason}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Details Row */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:gap-x-2 sm:gap-y-1 text-xs sm:text-[10px] text-slate-600 mt-1 p-2.5 sm:p-0 bg-slate-50 sm:bg-transparent rounded-xl sm:rounded-none">
                      <div className="flex items-center gap-1.5 sm:gap-1">
                        <IoCalendarOutline className="h-4 w-4 sm:h-3 sm:w-3 text-primary shrink-0" />
                        <span className="font-semibold text-slate-800">
                          {formatDate(appointment.localDate || appointment.date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-1">
                        <IoTimeOutline className="h-4 w-4 sm:h-3 sm:w-3 text-primary shrink-0" />
                        <span className="font-semibold text-slate-800">{formatTime(appointment.time)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-1">
                        <TypeIcon className="h-4 w-4 sm:h-3 sm:w-3 text-primary shrink-0" />
                        <span className="text-slate-700">{appointment.type}</span>
                      </div>
                      {appointment.duration ? (
                        <div className="flex items-center gap-1.5 sm:gap-1">
                          <span className="text-slate-700">{appointment.duration}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 sm:gap-1">
                          <IoDocumentTextOutline className="h-4 w-4 sm:h-3 sm:w-3 text-primary shrink-0" />
                          <span className="text-slate-700">{appointment.appointmentType}</span>
                        </div>
                      )}
                    </div>

                    {/* Payment Status Info */}
                    {(appointment.paymentStatus || appointment.paymentMethod === "cod") && (
                      <div className="mt-2 space-y-1">
                        {appointment.paymentStatus === "partial" && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <IoCardOutline className="h-3.5 w-3.5 text-amber-600" />
                                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-tight">Slot Confirmed</span>
                              </div>
                              <span className="text-xs font-black text-amber-700">₹{appointment.paidAmount} Paid</span>
                            </div>
                            <div className="mt-1 flex justify-between items-center text-[10px] text-amber-600 font-medium">
                              <span>Remaining at clinic:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold">₹{appointment.remainingAmount}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleMarkAsPaid(appointment); }}
                                  className="bg-amber-600 text-white px-1.5 py-0.5 rounded text-[9px] font-bold hover:bg-amber-700 transition-colors flex items-center gap-1 shadow-sm"
                                >
                                  <IoCashOutline className="h-2 w-2" />
                                  Mark Received
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {appointment.paymentStatus === "paid" && (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2">
                            <div className="flex items-center gap-1.5">
                              <IoCheckmarkCircleOutline className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-tight">Full Payment Done</span>
                              <span className="ml-auto text-xs font-black text-emerald-700">₹{appointment.fee}</span>
                            </div>
                          </div>
                        )}

                        {appointment.paymentMethod === "cod" && appointment.paymentStatus !== "paid" && (
                          <div className="rounded-xl border border-blue-200 bg-blue-50 p-2">
                            <div className="flex items-center gap-1.5">
                              <IoWalletOutline className="h-3.5 w-3.5 text-blue-600" />
                              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-tight">Pay at Clinic</span>
                              <span className="ml-auto text-xs font-black text-blue-700">₹{appointment.fee}</span>
                            </div>
                            {appointment.status !== "cancelled" && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMarkAsPaid(appointment); }}
                                className="mt-1.5 w-full bg-blue-600 text-white py-1 rounded text-[9px] font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 shadow-sm"
                              >
                                <IoCashOutline className="h-2.5 w-2.5" />
                                Mark Full Payment Received
                              </button>
                            )}
                          </div>
                        )}

                        {appointment.paymentStatus === "free" && (
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-2">
                            <div className="flex items-center gap-1.5">
                              <IoGiftOutline className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tight">Free Consultation</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>


        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4">
            <Pagination
              currentPage={pagination.page || page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              itemsPerPage={pagination.limit || limit}
              onPageChange={(newPage) => {
                setPage(newPage);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              loading={loading}
            />
          </div>
        )}
      </section>

      {/* Cancel Appointment Modal */}
      {showCancelModal && appointmentToCancel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm"
          onClick={handleCloseCancelModal}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <IoCloseCircleOutline className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Cancel Appointment
                  </h2>
                  <p className="text-xs text-slate-600">
                    Patient: {appointmentToCancel.patientName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseCancelModal}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
              >
                <IoCloseOutline className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                  <IoCalendarOutline className="h-4 w-4 text-slate-400" />
                  <span>{formatDate(appointmentToCancel.date)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <IoTimeOutline className="h-4 w-4 text-slate-400" />
                  <span>{formatTime(appointmentToCancel.time)}</span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900">
                  Reason for Cancellation{" "}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Please provide a reason for cancelling this appointment..."
                  rows="4"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  The patient will be notified and can reschedule for a new date
                  and time.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-slate-200 p-4 sm:p-6">
              <button
                type="button"
                onClick={handleCloseCancelModal}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Keep Appointment
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={!cancelReason.trim()}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                Cancel Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DoctorAppointments;
