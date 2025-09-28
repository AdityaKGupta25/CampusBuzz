import React from 'react';
import { Heart, Eye, MessageCircle, MoreVertical, Trash2, Eye as ViewIcon } from 'lucide-react';

const MediaGrid = ({ media, title }) => {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex space-x-2">
          <select className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option>All</option>
            <option>Posts</option>
            <option>Reels</option>
          </select>
          <select className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option>Recent</option>
            <option>Popular</option>
            <option>Oldest</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {media.map((item) => (
          <div key={item.id} className="relative group">
            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
              {item.type === 'reel' ? (
                <video
                  src={item.video}
                  className="w-full h-full object-cover"
                  controls
                />
              ) : (
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 flex space-x-2">
                <button className="p-2 bg-white bg-opacity-20 rounded-full text-white hover:bg-opacity-30">
                  <ViewIcon size={16} />
                </button>
                <button className="p-2 bg-white bg-opacity-20 rounded-full text-white hover:bg-opacity-30">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="mt-2">
              <h4 className="font-medium text-gray-900 truncate">{item.title}</h4>
              <p className="text-sm text-gray-600 line-clamp-2">{item.caption}</p>
              
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Heart size={14} />
                    <span>{item.likes}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Eye size={14} />
                    <span>{item.views}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageCircle size={14} />
                    <span>{item.comments}</span>
                  </div>
                </div>
                <button className="p-1 text-gray-400 hover:text-gray-600">
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-center">
        <button className="text-primary-500 hover:text-primary-600 font-medium">
          Load More
        </button>
      </div>
    </div>
  );
};

export default MediaGrid;
