// Demo data for Faculty Portal

export const facultyDemoData = {
  // Faculty Dashboard KPIs
  facultyKPIs: [
    {
      id: 1,
      title: "Upcoming Events",
      value: "8",
      icon: "📅",
      color: "blue",
      change: "+2",
      changeType: "positive"
    },
    {
      id: 2,
      title: "Pending Approvals",
      value: "3",
      icon: "⏳",
      color: "orange",
      change: "-1",
      changeType: "positive"
    },
    {
      id: 3,
      title: "Students Assigned",
      value: "45",
      icon: "👥",
      color: "green",
      change: "+5",
      changeType: "positive"
    },
    {
      id: 4,
      title: "Notifications",
      value: "12",
      icon: "🔔",
      color: "purple",
      change: "+3",
      changeType: "positive"
    }
  ],

  // Faculty Events
  facultyEvents: [
    {
      id: 1,
      title: "Tech Fest 2025",
      date: "2024-02-15",
      time: "09:00 AM",
      status: "draft",
      category: "Technical",
      participants: 150,
      description: "Annual technology festival showcasing innovation and creativity",
      venue: "Main Auditorium",
      createdBy: "Prof. Sharma",
      assignedStudents: ["John Doe", "Jane Smith", "Mike Johnson"]
    },
    {
      id: 2,
      title: "Cultural Night",
      date: "2024-02-20",
      time: "07:00 PM",
      status: "approved",
      category: "Cultural",
      participants: 200,
      description: "An evening of music, dance, and cultural performances",
      venue: "Open Air Theater",
      createdBy: "Prof. Sharma",
      assignedStudents: ["Alice Brown", "Bob Wilson"]
    },
    {
      id: 3,
      title: "Workshop: AI & ML",
      date: "2024-02-25",
      time: "10:00 AM",
      status: "live",
      category: "Workshop",
      participants: 80,
      description: "Hands-on workshop on Artificial Intelligence and Machine Learning",
      venue: "Computer Lab",
      createdBy: "Prof. Sharma",
      assignedStudents: ["Charlie Davis", "Diana Lee", "Eve Taylor"]
    }
  ],

  // Student Directory
  students: [
    {
      id: 1,
      name: "John Doe",
      rollNo: "CS2024001",
      email: "john.doe@college.edu",
      department: "Computer Science",
      year: "3rd Year",
      role: "Event Host",
      phone: "+1-555-0101",
      avatar: "https://via.placeholder.com/40x40/4B6CB7/FFFFFF?text=JD",
      achievements: ["Tech Fest Winner 2023", "Hackathon Runner-up"],
      eventsParticipated: 12,
      eventsCoordinated: 3
    },
    {
      id: 2,
      name: "Jane Smith",
      rollNo: "CS2024002",
      email: "jane.smith@college.edu",
      department: "Computer Science",
      year: "2nd Year",
      role: "Co-host",
      phone: "+1-555-0102",
      avatar: "https://via.placeholder.com/40x40/10B981/FFFFFF?text=JS",
      achievements: ["Cultural Night Best Performer", "Debate Competition Winner"],
      eventsParticipated: 8,
      eventsCoordinated: 2
    },
    {
      id: 3,
      name: "Mike Johnson",
      rollNo: "CS2024003",
      email: "mike.johnson@college.edu",
      department: "Computer Science",
      year: "4th Year",
      role: "Coordinator",
      phone: "+1-555-0103",
      avatar: "https://via.placeholder.com/40x40/8B5CF6/FFFFFF?text=MJ",
      achievements: ["Sports Championship Winner", "Tech Innovation Award"],
      eventsParticipated: 15,
      eventsCoordinated: 5
    }
  ],

  // Clubs and Fests
  clubs: [
    {
      id: 1,
      name: "Tech Club",
      description: "Technology enthusiasts and innovators",
      category: "Technical",
      president: "Alice Brown",
      members: 45,
      status: "active",
      events: 8,
      subClubs: ["AI/ML", "Web Development", "Mobile Apps"]
    },
    {
      id: 2,
      name: "Cultural Society",
      description: "Promoting arts and cultural activities",
      category: "Cultural",
      president: "Bob Wilson",
      members: 60,
      status: "active",
      events: 12,
      subClubs: ["Dance", "Music", "Drama", "Photography"]
    },
    {
      id: 3,
      name: "Sports Club",
      description: "Athletic activities and competitions",
      category: "Sports",
      president: "Charlie Davis",
      members: 35,
      status: "active",
      events: 6,
      subClubs: ["Football", "Basketball", "Cricket", "Athletics"]
    }
  ],

  // Faculty Notifications
  facultyNotifications: [
    {
      id: 1,
      type: "event",
      title: "Event Approval Required",
      message: "Tech Workshop proposal needs your review",
      timestamp: "2 hours ago",
      read: false,
      priority: "high"
    },
    {
      id: 2,
      type: "student",
      title: "Student Role Assignment",
      message: "John Doe has been assigned as Event Host",
      timestamp: "4 hours ago",
      read: false,
      priority: "medium"
    },
    {
      id: 3,
      type: "club",
      title: "Club Meeting Scheduled",
      message: "Tech Club meeting tomorrow at 3 PM",
      timestamp: "1 day ago",
      read: true,
      priority: "low"
    }
  ],

  // Faculty Analytics
  facultyAnalytics: {
    eventParticipation: [
      { month: "Jan", participants: 120 },
      { month: "Feb", participants: 150 },
      { month: "Mar", participants: 180 },
      { month: "Apr", participants: 160 },
      { month: "May", participants: 200 },
      { month: "Jun", participants: 220 }
    ],
    eventTypeBreakdown: [
      { name: "Technical", value: 40, color: "#4B6CB7" },
      { name: "Cultural", value: 30, color: "#FFD700" },
      { name: "Workshop", value: 20, color: "#10B981" },
      { name: "Sports", value: 10, color: "#8B5CF6" }
    ],
    topStudents: [
      { name: "John Doe", events: 12, score: 95 },
      { name: "Mike Johnson", events: 15, score: 92 },
      { name: "Jane Smith", events: 8, score: 88 },
      { name: "Alice Brown", events: 10, score: 85 }
    ]
  }
};
