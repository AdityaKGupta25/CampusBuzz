import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Admin Portal
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import College from './pages/College';
import Media from './pages/Media';
import Analytics from './pages/Analytics';
import Messages from './pages/Messages';
import Settings from './pages/Settings';

// Faculty Portal
import FacultyLayout from './components/Faculty/FacultyLayout';
import FacultyDashboard from './pages/Faculty/FacultyDashboard';
import CreateEvent from './pages/Faculty/CreateEvent';
import ManageEvents from './pages/Faculty/ManageEvents';
import StudentDirectory from './pages/Faculty/StudentDirectory';
import ClubsFests from './pages/Faculty/ClubsFests';

// Student Portal
import StudentLayout from './components/Student/StudentLayout';
import StudentDashboard from './pages/Student/StudentDashboard';
import SocialFeed from './pages/Student/SocialFeed';
import EventDiscovery from './pages/Student/EventDiscovery';
import StudentCoordinator from './pages/Student/StudentCoordinator';

// Portal Selection
import PortalSelection from './pages/PortalSelection';

function App() {
  return (
    <Router>
      <Routes>
        {/* Portal Selection */}
        <Route path="/" element={<PortalSelection />} />
        
        {/* Admin Portal Routes */}
        <Route path="/admin" element={<Layout><Dashboard /></Layout>} />
        <Route path="/admin/events" element={<Layout><Events /></Layout>} />
        <Route path="/admin/college" element={<Layout><College /></Layout>} />
        <Route path="/admin/media" element={<Layout><Media /></Layout>} />
        <Route path="/admin/analytics" element={<Layout><Analytics /></Layout>} />
        <Route path="/admin/messages" element={<Layout><Messages /></Layout>} />
        <Route path="/admin/settings" element={<Layout><Settings /></Layout>} />

        {/* Faculty Portal Routes */}
        <Route path="/faculty" element={<FacultyLayout><FacultyDashboard /></FacultyLayout>} />
        <Route path="/faculty/events" element={<FacultyLayout><ManageEvents /></FacultyLayout>} />
        <Route path="/faculty/events/create" element={<FacultyLayout><CreateEvent /></FacultyLayout>} />
        <Route path="/faculty/events/manage" element={<FacultyLayout><ManageEvents /></FacultyLayout>} />
        <Route path="/faculty/students" element={<FacultyLayout><StudentDirectory /></FacultyLayout>} />
        <Route path="/faculty/clubs" element={<FacultyLayout><ClubsFests /></FacultyLayout>} />
        <Route path="/faculty/analytics" element={<FacultyLayout><Analytics /></FacultyLayout>} />
        <Route path="/faculty/media" element={<FacultyLayout><Media /></FacultyLayout>} />
        <Route path="/faculty/notifications" element={<FacultyLayout><Messages /></FacultyLayout>} />
        <Route path="/faculty/settings" element={<FacultyLayout><Settings /></FacultyLayout>} />

        {/* Student Portal Routes */}
        <Route path="/student" element={<StudentLayout><StudentDashboard /></StudentLayout>} />
        <Route path="/student/feed" element={<StudentLayout><SocialFeed /></StudentLayout>} />
        <Route path="/student/events" element={<StudentLayout><EventDiscovery /></StudentLayout>} />
        <Route path="/student/coordinator" element={<StudentLayout><StudentCoordinator /></StudentLayout>} />
        <Route path="/student/analytics" element={<StudentLayout><Analytics /></StudentLayout>} />
        <Route path="/student/messages" element={<StudentLayout><Messages /></StudentLayout>} />
        <Route path="/student/notifications" element={<StudentLayout><Messages /></StudentLayout>} />
        <Route path="/student/profile" element={<StudentLayout><Settings /></StudentLayout>} />
      </Routes>
    </Router>
  );
}

export default App;
