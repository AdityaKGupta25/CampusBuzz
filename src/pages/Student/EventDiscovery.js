import React, { useState } from 'react';
import { Search, Filter, Calendar, MapPin, Users, Trophy, Grid, List } from 'lucide-react';
import { studentDemoData } from '../../data/studentDemoData';

const EventDiscovery = () => {
  const [viewMode, setViewMode] = useState('card');
  const [filters, setFilters] = useState({
    search: '',
    category: 'All',
    status: 'All',
    teamSize: 'All'
  });

  const categories = ['All', 'Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar'];
  const statuses = ['All', 'Upcoming', 'Ongoing', 'Completed'];
  const teamSizes = ['All', 'Individual', 'Team'];

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredEvents = studentDemoData.events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                         event.description.toLowerCase().includes(filters.search.toLowerCase());
    const matchesCategory = filters.category === 'All' || event.category === filters.category;
    const matchesStatus = filters.status === 'All' || event.status === filters.status;
    const matchesTeamSize = filters.teamSize === 'All' || event.teamSize.includes(filters.teamSize);

    return matchesSearch && matchesCategory && matchesStatus && matchesTeamSize;
  });

  const handleRegister = (event) => {
    console.log('Register for event:', event);
    // Implement registration logic
  };

  const handleViewDetails = (event) => {
    console.log('View event details:', event);
    // Implement event details modal
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Discover Events</h1>
        <p className="text-gray-600">Find and participate in exciting campus events</p>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search events..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>

            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <select
              value={filters.teamSize}
              onChange={(e) => handleFilterChange('teamSize', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {teamSizes.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">View:</span>
          <button
            onClick={() => setViewMode('card')}
            className={`p-2 rounded-lg ${
              viewMode === 'card' ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Grid size={20} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg ${
              viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <List size={20} />
          </button>
        </div>
        <div className="text-sm text-gray-500">
          {filteredEvents.length} events found
        </div>
      </div>

      {/* Events Grid/List */}
      <div className={`grid gap-6 ${
        viewMode === 'card' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
      }`}>
        {filteredEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            viewMode={viewMode}
            onRegister={() => handleRegister(event)}
            onViewDetails={() => handleViewDetails(event)}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Calendar size={48} className="mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-500 mb-4">Try adjusting your filters or check back later for new events</p>
        </div>
      )}
    </div>
  );
};

const EventCard = ({ event, viewMode, onRegister, onViewDetails }) => {
  const getStatusColor = (status) => {
    const colors = {
      upcoming: 'bg-blue-100 text-blue-800',
      ongoing: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors.upcoming;
  };

  if (viewMode === 'list') {
    return (
      <div className="card hover:shadow-md transition-shadow">
        <div className="flex space-x-4">
          <img
            src={event.poster}
            alt={event.title}
            className="w-32 h-24 rounded-lg object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 truncate">{event.title}</h3>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{event.description}</p>
                
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Calendar size={14} />
                    <span>{new Date(event.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin size={14} />
                    <span>{event.location}</span>
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
                {event.prize && (
                  <div className="flex items-center space-x-1 text-sm text-yellow-600">
                    <Trophy size={14} />
                    <span>{event.prize}</span>
                  </div>
                )}
                <div className="flex space-x-2">
                  <button
                    onClick={onViewDetails}
                    className="btn-secondary text-sm"
                  >
                    View Details
                  </button>
                  {event.status === 'upcoming' && (
                    <button
                      onClick={() => onRegister(event)}
                      className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
                        event.isRegistered
                          ? 'bg-green-100 text-green-800'
                          : 'bg-primary-500 text-white hover:bg-primary-600'
                      }`}
                    >
                      {event.isRegistered ? 'Registered' : 'Register'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="relative">
        <img
          src={event.poster}
          alt={event.title}
          className="w-full h-48 rounded-t-lg object-cover"
        />
        <div className="absolute top-3 right-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
            {event.status}
          </span>
        </div>
        {event.isRegistered && (
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
              Registered
            </span>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2">{event.title}</h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{event.description}</p>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-500">
            <Calendar size={14} className="mr-2" />
            <span>{new Date(event.date).toLocaleDateString()} at {event.time}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <MapPin size={14} className="mr-2" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Users size={14} className="mr-2" />
            <span>{event.participants} participants</span>
          </div>
          {event.prize && (
            <div className="flex items-center text-sm text-yellow-600">
              <Trophy size={14} className="mr-2" />
              <span>{event.prize}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            <p>Organizer: {event.organizer}</p>
            <p>Team Size: {event.teamSize}</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onViewDetails}
              className="btn-secondary text-sm"
            >
              Details
            </button>
            {event.status === 'upcoming' && (
              <button
                onClick={() => onRegister(event)}
                className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
                  event.isRegistered
                    ? 'bg-green-100 text-green-800'
                    : 'bg-primary-500 text-white hover:bg-primary-600'
                }`}
              >
                {event.isRegistered ? 'Registered' : 'Register'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDiscovery;
