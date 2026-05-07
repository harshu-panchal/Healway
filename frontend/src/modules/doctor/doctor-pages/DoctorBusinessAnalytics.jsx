import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Table, 
  Tag, 
  Avatar, 
  Select, 
  Typography, 
  Button, 
  Space,
  Empty,
  Skeleton
} from 'antd';
import { 
  UserOutlined, 
  EyeOutlined, 
  TeamOutlined, 
  LineChartOutlined,
  CalendarOutlined,
  FilterOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import { getAnalyticsSummary, getFollowersList } from '../doctor-services/doctorService';
import { useToast } from '../../../contexts/ToastContext';
import { motion } from 'framer-motion';

const { Title, Text } = Typography;

const DoctorBusinessAnalytics = () => {
  const [summary, setSummary] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState(30);
  const toast = useToast();

  useEffect(() => {
    fetchData();
  }, [timeframe]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch summary
      try {
        const summaryRes = await getAnalyticsSummary();
        if (summaryRes && summaryRes.success) {
          setSummary(summaryRes.data);
        }
      } catch (err) {
        console.error('Summary fetch error:', err);
      }

      // Fetch followers
      try {
        const followersRes = await getFollowersList({ limit: 10 });
        if (followersRes && followersRes.success) {
          setFollowers(Array.isArray(followersRes.data) ? followersRes.data : (followersRes.data.items || []));
        }
      } catch (err) {
        console.error('Followers fetch error:', err);
      }

    } catch (error) {
      console.error('Error in analytics dashboard:', error);
      toast.error('Failed to load some analytics data');
    } finally {
      setLoading(false);
    }
  };

  const followerColumns = [
    {
      title: 'Patient',
      dataIndex: 'patientId',
      key: 'name',
      width: 250,
      render: (patient) => {
        const name = patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() : 'Unknown Patient';
        return (
          <Space>
            <Avatar 
              icon={<UserOutlined />} 
              src={patient?.profileImage} 
              className="bg-primary-50 text-primary border border-primary-100"
              size={40}
            />
            <div className="flex flex-col">
              <Text strong className="text-slate-900 leading-tight">
                {name || 'Unknown Patient'}
              </Text>
              <Text type="secondary" className="text-[11px]">
                {patient?.phone || 'No phone provided'}
              </Text>
            </div>
          </Space>
        );
      }
    },
    {
      title: 'Email',
      dataIndex: 'patientId',
      key: 'email',
      render: (patient) => <Text type="secondary">{patient?.email || 'N/A'}</Text>
    },
    {
      title: 'Followed On',
      dataIndex: 'createdAt',
      key: 'date',
      render: (date) => (
        <Text className="text-slate-600">
          {new Date(date).toLocaleDateString('en-US', { 
            year: 'numeric', month: 'short', day: 'numeric' 
          })}
        </Text>
      )
    }
  ];

  if (loading && !summary) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton active paragraph={{ rows: 4 }} />
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4].map(i => (
            <Col xs={24} sm={12} lg={6} key={i}>
              <Skeleton.Button active block style={{ height: 120, borderRadius: 16 }} />
            </Col>
          ))}
        </Row>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <Title level={2} className="m-0 !font-extrabold text-slate-900">Business & Analytics</Title>
          <Text type="secondary" className="text-base">Monitor your profile performance and patient engagement</Text>
        </div>
        <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-100 flex items-center">
          <Select 
            value={timeframe} 
            onChange={setTimeframe}
            className="w-40"
            variant="borderless"
            suffixIcon={<FilterOutlined className="text-primary" />}
          >
            <Select.Option value={7}>Last 7 Days</Select.Option>
            <Select.Option value={30}>Last 30 Days</Select.Option>
            <Select.Option value={90}>Last 90 Days</Select.Option>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="rounded-3xl shadow-sm border-none overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <TeamOutlined style={{ fontSize: 64, color: '#0ea5e9' }} />
              </div>
              <Statistic 
                title={<Text className="text-slate-400 uppercase tracking-widest text-[10px] font-black">Total Followers</Text>}
                value={summary?.totalFollowers || 0} 
                valueStyle={{ color: '#0f172a', fontWeight: '900', fontSize: '2rem' }}
              />
              <div className="mt-4 flex items-center gap-2">
                <div className={`flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  (summary?.followersGrowth || 0) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {(summary?.followersGrowth || 0) >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  <span className="ml-1">{Math.abs(summary?.followersGrowth || 0)} new</span>
                </div>
                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-tight">This Period</Text>
              </div>
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="rounded-3xl shadow-sm border-none overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <EyeOutlined style={{ fontSize: 64, color: '#6366f1' }} />
              </div>
              <Statistic 
                title={<Text className="text-slate-400 uppercase tracking-widest text-[10px] font-black">Profile Views</Text>}
                value={summary?.totalViews || 0} 
                valueStyle={{ color: '#0f172a', fontWeight: '900', fontSize: '2rem' }}
              />
              <div className="mt-4 flex items-center gap-2">
                <div className={`flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  (summary?.viewsGrowth || 0) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {(summary?.viewsGrowth || 0) >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  <span className="ml-1">{Math.abs(summary?.viewsGrowth || 0)} views</span>
                </div>
                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-tight">This Period</Text>
              </div>
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="rounded-3xl shadow-sm border-none overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <LineChartOutlined style={{ fontSize: 64, color: '#10b981' }} />
              </div>
              <Statistic 
                title={<Text className="text-slate-400 uppercase tracking-widest text-[10px] font-black">Follow Rate</Text>}
                value={summary?.followRate || 0} 
                precision={2}
                suffix="%"
                valueStyle={{ color: '#0f172a', fontWeight: '900', fontSize: '2rem' }}
              />
              <div className="mt-4 flex items-center gap-2">
                <div className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  Conversion
                </div>
                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-tight">Views to Follows</Text>
              </div>
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="rounded-3xl shadow-sm border-none overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <CalendarOutlined style={{ fontSize: 64, color: '#a855f7' }} />
              </div>
              <Statistic 
                title={<Text className="text-slate-400 uppercase tracking-widest text-[10px] font-black">Active Growth</Text>}
                value={summary?.activeGrowth || 0} 
                suffix="%"
                valueStyle={{ color: '#0f172a', fontWeight: '900', fontSize: '2rem' }}
              />
              <div className="mt-4 flex items-center gap-2">
                <Tag color="purple" className="border-none rounded-full text-[10px] font-bold m-0">Live</Tag>
                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-tight">Real-time status</Text>
              </div>
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* Followers List */}
      <Card 
        title={<span className="font-bold text-slate-800">Recent Followers</span>} 
        className="rounded-3xl shadow-sm border-none overflow-hidden"
      >
        <div className="overflow-x-auto">
          <Table 
            columns={followerColumns} 
            dataSource={followers} 
            loading={loading}
            pagination={false}
            rowKey="_id"
            className="custom-table"
            scroll={{ x: 600 }}
          />
        </div>
        {followers.length === 0 && !loading && (
          <Empty description="You don't have any followers yet" className="py-8" />
        )}
      </Card>

      <style jsx global>{`
        .custom-table .ant-table {
          background: transparent;
        }
        .custom-table .ant-table-thead > tr > th {
          background: #f8fafc;
          color: #64748b;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border-bottom: 1px solid #f1f5f9;
        }
        .custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #f1f5f9;
          padding: 16px 16px;
        }
        .custom-table .ant-table-row:hover > td {
          background: #f8fafc !important;
        }
      `}</style>
    </div>
  );
};

export default DoctorBusinessAnalytics;
