import React from 'react';
import { Modal, Descriptions, Tag, Button } from 'antd';
import {
    UserOutlined,
    PhoneOutlined,
    MailOutlined,
    EnvironmentOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const AppointmentDetailsModal = ({ open, onClose, appointment }) => {
    if (!appointment) return null;

    const {
        doctor,
        date,
        time,
        status,
        type,
        location,
        originalData
    } = appointment;

    // Helper to format date
    const formatDate = (dateStr) => {
        return dayjs(dateStr).format('dddd, MMMM D, YYYY');
    };

    const isGuest = originalData?.patientType === 'Else';

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={[
                <Button key="close" type="primary" onClick={onClose}>
                    Close
                </Button>
            ]}
            title="Appointment Details"
            width={600}
            centered
            className="appointment-details-modal"
        >
            <div className="space-y-6 pt-2">
                {/* Doctor Section */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <img
                        src={doctor.image}
                        alt={doctor.name}
                        className="w-16 h-16 rounded-full object-cover shrink-0 bg-white"
                    />
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">{doctor.name}</h3>
                        <p className="text-primary font-medium">{doctor.specialty}</p>
                        {doctor.clinicName && (
                            <p className="text-xs text-slate-500">{doctor.clinicName}</p>
                        )}
                    </div>
                </div>

                {/* Status & Key Info */}
                <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small" layout="horizontal">
                    <Descriptions.Item label="Status">
                        <Tag color={
                            status === 'confirmed' ? 'success' :
                                status === 'cancelled' ? 'error' :
                                    status === 'completed' ? 'default' :
                                        'processing'
                        }>
                            {status?.toUpperCase()}
                        </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Type">
                        {type}
                    </Descriptions.Item>
                    <Descriptions.Item label="Date">
                        {formatDate(date)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Time">
                        {time}
                    </Descriptions.Item>
                    <Descriptions.Item label="Fee">
                        <span className={`font-semibold ${appointment.fee === 0 ? 'text-emerald-600' : ''}`}>
                            {appointment.fee === 0 ? 'Free' : `₹${appointment.fee}`}
                        </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="Payment Info" span={2}>
                        {appointment.paymentStatus === 'free' ? (
                            <Tag color="success">FREE CONSULTATION</Tag>
                        ) : appointment.paymentStatus === 'paid' ? (
                            <div className="flex flex-col gap-1">
                                <Tag color="success" className="w-fit">FULL PAYMENT DONE</Tag>
                                <span className="text-xs font-bold text-slate-600">Amount: ₹{appointment.fee}</span>
                            </div>
                        ) : appointment.paymentStatus === 'partial' ? (
                            <div className="flex flex-col gap-1">
                                <Tag color="orange" className="w-fit">SLOT CONFIRMED (PARTIAL)</Tag>
                                <div className="text-xs space-y-0.5">
                                    <p><span className="text-slate-500">Paid online:</span> <span className="font-bold text-emerald-600">₹{appointment.paidAmount}</span></p>
                                    <p><span className="text-slate-500">To pay at clinic:</span> <span className="font-bold text-amber-600">₹{appointment.remainingAmount}</span></p>
                                </div>
                            </div>
                        ) : appointment.paymentMethod === 'cod' ? (
                            <div className="flex flex-col gap-1">
                                <Tag color="blue" className="w-fit">PAY AT CLINIC (COD)</Tag>
                                <span className="text-xs font-bold text-slate-600">Total to pay: ₹{appointment.fee}</span>
                            </div>
                        ) : (
                            <Tag color="warning">PAYMENT PENDING</Tag>
                        )}
                    </Descriptions.Item>
                </Descriptions>

                {/* Patient Details Section */}
                <div className="border rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 font-bold text-slate-700 border-b flex items-center gap-2 text-sm">
                        <UserOutlined /> Patient Information
                    </div>
                    <div className="p-4 bg-white">
                        <Descriptions column={1} size="small" colon={false}>
                            <Descriptions.Item label={<span className="text-slate-500">Booking Type</span>}>
                                <Tag color={isGuest ? 'purple' : 'geekblue'}>
                                    {isGuest ? 'SOMEONE ELSE' : 'SELF'}
                                </Tag>
                            </Descriptions.Item>

                            {isGuest ? (
                                <>
                                    <Descriptions.Item label={<span className="text-slate-500">Patient Name</span>}>
                                        <span className="font-semibold text-lg text-slate-800">{originalData.patientName}</span>
                                    </Descriptions.Item>
                                    <Descriptions.Item label={<span className="text-slate-500">Age / Gender</span>}>
                                        <span className="font-medium">{originalData.patientAge} years</span> • {originalData.patientGender}
                                    </Descriptions.Item>
                                    <Descriptions.Item label={<span className="text-slate-500">Contact</span>}>
                                        <div className="flex flex-col gap-1.5 mt-1">
                                            <span className="flex items-center gap-2 text-slate-700"><PhoneOutlined className="text-slate-400" /> {originalData.patientPhone}</span>
                                            {originalData.patientEmail && (
                                                <span className="flex items-center gap-2 text-slate-700"><MailOutlined className="text-slate-400" /> {originalData.patientEmail}</span>
                                            )}
                                        </div>
                                    </Descriptions.Item>
                                </>
                            ) : (
                                <Descriptions.Item label={<span className="text-slate-500">Patient Name</span>}>
                                    <span className="font-semibold text-slate-800">You (Self)</span>
                                </Descriptions.Item>
                            )}
                        </Descriptions>
                    </div>
                </div>

                {location && (
                    <div className="flex items-start gap-2.5 p-3 bg-blue-50/50 rounded-lg text-sm text-slate-600 border border-blue-100">
                        <EnvironmentOutlined className="mt-0.5 text-blue-500" />
                        <span>{location}</span>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default AppointmentDetailsModal;
