import React, { useState } from 'react';
import { Calendar, Users, Edit, Eye, Send, CheckCircle, Clock } from 'lucide-react';
import { studentDemoData } from '../../data/studentDemoData';

const StudentCoordinator = () => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const coordinatorEvents = studentDemoData.coordinatorEvents;

  const handleEditEvent = (event) => {
    setSelectedEvent(event);
    setShowEditModal(true);
  };

  const handleSubmitEvent = (event) => {
    console.log('Submit event for approval:', event);
    // Implement submission logic
  };

  const handleViewParticipants = (event) => {
    console.log('View participants for:', event);
    // Implement participants view
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Student Coordinator</h1>
        <p className="text-gray-600">Manage events assigned to you by faculty</p>
      </div>

      {/* Coordinator Events */}
      <div className="space-y-4">
        {coordinatorEvents.map((event) => (
          <div key={event.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Calendar size={20} className="text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                    <p className="text-sm text-gray-600">{event.description}</p>
                    <p className="text-xs text-gray-500">
                      Assigned by {event.assignedBy} on {new Date(event.assignedDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Date & Time</p>
                    <p className="font-medium text-gray-900">
                      {new Date(event.date).toLocaleDateString()} at {event.time}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Venue</p>
                    <p className="font-medium text-gray-900">{event.venue}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Participants</p>
                    <p className="font-medium text-gray-900">{event.participants}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      event.status === 'approved' ? 'bg-green-100 text-green-800' :
                      event.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {event.status === 'approved' && <CheckCircle size={12} className="mr-1" />}
                      {event.status === 'draft' && <Clock size={12} className="mr-1" />}
                      {event.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewParticipants(event)}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <Users size={16} />
                    <span>View Participants</span>
                  </button>
                  <button
                    onClick={() => handleEditEvent(event)}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <Edit size={16} />
                    <span>Edit Event</span>
                  </button>
                  {event.status === 'draft' && (
                    <button
                      onClick={() => handleSubmitEvent(event)}
                      className="btn-primary flex items-center space-x-2"
                    >
                      <Send size={16} />
                      <span>Submit for Approval</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Event Modal */}
      {showEditModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Edit Event</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                  <input
                    type="text"
                    defaultValue={selectedEvent.title}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    defaultValue={selectedEvent.description}
                    className="input-field"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      defaultValue={selectedEvent.date}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input
                      type="time"
                      defaultValue={selectedEvent.time}
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                  <input
                    type="text"
                    defaultValue={selectedEvent.venue}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Participants</label>
                  <input
                    type="number"
                    defaultValue={selectedEvent.participants}
                    className="input-field"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Save event changes');
                      setShowEditModal(false);
                    }}
                    className="btn-primary"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {coordinatorEvents.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Users size={48} className="mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No assigned events</h3>
          <p className="text-gray-500 mb-4">You haven't been assigned any events yet. Check back later or contact your faculty.</p>
        </div>
      )}
    </div>
  );
};

export default StudentCoordinator;
