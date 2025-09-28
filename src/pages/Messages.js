import React, { useState } from 'react';
import ChatSidebar from '../components/Messages/ChatSidebar';
import ChatWindow from '../components/Messages/ChatWindow';
import { demoData } from '../data/demoData';

const Messages = () => {
  const [selectedChat, setSelectedChat] = useState(null);

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-600">Communicate with teachers, students, and other admins</p>
      </div>

      {/* Chat Interface */}
      <div className="card p-0 overflow-hidden">
        <div className="flex h-96">
          <ChatSidebar
            messages={demoData.messages}
            selectedChat={selectedChat}
            onSelectChat={handleSelectChat}
          />
          <ChatWindow selectedChat={selectedChat} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Start New Chat</h3>
          <p className="text-gray-600 mb-4">Begin a conversation with faculty or students</p>
          <button className="btn-primary">New Chat</button>
        </div>
        
        <div className="card text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Group Messages</h3>
          <p className="text-gray-600 mb-4">Send announcements to multiple recipients</p>
          <button className="btn-secondary">Create Group</button>
        </div>
        
        <div className="card text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Broadcast</h3>
          <p className="text-gray-600 mb-4">Send important updates to all users</p>
          <button className="btn-secondary">Send Broadcast</button>
        </div>
      </div>
    </div>
  );
};

export default Messages;
