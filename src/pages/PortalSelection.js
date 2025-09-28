import React from 'react';
import { Link } from 'react-router-dom';
import { Users, GraduationCap, Shield, ArrowRight } from 'lucide-react';

const PortalSelection = () => {
  const portals = [
    {
      id: 'admin',
      title: 'Admin Portal',
      description: 'Complete campus management system with analytics, event management, and media control',
      icon: Shield,
      color: 'bg-blue-500',
      features: [
        'Dashboard with KPIs and analytics',
        'Event management and approval',
        'College page and media management',
        'Comprehensive analytics and reports',
        'Student and faculty communication'
      ],
      path: '/admin'
    },
    {
      id: 'faculty',
      title: 'Faculty Portal',
      description: 'Event creation, student management, and academic coordination tools',
      icon: GraduationCap,
      color: 'bg-green-500',
      features: [
        'Create and manage events',
        'Student directory and role assignment',
        'Club and fest management',
        'Event analytics and reports',
        'Student communication'
      ],
      path: '/faculty'
    },
    {
      id: 'student',
      title: 'Student Portal',
      description: 'Social engagement, event discovery, and coordinator features',
      icon: Users,
      color: 'bg-purple-500',
      features: [
        'Social feed and campus updates',
        'Event discovery and registration',
        'Student coordinator features',
        'Personal analytics and achievements',
        'Messaging and notifications'
      ],
      path: '/student'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">CampusBuzz</h1>
          <p className="text-xl text-gray-600 mb-2">Complete Campus Ecosystem Platform</p>
          <p className="text-gray-500">Choose your portal to get started</p>
        </div>

        {/* Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {portals.map((portal) => {
            const Icon = portal.icon;
            return (
              <div
                key={portal.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden"
              >
                {/* Card Header */}
                <div className={`${portal.color} p-8 text-white`}>
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <Icon size={32} />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-center">{portal.title}</h2>
                </div>

                {/* Card Body */}
                <div className="p-8">
                  <p className="text-gray-600 mb-6 text-center">{portal.description}</p>
                  
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Key Features:</h3>
                    <ul className="space-y-2">
                      {portal.features.map((feature, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-sm text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    to={portal.path}
                    className={`w-full ${portal.color} text-white py-3 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center space-x-2`}
                  >
                    <span>Enter Portal</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-gray-500 text-sm">
            CampusBuzz v1.0 - Connecting students, faculty, and administrators
          </p>
        </div>
      </div>
    </div>
  );
};

export default PortalSelection;
