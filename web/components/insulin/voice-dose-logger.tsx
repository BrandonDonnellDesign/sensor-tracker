'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Mic, 
  MicOff, 
  Volume2, 
  CheckCircle, 
  XCircle,
  Loader2,
  MessageSquare
} from 'lucide-react'

interface VoiceRecognitionResult {
  transcript: string
  confidence: number
  parsedDose?: {
    units: number
    insulinType: string
    deliveryType: 'bolus' | 'basal'
    notes?: string
  }
}

interface VoiceDoseLoggerProps {
  onDoseLogged?: (dose: any) => void
  className?: string
}

export function VoiceDoseLogger({ onDoseLogged, className }: VoiceDoseLoggerProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [confidence, setConfidence] = useState(0)
  const [parsedDose, setParsedDose] = useState<VoiceRecognitionResult['parsedDose'] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      setIsSupported(true)
      
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'
      
      recognition.onstart = () => {
        setIsListening(true)
        setError(null)
      }
      
      recognition.onresult = (event: any) => {
        const result = event.results[0]
        const transcript = result[0].transcript
        const confidence = result[0].confidence
        
        setTranscript(transcript)
        setConfidence(confidence)
        setIsProcessing(true)
        
        // Parse the transcript for dose information
        parseDoseFromTranscript(transcript)
      }
      
      recognition.onerror = (event: any) => {
        setError(`Speech recognition error: ${event.error}`)
        setIsListening(false)
      }
      
      recognition.onend = () => {
        setIsListening(false)
      }
      
      recognitionRef.current = recognition
    }
  }, [])

  const parseDoseFromTranscript = async (transcript: string) => {
    try {
      const parsed = parseInsulinDose(transcript.toLowerCase())
      setParsedDose(parsed)
      setIsProcessing(false)
    } catch (error) {
      setError('Could not understand the dose information')
      setIsProcessing(false)
    }
  }

  const parseInsulinDose = (text: string): VoiceRecognitionResult['parsedDose'] => {
    // Common patterns for insulin doses
    const patterns = [
      // "5 units of humalog"
      /(\d+(?:\.\d+)?)\s*units?\s*(?:of\s*)?(\w+)?/i,
      // "took 3 rapid acting"
      /took\s*(\d+(?:\.\d+)?)\s*(\w+\s*\w*)?/i,
      // "bolus 4 units"
      /(bolus|basal)\s*(\d+(?:\.\d+)?)\s*units?/i,
      // "inject 2.5"
      /inject(?:ed)?\s*(\d+(?:\.\d+)?)/i,
      // Just numbers with context
      /(\d+(?:\.\d+)?)\s*(rapid|short|long|humalog|novolog|lantus|levemir|bolus|basal)?/i
    ]

    let units: number | null = null
    let insulinType = 'Rapid-Acting'
    let deliveryType: 'bolus' | 'basal' = 'bolus'

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        // Extract units
        const unitsMatch = match.find(group => group && /^\d+(?:\.\d+)?$/.test(group))
        if (unitsMatch) {
          units = parseFloat(unitsMatch)
        }

        // Extract insulin type and delivery type
        const typeMatch = match.find(group => 
          group && group !== unitsMatch && /^[a-z]+/i.test(group)
        )
        
        if (typeMatch) {
          const type = typeMatch.toLowerCase()
          
          // Determine delivery type
          if (type.includes('basal')) {
            deliveryType = 'basal'
          } else {
            deliveryType = 'bolus'
          }
          
          // Determine insulin type
          if (type.includes('rapid') || type.includes('humalog') || type.includes('novolog')) {
            insulinType = 'Rapid-Acting'
          } else if (type.includes('short') || type.includes('regular')) {
            insulinType = 'Short-Acting'
          } else if (type.includes('long') || type.includes('lantus') || type.includes('levemir')) {
            insulinType = 'Long-Acting'
            deliveryType = 'basal'
          }
        }
        
        break
      }
    }

    if (units === null || units <= 0) {
      throw new Error('Could not extract valid dose amount')
    }

    return {
      units,
      insulinType,
      deliveryType,
      notes: text
    }
  }

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('')
      setParsedDose(null)
      setError(null)
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }

  const confirmDose = async () => {
    if (!parsedDose) return

    try {
      const response = await fetch('/api/insulin/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          insulin_type: parsedDose.insulinType,
          units: parsedDose.units,
          delivery_type: parsedDose.deliveryType,
          notes: `Voice: ${parsedDose.notes}`,
          taken_at: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to log dose')
      }

      const result = await response.json()
      onDoseLogged?.(result.data)
      
      // Reset state
      setTranscript('')
      setParsedDose(null)
      setError(null)
      
      // Provide audio feedback
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(
          `Logged ${parsedDose.units} units of ${parsedDose.insulinType}`
        )
        speechSynthesis.speak(utterance)
      }
      
    } catch (error) {
      setError('Failed to log dose')
    }
  }

  const cancelDose = () => {
    setTranscript('')
    setParsedDose(null)
    setError(null)
  }

  if (!isSupported) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <MicOff className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">
            Voice recognition is not supported in this browser
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Voice Dose Logger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Voice Control Button */}
        <div className="text-center">
          <Button
            size="lg"
            variant={isListening ? "destructive" : "default"}
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
            className="w-32 h-32 rounded-full"
          >
            {isListening ? (
              <div className="flex flex-col items-center">
                <Mic className="h-8 w-8 mb-2 animate-pulse" />
                <span className="text-xs">Listening...</span>
              </div>
            ) : isProcessing ? (
              <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 mb-2 animate-spin" />
                <span className="text-xs">Processing...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Mic className="h-8 w-8 mb-2" />
                <span className="text-xs">Tap to speak</span>
              </div>
            )}
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-center text-sm text-gray-500">
          <p>Say something like:</p>
          <p className="font-mono text-xs mt-1">
            "5 units of Humalog" or "Took 3 rapid acting"
          </p>
        </div>

        {/* Transcript Display */}
        {transcript && (
          <div className="space-y-2">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Volume2 className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">You said:</span>
                <Badge variant="outline" className="text-xs">
                  {Math.round(confidence * 100)}% confidence
                </Badge>
              </div>
              <p className="text-sm italic">"{transcript}"</p>
            </div>
          </div>
        )}

        {/* Parsed Dose Display */}
        {parsedDose && (
          <div className="space-y-3">
            <div className="p-4 border rounded-lg bg-green-50 border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">Dose Recognized</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Amount:</span>
                  <span className="ml-2 font-semibold">{parsedDose.units} units</span>
                </div>
                <div>
                  <span className="text-gray-600">Type:</span>
                  <span className="ml-2 font-semibold">{parsedDose.insulinType}</span>
                </div>
                <div>
                  <span className="text-gray-600">Delivery:</span>
                  <span className="ml-2 font-semibold capitalize">{parsedDose.deliveryType}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={confirmDose} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm & Log
              </Button>
              <Button variant="outline" onClick={cancelDose}>
                <XCircle className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tips */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>💡 Tips for better recognition:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Speak clearly and at normal pace</li>
            <li>Include units and insulin type</li>
            <li>Use common terms like "bolus", "rapid", "long-acting"</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}