'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Shield, 
  TrendingUp, 
  Syringe, 
  CheckCircle, 
  AlertTriangle,
  Info,
  ArrowRight
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  example: {
    title: string;
    message: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
  };
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'iob-safety',
    title: 'IOB Safety Alerts',
    description: 'Get instant warnings when insulin stacking or dangerous IOB + low glucose combinations are detected.',
    icon: <Syringe className="w-6 h-6 text-orange-500" />,
    example: {
      title: '⚠️ Insulin Stacking Detected',
      message: 'You have 2 recent doses with 4.2u IOB. Risk of hypoglycemia!',
      priority: 'urgent'
    }
  },
  {
    id: 'glucose-trends',
    title: 'Glucose Trend Analysis',
    description: 'Smart alerts for rising glucose without food, prolonged highs, and dawn phenomenon patterns.',
    icon: <TrendingUp className="w-6 h-6 text-blue-500" />,
    example: {
      title: '📈 Rising Glucose Detected',
      message: 'Glucose rising to 165 mg/dL with no recent food logged. Did you eat something?',
      priority: 'high'
    }
  },
  {
    id: 'safety-monitoring',
    title: 'Continuous Safety Monitoring',
    description: 'Real-time monitoring that works 24/7 to keep you safe, even when you\'re not actively using the app.',
    icon: <Shield className="w-6 h-6 text-green-500" />,
    example: {
      title: '🚨 Low Glucose + Active IOB',
      message: 'Glucose: 75 mg/dL with 2.1u IOB. Treat low and monitor closely!',
      priority: 'urgent'
    }
  },
  {
    id: 'personalization',
    title: 'Personalized Settings',
    description: 'Customize thresholds, notification types, and delivery methods to match your diabetes management style.',
    icon: <Bell className="w-6 h-6 text-purple-500" />,
    example: {
      title: '💡 Personalized Tip',
      message: 'Based on your patterns, consider reducing breakfast insulin by 0.5u.',
      priority: 'low'
    }
  }
];

export function NotificationOnboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  const currentStepData = onboardingSteps[currentStep];

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setCompleted(true);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (completed) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">You're All Set! 🎉</h2>
          <p className="text-gray-600 mb-6">
            Smart notifications are now active and monitoring your diabetes management 24/7. 
            You'll receive instant alerts for any safety concerns.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <Info className="w-5 h-5 text-blue-600 inline mr-2" />
            <span className="text-blue-800 text-sm">
              You can customize notification settings anytime in Settings → Notifications
            </span>
          </div>
          <Button onClick={() => window.location.href = '/dashboard'}>
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            {currentStepData.icon}
            Smart Notifications Setup
          </CardTitle>
          <Badge variant="outline">
            {currentStep + 1} of {onboardingSteps.length}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }}
          />
        </div>

        {/* Step Content */}
        <div>
          <h3 className="text-xl font-semibold mb-3">{currentStepData.title}</h3>
          <p className="text-gray-600 mb-6">{currentStepData.description}</p>
          
          {/* Example Notification */}
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium">{currentStepData.example.title}</h4>
                  <Badge className={getPriorityColor(currentStepData.example.priority)}>
                    {currentStepData.example.priority}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{currentStepData.example.message}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          
          <Button onClick={nextStep} className="flex items-center gap-2">
            {currentStep === onboardingSteps.length - 1 ? 'Complete Setup' : 'Next'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Skip Option */}
        <div className="text-center">
          <button 
            onClick={() => setCompleted(true)}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Skip tutorial and go to dashboard
          </button>
        </div>
      </CardContent>
    </Card>
  );
}