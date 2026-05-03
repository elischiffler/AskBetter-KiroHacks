import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats, type DashboardStats } from '../lib/dashboardService';
import { Header } from '../components/Header';
import { TrendChart } from '../components/TrendChart';
import { ProgressIndicator } from '../components/ProgressIndicator';
import { ComparisonCards } from '../components/ComparisonCard';
import { BarChart3, TrendingUp, Target, Award } from 'lucide-react';

export function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      loadDashboardData();
    }
  }, [user, authLoading, navigate]);

  async function loadDashboardData() {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const dashboardStats = await getDashboardStats(user.id);
      setStats(dashboardStats);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)] pt-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)] pt-20">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const hasData = stats.totalAnalyses > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Your Prompting Dashboard</h1>
          <p className="text-gray-600">
            Track your progress and see how your prompting skills evolve over time
          </p>
        </div>

        {!hasData ? (
          /* Empty State */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Data Yet</h2>
            <p className="text-gray-600 mb-6">
              Complete your first conversation analysis to start tracking your progress!
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
            >
              Analyze a Conversation
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Progress Indicator */}
            <ProgressIndicator
              trend={stats.trend}
              percentage={stats.trendPercentage}
              totalAnalyses={stats.totalAnalyses}
            />

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-6 h-6 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Overall Quality</h3>
                </div>
                <div className="text-4xl font-bold text-purple-600 mb-1">
                  {Math.round(stats.averageScores.overallQuality)}
                </div>
                <p className="text-sm text-gray-600">Average across all analyses</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Recent Score</h3>
                </div>
                <div className="text-4xl font-bold text-blue-600 mb-1">
                  {stats.recentScores ? Math.round(stats.recentScores.overallQuality) : '-'}
                </div>
                <p className="text-sm text-gray-600">Your latest analysis</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Award className="w-6 h-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Total Analyses</h3>
                </div>
                <div className="text-4xl font-bold text-green-600 mb-1">{stats.totalAnalyses}</div>
                <p className="text-sm text-gray-600">Conversations analyzed</p>
              </div>
            </div>

            {/* Score Comparisons */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Score Breakdown</h2>
              <ComparisonCards
                averageScores={stats.averageScores}
                recentScores={stats.recentScores}
              />
            </div>

            {/* Trend Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Progress Over Time</h2>
              <TrendChart history={stats.history} />
            </div>

            {/* Action Button */}
            <div className="text-center">
              <button
                onClick={() => navigate('/')}
                className="px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-lg shadow-lg hover:shadow-xl transition-all"
              >
                Analyze Another Conversation
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
