export interface WearableData {
  steps: number
  heartRate: number[]
  caloriesBurned?: number
  sleepHours?: number
  distance?: number
  deviceType?: string
  lastUpdated: string
}

export interface JunctionAPIResponse {
  success: boolean
  data: WearableData
  timestamp: string
}

/**
 * Mock Junction API service for wearable data
 * In production, this would make actual API calls to Junction
 */
export class WearableService {
  private static instance: WearableService
  private baseUrl = 'https://api.junction.com/v1' // Mock URL

  private constructor() {}

  public static getInstance(): WearableService {
    if (!WearableService.instance) {
      WearableService.instance = new WearableService()
    }
    return WearableService.instance
  }

  /**
   * Get wearable data for a specific user
   * @param userId - The user ID to fetch data for
   * @returns Promise<WearableData> - The wearable data for the user
   */
  async getWearableData(userId: string): Promise<WearableData> {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))

      // Mock Junction API response
      const mockResponse: JunctionAPIResponse = {
        success: true,
        data: {
          steps: Math.floor(Math.random() * 15000) + 5000, // Random steps between 5000-20000
          heartRate: this.generateHeartRateData(),
          caloriesBurned: Math.floor(Math.random() * 800) + 200, // Random calories 200-1000
          sleepHours: Math.random() * 4 + 6, // Random sleep 6-10 hours
          distance: Math.random() * 10 + 2, // Random distance 2-12 km
          deviceType: 'Apple Watch Series 7',
          lastUpdated: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      }

      // Simulate occasional API errors
      // if (Math.random() < 0.1) {
      //   throw new Error('Junction API temporarily unavailable')
      // }

      return mockResponse.data
    } catch (error) {
      console.error('Error fetching wearable data:', error)
      // Return fallback data if API fails
      return {
        steps: 0,
        heartRate: [],
        caloriesBurned: 0,
        sleepHours: 0,
        distance: 0,
        deviceType: 'Unknown',
        lastUpdated: new Date().toISOString()
      }
    }
  }

  /**
   * Generate realistic heart rate data
   * @returns number[] - Array of heart rate readings
   */
  private generateHeartRateData(): number[] {
    const readings: number[] = []
    const baseRate = Math.floor(Math.random() * 20) + 60 // Base rate 60-80 BPM
    
    for (let i = 0; i < 24; i++) { // 24 readings (hourly)
      const variation = Math.floor(Math.random() * 20) - 10 // ±10 BPM variation
      readings.push(Math.max(40, Math.min(120, baseRate + variation))) // Keep within 40-120 BPM
    }
    
    return readings
  }

  /**
   * Get wearable data for multiple users
   * @param userIds - Array of user IDs
   * @returns Promise<Record<string, WearableData>> - Wearable data keyed by user ID
   */
  async getWearableDataForUsers(userIds: string[]): Promise<Record<string, WearableData>> {
    const results: Record<string, WearableData> = {}
    
    await Promise.all(
      userIds.map(async (userId) => {
        try {
          results[userId] = await this.getWearableData(userId)
        } catch (error) {
          console.error(`Error fetching data for user ${userId}:`, error)
          results[userId] = {
            steps: 0,
            heartRate: [],
            lastUpdated: new Date().toISOString()
          }
        }
      })
    )
    
    return results
  }
}

// Export singleton instance
export const wearableService = WearableService.getInstance() 