import React from 'react';
import CollegeProfile from '../components/College/CollegeProfile';
import StoriesSection from '../components/College/StoriesSection';
import MediaGrid from '../components/College/MediaGrid';
import { demoData } from '../data/demoData';

const College = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">College Page</h1>
        <p className="text-gray-600">Manage your college profile and media content</p>
      </div>

      {/* College Profile */}
      <CollegeProfile profile={demoData.collegeProfile} />

      {/* Stories Section */}
      <StoriesSection stories={demoData.collegeProfile.stories} />

      {/* Media Grid */}
      <MediaGrid 
        media={demoData.media} 
        title="Posts & Reels" 
      />

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Posts</h3>
          <p className="text-3xl font-bold text-primary-500">320</p>
          <p className="text-sm text-gray-500 mt-1">+12% from last month</p>
        </div>
        
        <div className="card text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Most Viewed Media</h3>
          <p className="text-3xl font-bold text-green-500">1.2K</p>
          <p className="text-sm text-gray-500 mt-1">Tech Fest Highlights</p>
        </div>
        
        <div className="card text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Engagement Rate</h3>
          <p className="text-3xl font-bold text-orange-500">85%</p>
          <p className="text-sm text-gray-500 mt-1">+5% from last month</p>
        </div>
      </div>
    </div>
  );
};

export default College;
