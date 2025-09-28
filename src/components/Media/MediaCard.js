import React from 'react';
import { Heart, Eye, MessageCircle, MoreVertical, Trash2, Download } from 'lucide-react';

const MediaCard = ({ media, onDelete, onView }) => {
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex space-x-4">
        {/* College Info */}
        <div className="flex-shrink-0">
          <div className="flex items-center space-x-3">
            <img
              src={media.collegeLogo}
              alt={media.college}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <h4 className="font-medium text-gray-900">{media.college}</h4>
              <p className="text-sm text-gray-500">{media.department}</p>
            </div>
          </div>
        </div>

        {/* Media Content */}
        <div className="flex-1">
          <div className="mb-3">
            <h3 className="font-semibold text-gray-900 mb-1">{media.title}</h3>
            <p className="text-gray-600 text-sm">{media.caption}</p>
          </div>

          {/* Media Display */}
          <div className="relative rounded-lg overflow-hidden bg-gray-100 mb-3">
            {media.type === 'reel' ? (
              <video
                src={media.video}
                className="w-full h-64 object-cover"
                controls
              />
            ) : (
              <img
                src={media.image}
                alt={media.title}
                className="w-full h-64 object-cover"
              />
            )}
          </div>

          {/* Engagement Stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Heart size={16} />
                <span>{media.likes}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Eye size={16} />
                <span>{media.views}</span>
              </div>
              <div className="flex items-center space-x-1">
                <MessageCircle size={16} />
                <span>{media.comments}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">{media.date}</span>
              <button
                onClick={() => onView(media)}
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="View Details"
              >
                <Eye size={16} />
              </button>
              <button
                onClick={() => onDelete(media)}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="Delete Media"
              >
                <Trash2 size={16} />
              </button>
              <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <MoreVertical size={16} />
              </button>
            </div>
          </div>

          {/* Event Association */}
          {media.event && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                {media.event}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaCard;
