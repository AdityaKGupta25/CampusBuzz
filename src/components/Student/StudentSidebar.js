import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Search, 
  Users, 
  BarChart3, 
  MessageSquare, 
  Bell, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  Image
} from 'lucide-react';

const StudentSidebar = ({ isCollapsed, toggleSidebar }) => {
  const location = useLocation();
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/student' },
    { id: 'feed', label: 'Social Feed', icon: Image, path: '/student/feed' },
    { id: 'events', label: 'Discover Events', icon: Calendar, path: '/student/events' },
    { id: 'coordinator', label: 'Student Coordinator', icon: Users, path: '/student/coordinator' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/student/analytics' },
    { id: 'messages', label: 'Messages', icon: MessageSquare, path: '/student/messages' },
    { id: 'notifications', label: 'Notifications', icon: Bell, path: '/student/notifications' },
    { id: 'profile', label: 'Profile / Settings', icon: User, path: '/student/profile' }
  ];

  return (
    <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h1 className="text-xl font-bold text-primary-500">Student Portal</h1>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <Link
                  to={item.path}
                  className={`flex items-center px-3 py-2 rounded-lg text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors ${
                    location.pathname === item.path ? 'bg-primary-50 text-primary-600' : ''
                  }`}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="ml-3 font-medium">{item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

    </div>
  );
};

export default StudentSidebar;
