'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Flame, 
  TrendingUp, 
  Award, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  Trophy
} from 'lucide-react';

interface StreakAdjustment {
  oldStreak: number;
  newStreak: number;
  streakDifference: number;
  oldPoints: number;
  newPoints: number;
  pointsAdjustment: number;
  oldLevel: number;
  newLevel: number;
  oldLongestStreak: number;
  newLongestStreak: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  badge_color: string;
}

interface AdjustmentResult {
  success: boolean;
  changes: StreakAdjustment;
  newAchievements: any[];
  totalAchievements: number;
  achievements: Array<{
    achievement: Achievement;
    earned_at: string;
  }>;
}

export function StreakAdjuster() {
  const [userId, setUserId] = useState('');
  const [newStreak, setNewStreak] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdjustmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAdjust = async () => {
    if (!userId || !newStreak) {
      setError('Please enter both User ID and new streak value');
      return;
    }

    const streakValue = parseInt(newStreak);
    if (isNaN(streakValue) || streakValue < 0) {
      setError('Streak must be a positive number');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/gamification/adjust-streak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          newStreak: streakValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to adjust streak');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Adjust User Streak
          </CardTitle>
          <CardDescription>
            Manually adjust a user's streak and automatically recalculate points, level, and achievements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                placeholder="Enter user UUID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newStreak">New Streak (days)</Label>
              <Input
                id="newStreak"
                type="number"
                min="0"
                placeholder="Enter new streak value"
                value={newStreak}
                onChange={(e) => setNewStreak(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <Button 
            onClick={handleAdjust} 
            disabled={loading || !userId || !newStreak}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adjusting Streak...
              </>
            ) : (
              <>
                <TrendingUp className="mr-2 h-4 w-4" />
                Adjust Streak & Recalculate
              </>
            )}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Streak adjusted successfully! Points and achievements have been recalculated.
            </AlertDescription>
          </Alert>

          {/* Changes Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Changes Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Streak Changes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Current Streak</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          {result.changes.oldStreak}
                        </span>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <span className="text-2xl font-bold text-orange-600">
                          {result.changes.newStreak}
                        </span>
                      </div>
                    </div>
                    <Flame className="h-8 w-8 text-orange-500" />
                  </div>
                  <Badge variant={result.changes.streakDifference >= 0 ? 'default' : 'destructive'}>
                    {result.changes.streakDifference >= 0 ? '+' : ''}{result.changes.streakDifference} days
                  </Badge>
                </div>

                {/* Points Changes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Points</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          {result.changes.oldPoints}
                        </span>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <span className="text-2xl font-bold text-blue-600">
                          {result.changes.newPoints}
                        </span>
                      </div>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                  </div>
                  <Badge variant={result.changes.pointsAdjustment >= 0 ? 'default' : 'destructive'}>
                    {result.changes.pointsAdjustment >= 0 ? '+' : ''}{result.changes.pointsAdjustment} points
                  </Badge>
                </div>

                {/* Level Changes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Level</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          {result.changes.oldLevel}
                        </span>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <span className="text-2xl font-bold text-purple-600">
                          {result.changes.newLevel}
                        </span>
                      </div>
                    </div>
                    <Award className="h-8 w-8 text-purple-500" />
                  </div>
                  {result.changes.newLevel !== result.changes.oldLevel && (
                    <Badge variant="default">
                      Level {result.changes.newLevel > result.changes.oldLevel ? 'Up' : 'Down'}!
                    </Badge>
                  )}
                </div>

                {/* Longest Streak */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Longest Streak</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          {result.changes.oldLongestStreak}
                        </span>
                        {result.changes.newLongestStreak !== result.changes.oldLongestStreak && (
                          <>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                            <span className="text-2xl font-bold text-green-600">
                              {result.changes.newLongestStreak}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <Trophy className="h-8 w-8 text-green-500" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* New Achievements */}
          {result.newAchievements && result.newAchievements.length > 0 && (
            <Card className="border-yellow-500">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  New Achievements Unlocked!
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.newAchievements.map((achievement, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg"
                    >
                      <div className="text-2xl">{achievement.icon || '🏆'}</div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {achievement.name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          +{achievement.points} points
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                All User Achievements ({result.totalAchievements})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.achievements && result.achievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.achievements.map((item) => (
                    <div 
                      key={item.achievement.id}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <div className="text-2xl">{item.achievement.icon || '🏆'}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.achievement.name}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {new Date(item.earned_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {item.achievement.points}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
                  No achievements earned yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
