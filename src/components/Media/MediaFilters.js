import React from 'react';
import { Search, Filter, Plus } from 'lucide-react';

const MediaFilters = ({ filters, onFilterChange, onSearchChange, onCreatePost }) => {
  const colleges = ['All', 'PIET College', 'XYZ College', 'DEF College'];
  const types = ['All', 'Posts', 'Reels'];
  const departments = ['All', 'Computer Science', 'Electronics', 'Cultural', 'Sports'];
  const sortOptions = ['Recent', 'Popular', 'Most Liked', 'Most Viewed'];

  return (
    <div className="card mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search media, colleges, events..."
              value={filters.search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter size={16} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          {/* College Filter */}
          <select
            value={filters.college}
            onChange={(e) => onFilterChange('college', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {colleges.map((college) => (
              <option key={college} value={college}>{college}</option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={filters.type}
            onChange={(e) => onFilterChange('type', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {types.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={filters.department}
            onChange={(e) => onFilterChange('department', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Sort Filter */}
          <select
            value={filters.sort}
            onChange={(e) => onFilterChange('sort', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {sortOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          {/* Create Post Button */}
          <button
            onClick={onCreatePost}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Create Post</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MediaFilters;
