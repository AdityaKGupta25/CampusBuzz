import React, { useState } from 'react';
import { Send, Paperclip, Smile, MessageSquare } from 'lucide-react';

const ChatWindow = ({ selectedChat }) => {
  const [message, setMessage] = useState('');

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      console.log('Sending message:', message);
      setMessage('');
    }
  };

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <MessageSquare size={48} className="mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
          <p className="text-gray-500">Choose a chat from the sidebar to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <img
            src={selectedChat.avatar}
            alt={selectedChat.sender}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <h3 className="font-medium text-gray-900">{selectedChat.sender}</h3>
            <p className="text-sm text-gray-500">{selectedChat.senderType}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Sample messages */}
        <div className="flex justify-end">
          <div className="bg-primary-500 text-white px-4 py-2 rounded-lg max-w-xs">
            <p className="text-sm">Hello! How can I help you with the event?</p>
            <p className="text-xs opacity-75 mt-1">2:30 PM</p>
          </div>
        </div>
        
        <div className="flex justify-start">
          <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg max-w-xs">
            <p className="text-sm">I need help with the Tech Fest registration process</p>
            <p className="text-xs text-gray-500 mt-1">2:32 PM</p>
          </div>
        </div>
        
        <div className="flex justify-end">
          <div className="bg-primary-500 text-white px-4 py-2 rounded-lg max-w-xs">
            <p className="text-sm">Sure! I can guide you through the registration process. What specific help do you need?</p>
            <p className="text-xs opacity-75 mt-1">2:33 PM</p>
          </div>
        </div>
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <Paperclip size={20} />
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <Smile size={20} />
          </button>
          <button
            type="submit"
            className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
