import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, Save, X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import {
    getSlotsByDate,
    createOrUpdateSlots,
    freeSlots,
    deleteSlotsByDate,
} from '../doctor-services/doctorService';
import './SlotManagementSection.css';

const SlotManagementSection = ({ isExpanded, onToggle }) => {
    const [selectedDate, setSelectedDate] = useState('');
    const [slots, setSlots] = useState([]);
    const [newSlot, setNewSlot] = useState({
        consultationType: 'in_person',
        startTime: '',
        endTime: '',
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Initialize with today's date
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);
    }, []);

    // Fetch slots when date changes
    useEffect(() => {
        if (selectedDate && isExpanded) {
            fetchSlots();
        }
    }, [selectedDate, isExpanded]);

    const fetchSlots = async () => {
        try {
            setLoading(true);
            const data = await getSlotsByDate(selectedDate);
            setSlots(data.slots || []);
            setMessage({ type: '', text: '' });
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Failed to fetch slots' });
            setSlots([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSlot = () => {
        if (!newSlot.startTime || !newSlot.endTime) {
            setMessage({ type: 'error', text: 'Please fill in all slot details' });
            return;
        }

        if (newSlot.startTime >= newSlot.endTime) {
            setMessage({ type: 'error', text: 'End time must be after start time' });
            return;
        }

        setSlots([...slots, { ...newSlot, isFree: false }]);
        setNewSlot({
            consultationType: 'in_person',
            startTime: '',
            endTime: '',
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
        try {
            setLoading(true);
            await createOrUpdateSlots(selectedDate, slots);
            setMessage({ type: 'success', text: 'Slots saved successfully!' });
            await fetchSlots();
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
            home_visit: 'Home Visit',
        };
        return labels[type] || type;
    };

    const getConsultationTypeColor = (type) => {
        const colors = {
            in_person: '#4CAF50',
            video_call: '#2196F3',
            voice_call: '#FF9800',
            home_visit: '#10B981',
        };
        return colors[type] || '#757575';
    };

    return (
        <div className="slot-section-container">
            <div className="slot-section-header" onClick={onToggle}>
                <div className="slot-section-title">
                    <Calendar size={24} />
                    <h3>Daily Slot Management</h3>
                </div>
                <button className="toggle-btn">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
            </div>

            {isExpanded && (
                <div className="slot-section-content">
                    {message.text && (
                        <div className={`slot-message ${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    {/* Date Selector */}
                    <div className="slot-date-selector">
                        <label>Select Date:</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="slot-date-input"
                        />
                    </div>

                    {/* Add New Slot */}
                    <div className="slot-add-section">
                        <h4>Add New Slot</h4>
                        <div className="slot-add-form">
                            <select
                                value={newSlot.consultationType}
                                onChange={(e) =>
                                    setNewSlot({ ...newSlot, consultationType: e.target.value })
                                }
                                className="slot-select"
                            >
                                <option value="in_person">In-Person</option>
                                <option value="video_call">Video Call</option>
                                <option value="voice_call">Voice Call</option>
                                <option value="home_visit">Home Visit</option>
                            </select>

                            <input
                                type="time"
                                value={newSlot.startTime}
                                onChange={(e) =>
                                    setNewSlot({ ...newSlot, startTime: e.target.value })
                                }
                                className="slot-time-input"
                                placeholder="Start Time"
                            />

                            <input
                                type="time"
                                value={newSlot.endTime}
                                onChange={(e) =>
                                    setNewSlot({ ...newSlot, endTime: e.target.value })
                                }
                                className="slot-time-input"
                                placeholder="End Time"
                            />

                            <button onClick={handleAddSlot} className="slot-add-btn">
                                <Plus size={18} />
                                Add
                            </button>
                        </div>
                    </div>

                    {/* Slots List */}
                    <div className="slot-list-section">
                        <div className="slot-list-header">
                            <h4>
                                Slots for {new Date(selectedDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                })}
                            </h4>
                            {slots.length > 0 && (
                                <div className="slot-actions">
                                    <button
                                        onClick={handleSaveSlots}
                                        className="slot-save-btn"
                                        disabled={loading}
                                    >
                                        <Save size={16} />
                                        Save
                                    </button>
                                    <button
                                        onClick={handleDeleteAllSlots}
                                        className="slot-delete-btn"
                                        disabled={loading}
                                    >
                                        <Trash2 size={16} />
                                        Delete All
                                    </button>
                                </div>
                            )}
                        </div>

                        {loading ? (
                            <div className="slot-loading">Loading...</div>
                        ) : slots.length === 0 ? (
                            <div className="slot-empty">
                                <Clock size={32} />
                                <p>No slots for this date</p>
                            </div>
                        ) : (
                            <div className="slot-grid">
                                {slots.map((slot, index) => (
                                    <div
                                        key={index}
                                        className={`slot-item ${slot.isFree ? 'slot-free' : ''}`}
                                        style={{
                                            borderLeftColor: getConsultationTypeColor(slot.consultationType),
                                        }}
                                    >
                                        <div className="slot-item-header">
                                            <span
                                                className="slot-badge"
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
                                                className="slot-remove-btn"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>

                                        <div className="slot-item-body">
                                            <div className="slot-time-display">
                                                <Clock size={14} />
                                                <span>
                                                    {slot.startTime} - {slot.endTime}
                                                </span>
                                            </div>

                                            <button
                                                onClick={() => handleToggleFree(index)}
                                                className={`slot-free-toggle ${slot.isFree ? 'active' : ''}`}
                                            >
                                                {slot.isFree ? (
                                                    <>
                                                        <Check size={14} />
                                                        Free
                                                    </>
                                                ) : (
                                                    'Mark Free'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="slot-info">
                        <p>
                            <strong>Tip:</strong> Create multiple slots for different consultation
                            types. Mark slots as "Free" to block them from patient booking.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SlotManagementSection;
