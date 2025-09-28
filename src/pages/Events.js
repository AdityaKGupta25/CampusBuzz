import React, { useState } from 'react';
import { Plus, Grid, List, Calendar } from 'lucide-react';
import EventCard from '../components/Events/EventCard';
import EventFilters from '../components/Events/EventFilters';
import { demoData } from '../data/demoData';

const Events = () => {
  const [viewMode, setViewMode] = useState('card');
  const [filters, setFilters] = useState({
    search: '',
    department: 'All',
    category: 'All',
    status: 'All'
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearchChange = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  const filteredEvents = demoData.events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                         event.description.toLowerCase().includes(filters.search.toLowerCase());
    const matchesDepartment = filters.department === 'All' || event.department === filters.department;
    const matchesCategory = filters.category === 'All' || event.category === filters.category;
    const matchesStatus = filters.status === 'All' || event.status === filters.status.toLowerCase();

    return matchesSearch && matchesDepartment && matchesCategory && matchesStatus;
  });

  const upcomingEvents = filteredEvents.filter(event => event.status === 'upcoming');
  const pastEvents = filteredEvents.filter(event => event.status === 'completed');

  const handleViewEvent = (event) => {
    console.log('View event:', event);
    // Implement view event modal
  };

  const handleEditEvent = (event) => {
    console.log('Edit event:', event);
    // Implement edit event modal
  };

  const handleDeleteEvent = (event) => {
    console.log('Delete event:', event);
    // Implement delete confirmation
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events Management</h1>
          <p className="text-gray-600">Manage campus events and track participation</p>
        </div>
        <button 
          onClick={() => window.location.href = '/admin/events'}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Add Event</span>
        </button>
      </div>

      {/* Filters */}
      <EventFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onSearchChange={handleSearchChange}
      />

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

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h2>
          <div className={`grid gap-6 ${
            viewMode === 'card' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
          }`}>
            {upcomingEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onView={handleViewEvent}
                onEdit={handleEditEvent}
                onDelete={handleDeleteEvent}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Past Events</h2>
          <div className={`grid gap-6 ${
            viewMode === 'card' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
          }`}>
            {pastEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onView={handleViewEvent}
                onEdit={handleEditEvent}
                onDelete={handleDeleteEvent}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Calendar size={48} className="mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-500 mb-4">Try adjusting your filters or create a new event</p>
          <button 
            onClick={() => window.location.href = '/admin/events'}
            className="btn-primary"
          >
            Create Event
          </button>
        </div>
      )}
    </div>
  );
};

export default Events;
