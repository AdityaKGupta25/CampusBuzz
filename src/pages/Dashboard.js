import React from 'react';
import KPICard from '../components/Dashboard/KPICard';
import AnalyticsChart from '../components/Dashboard/AnalyticsChart';
import RecentActivity from '../components/Dashboard/RecentActivity';
import QuickActions from '../components/Dashboard/QuickActions';
import UpcomingEvents from '../components/Dashboard/UpcomingEvents';
import { demoData } from '../data/demoData';

const Dashboard = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening on campus.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {demoData.kpis.map((kpi) => (
          <KPICard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsChart
          type="line"
          data={demoData.analytics.participationTrend}
          title="Participation Trend"
        />
        <AnalyticsChart
          type="pie"
          data={demoData.analytics.eventTypeBreakdown}
          title="Event Type Breakdown"
        />
      </div>

      {/* Department Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <AnalyticsChart
          type="bar"
          data={demoData.analytics.departmentEngagement}
          title="Department-wise Engagement"
        />
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity activities={demoData.recentActivity} />
        <QuickActions />
      </div>

      {/* Upcoming Events */}
      <UpcomingEvents events={demoData.upcomingEvents} />
    </div>
  );
};

export default Dashboard;
