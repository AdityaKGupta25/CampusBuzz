// Demo data for Student Portal

export const studentDemoData = {
  // Student Profile
  studentProfile: {
    name: "John Doe",
    rollNo: "CS2024001",
    email: "john.doe@college.edu",
    department: "Computer Science",
    year: "3rd Year",
    avatar: "https://via.placeholder.com/80x80/4B6CB7/FFFFFF?text=JD",
    bio: "Passionate about technology and innovation. Love participating in campus events and building amazing projects.",
    achievements: [
      { id: 1, title: "Tech Fest Winner 2023", type: "award", date: "2023-12-15" },
      { id: 2, title: "Hackathon Runner-up", type: "award", date: "2023-10-20" },
      { id: 3, title: "Cultural Night Best Performer", type: "achievement", date: "2023-11-05" }
    ],
    stats: {
      eventsParticipated: 12,
      eventsCoordinated: 3,
      eventsWon: 2,
      totalPoints: 850
    }
  },

  // Social Feed Posts
  socialFeed: [
    {
      id: 1,
      type: "post",
      author: "Admin",
      authorType: "admin",
      content: "🎉 Tech Fest 2025 registration is now open! Don't miss out on this amazing opportunity to showcase your skills and win exciting prizes. Register now!",
      media: "https://via.placeholder.com/600x300/4B6CB7/FFFFFF?text=Tech+Fest+2025",
      likes: 45,
      comments: 12,
      shares: 8,
      timestamp: "2 hours ago",
      isPinned: true
    },
    {
      id: 2,
      type: "post",
      author: "Admin",
      authorType: "admin",
      content: "📸 Check out these amazing moments from yesterday's Cultural Night! The performances were absolutely incredible. Great job everyone! 👏",
      media: "https://via.placeholder.com/600x300/FFD700/000000?text=Cultural+Night+Highlights",
      likes: 38,
      comments: 15,
      shares: 6,
      timestamp: "1 day ago",
      isPinned: false
    },
    {
      id: 3,
      type: "post",
      author: "Admin",
      authorType: "admin",
      content: "🏆 Congratulations to all the winners of the Sports Championship! Your dedication and hard work paid off. Well done! 🎊",
      media: "https://via.placeholder.com/600x300/10B981/FFFFFF?text=Sports+Championship+Winners",
      likes: 52,
      comments: 20,
      shares: 10,
      timestamp: "3 days ago",
      isPinned: false
    }
  ],

  // Events Data
  events: [
    {
      id: 1,
      title: "Tech Fest 2025",
      description: "Annual technology festival showcasing innovation and creativity",
      date: "2024-02-15",
      time: "09:00 AM",
      location: "Main Auditorium",
      category: "Technical",
      status: "upcoming",
      prize: "₹50,000",
      teamSize: "Individual",
      participants: 150,
      registered: 120,
      isRegistered: true,
      poster: "https://via.placeholder.com/300x200/4B6CB7/FFFFFF?text=Tech+Fest+2025",
      organizer: "Computer Science Department",
      requirements: "Open to all students",
      deadline: "2024-02-10"
    },
    {
      id: 2,
      title: "Cultural Night",
      description: "An evening of music, dance, and cultural performances",
      date: "2024-02-20",
      time: "07:00 PM",
      location: "Open Air Theater",
      category: "Cultural",
      status: "upcoming",
      prize: "₹30,000",
      teamSize: "Team (2-5 members)",
      participants: 200,
      registered: 180,
      isRegistered: false,
      poster: "https://via.placeholder.com/300x200/FFD700/000000?text=Cultural+Night",
      organizer: "Cultural Society",
      requirements: "Performance-based event",
      deadline: "2024-02-15"
    },
    {
      id: 3,
      title: "Hackathon 2024",
      description: "48-hour coding competition",
      date: "2024-01-20",
      time: "10:00 AM",
      location: "Computer Lab",
      category: "Technical",
      status: "completed",
      prize: "₹75,000",
      teamSize: "Team (2-4 members)",
      participants: 80,
      registered: 80,
      isRegistered: true,
      poster: "https://via.placeholder.com/300x200/8B5CF6/FFFFFF?text=Hackathon+2024",
      organizer: "Tech Club",
      requirements: "Programming knowledge required",
      deadline: "2024-01-15",
      winner: "Team Alpha",
      result: "Won 2nd Prize"
    }
  ],

  // Student Dashboard Analytics
  dashboardAnalytics: {
    participationTrend: [
      { month: "Jan", events: 2 },
      { month: "Feb", events: 3 },
      { month: "Mar", events: 4 },
      { month: "Apr", events: 2 },
      { month: "May", events: 5 },
      { month: "Jun", events: 3 }
    ],
    categoryBreakdown: [
      { name: "Technical", value: 60, color: "#4B6CB7" },
      { name: "Cultural", value: 25, color: "#FFD700" },
      { name: "Sports", value: 15, color: "#10B981" }
    ],
    performance: {
      totalEvents: 12,
      wins: 2,
      winRate: 16.7,
      averageScore: 85,
      rank: 5
    }
  },

  // Coordinator Events
  coordinatorEvents: [
    {
      id: 1,
      title: "Tech Workshop: AI & ML",
      status: "draft",
      participants: 80,
      assignedBy: "Prof. Sharma",
      assignedDate: "2024-01-15",
      description: "Hands-on workshop on Artificial Intelligence and Machine Learning",
      venue: "Computer Lab",
      date: "2024-02-25",
      time: "10:00 AM"
    },
    {
      id: 2,
      title: "Cultural Night",
      status: "approved",
      participants: 200,
      assignedBy: "Prof. Sharma",
      assignedDate: "2024-01-10",
      description: "An evening of music, dance, and cultural performances",
      venue: "Open Air Theater",
      date: "2024-02-20",
      time: "07:00 PM"
    }
  ],

  // Messages
  messages: [
    {
      id: 1,
      sender: "Prof. Sharma",
      senderType: "teacher",
      message: "Please review the event details for Tech Workshop",
      timestamp: "2 hours ago",
      unread: true,
      avatar: "https://via.placeholder.com/40x40/4B6CB7/FFFFFF?text=PS",
      eventId: 1
    },
    {
      id: 2,
      sender: "Event Team",
      senderType: "admin",
      message: "Cultural Night preparations are going well",
      timestamp: "4 hours ago",
      unread: false,
      avatar: "https://via.placeholder.com/40x40/FFD700/000000?text=ET",
      eventId: 2
    }
  ],

  // Notifications
  notifications: [
    {
      id: 1,
      type: "event",
      title: "Event Registration Open",
      message: "Tech Fest 2025 registration is now open",
      timestamp: "2 hours ago",
      read: false,
      eventId: 1
    },
    {
      id: 2,
      type: "assignment",
      title: "New Coordinator Assignment",
      message: "You have been assigned as coordinator for Cultural Night",
      timestamp: "1 day ago",
      read: false,
      eventId: 2
    },
    {
      id: 3,
      type: "achievement",
      title: "Achievement Unlocked",
      message: "You won 2nd prize in Hackathon 2024!",
      timestamp: "3 days ago",
      read: true,
      eventId: 3
    }
  ]
};
