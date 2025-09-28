// Demo data for CampusBuzz Admin Portal

export const demoData = {
  // Dashboard KPIs
  kpis: [
    {
      id: 1,
      title: "Total Students",
      value: "1,250",
      icon: "👩‍🎓",
      color: "blue",
      change: "+12%",
      changeType: "positive"
    },
    {
      id: 2,
      title: "Total Events",
      value: "148",
      icon: "🎉",
      color: "green",
      change: "+8%",
      changeType: "positive"
    },
    {
      id: 3,
      title: "Total Participation",
      value: "4,523",
      icon: "📈",
      color: "orange",
      change: "+15%",
      changeType: "positive"
    },
    {
      id: 4,
      title: "Total Media Uploaded",
      value: "320",
      icon: "📸",
      color: "purple",
      change: "+22%",
      changeType: "positive"
    }
  ],

  // Recent Activity
  recentActivity: [
    {
      id: 1,
      type: "event",
      message: "Tech Fest 2025 added by Teacher A",
      timestamp: "2 hours ago",
      icon: "🎉"
    },
    {
      id: 2,
      type: "media",
      message: "Annual Day Media uploaded (5 posts)",
      timestamp: "4 hours ago",
      icon: "📸"
    },
    {
      id: 3,
      type: "notification",
      message: "Results announcement sent to Students",
      timestamp: "6 hours ago",
      icon: "🔔"
    },
    {
      id: 4,
      type: "event",
      message: "Cultural Fest registration opened",
      timestamp: "1 day ago",
      icon: "🎭"
    },
    {
      id: 5,
      type: "media",
      message: "Sports Day photos uploaded",
      timestamp: "2 days ago",
      icon: "⚽"
    }
  ],

  // Upcoming Events
  upcomingEvents: [
    {
      id: 1,
      title: "Tech Fest 2025",
      date: "2024-02-15",
      time: "09:00 AM",
      department: "Computer Science",
      participants: 150,
      status: "upcoming",
      poster: "https://via.placeholder.com/300x200/4B6CB7/FFFFFF?text=Tech+Fest+2025",
      description: "Annual technology festival showcasing innovation and creativity"
    },
    {
      id: 2,
      title: "Cultural Night",
      date: "2024-02-20",
      time: "07:00 PM",
      department: "Cultural",
      participants: 200,
      status: "upcoming",
      poster: "https://via.placeholder.com/300x200/FFD700/000000?text=Cultural+Night",
      description: "An evening of music, dance, and cultural performances"
    },
    {
      id: 3,
      title: "Sports Championship",
      date: "2024-02-25",
      time: "08:00 AM",
      department: "Sports",
      participants: 100,
      status: "upcoming",
      poster: "https://via.placeholder.com/300x200/10B981/FFFFFF?text=Sports+Championship",
      description: "Inter-departmental sports competition"
    }
  ],

  // Events Data
  events: [
    {
      id: 1,
      title: "Tech Fest 2025",
      department: "Computer Science",
      date: "2024-02-15",
      time: "09:00 AM",
      category: "Technical",
      status: "upcoming",
      participants: 150,
      registrations: 120,
      poster: "https://via.placeholder.com/300x200/4B6CB7/FFFFFF?text=Tech+Fest+2025",
      description: "Annual technology festival showcasing innovation and creativity",
      venue: "Main Auditorium",
      prize: "₹50,000"
    },
    {
      id: 2,
      title: "Cultural Night",
      department: "Cultural",
      date: "2024-02-20",
      time: "07:00 PM",
      category: "Cultural",
      status: "upcoming",
      participants: 200,
      registrations: 180,
      poster: "https://via.placeholder.com/300x200/FFD700/000000?text=Cultural+Night",
      description: "An evening of music, dance, and cultural performances",
      venue: "Open Air Theater",
      prize: "₹30,000"
    },
    {
      id: 3,
      title: "Sports Championship",
      department: "Sports",
      date: "2024-02-25",
      time: "08:00 AM",
      category: "Sports",
      status: "upcoming",
      participants: 100,
      registrations: 85,
      poster: "https://via.placeholder.com/300x200/10B981/FFFFFF?text=Sports+Championship",
      description: "Inter-departmental sports competition",
      venue: "Sports Complex",
      prize: "₹25,000"
    },
    {
      id: 4,
      title: "Hackathon 2024",
      department: "Computer Science",
      date: "2024-01-20",
      time: "10:00 AM",
      category: "Technical",
      status: "completed",
      participants: 80,
      registrations: 80,
      poster: "https://via.placeholder.com/300x200/8B5CF6/FFFFFF?text=Hackathon+2024",
      description: "48-hour coding competition",
      venue: "Computer Lab",
      prize: "₹75,000",
      winner: "Team Alpha"
    },
    {
      id: 5,
      title: "Dance Competition",
      department: "Cultural",
      date: "2024-01-15",
      time: "06:00 PM",
      category: "Cultural",
      status: "completed",
      participants: 60,
      registrations: 60,
      poster: "https://via.placeholder.com/300x200/EC4899/FFFFFF?text=Dance+Competition",
      description: "Inter-college dance competition",
      venue: "Cultural Hall",
      prize: "₹20,000",
      winner: "Dance Crew X"
    }
  ],

  // Media Data
  media: [
    {
      id: 1,
      type: "post",
      title: "Tech Fest Highlights",
      college: "PIET College",
      collegeLogo: "https://via.placeholder.com/40x40/4B6CB7/FFFFFF?text=ABC",
      caption: "Amazing moments from Tech Fest 2025! 🚀",
      image: "https://via.placeholder.com/400x300/4B6CB7/FFFFFF?text=Tech+Fest+Highlights",
      likes: 245,
      views: 1200,
      comments: 18,
      date: "2024-02-10",
      department: "Computer Science",
      event: "Tech Fest 2025"
    },
    {
      id: 2,
      type: "reel",
      title: "Cultural Night Performance",
      college: "XYZ College",
      collegeLogo: "https://via.placeholder.com/40x40/FFD700/000000?text=XYZ",
      caption: "Stunning dance performance at Cultural Night! 💃",
      video: "https://via.placeholder.com/400x600/FFD700/000000?text=Cultural+Reel",
      likes: 189,
      views: 890,
      comments: 12,
      date: "2024-02-08",
      department: "Cultural",
      event: "Cultural Night"
    },
    {
      id: 3,
      type: "post",
      title: "Sports Day Action",
      college: "DEF College",
      collegeLogo: "https://via.placeholder.com/40x40/10B981/FFFFFF?text=DEF",
      caption: "Intense moments from Sports Championship! ⚽",
      image: "https://via.placeholder.com/400x300/10B981/FFFFFF?text=Sports+Day+Action",
      likes: 156,
      views: 750,
      comments: 8,
      date: "2024-02-05",
      department: "Sports",
      event: "Sports Championship"
    }
  ],

  // Analytics Data
  analytics: {
    participationTrend: [
      { month: "Jan", participants: 1200 },
      { month: "Feb", participants: 1500 },
      { month: "Mar", participants: 1800 },
      { month: "Apr", participants: 1600 },
      { month: "May", participants: 2000 },
      { month: "Jun", participants: 2200 }
    ],
    eventTypeBreakdown: [
      { name: "Technical", value: 35, color: "#4B6CB7" },
      { name: "Cultural", value: 25, color: "#FFD700" },
      { name: "Sports", value: 20, color: "#10B981" },
      { name: "Others", value: 20, color: "#8B5CF6" }
    ],
    departmentEngagement: [
      { department: "Computer Science", engagement: 85 },
      { department: "Electronics", engagement: 72 },
      { department: "Mechanical", engagement: 68 },
      { department: "Civil", engagement: 60 },
      { department: "Cultural", engagement: 78 }
    ]
  },

  // Messages Data
  messages: [
    {
      id: 1,
      sender: "Prof. Sharma",
      senderType: "teacher",
      message: "Please review the event proposal for Tech Fest",
      timestamp: "2 hours ago",
      unread: true,
      avatar: "https://via.placeholder.com/40x40/4B6CB7/FFFFFF?text=PS"
    },
    {
      id: 2,
      sender: "Student Council",
      senderType: "student",
      message: "Cultural Night preparations are going well",
      timestamp: "4 hours ago",
      unread: false,
      avatar: "https://via.placeholder.com/40x40/FFD700/000000?text=SC"
    },
    {
      id: 3,
      sender: "Admin Team",
      senderType: "admin",
      message: "New analytics report is available",
      timestamp: "1 day ago",
      unread: false,
      avatar: "https://via.placeholder.com/40x40/8B5CF6/FFFFFF?text=AT"
    }
  ],

  // College Profile Data
  collegeProfile: {
    name: "Panipat Institute of Engineering and Technology",
    logo: "https://via.placeholder.com/100x100/4B6CB7/FFFFFF?text=ABC",
    bio: "Leading institution in technology education, fostering innovation and excellence since 1995.",
    followers: 2500,
    following: 150,
    posts: 320,
    stories: [
      {
        id: 1,
        image: "https://via.placeholder.com/100x150/4B6CB7/FFFFFF?text=Story+1",
        date: "2 hours ago"
      },
      {
        id: 2,
        image: "https://via.placeholder.com/100x150/FFD700/000000?text=Story+2",
        date: "1 day ago"
      }
    ]
  },

  // Notifications
  notifications: [
    {
      id: 1,
      type: "event",
      title: "New Event Created",
      message: "Tech Fest 2025 has been created",
      timestamp: "2 hours ago",
      read: false
    },
    {
      id: 2,
      type: "media",
      title: "Media Uploaded",
      message: "5 new photos uploaded for Annual Day",
      timestamp: "4 hours ago",
      read: false
    },
    {
      id: 3,
      type: "system",
      title: "System Update",
      message: "New analytics features are now available",
      timestamp: "1 day ago",
      read: true
    }
  ]
};
