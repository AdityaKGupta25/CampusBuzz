import React from 'react';
import { Calendar, MapPin, Users, Eye, Edit, Trash2 } from 'lucide-react';

const EventCard = ({ event, onView, onEdit, onDelete }) => {
  const getStatusColor = (status) => {
    const colors = {
      upcoming: 'bg-blue-100 text-blue-800',
      ongoing: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors.upcoming;
  };

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex space-x-4">
        <img
          src={event.poster}
          alt={event.title}
          className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 truncate">{event.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{event.department}</p>
              
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Calendar size={14} />
                  <span>{new Date(event.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MapPin size={14} />
                  <span>{event.venue}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users size={14} />
                  <span>{event.participants} participants</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end space-y-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                {event.status}
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => onView(event)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="View Details"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => onEdit(event)}
                  className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                  title="Edit Event"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => onDelete(event)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete Event"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
          
          {event.description && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{event.description}</p>
          )}
          
          {event.prize && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Prize: {event.prize}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventCard;
