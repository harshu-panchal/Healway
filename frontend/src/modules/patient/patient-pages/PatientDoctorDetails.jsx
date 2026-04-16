import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  IoArrowBackOutline,
  IoLocationOutline,
  IoCalendarOutline,
  IoTimeOutline,
  IoCallOutline,
  IoVideocamOutline,
  IoCheckmarkCircleOutline,
  IoCloseOutline,
  IoPersonOutline,
  IoCardOutline,
  IoCheckmarkCircle,
  IoInformationCircleOutline,
  IoStar,
  IoImageOutline,
  IoMedicalOutline,
  IoLanguageOutline,
  IoSchoolOutline,
} from "react-icons/io5";
import {
  Modal,
  Steps,
  Radio,
  Card,
  DatePicker,
  Button,
  Space,
  Descriptions,
  Tag,
  Alert,
  Form,
  Input,
} from "antd";
import {
  UserOutlined,
  CalendarOutlined,
  PhoneOutlined,
  VideoCameraOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CreditCardOutlined,
  InfoCircleOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  getDoctorById,
  bookAppointment,
  getPatientAppointments,
  getPatientProfile,
  getPatientPrescriptions,
  checkDoctorSlotAvailability,
  createAppointmentPaymentOrder,
  verifyAppointmentPayment,
  rescheduleAppointment,
  cancelAppointment,
} from "../patient-services/patientService";
import { useToast } from "../../../contexts/ToastContext";
import { formatPrice, isFreeConsultation } from "../../../utils/feeUtils";
import { getFileUrl } from "../../../utils/apiClient";

// Default doctor data (will be replaced by API)
const defaultDoctor = null;

// Helper function to convert 24-hour format to 12-hour format (or return as is if already 12-hour)
const convertTo12Hour = (time) => {
  if (!time) return "";

  // If already in 12-hour format (contains AM/PM), return as is
  if (time.toString().includes("AM") || time.toString().includes("PM")) {
    return time;
  }

  // Handle both "HH:MM" and "HH:MM:SS" formats (24-hour format)
  const [hours, minutes] = time.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return time;

  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
  const minutesStr = minutes.toString().padStart(2, "0");

  return `${hours12}:${minutesStr} ${period}`;
};

// Helper function to format availability
const formatAvailability = (availability) => {
  if (
    !availability ||
    !Array.isArray(availability) ||
    availability.length === 0
  ) {
    return "Available";
  }

  // Filter out entries without day or time
  const validAvailability = availability.filter(
    (av) => av.day && av.startTime && av.endTime,
  );

  if (validAvailability.length === 0) return "Available";

  // Group by time slots (same start and end time)
  const timeGroups = {};
  validAvailability.forEach((av) => {
    const timeKey = `${av.startTime}-${av.endTime}`;
    if (!timeGroups[timeKey]) {
      timeGroups[timeKey] = {
        days: [],
        startTime: av.startTime,
        endTime: av.endTime,
      };
    }
    timeGroups[timeKey].days.push(av.day);
  });

  // Format each time group
  const formattedGroups = Object.values(timeGroups).map((group) => {
    const startTime12 = convertTo12Hour(group.startTime);
    const endTime12 = convertTo12Hour(group.endTime);
    const daysStr = group.days.join(", ");
    return `${daysStr}: ${startTime12} - ${endTime12}`;
  });

  // Join all groups with line breaks or commas
  return formattedGroups.join("; ");
};

const formatEducation = (education, qualification = "") => {
  if (Array.isArray(education)) {
    const formatted = education
      .map((edu) => {
        if (!edu) return "";
        if (typeof edu === "string") return edu;
        if (typeof edu === "object") {
          const parts = [];
          if (edu.institution) parts.push(edu.institution);
          if (edu.degree) parts.push(edu.degree);
          if (edu.year) parts.push(`(${edu.year})`);
          return parts.join(" - ");
        }
        return String(edu);
      })
      .filter(Boolean);

    return formatted.length > 0 ? formatted.join(", ") : qualification || "MBBS";
  }

  if (education && typeof education === "object") {
    const parts = [];
    if (education.institution) parts.push(education.institution);
    if (education.degree) parts.push(education.degree);
    if (education.year) parts.push(`(${education.year})`);
    return parts.join(" - ") || qualification || "MBBS";
  }

  if (typeof education === "string" && education.trim()) {
    return education.trim();
  }

  return qualification || "MBBS";
};

// Get available dates filtered by doctor's working days
const getAvailableDates = (doctor, mode) => {
  if (!doctor) return [];

  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // NEW LOGIC: Session timing days determine booking availability
  // Fees structure days determine if payment is required
  // Use session timing days (availabilitySlots.selectedDays) for available dates
  let workingDays = [];
  const normalized = normalizeConsultationMode(mode);

  // Use session timing days (availabilitySlots.selectedDays) for booking availability
  const sessionTimingDays = doctor.availabilitySlots?.selectedDays;

  if (Array.isArray(sessionTimingDays) && sessionTimingDays.length > 0) {
    workingDays = sessionTimingDays;
  }

  // If no specific days are set, fallback to old availability structure
  if (workingDays.length === 0) {
    if (doctor.availability && Array.isArray(doctor.availability)) {
      workingDays = doctor.availability.map((a) => a.day);
    }
  }

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  // Generate next 30 days but only include working days
  for (let i = 0; i < 30; i++) {
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + i,
    );
    const dayName = dayNames[date.getDay()];

    // Strictly skip Sunday if it's not a specified working day
    if (dayName === "Sunday" && !workingDays.includes("Sunday")) continue;

    // Only add if it's a working day
    if (workingDays.length === 0 || workingDays.includes(dayName)) {
      dates.push({
        value: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`,
        label: date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        isToday: i === 0,
        isTomorrow: i === 1,
      });
    }

    // Stop after getting 14 available dates
    if (dates.length >= 14) break;
  }
  return dates;
};

// Helper function to check if doctor is active
// Doctor active status is determined by the doctor data from API
const isDoctorActive = (doctorData) => {
  // Check if doctorData is an object with isActive property
  if (doctorData && typeof doctorData === "object") {
    return doctorData.isActive !== false && doctorData.status === "approved";
  }
  // Default to true if doctorData is not an object (backward compatibility)
  return true;
};

// Helper to normalize consultation mode
const normalizeConsultationMode = (mode) => {
  if (!mode) return "IN_PERSON";
  const m = mode.toUpperCase();
  if (m === "CALL" || m === "VOICE_CALL" || m === "VOICE") return "CALL";
  if (m === "VIDEO" || m === "VIDEO_CALL") return "VIDEO";
  if (m === "IN_PERSON" || m === "INPERSON" || m === "CLINIC")
    return "IN_PERSON";
  return "IN_PERSON";
};

// Get consultation fee based on mode
const getConsultationFee = (mode, doctor) => {
  if (!doctor || !doctor.fees) return 0;
  const normalized = normalizeConsultationMode(mode);
  if (normalized === "IN_PERSON") return doctor.fees?.inPerson?.final || 0;
  if (normalized === "CALL") return doctor.fees?.voiceCall?.final || 0;
  if (normalized === "VIDEO") return doctor.fees?.videoCall?.final || 0;
  return doctor.consultationFee || 0;
};

// Calculate approximate time based on start time and token number
const calculateApproxTime = (startTime, tokenNumber, avgMinutes = 20) => {
  if (!startTime || !tokenNumber) return null;

  // Handle 12-hour format (e.g., "10:00 AM")
  let hours = 0;
  let minutes = 0;

  const match = startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (match) {
    hours = parseInt(match[1], 10);
    minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();

    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
  } else {
    // Try 24-hour format
    const match24 = startTime.match(/(\d+):(\d+)/);
    if (match24) {
      hours = parseInt(match24[1], 10);
      minutes = parseInt(match24[2], 10);
    }
  }

  // Calculate total minutes from midnight
  const startTotalMinutes = hours * 60 + minutes;
  const appointmentTotalMinutes =
    startTotalMinutes + (tokenNumber - 1) * avgMinutes;

  // Convert back to 12-hour format
  const appHours = Math.floor(appointmentTotalMinutes / 60) % 24;
  const appMinutes = appointmentTotalMinutes % 60;
  const appPeriod = appHours >= 12 ? "PM" : "AM";
  const appHours12 = appHours % 12 || 12;

  return `${appHours12}:${appMinutes.toString().padStart(2, "0")} ${appPeriod}`;
};

const PatientDoctorDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [doctor, setDoctor] = useState(defaultDoctor);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log("doctor", doctor)
  // Fetch doctor details from API
  useEffect(() => {
    const fetchDoctorDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // Validate ID before making API call
        if (!id || !String(id).trim()) {
          console.error("Invalid doctor ID:", id);
          setError("Invalid doctor ID");
          toast.error("Invalid doctor ID");
          navigate("/patient/doctors");
          return;
        }

        // getDoctorById returns response.data from apiClient
        // Backend returns: { success: true, data: { doctor } }
        // apiClient.get returns: { success: true, data: { doctor } }
        // getDoctorById checks response.success and returns response.data which is { doctor }
        // So apiResponse should be { doctor: {...} }
        const apiResponse = await getDoctorById(id);

        console.log("🔍 API Response received:", {
          id,
          apiResponse,
          type: typeof apiResponse,
          isArray: Array.isArray(apiResponse),
          keys: apiResponse ? Object.keys(apiResponse) : [],
          hasDoctor: !!apiResponse?.doctor,
          hasId: !!(apiResponse?._id || apiResponse?.id),
          doctorHasId: !!(apiResponse?.doctor?._id || apiResponse?.doctor?.id),
        });

        // Handle different response structures
        let doctorData = null;
        if (
          apiResponse &&
          typeof apiResponse === "object" &&
          !Array.isArray(apiResponse)
        ) {
          // Priority 1: If response has doctor property (expected structure: { doctor: {...} })
          if (
            apiResponse.doctor &&
            typeof apiResponse.doctor === "object" &&
            (apiResponse.doctor._id || apiResponse.doctor.id)
          ) {
            doctorData = apiResponse.doctor;
            console.log("✅ Extracted doctor from apiResponse.doctor");
          }
          // Priority 2: If response itself is the doctor object (has _id or id)
          else if (apiResponse._id || apiResponse.id) {
            doctorData = apiResponse;
            console.log("✅ Using apiResponse as doctor object directly");
          }
          // Priority 3: If response has data property with doctor
          else if (apiResponse.data) {
            doctorData = apiResponse.data.doctor || apiResponse.data;
            console.log("✅ Extracted doctor from apiResponse.data");
          }
        }

        // Validate doctorData exists and has an ID
        if (!doctorData || (!doctorData._id && !doctorData.id)) {
          console.error("❌ Invalid doctor data received:", {
            id,
            apiResponse,
            doctorData,
            apiResponseKeys: apiResponse ? Object.keys(apiResponse) : [],
            apiResponseType: typeof apiResponse,
          });
          setError("Doctor not found");
          toast.error("Doctor not found");
          setLoading(false);
          return;
        }

        console.log("✅ Doctor data extracted successfully:", {
          id: doctorData._id || doctorData.id,
          name: `${doctorData.firstName || ""} ${doctorData.lastName || ""}`.trim(),
          status: doctorData.status,
          isActive: doctorData.isActive,
          hasClinicDetails: !!doctorData.clinicDetails,
        });

        if (doctorData) {
          const transformed = {
            id: doctorData._id || doctorData.id,
            _id: doctorData._id || doctorData.id,
            name:
              doctorData.firstName && doctorData.lastName
                ? `Dr. ${doctorData.firstName} ${doctorData.lastName}`
                : doctorData.name ||
                (doctorData.firstName
                  ? `Dr. ${doctorData.firstName}`
                  : "Dr. Unknown"),
            specialty:
              doctorData.specialization || doctorData.specialty || "General",
            experience: doctorData.experienceYears
              ? `${doctorData.experienceYears} years`
              : doctorData.experience || "N/A",
            original_fees: doctorData.original_fees || 0,
            discount_amount: doctorData.discount_amount || 0,
            consultationFee: doctorData.consultationFee || 0,
            distance: doctorData.distance || "N/A",
            location: (() => {
              if (!doctorData.clinicDetails)
                return doctorData.location || "Location not available";

              const parts = [];
              if (doctorData.clinicDetails.name)
                parts.push(doctorData.clinicDetails.name);

              if (doctorData.clinicDetails.address) {
                const addr = doctorData.clinicDetails.address;
                if (addr.line1) parts.push(addr.line1);
                if (addr.line2) parts.push(addr.line2);
                if (addr.city) parts.push(addr.city);
                if (addr.state) parts.push(addr.state);
                if (addr.postalCode) parts.push(addr.postalCode);
                if (addr.country) parts.push(addr.country);
              }

              return parts.length > 0
                ? parts.join(", ")
                : "Location not available";
            })(),
            clinicName: doctorData.clinicDetails?.name || "",
            clinicAddress: doctorData.clinicDetails?.address || {},
            clinicImages: doctorData.clinicDetails?.images ? doctorData.clinicDetails.images.map(img => getFileUrl(img.url || img)) : [],
            availability:
              doctorData.availability && doctorData.availability.length > 0
                ? formatAvailability(doctorData.availability)
                : "Available",
            nextSlot: null,
            image:
              doctorData.profileImage ||
              doctorData.documents?.profileImage ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(doctorData.firstName && doctorData.lastName ? `${doctorData.firstName} ${doctorData.lastName}` : doctorData.firstName || "Doctor")}&background=0077C2&color=fff&size=128&bold=true`,
            languages: doctorData.languages || ["English"],
            education: formatEducation(
              doctorData.education,
              doctorData.qualification,
            ),
            about: doctorData.bio || doctorData.about || "",
            phone: doctorData.phone || doctorData.clinicDetails?.phone || "N/A",
            fees: doctorData.fees || {},
            availabilitySlots: doctorData.availabilitySlots || null,
            services: doctorData.services || [],
            consultationModes: doctorData.consultationModes || [],
            averageConsultationMinutes:
              doctorData.averageConsultationMinutes || 20,
            isDoctor: doctorData.isDoctor,
            originalData: doctorData,
          };
          // Check if doctor is active and approved BEFORE setting state
          if (
            doctorData.isActive === false ||
            doctorData.status !== "approved"
          ) {
            console.warn("Doctor is not active or not approved:", {
              id: doctorData._id,
              isActive: doctorData.isActive,
              status: doctorData.status,
            });
            setError("This doctor profile is currently not available.");
            toast.error("This doctor profile is currently not available.");
            setLoading(false);
            // Don't navigate immediately - let user see the error or add a back button
            setTimeout(() => {
              navigate("/patient/doctors", { replace: true });
            }, 2000);
            return;
          }

          setDoctor(transformed);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching doctor details:", err);
        setError(err.message || "Failed to load doctor details");
        toast.error(err.message || "Failed to load doctor details");
        setLoading(false);
        // Don't navigate immediately on error, show error state
        // User can use back button or we can add a back button in UI
      }
    };

    if (id && String(id).trim()) {
      fetchDoctorDetails();
    } else {
      console.error("Invalid doctor ID in URL:", id);
      setError("Invalid doctor ID");
      setLoading(false);
    }
  }, [id, navigate, toast]);

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showQuickBookConfirmation, setShowQuickBookConfirmation] = useState(false); // Quick book popup
  const [selectedDate, setSelectedDate] = useState("");
  // Removed selectedTime - time will be automatically assigned by backend based on token number
  const [selectedTime, setSelectedTime] = useState(""); // Specific time slot selection
  const [appointmentType, setAppointmentType] = useState("in_person");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedPrescriptions, setSelectedPrescriptions] = useState([]); // Prescriptions to share
  const [bookingStep, setBookingStep] = useState(0); // 0: Patient, 1: Mode, 2: Schedule, 3: Confirmation
  const [paymentType, setPaymentType] = useState("full"); // 'full' or 'confirmSlot'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false); // Track if rescheduling
  const [rescheduleAppointmentId, setRescheduleAppointmentId] = useState(null); // Appointment ID to reschedule

  // New State for "Someone Else" booking
  const [bookingFor, setBookingFor] = useState("Self"); // "Self" or "Else"
  const [guestDetails, setGuestDetails] = useState({
    name: "",
    email: "",
    phone: "",
    age: "",
    gender: "Male"
  });

  const handleGuestDetailsChange = (e) => {
    const { name, value } = e.target;
    setGuestDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const [cancelledSessionDate, setCancelledSessionDate] = useState(null); // Original cancelled session date to block

  // Reset selected details when consultation mode changes
  useEffect(() => {
    setSelectedTime("");
    // Clear selection if mode changed
    if (appointmentType !== "in_person") {
      setPaymentType("full");
    }
  }, [selectedDate, appointmentType]);

  // Dynamic available dates based on doctor and consultation mode
  const availableDates = useMemo(() => {
    return getAvailableDates(doctor, appointmentType);
  }, [doctor, appointmentType]);

  // Helper function to get fee for a specific day and consultation mode
  const getFeeForDay = (date, consultationMode, timeValue = null) => {
    if (!doctor || !date) return doctor?.consultationFee || 0;

    // First check if specific slot is free (Priority 1)
    const currentTime = timeValue || selectedTime;
    if (currentTime && slotAvailability[date]) {
      const availability = slotAvailability[date];
      if (availability.timeSlots && Array.isArray(availability.timeSlots)) {
        const matchingSlot = availability.timeSlots.find(s =>
          s.time === currentTime || s.startTime === currentTime
        );
        if (matchingSlot && matchingSlot.isFree) {
          console.log("🎁 Matching slot is marked as FREE");
          return 0;
        }
      }
    }

    // Use timezone-safe parsing for YYYY-MM-DD
    let appointmentDate;
    if (typeof date === "string" && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = date.split("-").map(Number);
      appointmentDate = new Date(year, month - 1, day);
    } else {
      appointmentDate = new Date(date);
    }

    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayName = dayNames[appointmentDate.getDay()];

    // Map consultation modes to fee types
    let feeType = "inPerson";
    if (consultationMode === "video_call") feeType = "videoCall";
    if (consultationMode === "voice_call" || consultationMode === "call")
      feeType = "voiceCall";

    // Working days source of truth
    const workingDays = doctor.availabilitySlots?.selectedDays || [];
    const isWorkingDay = workingDays.includes(dayName);

    // Check if doctor has fees with selectedDays
    if (doctor.fees && doctor.fees[feeType]) {
      const feeData = doctor.fees[feeType];
      const selectedDays = feeData.selectedDays || [];

      // If day is not selected in fee days, but IS a working day, fallback to final fee
      // This prevents working days from showing as FREE just because they were missing in the fee config
      if (selectedDays.length > 0 && !selectedDays.includes(dayName)) {
        if (isWorkingDay) {
          return feeData.final || 0;
        }
        return 0; // Not a working day and not in fee days -> likely free/off
      }

      // Return the final fee if day is selected or if selectedDays is empty
      return feeData.final || 0;
    }

    // Fallback to old structure or consultationFee if it's a working day
    return isWorkingDay ? (doctor.consultationFee || 0) : 0;
  };

  // Check if patient is a returning patient (within 7 days) - using API
  const [isReturningPatient, setIsReturningPatient] = useState(false);
  const [hasDoctorCancelledAppointment, setHasDoctorCancelledAppointment] = useState(false);
  const [doctorCancelledDates, setDoctorCancelledDates] = useState([]); // Dates where doctor cancelled
  const [lastVisitData, setLastVisitData] = useState(null);
  const [patientProfile, setPatientProfile] = useState(null);

  // State to store patient-related data for this doctor
  const [appointmentsData, setAppointmentsData] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Fetch appointments once when doctor changes
  useEffect(() => {
    const fetchData = async () => {
      if (!doctor?.id && !doctor?._id) return;

      try {
        const response = await getPatientAppointments({
          doctor: doctor.id || doctor._id,
        });

        if (response.success && response.data) {
          const appointments = Array.isArray(response.data)
            ? response.data
            : response.data.items || [];
          setAppointmentsData(appointments);
          setIsDataLoaded(true);

          // Fetch patient profile to get wallet balance
          try {
            const profileResponse = await getPatientProfile();
            if (profileResponse.success) {
              setPatientProfile(profileResponse.data);
            }
          } catch (profileError) {
            console.error("Error fetching patient profile:", profileError);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    if (doctor) {
      fetchData();
    }
  }, [doctor?.id || doctor?._id]);

  // Derived states for returning patient and cancellations
  useEffect(() => {
    if (!isDataLoaded) return;

    // 1. Check for doctor-cancelled appointments for re-booking credit
    const normalizedMode = normalizeConsultationMode(appointmentType);

    // Identify all dates where doctor cancelled for this patient
    const cancelledDates = appointmentsData
      .filter(apt => apt.status === "cancelled" && apt.cancelledBy === "doctor")
      .map(apt => {
        const date = new Date(apt.appointmentDate);
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
      });

    setDoctorCancelledDates(cancelledDates);

    const doctorCancelled = appointmentsData.find((apt) => {
      const aptDoctorId = apt.doctorId?._id || apt.doctorId?.id || apt.doctorId;
      const currentDoctorId = doctor.id || doctor._id;
      const aptMode = normalizeConsultationMode(apt.consultationMode);

      return (
        aptDoctorId === currentDoctorId &&
        apt.status === "cancelled" &&
        apt.cancelledBy === "doctor" &&
        aptMode === normalizedMode &&
        (apt.paymentStatus === "paid" || apt.paymentStatus === "partial")
      );
    });

    setHasDoctorCancelledAppointment(!!doctorCancelled);

    // 2. Check for returning patient (follow-up)
    const lastAppointment = appointmentsData
      .filter((apt) => {
        const aptDoctorId = apt.doctorId?._id || apt.doctorId?.id || apt.doctorId;
        const currentDoctorId = doctor.id || doctor._id;
        return (
          aptDoctorId === currentDoctorId &&
          (apt.status === "completed" || apt.status === "visited")
        );
      })
      .sort((a, b) => {
        const dateA = new Date(a.appointmentDate || a.createdAt || 0);
        const dateB = new Date(b.appointmentDate || b.createdAt || 0);
        return dateB - dateA;
      })[0];

    if (lastAppointment) {
      const lastVisitDate = new Date(
        lastAppointment.appointmentDate || lastAppointment.createdAt,
      );
      const today = new Date();
      const diffTime = today - lastVisitDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      setIsReturningPatient(diffDays <= 7);
      setLastVisitData({
        daysSince: diffDays,
        isReturning: diffDays <= 7,
      });
    } else {
      setIsReturningPatient(false);
      setLastVisitData({ daysSince: null, isReturning: false });
    }
  }, [isDataLoaded, appointmentsData, appointmentType, doctor?._id]);

  // Synchronous helper function to check returning patient status
  const checkIsReturningPatient = (doctorId) => {
    if (!lastVisitData) {
      return { isReturning: false, daysSince: null };
    }
    return lastVisitData;
  };

  // Get doctor profile data (session time and average consultation minutes)
  const getDoctorProfileData = () => {
    try {
      const profile = JSON.parse(localStorage.getItem("doctorProfile") || "{}");
      return {
        averageConsultationMinutes: profile.averageConsultationMinutes || 20,
        availability: profile.availability || [],
        sessionStartTime: profile.sessionStartTime || "09:00",
        sessionEndTime: profile.sessionEndTime || "17:00",
      };
    } catch (error) {
      console.error("Error getting doctor profile:", error);
      return {
        averageConsultationMinutes: 20,
        availability: [],
        sessionStartTime: "09:00",
        sessionEndTime: "17:00",
      };
    }
  };

  // Calculate max tokens based on session time and average consultation minutes
  const calculateMaxTokens = (
    sessionStartTime,
    sessionEndTime,
    averageMinutes,
  ) => {
    if (!sessionStartTime || !sessionEndTime || !averageMinutes) return 0;

    const [startHour, startMin] = sessionStartTime.split(":").map(Number);
    const [endHour, endMin] = sessionEndTime.split(":").map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const durationMinutes = endMinutes - startMinutes;

    if (durationMinutes <= 0) return 0;

    return Math.floor(durationMinutes / averageMinutes);
  };

  // Function to convert time string to minutes (handles both 12-hour and 24-hour formats)
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return null;

    // Handle 12-hour format (e.g., "9:00 AM", "2:30 PM")
    const pmMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(PM|pm)/i);
    const amMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|am)/i);

    if (pmMatch) {
      let hour = parseInt(pmMatch[1], 10);
      const minute = parseInt(pmMatch[2], 10);
      if (hour !== 12) hour += 12;
      return hour * 60 + minute;
    }

    if (amMatch) {
      let hour = parseInt(amMatch[1], 10);
      const minute = parseInt(amMatch[2], 10);
      if (hour === 12) hour = 0;
      return hour * 60 + minute;
    }

    // Handle 24-hour format (e.g., "09:00", "14:30")
    const time24Match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (time24Match) {
      const hour = parseInt(time24Match[1], 10);
      const minute = parseInt(time24Match[2], 10);
      return hour * 60 + minute;
    }

    return null;
  };

  // Function to convert minutes to 12-hour format string
  const minutesTo12Hour = (minutes) => {
    if (minutes === null || minutes === undefined) return "";
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const period = hour >= 12 ? "PM" : "AM";
    let displayHour = hour % 12;
    if (displayHour === 0) displayHour = 12;
    return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
  };

  // Helper to calculate approximate time for a token
  const calculateApproxTime = (startTime, tokenNumber, avgMinutes) => {
    if (!startTime || !tokenNumber || !avgMinutes) return null;
    const startMins = timeToMinutes(startTime);
    if (startMins === null) return null;
    const approxMins = startMins + (tokenNumber - 1) * avgMinutes;
    return minutesTo12Hour(approxMins);
  };

  // Function to generate time slots based on session times
  const generateTimeSlots = (
    sessionStartTime,
    sessionEndTime,
    avgConsultationMinutes,
    bookedSlots = 0,
    maxTokens = 0,
  ) => {
    if (!sessionStartTime || !sessionEndTime || !avgConsultationMinutes)
      return [];

    const startMinutes = timeToMinutes(sessionStartTime);
    const endMinutes = timeToMinutes(sessionEndTime);

    if (
      startMinutes === null ||
      endMinutes === null ||
      startMinutes >= endMinutes
    )
      return [];

    const slots = [];
    let currentMinutes = startMinutes;
    let slotNumber = 1;

    while (currentMinutes < endMinutes) {
      const slotTime = minutesTo12Hour(currentMinutes);
      const isBooked = slotNumber <= bookedSlots;
      const isAvailable = slotNumber <= maxTokens && !isBooked;

      slots.push({
        time: slotTime,
        minutes: currentMinutes,
        slotNumber,
        isBooked,
        isAvailable,
      });

      currentMinutes += avgConsultationMinutes;
      slotNumber++;
    }

    return slots;
  };

  useEffect(() => {
    if (showBookingModal && availableDates.length > 0) {
      // Set default date to tomorrow or today if available
      const tomorrow = availableDates.find((d) => d.isTomorrow);
      if (tomorrow) {
        setSelectedDate(tomorrow.value);
      } else if (availableDates[0]) {
        setSelectedDate(availableDates[0].value);
      }
    }
  }, [showBookingModal, availableDates]);

  useEffect(() => {
    if (showBookingModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showBookingModal]);

  // Auto-open booking modal if 'book' or 'reschedule' query parameter is present
  useEffect(() => {
    if (doctor && id) {
      const rescheduleId =
        searchParams.get("reschedule") ||
        (location.state?.bookingMode === "reschedule"
          ? location.state?.rescheduleAppointmentId
          : null);

      const shouldAutoOpenBooking =
        searchParams.get("book") === "true" ||
        location.state?.autoOpenBooking === true;

      if (rescheduleId) {
        // Reschedule mode - fetch appointment details to get cancelled session date
        const fetchCancelledAppointmentDate = async () => {
          try {
            const appointmentsResponse = await getPatientAppointments({});
            if (appointmentsResponse.success && appointmentsResponse.data) {
              const appointments = Array.isArray(appointmentsResponse.data)
                ? appointmentsResponse.data
                : appointmentsResponse.data.items || [];

              const appointment = appointments.find(
                (apt) =>
                  (apt._id || apt.id) === rescheduleId &&
                  apt.status === "cancelled",
              );

              if (appointment) {
                // Get the cancelled session date
                // Priority 1: Use sessionId.date if session exists (this is the actual cancelled session date)
                // Priority 2: Use appointment.appointmentDate (original appointment date)
                let dateToBlock = null;

                // Check if sessionId exists and has date
                if (appointment.sessionId) {
                  const session = appointment.sessionId;
                  // Session date is the actual date when session was cancelled
                  if (session && session.date) {
                    const sessionDate =
                      typeof session.date === "string"
                        ? session.date.split("T")[0]
                        : new Date(session.date).toISOString().split("T")[0];
                    dateToBlock = sessionDate;
                    console.log(
                      "🚫 Found cancelled session date from session:",
                      dateToBlock,
                      { sessionStatus: session.status },
                    );
                  }
                }

                // Fallback to appointment's original date if session date not found
                if (!dateToBlock) {
                  const originalDate =
                    appointment.appointmentDate || appointment.date;
                  if (originalDate) {
                    dateToBlock =
                      typeof originalDate === "string"
                        ? originalDate.split("T")[0]
                        : new Date(originalDate).toISOString().split("T")[0];
                    console.log(
                      "🚫 Using appointment date as cancelled date:",
                      dateToBlock,
                    );
                  }
                }

                if (dateToBlock) {
                  // Set the appointment type based on the original appointment
                  if (appointment.consultationMode) {
                    const mode = appointment.consultationMode.toUpperCase();
                    if (mode === "IN_PERSON" || mode === "INPERSON") {
                      setAppointmentType("in_person");
                    } else if (mode === "VIDEO" || mode === "VIDEO_CALL") {
                      setAppointmentType("video_call");
                    } else if (mode === "CALL" || mode === "VOICE_CALL") {
                      setAppointmentType("call");
                    }
                  }

                  console.log(
                    "🚫 Blocking cancelled session date:",
                    dateToBlock,
                    {
                      appointmentId: appointment._id || appointment.id,
                      appointmentDate: appointment.appointmentDate,
                      sessionId:
                        appointment.sessionId?._id || appointment.sessionId,
                      sessionDate: appointment.sessionId?.date,
                      sessionStatus: appointment.sessionId?.status,
                    },
                  );
                  setCancelledSessionDate(dateToBlock);
                } else {
                  console.warn(
                    "⚠️ Could not determine cancelled session date for appointment:",
                    appointment,
                  );
                }
              } else {
                console.warn(
                  "⚠️ Cancelled appointment not found for rescheduleId:",
                  rescheduleId,
                );
              }
            }
          } catch (error) {
            console.error("Error fetching cancelled appointment date:", error);
          }
        };

        setIsRescheduling(true);
        setRescheduleAppointmentId(rescheduleId);
        setShowBookingModal(true);
        setBookingStep(1);
        fetchCancelledAppointmentDate();
        // Remove the query parameter or transient navigation state from URL
        navigate(`/patient/doctors/${id}`, { replace: true, state: null });
      } else if (shouldAutoOpenBooking) {
        // Normal booking mode
        setIsRescheduling(false);
        setRescheduleAppointmentId(null);
        setCancelledSessionDate(null);
        setShowBookingModal(true);
        setBookingStep(0);
        // Remove the query parameter or transient navigation state from URL
        navigate(`/patient/doctors/${id}`, { replace: true, state: null });
      }
    }
  }, [doctor, searchParams, navigate, id, location.state]);

  // Load patient prescriptions from API
  const [patientPrescriptions, setPatientPrescriptions] = useState([]);

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        const response = await getPatientPrescriptions();
        if (response.success && response.data) {
          const prescriptionsData = Array.isArray(response.data)
            ? response.data
            : response.data.prescriptions || [];
          setPatientPrescriptions(prescriptionsData);
        }
      } catch (error) {
        console.error("Error loading patient prescriptions:", error);
        setPatientPrescriptions([]);
      }
    };

    if (showBookingModal) {
      fetchPrescriptions();
    }
  }, [showBookingModal]);

  // Slot availability state (cached by date)
  const [slotAvailability, setSlotAvailability] = useState({});
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Fetch slot availability for a specific date
  const fetchSlotAvailabilityForDate = useCallback(
    async (date, doctorId, forceRefresh = false, mode = null) => {
      if (!date || !doctorId) return;

      try {
        // Normalize the mode for backend (use provided mode or current appointmentType)
        // If mode is not provided, use current appointmentType and normalize it
        const modeToUse =
          mode !== null
            ? mode
            : appointmentType
              ? normalizeConsultationMode(appointmentType)
              : "IN_PERSON";
        const normalizedMode =
          typeof modeToUse === "string" &&
            (modeToUse === "IN_PERSON" ||
              modeToUse === "CALL" ||
              modeToUse === "VIDEO")
            ? modeToUse
            : normalizeConsultationMode(modeToUse);

        const response = await checkDoctorSlotAvailability(
          doctorId,
          date,
          normalizedMode,
        );
        // Handle response structure - apiClient.get returns { success, data } or just data
        const responseData =
          response &&
            typeof response === "object" &&
            "data" in response &&
            response.data
            ? response.data
            : response && typeof response === "object" && !("data" in response)
              ? response
              : null;

        if (responseData) {
          // If session is cancelled or completed, mark date as unavailable
          const isCancelled = responseData.isCancelled || false;
          const isCompleted = responseData.isCompleted || false;
          const isSessionEnded = responseData.isSessionEnded || false;

          setSlotAvailability((prev) => {
            // If forceRefresh is true, always update. Otherwise, don't overwrite if already cached
            if (!forceRefresh && prev[date]) return prev;

            // Calculate availability: must be available, have slots, and not cancelled/completed
            // For IN_PERSON: available if session times exist and not cancelled/completed
            // For CALL/VIDEO: available if slots > 0 and not cancelled/completed
            const isAvailable =
              appointmentType === "in_person"
                ? responseData.available === true &&
                !isCancelled &&
                !isCompleted
                : responseData.available === true &&
                (responseData.availableSlots || 0) > 0 &&
                !isCancelled &&
                !isCompleted;

            return {
              ...prev,
              [date]: {
                available: isAvailable,
                maxTokens: responseData.totalSlots || null, // null for IN_PERSON
                currentBookings: responseData.bookedSlots || 0,
                availableSlots: responseData.availableSlots || null, // null for IN_PERSON
                nextToken:
                  isAvailable &&
                    (appointmentType === "call" ||
                      appointmentType === "video_call")
                    ? responseData.nextToken || null
                    : null,
                sessionId: responseData.sessionId,
                isCancelled: isCancelled,
                isCompleted: isCompleted,
                sessionStartTime: responseData.sessionStartTime,
                sessionEndTime: responseData.sessionEndTime,
                avgConsultationMinutes:
                  responseData.avgConsultationMinutes || null, // null for IN_PERSON
                isSessionEnded: isSessionEnded,
                requiresPayment:
                  responseData.paymentInfo?.dayRequiresPayment !== undefined
                    ? responseData.paymentInfo.dayRequiresPayment
                    : (responseData.requiresPayment !== undefined ? responseData.requiresPayment : true),
                isFreeBooking:
                  responseData.paymentInfo?.dayRequiresPayment === false ||
                  responseData.isFreeBooking === true, // Whether this is a free booking day
                timeSlots: responseData.timeSlots || [], // Store explicit time slots from API
              },
            };
          });

          // If cancelled, also set cancelledSessionDate for rescheduling
          if (isCancelled && isRescheduling) {
            const dateStr =
              typeof date === "string"
                ? date.split("T")[0]
                : new Date(date).toISOString().split("T")[0];
            setCancelledSessionDate(dateStr);
          }
        } else {
          setSlotAvailability((prev) => {
            if (!forceRefresh && prev[date]) return prev;
            return {
              ...prev,
              [date]: {
                available: false,
                availableSlots: 0,
                maxTokens: 0,
                currentBookings: 0,
                nextToken: null,
                sessionId: null,
                sessionStartTime: null,
                sessionEndTime: null,
                avgConsultationMinutes: 20,
              },
            };
          });
        }
      } catch (error) {
        console.error(`Error fetching slot availability for ${date}:`, error);
        setSlotAvailability((prev) => {
          if (!forceRefresh && prev[date]) return prev;
          return {
            ...prev,
            [date]: {
              available: false,
              maxTokens: 0,
              currentBookings: 0,
              nextToken: null,
              sessionId: null,
              sessionStartTime: null,
              sessionEndTime: null,
              avgConsultationMinutes: 20,
            },
          };
        });
      }
    },
    [appointmentType, isRescheduling],
  );

  // Fetch slot availability for all available dates when mode or modal changes
  useEffect(() => {
    // Only fetch for all dates when we are on Step 2 (Schedule Selection)
    // This avoids unnecessary API calls when user is just picking mode in Step 1
    if (
      showBookingModal &&
      bookingStep === 2 &&
      doctor?._id &&
      availableDates.length > 0 &&
      appointmentType
    ) {
      const fetchAllDatesAvailability = async () => {
        setLoadingSlots(true);
        // Clear previous availability when mode or step changes to ensure fresh data
        setSlotAvailability({});

        // Normalize appointmentType for backend
        const normalizedMode = normalizeConsultationMode(appointmentType);

        // Fetch availability for all visible available dates in parallel
        const datePromises = availableDates.map(
          (date) =>
            fetchSlotAvailabilityForDate(
              date.value,
              doctor._id,
              true,
              normalizedMode,
            ), // forceRefresh=true ensures fresh data for the mode
        );

        try {
          await Promise.all(datePromises);
        } catch (error) {
          console.error("Error fetching dates availability:", error);
        } finally {
          setLoadingSlots(false);
        }
      };

      fetchAllDatesAvailability();
    }
  }, [
    showBookingModal,
    bookingStep,
    doctor?._id,
    appointmentType,
    availableDates,
    fetchSlotAvailabilityForDate,
  ]);

  // Also fetch when a date is selected (in case it wasn't loaded initially)
  useEffect(() => {
    if (
      selectedDate &&
      doctor?._id &&
      appointmentType &&
      !slotAvailability[selectedDate]
    ) {
      const normalizedMode = normalizeConsultationMode(appointmentType);
      fetchSlotAvailabilityForDate(
        selectedDate,
        doctor._id,
        false,
        normalizedMode,
      );
    }
  }, [
    selectedDate,
    doctor?._id,
    appointmentType,
    slotAvailability,
    fetchSlotAvailabilityForDate,
  ]);

  // Time will be automatically assigned by backend - no need to track selectedTime

  const handleBookingClick = () => {
    // If isDoctor is true → Show full multi-step booking flow
    // If isDoctor is false → Show quick confirmation popup for direct booking
    if (doctor?.isDoctor === true) {
      // Real doctor - use full booking flow
      setShowBookingModal(true);
      setBookingStep(0);
      setSelectedDate("");
      setAppointmentType("in_person");
      setReason("");
      setNotes("");
      setSelectedPrescriptions([]);
    } else {
      // Non-doctor (clinic/hospital staff) - show quick book confirmation popup
      setShowQuickBookConfirmation(true);
    }
  };

  const handleFullBookingFlow = () => {
    // For users who want more options (different date/time/mode)
    setShowQuickBookConfirmation(false);
    setShowBookingModal(true);
    setBookingStep(0);
    setSelectedDate("");
    setAppointmentType("in_person");
    setReason("");
    setNotes("");
    setSelectedPrescriptions([]);
  };

  // Quick book handler - books with next available date and default in_person mode
  const handleQuickBook = async () => {
    if (!doctor) return;

    setIsSubmitting(true);

    // Store appointmentId for potential cancellation if payment fails
    let createdAppointmentId = null;

    try {
      // Get the first available date for in_person mode
      const availableDatesForBooking = getAvailableDates(doctor, "in_person");
      if (availableDatesForBooking.length === 0) {
        toast.error("No available dates for booking");
        setIsSubmitting(false);
        return;
      }

      const bookingDate = availableDatesForBooking[0].value;
      const bookingMode = "in_person";

      // Prepare appointment data
      const appointmentData = {
        doctorId: doctor.id || doctor._id,
        appointmentDate: bookingDate,
        time: "Consultation",
        reason: "Consultation",
        appointmentType: "New",
        consultationMode: bookingMode,
        patientType: "Self",
      };

      // Book appointment
      const bookingResponse = await bookAppointment(appointmentData);
      if (!bookingResponse.success) {
        toast.error(bookingResponse.message || "Failed to book appointment. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const appointmentId = bookingResponse.data?._id || bookingResponse.data?.id;
      createdAppointmentId = appointmentId;

      // Check if appointment is FREE or fully paid via Wallet
      if (bookingResponse.data?.paymentStatus === "free" || bookingResponse.data?.paymentStatus === "paid") {
        toast.success(bookingResponse.data?.paymentStatus === "paid"
          ? "Appointment booked successfully using wallet balance!"
          : "Appointment booked successfully!"
        );
        setShowQuickBookConfirmation(false);
        setIsSubmitting(false);
        window.dispatchEvent(new CustomEvent("appointmentBooked"));
        setTimeout(() => {
          navigate("/patient/appointments", { replace: true });
        }, 1000);
        return;
      }

      // Payment process for non-free bookings
      const paymentOrderResponse = await createAppointmentPaymentOrder(appointmentId, { paymentType: "full" });

      if (!paymentOrderResponse.success) {
        toast.error(paymentOrderResponse.message || "Failed to create payment order. Please try again.");
        if (createdAppointmentId) {
          try {
            await cancelAppointment(createdAppointmentId, "Payment order creation failed");
          } catch (cancelError) {
            console.error("Error cancelling appointment:", cancelError);
          }
        }
        setIsSubmitting(false);
        return;
      }

      const { orderId, amount, currency, razorpayKeyId } = paymentOrderResponse.data;

      // Initialize Razorpay payment
      if (!window.Razorpay) {
        toast.error("Payment gateway not loaded. Please refresh the page and try again.");
        if (createdAppointmentId) {
          try {
            await cancelAppointment(createdAppointmentId, "Payment gateway not loaded");
          } catch (cancelError) {
            console.error("Error cancelling appointment:", cancelError);
          }
        }
        setIsSubmitting(false);
        return;
      }

      if (!razorpayKeyId) {
        toast.error("Payment gateway not configured. Please contact support.");
        if (createdAppointmentId) {
          try {
            await cancelAppointment(createdAppointmentId, "Payment gateway not configured");
          } catch (cancelError) {
            console.error("Error cancelling appointment:", cancelError);
          }
        }
        setIsSubmitting(false);
        return;
      }

      const options = {
        key: razorpayKeyId,
        amount: Math.round(amount * 100),
        currency: currency || "INR",
        name: "Healway",
        description: `Appointment with ${doctor.name}`,
        order_id: orderId,
        handler: async (response) => {
          try {
            setIsSubmitting(true);
            const verifyResponse = await verifyAppointmentPayment(appointmentId, {
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
              paymentMethod: "razorpay",
            });

            if (verifyResponse.success) {
              toast.success("Payment successful! Appointment booked successfully!");
              setShowQuickBookConfirmation(false);
              setIsSubmitting(false);
              window.dispatchEvent(new CustomEvent("appointmentBooked"));
              setTimeout(() => {
                navigate("/patient/appointments", { replace: true });
              }, 1000);
            } else {
              toast.error(verifyResponse.message || "Payment verification failed. Please contact support.");
              setIsSubmitting(false);
            }
          } catch (error) {
            console.error("Payment verification error:", error);
            toast.error("Payment verification failed. Please contact support.");
            setIsSubmitting(false);
          }
        },
        prefill: {},
        theme: {
          color: "#0077C2",
        },
        modal: {
          ondismiss: async () => {
            toast.warning("Payment was cancelled.");
            if (createdAppointmentId) {
              try {
                await cancelAppointment(createdAppointmentId, "Payment cancelled by user");
              } catch (cancelError) {
                console.error("Error cancelling appointment:", cancelError);
              }
            }
            setIsSubmitting(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error) {
      console.error("Quick booking error:", error);
      toast.error(error.message || "Failed to book appointment. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowBookingModal(false);
    setBookingStep(0);
    setIsRescheduling(false);
    setRescheduleAppointmentId(null);
    setCancelledSessionDate(null);
    setSelectedDate("");
    // Time assignment is handled by backend
  };

  const handleNextStep = () => {
    if (bookingStep === 0) {
      if (bookingFor === "Else") {
        if (!guestDetails.name || !guestDetails.phone || !guestDetails.age) {
          toast.error("Please fill required details");
          return;
        }
      }
      setBookingStep(1);
    } else if (bookingStep === 1) {
      if (!appointmentType) {
        toast.error("Please select a consultation mode");
        return;
      }
      setBookingStep(2);
    } else if (bookingStep === 2) {
      if (!selectedDate) {
        toast.error("Please select a date");
        return;
      }
      if (
        slotAvailability[selectedDate] &&
        !slotAvailability[selectedDate].available
      ) {
        toast.error("This date is fully booked. Please select another date.");
        return;
      }
      setBookingStep(3);
    }
  };

  const handlePreviousStep = () => {
    if (bookingStep > 0) {
      setBookingStep(bookingStep - 1);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    setIsSubmitting(true);

    // Store appointmentId for potential cancellation if payment fails
    let createdAppointmentId = null;

    try {
      // Handle reschedule (no payment required)
      if (isRescheduling && rescheduleAppointmentId) {
        // Time will be automatically assigned by backend based on token number and session time
        const rescheduleData = {
          appointmentDate: selectedDate,
          newConsultationMode: appointmentType,
          // time will be automatically assigned by backend
        };

        const rescheduleResponse = await rescheduleAppointment(
          rescheduleAppointmentId,
          rescheduleData,
        );

        if (!rescheduleResponse.success) {
          toast.error(
            rescheduleResponse.message ||
            "Failed to reschedule appointment. Please try again.",
          );
          setIsSubmitting(false);
          return;
        }

        // Show success message from backend (may include wallet credit info)
        toast.success(rescheduleResponse.message || "Appointment rescheduled successfully!");

        // Refresh slot availability for both old and new dates
        if (selectedDate && doctor?.id && appointmentType) {
          const normalizedMode = normalizeConsultationMode(appointmentType);
          fetchSlotAvailabilityForDate(
            selectedDate,
            doctor.id,
            true,
            normalizedMode,
          );
        }

        // Refresh all dates availability
        if (appointmentType) {
          const normalizedMode = normalizeConsultationMode(appointmentType);
          availableDates.slice(0, 14).forEach((date) => {
            fetchSlotAvailabilityForDate(
              date.value,
              doctor.id,
              true,
              normalizedMode,
            );
          });
        }

        handleCloseModal();
        // Reset form
        setSelectedDate("");
        // Time assignment is handled by backend
        setAppointmentType("in_person");
        setReason("");
        setNotes("");
        setSelectedPrescriptions([]);
        setBookingStep(1);
        setIsRescheduling(false);
        setRescheduleAppointmentId(null);
        setIsSubmitting(false);

        // Emit custom event to refresh appointments with a slight delay to ensure backend has updated
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("appointmentBooked"));
        }, 500);

        setTimeout(() => {
          navigate("/patient/appointments");
        }, 1500);
        return;
      }

      // Normal booking flow
      const returningPatientInfo = checkIsReturningPatient(doctor.id);
      const isFreeBooking = returningPatientInfo.isReturning;

      // Map appointmentType to backend enum values: 'New' or 'Follow-up'
      let mappedAppointmentType = "New";
      if (appointmentType === "follow_up") {
        mappedAppointmentType = "Follow-up";
      } else {
        mappedAppointmentType = "New"; // Both 'in_person' and 'call' map to 'New'
      }

      // Prepare appointment data for API
      // Prepare appointment data for API
      const appointmentData = {
        doctorId: doctor.id || doctor._id,
        appointmentDate: selectedDate,
        time: selectedTime || "Consultation", // Use user selected time
        reason: reason || "Consultation",
        appointmentType: mappedAppointmentType, // Use mapped value
        consultationMode: appointmentType || "in_person", // Send consultation mode (in_person or call)
        paymentMethod: paymentType === "cod" ? "cod" : "online", // Add payment method info
        // Patient Details
        patientType: bookingFor,
        ...(bookingFor === "Else"
          ? {
            patientName: guestDetails.name,
            patientEmail: guestDetails.email,
            patientPhone: guestDetails.phone,
            patientAge: guestDetails.age,
            patientGender: guestDetails.gender,
          }
          : {}),
      };

      // Step 1: Book appointment first (creates appointment with paymentStatus: 'pending')
      const bookingResponse = await bookAppointment(appointmentData);
      if (!bookingResponse.success) {
        toast.error(
          bookingResponse.message ||
          "Failed to book appointment. Please try again.",
        );
        setIsSubmitting(false);
        return;
      }

      const appointmentId =
        bookingResponse.data?._id || bookingResponse.data?.id;
      createdAppointmentId = appointmentId;

      // Step 2: Check if appointment is FREE or COD (Already confirmed by backend)
      // Step 2: Check if appointment is FREE, COD, or fully paid via Wallet
      if (bookingResponse.data?.paymentStatus === "free" ||
        bookingResponse.data?.paymentStatus === "paid" ||
        (paymentType === "cod" && bookingResponse.data?.status === "scheduled")) {

        toast.success(
          bookingResponse.data?.paymentStatus === "paid"
            ? "Appointment booked successfully using wallet balance!"
            : paymentType === "cod"
              ? "Appointment confirmed! Please pay at clinic."
              : "Appointment booked successfully!"
        );

        // Refresh slot availability
        if (selectedDate && doctor?.id && appointmentType) {
          const normalizedMode = normalizeConsultationMode(appointmentType);
          fetchSlotAvailabilityForDate(
            selectedDate,
            doctor.id,
            true,
            normalizedMode,
          );
        }

        // Close modal and reset form
        handleCloseModal();
        setSelectedDate("");
        setAppointmentType("in_person");
        setReason("");
        setNotes("");
        setBookingStep(1);
        setIsSubmitting(false);

        // Emit custom event
        window.dispatchEvent(new CustomEvent("appointmentBooked"));

        // Navigate after delay
        setTimeout(() => {
          navigate("/patient/appointments", { replace: true });
        }, 1000);
        return;
      }

      // Step 3: Payment process for non-free bookings
      const paymentOrderResponse = await createAppointmentPaymentOrder(
        appointmentId,
        {
          paymentType: appointmentType === "in_person" ? paymentType : "full",
        },
      );
      console.log("paymentOrderResponse", paymentOrderResponse);
      if (!paymentOrderResponse.success) {
        toast.error(
          paymentOrderResponse.message ||
          "Failed to create payment order. Please try again.",
        );

        // Cancel the appointment if payment order creation failed
        if (createdAppointmentId) {
          try {
            await cancelAppointment(
              createdAppointmentId,
              "Payment order creation failed",
            );
            console.log(
              "Appointment cancelled due to payment order creation failure",
            );

            // Refresh slot availability
            if (selectedDate && doctor?.id) {
              fetchSlotAvailabilityForDate(selectedDate, doctor.id, true);
            }
          } catch (cancelError) {
            console.error(
              "Error cancelling appointment after payment order failure:",
              cancelError,
            );
          }
        }

        setIsSubmitting(false);
        return;
      }

      const { orderId, amount, currency, razorpayKeyId } =
        paymentOrderResponse.data;

      // Step 4: Initialize Razorpay payment
      if (!window.Razorpay) {
        toast.error(
          "Payment gateway not loaded. Please refresh the page and try again.",
        );

        // Cancel the appointment if Razorpay is not available
        if (createdAppointmentId) {
          try {
            await cancelAppointment(
              createdAppointmentId,
              "Payment gateway not loaded",
            );
            console.log(
              "Appointment cancelled due to Razorpay not being loaded",
            );

            // Refresh slot availability
            if (selectedDate && doctor?.id) {
              fetchSlotAvailabilityForDate(selectedDate, doctor.id, true);
            }
          } catch (cancelError) {
            console.error("Error cancelling appointment:", cancelError);
          }
        }

        setIsSubmitting(false);
        return;
      }

      if (!razorpayKeyId) {
        toast.error("Payment gateway not configured. Please contact support.");

        // Cancel the appointment if Razorpay key is not configured
        if (createdAppointmentId) {
          try {
            await cancelAppointment(
              createdAppointmentId,
              "Payment gateway not configured",
            );
            console.log(
              "Appointment cancelled due to Razorpay key not configured",
            );

            // Refresh slot availability
            if (selectedDate && doctor?.id) {
              fetchSlotAvailabilityForDate(selectedDate, doctor.id, true);
            }
          } catch (cancelError) {
            console.error("Error cancelling appointment:", cancelError);
          }
        }

        setIsSubmitting(false);
        return;
      }

      const options = {
        key: razorpayKeyId, // Use key ID from backend response
        amount: Math.round(amount * 100), // Convert to paise
        currency: currency || "INR",
        name: "Healway",
        description: `Appointment with ${doctor.name}`,
        order_id: orderId,
        handler: async (response) => {
          try {
            setIsSubmitting(true); // Keep loading state during verification
            // Step 5: Verify payment
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
              toast.success(
                "Payment successful! Appointment booked successfully!",
              );

              // Refresh slot availability for the booked date
              if (selectedDate && doctor?.id && appointmentType) {
                const normalizedMode =
                  normalizeConsultationMode(appointmentType);
                fetchSlotAvailabilityForDate(
                  selectedDate,
                  doctor.id,
                  true,
                  normalizedMode,
                );
              }

              // Refresh all dates availability
              if (appointmentType) {
                const normalizedMode =
                  normalizeConsultationMode(appointmentType);
                availableDates.slice(0, 14).forEach((date) => {
                  fetchSlotAvailabilityForDate(
                    date.value,
                    doctor.id,
                    true,
                    normalizedMode,
                  );
                });
              }

              // Close modal and reset form immediately
              handleCloseModal();
              setSelectedDate("");
              setAppointmentType("in_person");
              setReason("");
              setNotes("");
              setSelectedPrescriptions([]);
              setBookingStep(1);
              setPaymentType("full");
              setIsSubmitting(false);

              // Emit custom event to refresh dashboard and appointments
              window.dispatchEvent(new CustomEvent("appointmentBooked"));

              // Navigate after a short delay to show success message
              setTimeout(() => {
                navigate("/patient/appointments", { replace: true });
              }, 1000);
            } else {
              toast.error(
                verifyResponse.message ||
                "Payment verification failed. Please contact support.",
              );
              setIsSubmitting(false);

              // Cancel appointment if payment verification failed
              if (appointmentId) {
                try {
                  await cancelAppointment(
                    appointmentId,
                    "Payment verification failed",
                  );
                  console.log(
                    "Appointment cancelled due to payment verification failure",
                  );

                  // Refresh slot availability
                  if (selectedDate && doctor?.id) {
                    fetchSlotAvailabilityForDate(selectedDate, doctor.id, true);
                  }
                } catch (cancelError) {
                  console.error(
                    "Error cancelling appointment after verification failure:",
                    cancelError,
                  );
                }
              }
            }
          } catch (error) {
            console.error("Error verifying payment:", error);
            const errorMessage =
              error.response?.data?.message ||
              error.message ||
              "Payment verification failed. Please contact support.";
            toast.error(errorMessage);
            setIsSubmitting(false);

            // Cancel appointment if payment verification error occurred
            if (appointmentId) {
              try {
                await cancelAppointment(
                  appointmentId,
                  `Payment verification error: ${errorMessage}`,
                );
                console.log(
                  "Appointment cancelled due to payment verification error",
                );

                // Refresh slot availability
                if (selectedDate && doctor?.id) {
                  fetchSlotAvailabilityForDate(selectedDate, doctor.id, true);
                }
              } catch (cancelError) {
                console.error(
                  "Error cancelling appointment after verification error:",
                  cancelError,
                );
              }
            }
          }
        },
        prefill: {
          name:
            patientProfile?.firstName && patientProfile?.lastName
              ? `${patientProfile.firstName} ${patientProfile.lastName}`
              : patientProfile?.name || "",
          email: patientProfile?.email || "",
          contact: patientProfile?.phone || "",
        },
        theme: {
          color: "var(--color-primary)",
        },
        modal: {
          ondismiss: async () => {
            setIsSubmitting(false);
            toast.info("Payment cancelled");

            // Cancel the appointment if payment was cancelled
            if (createdAppointmentId) {
              try {
                await cancelAppointment(
                  createdAppointmentId,
                  "Payment cancelled by user",
                );
                console.log(
                  "Appointment cancelled due to payment cancellation",
                );

                // Refresh slot availability
                if (selectedDate && doctor?.id) {
                  fetchSlotAvailabilityForDate(selectedDate, doctor.id, true);
                }
              } catch (error) {
                console.error(
                  "Error cancelling appointment after payment cancellation:",
                  error,
                );
                // Don't show error toast as user already cancelled
              }
            }
          },
        },
        retry: {
          enabled: true,
          max_count: 3,
        },
      };

      const razorpay = new window.Razorpay(options);

      // Handle Razorpay errors
      razorpay.on("payment.failed", async (response) => {
        console.error("Razorpay payment failed:", response);
        setIsSubmitting(false);
        const errorMessage =
          response.error?.description ||
          response.error?.reason ||
          "Payment failed. Please try again.";
        toast.error(errorMessage);

        // Cancel the appointment if payment failed
        if (createdAppointmentId) {
          try {
            await cancelAppointment(
              createdAppointmentId,
              `Payment failed: ${errorMessage}`,
            );
            console.log("Appointment cancelled due to payment failure");

            // Refresh slot availability
            if (selectedDate && doctor?.id) {
              fetchSlotAvailabilityForDate(selectedDate, doctor.id, true);
            }
          } catch (error) {
            console.error(
              "Error cancelling appointment after payment failure:",
              error,
            );
            // Don't show additional error toast
          }
        }
      });

      razorpay.on("payment.authorized", (response) => {
        console.log("Payment authorized:", response);
      });

      razorpay.open();

      // Handle Razorpay modal errors
      razorpay.on("error", async (error) => {
        console.error("Razorpay error:", error);
        setIsSubmitting(false);

        // Handle specific error types
        let errorMessage = "Payment error. Please try again.";
        if (error.error?.code === "BAD_REQUEST_ERROR") {
          errorMessage = "Invalid payment request. Please try again.";
        } else if (error.error?.code === "GATEWAY_ERROR") {
          errorMessage = "Payment gateway error. Please try again later.";
        } else if (error.error?.code === "SERVER_ERROR") {
          errorMessage =
            "Payment server error. Please try again later or contact support.";
        } else {
          errorMessage =
            error.error?.description ||
            error.error?.reason ||
            "Payment error. Please try again.";
        }
        toast.error(errorMessage);

        // Cancel the appointment if there was an error (but not if user just closed modal)
        // Only cancel if it's a critical error, not user cancellation
        if (createdAppointmentId && error.error?.code !== "USER_CLOSED_MODAL") {
          try {
            await cancelAppointment(
              createdAppointmentId,
              `Payment error: ${errorMessage}`,
            );
            console.log("Appointment cancelled due to payment error");

            // Refresh slot availability
            if (selectedDate && doctor?.id) {
              fetchSlotAvailabilityForDate(selectedDate, doctor.id, true);
            }
          } catch (cancelError) {
            console.error(
              "Error cancelling appointment after payment error:",
              cancelError,
            );
            // Don't show additional error toast
          }
        }
      });
    } catch (error) {
      console.error("Error booking appointment:", error);
      toast.error(
        error.message || "Failed to book appointment. Please try again.",
      );
      setIsSubmitting(false);

      // Cancel appointment if it was created but booking process failed
      if (createdAppointmentId) {
        try {
          await cancelAppointment(
            createdAppointmentId,
            "Booking process failed",
          );
          console.log("Appointment cancelled due to booking error");

          // Refresh slot availability
          if (selectedDate && doctor?.id) {
            fetchSlotAvailabilityForDate(selectedDate, doctor.id, true);
          }
        } catch (cancelError) {
          console.error(
            "Error cancelling appointment after booking error:",
            cancelError,
          );
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-lg font-semibold text-slate-700">
          Loading doctor details...
        </p>
      </div>
    );
  }

  if (error || !doctor || (!doctor.id && !doctor._id)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-lg font-semibold text-slate-700">
          {error || "Doctor not found"}
        </p>
        <button
          onClick={() => navigate("/patient/doctors")}
          className="rounded-lg bg-primary px-4 py-2 text-white font-semibold hover:bg-primary-dark"
        >
          Back to Doctors
        </button>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-6 pb-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="relative shrink-0">
            <img
              src={getFileUrl(doctor.image || doctor.profileImage, { width: 320, height: 320 })}
              alt={doctor.name}
              className="h-32 w-32 sm:h-40 sm:w-40 rounded-3xl object-cover ring-2 ring-slate-100 bg-slate-100"
              loading="lazy"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name)}&background=0077C2&color=fff&size=160&bold=true`;
              }}
            />
            {doctor.availability.includes("today") && (
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
                <IoCheckmarkCircleOutline
                  className="h-4 w-4 text-white"
                  aria-hidden="true"
                />
              </span>
            )}
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
                {doctor.name}
                {doctor.isFeatured && (
                  <IoStar className="h-6 w-6 text-amber-500" />
                )}
              </h1>
              <p className="mt-1 text-base font-medium text-primary">
                {doctor.specialty}
              </p>
            </div>

            <div className="space-y-2 text-sm text-slate-600">
              {doctor.clinicName && (
                <div className="flex items-start gap-2">
                  <IoLocationOutline
                    className="h-5 w-5 shrink-0 text-slate-400 mt-0.5"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-semibold text-slate-900">
                      {doctor.clinicName}
                    </p>
                    <p className="text-slate-600">{doctor.location}</p>
                  </div>
                </div>
              )}
              {!doctor.clinicName && (
                <div className="flex items-center gap-2">
                  <IoLocationOutline
                    className="h-5 w-5 shrink-0 text-slate-400"
                    aria-hidden="true"
                  />
                  <span>{doctor.location}</span>
                </div>
              )}

              {/* Availability Time Slots */}
              <div className="flex items-start gap-2">
                <IoTimeOutline
                  className="h-5 w-5 shrink-0 text-slate-400 mt-0.5"
                  aria-hidden="true"
                />
                <div className="flex-1">
                  {(() => {
                    // Check for new availabilitySlots structure first
                    if (
                      doctor.availabilitySlots &&
                      doctor.availabilitySlots.selectedDays &&
                      doctor.availabilitySlots.selectedDays.length > 0
                    ) {
                      const slots = [];
                      const selectedDays =
                        doctor.availabilitySlots.selectedDays || [];

                      // In-Person slot
                      if (
                        doctor.availabilitySlots.inPerson?.startTime &&
                        doctor.availabilitySlots.inPerson?.endTime
                      ) {
                        const inPersonStart = convertTo12Hour(
                          doctor.availabilitySlots.inPerson.startTime,
                        );
                        const inPersonEnd = convertTo12Hour(
                          doctor.availabilitySlots.inPerson.endTime,
                        );
                        slots.push({
                          type: "In-Person",
                          days: selectedDays.join(", "),
                          time: `${inPersonStart} - ${inPersonEnd}`,
                        });
                      }

                      // Call/Video slot
                      if (
                        doctor.availabilitySlots.callVideo?.startTime &&
                        doctor.availabilitySlots.callVideo?.endTime
                      ) {
                        const callVideoStart = convertTo12Hour(
                          doctor.availabilitySlots.callVideo.startTime,
                        );
                        const callVideoEnd = convertTo12Hour(
                          doctor.availabilitySlots.callVideo.endTime,
                        );
                        slots.push({
                          type: "Call/Video",
                          days: selectedDays.join(", "),
                          time: `${callVideoStart} - ${callVideoEnd}`,
                        });
                      }

                      if (slots.length > 0) {
                        return (
                          <div className="space-y-2">
                            {slots.map((slot, idx) => (
                              <div
                                key={idx}
                                className="font-medium text-slate-700"
                              >
                                <span className="font-semibold text-slate-900">
                                  {slot.type}:
                                </span>{" "}
                                {slot.days} - {slot.time}
                              </div>
                            ))}
                          </div>
                        );
                      }
                    }

                    // Fallback to old availability format
                    if (
                      doctor.availability &&
                      doctor.availability !== "Available"
                    ) {
                      return (
                        <div className="font-medium text-slate-700">
                          {doctor.availability.split("; ").map((line, idx) => (
                            <div key={idx} className={idx > 0 ? "mt-1" : ""}>
                              {line}
                            </div>
                          ))}
                        </div>
                      );
                    }

                    return <span className="text-slate-600">Available</span>;
                  })()}
                  {doctor.nextSlot && doctor.nextSlot !== "N/A" && (
                    <span className="mt-2 inline-block rounded-full bg-[rgba(0,119,194,0.1)] px-3 py-1 text-sm font-semibold text-primary">
                      {doctor.nextSlot}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <IoCalendarOutline
                  className="h-5 w-5 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <span>{doctor.experience} experience</span>
              </div>
            </div>

            {/* Consultation Fees Display */}
            {(() => {
              const hasInPersonFee =
                doctor.fees?.inPerson &&
                (doctor.fees.inPerson.final > 0 ||
                  doctor.fees.inPerson.original > 0);
              const hasVideoCallFee =
                doctor.fees?.videoCall &&
                (doctor.fees.videoCall.final > 0 ||
                  doctor.fees.videoCall.original > 0);
              const hasVoiceCallFee =
                doctor.fees?.voiceCall &&
                (doctor.fees.voiceCall.final > 0 ||
                  doctor.fees.voiceCall.original > 0);

              if (hasInPersonFee || hasVideoCallFee || hasVoiceCallFee) {
                return (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="text-xs font-semibold text-slate-700 mb-2">
                      Consultation Fees
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {/* In-Person Fee */}
                      {hasInPersonFee && (
                        <div className="flex flex-col p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex items-center gap-1.5 mb-1">
                            <IoPersonOutline className="h-4 w-4 text-purple-600" />
                            <span className="text-xs font-semibold text-slate-700">
                              In-Person
                            </span>
                          </div>
                          {(() => {
                            const fee = doctor.fees.inPerson;
                            const original = fee.original || 0;
                            const final = fee.final || 0;
                            const discount = fee.discount || 0;
                            const confirmAmount = fee.confirmSlotAmount || 0;
                            const isFree = isFreeConsultation(final);
                            return (
                              <div className="w-full">
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex flex-col">
                                    {!isFree && original > final && original > 0 && (
                                      <span className="text-[10px] line-through text-slate-400 block -mb-0.5">
                                        ₹{original}
                                      </span>
                                    )}
                                    <span className={`text-sm font-black ${isFree ? 'text-emerald-600' : 'text-slate-900'}`}>
                                      {formatPrice(final)}
                                    </span>
                                  </div>
                                  {!isFree && discount > 0 && (
                                    <div className="text-[11px] text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 whitespace-nowrap">
                                      ₹{discount} OFF
                                    </div>
                                  )}
                                </div>
                                {!isFree && confirmAmount > 0 && (
                                  <div className="mt-2">
                                    <span className="text-[9px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md font-bold border border-amber-200">
                                      Confirm Slot: ₹{confirmAmount}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Video Call Fee */}
                      {hasVideoCallFee && (
                        <div className="flex flex-col p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <IoVideocamOutline className="h-4 w-4 text-blue-600" />
                              <span className="text-xs font-semibold text-slate-700">
                                Video Call
                              </span>
                            </div>
                          </div>
                          {(() => {
                            const fee = doctor.fees.videoCall;
                            const original = fee.original || 0;
                            const final = fee.final || 0;
                            const discount = fee.discount || 0;
                            const isFree = isFreeConsultation(final);
                            return (
                              <div className="w-full">
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex flex-col">
                                    {!isFree && original > final && original > 0 && (
                                      <span className="text-[10px] line-through text-slate-400 block -mb-0.5">
                                        ₹{original}
                                      </span>
                                    )}
                                    <span className={`text-sm font-black ${isFree ? 'text-emerald-600' : 'text-slate-900'}`}>
                                      {formatPrice(final)}
                                    </span>
                                  </div>
                                  {!isFree && discount > 0 && (
                                    <div className="text-[11px] text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 whitespace-nowrap">
                                      ₹{discount} OFF
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Voice Call Fee */}
                      {hasVoiceCallFee && (
                        <div className="flex flex-col p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <IoCallOutline className="h-4 w-4 text-green-600" />
                              <span className="text-xs font-semibold text-slate-700">
                                Call
                              </span>
                            </div>
                          </div>
                          {(() => {
                            const fee = doctor.fees.voiceCall;
                            const original = fee.original || 0;
                            const final = fee.final || 0;
                            const discount = fee.discount || 0;
                            const isFree = isFreeConsultation(final);
                            return (
                              <div className="w-full">
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex flex-col">
                                    {!isFree && original > final && original > 0 && (
                                      <span className="text-[10px] line-through text-slate-400 block -mb-0.5">
                                        ₹{original}
                                      </span>
                                    )}
                                    <span className={`text-sm font-black ${isFree ? 'text-emerald-600' : 'text-slate-900'}`}>
                                      {formatPrice(final)}
                                    </span>
                                  </div>
                                  {!isFree && discount > 0 && (
                                    <div className="text-[11px] text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 whitespace-nowrap">
                                      ₹{discount} OFF
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <div className="flex flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleBookingClick}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[11px] font-bold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary-dark active:scale-95"
              >
                <IoCalendarOutline className="h-3.5 w-3.5" aria-hidden="true" />
                Book Now
              </button>
            </div>
          </div>
        </div>

        {/* More Details Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 pt-8">
          <div className="space-y-6">
            {/* About */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <IoInformationCircleOutline className="h-5 w-5 text-primary" />
                About
              </h2>
              <p className="text-sm leading-relaxed text-slate-600">
                {doctor.about || 'No description available for this doctor.'}
              </p>
            </div>

            {/* Specialties & Services */}
            {((Array.isArray(doctor.services) && doctor.services.length > 0) || doctor.specialty) && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <IoMedicalOutline className="h-5 w-5 text-emerald-500" />
                  Specialties & Services
                </h3>
                <div className="flex flex-wrap gap-2">
                  {doctor.specialty && (
                    <span className="inline-flex items-center rounded-xl bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary border border-primary/10">
                      {doctor.specialty}
                    </span>
                  )}
                  {Array.isArray(doctor.services) && doctor.services.map((service, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-100"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Languages */}
            {Array.isArray(doctor.languages) && doctor.languages.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <IoLanguageOutline className="h-5 w-5 text-indigo-500" />
                  Languages
                </h3>
                <div className="flex flex-wrap gap-2">
                  {doctor.languages.map((lang, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 border border-indigo-100"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Education & Experience */}
            {(doctor.education || doctor.experience) && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <IoSchoolOutline className="h-5 w-5 text-amber-500" />
                  Education & Experience
                </h3>
                <div className="space-y-2">
                  {doctor.education && (
                    <div className="flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="mt-0.5">
                        <IoCheckmarkCircle className="h-4 w-4 text-slate-400" />
                      </div>
                      <span className="text-sm font-medium text-slate-700">{doctor.education}</span>
                    </div>
                  )}
                  {doctor.experience && (
                    <div className="flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="mt-0.5">
                        <IoCheckmarkCircle className="h-4 w-4 text-slate-400" />
                      </div>
                      <span className="text-sm font-medium text-slate-700">{doctor.experience} Experience</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hospital/Clinic Images Gallery */}
        {doctor.clinicImages && doctor.clinicImages.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <IoImageOutline className="h-5 w-5 text-slate-400" />
              Clinic Images
            </h2>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
              {doctor.clinicImages.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className="relative flex-shrink-0 group"
                >
                  <img
                    src={imgUrl}
                    alt={`${doctor.clinicName || 'Clinic'} ${idx + 1}`}
                    className="h-48 w-72 sm:h-56 sm:w-80 rounded-2xl object-cover border border-slate-200 shadow-sm transition-all group-hover:shadow-md group-hover:scale-[1.02]"
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  {/* Image number badge */}
                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-lg">
                    {idx + 1} / {doctor.clinicImages.length}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Book Confirmation Popup */}
      <Modal
        open={showQuickBookConfirmation}
        onCancel={() => setShowQuickBookConfirmation(false)}
        footer={null}
        width={420}
        title={null}
        closable={false}
        centered
        destroyOnHidden
        styles={{ body: { padding: "0" } }}
      >
        <div className="p-6">
          {/* Close button */}
          <button
            onClick={() => setShowQuickBookConfirmation(false)}
            className="absolute right-3 top-3 p-2 rounded-full hover:bg-slate-100 transition text-slate-400 z-10"
          >
            <IoCloseOutline className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <IoCheckmarkCircleOutline className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Confirm Booking</h2>
            <p className="text-sm text-slate-500 mt-1">Quick book with default settings</p>
          </div>

          {/* Doctor Info Card */}
          <div className="bg-slate-50 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              {doctor?.image && (
                <img
                  src={doctor.image}
                  alt={doctor.name}
                  className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-sm"
                />
              )}
              <div className="flex-1">
                <h3 className="font-bold text-slate-800">{doctor?.name}</h3>
                <p className="text-xs text-slate-500">{doctor?.specialty}</p>
              </div>
            </div>
          </div>

          {/* Booking Details */}
          {/* <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <IoPersonOutline className="h-4 w-4 text-purple-500" />
                </div>
                <span className="text-sm text-slate-600">Consultation Type</span>
              </div>
              <span className="text-sm font-bold text-slate-800">In-Person</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <IoCalendarOutline className="h-4 w-4 text-blue-500" />
                </div>
                <span className="text-sm text-slate-600">Date</span>
              </div>
              <span className="text-sm font-bold text-slate-800">
                {(() => {
                  const availableDatesForBooking = getAvailableDates(doctor, "in_person");
                  if (availableDatesForBooking.length > 0) {
                    const firstDate = availableDatesForBooking[0];
                    return firstDate.isToday ? "Today" : firstDate.isTomorrow ? "Tomorrow" : firstDate.label;
                  }
                  return "Next Available";
                })()}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <IoCardOutline className="h-4 w-4 text-emerald-500" />
                </div>
                <span className="text-sm text-slate-600">Consultation Fee</span>
              </div>
              <span className="text-lg font-black text-primary">
                ₹{doctor?.fees?.inPerson?.final || doctor?.consultationFee || 0}
              </span>
            </div>
          </div> */}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              type="primary"
              size="middle"
              block
              loading={isSubmitting}
              onClick={handleQuickBook}
              className="h-10 rounded-lg font-bold shadow-md shadow-primary/20"
            >
              {isSubmitting ? "Booking..." : "Confirm"}
            </Button>
            {/* <Button
              size="large"
              block
              onClick={handleFullBookingFlow}
              className="h-12 rounded-xl font-semibold border-slate-200"
            >
              Choose Different Date/Time
            </Button> */}
          </div>

          {/* Info text */}
          <p className="text-xs text-center text-slate-400 mt-4">
            Booking for yourself • Default time slot will be assigned
          </p>
        </div>
      </Modal>

      {/* Booking Modal */}
      <Modal
        open={showBookingModal}
        onCancel={handleCloseModal}
        footer={null}
        width={500}
        title={null}
        closable={false}
        className="booking-modal-antd-premium"
        centered
        destroyOnHidden
        styles={{ body: { padding: "0" } }}
      >
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* Custom Header */}
          <div className="relative px-4 sm:px-6 py-5 sm:py-6 text-center border-b border-slate-50">
            <button
              onClick={handleCloseModal}
              className="absolute right-3 top-3 sm:right-4 sm:top-4 p-2 rounded-full hover:bg-slate-100 transition text-slate-400 z-10"
            >
              <IoCloseOutline className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">
              {isRescheduling ? "Reschedule" : "Book Appointment"}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-1 px-8">
              {doctor.image && (
                <img
                  src={doctor.image}
                  alt={doctor.name}
                  className="h-5 w-5 rounded-full object-cover shadow-sm"
                />
              )}
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {doctor.name}
              </span>
            </div>
          </div>

          <div className="px-4 sm:px-6 py-4 overflow-y-auto">
            <div className="mb-6 px-0 sm:px-4">
              <style>
                {`
                  .custom-steps .ant-steps-item-title {
                    font-size: 9px !important;
                    line-height: 1 !important;
                    font-weight: 600 !important;
                    white-space: nowrap !important;
                  }
                  .custom-steps .ant-steps-item-icon {
                    width: 20px !important;
                    height: 20px !important;
                    line-height: 20px !important;
                    margin-inline-end: 4px !important;
                  }
                  .custom-steps .ant-steps-item-icon .ant-steps-icon {
                    font-size: 9px !important;
                  }
                  .custom-steps .ant-steps-item-tail {
                    padding: 0 4px !important;
                  }
                  .custom-steps .ant-steps-item-container {
                    align-items: center !important;
                  }
                `}
              </style>
              <Steps
                current={bookingStep}
                size="small"
                responsive={false}
                items={[
                  { title: "Patient" },
                  { title: "Mode" },
                  { title: "Schedule" },
                  { title: "Payment" },
                ]}
                className="custom-steps"
              />
            </div>

            {/* Step 0: Patient Selection */}
            {bookingStep === 0 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">
                    Who is this appointment for?
                  </h3>
                  <p className="text-[12px] sm:text-sm text-slate-500">
                    Select who this appointment is for
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div
                    onClick={() => {
                      setBookingFor("Self");
                      setBookingStep(1); // Go to next step directly
                    }}
                    className={`cursor-pointer p-4 sm:p-6 rounded-2xl border-2 transition-all text-center flex flex-col items-center gap-3 ${bookingFor === "Self"
                      ? "border-primary bg-primary/5 shadow-md scale-105"
                      : "border-slate-100 hover:border-slate-200"
                      }`}
                  >
                    <div
                      className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${bookingFor === "Self"
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-slate-400"
                        }`}
                    >
                      <UserOutlined style={{ fontSize: 24 }} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">For Myself</div>
                      <div className="text-xs text-slate-500">
                        Book for yourself
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setBookingFor("Else")}
                    className={`cursor-pointer p-4 sm:p-6 rounded-2xl border-2 transition-all text-center flex flex-col items-center gap-3 ${bookingFor === "Else"
                      ? "border-primary bg-primary/5 shadow-md scale-105"
                      : "border-slate-100 hover:border-slate-200"
                      }`}
                  >
                    <div
                      className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${bookingFor === "Else"
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-slate-400"
                        }`}
                    >
                      <IoPersonOutline size={24} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">Someone Else</div>
                      <div className="text-xs text-slate-500">
                        Family, Friend, etc.
                      </div>
                    </div>
                  </div>
                </div>

                {bookingFor === "Else" && (
                  <div className="animate-in slide-in-from-bottom-5 fade-in duration-300 pt-2">
                    <div className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-6 w-1 bg-primary rounded-full"></div>
                        <h4 className="font-semibold text-slate-800 text-sm">
                          Enter Details
                        </h4>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                          Full Name <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          placeholder="Enter patient name"
                          name="name"
                          value={guestDetails.name}
                          onChange={handleGuestDetailsChange}
                          className="rounded-lg py-2"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                            Age <span className="text-rose-500">*</span>
                          </label>
                          <Input
                            placeholder="Age"
                            type="number"
                            name="age"
                            value={guestDetails.age}
                            onChange={handleGuestDetailsChange}
                            className="rounded-lg py-2"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                            Gender
                          </label>
                          <Radio.Group
                            name="gender"
                            value={guestDetails.gender}
                            onChange={(e) =>
                              setGuestDetails((prev) => ({
                                ...prev,
                                gender: e.target.value,
                              }))
                            }
                            className="flex gap-2 text-xs h-[38px] items-center"
                          >
                            <Radio value="Male">Male</Radio>
                            <Radio value="Female">Female</Radio>
                          </Radio.Group>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                          Phone Number <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          placeholder="Contact number"
                          name="phone"
                          value={guestDetails.phone}
                          onChange={handleGuestDetailsChange}
                          className="rounded-lg py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                          Email
                          <span className="text-slate-400 font-normal ml-1 lowercase tracking-normal">
                            (optional)
                          </span>
                        </label>
                        <Input
                          placeholder="Email address"
                          name="email"
                          value={guestDetails.email}
                          onChange={handleGuestDetailsChange}
                          className="rounded-lg py-2"
                        />
                      </div>

                      <div className="pt-2">
                        <Button
                          type="primary"
                          className="w-full h-10 font-bold rounded-lg shadow-md shadow-primary/20"
                          onClick={() => {
                            if (
                              !guestDetails.name ||
                              !guestDetails.phone ||
                              !guestDetails.age
                            ) {
                              toast.error(
                                "Please fill required fields (Name, Phone, Age)",
                              );
                              return;
                            }
                            setBookingStep(1);
                          }}
                        >
                          Continue <ArrowRightOutlined />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 1: Consultation Mode Selection */}
            {bookingStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2>{doctor.isDoctor}</h2>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">
                    {doctor?.isDoctor === false ? "Proceed to Scheduling" : "How would you like to consult?"}
                  </h3>
                  <p className="text-[12px] sm:text-sm text-slate-500">
                    {doctor?.isDoctor === false ? "Diagnostic visits are in-person." : "Pick a mode that works best for you"}
                  </p>
                </div>

                {doctor?.isDoctor === false ? (
                  <div className="space-y-4">
                    <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                        <EnvironmentOutlined style={{ fontSize: 24 }} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">Center Visit</h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Physical visit required for tests and diagnostics.
                        </p>
                      </div>
                      <div className="ml-auto">
                        <IoCheckmarkCircle className="text-2xl text-indigo-600" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {/* In-Person Card */}
                    {doctor.consultationModes?.some(
                      (m) => normalizeConsultationMode(m) === "IN_PERSON",
                    ) && (
                        <Card
                          hoverable
                          className={`cursor-pointer transition-all border-2 rounded-2xl ${appointmentType === "in_person" ? "border-primary bg-primary/5 shadow-md shadow-primary/10" : "border-slate-100"}`}
                          onClick={() => setAppointmentType("in_person")}
                          styles={{ body: { padding: "16px" } }}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`h-12 w-12 flex items-center justify-center rounded-xl ${appointmentType === "in_person" ? "bg-primary text-white" : "bg-slate-100 text-slate-500"}`}
                            >
                              <EnvironmentOutlined style={{ fontSize: 20 }} />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-800">
                                  Clinic Visit
                                </span>
                                <Radio checked={appointmentType === "in_person"} />
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-slate-500">
                                  In-person consultation
                                </p>
                                <span className="text-sm font-bold text-primary">
                                  {getFeeForDay(dayjs().format('YYYY-MM-DD'), 'in_person') > 0
                                    ? `₹${getFeeForDay(dayjs().format('YYYY-MM-DD'), 'in_person')}`
                                    : "FREE"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      )}

                    {/* Video Call Card */}
                    {doctor.consultationModes?.some(
                      (m) => normalizeConsultationMode(m) === "VIDEO",
                    ) && (
                        <Card
                          hoverable
                          className={`cursor-pointer transition-all border-2 rounded-2xl ${appointmentType === "video_call" ? "border-rose-500 bg-rose-50 shadow-md shadow-rose-500/10" : "border-slate-100"}`}
                          onClick={() => setAppointmentType("video_call")}
                          styles={{ body: { padding: "16px" } }}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`h-12 w-12 flex items-center justify-center rounded-xl ${appointmentType === "video_call" ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-500"}`}
                            >
                              <VideoCameraOutlined style={{ fontSize: 20 }} />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-800">
                                  Video meeting
                                </span>
                                <Radio checked={appointmentType === "video_call"} />
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-slate-500">
                                  Face-to-face consultation
                                </p>
                                <span className="text-sm font-bold text-rose-600">
                                  {getFeeForDay(dayjs().format('YYYY-MM-DD'), 'video_call') > 0
                                    ? `₹${getFeeForDay(dayjs().format('YYYY-MM-DD'), 'video_call')}`
                                    : "FREE"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      )}

                    {/* Voice Call Card */}
                    {doctor.consultationModes?.some(
                      (m) => normalizeConsultationMode(m) === "CALL",
                    ) && (
                        <Card
                          hoverable
                          className={`cursor-pointer transition-all border-2 rounded-2xl ${appointmentType === "call" ? "border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-500/10" : "border-slate-100"}`}
                          onClick={() => setAppointmentType("call")}
                          styles={{ body: { padding: "16px" } }}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`h-12 w-12 flex items-center justify-center rounded-xl ${appointmentType === "call" ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-500"}`}
                            >
                              <PhoneOutlined style={{ fontSize: 20 }} />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-800">
                                  Voice Call
                                </span>
                                <Radio checked={appointmentType === "call"} />
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-slate-500">
                                  Audio meeting via app
                                </p>
                                <span className="text-sm font-bold text-indigo-600">
                                  {getFeeForDay(dayjs().format('YYYY-MM-DD'), 'call') > 0
                                    ? `₹${getFeeForDay(dayjs().format('YYYY-MM-DD'), 'call')}`
                                    : "FREE"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      )}
                  </div>
                )}

                <div className="flex justify-center pt-4">
                  <Button
                    type="primary"
                    size="middle"
                    className="rounded-lg h-10 w-full font-bold shadow-md shadow-primary/20"
                    onClick={handleNextStep}
                    disabled={!appointmentType}
                  >
                    Continue <ArrowRightOutlined />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Date & Slot Selection */}
            {bookingStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-slate-800">
                    When should we schedule?
                  </h3>
                  <p className="text-sm text-slate-500">
                    Selected: {appointmentType.replace("_", " ").toUpperCase()}
                  </p>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide px-1">
                  {availableDates.length > 0 ? (
                    availableDates.map((date) => {
                      const isSelected = selectedDate === date.value;
                      const availability = slotAvailability[date.value];
                      // For IN_PERSON: never mark as fully booked (unlimited bookings)
                      // For CALL/VIDEO: mark as fully booked if no slots available
                      const isFullyBooked =
                        availability &&
                        (availability.available === false ||
                          (appointmentType !== "in_person" &&
                            availability.availableSlots !== null &&
                            availability.availableSlots === 0));
                      const isLoading = !availability; // Haven't fetched yet

                      // For IN_PERSON, allow clicking even if available is false (might be a backend issue)
                      // Show PAID/FREE if we have the data, even if available is false
                      const canShowPaymentStatus =
                        availability &&
                        (availability.requiresPayment !== undefined ||
                          availability.isFreeBooking !== undefined);
                      const shouldShowPaymentStatus =
                        appointmentType === "in_person" && canShowPaymentStatus;

                      // Only block the specific cancelled date when rescheduling a doctor-cancelled appointment
                      // For normal bookings, don't block (patient can book fresh)
                      const isBlockedForReschedule = isRescheduling && cancelledSessionDate === date.value;

                      return (
                        <button
                          key={date.value}
                          onClick={() => {
                            if (isBlockedForReschedule) {
                              toast.error("Cannot reschedule to this date. The doctor cancelled your appointment on this date, please select a different date.");
                              return;
                            }
                            // For IN_PERSON, allow clicking even if loading (will trigger fetch)
                            // For other modes, only allow if not fully booked and not loading
                            if (appointmentType === "in_person") {
                              if (!isFullyBooked) {
                                setSelectedDate(date.value);
                                // If availability not fetched yet, trigger fetch
                                if (!availability && doctor?._id) {
                                  const normalizedMode =
                                    normalizeConsultationMode(appointmentType);
                                  fetchSlotAvailabilityForDate(
                                    date.value,
                                    doctor._id,
                                    false,
                                    normalizedMode,
                                  );
                                }
                              }
                            } else {
                              if (!isFullyBooked && !isLoading) {
                                setSelectedDate(date.value);
                              }
                            }
                          }}
                          disabled={isFullyBooked || isBlockedForReschedule}
                          className={`flex flex-col items-center justify-center min-w-[70px] h-[80px] rounded-xl border-2 transition-all shrink-0 ${isSelected
                            ? "border-primary bg-primary text-white shadow-md shadow-primary/20 scale-105"
                            : isBlockedForReschedule
                              ? "border-rose-100 bg-rose-50 text-rose-300 opacity-60 cursor-not-allowed"
                              : isFullyBooked
                                ? "border-slate-100 bg-slate-50 text-slate-300 opacity-60 cursor-not-allowed"
                                : isLoading
                                  ? "border-slate-100 bg-slate-50 text-slate-400"
                                  : "border-slate-100 bg-white hover:border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`}
                        >
                          <span
                            className={`text-[10px] font-bold uppercase tracking-tighter ${isSelected ? "text-white/80" : isBlockedForReschedule ? "text-rose-400" : "text-slate-400"}`}
                          >
                            {date.label.split(",")[0]}
                          </span>
                          <span className="text-lg font-black mt-0.5">
                            {date.label.split(",")[1]}
                          </span>
                          {isBlockedForReschedule ? (
                            <span className="text-[8px] font-bold mt-0.5 uppercase text-rose-500 bg-rose-100 px-1 rounded-sm">
                              Blocked
                            </span>
                          ) : isFullyBooked ? (
                            <span className="text-[8px] font-bold mt-0.5 uppercase text-slate-400 font-mono tracking-widest">
                              ...
                            </span>
                          ) : availability?.available ||
                            shouldShowPaymentStatus ? (
                            isSelected ? (
                              // Show token only for CALL/VIDEO, not for IN_PERSON
                              (appointmentType === "call" ||
                                appointmentType === "video_call") &&
                                availability.nextToken ? (
                                <span className="text-[8px] font-bold mt-0.5 uppercase text-white/90">
                                  Token #{availability.nextToken}
                                </span>
                              ) : appointmentType === "in_person" ? (
                                <span className="text-[8px] font-bold mt-0.5 uppercase text-white/90">
                                  {availability.isFreeBooking ? "Free" : "Paid"}
                                </span>
                              ) : (
                                <span className="text-[8px] font-bold mt-0.5 uppercase text-white/90">
                                  {availability.availableSlots}{" "}
                                  {availability.isFreeBooking ? "Free" : ""}
                                </span>
                              )
                            ) : appointmentType === "in_person" ? (
                              <span
                                className={`text-[8px] font-bold mt-0.5 uppercase px-1 rounded-sm ${availability.isFreeBooking
                                  ? "text-emerald-600 bg-emerald-50"
                                  : "text-blue-600 bg-blue-50"
                                  }`}
                              >
                                {availability.isFreeBooking ? "Free" : "Paid"}
                              </span>
                            ) : (
                              <div className="flex flex-col items-center gap-0.5">
                                <span
                                  className={`text-[8px] font-bold uppercase px-1 rounded-sm ${availability.isFreeBooking
                                    ? "text-emerald-600 bg-emerald-50"
                                    : "text-blue-600 bg-blue-50"
                                    }`}
                                >
                                  {availability.isFreeBooking ? "Free" : "Paid"}
                                </span>
                                {(appointmentType === "call" ||
                                  appointmentType === "video_call") && (
                                    <span className="text-[7px] text-slate-400 font-bold uppercase italic">
                                      {availability.availableSlots} Left
                                    </span>
                                  )}
                              </div>
                            )
                          ) : null}
                        </button>
                      );
                    })
                  ) : (
                    <div className="w-full text-center p-4 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-500">
                        No dates available for this mode
                      </p>
                    </div>
                  )}
                </div>

                {selectedDate && slotAvailability[selectedDate] ? (
                  <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                    {/* Time Slot Selection Grid */}
                    <div className="mt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <IoTimeOutline className="text-primary h-4 w-4" />
                        <span className="text-sm font-bold text-slate-700">
                          {appointmentType === "in_person"
                            ? "Consultation Hours"
                            : "Select Time Slot"}
                        </span>
                      </div>

                      {(() => {
                        const availability = slotAvailability[selectedDate];
                        const dayNames = [
                          "Sunday",
                          "Monday",
                          "Tuesday",
                          "Wednesday",
                          "Thursday",
                          "Friday",
                          "Saturday",
                        ];
                        const dayName =
                          dayNames[new Date(selectedDate).getDay()];
                        const normalizedMode =
                          normalizeConsultationMode(appointmentType);

                        // Extract session times for the specific selected day
                        let matchingSessions = [];

                        // Priority 1: Check daily availability array if it exists
                        const dailyAvail =
                          doctor.originalData?.availability?.find(
                            (a) => a.day === dayName,
                          );
                        if (dailyAvail && dailyAvail.slots) {
                          const modeKey =
                            normalizedMode === "IN_PERSON"
                              ? "in_person"
                              : "call_video";
                          matchingSessions = dailyAvail.slots.filter(
                            (s) =>
                              s.consultationType === modeKey && s.startTime,
                          );
                        }

                        // Priority 2: Fallback to global availabilitySlots if daily not found
                        if (
                          matchingSessions.length === 0 &&
                          doctor.availabilitySlots
                        ) {
                          const sessionMode =
                            normalizedMode === "IN_PERSON"
                              ? "inPerson"
                              : "callVideo";
                          if (
                            doctor.availabilitySlots[sessionMode]?.startTime
                          ) {
                            matchingSessions = [
                              {
                                startTime:
                                  doctor.availabilitySlots[sessionMode]
                                    .startTime,
                                endTime:
                                  doctor.availabilitySlots[sessionMode].endTime,
                              },
                            ];
                          }
                        }

                        const avgTime = doctor.averageConsultationMinutes || 20;
                        const bookedSlots = availability.bookedSlots || 0;
                        const maxTokens = availability.totalSlots || 0;

                        const slots = (availability.timeSlots && Array.isArray(availability.timeSlots))
                          ? availability.timeSlots.map((s, index) => ({
                            time: s.startTime,
                            startTime: s.startTime,
                            endTime: s.endTime,
                            isFree: s.isFree,
                            slotNumber: index + 1,
                            // For CALL/VIDEO, check vs bookedSlots if isBooked isn't explicitly provided
                            isBooked: s.isBooked || (appointmentType !== "in_person" && index < bookedSlots),
                            isAvailable: !s.isBooked && (appointmentType === "in_person" || index >= bookedSlots),
                          }))
                          : appointmentType === "in_person"
                            ? matchingSessions.map((session, index) => ({
                              time: `${convertTo12Hour(session.startTime)} - ${convertTo12Hour(session.endTime)}`,
                              slotNumber: index + 1,
                              isBooked: false,
                              isAvailable: true,
                            }))
                            : matchingSessions.length > 0
                              ? generateTimeSlots(
                                matchingSessions[0].startTime,
                                matchingSessions[0].endTime,
                                avgTime,
                                bookedSlots,
                                maxTokens || 100,
                              )
                              : [];

                        if (slots.length === 0) {
                          return (
                            <div className="p-4 bg-slate-50 rounded-xl text-center border border-dashed border-slate-200">
                              <p className="text-xs text-slate-500">
                                No time slots configured for this selection.
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {slots.map((slot) => (
                              <button
                                key={slot.slotNumber}
                                onClick={() => {
                                  if (
                                    slot.isAvailable ||
                                    appointmentType === "in_person"
                                  ) {
                                    setSelectedTime(slot.time);
                                  }
                                }}
                                disabled={
                                  !slot.isAvailable &&
                                  appointmentType !== "in_person"
                                }
                                className={`py-2 px-1 rounded-lg text-[11px] font-bold transition-all border ${selectedTime === slot.time
                                  ? "bg-primary border-primary text-white shadow-sm"
                                  : slot.isBooked
                                    ? "bg-slate-100 border-slate-100 text-slate-300 cursor-not-allowed"
                                    : "bg-white border-slate-200 text-slate-600 hover:border-primary hover:text-primary"
                                  }`}
                              >
                                {slot.isBooked ? "Full" : (
                                  <div className="flex flex-col items-center">
                                    <span>{slot.time}</span>
                                    {slot.isFree && (
                                      <span className="text-[7px] text-emerald-500 font-black uppercase mt-0.5">Free</span>
                                    )}
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="grid grid-cols-1 gap-3 mt-4">
                      {appointmentType === "in_person" && (
                        <div className="p-3 rounded-xl border border-slate-100 bg-white shadow-sm flex items-start gap-3">
                          <div className="p-2 bg-orange-50 text-orange-500 rounded-lg shrink-0">
                            <EnvironmentOutlined />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Location
                            </span>
                            <span className="text-sm font-semibold text-slate-700 line-clamp-1">
                              {doctor.clinicName}, {doctor.location}
                            </span>
                          </div>
                        </div>
                      )}

                      {selectedTime && (
                        <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 shadow-sm flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                              <IoTimeOutline />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Selected Slot
                              </span>
                              <span className="text-sm font-black text-primary">
                                {selectedDate}{" "}
                                {selectedTime ? `at ${selectedTime}` : ""}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-[120px] flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 bg-slate-50/50">
                    <CalendarOutlined style={{ fontSize: 24 }} />
                    <p className="mt-2 text-xs font-medium">
                      Please select a date from above
                    </p>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button
                    size="large"
                    className="rounded-xl h-11 px-6 font-semibold flex items-center gap-2 border-slate-200"
                    onClick={handlePreviousStep}
                  >
                    <ArrowLeftOutlined /> Back
                  </Button>
                  <Button
                    type="primary"
                    size="middle"
                    className="rounded-lg h-10 px-6 font-bold shadow-md shadow-primary/20"
                    onClick={handleNextStep}
                    disabled={
                      !selectedDate ||
                      !selectedTime ||
                      (slotAvailability[selectedDate] &&
                        !slotAvailability[selectedDate].available)
                    }
                  >
                    Confirm Details <ArrowRightOutlined />
                  </Button>
                </div>
              </div>
            )}

            {bookingStep === 3 && (
              <div className="space-y-6">
                {/* ================= HEADER ================= */}
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-slate-800">
                    Final Summary
                  </h3>
                  <p className="text-sm text-slate-500">
                    Double check before proceeding
                  </p>
                </div>

                <Card
                  className="rounded-2xl border-slate-100 shadow-sm overflow-hidden"
                  styles={{ body: { padding: 0 } }}
                >
                  {/* ================= TOP BAR ================= */}
                  <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
                    <div className="flex gap-3 items-center">
                      <div
                        className={`p-2 rounded-lg text-white ${appointmentType === "in_person"
                          ? "bg-purple-500"
                          : appointmentType === "call"
                            ? "bg-indigo-500"
                            : "bg-rose-500"
                          }`}
                      >
                        {appointmentType === "in_person" ? (
                          <EnvironmentOutlined />
                        ) : appointmentType === "call" ? (
                          <PhoneOutlined />
                        ) : (
                          <VideoCameraOutlined />
                        )}
                      </div>
                      <span className="font-bold uppercase">
                        {appointmentType.replace("_", " ")} Consultation
                      </span>
                    </div>
                    <Tag color="blue">
                      {dayjs(selectedDate).format("MMM DD")}
                    </Tag>
                  </div>

                  {/* ================= BODY ================= */}
                  <div className="p-5 space-y-4">
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm">Patient</span>
                      <span className="font-bold">
                        {bookingFor === "Else"
                          ? guestDetails.name || "Guest"
                          : "Me"}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm">Date</span>
                      <span className="font-bold">
                        {dayjs(selectedDate).format("dddd, MMMM D, YYYY")}
                      </span>
                    </div>

                    {/* ================= PAYMENT OPTIONS ================= */}
                    {hasDoctorCancelledAppointment && (
                      <Alert
                        message="Free Re-booking Available"
                        description="Your previous appointment was cancelled by the doctor. You can book this session for free."
                        type="success"
                        showIcon
                        icon={<IoCheckmarkCircleOutline />}
                        className="mb-4 rounded-xl border-emerald-100 bg-emerald-50"
                      />
                    )}

                    {appointmentType === "in_person" &&
                      !hasDoctorCancelledAppointment &&
                      getFeeForDay(selectedDate, appointmentType) > 0 && (
                        <div className="pt-4 border-t space-y-3">
                          <span className="text-sm font-semibold">
                            Payment Option
                          </span>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {/* FULL PAYMENT - Always available */}
                            <Card
                              hoverable
                              className={`border-2 rounded-xl cursor-pointer transition-all ${paymentType === "full"
                                ? "border-primary bg-primary/5 shadow-md"
                                : "border-slate-100 hover:border-slate-200"
                                }`}
                              onClick={() => setPaymentType("full")}
                              styles={{ body: { padding: "16px" } }}
                            >
                              <div className="text-center">
                                <div className="text-xs sm:text-sm font-bold text-slate-700 mb-1">Full Payment</div>
                                <div className={`text-xl sm:text-2xl font-black ${isFreeConsultation(getFeeForDay(selectedDate, appointmentType)) ? 'text-emerald-600' : 'text-primary'}`}>
                                  {formatPrice(getFeeForDay(selectedDate, appointmentType))}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-1">{isFreeConsultation(getFeeForDay(selectedDate, appointmentType)) ? 'No payment required' : 'Pay now'}</div>
                              </div>
                            </Card>

                            {/* CONFIRM SLOT - Only if enabled by doctor */}
                            {doctor.fees?.inPerson?.confirmSlotAmount > 0 && (
                              <Card
                                hoverable
                                className={`border-2 rounded-xl cursor-pointer transition-all ${paymentType === "confirmSlot"
                                  ? "border-amber-500 bg-amber-50 shadow-md"
                                  : "border-slate-100 hover:border-slate-200"
                                  }`}
                                onClick={() => setPaymentType("confirmSlot")}
                                styles={{ body: { padding: "16px" } }}
                              >
                                <div className="text-center">
                                  <div className="text-xs sm:text-sm font-bold text-slate-700 mb-1">Confirm Slot</div>
                                  <div className="text-xl sm:text-2xl font-black text-amber-600">
                                    ₹{doctor.fees.inPerson.confirmSlotAmount}
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-1">
                                    Remaining ₹
                                    {getFeeForDay(selectedDate, appointmentType) -
                                      doctor.fees.inPerson.confirmSlotAmount}
                                  </div>
                                </div>
                              </Card>
                            )}

                            {/* PAY AT CLINIC (COD) - Show if enabled OR disabled with overlay */}
                            <Card
                              hoverable={doctor.fees?.inPerson?.codEnabled}
                              className={`border-2 rounded-xl relative transition-all
                    ${paymentType === "cod"
                                  ? "border-emerald-500 bg-emerald-50 shadow-md"
                                  : "border-slate-100"
                                }
                    ${!doctor.fees?.inPerson?.codEnabled
                                  ? "opacity-50 cursor-not-allowed"
                                  : "cursor-pointer hover:border-slate-200"
                                }`}
                              onClick={() => {
                                if (!doctor.fees?.inPerson?.codEnabled) return;
                                setPaymentType("cod");
                              }}
                              styles={{ body: { padding: "16px" } }}
                            >
                              <div className="text-center">
                                <div className="text-xs sm:text-sm font-bold text-slate-700 mb-1">Pay at Clinic</div>
                                <div className="text-xl sm:text-2xl font-black text-emerald-600">
                                  Free
                                </div>
                                <div className="text-[10px] text-slate-500 mt-1">Pay offline</div>
                              </div>

                              {!doctor.fees?.inPerson?.codEnabled && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-xl">
                                  <div className="bg-red-500 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 rounded-full shadow-lg">
                                    Disabled by Doctor
                                  </div>
                                </div>
                              )}
                            </Card>
                          </div>
                        </div>
                      )}

                    {/* ================= TOTAL ================= */}
                    <div className="pt-4 border-t flex justify-between items-center">
                      <span className="text-lg font-bold">
                        {(hasDoctorCancelledAppointment || paymentType === "cod" || getFeeForDay(selectedDate, appointmentType) === 0)
                          ? "Consultation Fee"
                          : "Amount to Pay"}
                      </span>
                      <span className={`text-2xl sm:text-3xl font-black ${(hasDoctorCancelledAppointment || paymentType === "cod" || getFeeForDay(selectedDate, appointmentType) === 0)
                        ? "text-emerald-600"
                        : "text-primary"
                        }`}>
                        {(() => {
                          const fee = getFeeForDay(selectedDate, appointmentType);
                          const wallet = patientProfile?.walletBalance || 0;
                          const toPay = Math.max(0, fee - wallet);

                          if (hasDoctorCancelledAppointment) return "FREE";
                          if (paymentType === "cod") return "PAY AT CLINIC";
                          if (fee === 0) return "FREE";

                          if (paymentType === "confirmSlot") {
                            const confAmount = doctor?.fees?.inPerson?.confirmSlotAmount || 0;
                            const remainingConf = Math.max(0, confAmount - wallet);
                            return remainingConf === 0 ? "PAID BY WALLET" : `₹${remainingConf}`;
                          }

                          return toPay === 0 ? "PAID BY WALLET" : `₹${toPay}`;
                        })()}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* ================= INFO ================= */}
                <div className="p-4 bg-emerald-50 border rounded-xl text-sm font-bold text-emerald-800">
                  {(() => {
                    const fee = getFeeForDay(selectedDate, appointmentType);
                    const wallet = patientProfile?.walletBalance || 0;

                    if (hasDoctorCancelledAppointment) return "Free re-booking applied. Your previous payment will be adjusted.";
                    if (paymentType === "cod") return "Appointment confirmed. Pay full amount at clinic.";
                    if (fee === 0) return "This session is FREE. Click below to book your slot.";

                    if (wallet > 0) {
                      const toPay = Math.max(0, fee - wallet);
                      if (toPay === 0) return `Wallet balance (₹${wallet}) covers the full fee. Direct booking will occur.`;
                      return `Wallet balance (₹${wallet}) applied. You only need to pay ₹${toPay}.`;
                    }

                    if (paymentType === "confirmSlot") return "Slot confirmed. Remaining amount can be paid later.";
                    return "Appointment confirmed after payment.";
                  })()}
                </div>

                {/* ================= ACTIONS ================= */}
                <div className="flex gap-4">
                  <Button onClick={handlePreviousStep}>Back</Button>
                  <Button
                    type="primary"
                    loading={isSubmitting}
                    onClick={handleConfirmBooking}
                    className="flex-1 h-10 rounded-lg font-bold"
                  >
                    {hasDoctorCancelledAppointment ||
                      paymentType === "cod" ||
                      getFeeForDay(selectedDate, appointmentType) === 0 ||
                      ((patientProfile?.walletBalance || 0) >= (paymentType === 'confirmSlot' ? (doctor?.fees?.inPerson?.confirmSlotAmount || 0) : getFeeForDay(selectedDate, appointmentType)))
                      ? "Confirm Now"
                      : "Pay & Confirm"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal >
    </section >
  );
};
export default PatientDoctorDetails;
