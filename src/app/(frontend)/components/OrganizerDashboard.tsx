// src/components/OrganizerDashboard.tsx
'use client'
import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, TrendingUp, BarChart3, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

interface Event {
  id: string;
  title: string;
  date: string;
  capacity: number;
  confirmedCount: number;
  waitlistedCount: number;
  canceledCount: number;
  percentageFilled: number;
}

interface SummaryAnalytics {
  totalEvents: number;
  totalConfirmedBookings: number;
  totalWaitlistedBookings: number;
  totalCanceledBookings: number;
}

interface DashboardData {
  upcomingEvents: Event[];
  summaryAnalytics: SummaryAnalytics;
}

const OrganizerDashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }
      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const CircularProgress = ({ percentage, size = 60 }: { percentage: number; size?: number }) => {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative inline-block">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgb(229, 231, 235)"
            strokeWidth="4"
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgb(59, 130, 246)"
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-gray-700">{percentage}%</span>
        </div>
      </div>
    );
  };

  const StatCard = ({ icon: Icon, title, value, color = 'blue' }: {
    icon: React.ElementType;
    title: string;
    value: number;
    color?: 'blue' | 'green' | 'yellow' | 'red';
  }) => {
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
      red: 'bg-red-50 text-red-600 border-red-200'
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon size={24} />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
      </div>
    );
  };

  const EventCard = ({ event }: { event: Event }) => {
    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    const formattedTime = eventDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const getStatusColor = (count: number, type: string) => {
      if (count === 0) return 'text-gray-400';
      switch (type) {
        case 'confirmed': return 'text-green-600';
        case 'waitlisted': return 'text-yellow-600';
        case 'canceled': return 'text-red-600';
        default: return 'text-gray-600';
      }
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.title}</h3>
            <div className="flex items-center text-sm text-gray-600 mb-1">
              <Calendar size={16} className="mr-2" />
              {formattedDate} at {formattedTime}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Users size={16} className="mr-2" />
              Capacity: {event.capacity} attendees
            </div>
          </div>
          <div className="ml-4">
            <CircularProgress percentage={event.percentageFilled} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <CheckCircle size={16} className={getStatusColor(event.confirmedCount, 'confirmed')} />
            </div>
            <p className={`text-2xl font-bold ${getStatusColor(event.confirmedCount, 'confirmed')}`}>
              {event.confirmedCount}
            </p>
            <p className="text-xs text-gray-500">Confirmed</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Clock size={16} className={getStatusColor(event.waitlistedCount, 'waitlisted')} />
            </div>
            <p className={`text-2xl font-bold ${getStatusColor(event.waitlistedCount, 'waitlisted')}`}>
              {event.waitlistedCount}
            </p>
            <p className="text-xs text-gray-500">Waitlisted</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <XCircle size={16} className={getStatusColor(event.canceledCount, 'canceled')} />
            </div>
            <p className={`text-2xl font-bold ${getStatusColor(event.canceledCount, 'canceled')}`}>
              {event.canceledCount}
            </p>
            <p className="text-xs text-gray-500">Canceled</p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full mx-4">
          <div className="flex items-center mb-4">
            <AlertCircle className="text-red-600 mr-3" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">Error Loading Dashboard</h2>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors mb-2"
          >
            Retry
          </button>
          <button
            onClick={() => window.location.href = '/admin'}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
          >
            Go to Admin Panel
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">No dashboard data available.</p>
      </div>
    );
  }

  const { upcomingEvents, summaryAnalytics } = dashboardData;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Organizer Dashboard</h1>
          <p className="text-gray-600">Overview of your events and bookings</p>
        </div>

        {/* Summary Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Calendar}
            title="Total Events"
            value={summaryAnalytics.totalEvents}
            color="blue"
          />
          <StatCard
            icon={CheckCircle}
            title="Confirmed Bookings"
            value={summaryAnalytics.totalConfirmedBookings}
            color="green"
          />
          <StatCard
            icon={Clock}
            title="Waitlisted Bookings"
            value={summaryAnalytics.totalWaitlistedBookings}
            color="yellow"
          />
          <StatCard
            icon={XCircle}
            title="Canceled Bookings"
            value={summaryAnalytics.totalCanceledBookings}
            color="red"
          />
        </div>

        {/* Upcoming Events */}
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <TrendingUp className="text-blue-600 mr-3" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">Upcoming Events</h2>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm">
              <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Upcoming Events</h3>
              <p className="text-gray-600 mb-4">You haven&apos;t created any upcoming events yet.</p>
              <button
                onClick={() => window.location.href = '/admin/collections/events/create'}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Your First Event
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/admin/collections/events/create"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Calendar className="mr-2" size={20} />
              Create Event
            </Link>

            <Link
              href="/admin/collections/events"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center py-3 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              <BarChart3 className="mr-2" size={20} />
              Manage Events
            </Link>

            <Link
              href="/admin/collections/bookings"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center py-3 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Users className="mr-2" size={20} />
              View Bookings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizerDashboard;