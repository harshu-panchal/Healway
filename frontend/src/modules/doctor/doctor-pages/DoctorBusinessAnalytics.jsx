import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Select,
  Typography,
  Button,
  Skeleton
} from 'antd';
import {
  EyeOutlined,
  TeamOutlined,
  LineChartOutlined,
  CalendarOutlined,
  FilterOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { getAnalyticsSummary } from '../doctor-services/doctorService';
import { useToast } from '../../../contexts/ToastContext';
import { motion } from 'framer-motion';

const { Title, Text } = Typography;

const DoctorBusinessAnalytics = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState(30);
  const toast = useToast();

  const formatMetric = (value, digits = 2) => {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return 0;
    return Number(n.toFixed(digits));
  };

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

    } catch (error) {
      console.error('Error in analytics dashboard:', error);
      toast.error('Failed to load some analytics data');
    } finally {
      setLoading(false);
    }
  };

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
            <Card 
              className="rounded-3xl shadow-lg border-none overflow-hidden relative group"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
            >
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                <TeamOutlined style={{ fontSize: 64, color: '#fff' }} />
              </div>
              <Statistic 
                title={<Text style={{ color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px', fontWeight: '900' }}>Total Followers</Text>}
                value={summary?.totalFollowers || 0} 
                valueStyle={{ color: '#fff', fontWeight: '900', fontSize: '2rem' }}
              />
              <div className="mt-4 flex items-center gap-2">
                <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                  {(summary?.followersGrowth || 0) >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  <span className="ml-1">{Math.abs(summary?.followersGrowth || 0)} new</span>
                </div>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>This Period</Text>
              </div>
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card 
              className="rounded-3xl shadow-lg border-none overflow-hidden relative group"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            >
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                <EyeOutlined style={{ fontSize: 64, color: '#fff' }} />
              </div>
              <Statistic 
                title={<Text style={{ color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px', fontWeight: '900' }}>Profile Views</Text>}
                value={summary?.totalViews || 0} 
                valueStyle={{ color: '#fff', fontWeight: '900', fontSize: '2rem' }}
              />
              <div className="mt-4 flex items-center gap-2">
                <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                  {(summary?.viewsGrowth || 0) >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  <span className="ml-1">{Math.abs(summary?.viewsGrowth || 0)} views</span>
                </div>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>This Period</Text>
              </div>
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card 
              className="rounded-3xl shadow-lg border-none overflow-hidden relative group"
              style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}
            >
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                <LineChartOutlined style={{ fontSize: 64, color: '#fff' }} />
              </div>
              <Statistic 
                title={<Text style={{ color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px', fontWeight: '900' }}>Follow Rate</Text>}
                value={summary?.followRate || 0} 
                precision={2}
                suffix="%"
                valueStyle={{ color: '#fff', fontWeight: '900', fontSize: '2rem' }}
              />
              <div className="mt-4 flex items-center gap-2">
                <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 'bold' }}>
                  Conversion
                </div>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>Views to Follows</Text>
              </div>
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card 
              className="rounded-3xl shadow-lg border-none overflow-hidden relative group"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)' }}
            >
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                <CalendarOutlined style={{ fontSize: 64, color: '#fff' }} />
              </div>
              <Statistic 
                title={<Text style={{ color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px', fontWeight: '900' }}>Active Growth</Text>}
                value={formatMetric(summary?.activeGrowth || 0, 2)} 
                precision={2}
                suffix="%"
                valueStyle={{ color: '#fff', fontWeight: '900', fontSize: '2rem' }}
              />
              <div className="mt-4 flex items-center gap-2">
                <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 'bold' }}>Live</div>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>Real-time status</Text>
              </div>
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* Specialization Search Count */}
      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} sm={12} lg={6}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card
              className="rounded-3xl shadow-lg border-none overflow-hidden relative group"
              style={{ background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)' }}
            >
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                <SearchOutlined style={{ fontSize: 64, color: '#fff' }} />
              </div>
              <Statistic
                title={<Text style={{ color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px', fontWeight: '900' }}>Specialization Searches</Text>}
                value={summary?.specializationSearchCount || 0}
                valueStyle={{ color: '#fff', fontWeight: '900', fontSize: '2rem' }}
              />
              <div className="mt-4 flex items-center gap-2">
                <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 'bold' }}>Your Specialty</div>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Searches</Text>
              </div>
            </Card>
          </motion.div>
        </Col>
      </Row>

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
