'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SetupDbPage() {
  const [copied, setCopied] = useState(false);

  const schema = `-- CGM Sensor Tracker Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create sensors table
CREATE TABLE public.sensors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    serial_number TEXT NOT NULL,
    lot_number TEXT NOT NULL,
    date_added DATE NOT NULL DEFAULT CURRENT_DATE,
    is_problematic BOOLEAN NOT NULL DEFAULT FALSE,
    issue_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Create photos table
CREATE TABLE public.photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sensor_id UUID NOT NULL REFERENCES public.sensors(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    cloud_url TEXT,
    local_path TEXT,
    date_added TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Create indexes for better performance
CREATE INDEX idx_sensors_user_id ON public.sensors(user_id);
CREATE INDEX idx_sensors_updated_at ON public.sensors(updated_at);
CREATE INDEX idx_sensors_is_deleted ON public.sensors(is_deleted);
CREATE INDEX idx_photos_sensor_id ON public.photos(sensor_id);
CREATE INDEX idx_photos_updated_at ON public.photos(updated_at);
CREATE INDEX idx_photos_is_deleted ON public.photos(is_deleted);

-- Enable Row Level Security (RLS)
ALTER TABLE public.sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sensors table
CREATE POLICY "Users can view their own sensors" ON public.sensors
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sensors" ON public.sensors
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sensors" ON public.sensors
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sensors" ON public.sensors
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for photos table
CREATE POLICY "Users can view photos of their own sensors" ON public.photos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sensors 
            WHERE sensors.id = photos.sensor_id 
            AND sensors.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert photos for their own sensors" ON public.photos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sensors 
            WHERE sensors.id = photos.sensor_id 
            AND sensors.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update photos of their own sensors" ON public.photos
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.sensors 
            WHERE sensors.id = photos.sensor_id 
            AND sensors.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete photos of their own sensors" ON public.photos
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.sensors 
            WHERE sensors.id = photos.sensor_id 
            AND sensors.user_id = auth.uid()
        )
    );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_sensors_updated_at 
    BEFORE UPDATE ON public.sensors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photos_updated_at 
    BEFORE UPDATE ON public.photos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(schema);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Database Setup Required</h1>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Database Tables Missing</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  The sensors table doesn't exist in your Supabase database. You need to run the SQL schema to create it.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Setup Instructions</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Go to your <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500 underline">Supabase Dashboard</a></li>
                <li>Navigate to <strong>SQL Editor</strong> in the left sidebar</li>
                <li>Click <strong>"New Query"</strong></li>
                <li>Copy the SQL schema below and paste it into the editor</li>
                <li>Click <strong>"Run"</strong> to execute the schema</li>
                <li>Return here and test the connection</li>
              </ol>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">SQL Schema</h3>
                <button
                  onClick={copyToClipboard}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    copied 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  {copied ? '✓ Copied!' : 'Copy SQL'}
                </button>
              </div>
              
              <div className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto max-h-96">
                <pre className="text-sm">{schema}</pre>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-800">What this creates:</h3>
              <ul className="text-sm text-blue-700 mt-1 list-disc list-inside">
                <li><strong>sensors table</strong> - Stores your sensor data</li>
                <li><strong>photos table</strong> - Stores photo metadata</li>
                <li><strong>Security policies</strong> - Users can only see their own data</li>
                <li><strong>Indexes</strong> - Optimized for fast queries</li>
              </ul>
            </div>

            <div className="flex space-x-4">
              <Link href="/test-db" className="btn-primary">
                Test Database Connection
              </Link>
              <Link href="/debug" className="btn-secondary">
                Back to Debug Page
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}