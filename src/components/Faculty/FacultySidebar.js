import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Plus, 
  Users, 
  BarChart3, 
  Image, 
  Bell, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Building2
} from 'lucide-react';

const FacultySidebar = ({ isCollapsed, toggleSidebar }) => {
  const location = useLocation();
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/faculty' },
    { 
      id: 'events', 
      label: 'Event Section', 
      icon: Calendar, 
      path: '/faculty/events',
      submenu: [
        { id: 'create-event', label: 'Create Event', icon: Plus, path: '/faculty/events/create' },
        { id: 'manage-events', label: 'Manage Events', icon: Calendar, path: '/faculty/events/manage' }
      ]
    },
    { id: 'clubs', label: 'Clubs / Fests', icon: Building2, path: '/faculty/clubs' },
    { id: 'students', label: 'Student Directory', icon: Users, path: '/faculty/students' },
    { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3, path: '/faculty/analytics' },
    { id: 'media', label: 'Media Management', icon: Image, path: '/faculty/media' },
    { id: 'notifications', label: 'Notifications', icon: Bell, path: '/faculty/notifications' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/faculty/settings' }
  ];

  const [expandedItems, setExpandedItems] = useState([]);

  const toggleExpanded = (itemId) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  return (
    <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h1 className="text-xl font-bold text-primary-500">Faculty Portal</h1>
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
            const isExpanded = expandedItems.includes(item.id);
            
            return (
              <li key={item.id}>
                <div>
                  <Link
                    to={item.path}
                    className={`flex items-center px-3 py-2 rounded-lg text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors ${
                      location.pathname === item.path ? 'bg-primary-50 text-primary-600' : ''
                    }`}
                    onClick={item.submenu ? (e) => { e.preventDefault(); toggleExpanded(item.id); } : undefined}
                  >
                    <Icon size={20} className="flex-shrink-0" />
                    {!isCollapsed && (
                      <>
                        <span className="ml-3 font-medium">{item.label}</span>
                        {item.submenu && (
                          <ChevronRight 
                            size={16} 
                            className={`ml-auto transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                          />
                        )}
                      </>
                    )}
                  </Link>
                  
                  {/* Submenu */}
                  {item.submenu && isExpanded && !isCollapsed && (
                    <ul className="ml-8 mt-2 space-y-1">
                      {item.submenu.map((subItem) => {
                        const SubIcon = subItem.icon;
                        return (
                          <li key={subItem.id}>
                            <Link
                              to={subItem.path}
                              className="flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors"
                            >
                              <SubIcon size={16} className="flex-shrink-0" />
                              <span className="ml-3">{subItem.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

    </div>
  );
};

export default FacultySidebar;
