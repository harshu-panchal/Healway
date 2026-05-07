import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  Row, 
  Col, 
  Button, 
  Empty, 
  Skeleton, 
  Avatar, 
  Typography, 
  Space, 
  Tag 
} from 'antd';
import { 
  UserOutlined, 
  StarFilled, 
  HeartOutlined, 
  HeartFilled,
  EnvironmentOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import { getFollowedDoctors, toggleFollowDoctor } from '../patient-services/patientService';
import { useToast } from '../../../contexts/ToastContext';
import { getFileUrl } from '../../../utils/apiClient';
import { motion, AnimatePresence } from 'framer-motion';

const { Title, Text } = Typography;

const PatientFollowedDoctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unfollowingId, setUnfollowingId] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    fetchFollowedDoctors();
  }, []);

  const fetchFollowedDoctors = async () => {
    try {
      setLoading(true);
      const response = await getFollowedDoctors();
      if (response.success) {
        setDoctors(response.data.items || []);
      }
    } catch (error) {
      console.error('Error fetching followed doctors:', error);
      toast.error('Failed to load followed doctors');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (e, doctorId) => {
    e.stopPropagation();
    try {
      setUnfollowingId(doctorId);
      const response = await toggleFollowDoctor(doctorId);
      if (response.success && !response.isFollowing) {
        setDoctors(prev => prev.filter(doc => doc._id !== doctorId));
        toast.success('Doctor unfollowed successfully');
      }
    } catch (error) {
      toast.error('Failed to unfollow doctor');
    } finally {
      setUnfollowingId(null);
    }
  };

  if (loading && doctors.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton active paragraph={{ rows: 2 }} />
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4].map(i => (
            <Col xs={24} sm={12} lg={8} key={i}>
              <Card className="rounded-3xl border-none shadow-sm h-64">
                <Skeleton active avatar paragraph={{ rows: 3 }} />
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-slate-50 min-h-screen pb-24">
      <div className="flex flex-col gap-2 mb-4">
        <Title level={2} className="m-0 !font-extrabold text-slate-900">Followed Doctors</Title>
        <Text type="secondary" className="text-base">Stay updated with your favorite healthcare providers</Text>
      </div>

      {doctors.length > 0 ? (
        <Row gutter={[20, 20]}>
          <AnimatePresence>
            {doctors.map((doctor, idx) => (
              <Col xs={24} sm={12} lg={8} key={doctor._id}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  transition={{ delay: idx * 0.1 }}
                  layout
                >
                  <Card 
                    className="rounded-3xl border-none shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden cursor-pointer"
                    onClick={() => navigate(`/patient/doctors/${doctor._id}`)}
                    styles={{ body: { padding: 0 } }}
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          <Avatar 
                            size={80}
                            src={getFileUrl(doctor.profileImage)}
                            icon={<UserOutlined />}
                            className="bg-primary/10 text-primary border-2 border-white shadow-sm"
                          />
                          <button 
                            onClick={(e) => handleUnfollow(e, doctor._id)}
                            disabled={unfollowingId === doctor._id}
                            className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors border border-slate-100"
                          >
                            <HeartFilled className="text-sm" />
                          </button>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-1">
                            <Tag color="blue" className="m-0 text-[10px] uppercase font-bold border-none rounded-full px-2">
                              {doctor.specialization}
                            </Tag>
                            {doctor.isFeatured && <StarFilled className="text-amber-400 text-xs" />}
                          </div>
                          <Title level={4} className="m-0 !text-slate-900 !font-bold truncate">
                            Dr. {doctor.firstName} {doctor.lastName}
                          </Title>
                          <Text type="secondary" className="text-xs font-medium block mt-0.5">
                            {doctor.experienceYears} Years Experience
                          </Text>
                        </div>
                      </div>

                      <div className="mt-5 space-y-2">
                        <div className="flex items-center gap-2 text-slate-500 text-xs">
                          <EnvironmentOutlined className="text-primary" />
                          <span className="truncate">{doctor.clinicDetails?.name || 'Private Clinic'}</span>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Consultation Fee</span>
                            <span className="text-lg font-black text-slate-900">₹{doctor.fees?.inPerson?.final || doctor.consultationFee || 0}</span>
                          </div>
                          <Button 
                            type="primary" 
                            shape="circle" 
                            icon={<ArrowRightOutlined />} 
                            className="bg-primary border-none shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform"
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </Col>
            ))}
          </AnimatePresence>
        </Row>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2rem] p-12 text-center shadow-sm border border-slate-100"
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div className="space-y-4">
                <Text className="text-slate-400 text-lg block">You haven't followed any doctors yet.</Text>
                <Button 
                  type="primary" 
                  size="large" 
                  onClick={() => navigate('/patient/doctors')}
                  className="rounded-2xl h-12 px-8 font-bold shadow-lg shadow-primary/20"
                >
                  Find Doctors to Follow
                </Button>
              </div>
            }
          />
        </motion.div>
      )}
    </div>
  );
};

export default PatientFollowedDoctors;
