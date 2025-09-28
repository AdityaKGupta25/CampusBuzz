# CampusBuzz - Complete Campus Ecosystem

A comprehensive campus management platform with three specialized portals for administrators, faculty, and students. Built with React and Tailwind CSS.

## 🎯 Three Portal System

### 🛡️ Admin Portal
Complete campus management system with analytics, event management, and media control.

**Key Features:**
- **Dashboard**: KPI cards, analytics charts, recent activity feed, quick actions
- **Events Management**: Create, edit, manage events with advanced filtering
- **College Page**: Profile management, stories, media grid with engagement metrics
- **Media Management**: Global media feed with search, filtering, and analytics
- **Analytics**: Comprehensive insights, department-wise analysis, exportable reports
- **Messages**: Chat interface, group messaging, broadcast functionality
- **Settings**: Profile, security, notifications, theme, data export

### 🎓 Faculty Portal
Event creation, student management, and academic coordination tools.

**Key Features:**
- **Dashboard**: Faculty-specific KPIs, upcoming events timeline, quick actions
- **Event Section**: 
  - Create Event: Step-by-step event creation with role assignment
  - Manage Events: View, edit, and track all faculty events
- **Student Directory**: Search, filter, and manage student roles and assignments
- **Clubs/Fests**: Create and manage student clubs and festival activities
- **Analytics & Reports**: Event participation trends, student performance metrics
- **Media Management**: Upload and manage event resources and media
- **Notifications**: Faculty-specific alerts and updates

### 👥 Student Portal
Social engagement, event discovery, and coordinator features.

**Key Features:**
- **Dashboard**: Personal analytics, achievements, upcoming events, coordinator tasks
- **Social Feed**: Campus updates, admin posts, likes, comments, shares
- **Discover Events**: Event search, filtering, registration, detailed event info
- **Student Coordinator**: Manage assigned events, edit details, submit for approval
- **Analytics**: Personal participation trends, performance metrics, achievements
- **Messages**: Event-specific group chats, notifications
- **Profile/Settings**: Personal info, preferences, AI portfolio building

## Tech Stack

- **Frontend**: React 18
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Routing**: React Router DOM

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) to view the portal selection page.

4. Choose your portal:
   - **Admin Portal**: `/admin` - Complete campus management
   - **Faculty Portal**: `/faculty` - Event creation and student management
   - **Student Portal**: `/student` - Social engagement and event discovery

## Project Structure

```
src/
├── components/
│   ├── Layout/                    # Admin Portal Layout
│   │   ├── Layout.js
│   │   ├── Sidebar.js
│   │   └── Header.js
│   ├── Faculty/                   # Faculty Portal Components
│   │   ├── FacultySidebar.js
│   │   └── FacultyLayout.js
│   ├── Student/                   # Student Portal Components
│   │   ├── StudentSidebar.js
│   │   └── StudentLayout.js
│   ├── Dashboard/                 # Shared Dashboard Components
│   │   ├── KPICard.js
│   │   ├── AnalyticsChart.js
│   │   ├── RecentActivity.js
│   │   ├── QuickActions.js
│   │   └── UpcomingEvents.js
│   ├── Events/                    # Event Management Components
│   │   ├── EventCard.js
│   │   └── EventFilters.js
│   ├── College/                   # College Page Components
│   │   ├── CollegeProfile.js
│   │   ├── StoriesSection.js
│   │   └── MediaGrid.js
│   ├── Media/                     # Media Management Components
│   │   ├── MediaCard.js
│   │   └── MediaFilters.js
│   ├── Analytics/                 # Analytics Components
│   │   └── AnalyticsCard.js
│   └── Messages/                  # Messaging Components
│       ├── ChatSidebar.js
│       └── ChatWindow.js
├── pages/
│   ├── PortalSelection.js         # Portal Selection Page
│   ├── Dashboard.js               # Admin Dashboard
│   ├── Events.js                  # Admin Events
│   ├── College.js                 # Admin College Page
│   ├── Media.js                   # Admin Media
│   ├── Analytics.js               # Admin Analytics
│   ├── Messages.js                # Admin Messages
│   ├── Settings.js                # Admin Settings
│   ├── Faculty/                   # Faculty Portal Pages
│   │   ├── FacultyDashboard.js
│   │   ├── CreateEvent.js
│   │   ├── ManageEvents.js
│   │   ├── StudentDirectory.js
│   │   └── ClubsFests.js
│   └── Student/                   # Student Portal Pages
│       ├── StudentDashboard.js
│       ├── SocialFeed.js
│       ├── EventDiscovery.js
│       └── StudentCoordinator.js
├── data/
│   ├── demoData.js               # Admin Demo Data
│   ├── facultyDemoData.js        # Faculty Demo Data
│   └── studentDemoData.js        # Student Demo Data
├── App.js
├── index.js
└── index.css
```

## Demo Data

The application includes comprehensive demo data for all modules:
- Sample events with different categories and statuses
- Mock media content (posts and reels)
- Analytics data with charts and metrics
- User profiles and messages
- College information and stories

## Key Features

### Responsive Design
- Mobile-first approach
- Collapsible sidebar navigation
- Responsive grid layouts
- Touch-friendly interactions

### Interactive Components
- Hover effects and transitions
- Modal dialogs and dropdowns
- Real-time search and filtering
- Dynamic chart updates

### Accessibility
- Keyboard navigation support
- Screen reader friendly
- High contrast color schemes
- Focus indicators

## Customization

### Colors
The color scheme can be customized in `tailwind.config.js`:
- Primary: Blue (#4B6CB7)
- Secondary: Dark Blue (#182848)
- Accent: Gold (#FFD700)

### Components
All components are modular and can be easily customized or extended.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is licensed under the MIT License.
