import { NextRequest, NextResponse } from 'next/server'
import { wearableService } from '../../../services/wearableService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    if (typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId must be a string' },
        { status: 400 }
      )
    }

    const wearableData = await wearableService.getWearableData(userId)

    return NextResponse.json({
      success: true,
      data: wearableData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in /api/wearables:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch wearable data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Optional: Add GET method for testing
export async function GET() {
  return NextResponse.json({
    message: 'Use POST method with { userId } to get wearable data',
    example: {
      method: 'POST',
      body: { userId: 'user-uuid-here' }
    }
  })
} 