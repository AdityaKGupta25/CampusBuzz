import React, { useState } from 'react';
import { Search, Plus, Users, Calendar, Settings, Eye, Edit, Trash2 } from 'lucide-react';
import { facultyDemoData } from '../../data/facultyDemoData';

const ClubsFests = () => {
  const [activeTab, setActiveTab] = useState('clubs');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClub, setSelectedClub] = useState(null);

  const clubs = facultyDemoData.clubs;

  const filteredClubs = clubs.filter(club =>
    club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    club.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateClub = () => {
    console.log('Create new club');
    // Implement create club modal
  };

  const handleViewClub = (club) => {
    setSelectedClub(club);
  };

  const handleEditClub = (club) => {
    console.log('Edit club:', club);
    // Implement edit club logic
  };

  const handleDeleteClub = (club) => {
    console.log('Delete club:', club);
    // Implement delete confirmation
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clubs / Fests</h1>
          <p className="text-gray-600">Manage student clubs and festival activities</p>
        </div>
        <button
          onClick={() => console.log('Create new club')}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Create Club</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('clubs')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'clubs'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Clubs
          </button>
          <button
            onClick={() => setActiveTab('fests')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'fests'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Fests
          </button>
        </nav>
      </div>

      {/* Search */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search clubs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Clubs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClubs.map((club) => (
          <div key={club.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{club.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{club.description}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Users size={14} />
                    <span>{club.members} members</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar size={14} />
                    <span>{club.events} events</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleViewClub(club)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="View Details"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => handleEditClub(club)}
                  className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                  title="Edit Club"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDeleteClub(club)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete Club"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">President</p>
                <p className="text-sm text-gray-900">{club.president}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Sub-clubs</p>
                <div className="flex flex-wrap gap-1">
                  {club.subClubs.map((subClub, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                    >
                      {subClub}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  club.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {club.status}
                </span>
                <button
                  onClick={() => handleViewClub(club)}
                  className="text-sm text-primary-500 hover:text-primary-600 font-medium"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Club Details Modal */}
      {selectedClub && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">{selectedClub.name}</h3>
                <button
                  onClick={() => setSelectedClub(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600">{selectedClub.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">President</h4>
                    <p className="text-gray-600">{selectedClub.president}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Category</h4>
                    <p className="text-gray-600">{selectedClub.category}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Members</h4>
                    <p className="text-gray-600">{selectedClub.members}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Events</h4>
                    <p className="text-gray-600">{selectedClub.events}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Sub-clubs</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedClub.subClubs.map((subClub, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-primary-100 text-primary-800 text-sm rounded-full"
                      >
                        {subClub}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setSelectedClub(null)}
                    className="btn-secondary"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleEditClub(selectedClub)}
                    className="btn-primary"
                  >
                    Edit Club
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredClubs.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Users size={48} className="mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No clubs found</h3>
          <p className="text-gray-500 mb-4">Try adjusting your search or create a new club</p>
          <button className="btn-primary" onClick={handleCreateClub}>
            Create Club
          </button>
        </div>
      )}
    </div>
  );
};

export default ClubsFests;
