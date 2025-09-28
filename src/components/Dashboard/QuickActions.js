import React from 'react';
import { Plus, Upload, Bell } from 'lucide-react';

const QuickActions = () => {
  const actions = [
    {
      id: 1,
      title: 'Add Event',
      icon: Plus,
      color: 'bg-blue-500 hover:bg-blue-600',
      description: 'Create a new campus event',
      onClick: () => window.location.href = '/admin/events'
    },
    {
      id: 2,
      title: 'Upload Media',
      icon: Upload,
      color: 'bg-green-500 hover:bg-green-600',
      description: 'Upload photos and videos',
      onClick: () => window.location.href = '/admin/media'
    },
    {
      id: 3,
      title: 'Send Notification',
      icon: Bell,
      color: 'bg-orange-500 hover:bg-orange-600',
      description: 'Notify students and faculty',
      onClick: () => window.location.href = '/admin/messages'
    }
  ];

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div className="space-y-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={action.onClick}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg text-white ${action.color} transition-colors`}
            >
              <Icon size={20} />
              <div className="text-left">
                <p className="font-medium">{action.title}</p>
                <p className="text-sm opacity-90">{action.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;
