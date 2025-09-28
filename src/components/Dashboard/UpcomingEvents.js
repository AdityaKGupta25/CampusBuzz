import React from 'react';

const UpcomingEvents = ({ events }) => {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Upcoming Events</h3>
        <button className="text-sm text-primary-500 hover:text-primary-600 font-medium">
          View all
        </button>
      </div>
      <div className="space-y-4">
        {events.map((event) => (
          <div key={event.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <img
              src={event.poster}
              alt={event.title}
              className="w-16 h-16 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 truncate">{event.title}</h4>
              <p className="text-sm text-gray-600">{event.department}</p>
              <p className="text-sm text-gray-500">
                {new Date(event.date).toLocaleDateString()} at {event.time}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{event.participants}</p>
              <p className="text-xs text-gray-500">participants</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpcomingEvents;
