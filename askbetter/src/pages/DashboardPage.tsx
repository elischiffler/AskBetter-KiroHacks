import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats, type DashboardStats } from '../lib/dashboardService';
import { Header } from '../components/Header';
import { TrendChart } from '../components/TrendChart';
import { ProgressIndicator } from '../components/ProgressIndicator';
import { ComparisonCards } from '../components/ComparisonCard';
import { PlatformBreakdown } from '../components/PlatformBreakdown';
import { ArrowLeft, BarChart3, TrendingUp, Target, Award, Layers } from 'lucide-react';

// ── design tokens ─────────────────────────────────────────────────────────────
const BG = '#0f0a1e';
const CARD_BG = '#1a1030';
const BORDER = 'rgba(139, 92, 246, 0.25)';
const TEXT_PRIMARY = '#f5f3ff';
const TEXT_MUTED = '#a78bfa';

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
      <div className="min-h-screen" style={{ backgroundColor: BG }}>
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)] pt-20">
          <div className="text-center">
            <div
              className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
              style={{ borderColor: '#7c3aed' }}
            ></div>
            <p style={{ color: TEXT_MUTED }}>Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: BG }}>
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)] pt-20">
          <div className="text-center">
            <p className="mb-4" style={{ color: '#ef4444' }}>
              {error}
            </p>
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 rounded-lg font-medium transition-all"
              style={{ backgroundColor: '#7c3aed', color: TEXT_PRIMARY }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#6d28d9')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#7c3aed')}
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
    <div className="min-h-screen" style={{ backgroundColor: BG, color: TEXT_PRIMARY }}>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Back nav */}
        <button
          onClick={() => navigate('/analyze')}
          className="flex items-center gap-2 mb-8 text-xs font-bold uppercase tracking-widest transition-all"
          style={{ color: TEXT_MUTED }}
          onMouseEnter={(e) => (e.currentTarget.style.color = TEXT_PRIMARY)}
          onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_MUTED)}
        >
          <ArrowLeft className="w-4 h-4" />
          Analyze Another Chat
        </button>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: TEXT_PRIMARY }}>
            Your Prompting Dashboard
          </h1>
          <div className="flex items-center gap-3">
            <p style={{ color: TEXT_MUTED }}>
              Track your progress and see how your prompting skills evolve over time
            </p>
            {user && (
              <span
                className="ml-auto text-xs font-medium px-3 py-1 rounded-full"
                style={{
                  backgroundColor: 'rgba(124, 58, 237, 0.15)',
                  border: `1px solid ${BORDER}`,
                  color: TEXT_MUTED,
                }}
              >
                {user.email}
              </span>
            )}
          </div>
        </div>

        {!hasData ? (
          /* Empty State */
          <div
            className="rounded-xl p-12 text-center"
            style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
          >
            <BarChart3 className="w-16 h-16 mx-auto mb-4" style={{ color: TEXT_MUTED }} />
            <h2 className="text-2xl font-semibold mb-2" style={{ color: TEXT_PRIMARY }}>
              No Data Yet
            </h2>
            <p className="mb-6" style={{ color: TEXT_MUTED }}>
              Complete your first conversation analysis to start tracking your progress!
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 rounded-lg font-medium transition-all"
              style={{ backgroundColor: '#7c3aed', color: TEXT_PRIMARY }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#6d28d9')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#7c3aed')}
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
              <div
                className="rounded-xl p-6"
                style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-6 h-6" style={{ color: '#7c3aed' }} />
                  <h3 className="text-lg font-semibold" style={{ color: TEXT_PRIMARY }}>
                    Overall Quality
                  </h3>
                </div>
                <div className="text-4xl font-bold mb-1" style={{ color: '#7c3aed' }}>
                  {Math.round(stats.averageScores.overallQuality)}
                </div>
                <p className="text-sm" style={{ color: TEXT_MUTED }}>
                  Average across all analyses
                </p>
              </div>

              <div
                className="rounded-xl p-6"
                style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-6 h-6" style={{ color: '#3b82f6' }} />
                  <h3 className="text-lg font-semibold" style={{ color: TEXT_PRIMARY }}>
                    Recent Score
                  </h3>
                </div>
                <div className="text-4xl font-bold mb-1" style={{ color: '#3b82f6' }}>
                  {stats.recentScores ? Math.round(stats.recentScores.overallQuality) : '-'}
                </div>
                <p className="text-sm" style={{ color: TEXT_MUTED }}>
                  Your latest analysis
                </p>
              </div>

              <div
                className="rounded-xl p-6"
                style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Award className="w-6 h-6" style={{ color: '#10b981' }} />
                  <h3 className="text-lg font-semibold" style={{ color: TEXT_PRIMARY }}>
                    Total Analyses
                  </h3>
                </div>
                <div className="text-4xl font-bold mb-1" style={{ color: '#10b981' }}>
                  {stats.totalAnalyses}
                </div>
                <p className="text-sm" style={{ color: TEXT_MUTED }}>
                  Conversations analyzed
                </p>
              </div>
            </div>

            {/* Score Comparisons */}
            <div
              className="rounded-xl p-6"
              style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
            >
              <h2 className="text-2xl font-bold mb-6" style={{ color: TEXT_PRIMARY }}>
                Score Breakdown
              </h2>
              <ComparisonCards
                averageScores={stats.averageScores}
                recentScores={stats.recentScores}
              />
            </div>

            {/* Trend Chart */}
            <div
              className="rounded-xl p-6"
              style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
            >
              <h2 className="text-2xl font-bold mb-6" style={{ color: TEXT_PRIMARY }}>
                Progress Over Time
              </h2>
              <TrendChart history={stats.history} />
            </div>

            {/* Platform Breakdown */}
            {Object.keys(stats.platformBreakdown).length > 0 && (
              <div
                className="rounded-xl p-6"
                style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <Layers className="w-6 h-6" style={{ color: '#7c3aed' }} />
                  <h2 className="text-2xl font-bold" style={{ color: TEXT_PRIMARY }}>
                    Platforms Used
                  </h2>
                </div>
                <PlatformBreakdown
                  breakdown={stats.platformBreakdown}
                  total={stats.totalAnalyses}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
