import React, { useState } from 'react';
import { ArrowLeft, Save, Send } from 'lucide-react';

const CreateEvent = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    category: '',
    mode: 'offline',
    venue: '',
    eligibility: '',
    participationType: 'individual',
    teamSize: { min: 1, max: 1 },
    registrationStart: '',
    registrationEnd: '',
    eventStart: '',
    eventEnd: '',
    contacts: [{ name: '', email: '', phone: '', hide: false }],
    detailedDescription: '',
    rounds: [],
    prizes: [],
    visibility: 'public'
  });

  const steps = [
    { id: 1, name: 'Event Info', description: 'Basic event details' },
    { id: 2, name: 'Assign Roles', description: 'Faculty and student assignments' },
    { id: 3, name: 'Template Setup', description: 'Event template configuration' },
    { id: 4, name: 'Approval & Publish', description: 'Review and publish event' }
  ];

  const categories = [
    'Cultural', 'Technical', 'Sports', 'Workshop', 'Seminars', 
    'Guest Lecture', 'Festivals', 'Research', 'Others'
  ];

  const handleInputChange = (field, value) => {
    setEventData(prev => ({ ...prev, [field]: value }));
  };

  const handleContactChange = (index, field, value) => {
    const newContacts = [...eventData.contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setEventData(prev => ({ ...prev, contacts: newContacts }));
  };

  const addContact = () => {
    setEventData(prev => ({
      ...prev,
      contacts: [...prev.contacts, { name: '', email: '', phone: '', hide: false }]
    }));
  };

  const removeContact = (index) => {
    if (eventData.contacts.length > 1) {
      const newContacts = eventData.contacts.filter((_, i) => i !== index);
      setEventData(prev => ({ ...prev, contacts: newContacts }));
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Event Title *</label>
        <input
          type="text"
          value={eventData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          className="input-field"
          placeholder="Enter event title"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Short Description *</label>
        <textarea
          value={eventData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          className="input-field"
          rows={3}
          placeholder="Brief description of the event"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
        <select
          value={eventData.category}
          onChange={(e) => handleInputChange('category', e.target.value)}
          className="input-field"
        >
          <option value="">Select category</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mode *</label>
        <div className="flex space-x-4">
          {['Online', 'Offline', 'Hybrid'].map(mode => (
            <label key={mode} className="flex items-center">
              <input
                type="radio"
                name="mode"
                value={mode.toLowerCase()}
                checked={eventData.mode === mode.toLowerCase()}
                onChange={(e) => handleInputChange('mode', e.target.value)}
                className="mr-2"
              />
              {mode}
            </label>
          ))}
        </div>
      </div>

      {(eventData.mode === 'offline' || eventData.mode === 'hybrid') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Venue *</label>
          <input
            type="text"
            value={eventData.venue}
            onChange={(e) => handleInputChange('venue', e.target.value)}
            className="input-field"
            placeholder="Enter venue details"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Eligibility</label>
        <input
          type="text"
          value={eventData.eligibility}
          onChange={(e) => handleInputChange('eligibility', e.target.value)}
          className="input-field"
          placeholder="Who can participate?"
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Faculty Co-hosts</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              className="flex-1 input-field"
              placeholder="Search faculty members..."
            />
            <button className="btn-secondary">Add Faculty</button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span>Prof. Sharma (You)</span>
              <span className="text-sm text-gray-500">Event Creator</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Assignment</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Participation Type</label>
            <div className="flex space-x-4">
              {['Individual', 'Team'].map(type => (
                <label key={type} className="flex items-center">
                  <input
                    type="radio"
                    name="participationType"
                    value={type.toLowerCase()}
                    checked={eventData.participationType === type.toLowerCase()}
                    onChange={(e) => handleInputChange('participationType', e.target.value)}
                    className="mr-2"
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>

          {eventData.participationType === 'team' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Team Size</label>
                <input
                  type="number"
                  value={eventData.teamSize.min}
                  onChange={(e) => handleInputChange('teamSize', { ...eventData.teamSize, min: parseInt(e.target.value) })}
                  className="input-field"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Team Size</label>
                <input
                  type="number"
                  value={eventData.teamSize.max}
                  onChange={(e) => handleInputChange('teamSize', { ...eventData.teamSize, max: parseInt(e.target.value) })}
                  className="input-field"
                  min="1"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assign Student Roles</label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  className="flex-1 input-field"
                  placeholder="Search students..."
                />
                <button className="btn-secondary">Add Student</button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span>John Doe</span>
                  <select className="px-3 py-1 border border-gray-300 rounded-lg text-sm">
                    <option>Host</option>
                    <option>Co-host</option>
                    <option>Coordinator</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Banner</h3>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <div className="text-gray-400 mb-2">
              <Calendar size={48} className="mx-auto" />
            </div>
            <p className="text-gray-600 mb-4">Upload event banner or choose a template</p>
            <div className="flex justify-center space-x-4">
              <button className="btn-secondary">Choose Template</button>
              <button className="btn-primary">Upload Custom</button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Important Dates</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Registration Start</label>
            <input
              type="datetime-local"
              value={eventData.registrationStart}
              onChange={(e) => handleInputChange('registrationStart', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Registration End</label>
            <input
              type="datetime-local"
              value={eventData.registrationEnd}
              onChange={(e) => handleInputChange('registrationEnd', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Start</label>
            <input
              type="datetime-local"
              value={eventData.eventStart}
              onChange={(e) => handleInputChange('eventStart', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event End</label>
            <input
              type="datetime-local"
              value={eventData.eventEnd}
              onChange={(e) => handleInputChange('eventEnd', e.target.value)}
              className="input-field"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Important Contacts</h3>
        <div className="space-y-3">
          {eventData.contacts.map((contact, index) => (
            <div key={index} className="grid grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={contact.name}
                  onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                  className="input-field"
                  placeholder="Contact name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={contact.email}
                  onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                  className="input-field"
                  placeholder="contact@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={contact.phone}
                  onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                  className="input-field"
                  placeholder="+1-555-0123"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={contact.hide}
                    onChange={(e) => handleContactChange(index, 'hide', e.target.checked)}
                    className="mr-2"
                  />
                  Hide
                </label>
                {eventData.contacts.length > 1 && (
                  <button
                    onClick={() => removeContact(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
          <button onClick={addContact} className="btn-secondary">
            Add Contact
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Description</label>
        <textarea
          value={eventData.detailedDescription}
          onChange={(e) => handleInputChange('detailedDescription', e.target.value)}
          className="input-field"
          rows={6}
          placeholder="Detailed event description, rules, format, etc."
        />
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Preview</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-xl font-bold text-gray-900">{eventData.title || 'Event Title'}</h4>
            <p className="text-gray-600">{eventData.description || 'Event description'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Category:</span>
              <span className="ml-2 text-gray-600">{eventData.category || 'Not specified'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Mode:</span>
              <span className="ml-2 text-gray-600 capitalize">{eventData.mode || 'Not specified'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Venue:</span>
              <span className="ml-2 text-gray-600">{eventData.venue || 'Not specified'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Participation:</span>
              <span className="ml-2 text-gray-600 capitalize">{eventData.participationType || 'Not specified'}</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Publishing Options</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
            <div className="flex space-x-4">
              {['Public (all colleges)', 'Private (only home college)'].map(option => (
                <label key={option} className="flex items-center">
                  <input
                    type="radio"
                    name="visibility"
                    value={option.toLowerCase()}
                    checked={eventData.visibility === option.toLowerCase()}
                    onChange={(e) => handleInputChange('visibility', e.target.value)}
                    className="mr-2"
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">Publishing Flow</h4>
            <p className="text-sm text-yellow-700">
              Faculty filled → Submit → Live immediately<br />
              Student Host filled → Save Draft → Faculty Review → Approve / Feedback → Submit → Live
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return renderStep1();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => window.history.back()}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Event</h1>
          <p className="text-gray-600">Set up your event step by step</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                currentStep >= step.id 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step.id}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  currentStep >= step.id ? 'text-primary-600' : 'text-gray-500'
                }`}>
                  {step.name}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-4 ${
                  currentStep > step.id ? 'bg-primary-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="card">
        {renderCurrentStep()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        
        <div className="flex space-x-2">
          <button 
            onClick={() => console.log('Save draft')}
            className="btn-secondary flex items-center space-x-2"
          >
            <Save size={16} />
            <span>Save Draft</span>
          </button>
          {currentStep === 4 ? (
            <button 
              onClick={() => console.log('Submit event')}
              className="btn-primary flex items-center space-x-2"
            >
              <Send size={16} />
              <span>Submit Event</span>
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
              className="btn-primary"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateEvent;
