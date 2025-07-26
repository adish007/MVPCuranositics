'use client'

import { useAuth } from '../../../../context/AuthContext'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabaseclient'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface ClientProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  is_partner: boolean
  created_at: string
}

interface WearableData {
  steps: number
  heartRate: number[]
  caloriesBurned?: number
  sleepHours?: number
  distance?: number
  deviceType?: string
  lastUpdated: string
}

export default function ClientDetailPage() {
  const auth = useAuth()
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null)
  const [wearableData, setWearableData] = useState<WearableData | null>(null)
  const [loading, setLoading] = useState(true)
  const [wearableLoading, setWearableLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchClientProfile = async () => {
      if (!auth.user || !clientId) {
        setLoading(false)
        return
      }

      try {
        // First verify this client is connected to the current partner
        const { data: connectionData, error: connectionError } = await supabase
          .from('users')
          .select('connected_partner_id')
          .eq('id', clientId)
          .single()

        if (connectionError) throw connectionError

        // Check if the client is connected to the current partner
        if (connectionData.connected_partner_id !== auth.user.id) {
          setError('You are not authorized to view this client')
          setLoading(false)
          return
        }

        // Fetch client profile
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', clientId)
          .single()

        if (error) throw error
        setClientProfile(data)
      } catch (error) {
        console.error('Error fetching client profile:', error)
        setError('Failed to load client profile')
      } finally {
        setLoading(false)
      }
    }

    fetchClientProfile()
  }, [auth.user, clientId])

  useEffect(() => {
    const fetchWearableData = async () => {
      if (!clientId) return

      setWearableLoading(true)
      try {
        const response = await fetch('/api/wearables', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: clientId })
        })

        if (!response.ok) {
          throw new Error('Failed to fetch wearable data')
        }

        const result = await response.json()
        if (result.success) {
          setWearableData(result.data)
        } else {
          throw new Error(result.error || 'Failed to fetch wearable data')
        }
      } catch (error) {
        console.error('Error fetching wearable data:', error)
      } finally {
        setWearableLoading(false)
      }
    }

    fetchWearableData()
  }, [clientId])

  if (auth.loading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!auth.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Please log in to access this page</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">{error}</div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!clientProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Client not found</div>
      </div>
    )
  }

  // Calculate average heart rate
  const averageHeartRate = wearableData?.heartRate && wearableData.heartRate.length > 0
    ? Math.round(wearableData.heartRate.reduce((sum, rate) => sum + rate, 0) / wearableData.heartRate.length)
    : 0

  const clientFullName = `${clientProfile.first_name} ${clientProfile.last_name}`

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {clientFullName}'s Health Data
              </h1>
              <p className="text-lg text-gray-600">
                Client since {new Date(clientProfile.created_at).toLocaleDateString()}
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="text-xl font-semibold mb-3">Client Information</h2>
            <div className="space-y-2 text-sm">
              <p><strong>Email:</strong> {clientProfile.email}</p>
              <p><strong>Member since:</strong> {new Date(clientProfile.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Health Data Section */}
          <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Health Metrics</h2>
            {wearableLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Loading health data...</div>
              </div>
            ) : wearableData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-blue-800 mb-2">Steps Today</h3>
                  <p className="text-4xl font-bold text-blue-900">{wearableData.steps.toLocaleString()}</p>
                  <p className="text-sm text-blue-600 mt-2">Daily goal: 10,000 steps</p>
                </div>
                <div className="bg-red-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-red-800 mb-2">Average Heart Rate</h3>
                  <p className="text-4xl font-bold text-red-900">{averageHeartRate} BPM</p>
                  <p className="text-sm text-red-600 mt-2">Based on 24 readings</p>
                </div>
                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-green-800 mb-2">Calories Burned</h3>
                  <p className="text-4xl font-bold text-green-900">{wearableData.caloriesBurned || 0}</p>
                  <p className="text-sm text-green-600 mt-2">Today's activity</p>
                </div>
                <div className="bg-purple-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-purple-800 mb-2">Sleep Hours</h3>
                  <p className="text-4xl font-bold text-purple-900">{wearableData.sleepHours?.toFixed(1) || 0}</p>
                  <p className="text-sm text-purple-600 mt-2">Last night's sleep</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No health data available for this client</p>
              </div>
            )}
            {wearableData?.deviceType && (
              <p className="text-xs text-gray-500 mt-4">
                Data from: {wearableData.deviceType} • Last updated: {new Date(wearableData.lastUpdated).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 