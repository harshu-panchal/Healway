import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  IoArrowBackOutline,
  IoCalendarOutline,
  IoTimeOutline,
  IoLocationOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoCallOutline,
  IoVideocamOutline,
  IoCardOutline,
  IoWalletOutline,
  IoGiftOutline,
} from "react-icons/io5";
import {
  getPatientAppointments,
  rescheduleAppointment,
  createAppointmentPaymentOrder,
  verifyAppointmentPayment,
} from "../patient-services/patientService";
import { useToast } from "../../../contexts/ToastContext";
import { getSocket } from "../../../utils/socketClient";
import Pagination from "../../../components/Pagination";
import AppointmentDetailsModal from "../patient-components/AppointmentDetailsModal";

// Default appointments (will be replaced by API data)
const defaultAppointments = [];

// Map backend status to frontend display status
const mapBackendStatusToDisplay = (status, paymentStatus, paymentMethod) => {
  // Payment pending has highest priority, EXCEPT for COD
  if (paymentStatus === "pending" && paymentMethod !== "cod") return "pending";

  switch (status) {
    case "scheduled":
      return "scheduled";
    case "confirmed":
      return "confirmed";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    case "rescheduled":
      return "rescheduled";
    case "pending_payment":
      return "pending";
    default:
      return status || "scheduled";
  }
};

// Helper function to convert time to 12-hour format
const convertTimeTo12Hour = (timeStr) => {
  if (!timeStr) return "";
  // If already in 12-hour format (contains AM/PM), return as is
  if (timeStr.includes("AM") || timeStr.includes("PM")) {
    return timeStr;
  }
  // Convert 24-hour format to 12-hour format
  const [hours, minutes] = timeStr.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return timeStr;
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
};


const getStatusColor = (status, paymentStatus, paymentMethod) => {
  const displayStatus = mapBackendStatusToDisplay(status, paymentStatus, paymentMethod);

  switch (displayStatus) {
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "confirmed":
      return "bg-blue-100 text-blue-700";
    case "scheduled":
      return "bg-indigo-100 text-indigo-700";
    case "completed":
      return "bg-emerald-100 text-emerald-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    case "rescheduled":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const getStatusIcon = (status, paymentStatus, paymentMethod) => {
  const displayStatus = mapBackendStatusToDisplay(status, paymentStatus, paymentMethod);
  switch (displayStatus) {
    case "confirmed":
      return <IoCheckmarkCircleOutline className="h-4 w-4" />;
    case "scheduled":
      return <IoCalendarOutline className="h-4 w-4" />;
    case "upcoming": // Legacy support
      return <IoCalendarOutline className="h-4 w-4" />;
    case "completed":
      return <IoCheckmarkCircleOutline className="h-4 w-4" />;
    case "cancelled":
      return <IoCloseCircleOutline className="h-4 w-4" />;
    default:
      return null;
  }
};

const PatientAppointments = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const [appointments, setAppointments] = useState(defaultAppointments);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal state
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Handler to open details modal
  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  };

  // Fetch appointments from API - Always fetch all appointments, filter on frontend
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        setError(null);
        // Always fetch all appointments including cancelled, we'll filter on frontend
        // Pass empty object to get all appointments (backend will include cancelled)
        const response = await getPatientAppointments({});
        console.log(response);
        if (response && response.items) {
          // Handle both array and object with items/appointments property
          let appointmentsData = [];

          if (Array.isArray(response.items)) {
            appointmentsData = response.items;
          } else if (response.items && Array.isArray(response.items)) {
            appointmentsData = response.items;
          } else if (
            response.data.appointments &&
            Array.isArray(response.data.appointments)
          ) {
            appointmentsData = response.data.appointments;
          } else {
            appointmentsData = [];
          }

          // Transform API data to match component structure
          const transformedAppointments = appointmentsData.map((apt) => ({
            id: apt._id || apt.id,
            _id: apt._id || apt.id,
            doctor: apt.doctorId
              ? {
                id: apt.doctorId._id || apt.doctorId.id,
                name:
                  apt.doctorId.firstName && apt.doctorId.lastName
                    ? `Dr. ${apt.doctorId.firstName} ${apt.doctorId.lastName}`
                    : apt.doctorId.name || "Dr. Unknown",
                specialty:
                  apt.doctorId.specialization || apt.doctorId.specialty || "",
                image:
                  apt.doctorId.profileImage ||
                  apt.doctorId.image ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(apt.doctorId.firstName || "Doctor")}&background=0077C2&color=fff&size=128&bold=true`,
              }
              : apt.doctor || {},
            date: apt.appointmentDate || apt.date,
            time: convertTimeTo12Hour(apt.time || ""),
            status: apt.status || "scheduled",
            type: apt.appointmentType || apt.type || "In-Person",
            clinic:
              apt.doctorId?.clinicDetails?.name ||
              apt.clinicDetails?.name ||
              apt.clinic ||
              "",
            location: (() => {
              const doctorClinic = apt.doctorId?.clinicDetails;
              if (doctorClinic?.address) {
                const parts = [];
                if (doctorClinic.address.line1)
                  parts.push(doctorClinic.address.line1);
                if (doctorClinic.address.city)
                  parts.push(doctorClinic.address.city);
                if (doctorClinic.address.state)
                  parts.push(doctorClinic.address.state);
                if (doctorClinic.address.pincode)
                  parts.push(doctorClinic.address.pincode);
                return parts.join(", ").trim();
              }
              const aptClinic = apt.clinicDetails;
              if (aptClinic?.address) {
                const parts = [];
                if (aptClinic.address.line1)
                  parts.push(aptClinic.address.line1);
                if (aptClinic.address.city) parts.push(aptClinic.address.city);
                if (aptClinic.address.state)
                  parts.push(aptClinic.address.state);
                if (aptClinic.address.pincode)
                  parts.push(aptClinic.address.pincode);
                return parts.join(", ").trim();
              }
              return apt.location || "";
            })(),
            token: apt.tokenNumber
              ? `Token #${apt.tokenNumber}`
              : apt.token || null,
            fee: apt.fee || apt.consultationFee || 0,
            paidAmount: apt.paidAmount || 0,
            remainingAmount: apt.remainingAmount || 0,
            paymentStatus: apt.paymentStatus || "pending",
            paymentMethod: apt.paymentMethod,
            cancelledBy: apt.cancelledBy,
            cancelledAt: apt.cancelledAt,
            cancelReason: apt.cancellationReason || apt.cancelReason,
            rescheduledAt: apt.rescheduledAt,
            rescheduledBy: apt.rescheduledBy,
            rescheduleReason: apt.rescheduleReason,
            isRescheduled: !!apt.rescheduledAt,
            sessionId: apt.sessionId,
            expectedTime: apt.expectedTime,
            consultationMode: (() => {
              // Get mode from either field and normalize to lowercase
              const rawMode = (apt.consultationMode || apt.appointmentType || apt.type || "").toLowerCase();

              if (rawMode.includes("video")) return "video_call";
              if (rawMode.includes("voice") || rawMode.includes("call") || rawMode.includes("online") || rawMode.includes("audio")) return "voice_call";

              return "in-person";
            })(),
            originalData: apt,
          }));

          setAppointments(transformedAppointments);
        }
      } catch (err) {
        console.error("Error fetching appointments:", err);
        if (
          err.message?.includes("Too many requests") ||
          err.response?.status === 429
        ) {
          setError(
            "Too many requests. Please wait a moment and refresh the page.",
          );
        } else {
          setError(err.message || "Failed to load appointments");
          toast.error("Failed to load appointments");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();

    const handleAppointmentBooked = () => {
      setTimeout(() => {
        fetchAppointments();
      }, 300);
    };
    window.addEventListener("appointmentBooked", handleAppointmentBooked);

    return () => {
      window.removeEventListener("appointmentBooked", handleAppointmentBooked);
    };
  }, [toast]);

  const handleRescheduleAppointment = (appointmentId, doctorId) => {
    navigate(`/patient/doctors/${doctorId}?reschedule=${appointmentId}`);
  };

  const handleCompletePayment = async (appointment) => {
    try {
      const appointmentId = appointment.id || appointment._id;
      const paymentOrderResponse =
        await createAppointmentPaymentOrder(appointmentId);
      if (!paymentOrderResponse.success) {
        toast.error(
          paymentOrderResponse.message ||
          "Failed to create payment order. Please try again.",
        );
        return;
      }
      const { orderId, amount, currency, razorpayKeyId } =
        paymentOrderResponse.data;
      if (!window.Razorpay) {
        toast.error(
          "Payment gateway not loaded. Please refresh the page and try again.",
        );
        return;
      }
      const options = {
        key: razorpayKeyId,
        amount: Math.round(amount * 100),
        currency: currency || "INR",
        name: "Healway",
        description: `Appointment payment for ${appointment.doctor.name}`,
        order_id: orderId,
        handler: async (response) => {
          try {
            const verifyResponse = await verifyAppointmentPayment(
              appointmentId,
              {
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature,
                paymentMethod: "razorpay",
              },
            );
            if (verifyResponse.success) {
              toast.success("Payment successful! Appointment confirmed.");
              window.dispatchEvent(new CustomEvent("appointmentBooked"));
            } else {
              toast.error(
                verifyResponse.message || "Payment verification failed.",
              );
            }
          } catch (error) {
            console.error("Error verifying payment:", error);
            toast.error(
              error.message ||
              "Error verifying payment. Please contact support.",
            );
          }
        },
        prefill: { name: "", email: "", contact: "" },
        theme: { color: "var(--color-primary)" },
        modal: { ondismiss: () => { } },
      };
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error(
        error.message || "Error processing payment. Please try again.",
      );
    }
  };

  const filteredAppointments = useMemo(() => {
    if (!appointments?.length) return [];

    return appointments.filter((apt) => {
      const displayStatus = mapBackendStatusToDisplay(
        apt.status,
        apt.paymentStatus,
        apt.paymentMethod
      );

      switch (filter) {
        case "all":
          return true;

        case "pending":
          return displayStatus === "pending";

        case "scheduled":
          return displayStatus === "scheduled" || displayStatus === "confirmed";

        case "rescheduled":
          return displayStatus === "rescheduled";

        case "completed":
          return displayStatus === "completed";

        case "cancelled":
          return displayStatus === "cancelled";

        default:
          return true;
      }
    });
  }, [appointments, filter]);

  const paginatedAppointments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAppointments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAppointments, currentPage]);

  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const totalItems = filteredAppointments.length;

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <section className="flex flex-col gap-4 pb-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          "all",
          "pending",
          "scheduled",
          // "rescheduled",
          "completed",
          "cancelled",
        ].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${filter === status
              ? "bg-primary text-white shadow-sm shadow-[rgba(0,119,194,0.2)]"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
          >
            {status === "pending"
              ? "To Pay"
              : status === "scheduled"
                ? "Scheduled"
                : status === "rescheduled"
                  ? "Rescheduled"
                  : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      <div className="space-y-3">
        {paginatedAppointments.map((appointment) => {
          const displayStatus = mapBackendStatusToDisplay(appointment.status, appointment.paymentStatus, appointment.paymentMethod);
          const isPendingPayment =
            appointment.paymentStatus === "pending" &&
            appointment.paymentMethod !== "cod" &&
            displayStatus !== "cancelled";
          const statusText =
            displayStatus === "cancelled"
              ? "Cancelled"
              : isPendingPayment
                ? "Pending Payment"
                : appointment.isRescheduled
                  ? "Rescheduled"
                  : displayStatus === "scheduled"
                    ? "Scheduled"
                    : displayStatus.charAt(0).toUpperCase() +
                    displayStatus.slice(1);

          return (
            <article
              key={appointment.id}
              className="rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md border-slate-200 bg-white"
            >
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <img
                    src={appointment.doctor.image}
                    alt={appointment.doctor.name}
                    className="h-16 w-16 rounded-2xl object-cover ring-2 ring-slate-100 bg-slate-100"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(appointment.doctor.name)}&background=0077C2&color=fff&size=128&bold=true`;
                    }}
                  />
                  {(displayStatus === "confirmed" ||
                    displayStatus === "scheduled" ||
                    appointment.status === "upcoming") && (
                      <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 ring-2 ring-white">
                        <IoCalendarOutline className="h-3 w-3 text-white" />
                      </span>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {appointment.doctor.name}
                      </h3>
                      <p className="text-sm text-primary">
                        {appointment.doctor.specialty}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusColor(
                        appointment.status,
                        appointment.paymentStatus,
                        appointment.paymentMethod
                      )}`}
                    >
                      {getStatusIcon(appointment.status, appointment.paymentStatus, appointment.paymentMethod)}
                      {statusText}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <IoCalendarOutline className="h-4 w-4 shrink-0 text-slate-400" />
                      <span>{formatDate(appointment.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <IoTimeOutline className="h-4 w-4 shrink-0 text-slate-400" />
                      <span>
                        {appointment.expectedTime
                          ? convertTimeTo12Hour(appointment.expectedTime)
                          : appointment.time}
                      </span>
                      {appointment.token && (
                        <span className="ml-2 rounded-full bg-[rgba(0,119,194,0.1)] px-2 py-0.5 text-xs font-semibold text-primary">
                          {appointment.token}
                        </span>
                      )}
                    </div>
                    {(appointment.location || appointment.clinic) && (
                      <div className="flex items-center gap-2">
                        <IoLocationOutline className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate">
                          {appointment.location ||
                            appointment.clinic ||
                            "Location not available"}
                        </span>
                      </div>
                    )}
                    {/* Payment Status Summary */}
                    {(appointment.paymentStatus || appointment.paymentMethod === "cod") && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        {appointment.paymentStatus === "partial" && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <IoCardOutline className="h-4 w-4 text-amber-600" />
                                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-tight">Slot Confirmed</span>
                              </div>
                              <span className="text-xs font-black text-amber-700">₹{appointment.paidAmount} Paid</span>
                            </div>
                            <div className="mt-1 flex justify-between items-center text-[10px] text-amber-600 font-medium">
                              <span>Pay remaining at clinic:</span>
                              <span className="font-bold">₹{appointment.remainingAmount}</span>
                            </div>
                          </div>
                        )}

                        {appointment.paymentStatus === "paid" && (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <IoCheckmarkCircleOutline className="h-4 w-4 text-emerald-600" />
                                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-tight">Full Payment Done</span>
                              </div>
                              <span className="text-xs font-black text-emerald-700">₹{appointment.fee}</span>
                            </div>
                          </div>
                        )}

                        {appointment.paymentMethod === "cod" && appointment.paymentStatus !== "paid" && (
                          <div className="rounded-xl border border-blue-200 bg-blue-50 p-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <IoWalletOutline className="h-4 w-4 text-blue-600" />
                                <span className="text-[11px] font-bold text-blue-800 uppercase tracking-tight">Pay at Clinic</span>
                              </div>
                              <span className="text-xs font-black text-blue-700">₹{appointment.fee}</span>
                            </div>
                          </div>
                        )}

                        {appointment.paymentStatus === "free" && (
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5">
                            <div className="flex items-center gap-1.5">
                              <IoGiftOutline className="h-4 w-4 text-emerald-500" />
                              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-tight">Free Consultation</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-slate-500">
                        {appointment.type}
                      </span>
                      <span className={`text-sm font-semibold ${appointment.fee === 0 || appointment.paymentStatus === "free" ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {appointment.fee === 0 || appointment.paymentStatus === "free" ? 'Free' : `₹${appointment.fee}`}
                      </span>
                    </div>
                  </div>
                  {appointment.status === "cancelled" && (
                    <div className="mt-3 space-y-2">

                      {/* Cancelled by doctor info */}
                      {appointment.cancelledBy === "doctor" && (
                        <div className="rounded-lg border border-orange-200 bg-orange-50 p-2.5">
                          <p className="text-xs font-semibold text-orange-800 mb-1">
                            Cancelled by Doctor
                          </p>

                          {appointment.cancelReason && (
                            <p className="text-xs text-orange-700">
                              Reason: {appointment.cancelReason}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Reschedule button (always visible if cancelled) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRescheduleAppointment(
                            appointment.id,
                            appointment.doctor.id
                          );
                        }}
                        className="w-full rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-[rgba(0,119,194,0.2)] transition hover:bg-[var(--color-primary-dark)] active:scale-95"
                      >
                        Reschedule Appointment
                      </button>

                    </div>
                  )}


                  {(appointment.status === "confirmed" ||
                    appointment.status === "scheduled" ||
                    appointment.status === "upcoming" ||
                    isPendingPayment) && (
                      <div className="flex gap-2 mt-3">
                        {isPendingPayment ? (
                          <button
                            onClick={() => handleCompletePayment(appointment)}
                            className="flex-1 rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-amber-200 transition hover:bg-amber-700 active:scale-95"
                          >
                            Complete Payment
                          </button>
                        ) : (
                          <button
                            onClick={() => handleViewDetails(appointment)}
                            className="flex-1 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-[rgba(0,119,194,0.2)] transition hover:bg-[var(--color-primary-dark)] active:scale-95"
                          >
                            View Details
                          </button>
                        )}
                        {/* {!appointment.isRescheduled && !isPendingPayment && (
                        <button
                          onClick={() =>
                            handleRescheduleAppointment(
                              appointment.id,
                              appointment.doctor.id,
                            )
                          }
                          className="flex-1 rounded-xl border border-primary bg-white px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/5 active:scale-95"
                        >
                          Reschedule
                        </button>
                      )} */}
                        {isPendingPayment && (
                          <button
                            onClick={() =>
                              navigate(
                                `/patient/doctors/${appointment.doctor.id}`,
                              )
                            }
                            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-95"
                          >
                            Details
                          </button>
                        )}
                      </div>
                    )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {!loading && filteredAppointments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
            <IoCalendarOutline className="h-8 w-8" />
          </div>
          <p className="text-lg font-semibold text-slate-700">
            {appointments && appointments.length > 0
              ? `No ${filter === "all" ? "" : filter.charAt(0).toUpperCase() + filter.slice(1)} appointments found`
              : "No appointments available"}
          </p>
          {appointments && appointments.length > 0 && (
            <p className="text-sm text-slate-500 mt-1">
              Try selecting a different filter
            </p>
          )}
        </div>
      )}

      {!loading && filteredAppointments.length > 0 && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          loading={loading}
        />
      )}

      {/* Appointment Details Modal */}
      <AppointmentDetailsModal
        open={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        appointment={selectedAppointment}
      />
    </section>
  );
};

export default PatientAppointments;
