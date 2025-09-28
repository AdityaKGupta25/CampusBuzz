import React from 'react';
import { Plus, Calendar, Users, BarChart3 } from 'lucide-react';
import KPICard from '../../components/Dashboard/KPICard';
import AnalyticsChart from '../../components/Dashboard/AnalyticsChart';
import RecentActivity from '../../components/Dashboard/RecentActivity';
import { facultyDemoData } from '../../data/facultyDemoData';

const FacultyDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, Prof. Sharma 👋</h1>
          <p className="text-gray-600">Here's your faculty dashboard overview</p>
        </div>
        <button 
          onClick={() => window.location.href = '/faculty/events/create'}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Create Event</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {facultyDemoData.facultyKPIs.map((kpi) => (
          <KPICard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      {/* Upcoming Events Timeline */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Events Timeline</h3>
          <button className="text-sm text-primary-500 hover:text-primary-600 font-medium">
            View all
          </button>
        </div>
        <div className="space-y-4">
          {facultyDemoData.facultyEvents.map((event) => (
            <div key={event.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Calendar size={20} className="text-primary-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900">{event.title}</h4>
                <p className="text-sm text-gray-600">{event.category} • {event.venue}</p>
                <p className="text-sm text-gray-500">
                  {new Date(event.date).toLocaleDateString()} at {event.time}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  event.status === 'live' ? 'bg-green-100 text-green-800' :
                  event.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {event.status}
                </span>
                <span className="text-sm text-gray-500">{event.participants} participants</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.href = '/faculty/students'}
              className="w-full flex items-center space-x-3 p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Users size={20} />
              <span>Assign Student Roles</span>
            </button>
            <button 
              onClick={() => window.location.href = '/faculty/clubs'}
              className="w-full flex items-center space-x-3 p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Calendar size={20} />
              <span>Manage Clubs</span>
            </button>
            <button 
              onClick={() => window.location.href = '/faculty/media'}
              className="w-full flex items-center space-x-3 p-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              <BarChart3 size={20} />
              <span>Upload Media</span>
            </button>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Activity Snapshot</h3>
          <div className="space-y-3">
            {facultyDemoData.facultyAnalytics.topStudents.slice(0, 3).map((student, index) => (
              <div key={student.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-600">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{student.name}</p>
                    <p className="text-sm text-gray-500">{student.events} events</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{student.score}%</p>
                  <p className="text-xs text-gray-500">score</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsChart
          type="line"
          data={facultyDemoData.facultyAnalytics.eventParticipation}
          title="Event Participation Trend"
        />
        <AnalyticsChart
          type="pie"
          data={facultyDemoData.facultyAnalytics.eventTypeBreakdown}
          title="Event Type Distribution"
        />
      </div>

      {/* Notifications Feed */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Notifications</h3>
        <div className="space-y-3">
          {facultyDemoData.facultyNotifications.slice(0, 5).map((notification) => (
            <div key={notification.id} className={`flex items-start space-x-3 p-3 rounded-lg ${
              notification.read ? 'bg-gray-50' : 'bg-blue-50'
            }`}>
              <div className={`w-2 h-2 rounded-full mt-2 ${
                notification.priority === 'high' ? 'bg-red-500' :
                notification.priority === 'medium' ? 'bg-yellow-500' :
                'bg-green-500'
              }`}></div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{notification.title}</p>
                <p className="text-sm text-gray-600">{notification.message}</p>
                <p className="text-xs text-gray-500 mt-1">{notification.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;
