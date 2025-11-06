'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  Clock,
  Target,
  Activity,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { GlucosePredictionService, PredictionResult, PredictionAlert } from '@/lib/services/glucose-prediction';
import { useAuth } from '@/components/providers/auth-provider';

interface GlucosePredictorProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // seconds
}

export function GlucosePredictor({ 
  className = '', 
  autoRefresh = true, 
  refreshInterval = 300 // 5 minutes
}: GlucosePredictorProps) {
  const { user } = useAuth();
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPrediction = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await GlucosePredictionService.predictGlucose(user.id);
      setPrediction(result);
      setLastUpdated(new Date());
      
      if (!result) {
        console.log('No prediction result - likely insufficient data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate glucose prediction';
      setError(errorMessage);
      console.error('Prediction error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrediction();
  }, [user?.id]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchPrediction, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, user?.id]);

  const getSeverityColor = (severity: PredictionAlert['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
    }
  };

  const getAlertIcon = (type: PredictionAlert['type']) => {
    switch (type) {
      case 'hypoglycemia_risk': return <TrendingDown className="w-4 h-4" />;
      case 'hyperglycemia_risk': return <TrendingUp className="w-4 h-4" />;
      case 'trend_warning': return <Activity className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getGlucoseColor = (glucose: number) => {
    if (glucose < 70) return 'text-red-600 dark:text-red-400';
    if (glucose < 80) return 'text-orange-600 dark:text-orange-400';
    if (glucose > 180) return 'text-red-600 dark:text-red-400';
    if (glucose > 140) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Glucose Prediction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={fetchPrediction} 
            className="mt-4 w-full"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Retry Prediction
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!prediction && !isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Glucose Prediction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Prediction Not Available</p>
            <p className="text-sm mt-2">This feature requires:</p>
            <ul className="text-sm mt-2 space-y-1">
              <li>• At least 3 recent glucose readings</li>
              <li>• Connected CGM data</li>
              <li>• Recent insulin logging</li>
            </ul>
            <div className="mt-4 space-y-2">
              <Button 
                onClick={fetchPrediction} 
                variant="outline"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <p className="text-xs text-gray-400">
                Connect your CGM or log glucose readings to enable predictions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Glucose Prediction
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Updated {formatTime(lastUpdated)}
              </span>
            )}
            <Button
              onClick={fetchPrediction}
              size="sm"
              variant="ghost"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading && !prediction ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">
              Analyzing glucose trends...
            </span>
          </div>
        ) : prediction && (
          <>
            {/* Prediction Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className={`text-3xl font-bold ${getGlucoseColor(prediction.predicted_glucose)}`}>
                  {prediction.predicted_glucose}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Predicted in {prediction.time_horizon}min
                </div>
              </div>
              
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {Math.round(prediction.confidence * 100)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Confidence
                </div>
              </div>
            </div>

            {/* Prediction Factors */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Prediction Factors</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Current Trend</span>
                  <div className="flex items-center gap-2">
                    {prediction.factors.current_trend > 0 ? (
                      <TrendingUp className="w-4 h-4 text-red-500" />
                    ) : prediction.factors.current_trend < 0 ? (
                      <TrendingDown className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Minus className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="text-sm font-medium">
                      {prediction.factors.current_trend > 0 ? '+' : ''}{Math.round(prediction.factors.current_trend)} mg/dL
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">IOB Impact</span>
                  <span className="text-sm font-medium">
                    {prediction.factors.iob_impact > 0 ? '+' : ''}{Math.round(prediction.factors.iob_impact)} mg/dL
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Pattern Influence</span>
                  <span className="text-sm font-medium">
                    {prediction.factors.pattern_influence > 0 ? '+' : ''}{Math.round(prediction.factors.pattern_influence)} mg/dL
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Uncertainty</span>
                  <span className="text-sm font-medium text-gray-500">
                    ±{Math.round(prediction.factors.uncertainty)} mg/dL
                  </span>
                </div>
              </div>
            </div>

            {/* Confidence Meter */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Prediction Confidence</span>
                <span>{Math.round(prediction.confidence * 100)}%</span>
              </div>
              <Progress value={prediction.confidence * 100} className="h-2" />
            </div>

            {/* Alerts */}
            {prediction.alerts.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Alerts ({prediction.alerts.length})
                </h3>
                
                <div className="space-y-3">
                  {prediction.alerts.map((alert, index) => (
                    <Alert key={index} className={getSeverityColor(alert.severity)}>
                      <div className="flex items-start gap-3">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1 space-y-2">
                          <AlertDescription className="font-medium">
                            {alert.message}
                          </AlertDescription>
                          {alert.recommended_action && (
                            <div className="text-sm">
                              <strong>Recommended:</strong> {alert.recommended_action}
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-xs">
                            <span>Confidence: {Math.round(alert.confidence * 100)}%</span>
                            {alert.estimated_time > 0 && (
                              <span>ETA: {alert.estimated_time} min</span>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {alert.severity.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Alert>
                  ))}
                </div>
              </div>
            )}

            {/* No Alerts Message */}
            {prediction.alerts.length === 0 && (
              <div className="text-center py-4 text-green-600 dark:text-green-400">
                <div className="flex items-center justify-center gap-2">
                  <Target className="w-5 h-5" />
                  <span>No alerts - glucose levels look stable</span>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}