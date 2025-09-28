import React, { useState } from 'react';
import { Download, Filter } from 'lucide-react';
import AnalyticsCard from '../components/Analytics/AnalyticsCard';
import AnalyticsChart from '../components/Dashboard/AnalyticsChart';
import { demoData } from '../data/demoData';

const Analytics = () => {
  const [filters, setFilters] = useState({
    department: 'All',
    dateRange: 'Last 6 months',
    eventType: 'All',
    mediaType: 'All'
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const analyticsKPIs = [
    {
      id: 1,
      title: "Total Students Participated",
      value: "4,523",
      change: "+15%",
      changeType: "positive",
      icon: "👩‍🎓",
      color: "blue"
    },
    {
      id: 2,
      title: "Total Events Conducted",
      value: "148",
      change: "+8%",
      changeType: "positive",
      icon: "🎉",
      color: "green"
    },
    {
      id: 3,
      title: "Total Media Engagement",
      value: "12.5K",
      change: "+22%",
      changeType: "positive",
      icon: "📈",
      color: "orange"
    },
    {
      id: 4,
      title: "Top Performing Department",
      value: "CSE",
      change: "85%",
      changeType: "positive",
      icon: "🏆",
      color: "purple"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Comprehensive insights on campus engagement</p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => console.log('Open filters')}
            className="btn-secondary flex items-center space-x-2"
          >
            <Filter size={16} />
            <span>Filters</span>
          </button>
          <button 
            onClick={() => console.log('Export report')}
            className="btn-primary flex items-center space-x-2"
          >
            <Download size={16} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card">
        <div className="flex flex-wrap items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter size={16} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          <select
            value={filters.department}
            onChange={(e) => handleFilterChange('department', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="All">All Departments</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Electronics">Electronics</option>
            <option value="Mechanical">Mechanical</option>
            <option value="Cultural">Cultural</option>
          </select>

          <select
            value={filters.dateRange}
            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="Last 30 days">Last 30 days</option>
            <option value="Last 3 months">Last 3 months</option>
            <option value="Last 6 months">Last 6 months</option>
            <option value="Last year">Last year</option>
          </select>

          <select
            value={filters.eventType}
            onChange={(e) => handleFilterChange('eventType', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="All">All Event Types</option>
            <option value="Technical">Technical</option>
            <option value="Cultural">Cultural</option>
            <option value="Sports">Sports</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {analyticsKPIs.map((kpi) => (
          <AnalyticsCard key={kpi.id} {...kpi} />
        ))}
      </div>

      {/* Events Analytics */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Events Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnalyticsChart
            type="bar"
            data={demoData.analytics.departmentEngagement}
            title="Department-wise Participation"
          />
          <AnalyticsChart
            type="line"
            data={demoData.analytics.participationTrend}
            title="Participation Trend Over Time"
          />
        </div>
      </div>

      {/* Event Type Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <AnalyticsChart
          type="pie"
          data={demoData.analytics.eventTypeBreakdown}
          title="Event Type Distribution"
        />
      </div>

      {/* Media Analytics */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Media Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Media Uploaded</h3>
            <p className="text-3xl font-bold text-primary-500">320</p>
            <p className="text-sm text-gray-500 mt-1">+22% from last month</p>
          </div>
          
          <div className="card text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Most Viewed Media</h3>
            <p className="text-3xl font-bold text-green-500">1.2K</p>
            <p className="text-sm text-gray-500 mt-1">Tech Fest Highlights</p>
          </div>
          
          <div className="card text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Top College Contributors</h3>
            <p className="text-3xl font-bold text-orange-500">PIET</p>
            <p className="text-sm text-gray-500 mt-1">Most active college</p>
          </div>
        </div>
      </div>

      {/* Student Engagement */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Student Engagement</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Students</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Highly Active</span>
                <span className="text-sm font-medium text-gray-900">1,250</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Moderately Active</span>
                <span className="text-sm font-medium text-gray-900">2,100</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Less Active</span>
                <span className="text-sm font-medium text-gray-900">1,173</span>
              </div>
            </div>
          </div>
          
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Participation Metrics</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Average Events per Student</span>
                <span className="text-sm font-medium text-gray-900">3.2</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Peak Participation Day</span>
                <span className="text-sm font-medium text-gray-900">Friday</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Most Popular Event Type</span>
                <span className="text-sm font-medium text-gray-900">Technical</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
