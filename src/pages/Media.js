import React, { useState } from 'react';
import { Image } from 'lucide-react';
import MediaCard from '../components/Media/MediaCard';
import MediaFilters from '../components/Media/MediaFilters';
import { demoData } from '../data/demoData';

const Media = () => {
  const [filters, setFilters] = useState({
    search: '',
    college: 'All',
    type: 'All',
    department: 'All',
    sort: 'Recent'
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearchChange = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleCreatePost = () => {
    console.log('Create post modal');
    // Implement create post modal
  };

  const handleDeleteMedia = (media) => {
    console.log('Delete media:', media);
    // Implement delete confirmation
  };

  const handleViewMedia = (media) => {
    console.log('View media:', media);
    // Implement view media modal
  };

  const filteredMedia = demoData.media.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                         item.caption.toLowerCase().includes(filters.search.toLowerCase()) ||
                         item.college.toLowerCase().includes(filters.search.toLowerCase());
    const matchesCollege = filters.college === 'All' || item.college === filters.college;
    const matchesType = filters.type === 'All' || item.type === filters.type.toLowerCase();
    const matchesDepartment = filters.department === 'All' || item.department === filters.department;

    return matchesSearch && matchesCollege && matchesType && matchesDepartment;
  });

  // Sort media based on selected option
  const sortedMedia = [...filteredMedia].sort((a, b) => {
    switch (filters.sort) {
      case 'Popular':
        return b.likes - a.likes;
      case 'Most Liked':
        return b.likes - a.likes;
      case 'Most Viewed':
        return b.views - a.views;
      case 'Recent':
      default:
        return new Date(b.date) - new Date(a.date);
    }
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Media Feed</h1>
        <p className="text-gray-600">Manage and monitor media content across colleges</p>
      </div>

      {/* Filters */}
      <MediaFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onSearchChange={handleSearchChange}
        onCreatePost={handleCreatePost}
      />

      {/* Media Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Media</h3>
          <p className="text-3xl font-bold text-primary-500">320</p>
          <p className="text-sm text-gray-500 mt-1">+22% from last month</p>
        </div>
        
        <div className="card text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Most Viewed</h3>
          <p className="text-3xl font-bold text-green-500">1.2K</p>
          <p className="text-sm text-gray-500 mt-1">Tech Fest Highlights</p>
        </div>
        
        <div className="card text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Top College</h3>
          <p className="text-3xl font-bold text-orange-500">PIET</p>
          <p className="text-sm text-gray-500 mt-1">Most active contributor</p>
        </div>
        
        <div className="card text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Engagement</h3>
          <p className="text-3xl font-bold text-purple-500">85%</p>
          <p className="text-sm text-gray-500 mt-1">Average engagement rate</p>
        </div>
      </div>

      {/* Media Feed */}
      <div className="space-y-4">
        {sortedMedia.map((media) => (
          <MediaCard
            key={media.id}
            media={media}
            onDelete={handleDeleteMedia}
            onView={handleViewMedia}
          />
        ))}
      </div>

      {/* Load More */}
      <div className="text-center">
        <button className="btn-secondary">
          Load More Media
        </button>
      </div>

      {/* Empty State */}
      {sortedMedia.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Image size={48} className="mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No media found</h3>
          <p className="text-gray-500 mb-4">Try adjusting your filters or create new content</p>
          <button className="btn-primary" onClick={handleCreatePost}>
            Create Post
          </button>
        </div>
      )}
    </div>
  );
};

export default Media;
