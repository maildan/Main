import { NextResponse } from 'next/server';
import { enableGpuAcceleration, disableGpuAcceleration } from '@/app/utils/gpu-acceleration';

export async function GET() {
  try {
    const result = await enableGpuAcceleration();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const enable = body?.enable ?? true;
    
    const result = enable 
      ? await enableGpuAcceleration()
      : await disableGpuAcceleration();
    
    return NextResponse.json({ success: true, enabled: enable, ...result });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const result = await disableGpuAcceleration();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
