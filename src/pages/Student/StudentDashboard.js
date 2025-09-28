import React from 'react';
import { Calendar, Trophy, Users, TrendingUp, Award, Star } from 'lucide-react';
import AnalyticsChart from '../../components/Dashboard/AnalyticsChart';
import { studentDemoData } from '../../data/studentDemoData';

const StudentDashboard = () => {
  const { studentProfile, dashboardAnalytics } = studentDemoData;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {studentProfile.name}! 👋</h1>
          <p className="text-gray-600">Here's your activity overview and personalized suggestions</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Points</p>
            <p className="text-2xl font-bold text-primary-500">{studentProfile.stats.totalPoints}</p>
          </div>
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
            <Trophy size={24} className="text-primary-600" />
          </div>
        </div>
      </div>

      {/* Quick Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Events Participated</p>
              <p className="text-3xl font-bold text-gray-900">{studentProfile.stats.eventsParticipated}</p>
              <p className="text-sm text-green-600 mt-1">+3 this month</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Calendar size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Events Coordinated</p>
              <p className="text-3xl font-bold text-gray-900">{studentProfile.stats.eventsCoordinated}</p>
              <p className="text-sm text-blue-600 mt-1">Leadership role</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Users size={24} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Events Won</p>
              <p className="text-3xl font-bold text-gray-900">{studentProfile.stats.eventsWon}</p>
              <p className="text-sm text-yellow-600 mt-1">16.7% win rate</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <Trophy size={24} className="text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Current Rank</p>
              <p className="text-3xl font-bold text-gray-900">#{dashboardAnalytics.performance.rank}</p>
              <p className="text-sm text-purple-600 mt-1">Top performer</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <TrendingUp size={24} className="text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Feed Snapshot & Event Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feed Snapshot */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Feed Activity</h3>
            <a href="/student/feed" className="text-sm text-primary-500 hover:text-primary-600">
              View all
            </a>
          </div>
          <div className="space-y-3">
            {studentDemoData.socialFeed.slice(0, 3).map((post) => (
              <div key={post.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-primary-600">A</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 line-clamp-2">{post.content}</p>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span>{post.likes} likes</span>
                    <span>{post.comments} comments</span>
                    <span>{post.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Event Summary */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Events</h3>
            <a href="/student/events" className="text-sm text-primary-500 hover:text-primary-600">
              View all
            </a>
          </div>
          <div className="space-y-3">
            {studentDemoData.events.filter(e => e.status === 'upcoming').slice(0, 3).map((event) => (
              <div key={event.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <img
                  src={event.poster}
                  alt={event.title}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">{event.title}</h4>
                  <p className="text-sm text-gray-600">{event.category}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(event.date).toLocaleDateString()} at {event.time}
                  </p>
                </div>
                <div className="text-right">
                  {event.isRegistered ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Registered
                    </span>
                  ) : (
                    <button 
                      onClick={() => console.log('Register for event:', event.id)}
                      className="px-3 py-1 bg-primary-500 text-white text-xs rounded-lg hover:bg-primary-600"
                    >
                      Register
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Coordinator Tasks */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Coordinator Tasks</h3>
          <a href="/student/coordinator" className="text-sm text-primary-500 hover:text-primary-600">
            Manage all
          </a>
        </div>
        <div className="space-y-3">
          {studentDemoData.coordinatorEvents.slice(0, 2).map((event) => (
            <div key={event.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Calendar size={20} className="text-primary-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{event.title}</h4>
                  <p className="text-sm text-gray-600">{event.description}</p>
                  <p className="text-xs text-gray-500">
                    Assigned by {event.assignedBy} • {event.participants} participants
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  event.status === 'approved' ? 'bg-green-100 text-green-800' :
                  event.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {event.status}
                </span>
                <button className="p-1 text-gray-400 hover:text-blue-600">
                  <Award size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsChart
          type="line"
          data={dashboardAnalytics.participationTrend}
          title="Participation Trend"
        />
        <AnalyticsChart
          type="pie"
          data={dashboardAnalytics.categoryBreakdown}
          title="Event Category Breakdown"
        />
      </div>

      {/* Achievements */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Achievements</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {studentProfile.achievements.map((achievement) => (
            <div key={achievement.id} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Star size={20} className="text-yellow-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{achievement.title}</h4>
                <p className="text-sm text-gray-500">{achievement.type}</p>
                <p className="text-xs text-gray-400">{achievement.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
