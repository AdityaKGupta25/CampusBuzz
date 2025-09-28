import React, { useState } from 'react';
import { Search, Filter, Calendar, Users, Edit, Trash2, Download, Eye } from 'lucide-react';
import { facultyDemoData } from '../../data/facultyDemoData';

const ManageEvents = () => {
  const [filters, setFilters] = useState({
    search: '',
    status: 'All',
    category: 'All'
  });

  const statuses = ['All', 'Draft', 'Approved', 'Live', 'Completed'];
  const categories = ['All', 'Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar'];

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredEvents = facultyDemoData.facultyEvents.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                         event.description.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === 'All' || event.status === filters.status.toLowerCase();
    const matchesCategory = filters.category === 'All' || event.category === filters.category;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleEditEvent = (event) => {
    console.log('Edit event:', event);
    // Implement edit event logic
  };

  const handleDeleteEvent = (event) => {
    console.log('Delete event:', event);
    // Implement delete confirmation
  };

  const handleDownloadReport = (event) => {
    console.log('Download report for:', event);
    // Implement report download
  };

  const handleViewEvent = (event) => {
    console.log('View event:', event);
    // Implement view event details
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage Events</h1>
        <p className="text-gray-600">View and manage all your events</p>
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
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Event Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Category</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Participants</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr key={event.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{event.title}</p>
                      <p className="text-sm text-gray-500">{event.description}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm text-gray-900">
                      <p>{new Date(event.date).toLocaleDateString()}</p>
                      <p className="text-gray-500">{event.time}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {event.category}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      event.status === 'live' ? 'bg-green-100 text-green-800' :
                      event.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                      event.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-1">
                      <Users size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-900">{event.participants}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewEvent(event)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleEditEvent(event)}
                        className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                        title="Edit Event"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDownloadReport(event)}
                        className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                        title="Download Report"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Event"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Calendar size={48} className="mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-500 mb-4">Try adjusting your filters or create a new event</p>
          <button className="btn-primary">
            Create Event
          </button>
        </div>
      )}
    </div>
  );
};

export default ManageEvents;
