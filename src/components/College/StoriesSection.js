import React from 'react';
import { Plus, Eye, Trash2 } from 'lucide-react';

const StoriesSection = ({ stories }) => {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Stories</h3>
        <button className="btn-primary flex items-center space-x-2">
          <Plus size={16} />
          <span>Add Story</span>
        </button>
      </div>
      
      <div className="flex space-x-4 overflow-x-auto pb-2">
        {stories.map((story) => (
          <div key={story.id} className="flex-shrink-0 relative group">
            <img
              src={story.image}
              alt={`Story ${story.id}`}
              className="w-20 h-28 rounded-lg object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-lg transition-all duration-200 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 flex space-x-2">
                <button className="p-1 bg-white bg-opacity-20 rounded-full text-white hover:bg-opacity-30">
                  <Eye size={14} />
                </button>
                <button className="p-1 bg-white bg-opacity-20 rounded-full text-white hover:bg-opacity-30">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">{story.date}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StoriesSection;
