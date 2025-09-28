import React, { useState } from 'react';
import { Heart, MessageCircle, Share, MoreVertical, Pin, Filter } from 'lucide-react';
import { studentDemoData } from '../../data/studentDemoData';

const SocialFeed = () => {
  const [activeFilter, setActiveFilter] = useState('All');
  const [likedPosts, setLikedPosts] = useState(new Set());

  const filters = ['All', 'Department', 'Club', 'Intercollege', 'Public', 'Private'];

  const handleLike = (postId) => {
    setLikedPosts(prev => {
      const newLiked = new Set(prev);
      if (newLiked.has(postId)) {
        newLiked.delete(postId);
      } else {
        newLiked.add(postId);
      }
      return newLiked;
    });
  };

  const filteredPosts = studentDemoData.socialFeed.filter(post => {
    if (activeFilter === 'All') return true;
    // Add more sophisticated filtering logic here
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Social Feed</h1>
        <p className="text-gray-600">Stay updated with campus news and activities</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter size={16} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter by:</span>
          </div>
          <div className="flex space-x-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  activeFilter === filter
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pinned Posts */}
      {filteredPosts.filter(post => post.isPinned).length > 0 && (
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <Pin size={16} className="text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-900">Pinned Posts</h3>
          </div>
          <div className="space-y-4">
            {filteredPosts.filter(post => post.isPinned).map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isLiked={likedPosts.has(post.id)}
                onLike={() => handleLike(post.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular Posts */}
      <div className="space-y-4">
        {filteredPosts.filter(post => !post.isPinned).map((post) => (
          <PostCard
            key={post.id}
            post={post}
            isLiked={likedPosts.has(post.id)}
            onLike={() => handleLike(post.id)}
          />
        ))}
      </div>

      {/* Load More */}
      <div className="text-center">
        <button 
          onClick={() => console.log('Load more posts')}
          className="btn-secondary"
        >
          Load More Posts
        </button>
      </div>
    </div>
  );
};

const PostCard = ({ post, isLiked, onLike }) => {
  return (
    <div className="card hover:shadow-md transition-shadow">
      {/* Post Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-primary-600">A</span>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{post.author}</h4>
            <p className="text-sm text-gray-500">{post.authorType} • {post.timestamp}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {post.isPinned && (
            <Pin size={16} className="text-yellow-500" />
          )}
          <button className="p-1 text-gray-400 hover:text-gray-600">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* Post Content */}
      <div className="mb-4">
        <p className="text-gray-900 mb-3">{post.content}</p>
        {post.media && (
          <div className="rounded-lg overflow-hidden">
            <img
              src={post.media}
              alt="Post media"
              className="w-full h-64 object-cover"
            />
          </div>
        )}
      </div>

      {/* Post Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-6">
          <button
            onClick={onLike}
            className={`flex items-center space-x-2 transition-colors ${
              isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
            }`}
          >
            <Heart size={20} className={isLiked ? 'fill-current' : ''} />
            <span className="text-sm font-medium">{post.likes + (isLiked ? 1 : 0)}</span>
          </button>
          <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors">
            <MessageCircle size={20} />
            <span className="text-sm font-medium">{post.comments}</span>
          </button>
          <button className="flex items-center space-x-2 text-gray-500 hover:text-green-500 transition-colors">
            <Share size={20} />
            <span className="text-sm font-medium">{post.shares}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SocialFeed;
