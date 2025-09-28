import React from 'react';
import { Search, Plus } from 'lucide-react';

const ChatSidebar = ({ messages, selectedChat, onSelectChat }) => {
  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <Plus size={20} />
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex space-x-2">
          <button className="px-3 py-1 text-xs font-medium text-primary-600 bg-primary-100 rounded-full">
            All
          </button>
          <button className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100">
            Teachers
          </button>
          <button className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100">
            Students
          </button>
          <button className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100">
            Groups
          </button>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {messages.map((message) => (
          <div
            key={message.id}
            onClick={() => onSelectChat(message)}
            className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
              selectedChat?.id === message.id ? 'bg-primary-50 border-l-4 border-l-primary-500' : ''
            }`}
          >
            <div className="flex items-start space-x-3">
              <img
                src={message.avatar}
                alt={message.sender}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 truncate">{message.sender}</h3>
                  <span className="text-xs text-gray-500">{message.timestamp}</span>
                </div>
                <p className="text-sm text-gray-600 truncate mt-1">{message.message}</p>
                {message.unread && (
                  <div className="flex items-center justify-end mt-1">
                    <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatSidebar;
