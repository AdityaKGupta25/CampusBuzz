import React from 'react';
import { Edit, Camera, Plus } from 'lucide-react';

const CollegeProfile = ({ profile }) => {
  return (
    <div className="card">
      <div className="flex items-start space-x-6">
        <div className="relative">
          <img
            src={profile.logo}
            alt={profile.name}
            className="w-24 h-24 rounded-lg object-cover"
          />
          <button className="absolute -bottom-2 -right-2 p-2 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors">
            <Camera size={16} />
          </button>
        </div>
        
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
              <p className="text-gray-600 mt-1">{profile.bio}</p>
              
              <div className="flex items-center space-x-6 mt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{profile.followers.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{profile.following}</p>
                  <p className="text-sm text-gray-500">Following</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{profile.posts}</p>
                  <p className="text-sm text-gray-500">Posts</p>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button className="btn-secondary flex items-center space-x-2">
                <Edit size={16} />
                <span>Edit Bio</span>
              </button>
              <button className="btn-primary flex items-center space-x-2">
                <Plus size={16} />
                <span>Add Story</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollegeProfile;
