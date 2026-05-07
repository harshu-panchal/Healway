import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import DoctorNavbar from "../doctor-components/DoctorNavbar";
import {
  getDoctorProfile,
  updateDoctorProfile,
  getSupportHistory,
  getServices,
  uploadProfileImage,
  uploadSignature,
} from "../doctor-services/doctorService";
import { useToast } from "../../../contexts/ToastContext";
import { getAuthToken, getFileUrl } from "../../../utils/apiClient";

import {
  IoPersonOutline,
  IoMailOutline,
  IoCallOutline,
  IoLocationOutline,
  IoCalendarOutline,
  IoMedicalOutline,
  IoEyeOutline ,
  IoDownloadOutline ,
  IoLogOutOutline,
  IoCreateOutline,
  IoCheckmarkCircleOutline,
  IoCloseOutline,
  IoCameraOutline,
  IoChevronDownOutline,
  IoChevronUpOutline,
  IoSchoolOutline,
  IoLanguageOutline,
  IoTimeOutline,
  IoDocumentTextOutline,
  IoBriefcaseOutline,
  IoAddOutline,
  IoTrashOutline,
  IoShieldCheckmarkOutline,
  IoHelpCircleOutline,
  IoImageOutline,
  IoPowerOutline,
  IoVideocamOutline,
  IoCopyOutline,
} from "react-icons/io5";

// Mock data removed - using real backend data now

// Utility function to normalize image URLs (using global helper)
const normalizeImageUrl = (url) => getFileUrl(url) || "";



// Utility function to convert 24-hour time to 12-hour format with AM/PM
const formatTimeTo12Hour = (time24) => {
  if (!time24) return "";

  // If already in 12-hour format (contains AM/PM), return as is
  if (time24.toString().includes("AM") || time24.toString().includes("PM")) {
    return time24;
  }

  // Handle time format like "17:00" or "17:00:00"
  const timeStr = time24.toString().trim();
  const [hours, minutes] = timeStr.split(":").map(Number);

  if (isNaN(hours) || isNaN(minutes)) return time24;

  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const minutesStr = minutes.toString().padStart(2, "0");

  return `${hours12}:${minutesStr} ${period}`;
};

// Utility function to convert 12-hour format to 24-hour format for time inputs
const convert12HourTo24Hour = (time12) => {
  if (!time12) return "";

  // If already in 24-hour format (no AM/PM), return as is
  if (!time12.toString().includes("AM") && !time12.toString().includes("PM")) {
    return time12;
  }

  const timeStr = time12.toString().trim();
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);

  if (!match) return time12;

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) {
    hours += 12;
  } else if (period === "AM" && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, "0")}:${minutes}`;
};

const DoctorProfile = () => {
  const location = useLocation();
  const toast = useToast();
  const isDashboardPage =
    location.pathname === "/doctor/dashboard" ||
    location.pathname === "/doctor/";

  const [isEditing, setIsEditing] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const languageInputRef = useRef(null);
  const servicesDropdownRef = useRef(null);
  const [availableServices, setAvailableServices] = useState([]);
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  const [showServicesDropdown, setShowServicesDropdown] = useState(false);
  // Store stable averageConsultationMinutes value to prevent it from changing unexpectedly
  const [
    stableAverageConsultationMinutes,
    setStableAverageConsultationMinutes,
  ] = useState(20);

  // Initialize with empty/default data
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    gender: "",
    profileImage: "",
    specialization: "",
    licenseNumber: "",
    experienceYears: 0,
    qualification: "",
    bio: "",
    fees: {
      inPerson: { original: 0, discount: 0, final: 0, selectedDays: [] },
      videoCall: { original: 0, discount: 0, final: 0, selectedDays: [] },
      voiceCall: { original: 0, discount: 0, final: 0, selectedDays: [] },
    },
    // Keep top-level for internal logic if needed, but primary source is now fees object
    original_fees: 0,
    discount_amount: 0,
    consultationFee: 0,
    education: [],
    languages: [],
    services: [],
    consultationModes: [],
    clinicDetails: {
      name: "",
      address: {
        line1: "",
        line2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
      },
    },
    availability: [],
    availabilitySlots: {
      inPerson: [], // Array of { day, slots: [] }
      videoCall: [],
      voiceCall: [],
      inPersonSelectedDays: [],
      videoCallSelectedDays: [],
      voiceCallSelectedDays: [],
      callVideo: { startTime: "", endTime: "" },
      selectedDays: [],
    },
    averageConsultationMinutes: 20,
    documents: [],
    digitalSignature: {
      imageUrl: "",
      uploadedAt: null,
    },
    status: "pending",
    isActive: true,
  });

  // Fetch doctor profile from backend
  useEffect(() => {
    const fetchDoctorProfile = async () => {
      const token = getAuthToken("doctor");
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Try to load from cache first for faster initial render
        const storage = localStorage.getItem("doctorAuthToken")
          ? localStorage
          : sessionStorage;
        const cachedProfile = JSON.parse(
          storage.getItem("doctorProfile") || "{}",
        );
        if (Object.keys(cachedProfile).length > 0) {
          // Set initial form data from cache
          const cachedData = {
            firstName: cachedProfile.firstName || "",
            lastName: cachedProfile.lastName || "",
            email: cachedProfile.email || "",
            phone: cachedProfile.phone || "",
            gender: cachedProfile.gender || "",
            profileImage: normalizeImageUrl(
              cachedProfile.profileImage ||
              cachedProfile.documents?.profileImage ||
              "",
            ),
            specialization: cachedProfile.specialization || "",
            licenseNumber: cachedProfile.licenseNumber || "",
            experienceYears: cachedProfile.experienceYears || 0,
            qualification: cachedProfile.qualification || "",
            bio: cachedProfile.bio || "",
            fees: cachedProfile.fees
              ? {
                inPerson: {
                  original:
                    cachedProfile.fees.inPerson?.original ||
                    cachedProfile.original_fees ||
                    0,
                  discount:
                    cachedProfile.fees.inPerson?.discount ||
                    cachedProfile.discount_amount ||
                    0,
                  final:
                    cachedProfile.fees.inPerson?.final ||
                    cachedProfile.consultationFee ||
                    0,
                  selectedDays: Array.isArray(
                    cachedProfile.fees.inPerson?.selectedDays,
                  )
                    ? cachedProfile.fees.inPerson.selectedDays
                    : [],
                },
                videoCall: {
                  original: cachedProfile.fees.videoCall?.original || 0,
                  discount: cachedProfile.fees.videoCall?.discount || 0,
                  final: cachedProfile.fees.videoCall?.final || 0,
                  selectedDays: Array.isArray(
                    cachedProfile.fees.videoCall?.selectedDays,
                  )
                    ? cachedProfile.fees.videoCall.selectedDays
                    : [],
                },
                voiceCall: {
                  original: cachedProfile.fees.voiceCall?.original || 0,
                  discount: cachedProfile.fees.voiceCall?.discount || 0,
                  final: cachedProfile.fees.voiceCall?.final || 0,
                  selectedDays: Array.isArray(
                    cachedProfile.fees.voiceCall?.selectedDays,
                  )
                    ? cachedProfile.fees.voiceCall.selectedDays
                    : [],
                },
              }
              : {
                inPerson: {
                  original: cachedProfile.original_fees || 0,
                  discount: cachedProfile.discount_amount || 0,
                  final: cachedProfile.consultationFee || 0,
                  selectedDays: [],
                },
                videoCall: {
                  original: 0,
                  discount: 0,
                  final: 0,
                  selectedDays: [],
                },
                voiceCall: {
                  original: 0,
                  discount: 0,
                  final: 0,
                  selectedDays: [],
                },
              },
            original_fees: cachedProfile.original_fees || 0,
            discount_amount: cachedProfile.discount_amount || 0,
            consultationFee: cachedProfile.consultationFee || 0,
            education: Array.isArray(cachedProfile.education)
              ? cachedProfile.education
              : [],
            languages: Array.isArray(cachedProfile.languages)
              ? cachedProfile.languages
              : [],
            services: Array.isArray(cachedProfile.services)
              ? cachedProfile.services
              : [],
            consultationModes: Array.isArray(cachedProfile.consultationModes)
              ? cachedProfile.consultationModes.map((mode) => {
                if (mode === "video" || mode === "call") return "video_call";
                if (mode === "audio") return "voice_call";
                return mode;
              })
              : [],
            clinicDetails: cachedProfile.clinicDetails || {
              name: "",
              address: {
                line1: "",
                line2: "",
                city: "",
                state: "",
                postalCode: "",
                country: "",
              },
            },
            availability: Array.isArray(cachedProfile.availability)
              ? cachedProfile.availability
              : [],
            availabilitySlots: cachedProfile.availabilitySlots
              ? {
                // Handle inPerson slots - convert to array if needed
                inPerson: Array.isArray(cachedProfile.availabilitySlots.inPerson)
                  ? cachedProfile.availabilitySlots.inPerson.map(slot => ({
                    startTime: convert12HourTo24Hour(slot.startTime) || "",
                    endTime: convert12HourTo24Hour(slot.endTime) || "",
                  }))
                  : cachedProfile.availabilitySlots.inPerson?.startTime && cachedProfile.availabilitySlots.inPerson?.endTime
                    ? [{
                      startTime: convert12HourTo24Hour(cachedProfile.availabilitySlots.inPerson.startTime) || "",
                      endTime: convert12HourTo24Hour(cachedProfile.availabilitySlots.inPerson.endTime) || "",
                    }]
                    : [],
                // Handle videoCall slots - convert to array if needed
                videoCall: Array.isArray(cachedProfile.availabilitySlots.videoCall)
                  ? cachedProfile.availabilitySlots.videoCall.map(slot => ({
                    startTime: convert12HourTo24Hour(slot.startTime) || "",
                    endTime: convert12HourTo24Hour(slot.endTime) || "",
                  }))
                  : cachedProfile.availabilitySlots.videoCall?.startTime && cachedProfile.availabilitySlots.videoCall?.endTime
                    ? [{
                      startTime: convert12HourTo24Hour(cachedProfile.availabilitySlots.videoCall.startTime) || "",
                      endTime: convert12HourTo24Hour(cachedProfile.availabilitySlots.videoCall.endTime) || "",
                    }]
                    : [],
                // Handle voiceCall slots - convert to array if needed
                voiceCall: Array.isArray(cachedProfile.availabilitySlots.voiceCall)
                  ? cachedProfile.availabilitySlots.voiceCall.map(slot => ({
                    startTime: convert12HourTo24Hour(slot.startTime) || "",
                    endTime: convert12HourTo24Hour(slot.endTime) || "",
                  }))
                  : cachedProfile.availabilitySlots.voiceCall?.startTime && cachedProfile.availabilitySlots.voiceCall?.endTime
                    ? [{
                      startTime: convert12HourTo24Hour(cachedProfile.availabilitySlots.voiceCall.startTime) || "",
                      endTime: convert12HourTo24Hour(cachedProfile.availabilitySlots.voiceCall.endTime) || "",
                    }]
                    : [],
                // Keep callVideo for backward compatibility
                callVideo: {
                  startTime:
                    convert12HourTo24Hour(
                      cachedProfile.availabilitySlots.callVideo?.startTime,
                    ) || "",
                  endTime:
                    convert12HourTo24Hour(
                      cachedProfile.availabilitySlots.callVideo?.endTime,
                    ) || "",
                },
                selectedDays: Array.isArray(
                  cachedProfile.availabilitySlots.selectedDays,
                )
                  ? cachedProfile.availabilitySlots.selectedDays
                  : [],
              }
              : {
                inPerson: [],
                videoCall: [],
                voiceCall: [],
                callVideo: { startTime: "", endTime: "" },
                selectedDays: [],
              },
            averageConsultationMinutes:
              cachedProfile.averageConsultationMinutes || 20,
            documents: Array.isArray(cachedProfile.documents)
              ? cachedProfile.documents
              : [],
            digitalSignature: cachedProfile.digitalSignature
              ? {
                imageUrl: normalizeImageUrl(
                  cachedProfile.digitalSignature.imageUrl || "",
                ),
                uploadedAt: cachedProfile.digitalSignature.uploadedAt || null,
              }
              : {
                imageUrl: "",
                uploadedAt: null,
              },
            status: cachedProfile.status || "pending",
            isActive:
              cachedProfile.isActive !== undefined
                ? cachedProfile.isActive
                : true,
          };
          setFormData(cachedData);
          // Store stable value
          setStableAverageConsultationMinutes(
            cachedProfile.averageConsultationMinutes || 20,
          );
        }

        // Then fetch fresh data from backend
        const response = await getDoctorProfile();
        if (response) {
          const doctor = response.doctor || response;

          // Transform backend data to frontend format
          const transformedData = {
            firstName: doctor.firstName || "",
            lastName: doctor.lastName || "",
            email: doctor.email || "",
            phone: doctor.phone || "",
            gender: doctor.gender || "",
            profileImage: normalizeImageUrl(
              doctor.profileImage || doctor.documents?.profileImage || "",
            ),
            specialization: doctor.specialization || "",
            licenseNumber: doctor.licenseNumber || "",
            experienceYears: doctor.experienceYears || 0,
            qualification: doctor.qualification || "",
            bio: doctor.bio || "",
            fees: doctor.fees
              ? {
                inPerson: {
                  original:
                    doctor.fees.inPerson?.original ||
                    doctor.original_fees ||
                    0,
                  discount:
                    doctor.fees.inPerson?.discount ||
                    doctor.discount_amount ||
                    0,
                  final:
                    doctor.fees.inPerson?.final ||
                    doctor.consultationFee ||
                    0,
                  selectedDays: Array.isArray(
                    doctor.fees.inPerson?.selectedDays,
                  )
                    ? doctor.fees.inPerson.selectedDays
                    : [],
                },
                videoCall: {
                  original: doctor.fees.videoCall?.original || 0,
                  discount: doctor.fees.videoCall?.discount || 0,
                  final: doctor.fees.videoCall?.final || 0,
                  selectedDays: Array.isArray(
                    doctor.fees.videoCall?.selectedDays,
                  )
                    ? doctor.fees.videoCall.selectedDays
                    : [],
                },
                voiceCall: {
                  original: doctor.fees.voiceCall?.original || 0,
                  discount: doctor.fees.voiceCall?.discount || 0,
                  final: doctor.fees.voiceCall?.final || 0,
                  selectedDays: Array.isArray(
                    doctor.fees.voiceCall?.selectedDays,
                  )
                    ? doctor.fees.voiceCall.selectedDays
                    : [],
                },
              }
              : {
                inPerson: {
                  original: doctor.original_fees || 0,
                  discount: doctor.discount_amount || 0,
                  final: doctor.consultationFee || 0,
                  selectedDays: [],
                },
                videoCall: {
                  original: 0,
                  discount: 0,
                  final: 0,
                  selectedDays: [],
                },
                voiceCall: {
                  original: 0,
                  discount: 0,
                  final: 0,
                  selectedDays: [],
                },
              },
            original_fees: doctor.original_fees || 0,
            discount_amount: doctor.discount_amount || 0,
            consultationFee: doctor.consultationFee || 0,
            education: Array.isArray(doctor.education) ? doctor.education : [],
            languages: Array.isArray(doctor.languages) ? doctor.languages : [],
            services: Array.isArray(doctor.services) ? doctor.services : [],
            consultationModes: Array.isArray(doctor.consultationModes)
              ? doctor.consultationModes.map((mode) => {
                if (mode === "video" || mode === "call") return "video_call";
                if (mode === "audio") return "voice_call";
                return mode;
              })
              : [],
            clinicDetails: doctor.clinicDetails || {
              name: "",
              address: {
                line1: "",
                line2: "",
                city: "",
                state: "",
                postalCode: "",
                country: "",
              },
            },
            availability: Array.isArray(doctor.availability)
              ? doctor.availability
              : [],
            availabilitySlots: doctor.availabilitySlots
              ? {
                // Handle inPerson slots - convert to array if needed
                inPerson: Array.isArray(doctor.availabilitySlots.inPerson) && doctor.availabilitySlots.inPerson.length > 0 && doctor.availabilitySlots.inPerson[0].day
                  ? doctor.availabilitySlots.inPerson.map(dayConfig => ({
                    day: dayConfig.day,
                    slots: Array.isArray(dayConfig.slots) ? dayConfig.slots.map(slot => ({
                      startTime: convert12HourTo24Hour(slot.startTime) || "",
                      endTime: convert12HourTo24Hour(slot.endTime) || "",
                      isFree: !!slot.isFree
                    })) : []
                  }))
                  : (Array.isArray(doctor.availabilitySlots?.inPersonSelectedDays) ? doctor.availabilitySlots.inPersonSelectedDays.map(day => ({
                    day,
                    slots: Array.isArray(doctor.availabilitySlots.inPerson) ? doctor.availabilitySlots.inPerson.map(slot => ({
                      startTime: convert12HourTo24Hour(slot.startTime) || "",
                      endTime: convert12HourTo24Hour(slot.endTime) || "",
                      isFree: !!slot.isFree
                    })) : []
                  })) : []),
                videoCall: Array.isArray(doctor.availabilitySlots.videoCall) && doctor.availabilitySlots.videoCall.length > 0 && doctor.availabilitySlots.videoCall[0].day
                  ? doctor.availabilitySlots.videoCall.map(dayConfig => ({
                    day: dayConfig.day,
                    slots: Array.isArray(dayConfig.slots) ? dayConfig.slots.map(slot => ({
                      startTime: convert12HourTo24Hour(slot.startTime) || "",
                      endTime: convert12HourTo24Hour(slot.endTime) || "",
                      isFree: !!slot.isFree
                    })) : []
                  }))
                  : (Array.isArray(doctor.availabilitySlots?.videoCallSelectedDays) ? doctor.availabilitySlots.videoCallSelectedDays.map(day => ({
                    day,
                    slots: Array.isArray(doctor.availabilitySlots.videoCall) ? doctor.availabilitySlots.videoCall.map(slot => ({
                      startTime: convert12HourTo24Hour(slot.startTime) || "",
                      endTime: convert12HourTo24Hour(slot.endTime) || "",
                      isFree: !!slot.isFree
                    })) : []
                  })) : []),
                voiceCall: Array.isArray(doctor.availabilitySlots.voiceCall) && doctor.availabilitySlots.voiceCall.length > 0 && doctor.availabilitySlots.voiceCall[0].day
                  ? doctor.availabilitySlots.voiceCall.map(dayConfig => ({
                    day: dayConfig.day,
                    slots: Array.isArray(dayConfig.slots) ? dayConfig.slots.map(slot => ({
                      startTime: convert12HourTo24Hour(slot.startTime) || "",
                      endTime: convert12HourTo24Hour(slot.endTime) || "",
                      isFree: !!slot.isFree
                    })) : []
                  }))
                  : (Array.isArray(doctor.availabilitySlots?.voiceCallSelectedDays) ? doctor.availabilitySlots.voiceCallSelectedDays.map(day => ({
                    day,
                    slots: Array.isArray(doctor.availabilitySlots.voiceCall) ? doctor.availabilitySlots.voiceCall.map(slot => ({
                      startTime: convert12HourTo24Hour(slot.startTime) || "",
                      endTime: convert12HourTo24Hour(slot.endTime) || "",
                      isFree: !!slot.isFree
                    })) : []
                  })) : []),
                inPersonSelectedDays: Array.isArray(doctor.availabilitySlots?.inPersonSelectedDays)
                  ? doctor.availabilitySlots.inPersonSelectedDays
                  : [],
                videoCallSelectedDays: Array.isArray(doctor.availabilitySlots?.videoCallSelectedDays)
                  ? doctor.availabilitySlots.videoCallSelectedDays
                  : [],
                voiceCallSelectedDays: Array.isArray(doctor.availabilitySlots?.voiceCallSelectedDays)
                  ? doctor.availabilitySlots.voiceCallSelectedDays
                  : [],
                selectedDays: Array.isArray(
                  doctor.availabilitySlots.selectedDays,
                )
                  ? doctor.availabilitySlots.selectedDays
                  : [],
              }
              : (() => {
                // Convert old availability format to new format
                if (
                  Array.isArray(doctor.availability) &&
                  doctor.availability.length > 0
                ) {
                  const firstAvail = doctor.availability[0];
                  const inPersonSlot =
                    firstAvail.slots?.find(
                      (s) => s.consultationType === "in_person",
                    ) ||
                    (firstAvail.startTime
                      ? {
                        startTime: firstAvail.startTime,
                        endTime: firstAvail.endTime,
                      }
                      : null);
                  const callVideoSlot = firstAvail.slots?.find(
                    (s) => s.consultationType === "call_video",
                  );
                  const selectedDays = doctor.availability
                    .map((a) => a.day)
                    .filter(Boolean);

                  return {
                    inPerson: inPersonSlot ? [{
                      startTime:
                        convert12HourTo24Hour(inPersonSlot?.startTime) || "",
                      endTime:
                        convert12HourTo24Hour(inPersonSlot?.endTime) || "",
                    }] : [],
                    videoCall: [],
                    voiceCall: [],
                    callVideo: {
                      startTime:
                        convert12HourTo24Hour(callVideoSlot?.startTime) || "",
                      endTime:
                        convert12HourTo24Hour(callVideoSlot?.endTime) || "",
                    },
                    selectedDays: selectedDays,
                  };
                }
                return {
                  inPerson: [],
                  videoCall: [],
                  voiceCall: [],
                  callVideo: { startTime: "", endTime: "" },
                  selectedDays: [],
                };
              })(),
            averageConsultationMinutes: doctor.averageConsultationMinutes || 20,
            documents:
              doctor.documents && Array.isArray(doctor.documents)
                ? doctor.documents
                : [],
            digitalSignature: doctor.digitalSignature
              ? {
                imageUrl: normalizeImageUrl(
                  doctor.digitalSignature.imageUrl || "",
                ),
                uploadedAt: doctor.digitalSignature.uploadedAt || null,
              }
              : {
                imageUrl: "",
                uploadedAt: null,
              },
            status: doctor.status || "pending",
            isActive: doctor.isActive !== undefined ? doctor.isActive : true,
          };

          setFormData(transformedData);
          // Store stable value from backend
          setStableAverageConsultationMinutes(
            doctor.averageConsultationMinutes || 20,
          );

          // Update cache
          const storage = localStorage.getItem("doctorAuthToken")
            ? localStorage
            : sessionStorage;
          storage.setItem("doctorProfile", JSON.stringify(doctor));
        }
      } catch (error) {
        console.error("Error fetching doctor profile:", error);
        toast.error("Failed to load profile data. Please refresh the page.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDoctorProfile();
  }, []);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const servicesRes = await getServices();
        if (Array.isArray(servicesRes)) {
          setAvailableServices(servicesRes.map((service) => service.name).filter(Boolean));
        }
      } catch (error) {
        console.error("Error fetching services:", error);
      }
    };

    fetchServices();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (servicesDropdownRef.current && !servicesDropdownRef.current.contains(event.target)) {
        setShowServicesDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredServices = availableServices.filter((service) => {
    const term = serviceSearchTerm.toLowerCase().trim();
    const matchesSearch = !term || service.toLowerCase().includes(term);
    const alreadySelected = (formData.services || []).includes(service);
    return matchesSearch && !alreadySelected;
  });

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const formatAddress = (address) => {
    if (!address) return "—";
    const parts = [
      address.line1,
      address.line2,
      [address.city, address.state].filter(Boolean).join(", "),
      address.postalCode,
      address.country,
    ].filter(Boolean);
    return parts.join(", ") || "—";
  };

  const handleInputChange = (field, value) => {
    if (field.includes(".")) {
      const parts = field.split(".");

      // Handle fee calculations for fees.inPerson.original, fees.inPerson.discount, etc.
      if (
        parts.length === 3 &&
        parts[0] === "fees" &&
        (parts[2] === "original" ||
          parts[2] === "discount" ||
          parts[2] === "confirmSlotPercentage")
      ) {
        const [, mode, subField] = parts;
        setFormData((prev) => {
          const currentFees = prev.fees || {};
          const currentModeFees = currentFees[mode] || {
            original: 0,
            discount: 0,
            final: 0,
            confirmSlotPercentage: 0,
            confirmSlotAmount: 0,
            selectedDays: [],
          };

          const originalValue =
            subField === "original" ? value : currentModeFees.original;
          const discountValue =
            subField === "discount" ? value : currentModeFees.discount;
          const percentageValue =
            subField === "confirmSlotPercentage"
              ? value
              : currentModeFees.confirmSlotPercentage;

          const original = parseFloat(originalValue) || 0;
          const discount = parseFloat(discountValue) || 0;
          const final = Math.max(0, original - discount);
          const percentage = parseFloat(percentageValue) || 0;
          const confirmSlotAmount = Math.round((final * percentage) / 100);

          const updatedFees = {
            ...currentFees,
            [mode]: {
              ...currentModeFees,
              [subField]: value,
              final: final,
              confirmSlotAmount: confirmSlotAmount,
            },
          };

          // Sync with top-level fields for inPerson
          const updatedData = {
            ...prev,
            fees: updatedFees,
          };

          if (mode === "inPerson") {
            updatedData.original_fees = original;
            updatedData.discount_amount = discount;
            updatedData.consultationFee = final;
          }

          return updatedData;
        });
        return;
      }

      if (parts.length === 2) {
        const [parent, child] = parts;
        setFormData((prev) => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value,
          },
        }));
      } else if (parts.length === 3) {
        const [parent, child, grandchild] = parts;
        setFormData((prev) => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: {
              ...prev[parent]?.[child],
              [grandchild]: value,
            },
          },
        }));
      } else if (parts.length === 4) {
        // Handle fees.inPerson.selectedDays or similar
        const [parent, child, grandchild, greatGrandchild] = parts;
        setFormData((prev) => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: {
              ...prev[parent]?.[child],
              [grandchild]: {
                ...prev[parent]?.[child]?.[grandchild],
                [greatGrandchild]: value,
              },
            },
          },
        }));
      }
    } else {
      setFormData((prev) => {
        const nextData = { ...prev, [field]: value };

        // Handle auto-calculation for nested fee fields
        if (field.startsWith("fees.")) {
          const parts = field.split(".");
          if (parts.length === 3) {
            const [, mode, subField] = parts;
            const original =
              parseFloat(
                subField === "original" ? value : prev.fees[mode].original,
              ) || 0;
            const discount =
              parseFloat(
                subField === "discount" ? value : prev.fees[mode].discount,
              ) || 0;
            const final = Math.max(0, original - discount);

            nextData.fees = {
              ...nextData.fees,
              [mode]: {
                ...nextData.fees[mode],
                [subField]: value,
                final: final,
              },
            };

            // Sync with top-level fields for inPerson
            if (mode === "inPerson") {
              nextData.original_fees = original;
              nextData.discount_amount = discount;
              nextData.consultationFee = final;
            }
          }
        }

        // Handle auto-calculation for top-level fee fields (backward compatibility)
        if (field === "original_fees" || field === "discount_amount") {
          const original =
            parseFloat(
              field === "original_fees" ? value : prev.original_fees,
            ) || 0;
          const discount =
            parseFloat(
              field === "discount_amount" ? value : prev.discount_amount,
            ) || 0;
          const final = Math.max(0, original - discount);
          nextData.consultationFee = final;

          // Sync with nested fees.inPerson
          nextData.fees = {
            ...nextData.fees,
            inPerson: {
              ...nextData.fees.inPerson,
              original: original,
              discount: discount,
              final: final,
            },
          };
        }

        return nextData;
      });
    }
  };

  const handleArrayAdd = (field, newItem) => {
    if (!newItem || (typeof newItem === "string" && !newItem.trim())) {
      return;
    }
    setFormData((prev) => {
      const currentArray = prev[field] || [];
      // For tag-like string arrays, check if value already exists (case-insensitive)
      if ((field === "languages" || field === "services") && typeof newItem === "string") {
        const exists = currentArray.some(
          (item) =>
            typeof item === "string" &&
            item.toLowerCase().trim() === newItem.toLowerCase().trim(),
        );
        if (exists) {
          return prev; // Don't add duplicate
        }
      }
      return {
        ...prev,
        [field]: [...currentArray, newItem],
      };
    });
  };

  const handleArrayRemove = (field, index) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleArrayItemChange = (field, index, subField, value) => {
    setFormData((prev) => {
      const updated = [...(prev[field] || [])];
      updated[index] = { ...updated[index], [subField]: value };
      return { ...prev, [field]: updated };
    });
  };

  const addSlot = (type, day) => {
    setFormData((prev) => {
      const modeData = prev.availabilitySlots?.[type] || [];
      const dayIndex = modeData.findIndex((d) => d.day === day);

      let newModeData;
      if (dayIndex === -1) {
        newModeData = [
          ...modeData,
          { day, slots: [{ startTime: "", endTime: "", isFree: false }] },
        ];
      } else {
        newModeData = modeData.map((d, idx) =>
          idx === dayIndex
            ? {
              ...d,
              slots: [
                ...d.slots,
                { startTime: "", endTime: "", isFree: false },
              ],
            }
            : d,
        );
      }

      return {
        ...prev,
        availabilitySlots: {
          ...prev.availabilitySlots,
          [type]: newModeData,
        },
      };
    });
  };

  const updateSlot = (type, day, index, field, value) => {
    setFormData((prev) => {
      const modeData = prev.availabilitySlots?.[type] || [];
      const dayIndex = modeData.findIndex((d) => d.day === day);

      if (dayIndex === -1) return prev;

      const newModeData = modeData.map((d, idx) => {
        if (idx === dayIndex) {
          const updatedSlots = d.slots.map((slot, sIdx) =>
            sIdx === index ? { ...slot, [field]: value } : slot,
          );
          return { ...d, slots: updatedSlots };
        }
        return d;
      });

      return {
        ...prev,
        availabilitySlots: {
          ...prev.availabilitySlots,
          [type]: newModeData,
        },
      };
    });
  };

  const removeSlot = (type, day, index) => {
    setFormData((prev) => {
      const modeData = prev.availabilitySlots?.[type] || [];
      const dayIndex = modeData.findIndex((d) => d.day === day);

      if (dayIndex === -1) return prev;

      const newModeData = modeData.map((d, idx) => {
        if (idx === dayIndex) {
          return {
            ...d,
            slots: d.slots.filter((_, sIdx) => sIdx !== index),
          };
        }
        return d;
      });

      return {
        ...prev,
        availabilitySlots: {
          ...prev.availabilitySlots,
          [type]: newModeData,
        },
      };
    });
  };

  const copySlotsToAllDays = (type, sourceDay) => {
    setFormData((prev) => {
      const modeData = prev.availabilitySlots?.[type] || [];
      const sourceConfig = modeData.find((d) => d.day === sourceDay);
      if (!sourceConfig) return prev;

      const selectedDays =
        prev.availabilitySlots?.[`${type}SelectedDays`] || [];

      const newModeData = modeData.map((d) => {
        if (selectedDays.includes(d.day) && d.day !== sourceDay) {
          return {
            ...d,
            slots: sourceConfig.slots.map((s) => ({ ...s })),
          };
        }
        return d;
      });

      // Also ensure all selected days that weren't in modeData are added
      const existingDays = modeData.map((d) => d.day);
      const daysToAdd = selectedDays.filter(
        (day) => !existingDays.includes(day),
      );

      const addedModeData = [
        ...newModeData,
        ...daysToAdd.map((day) => ({
          day,
          slots: sourceConfig.slots.map((s) => ({ ...s })),
        })),
      ];

      return {
        ...prev,
        availabilitySlots: {
          ...prev.availabilitySlots,
          [type]: addedModeData,
        },
      };
    });
    toast.success(`Slots from ${sourceDay} copied to all selected days`);
  };

  const handleProfileImageChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      toast.warning("Please select an image file");
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.warning("Image size should be less than 5MB");
      return;
    }

    try {
      toast.info("Uploading image...");
      const response = await uploadProfileImage(file);

      if (response && response.url) {
        const imageUrl = normalizeImageUrl(response.url);
        setFormData((prev) => ({
          ...prev,
          profileImage: imageUrl,
        }));
        toast.success("Profile image uploaded successfully!");
      }
    } catch (error) {
      console.error("Error uploading profile image:", error);
      toast.error(error.message || "Failed to upload profile image");
    }
  };

  const handleClinicImagesChange = async (event) => {
    const files = Array.from(event.target.files);
    if (!files || files.length === 0) return;

    // Check current images count
    const currentImages = formData.clinicDetails?.images || [];
    const totalImages = currentImages.length + files.length;

    if (totalImages > 5) {
      toast.warning(`You can upload maximum 5 images. You have ${currentImages.length} images already.`);
      return;
    }

    // Validate each file
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.warning("Please select only image files");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.warning("Each image size should be less than 5MB");
        return;
      }
    }

    try {
      toast.info(`Uploading ${files.length} image(s)...`);

      // Upload all images
      const uploadPromises = files.map(file => uploadProfileImage(file));
      const responses = await Promise.all(uploadPromises);

      // Filter successful uploads and normalize URLs
      const newImages = responses
        .filter(response => response && response.url)
        .map(response => ({
          url: response.url,
          publicId: response.publicId || '',
          uploadedAt: new Date()
        }));

      if (newImages.length > 0) {
        setFormData((prev) => ({
          ...prev,
          clinicDetails: {
            ...prev.clinicDetails,
            images: [...(prev.clinicDetails?.images || []), ...newImages]
          }
        }));
        toast.success(`${newImages.length} image(s) uploaded successfully!`);
      }
    } catch (error) {
      console.error("Error uploading clinic images:", error);
      toast.error(error.message || "Failed to upload clinic images");
    }

    // Reset file input
    event.target.value = "";
  };


  const handleSignatureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      toast.warning("Please select an image file");
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.warning("Image size should be less than 5MB");
      return;
    }

    try {
      // Upload the image directly
      toast.info("Uploading signature...");
      const response = await uploadSignature(file);

      if (response && response.url) {
        const imageUrl = normalizeImageUrl(response.url);
        setFormData((prev) => ({
          ...prev,
          digitalSignature: {
            imageUrl: imageUrl,
            uploadedAt: new Date(),
          },
        }));
        toast.success("Signature uploaded successfully!");
      }
    } catch (error) {
      console.error("Error uploading signature:", error);
      toast.error(error.message || "Failed to upload signature");
    }

    // Reset file input
    event.target.value = "";
  };

  const handleRemoveSignature = () => {
    setFormData((prev) => ({
      ...prev,
      digitalSignature: {
        imageUrl: "",
        uploadedAt: null,
      },
    }));
  };

  // Helper function to convert 24-hour format to 12-hour format for storage
  const convertTo12HourForStorage = (time24) => {
    if (!time24) return "";

    // Handle both "HH:MM" and "HH:MM:SS" formats
    const [hours, minutes] = time24.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) return time24;

    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
    const minutesStr = minutes.toString().padStart(2, "0");

    return `${hours12}:${minutesStr} ${period}`;
  };

  const handleSave = async () => {
    const token = getAuthToken("doctor");
    if (!token) {
      toast.error("Please login to save profile");
      return;
    }

    try {
      setIsSaving(true);

      // Prepare availabilitySlots for backend (convert to 12-hour format)
      const availabilitySlotsForBackend = formData.availabilitySlots
        ? {
          inPerson: Array.isArray(formData.availabilitySlots.inPerson)
            ? formData.availabilitySlots.inPerson.map(slot => ({
              startTime: convertTo12HourForStorage(slot.startTime),
              endTime: convertTo12HourForStorage(slot.endTime),
              isFree: !!slot.isFree,
            }))
            : [],
          videoCall: Array.isArray(formData.availabilitySlots.videoCall)
            ? formData.availabilitySlots.videoCall.map(slot => ({
              startTime: convertTo12HourForStorage(slot.startTime),
              endTime: convertTo12HourForStorage(slot.endTime),
              isFree: !!slot.isFree,
            }))
            : [],
          voiceCall: Array.isArray(formData.availabilitySlots.voiceCall)
            ? formData.availabilitySlots.voiceCall.map(slot => ({
              startTime: convertTo12HourForStorage(slot.startTime),
              endTime: convertTo12HourForStorage(slot.endTime),
              isFree: !!slot.isFree,
            }))
            : [],
          // Keep callVideo for backward compatibility (use first video slot or existing)
          callVideo: {
            startTime: formData.availabilitySlots.callVideo?.startTime
              ? convertTo12HourForStorage(formData.availabilitySlots.callVideo.startTime)
              : formData.availabilitySlots.videoCall?.[0]?.startTime
                ? convertTo12HourForStorage(formData.availabilitySlots.videoCall[0].startTime)
                : "",
            endTime: formData.availabilitySlots.callVideo?.endTime
              ? convertTo12HourForStorage(formData.availabilitySlots.callVideo.endTime)
              : formData.availabilitySlots.videoCall?.[0]?.endTime
                ? convertTo12HourForStorage(formData.availabilitySlots.videoCall[0].endTime)
                : "",
          },
          selectedDays: Array.isArray(formData.availabilitySlots.selectedDays)
            ? formData.availabilitySlots.selectedDays
            : [],
        }
        : null;

      // Generate availability array for backward compatibility
      const availabilityForBackend =
        availabilitySlotsForBackend &&
          availabilitySlotsForBackend.selectedDays.length > 0
          ? availabilitySlotsForBackend.selectedDays.map((day) => {
            const slots = [];

            // Add In-Person slots
            if (Array.isArray(availabilitySlotsForBackend.inPerson)) {
              availabilitySlotsForBackend.inPerson.forEach(slot => {
                if (slot.startTime && slot.endTime) {
                  slots.push({
                    consultationType: "in_person",
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    isFree: !!slot.isFree,
                  });
                }
              });
            }

            // Add Video Call slots
            if (Array.isArray(availabilitySlotsForBackend.videoCall)) {
              availabilitySlotsForBackend.videoCall.forEach(slot => {
                if (slot.startTime && slot.endTime) {
                  slots.push({
                    consultationType: "video_call",
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    isFree: !!slot.isFree,
                  });
                }
              });
            }

            // Add Voice Call slots
            if (Array.isArray(availabilitySlotsForBackend.voiceCall)) {
              availabilitySlotsForBackend.voiceCall.forEach(slot => {
                if (slot.startTime && slot.endTime) {
                  slots.push({
                    consultationType: "voice_call",
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    isFree: !!slot.isFree,
                  });
                }
              });
            }

            return {
              day: day,
              slots: slots,
              // Backward compatibility for top-level startTime/endTime (use first available slot)
              startTime: slots[0]?.startTime || "",
              endTime: slots[0]?.endTime || "",
            };
          })
          : [];

      // Prepare data for backend (match backend expected format)
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        gender: formData.gender,
        profileImage: formData.profileImage,
        specialization: formData.specialization,
        licenseNumber: formData.licenseNumber,
        experienceYears: formData.experienceYears,
        qualification: formData.qualification,
        bio: formData.bio,
        fees: formData.fees,
        original_fees: formData.original_fees,
        discount_amount: formData.discount_amount,
        consultationFee: formData.consultationFee,
        education: formData.education,
        languages: formData.languages,
        services: formData.services,
        consultationModes: formData.consultationModes,
        clinicDetails: formData.clinicDetails,
        availabilitySlots: availabilitySlotsForBackend,
        availability: availabilityForBackend, // For backward compatibility
        averageConsultationMinutes: formData.averageConsultationMinutes,
        documents: formData.documents,
        digitalSignature: formData.digitalSignature,
        isActive: formData.isActive,
      };

      const response = await updateDoctorProfile(updateData);

      if (response) {
        // Update cache
        const storage = localStorage.getItem("doctorAuthToken")
          ? localStorage
          : sessionStorage;
        const savedDoctor = response.doctor || response;
        storage.setItem("doctorProfile", JSON.stringify(savedDoctor));
        storage.setItem(
          "doctorProfileActive",
          JSON.stringify(formData.isActive),
        );

        // Update stable value with saved value
        if (savedDoctor?.averageConsultationMinutes !== undefined) {
          setStableAverageConsultationMinutes(
            savedDoctor.averageConsultationMinutes,
          );
        } else if (formData.averageConsultationMinutes !== undefined) {
          setStableAverageConsultationMinutes(
            formData.averageConsultationMinutes,
          );
        }

        toast.success("Profile updated successfully!");
        setIsEditing(false);
        setActiveSection(null);
        setShowServicesDropdown(false);
        setServiceSearchTerm("");
      } else {
        toast.error(response.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error(
        error.message || "Failed to update profile. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async () => {
    const newActiveStatus = !formData.isActive;
    const updatedFormData = { ...formData, isActive: newActiveStatus };
    setFormData(updatedFormData);

    try {
      // Update backend immediately
      const response = await updateDoctorProfile({ isActive: newActiveStatus });

      if (response) {
        // Update cache
        const storage = localStorage.getItem("doctorAuthToken")
          ? localStorage
          : sessionStorage;
        storage.setItem(
          "doctorProfile",
          JSON.stringify(response.doctor || response || updatedFormData),
        );
        storage.setItem("doctorProfileActive", JSON.stringify(newActiveStatus));

        if (newActiveStatus) {
          toast.success("Your profile is now active and visible to patients.");
        } else {
          toast.info(
            "Your profile is now inactive and will not be visible to patients.",
          );
        }
      } else {
        // Revert on error
        setFormData(formData);
        toast.error(response.message || "Failed to update profile status");
      }
    } catch (error) {
      // Revert on error
      setFormData(formData);
      console.error("Error updating profile status:", error);
      toast.error(
        error.message || "Failed to update profile status. Please try again.",
      );
    }
  };

  const handleCancel = async () => {
    // Reload original data from backend
    try {
      const response = await getDoctorProfile();
      if (response) {
        const doctor = response.doctor || response;
        const transformedData = {
          firstName: doctor.firstName || "",
          lastName: doctor.lastName || "",
          email: doctor.email || "",
          phone: doctor.phone || "",
          gender: doctor.gender || "",
          profileImage:
            doctor.profileImage || doctor.documents?.profileImage || "",
          specialization: doctor.specialization || "",
          licenseNumber: doctor.licenseNumber || "",
          experienceYears: doctor.experienceYears || 0,
          qualification: doctor.qualification || "",
          bio: doctor.bio || "",
          original_fees: doctor.original_fees || 0,
          discount_amount: doctor.discount_amount || 0,
          consultationFee: doctor.consultationFee || 0,
          fees: doctor.fees
            ? {
              inPerson: {
                original:
                  doctor.fees.inPerson?.original || doctor.original_fees || 0,
                discount:
                  doctor.fees.inPerson?.discount ||
                  doctor.discount_amount ||
                  0,
                final:
                  doctor.fees.inPerson?.final || doctor.consultationFee || 0,
                confirmSlotPercentage:
                  doctor.fees.inPerson?.confirmSlotPercentage || 0,
                confirmSlotAmount:
                  doctor.fees.inPerson?.confirmSlotAmount || 0,
                selectedDays: Array.isArray(
                  doctor.fees.inPerson?.selectedDays,
                )
                  ? doctor.fees.inPerson.selectedDays
                  : [],
              },
              videoCall: {
                original: doctor.fees.videoCall?.original || 0,
                discount: doctor.fees.videoCall?.discount || 0,
                final: doctor.fees.videoCall?.final || 0,
                selectedDays: Array.isArray(
                  doctor.fees.videoCall?.selectedDays,
                )
                  ? doctor.fees.videoCall.selectedDays
                  : [],
              },
              voiceCall: {
                original: doctor.fees.voiceCall?.original || 0,
                discount: doctor.fees.voiceCall?.discount || 0,
                final: doctor.fees.voiceCall?.final || 0,
                selectedDays: Array.isArray(
                  doctor.fees.voiceCall?.selectedDays,
                )
                  ? doctor.fees.voiceCall.selectedDays
                  : [],
              },
            }
            : {
              inPerson: {
                original: doctor.original_fees || 0,
                discount: doctor.discount_amount || 0,
                final: doctor.consultationFee || 0,
                confirmSlotPercentage: 0,
                confirmSlotAmount: 0,
                selectedDays: [],
              },
              videoCall: {
                original: 0,
                discount: 0,
                final: 0,
                selectedDays: [],
              },
              voiceCall: {
                original: 0,
                discount: 0,
                final: 0,
                selectedDays: [],
              },
            },
          education: Array.isArray(doctor.education) ? doctor.education : [],
          languages: Array.isArray(doctor.languages) ? doctor.languages : [],
          services: Array.isArray(doctor.services) ? doctor.services : [],
          consultationModes: Array.isArray(doctor.consultationModes)
            ? doctor.consultationModes
            : [],
          clinicDetails: doctor.clinicDetails || {
            name: "",
            address: {
              line1: "",
              line2: "",
              city: "",
              state: "",
              postalCode: "",
              country: "",
            },
          },
          availability: Array.isArray(doctor.availability)
            ? doctor.availability
            : [],
          availabilitySlots: doctor.availabilitySlots
            ? {
              inPerson: Array.isArray(doctor.availabilitySlots.inPerson)
                ? doctor.availabilitySlots.inPerson.map(slot => ({
                  startTime: convert12HourTo24Hour(slot.startTime) || "",
                  endTime: convert12HourTo24Hour(slot.endTime) || "",
                  isFree: !!slot.isFree
                }))
                : [],
              videoCall: Array.isArray(doctor.availabilitySlots.videoCall)
                ? doctor.availabilitySlots.videoCall.map(slot => ({
                  startTime: convert12HourTo24Hour(slot.startTime) || "",
                  endTime: convert12HourTo24Hour(slot.endTime) || "",
                  isFree: !!slot.isFree
                }))
                : [],
              voiceCall: Array.isArray(doctor.availabilitySlots.voiceCall)
                ? doctor.availabilitySlots.voiceCall.map(slot => ({
                  startTime: convert12HourTo24Hour(slot.startTime) || "",
                  endTime: convert12HourTo24Hour(slot.endTime) || "",
                  isFree: !!slot.isFree
                }))
                : [],
              callVideo: {
                startTime:
                  convert12HourTo24Hour(
                    doctor.availabilitySlots.callVideo?.startTime,
                  ) || "",
                endTime:
                  convert12HourTo24Hour(
                    doctor.availabilitySlots.callVideo?.endTime,
                  ) || "",
              },
              selectedDays: Array.isArray(
                doctor.availabilitySlots.selectedDays,
              )
                ? doctor.availabilitySlots.selectedDays
                : [],
            }
            : (() => {
              // Convert old availability format to new format
              if (
                Array.isArray(doctor.availability) &&
                doctor.availability.length > 0
              ) {
                const firstAvail = doctor.availability[0];
                const inPersonSlot =
                  firstAvail.slots?.find(
                    (s) => s.consultationType === "in_person",
                  ) ||
                  (firstAvail.startTime
                    ? {
                      startTime: firstAvail.startTime,
                      endTime: firstAvail.endTime,
                    }
                    : null);
                const callVideoSlot = firstAvail.slots?.find(
                  (s) => s.consultationType === "call_video",
                );
                const selectedDays = doctor.availability
                  .map((a) => a.day)
                  .filter(Boolean);

                return {
                  inPerson: {
                    startTime:
                      convert12HourTo24Hour(inPersonSlot?.startTime) || "",
                    endTime:
                      convert12HourTo24Hour(inPersonSlot?.endTime) || "",
                  },
                  callVideo: {
                    startTime:
                      convert12HourTo24Hour(callVideoSlot?.startTime) || "",
                    endTime:
                      convert12HourTo24Hour(callVideoSlot?.endTime) || "",
                  },
                  selectedDays: selectedDays,
                };
              }
              return {
                inPerson: { startTime: "", endTime: "" },
                callVideo: { startTime: "", endTime: "" },
                selectedDays: [],
              };
            })(),
          averageConsultationMinutes: doctor.averageConsultationMinutes || 20,
          documents: Array.isArray(doctor.documents) ? doctor.documents : [],
          digitalSignature: doctor.digitalSignature || {
            imageUrl: "",
            uploadedAt: null,
          },
          status: doctor.status || "pending",
          isActive: doctor.isActive !== undefined ? doctor.isActive : true,
        };
        setFormData(transformedData);
        // Update stable value when profile is reloaded
        setStableAverageConsultationMinutes(
          doctor.averageConsultationMinutes || 20,
        );
      }
    } catch (error) {
      console.error("Error reloading profile:", error);
      toast.error("Failed to reload profile data");
    }
    setIsEditing(false);
    setActiveSection(null);
    setShowServicesDropdown(false);
    setServiceSearchTerm("");
  };

  // Show loading state
  if (isLoading) {
    return (
      <>
        <DoctorNavbar />
        <section
          className={`flex flex-col gap-4 pb-24 lg:pb-8 ${isDashboardPage ? "-mt-20" : ""} lg:mt-0`}
        >
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent"></div>
              <p className="mt-4 text-sm text-slate-600">Loading profile...</p>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <DoctorNavbar />
      <section
        className={`flex flex-col gap-4 pb-24 lg:pb-8 ${isDashboardPage ? "-mt-20" : ""} lg:mt-0`}
      >
        {/* Desktop Layout: Two Column Grid */}
        <div className="lg:grid lg:grid-cols-3 lg:gap-4 lg:max-w-5xl lg:mx-auto lg:px-4">
          {/* Left Column - Profile Header Card (Desktop) */}
          <div className="lg:col-span-1">
            {/* Profile Header - Desktop Enhanced */}
            <div className="hidden lg:block relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-[#0077C2] via-[var(--color-primary-dark)] to-[#0077C2] p-5 shadow-xl">
              {/* Background Pattern */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />

              {/* Active Status - Top Right Corner */}
              <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5 z-10">
                <button
                  type="button"
                  onClick={handleToggleActive}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 shadow-lg ${formData.isActive
                    ? "bg-emerald-500/95 backdrop-blur-sm text-white border border-emerald-400/50 hover:bg-emerald-500"
                    : "bg-slate-500/95 backdrop-blur-sm text-white border border-slate-400/50 hover:bg-slate-500"
                    }`}
                >
                  {formData.isActive ? (
                    <>
                      <IoCheckmarkCircleOutline className="h-3.5 w-3.5" />
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <IoPowerOutline className="h-3.5 w-3.5" />
                      <span>Inactive</span>
                    </>
                  )}
                </button>
                <p className="text-[10px] text-white/80 text-right whitespace-nowrap drop-shadow-md">
                  {formData.isActive
                    ? "Visible to patients"
                    : "Hidden from patients"}
                </p>
              </div>

              <div className="relative flex flex-col items-center gap-4">
                {/* Profile Picture */}
                <div className="relative">
                  <div className="relative h-24 w-24">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageChange}
                      className="hidden"
                      id="doctor-profile-image-input"
                    />
                    <img
                      src={
                        formData.profileImage ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent((formData.firstName + " " + formData.lastName).trim() || "Doctor")}&background=ffffff&color=11496c&size=128&bold=true`
                      }
                      alt={`${formData.firstName} ${formData.lastName}`}
                      className="h-full w-full rounded-full object-cover ring-4 ring-white/50 shadow-2xl bg-slate-100"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent((formData.firstName + " " + formData.lastName).trim() || "Doctor")}&background=ffffff&color=11496c&size=128&bold=true`;
                      }}
                    />
                    {isEditing && (
                      <label
                        htmlFor="doctor-profile-image-input"
                        className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary shadow-xl transition hover:bg-slate-50 hover:scale-110 cursor-pointer"
                      >
                        <IoCameraOutline className="h-5 w-5" />
                      </label>
                    )}
                  </div>
                </div>

                {/* Name */}
                <div className="text-center">
                  <h1 className="text-xl font-bold text-white mb-1.5">
                    {formData.firstName || formData.lastName
                      ? `${formData.firstName || ""} ${formData.lastName || ""}`.trim()
                      : "Doctor"}
                  </h1>
                  <p className="text-sm text-white/90 mb-3">{formData.email}</p>

                  {/* Specialization & Rating */}
                  <div className="flex flex-col items-center gap-2 mb-3">
                    {formData.specialization && (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-white border border-white/30">
                        <IoMedicalOutline className="h-3.5 w-3.5" />
                        {formData.specialization}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {formData.gender && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-white/20 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-white border border-white/30">
                          <IoPersonOutline className="h-3 w-3" />
                          {formData.gender.charAt(0).toUpperCase() +
                            formData.gender.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="w-full flex flex-col gap-2 mt-1">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-white/20 backdrop-blur-sm px-3 py-2 text-xs font-semibold text-white border border-white/30 transition-all hover:bg-white/30 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <IoCheckmarkCircleOutline className="h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-white/10 backdrop-blur-sm px-3 py-2 text-xs font-semibold text-white/90 border border-white/20 transition-all hover:bg-white/20 hover:scale-105"
                      >
                        <IoCloseOutline className="h-4 w-4" />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(true);
                          setActiveSection("personal");
                        }}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-white/20 backdrop-blur-sm px-3 py-2 text-xs font-semibold text-white border border-white/30 transition-all hover:bg-white/30 active:scale-95"
                      >
                        <IoCreateOutline className="h-3.5 w-3.5" />
                        Edit Profile
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (
                            window.confirm("Are you sure you want to sign out?")
                          ) {
                            try {
                              const { logoutDoctor } =
                                await import("../doctor-services/doctorService");
                              await logoutDoctor();
                              toast.success("Logged out successfully");
                            } catch (error) {
                              console.error("Error during logout:", error);
                              // Clear tokens manually if API call fails
                              const { clearDoctorTokens } =
                                await import("../doctor-services/doctorService");
                              clearDoctorTokens();
                              toast.success("Logged out successfully");
                            }
                            // Force navigation to login page - full page reload to clear all state
                            setTimeout(() => {
                              window.location.href = "/doctor/login";
                            }, 500);
                          }
                        }}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-white/10 backdrop-blur-sm px-3 py-2 text-xs font-semibold text-white/90 border border-white/20 transition-all hover:bg-white/20 active:scale-95"
                      >
                        <IoLogOutOutline className="h-3.5 w-3.5" />
                        Sign Out
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Header - Mobile (Unchanged) */}
            <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200/80 bg-gradient-to-br from-[#0077C2] via-[var(--color-primary-dark)] to-[#0077C2] p-6 sm:p-8 shadow-lg lg:hidden">
              {/* Background Pattern */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />

              {/* Active Status - Top Right Corner */}
              <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5 z-10">
                <button
                  type="button"
                  onClick={handleToggleActive}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 shadow-lg ${formData.isActive
                    ? "bg-emerald-500/95 backdrop-blur-sm text-white border border-emerald-400/50 hover:bg-emerald-500"
                    : "bg-slate-500/95 backdrop-blur-sm text-white border border-slate-400/50 hover:bg-slate-500"
                    }`}
                >
                  {formData.isActive ? (
                    <>
                      <IoCheckmarkCircleOutline className="h-3.5 w-3.5" />
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <IoPowerOutline className="h-3.5 w-3.5" />
                      <span>Inactive</span>
                    </>
                  )}
                </button>
                <p className="text-[10px] text-white/80 text-right whitespace-nowrap drop-shadow-md">
                  {formData.isActive
                    ? "Visible to patients"
                    : "Hidden from patients"}
                </p>
              </div>

              <div className="relative flex flex-col items-center gap-4 sm:gap-5">
                {/* Profile Picture - Centered */}
                <div className="relative">
                  <div className="relative h-24 w-24 sm:h-28 sm:w-28">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageChange}
                      className="hidden"
                      id="doctor-profile-image-input-mobile"
                    />
                    <img
                      src={
                        formData.profileImage ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent((formData.firstName + " " + formData.lastName).trim() || "Doctor")}&background=ffffff&color=11496c&size=128&bold=true`
                      }
                      alt={`${formData.firstName} ${formData.lastName}`}
                      className="h-full w-full rounded-full object-cover ring-2 ring-white/50 shadow-lg bg-slate-100"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent((formData.firstName + " " + formData.lastName).trim() || "Doctor")}&background=ffffff&color=11496c&size=128&bold=true`;
                      }}
                    />
                    {isEditing && (
                      <label
                        htmlFor="doctor-profile-image-input-mobile"
                        className="absolute -bottom-1 -right-1 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white text-primary shadow-lg transition hover:bg-slate-50 cursor-pointer"
                      >
                        <IoCameraOutline className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </label>
                    )}
                  </div>
                </div>

                {/* Name - Centered */}
                <h1 className="text-xl sm:text-2xl font-bold text-white text-center">
                  {formData.firstName || formData.lastName
                    ? `${formData.firstName || ""} ${formData.lastName || ""}`.trim()
                    : "Doctor"}
                </h1>

                {/* Email - Centered */}
                <p className="text-sm sm:text-base text-white/90 text-center truncate max-w-full">
                  {formData.email}
                </p>

                {/* Demographic/Status Info - Small Rounded Buttons */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 backdrop-blur-sm px-3 py-1.5 text-xs sm:text-sm font-semibold text-white border border-white/30">
                    <IoPersonOutline className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {formData.gender
                      ? formData.gender.charAt(0).toUpperCase() +
                      formData.gender.slice(1)
                      : "Not set"}
                  </span>
                </div>

                {/* Action Buttons - Full Width, Stacked */}
                <div className="w-full flex flex-col gap-2.5 sm:gap-3 mt-2">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-white/20 backdrop-blur-sm px-4 py-3 text-sm font-semibold text-white border border-white/30 transition-all hover:bg-white/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <IoCheckmarkCircleOutline className="h-4 w-4" />
                            Save
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-white/10 backdrop-blur-sm px-4 py-3 text-sm font-semibold text-white/90 border border-white/20 transition-all hover:bg-white/20 active:scale-95"
                      >
                        <IoCloseOutline className="h-4 w-4" />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(true);
                          setActiveSection("personal");
                        }}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-white/20 backdrop-blur-sm px-4 py-3 text-sm font-semibold text-white border border-white/30 transition-all hover:bg-white/30 active:scale-95"
                      >
                        <IoCreateOutline className="h-4 w-4" />
                        Edit Profile
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (
                            window.confirm("Are you sure you want to sign out?")
                          ) {
                            try {
                              const { logoutDoctor } =
                                await import("../doctor-services/doctorService");
                              await logoutDoctor();
                              toast.success("Logged out successfully");
                            } catch (error) {
                              console.error("Error during logout:", error);
                              // Clear tokens manually if API call fails
                              const { clearDoctorTokens } =
                                await import("../doctor-services/doctorService");
                              clearDoctorTokens();
                              toast.success("Logged out successfully");
                            }
                            // Force navigation to login page - full page reload to clear all state
                            setTimeout(() => {
                              window.location.href = "/doctor/login";
                            }, 500);
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-white/10 backdrop-blur-sm px-4 py-3 text-sm font-semibold text-white/90 border border-white/20 transition-all hover:bg-white/20 active:scale-95"
                      >
                        <IoLogOutOutline className="h-4 w-4" />
                        Sign Out
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Information Sections (Desktop) */}
          <div className="lg:col-span-2 lg:space-y-4">
            {/* Doctor Personal Information */}
            <div className="rounded-xl sm:rounded-2xl lg:rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden hover:shadow-lg hover:shadow-slate-200/60 transition-shadow duration-200 lg:shadow-xl lg:hover:shadow-2xl">
              <button
                type="button"
                onClick={() =>
                  setActiveSection(
                    activeSection === "personal" ? null : "personal",
                  )
                }
                className="w-full flex items-center justify-between px-3 sm:px-5 lg:px-4 py-3 sm:py-4 lg:py-3 hover:bg-slate-50/50 transition-colors"
              >
                <h2 className="text-sm sm:text-base lg:text-base font-bold text-slate-900">
                  Doctor Personal Information
                </h2>
                {activeSection === "personal" || isEditing ? (
                  <IoChevronUpOutline className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 shrink-0" />
                ) : (
                  <IoChevronDownOutline className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 shrink-0" />
                )}
              </button>

              {(activeSection === "personal" || isEditing) && (
                <div className="px-3 sm:px-5 pb-4 sm:pb-5 border-t border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-3 sm:pt-4">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        First Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) =>
                            handleInputChange("firstName", e.target.value)
                          }
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900">
                          {formData.firstName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Last Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) =>
                            handleInputChange("lastName", e.target.value)
                          }
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900">
                          {formData.lastName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Gender
                      </label>
                      {isEditing ? (
                        <select
                          value={formData.gender}
                          onChange={(e) =>
                            handleInputChange("gender", e.target.value)
                          }
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2"
                        >
                          <option value="">Select Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                          <option value="prefer_not_to_say">
                            Prefer not to say
                          </option>
                        </select>
                      ) : (
                        <p className="text-sm font-semibold text-slate-900">
                          {formData.gender
                            ? formData.gender.charAt(0).toUpperCase() +
                            formData.gender.slice(1)
                            : "Not set"}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Email
                      </label>
                      {isEditing ? (
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            handleInputChange("email", e.target.value)
                          }
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2"
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <IoMailOutline className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate font-medium">
                            {formData.email}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Phone
                      </label>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) =>
                            handleInputChange("phone", e.target.value)
                          }
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2"
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <IoCallOutline className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium">{formData.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Professional Details */}
            <div className="rounded-xl sm:rounded-2xl lg:rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden hover:shadow-lg hover:shadow-slate-200/60 transition-shadow duration-200 lg:shadow-xl lg:hover:shadow-2xl">
              <button
                type="button"
                onClick={() =>
                  setActiveSection(
                    activeSection === "professional" ? null : "professional",
                  )
                }
                className="w-full flex items-center justify-between px-3 sm:px-5 lg:px-4 py-3 sm:py-4 lg:py-3 hover:bg-slate-50/50 transition-colors"
              >
                <h2 className="text-sm sm:text-base lg:text-base font-bold text-slate-900">
                  Professional Details
                </h2>
                {activeSection === "professional" || isEditing ? (
                  <IoChevronUpOutline className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 shrink-0" />
                ) : (
                  <IoChevronDownOutline className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 shrink-0" />
                )}
              </button>

              {(activeSection === "professional" || isEditing) && (
                <div className="px-3 sm:px-5 pb-4 sm:pb-5 border-t border-slate-100 space-y-4 sm:space-y-5 pt-4 sm:pt-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Specialization
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.specialization}
                          onChange={(e) =>
                            handleInputChange("specialization", e.target.value)
                          }
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900">
                          {formData.specialization}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        License Number
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.licenseNumber}
                          onChange={(e) =>
                            handleInputChange("licenseNumber", e.target.value)
                          }
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900">
                          {formData.licenseNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Experience (Years)
                      </label>
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          value={formData.experienceYears}
                          onChange={(e) =>
                            handleInputChange(
                              "experienceYears",
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-900">
                          {formData.experienceYears || 0} years
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-2 space-y-4">
                      <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 px-1">
                        <IoBriefcaseOutline className="h-4 w-4 text-primary" />
                        Fee Management Structures
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* In-Person Fee */}
                        <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                          <h4 className="text-[11px] font-bold text-[#0077C2] mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                            <IoPersonOutline className="h-3.5 w-3.5" />
                            In-Person
                          </h4>
                          <div className="space-y-3">
                              <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                  Base Fee (₹)
                                </label>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min="0"
                                    value={formData.fees.inPerson.original}
                                    onChange={(e) =>
                                      handleInputChange(
                                        "fees.inPerson.original",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 transition focus:ring-2 focus:ring-primary/20"
                                  />
                                ) : (
                                  <p className="text-sm font-bold text-slate-900">
                                    ₹{formData.fees.inPerson.original || 0}
                                  </p>
                                )}
                              </div>
                              <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                  Discount (₹)
                                </label>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min="0"
                                    value={formData.fees.inPerson.discount}
                                    onChange={(e) =>
                                      handleInputChange(
                                        "fees.inPerson.discount",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 transition focus:ring-2 focus:ring-primary/20"
                                  />
                                ) : (
                                  <p className="text-sm font-bold text-emerald-600">
                                    ₹{formData.fees.inPerson.discount || 0}
                                  </p>
                                )}
                              </div>
                              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">
                                  Final
                                </span>
                                <span className="text-sm font-black text-primary">
                                  ₹{formData.fees.inPerson.final}
                                </span>
                              </div>
                              {isEditing && (
                                <div className="pt-2 border-t border-slate-200">
                                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                    Confirm Slot %
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.fees.inPerson.confirmSlotPercentage}
                                    onChange={(e) =>
                                      handleInputChange(
                                        "fees.inPerson.confirmSlotPercentage",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 transition focus:ring-2 focus:ring-primary/20"
                                  />
                                {formData.fees.inPerson.confirmSlotPercentage >
                                  0 && (
                                    <p className="mt-1 text-[9px] text-slate-600">
                                      Confirm Slot Amount: ₹
                                      {Math.round(
                                        (formData.fees.inPerson.final *
                                          (formData.fees.inPerson
                                            .confirmSlotPercentage || 0)) /
                                        100,
                                      )}
                                    </p>
                                  )}
                              </div>
                            )}
                            {!isEditing &&
                              formData.fees.inPerson.confirmSlotPercentage >
                              0 && (
                                <div className="pt-2 border-t border-slate-200">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                                      Confirm Slot
                                    </span>
                                    <span className="text-sm font-bold text-amber-600">
                                      ₹
                                      {formData.fees.inPerson
                                        .confirmSlotAmount ||
                                        Math.round(
                                          (formData.fees.inPerson.final *
                                            (formData.fees.inPerson
                                              .confirmSlotPercentage || 0)) /
                                          100,
                                        )}{" "}
                                      (
                                      {
                                        formData.fees.inPerson
                                          .confirmSlotPercentage
                                      }
                                      %)
                                    </span>
                                  </div>
                                </div>
                              )}
                            {/* COD Toggle */}
                            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">
                                COD (Pay at Clinic)
                              </span>

                              {isEditing ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleInputChange(
                                      "fees.inPerson.codEnabled",
                                      !formData.fees.inPerson.codEnabled,
                                    )
                                  }
                                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors
        ${formData.fees.inPerson.codEnabled ? "bg-emerald-500" : "bg-slate-300"}`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
          ${formData.fees.inPerson.codEnabled ? "translate-x-4" : "translate-x-1"}`}
                                  />
                                </button>
                              ) : (
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded
        ${formData.fees.inPerson.codEnabled
                                      ? "text-emerald-700 bg-emerald-50"
                                      : "text-slate-600 bg-slate-100"
                                    }`}
                                >
                                  {formData.fees.inPerson.codEnabled
                                    ? "Enabled"
                                    : "Disabled"}
                                </span>
                              )}
                            </div>

                            {isEditing && (
                              <div className="pt-2 border-t border-slate-200">
                                <label className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                  Select Days
                                </label>
                                <div className="grid grid-cols-2 gap-1.5">
                                  {[
                                    "Monday",
                                    "Tuesday",
                                    "Wednesday",
                                    "Thursday",
                                    "Friday",
                                    "Saturday",
                                    "Sunday",
                                  ].map((day) => (
                                    <label
                                      key={day}
                                      className="flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={
                                          formData.fees.inPerson.selectedDays?.includes(
                                            day,
                                          ) || false
                                        }
                                        onChange={(e) => {
                                          const currentDays =
                                            formData.fees.inPerson
                                              .selectedDays || [];
                                          const newDays = e.target.checked
                                            ? [...currentDays, day]
                                            : currentDays.filter(
                                              (d) => d !== day,
                                            );
                                          handleInputChange(
                                            "fees.inPerson.selectedDays",
                                            newDays,
                                          );
                                        }}
                                        className="h-3 w-3 rounded border-slate-300 text-primary focus:ring-1 focus:ring-primary"
                                      />
                                      <span className="text-[9px] text-slate-700">
                                        {day.substring(0, 3)}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                            {!isEditing &&
                              formData.fees.inPerson.selectedDays &&
                              formData.fees.inPerson.selectedDays.length >
                              0 && (
                                <div className="pt-2 border-t border-slate-200">
                                  <p className="text-[9px] text-slate-500 mb-1">
                                    Selected Days:
                                  </p>
                                  <p className="text-[10px] text-slate-700">
                                    {formData.fees.inPerson.selectedDays.join(
                                      ", ",
                                    )}
                                  </p>
                                </div>
                              )}
                          </div>
                        </div>

                        {/* Video Call Fee */}
                        <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 border-l-4 border-l-blue-400">
                          <h4 className="text-[11px] font-bold text-blue-600 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                            <IoVideocamOutline className="h-3.5 w-3.5" />
                            Video Call
                          </h4>
                          <div className="space-y-3">
                            <div>
                              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                Base Fee (₹)
                              </label>
                              {isEditing ? (
                                  <input
                                    type="number"
                                    min="0"
                                    value={formData.fees.videoCall.original}
                                    onChange={(e) =>
                                      handleInputChange(
                                        "fees.videoCall.original",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 transition focus:ring-2 focus:ring-blue-500/20"
                                  />
                                ) : (
                                  <p className="text-sm font-bold text-slate-900">
                                    ₹{formData.fees.videoCall.original || 0}
                                  </p>
                                )}
                              </div>
                              <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                  Discount (₹)
                                </label>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min="0"
                                    value={formData.fees.videoCall.discount}
                                    onChange={(e) =>
                                      handleInputChange(
                                        "fees.videoCall.discount",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 transition focus:ring-2 focus:ring-blue-500/20"
                                  />
                              ) : (
                                <p className="text-sm font-bold text-emerald-600">
                                  ₹{formData.fees.videoCall.discount || 0}
                                </p>
                              )}
                            </div>
                            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">
                                Final
                              </span>
                              <span className="text-sm font-black text-blue-600">
                                ₹{formData.fees.videoCall.final}
                              </span>
                            </div>
                            {isEditing && (
                              <div className="pt-2 border-t border-slate-200">
                                <label className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                  Select Days
                                </label>
                                <div className="grid grid-cols-2 gap-1.5">
                                  {[
                                    "Monday",
                                    "Tuesday",
                                    "Wednesday",
                                    "Thursday",
                                    "Friday",
                                    "Saturday",
                                    "Sunday",
                                  ].map((day) => (
                                    <label
                                      key={day}
                                      className="flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={
                                          formData.fees.videoCall.selectedDays?.includes(
                                            day,
                                          ) || false
                                        }
                                        onChange={(e) => {
                                          const currentDays =
                                            formData.fees.videoCall
                                              .selectedDays || [];
                                          const newDays = e.target.checked
                                            ? [...currentDays, day]
                                            : currentDays.filter(
                                              (d) => d !== day,
                                            );
                                          handleInputChange(
                                            "fees.videoCall.selectedDays",
                                            newDays,
                                          );
                                        }}
                                        className="h-3 w-3 rounded border-slate-300 text-blue-600 focus:ring-1 focus:ring-blue-500"
                                      />
                                      <span className="text-[9px] text-slate-700">
                                        {day.substring(0, 3)}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                            {!isEditing &&
                              formData.fees.videoCall.selectedDays &&
                              formData.fees.videoCall.selectedDays.length >
                              0 && (
                                <div className="pt-2 border-t border-slate-200">
                                  <p className="text-[9px] text-slate-500 mb-1">
                                    Selected Days:
                                  </p>
                                  <p className="text-[10px] text-slate-700">
                                    {formData.fees.videoCall.selectedDays.join(
                                      ", ",
                                    )}
                                  </p>
                                </div>
                              )}
                          </div>
                        </div>

                        {/* Voice Call Fee */}
                        <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 border-l-4 border-l-indigo-400">
                          <h4 className="text-[11px] font-bold text-indigo-600 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                            <IoCallOutline className="h-3.5 w-3.5" />
                            Voice Call
                          </h4>
                          <div className="space-y-3">
                            <div>
                              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                Base Fee (₹)
                              </label>
                              {isEditing ? (
                                  <input
                                    type="number"
                                    min="0"
                                    value={formData.fees.voiceCall.original}
                                    onChange={(e) =>
                                      handleInputChange(
                                        "fees.voiceCall.original",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 transition focus:ring-2 focus:ring-indigo-500/20"
                                  />
                                ) : (
                                  <p className="text-sm font-bold text-slate-900">
                                    ₹{formData.fees.voiceCall.original || 0}
                                  </p>
                                )}
                              </div>
                              <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                  Discount (₹)
                                </label>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min="0"
                                    value={formData.fees.voiceCall.discount}
                                    onChange={(e) =>
                                      handleInputChange(
                                        "fees.voiceCall.discount",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 transition focus:ring-2 focus:ring-indigo-500/20"
                                  />
                              ) : (
                                <p className="text-sm font-bold text-emerald-600">
                                  ₹{formData.fees.voiceCall.discount || 0}
                                </p>
                              )}
                            </div>
                            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">
                                Final
                              </span>
                              <span className="text-sm font-black text-indigo-600">
                                ₹{formData.fees.voiceCall.final}
                              </span>
                            </div>
                            {isEditing && (
                              <div className="pt-2 border-t border-slate-200">
                                <label className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                  Select Days
                                </label>
                                <div className="grid grid-cols-2 gap-1.5">
                                  {[
                                    "Monday",
                                    "Tuesday",
                                    "Wednesday",
                                    "Thursday",
                                    "Friday",
                                    "Saturday",
                                    "Sunday",
                                  ].map((day) => (
                                    <label
                                      key={day}
                                      className="flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={
                                          formData.fees.voiceCall.selectedDays?.includes(
                                            day,
                                          ) || false
                                        }
                                        onChange={(e) => {
                                          const currentDays =
                                            formData.fees.voiceCall
                                              .selectedDays || [];
                                          const newDays = e.target.checked
                                            ? [...currentDays, day]
                                            : currentDays.filter(
                                              (d) => d !== day,
                                            );
                                          handleInputChange(
                                            "fees.voiceCall.selectedDays",
                                            newDays,
                                          );
                                        }}
                                        className="h-3 w-3 rounded border-slate-300 text-indigo-600 focus:ring-1 focus:ring-indigo-500"
                                      />
                                      <span className="text-[9px] text-slate-700">
                                        {day.substring(0, 3)}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                            {!isEditing &&
                              formData.fees.voiceCall.selectedDays &&
                              formData.fees.voiceCall.selectedDays.length >
                              0 && (
                                <div className="pt-2 border-t border-slate-200">
                                  <p className="text-[9px] text-slate-500 mb-1">
                                    Selected Days:
                                  </p>
                                  <p className="text-[10px] text-slate-700">
                                    {formData.fees.voiceCall.selectedDays.join(
                                      ", ",
                                    )}
                                  </p>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Qualification
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.qualification || ""}
                        onChange={(e) =>
                          handleInputChange("qualification", e.target.value)
                        }
                        placeholder="e.g., MBBS, MD (Cardiology)"
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900">
                        {formData.qualification || "Not set"}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Bio
                    </label>
                    {isEditing ? (
                      <textarea
                        value={formData.bio || ""}
                        onChange={(e) =>
                          handleInputChange("bio", e.target.value)
                        }
                        rows="2"
                        placeholder="Write about your experience and expertise..."
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2 resize-none"
                      />
                    ) : (
                      <p className="text-sm text-slate-700 leading-snug">
                        {formData.bio || "Not set"}
                      </p>
                    )}
                  </div>

                  {/* Education */}
                  <div className="pt-4 sm:pt-5 border-t border-slate-200">
                    <h3 className="mb-2 sm:mb-3 text-xs sm:text-sm font-semibold text-slate-900">
                      Education
                    </h3>
                    {formData.education && formData.education.length > 0 ? (
                      <div className="space-y-2 sm:space-y-3">
                        {formData.education.map((edu, index) => (
                          <div
                            key={index}
                            className="rounded-lg border border-slate-200 bg-slate-50/80 p-2.5 sm:p-3 hover:bg-slate-50 transition-colors"
                          >
                            {isEditing ? (
                              <div className="space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    placeholder="Institution"
                                    value={edu.institution || ""}
                                    onChange={(e) =>
                                      handleArrayItemChange(
                                        "education",
                                        index,
                                        "institution",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Degree"
                                    value={edu.degree || ""}
                                    onChange={(e) =>
                                      handleArrayItemChange(
                                        "education",
                                        index,
                                        "degree",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    placeholder="Year"
                                    value={edu.year || ""}
                                    onChange={(e) =>
                                      handleArrayItemChange(
                                        "education",
                                        index,
                                        "year",
                                        parseInt(e.target.value) || "",
                                      )
                                    }
                                    className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleArrayRemove("education", index)
                                    }
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 transition hover:bg-red-50"
                                  >
                                    <IoTrashOutline className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-slate-900 truncate">
                                    {edu.institution}
                                  </p>
                                  <p className="mt-0.5 text-[10px] text-slate-600 truncate">
                                    {edu.degree}
                                  </p>
                                  {edu.year && (
                                    <p className="mt-0.5 text-[10px] text-slate-500">
                                      Year: {edu.year}
                                    </p>
                                  )}
                                </div>
                                <IoSchoolOutline className="h-4 w-4 text-primary shrink-0" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        No education records
                      </p>
                    )}
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() =>
                          handleArrayAdd("education", {
                            institution: "",
                            degree: "",
                            year: "",
                          })
                        }
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                      >
                        <IoAddOutline className="h-3.5 w-3.5" />
                        Add Education
                      </button>
                    )}
                  </div>

                  {/* Languages & Consultation Modes */}
                  <div className="pt-4 sm:pt-5 border-t border-slate-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                      <div>
                        <h3 className="mb-2 text-xs font-semibold text-slate-900">
                          Languages
                        </h3>
                        {formData.languages && formData.languages.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {formData.languages.map((lang, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center gap-1 rounded-full bg-[rgba(0,119,194,0.1)] px-2 py-0.5 text-[10px] font-semibold text-primary"
                              >
                                <IoLanguageOutline className="h-2.5 w-2.5 shrink-0" />
                                {lang}
                                {isEditing && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleArrayRemove("languages", index)
                                    }
                                    className="ml-0.5 text-primary hover:text-[#004c86] shrink-0"
                                  >
                                    <IoCloseOutline className="h-2.5 w-2.5" />
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">
                            No languages added
                          </p>
                        )}
                        {isEditing && (
                          <div className="mt-2 flex gap-1.5">
                            <input
                              ref={languageInputRef}
                              type="text"
                              placeholder="Add language"
                              onKeyDown={(e) => {
                                if (
                                  e.key === "Enter" &&
                                  e.target.value.trim()
                                ) {
                                  handleArrayAdd(
                                    "languages",
                                    e.target.value.trim(),
                                  );
                                  e.target.value = "";
                                }
                              }}
                              className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  languageInputRef.current &&
                                  languageInputRef.current.value &&
                                  languageInputRef.current.value.trim()
                                ) {
                                  handleArrayAdd(
                                    "languages",
                                    languageInputRef.current.value.trim(),
                                  );
                                  languageInputRef.current.value = "";
                                }
                              }}
                              className="flex items-center justify-center rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--color-primary-dark)] shrink-0"
                            >
                              <IoAddOutline className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}

                        <div className="mt-4">
                          <h3 className="mb-2 text-xs font-semibold text-slate-900">
                            Services Provided
                          </h3>
                          {formData.services && formData.services.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {formData.services.map((service, index) => (
                                <span
                                  key={`${service}-${index}`}
                                  className="inline-flex items-center gap-1 rounded-full bg-[rgba(0,119,194,0.1)] px-2 py-0.5 text-[10px] font-semibold text-primary"
                                >
                                  <IoBriefcaseOutline className="h-2.5 w-2.5 shrink-0" />
                                  {service}
                                  {isEditing && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleArrayRemove("services", index)
                                      }
                                      className="ml-0.5 text-primary hover:text-[#004c86] shrink-0"
                                    >
                                      <IoCloseOutline className="h-2.5 w-2.5" />
                                    </button>
                                  )}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500">
                              No services selected
                            </p>
                          )}

                          {isEditing && (
                            <div className="mt-2 relative" ref={servicesDropdownRef}>
                              <input
                                type="text"
                                value={serviceSearchTerm}
                                onChange={(e) => {
                                  setServiceSearchTerm(e.target.value);
                                  setShowServicesDropdown(true);
                                }}
                                onFocus={() => setShowServicesDropdown(true)}
                                placeholder="Search services from admin list"
                                className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2"
                              />

                              {showServicesDropdown && (
                                <div className="absolute z-50 mt-1 w-full max-h-52 overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
                                  {filteredServices.length > 0 ? (
                                    <div className="py-1">
                                      {filteredServices.map((service) => (
                                        <button
                                          key={service}
                                          type="button"
                                          onClick={() => {
                                            handleArrayAdd("services", service);
                                            setServiceSearchTerm("");
                                          }}
                                          className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-primary hover:text-white transition-colors flex items-center gap-1.5"
                                        >
                                          <IoBriefcaseOutline className="h-3.5 w-3.5 shrink-0" />
                                          <span className="truncate">{service}</span>
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="px-3 py-2 text-xs text-slate-500">
                                      {serviceSearchTerm
                                        ? "No matching services found"
                                        : "No more services available"}
                                    </div>
                                  )}
                                </div>
                              )}
                              <p className="mt-1 text-[10px] text-slate-500">
                                Select only from services configured by admin.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="mb-2 text-xs font-semibold text-slate-900">
                          Consultation Modes
                        </h3>
                        {isEditing ? (
                          <div className="grid grid-cols-1 gap-2">
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={
                                  formData.consultationModes?.includes(
                                    "in_person",
                                  ) || false
                                }
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    handleArrayAdd(
                                      "consultationModes",
                                      "in_person",
                                    );
                                  } else {
                                    const index =
                                      formData.consultationModes?.indexOf(
                                        "in_person",
                                      );
                                    if (index !== undefined && index !== -1) {
                                      handleArrayRemove(
                                        "consultationModes",
                                        index,
                                      );
                                    }
                                  }
                                }}
                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary shrink-0 transition"
                              />
                              <div className="flex items-center gap-1.5 py-1 px-2 rounded-lg bg-slate-50 border border-slate-100 group-hover:bg-slate-100 transition-colors w-full">
                                <IoPersonOutline className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                                <span className="text-[11px] font-semibold text-slate-700">
                                  In Person
                                </span>
                              </div>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={
                                  formData.consultationModes?.includes(
                                    "video_call",
                                  ) || false
                                }
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    handleArrayAdd(
                                      "consultationModes",
                                      "video_call",
                                    );
                                  } else {
                                    const index =
                                      formData.consultationModes?.indexOf(
                                        "video_call",
                                      );
                                    if (index !== undefined && index !== -1) {
                                      handleArrayRemove(
                                        "consultationModes",
                                        index,
                                      );
                                    }
                                  }
                                }}
                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary shrink-0 transition"
                              />
                              <div className="flex items-center gap-1.5 py-1 px-2 rounded-lg bg-slate-50 border border-slate-100 group-hover:bg-slate-100 transition-colors w-full">
                                <IoVideocamOutline className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                                <span className="text-[11px] font-semibold text-slate-700">
                                  Video Call
                                </span>
                              </div>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={
                                  formData.consultationModes?.includes(
                                    "voice_call",
                                  ) ||
                                  formData.consultationModes?.includes(
                                    "call",
                                  ) ||
                                  false
                                }
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    handleArrayAdd(
                                      "consultationModes",
                                      "voice_call",
                                    );
                                  } else {
                                    // Remove both 'voice_call' and legacy 'call'
                                    const index =
                                      formData.consultationModes?.indexOf(
                                        "voice_call",
                                      );
                                    if (index !== undefined && index !== -1) {
                                      handleArrayRemove(
                                        "consultationModes",
                                        index,
                                      );
                                    }
                                    const legacyIndex =
                                      formData.consultationModes?.indexOf(
                                        "call",
                                      );
                                    if (
                                      legacyIndex !== undefined &&
                                      legacyIndex !== -1
                                    ) {
                                      handleArrayRemove(
                                        "consultationModes",
                                        legacyIndex,
                                      );
                                    }
                                  }
                                }}
                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary shrink-0 transition"
                              />
                              <div className="flex items-center gap-1.5 py-1 px-2 rounded-lg bg-slate-50 border border-slate-100 group-hover:bg-slate-100 transition-colors w-full">
                                <IoCallOutline className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                                <span className="text-[11px] font-semibold text-slate-700">
                                  Voice Call
                                </span>
                              </div>
                            </label>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {formData.consultationModes &&
                              formData.consultationModes.length > 0 ? (
                              formData.consultationModes.map((mode, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-100 shadow-sm"
                                >
                                  {mode === "in_person" && (
                                    <IoPersonOutline className="h-3 w-3 shrink-0" />
                                  )}
                                  {mode === "video_call" && (
                                    <IoVideocamOutline className="h-3 w-3 shrink-0" />
                                  )}
                                  {(mode === "voice_call" ||
                                    mode === "call") && (
                                      <IoCallOutline className="h-3 w-3 shrink-0" />
                                    )}
                                  {mode === "in_person"
                                    ? "In Person"
                                    : mode === "video_call"
                                      ? "Video Call"
                                      : mode === "voice_call" || mode === "call"
                                        ? "Voice Call"
                                        : mode.replace("_", " ")}
                                </span>
                              ))
                            ) : (
                              <p className="text-xs text-slate-500 italic">
                                No consultation modes set
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Clinic Information */}
            <div className="rounded-xl sm:rounded-2xl lg:rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden hover:shadow-lg hover:shadow-slate-200/60 transition-shadow duration-200 lg:shadow-xl lg:hover:shadow-2xl">
              <button
                type="button"
                onClick={() =>
                  setActiveSection(activeSection === "clinic" ? null : "clinic")
                }
                className="w-full flex items-center justify-between px-3 sm:px-5 lg:px-4 py-3 sm:py-4 lg:py-3 hover:bg-slate-50/50 transition-colors"
              >
                <h2 className="text-sm sm:text-base lg:text-base font-bold text-slate-900">
                  Clinic Information
                </h2>
                {activeSection === "clinic" || isEditing ? (
                  <IoChevronUpOutline className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 shrink-0" />
                ) : (
                  <IoChevronDownOutline className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 shrink-0" />
                )}
              </button>

              {(activeSection === "clinic" || isEditing) && (
                <div className="px-3 sm:px-5 pb-4 sm:pb-5 border-t border-slate-100 space-y-3 sm:space-y-4 pt-4 sm:pt-5">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Clinic Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.clinicDetails?.name || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "clinicDetails.name",
                            e.target.value,
                          )
                        }
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900">
                        {formData.clinicDetails?.name || "Not set"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Clinic Address
                    </label>
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Address Line 1"
                          value={formData.clinicDetails?.address?.line1 || ""}
                          onChange={(e) =>
                            handleInputChange(
                              "clinicDetails.address.line1",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2"
                        />
                        <input
                          type="text"
                          placeholder="Address Line 2 (Optional)"
                          value={formData.clinicDetails?.address?.line2 || ""}
                          onChange={(e) =>
                            handleInputChange(
                              "clinicDetails.address.line2",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="City"
                            value={formData.clinicDetails?.address?.city || ""}
                            onChange={(e) =>
                              handleInputChange(
                                "clinicDetails.address.city",
                                e.target.value,
                              )
                            }
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2"
                          />
                          <input
                            type="text"
                            placeholder="State"
                            value={formData.clinicDetails?.address?.state || ""}
                            onChange={(e) =>
                              handleInputChange(
                                "clinicDetails.address.state",
                                e.target.value,
                              )
                            }
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Postal Code"
                            value={
                              formData.clinicDetails?.address?.postalCode || ""
                            }
                            onChange={(e) =>
                              handleInputChange(
                                "clinicDetails.address.postalCode",
                                e.target.value,
                              )
                            }
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2"
                          />
                          <input
                            type="text"
                            placeholder="Country"
                            value={
                              formData.clinicDetails?.address?.country || ""
                            }
                            onChange={(e) =>
                              handleInputChange(
                                "clinicDetails.address.country",
                                e.target.value,
                              )
                            }
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-sm text-slate-700">
                        <IoLocationOutline className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
                        <span className="break-words font-medium">
                          {formatAddress(formData.clinicDetails?.address)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Clinic Images */}
                  <div>
                    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Clinic/Hospital Images
                    </label>

                    {/* Display existing images */}
                    {formData.clinicDetails?.images && formData.clinicDetails.images.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                        {formData.clinicDetails.images.map((image, index) => (
                          <div key={index} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                            <img
                              src={normalizeImageUrl(image.url || image)}
                              alt={`Clinic ${index + 1}`}
                              className="w-full h-24 sm:h-32 object-cover"
                            />
                            {isEditing && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedImages = formData.clinicDetails.images.filter((_, i) => i !== index);
                                  handleInputChange('clinicDetails.images', updatedImages);
                                }}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <IoTrashOutline className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload new images */}
                    {isEditing && (
                      <div>
                        <input
                          type="file"
                          id="clinicImages"
                          accept="image/*"
                          multiple
                          onChange={handleClinicImagesChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="clinicImages"
                          className="flex items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 cursor-pointer"
                        >
                          <IoImageOutline className="h-4 w-4" />
                          Upload Clinic Images
                        </label>
                        <p className="mt-1 text-[9px] text-slate-500">
                          Upload multiple images of your clinic/hospital (Max 5 images)
                        </p>
                      </div>
                    )}

                    {!isEditing && (!formData.clinicDetails?.images || formData.clinicDetails.images.length === 0) && (
                      <p className="text-xs text-slate-500 italic">No clinic images uploaded</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sessions & Timings */}
            <div className="rounded-xl sm:rounded-2xl lg:rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden hover:shadow-lg hover:shadow-slate-200/60 transition-shadow duration-200 lg:shadow-xl lg:hover:shadow-2xl">
              <button
                type="button"
                onClick={() =>
                  setActiveSection(
                    activeSection === "timings" ? null : "timings",
                  )
                }
                className="w-full flex items-center justify-between px-3 sm:px-5 lg:px-4 py-3 sm:py-4 lg:py-3 hover:bg-slate-50/50 transition-colors"
              >
                <h2 className="text-sm sm:text-base lg:text-base font-bold text-slate-900">
                  Sessions & Timings
                </h2>
                {activeSection === "timings" || isEditing ? (
                  <IoChevronUpOutline className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 shrink-0" />
                ) : (
                  <IoChevronDownOutline className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 shrink-0" />
                )}
              </button>

              {(activeSection === "timings" || isEditing) && (
                <div className="px-3 sm:px-5 pb-4 sm:pb-5 border-t border-slate-100 space-y-4 sm:space-y-5 pt-4 sm:pt-5">
                  <div className="border-t border-slate-200 pt-4 sm:pt-5">
                    <h3 className="mb-2 sm:mb-3 text-xs sm:text-sm font-semibold text-slate-900">
                      Availability Days
                    </h3>
                    <p className="mb-3 text-[10px] sm:text-xs text-slate-500">
                      Set your time slots and select which days to apply them to.
                    </p>

                    {isEditing ? (
                      <div className="space-y-6">
                        {/* Consultation Mode Sections */}
                        {[
                          { id: "inPerson", label: "In-Person Consultation", icon: IoPersonOutline, color: "primary" },
                          { id: "videoCall", label: "Video Call Consultation", icon: IoVideocamOutline, color: "blue-600" },
                          { id: "voiceCall", label: "Voice Call Consultation", icon: IoCallOutline, color: "indigo-600" }
                        ].map((mode) => {
                          const Icon = mode.icon;
                          const selectedDays = formData.availabilitySlots?.[`${mode.id}SelectedDays`] || [];
                          const modeData = formData.availabilitySlots?.[mode.id] || [];

                          return (
                            <div key={mode.id} className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 sm:p-4">
                              <div className="flex items-center gap-2 mb-4">
                                <Icon className={`h-4 w-4 text-${mode.color} shrink-0`} />
                                <label className="block text-sm font-bold text-slate-900">
                                  {mode.label}
                                </label>
                              </div>

                              {/* Day Selection */}
                              <div className="mb-4 bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                                  Select Availability Days
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
                                    const isSelected = selectedDays.includes(day);
                                    return (
                                      <label key={day} className={`flex items-center gap-1.5 p-1.5 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 border border-primary/20' : 'hover:bg-slate-50 border border-transparent'}`}>
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={(e) => {
                                             const isChecked = e.target.checked;
                                             const newDays = isChecked
                                               ? selectedDays.includes(day) ? selectedDays : [...selectedDays, day]
                                               : selectedDays.filter((d) => d !== day);

                                             setFormData((prev) => {
                                               const currentSlots = prev.availabilitySlots?.[mode.id] || [];
                                               let updatedModeSlots = [...currentSlots];
                                               
                                               if (isChecked) {
                                                 const existing = updatedModeSlots.find(d => d.day === day);
                                                 if (!existing) {
                                                   updatedModeSlots.push({ 
                                                     day, 
                                                     slots: [{ startTime: "", endTime: "", isFree: false }] 
                                                   });
                                                 }
                                               }

                                               return { 
                                                 ...prev, 
                                                 availabilitySlots: {
                                                   ...prev.availabilitySlots,
                                                   [`${mode.id}SelectedDays`]: newDays,
                                                   [mode.id]: updatedModeSlots
                                                 } 
                                               };
                                             });
                                           }}
                                          className={`h-3 w-3 rounded border-slate-300 text-${mode.color} focus:ring-${mode.color}`}
                                        />
                                        <span className={`text-[10px] font-semibold ${isSelected ? 'text-primary' : 'text-slate-600'}`}>{day.substring(0, 3)}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Day-wise Slot Editors */}
                              <div className="space-y-4">
                                {selectedDays.map((day) => {
                                  const dayConfig = modeData.find(d => d.day === day) || { day, slots: [] };
                                  return (
                                    <div key={day} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                      <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-800">{day}</span>
                                        <button
                                          type="button"
                                          onClick={() => copySlotsToAllDays(mode.id, day)}
                                          className="text-[9px] font-bold text-primary hover:text-primary/80 uppercase tracking-tight flex items-center gap-1"
                                          title="Copy these slots to all other selected days"
                                        >
                                          <IoCopyOutline className="h-2.5 w-2.5" />
                                          Apply to all
                                        </button>
                                      </div>

                                      <div className="p-3 space-y-2">
                                        {dayConfig.slots.length === 0 ? (
                                          <p className="text-[10px] text-slate-400 italic py-1">No slots added for {day}</p>
                                        ) : (
                                          dayConfig.slots.map((slot, sIdx) => (
                                            <div key={sIdx} className="flex items-center gap-2">
                                              <input
                                                type="time"
                                                value={slot.startTime}
                                                onChange={(e) => updateSlot(mode.id, day, sIdx, "startTime", e.target.value)}
                                                className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
                                              />
                                              <span className="text-[10px] text-slate-400 font-medium">to</span>
                                              <input
                                                type="time"
                                                value={slot.endTime}
                                                onChange={(e) => updateSlot(mode.id, day, sIdx, "endTime", e.target.value)}
                                                className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
                                              />

                                              <label className="flex items-center gap-1 cursor-pointer hover:bg-slate-50 px-1.5 py-1 rounded transition-colors">
                                                <input
                                                  type="checkbox"
                                                  checked={slot.isFree || false}
                                                  onChange={(e) => updateSlot(mode.id, day, sIdx, "isFree", e.target.checked)}
                                                  className="h-3 w-3 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                                                />
                                                <span className={`text-[9px] font-bold uppercase ${slot.isFree ? 'text-emerald-600' : 'text-slate-400'}`}>Free</span>
                                              </label>

                                              <button
                                                type="button"
                                                onClick={() => removeSlot(mode.id, day, sIdx)}
                                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                              >
                                                <IoTrashOutline className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                          ))
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => addSlot(mode.id, day)}
                                          className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-slate-200 bg-slate-50/50 px-3 py-1.5 text-[10px] font-bold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                                        >
                                          <IoAddOutline className="h-3.5 w-3.5" />
                                          Add Slot for {day}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}

                                {selectedDays.length === 0 && (
                                  <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-white">
                                    <IoCalendarOutline className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-xs font-medium text-slate-500">Please select at least one day to define slots</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Display Day-wise Slots */}
                        {[
                          { id: "inPerson", label: "In-Person Consultation", icon: IoPersonOutline, color: "primary" },
                          { id: "videoCall", label: "Video Call Consultation", icon: IoVideocamOutline, color: "blue-600" },
                          { id: "voiceCall", label: "Voice Call Consultation", icon: IoCallOutline, color: "indigo-600" }
                        ].map((mode) => {
                          const Icon = mode.icon;
                          const modeData = formData.availabilitySlots?.[mode.id] || [];
                          const selectedDays = formData.availabilitySlots?.[`${mode.id}SelectedDays`] || [];

                          const activeDaysWithSlots = modeData.filter(d => selectedDays.includes(d.day) && d.slots.length > 0);
                          if (activeDaysWithSlots.length === 0) return null;

                          return (
                            <div key={mode.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                              <div className="flex items-center gap-2 mb-3 border-b border-slate-50 pb-2">
                                <Icon className={`h-4 w-4 text-${mode.color}`} />
                                <h4 className="text-xs font-bold text-slate-800">{mode.label}</h4>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {activeDaysWithSlots.map((dayConfig) => (
                                  <div key={dayConfig.day} className="bg-slate-50/50 rounded-lg p-2.5 border border-slate-100">
                                    <div className="text-[10px] font-bold text-slate-900 mb-1.5 flex justify-between items-center">
                                      <span>{dayConfig.day}</span>
                                      <span className="text-[9px] text-slate-400 font-normal">{dayConfig.slots.length} slots</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {dayConfig.slots.map((slot, sIdx) => (
                                        <div
                                          key={sIdx}
                                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${slot.isFree ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-white text-slate-700 border-slate-200'}`}
                                        >
                                          {format24HourTo12Hour(slot.startTime)} - {format24HourTo12Hour(slot.endTime)}
                                          {slot.isFree && <span className="ml-1 text-[8px] font-bold uppercase">Free</span>}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        {(!formData.availabilitySlots?.inPerson || formData.availabilitySlots.inPerson.length === 0) &&
                          (!formData.availabilitySlots?.videoCall || formData.availabilitySlots.videoCall.length === 0) &&
                          (!formData.availabilitySlots?.voiceCall || formData.availabilitySlots.voiceCall.length === 0) && (
                            <p className="text-xs text-slate-500">
                              No availability set
                            </p>
                          )}
                      </div>
                    )}
                  </div>

                  {/* Average Consultation Minutes */}
                  <div className="border-t border-slate-200 pt-4 sm:pt-5">
                    <h3 className="mb-2 sm:mb-3 text-xs sm:text-sm font-semibold text-slate-900">
                      Average Consultation Time Per Patient
                    </h3>
                    <p className="mb-2 text-[10px] sm:text-xs text-slate-500">
                      Set the approximate time (in minutes) you spend per
                      patient during consultations. This helps in scheduling and
                      queue management.
                    </p>
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="0"
                            max="60"
                            value={formData.averageConsultationMinutes ?? ""}
                            onChange={(e) => {
                              const inputValue = e.target.value;

                              // Allow empty input while typing
                              if (inputValue === "") {
                                handleInputChange(
                                  "averageConsultationMinutes",
                                  "",
                                );
                                return;
                              }

                              // Parse the number
                              const numValue = parseInt(inputValue, 10);

                              // If it's a valid number and within range
                              if (
                                !isNaN(numValue) &&
                                numValue >= 0 &&
                                numValue <= 60
                              ) {
                                handleInputChange(
                                  "averageConsultationMinutes",
                                  numValue,
                                );
                              }
                            }}
                            onBlur={(e) => {
                              // On blur, ensure we have a valid value (default to 20 if empty)
                              const inputValue = e.target.value.trim();
                              if (inputValue === "") {
                                handleInputChange(
                                  "averageConsultationMinutes",
                                  20,
                                );
                              } else {
                                const numValue = parseInt(inputValue, 10);
                                if (
                                  isNaN(numValue) ||
                                  numValue < 0 ||
                                  numValue > 60
                                ) {
                                  handleInputChange(
                                    "averageConsultationMinutes",
                                    20,
                                  );
                                } else {
                                  handleInputChange(
                                    "averageConsultationMinutes",
                                    numValue,
                                  );
                                }
                              }
                            }}
                            className="w-24 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <span className="text-xs sm:text-sm font-medium text-slate-700">
                            minutes
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Range: 0 - 60 minutes
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-2.5 sm:p-3">
                        <IoTimeOutline className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                        <span className="text-sm sm:text-base font-semibold text-slate-900">
                          {stableAverageConsultationMinutes} minutes per patient
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* KYC & Verification */}
            <div className="rounded-xl sm:rounded-2xl lg:rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden hover:shadow-lg hover:shadow-slate-200/60 transition-shadow duration-200 lg:shadow-xl lg:hover:shadow-2xl">
              <button
                type="button"
                onClick={() =>
                  setActiveSection(activeSection === "kyc" ? null : "kyc")
                }
                className="w-full flex items-center justify-between px-3 sm:px-5 lg:px-4 py-3 sm:py-4 lg:py-3 hover:bg-slate-50/50 transition-colors"
              >
                <h2 className="text-sm sm:text-base lg:text-base font-bold text-slate-900">
                  KYC & Verification
                </h2>
                {activeSection === "kyc" ? (
                  <IoChevronUpOutline className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 shrink-0" />
                ) : (
                  <IoChevronDownOutline className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 shrink-0" />
                )}
              </button>

              {activeSection === "kyc" && (
                <div className="px-3 sm:px-5 pb-4 sm:pb-5 border-t border-slate-100 space-y-3 sm:space-y-4 pt-4 sm:pt-5">
                  <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/50 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <IoShieldCheckmarkOutline className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-xs font-semibold text-slate-900">
                        Verification Status
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${formData.status === "approved"
                        ? "bg-emerald-100 text-emerald-700"
                        : formData.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                        }`}
                    >
                      {formData.status
                        ? formData.status.charAt(0).toUpperCase() +
                        formData.status.slice(1)
                        : "Not Verified"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Digital Signature */}
            <div className="rounded-xl sm:rounded-2xl lg:rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden hover:shadow-lg hover:shadow-slate-200/60 transition-shadow duration-200 lg:shadow-xl lg:hover:shadow-2xl">
              <button
                type="button"
                onClick={() =>
                  setActiveSection(
                    activeSection === "signature" ? null : "signature",
                  )
                }
                className="w-full flex items-center justify-between px-3 sm:px-5 lg:px-4 py-3 sm:py-4 lg:py-3 hover:bg-slate-50/50 transition-colors"
              >
                <h2 className="text-sm sm:text-base lg:text-base font-bold text-slate-900">
                  Digital Signature
                </h2>
                {activeSection === "signature" || isEditing ? (
                  <IoChevronUpOutline className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 shrink-0" />
                ) : (
                  <IoChevronDownOutline className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 shrink-0" />
                )}
              </button>

              {(activeSection === "signature" || isEditing) && (
                <div className="px-3 sm:px-5 pb-4 sm:pb-5 border-t border-slate-100 space-y-3 sm:space-y-4 pt-4 sm:pt-5">
                  {formData.digitalSignature?.imageUrl ? (
                    <div className="space-y-3 sm:space-y-4">
                      {/* Signature Preview */}
                      <div className="rounded-lg border-2 border-slate-200 bg-slate-50/50 p-4 sm:p-6">
                        <div className="flex flex-col items-center justify-center">
                          <div className="relative mb-3">
                            <img
                              src={formData.digitalSignature.imageUrl}
                              alt="Digital Signature"
                              className="max-w-full h-auto max-h-48 sm:max-h-64 rounded-lg shadow-md bg-white p-2 border border-slate-200"
                              style={{ imageRendering: "crisp-edges" }}
                            />
                          </div>
                          {formData.digitalSignature.uploadedAt && (
                            <p className="text-xs text-slate-500 mt-2">
                              Uploaded:{" "}
                              {formatDate(formData.digitalSignature.uploadedAt)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Edit Options */}
                      {isEditing && (
                        <div className="space-y-2">
                          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Update Signature
                          </p>
                          <label
                            htmlFor="gallery-input-signature-update"
                            className="w-full flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg border border-slate-300 bg-white px-2 sm:px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 transition hover:border-primary hover:bg-slate-50 hover:text-primary cursor-pointer shadow-sm"
                          >
                            <IoImageOutline className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                            Upload from Gallery
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleSignatureUpload}
                              className="hidden"
                              id="gallery-input-signature-update"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={handleRemoveSignature}
                            className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-red-600 transition hover:border-red-400 hover:bg-red-50"
                          >
                            <IoTrashOutline className="h-4 w-4 sm:h-5 sm:w-5" />
                            Remove Signature
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {/* Empty State */}
                      <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 sm:p-8 text-center">
                        <IoImageOutline className="h-10 w-10 sm:h-14 sm:w-14 text-slate-400 mx-auto mb-3" />
                        <p className="text-sm sm:text-base font-semibold text-slate-700 mb-1">
                          No signature uploaded
                        </p>
                        <p className="text-xs sm:text-sm text-slate-500">
                          Upload your digital signature image
                        </p>
                      </div>

                      {/* Upload Options */}
                      {isEditing && (
                        <div className="space-y-2">
                          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Choose Upload Method
                          </p>
                          <label
                            htmlFor="gallery-input-signature-empty"
                            className="w-full flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg border border-slate-300 bg-white px-2 sm:px-3 py-2 text-center transition hover:border-primary hover:bg-slate-50 cursor-pointer shadow-sm"
                          >
                            <IoImageOutline className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 shrink-0" />
                            <span className="text-xs sm:text-sm font-semibold text-slate-700">
                              Upload from Gallery
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleSignatureUpload}
                              className="hidden"
                              id="gallery-input-signature-empty"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                  {!isEditing && formData.digitalSignature?.imageUrl && (
                    <div className="pt-2 border-t border-slate-200">
                      <p className="text-[10px] sm:text-xs text-slate-500">
                        Click "Edit Profile" to change or remove your digital
                        signature
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Uploaded Documents */}
            <div className="rounded-xl sm:rounded-2xl lg:rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden hover:shadow-lg hover:shadow-slate-200/60 transition-shadow duration-200 lg:shadow-xl lg:hover:shadow-2xl">
              <button
                type="button"
                onClick={() =>
                  setActiveSection(
                    activeSection === "documents" ? null : "documents",
                  )
                }
                className="w-full flex items-center justify-between px-3 sm:px-5 lg:px-4 py-3 sm:py-4 lg:py-3 hover:bg-slate-50/50 transition-colors"
              >
                <h2 className="text-sm sm:text-base lg:text-base font-bold text-slate-900">
                  Uploaded Documents
                </h2>
                {activeSection === "documents" ? (
                  <IoChevronUpOutline className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 shrink-0" />
                ) : (
                  <IoChevronDownOutline className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 shrink-0" />
                )}
              </button>

              {activeSection === "documents" && (
                <div className="px-3 sm:px-5 pb-4 sm:pb-5 border-t border-slate-100 space-y-3 sm:space-y-4 pt-4 sm:pt-5">
                  {formData.documents &&
                    Array.isArray(formData.documents) &&
                    formData.documents.length > 0 ? (
                    <div className="space-y-2">
                      {formData.documents.map((doc, index) => {
                        const normalizedUrl = normalizeImageUrl(
                          doc.fileUrl || "",
                        );
                        return (
                          <div
                            key={index}
                            className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <IoDocumentTextOutline className="h-5 w-5 text-primary flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-slate-700 block truncate">
                                  {doc.name || "Document"}
                                </span>
                                {doc.uploadedAt && (
                                  <span className="text-xs text-slate-500">
                                    Uploaded: {formatDate(doc.uploadedAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {normalizedUrl && (
                                <>
                                  <a
                                    href={normalizedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                                  >
                                    <IoEyeOutline className="h-4 w-4" />
                                    View
                                  </a>
                                  <a
                                    href={normalizedUrl}
                                    download
                                    className="text-xs font-medium text-emerald-600 hover:underline flex items-center gap-1"
                                  >
                                    <IoDownloadOutline className="h-4 w-4" />
                                    Download
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">
                      No documents uploaded
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Support History */}
            <div className="rounded-xl sm:rounded-2xl lg:rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden hover:shadow-lg hover:shadow-slate-200/60 transition-shadow duration-200 lg:shadow-xl lg:hover:shadow-2xl">
              <button
                type="button"
                onClick={() =>
                  setActiveSection(
                    activeSection === "support" ? null : "support",
                  )
                }
                className="w-full flex items-center justify-between px-3 sm:px-5 lg:px-4 py-3 sm:py-4 lg:py-3 hover:bg-slate-50/50 transition-colors"
              >
                <h2 className="text-sm sm:text-base lg:text-base font-bold text-slate-900">
                  Support History
                </h2>
                {activeSection === "support" ? (
                  <IoChevronUpOutline className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 shrink-0" />
                ) : (
                  <IoChevronDownOutline className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 shrink-0" />
                )}
              </button>

              {activeSection === "support" && (
                <div className="px-3 sm:px-5 pb-4 sm:pb-5 border-t border-slate-100 space-y-3 sm:space-y-4 pt-4 sm:pt-5">
                  <SupportHistory role="doctor" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

// Support History Component
const SupportHistory = ({ role }) => {
  const [supportRequests, setSupportRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchSupportHistory = async () => {
      try {
        setIsLoading(true);
        const response = await getSupportHistory();

        // Handle different response structures
        let tickets = [];
        if (Array.isArray(response)) {
          tickets = response;
        } else if (response && response.success && response.data) {
          // Check if data is an array or has items property
          if (Array.isArray(response.data)) {
            tickets = response.data;
          } else if (
            response.data.items &&
            Array.isArray(response.data.items)
          ) {
            tickets = response.data.items;
          } else if (
            response.data.tickets &&
            Array.isArray(response.data.tickets)
          ) {
            tickets = response.data.tickets;
          } else if (
            response.data.history &&
            Array.isArray(response.data.history)
          ) {
            tickets = response.data.history;
          }
        } else if (
          response &&
          response.tickets &&
          Array.isArray(response.tickets)
        ) {
          tickets = response.tickets;
        } else if (response && response.data && Array.isArray(response.data)) {
          tickets = response.data;
        }

        // Transform tickets to match component structure
        const transformedTickets = tickets.map((ticket) => ({
          id: ticket._id || ticket.id,
          _id: ticket._id || ticket.id,
          note: ticket.message || ticket.subject || ticket.note || "",
          subject: ticket.subject || ticket.message || "",
          message: ticket.message || ticket.subject || "",
          status: ticket.status || "pending",
          createdAt:
            ticket.createdAt || ticket.date || new Date().toISOString(),
          updatedAt:
            ticket.updatedAt ||
            ticket.updatedAt ||
            ticket.createdAt ||
            new Date().toISOString(),
          adminNote:
            ticket.adminNote || ticket.response || ticket.adminResponse || "",
          priority: ticket.priority || "medium",
        }));

        setSupportRequests(
          Array.isArray(transformedTickets) ? transformedTickets : [],
        );
      } catch (error) {
        console.error("Error fetching support history:", error);
        toast.error("Failed to load support history");
        setSupportRequests([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSupportHistory();
  }, [role, toast]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
      in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-800" },
      resolved: { label: "Resolved", color: "bg-green-100 text-green-800" },
      closed: { label: "Closed", color: "bg-slate-100 text-slate-800" },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Ensure supportRequests is always an array
  const safeSupportRequests = Array.isArray(supportRequests)
    ? supportRequests
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (safeSupportRequests.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm font-medium text-slate-600">
          No support requests yet
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Your support request history will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {safeSupportRequests.map((request, index) => (
        <div
          key={
            request._id ||
            request.id ||
            `support-${index}-${request.createdAt || Date.now()}`
          }
          className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-sm font-medium text-slate-900 flex-1">
              {request.note ||
                request.message ||
                request.subject ||
                "Support Request"}
            </p>
            {getStatusBadge(request.status)}
          </div>
          {request.adminNote && (
            <div className="mt-2 rounded bg-blue-50 p-2">
              <p className="text-xs font-semibold text-blue-900">
                Admin Response:
              </p>
              <p className="mt-1 text-xs text-blue-800">{request.adminNote}</p>
            </div>
          )}
          <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
            <span>Submitted: {formatDate(request.createdAt)}</span>
            {request.updatedAt && request.updatedAt !== request.createdAt && (
              <span>Updated: {formatDate(request.updatedAt)}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DoctorProfile;
