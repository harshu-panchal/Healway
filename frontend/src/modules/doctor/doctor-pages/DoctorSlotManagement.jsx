import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, Save, X, Check } from 'lucide-react';
import {
    getSlotsByDate,
    createOrUpdateSlots,
    freeSlots,
    occupySlots,
    deleteSlotsByDate,
    getSlotsByDateRange,
} from '../doctor-services/doctorService';
import './DoctorSlotManagement.css';

const DoctorSlotManagement = () => {
    const [selectedDate, setSelectedDate] = useState('');
    const [slots, setSlots] = useState([]);
    const [newSlot, setNewSlot] = useState({
        consultationType: 'in_person',
        startTime: '',
        endTime: '',
        isFree: false,
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [hasCustomSlots, setHasCustomSlots] = useState(false);

    // Initialize with today's date
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);
    }, []);

    // Fetch slots when date changes
    useEffect(() => {
        if (selectedDate) {
            fetchSlots();
        }
    }, [selectedDate]);

    const fetchSlots = async () => {
        try {
            setLoading(true);
            const data = await getSlotsByDate(selectedDate);
            setSlots(data.slots || []);
            setHasCustomSlots(data.hasCustomSlots || false);
            setMessage({ type: '', text: '' });
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Failed to fetch slots' });
            setSlots([]);
        } finally {
            setLoading(false);
        }
    };

    // Helper to convert time string to minutes for comparison
    const timeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        
        let hours, minutes;
        if (timeStr.includes('AM') || timeStr.includes('PM')) {
            // Handle 12-hour format
            const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!match) return 0;
            hours = parseInt(match[1], 10);
            minutes = parseInt(match[2], 10);
            const period = match[3].toUpperCase();
            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
        } else {
            // Handle 24-hour format
            const parts = timeStr.split(':');
            hours = parseInt(parts[0], 10);
            minutes = parseInt(parts[1], 10);
        }
        return hours * 60 + minutes;
    };

    // Centralized overlap check helper
    const checkOverlap = (newStart, newEnd, existingSlots, excludeIndex = -1) => {
        for (let i = 0; i < existingSlots.length; i++) {
            if (i === excludeIndex) continue;
            
            const slot = existingSlots[i];
            const slotStart = timeToMinutes(slot.startTime);
            const slotEnd = timeToMinutes(slot.endTime);
            
            // Overlap condition: S1 < E2 and S2 < E1
            if (newStart < slotEnd && slotStart < newEnd) {
                return {
                    hasOverlap: true,
                    conflictingSlot: slot
                };
            }
        }
        return { hasOverlap: false };
    };

    const handleAddSlot = () => {
        if (!newSlot.startTime || !newSlot.endTime) {
            setMessage({ type: 'error', text: 'Please fill in all slot details' });
            return;
        }

        const newStart = timeToMinutes(newSlot.startTime);
        const newEnd = timeToMinutes(newSlot.endTime);

        // Validate time
        if (newStart >= newEnd) {
            setMessage({ type: 'error', text: 'End time must be after start time' });
            return;
        }

        // Check for overlaps in existing slots
        const overlapResult = checkOverlap(newStart, newEnd, slots);

        if (overlapResult.hasOverlap) {
            const conflict = overlapResult.conflictingSlot;
            setMessage({ 
                type: 'error', 
                text: `Time conflict: This overlaps with ${conflict.startTime}-${conflict.endTime} (${getConsultationTypeLabel(conflict.consultationType)})` 
            });
            return;
        }

        setSlots([...slots, { ...newSlot }]);
        setNewSlot({
            consultationType: 'in_person',
            startTime: '',
            endTime: '',
            isFree: false,
        });
        setMessage({ type: 'success', text: 'Slot added. Click Save to confirm.' });
    };

    const handleRemoveSlot = (index) => {
        const updatedSlots = slots.filter((_, i) => i !== index);
        setSlots(updatedSlots);
        setMessage({ type: 'success', text: 'Slot removed. Click Save to confirm.' });
    };

    const handleToggleFree = (index) => {
        const updatedSlots = [...slots];
        updatedSlots[index].isFree = !updatedSlots[index].isFree;
        setSlots(updatedSlots);
    };

    const handleSaveSlots = async () => {
        // Final validation before saving
        for (let i = 0; i < slots.length; i++) {
            const slot = slots[i];
            const start = timeToMinutes(slot.startTime);
            const end = timeToMinutes(slot.endTime);
            
            const overlapResult = checkOverlap(start, end, slots, i);
            if (overlapResult.hasOverlap) {
                const conflict = overlapResult.conflictingSlot;
                setMessage({ 
                    type: 'error', 
                    text: `Cannot save: Overlap detected between ${slot.startTime}-${slot.endTime} and ${conflict.startTime}-${conflict.endTime}. Please fix it first.` 
                });
                return;
            }
        }

        try {
            setLoading(true);
            await createOrUpdateSlots(selectedDate, slots);
            setMessage({ type: 'success', text: 'Slots saved successfully!' });
            await fetchSlots(); // Refresh to get latest data
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Failed to save slots' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAllSlots = async () => {
        if (!window.confirm('Are you sure you want to delete all slots for this date?')) {
            return;
        }

        try {
            setLoading(true);
            await deleteSlotsByDate(selectedDate);
            setSlots([]);
            setHasCustomSlots(false);
            setMessage({ type: 'success', text: 'All slots deleted successfully!' });
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Failed to delete slots' });
        } finally {
            setLoading(false);
        }
    };

    const getConsultationTypeLabel = (type) => {
        const labels = {
            in_person: 'In-Person',
            video_call: 'Video Call',
            voice_call: 'Voice Call',
        };
        return labels[type] || type;
    };

    const getConsultationTypeColor = (type) => {
        const colors = {
            in_person: '#4CAF50',
            video_call: '#2196F3',
            voice_call: '#FF9800',
        };
        return colors[type] || '#757575';
    };

    return (
        <div className="slot-management-container">
            <div className="slot-management-header">
                <h1>
                    <Calendar className="header-icon" />
                    Daily Slot Management
                </h1>
                <p className="header-subtitle">
                    Create multiple slots per day for different consultation types
                </p>
            </div>

            {message.text && (
                <div className={`message-banner ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="slot-management-content">
                {/* Date Selector */}
                <div className="date-selector-section">
                    <label htmlFor="date-input">Select Date:</label>
                    <input
                        id="date-input"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="date-input"
                    />
                </div>

                {/* Add New Slot */}
                <div className="add-slot-section">
                    <h2>Add New Slot</h2>
                    <div className="add-slot-form">
                        <div className="form-group">
                            <label>Consultation Type:</label>
                            <select
                                value={newSlot.consultationType}
                                onChange={(e) =>
                                    setNewSlot({ ...newSlot, consultationType: e.target.value })
                                }
                                className="form-select"
                            >
                                <option value="in_person">In-Person</option>
                                <option value="video_call">Video Call</option>
                                <option value="voice_call">Voice Call</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Start Time:</label>
                            <input
                                type="time"
                                value={newSlot.startTime}
                                onChange={(e) =>
                                    setNewSlot({ ...newSlot, startTime: e.target.value })
                                }
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label>End Time:</label>
                            <input
                                type="time"
                                value={newSlot.endTime}
                                onChange={(e) =>
                                    setNewSlot({ ...newSlot, endTime: e.target.value })
                                }
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label className="checkbox-container">
                                <input
                                    type="checkbox"
                                    checked={newSlot.isFree}
                                    onChange={(e) =>
                                        setNewSlot({ ...newSlot, isFree: e.target.checked })
                                    }
                                />
                                <span className="checkbox-label">Mark as Free Slot</span>
                            </label>
                        </div>

                        <button onClick={handleAddSlot} className="btn-add-slot">
                            <Plus size={20} />
                            Add Slot
                        </button>
                    </div>
                </div>

                {/* Slots List */}
                <div className="slots-list-section">
                    <div className="slots-list-header">
                        <h2>
                            Slots for {new Date(selectedDate).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </h2>
                        {slots.length > 0 && (
                            <div className="slots-actions">
                                <button
                                    onClick={handleSaveSlots}
                                    className="btn-save"
                                    disabled={loading}
                                >
                                    <Save size={18} />
                                    Save Changes
                                </button>
                                <button
                                    onClick={handleDeleteAllSlots}
                                    className="btn-delete-all"
                                    disabled={loading}
                                >
                                    <Trash2 size={18} />
                                    Delete All
                                </button>
                            </div>
                        )}
                    </div>

                    {loading ? (
                        <div className="loading-state">Loading slots...</div>
                    ) : slots.length === 0 ? (
                        <div className="empty-state">
                            <Clock size={48} />
                            <p>No slots created for this date yet.</p>
                            <p className="empty-state-hint">
                                Add your first slot using the form above.
                            </p>
                        </div>
                    ) : (
                        <div className="slots-grid">
                            {slots.map((slot, index) => (
                                <div
                                    key={index}
                                    className={`slot-card ${slot.isFree ? 'slot-free' : ''}`}
                                    style={{
                                        borderLeftColor: getConsultationTypeColor(slot.consultationType),
                                    }}
                                >
                                    <div className="slot-card-header">
                                        <span
                                            className="consultation-badge"
                                            style={{
                                                backgroundColor: getConsultationTypeColor(
                                                    slot.consultationType
                                                ),
                                            }}
                                        >
                                            {getConsultationTypeLabel(slot.consultationType)}
                                        </span>
                                        <button
                                            onClick={() => handleRemoveSlot(index)}
                                            className="btn-remove-slot"
                                            title="Remove slot"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <div className="slot-card-body">
                                        <div className="slot-time">
                                            <Clock size={16} />
                                            <span>
                                                {slot.startTime} - {slot.endTime}
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => handleToggleFree(index)}
                                            className={`btn-toggle-free ${slot.isFree ? 'active' : ''}`}
                                        >
                                            {slot.isFree ? (
                                                <>
                                                    <Check size={16} />
                                                    Marked as Free
                                                </>
                                            ) : (
                                                <>Mark as Free</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div className="info-section">
                    <h3>How it works:</h3>
                    <ul>
                        <li>
                            <strong>Multiple Slots:</strong> You can create multiple slots for the
                            same day with different consultation types (In-Person, Video Call, Voice
                            Call).
                        </li>
                        <li>
                            <strong>Mark as Free:</strong> Toggle the "Mark as Free" button to
                            indicate that a specific slot is intentionally kept free and not
                            available for booking.
                        </li>
                        <li>
                            <strong>Save Changes:</strong> Don't forget to click "Save Changes"
                            after adding, removing, or modifying slots.
                        </li>
                        <li>
                            <strong>Delete All:</strong> Use "Delete All" to remove all slots for
                            the selected date.
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default DoctorSlotManagement;
