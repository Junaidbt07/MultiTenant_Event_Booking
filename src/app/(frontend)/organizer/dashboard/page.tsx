import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import React from 'react'
import config from '@/payload.config'
import OrganizerDashboard from '../../components/OrganizerDashboard'
import Link from 'next/link'

export default async function DashboardPage() {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })

  // If no user is logged in, redirect to login
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full mx-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to access the dashboard.</p>
          <Link
            href="/admin"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors block text-center"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  // If user is not an organizer, show appropriate message
  if (user.role !== 'organizer') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full mx-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Access Restricted</h2>
          <p className="text-gray-600 mb-4">
            This dashboard is only available for organizers. Your current role is: <strong>{user.role}</strong>
          </p>
          <div className="space-y-2">
            <Link
              href="/admin"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors block text-center"
            >
              Go to Admin Panel
            </Link>
            <Link
              href="/"
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors block text-center"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <OrganizerDashboard />
}