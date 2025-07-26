'use client'

import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseclient'
import Link from 'next/link'

interface UserProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  is_partner: boolean
  created_at: string
}

interface ConnectedClient {
  id: string
  first_name: string
  last_name: string
  email: string
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

export default function DashboardPage() {
  const auth = useAuth()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [connectedClients, setConnectedClients] = useState<ConnectedClient[]>([])
  const [wearableData, setWearableData] = useState<WearableData | null>(null)
  const [loading, setLoading] = useState(true)
  const [wearableLoading, setWearableLoading] = useState(false)
  const [vitalLoading, setVitalLoading] = useState(false)
  const [vitalConnected, setVitalConnected] = useState(false)

  useEffect(() => {
    console.log('useAuth() result:', auth)
  }, [auth])

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!auth.user) {
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', auth.user.id)
          .single()

        if (error) throw error
        setUserProfile(data)
      } catch (error) {
        console.error('Error fetching user profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [auth.user])

  useEffect(() => {
    const fetchConnectedClients = async () => {
      if (!auth.user || !userProfile?.is_partner) return

      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, first_name, last_name, email, created_at')
          .eq('connected_partner_id', auth.user.id)

        if (error) throw error
        setConnectedClients(data || [])
      } catch (error) {
        console.error('Error fetching connected clients:', error)
      }
    }

    fetchConnectedClients()
  }, [auth.user, userProfile?.is_partner])

  // Fetch wearable data for clients via API
  useEffect(() => {
    const fetchWearableData = async () => {
      if (!auth.user || userProfile?.is_partner) return

      setWearableLoading(true)
      try {
        const response = await fetch('/api/wearables', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: auth.user.id })
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
  }, [auth.user, userProfile?.is_partner])

  // Check if user has Vital connected
  useEffect(() => {
    const checkVitalConnection = async () => {
      if (!auth.user) return

      try {
        const { data, error } = await supabase
          .from('wearables')
          .select('status, vital_user_id')
          .eq('user_id', auth.user.id)
          .single()

        if (!error && data) {
          setVitalConnected(data.status === 'connected' || !!data.vital_user_id)
        }
      } catch (error) {
        console.error('Error checking Vital connection:', error)
      }
    }

    checkVitalConnection()
  }, [auth.user])

  const launchVital = async () => {
    if (!auth.user) return

    setVitalLoading(true)
    try {
      console.log('🚀 Launching Vital for user:', auth.user.id)
      
      const response = await fetch('/api/vital/launch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: auth.user.id
        })
      })

      console.log('📡 Response status:', response.status)
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error:', response.status, errorText)
        throw new Error(`API Error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('📦 Response data:', data)
      
      if (data.success && data.linkUrl) {
        console.log('✅ Opening Vital link:', data.linkUrl)
        // Open Vital link in new window
        window.open(data.linkUrl, '_blank', 'width=600,height=700')
      } else {
        console.error('❌ Failed to launch Vital:', data)
        alert('Failed to launch Vital: ' + (data.error || 'No link URL provided'))
      }
    } catch (error: any) {
      console.error('❌ Error launching Vital:', error)
      alert('Error connecting device: ' + (error.message || 'Unknown error'))
    } finally {
      setVitalLoading(false)
    }
  }

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
        <div className="text-xl">Please log in to access the dashboard</div>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Error loading user profile</div>
      </div>
    )
  }

  const fullName = `${userProfile.first_name} ${userProfile.last_name}`
  const role = userProfile.is_partner ? 'Partner' : 'Client'

  // Calculate average heart rate
  const averageHeartRate = wearableData?.heartRate && wearableData.heartRate.length > 0
    ? Math.round(wearableData.heartRate.reduce((sum, rate) => sum + rate, 0) / wearableData.heartRate.length)
    : 0

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome, {fullName}! 👋
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            You are logged in as a <span className="font-semibold text-indigo-600">{role}</span>
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="text-xl font-semibold mb-3">Account Information</h2>
            <div className="space-y-2 text-sm">
              <p><strong>Email:</strong> {userProfile.email}</p>
              <p><strong>Role:</strong> {role}</p>
              <p><strong>Member since:</strong> {new Date(userProfile.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Vital Connection Section */}
          {!userProfile.is_partner && (
            <div className="bg-white border rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Connect Your Wearable Device</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 mb-2">
                    Connect your Fitbit, Apple Health, Google Fit, or other wearable devices to track your health data.
                  </p>
                  <p className="text-sm text-gray-500">
                    {vitalConnected ? '✅ Device connected' : '❌ No device connected'}
                  </p>
                </div>
                <button
                  onClick={launchVital}
                  disabled={vitalLoading}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {vitalLoading ? 'Connecting...' : vitalConnected ? 'Reconnect Device' : 'Connect Device'}
                </button>
              </div>
            </div>
          )}

          {/* Client Dashboard - Show Wearable Data */}
          {!userProfile.is_partner && (
            <div className="bg-white border rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Your Health Data</h2>
              {wearableLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-gray-500">Loading health data...</div>
                </div>
              ) : wearableData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No health data available</p>
                  <p className="text-sm text-gray-400 mt-2">Connect your wearable device to see your health metrics</p>
                </div>
              )}
              {wearableData?.deviceType && (
                <p className="text-xs text-gray-500 mt-4">
                  Data from: {wearableData.deviceType} • Last updated: {new Date(wearableData.lastUpdated).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Partner Dashboard - Show Connected Clients */}
          {userProfile.is_partner && (
            <div className="bg-white border rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Connected Clients</h2>
              {connectedClients.length === 0 ? (
                <p className="text-gray-500">No clients connected yet.</p>
              ) : (
                <div className="space-y-3">
                  {connectedClients.map((client) => (
                    <div key={client.id} className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <Link 
                          href={`/dashboard/client/${client.id}`}
                          className="block hover:text-indigo-600 transition-colors"
                        >
                          <p className="font-medium text-lg">{client.first_name} {client.last_name}</p>
                          <p className="text-sm text-gray-600">{client.email}</p>
                        </Link>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-gray-500">
                          Member since: {new Date(client.created_at).toLocaleDateString()}
                        </span>
                        <Link
                          href={`/dashboard/client/${client.id}`}
                          className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors"
                        >
                          View Health Data
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={auth.signOut}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
} 