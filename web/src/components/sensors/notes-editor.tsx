'use client';

import { useState } from 'react';

interface NotesEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  rows?: number;
}

export function NotesEditor({ 
  value, 
  onChange, 
  placeholder = "Add notes about this sensor...",
  maxLength = 1000,
  className = '',
  rows = 4 
}: NotesEditorProps) {
  const [focused, setFocused] = useState(false);

  const characterCount = value.length;
  const isNearLimit = characterCount > maxLength * 0.8;
  const isOverLimit = characterCount > maxLength;

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Notes
        {value.trim() && (
          <span className="ml-2 text-xs text-gray-500">
            ({value.trim().split(/\s+/).length} words)
          </span>
        )}
      </label>
      
      <div className={`relative rounded-md border ${
        focused 
          ? 'border-blue-500 ring-3 ring-blue-500' 
          : isOverLimit
          ? 'border-red-300'
          : 'border-gray-300'
      }`}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          className={`block w-full rounded-md border-0 py-2 px-3 text-gray-900 placeholder-gray-400 focus:outline-0 resize-vertical min-h-[80px] ${
            isOverLimit ? 'text-red-900' : ''
          }`}
        />
        
        {/* Character count */}
        <div className="absolute bottom-2 right-2 text-xs text-gray-400">
          <span className={`${
            isOverLimit 
              ? 'text-red-500 font-medium' 
              : isNearLimit 
              ? 'text-yellow-600' 
              : 'text-gray-400'
          }`}>
            {characterCount}
          </span>
          <span className="text-gray-300">/{maxLength}</span>
        </div>
      </div>
      
      {/* Quick templates for common notes */}
      {!value.trim() && (
        <div className="mt-2">
          <div className="text-xs text-gray-500 mb-1">Quick templates:</div>
          <div className="flex flex-wrap gap-1">
            {[
              "Fell off while swimming",
              "Adhesive failed early",
              "Signal lost frequently", 
              "Inaccurate readings",
              "Painful insertion",
              "Good performance throughout"
            ].map(template => (
              <button
                key={template}
                type="button"
                onClick={() => onChange(template)}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
              >
                {template}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Note guidelines */}
      {focused && !value.trim() && (
        <div className="mt-2 p-2 bg-blue-50 rounded-md">
          <div className="text-xs text-blue-700">
            <div className="font-medium mb-1">Helpful note ideas:</div>
            <ul className="list-disc list-inside space-y-0.5 text-blue-600">
              <li>When and how the sensor came off or failed</li>
              <li>Any symptoms or issues you noticed</li>
              <li>Environmental factors (swimming, exercise, etc.)</li>
              <li>Comfort level and insertion experience</li>
              <li>Accuracy compared to blood glucose checks</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}