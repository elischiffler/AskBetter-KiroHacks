import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, ArrowRight, Loader2, Inbox } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { fetchHistory, deleteHistory, type ChatHistoryRow } from '../lib/chatHistory';

const BG = '#0f0a1e';
const CARD_BG = '#1a1030';
const BORDER = 'rgba(139, 92, 246, 0.25)';
const TEXT_PRIMARY = '#f5f3ff';
const TEXT_MUTED = '#a78bfa';
const TEXT_DIM = '#6b5fa0';

function scoreColor(score: number): string {
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#facc15';
  return '#f87171';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ChatHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchHistory(user.id)
      .then(setRows)
      .catch(() => setError('Failed to load history.'))
      .finally(() => setLoading(false));
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this analysis? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await deleteHistory(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError('Failed to delete entry.');
    } finally {
      setDeletingId(null);
    }
  };

  const openResult = (row: ChatHistoryRow) => {
    navigate('/results', { state: { result: row.analysis_result } });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG, color: TEXT_PRIMARY }}>
      <Header />

      <div className="flex justify-center items-start px-4 pt-28 pb-24">
        <div className="w-full max-w-2xl">
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

          <p
            className="text-xs font-semibold tracking-widest uppercase mb-3 text-center"
            style={{ color: TEXT_MUTED }}
          >
            Your Analyses
          </p>
          <h1
            className="text-3xl font-black uppercase text-center mb-10"
            style={{ color: TEXT_PRIMARY }}
          >
            Chat History
          </h1>

          {loading && (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: TEXT_MUTED }} />
            </div>
          )}

          {error && (
            <p className="text-center text-sm mb-6" style={{ color: '#f87171' }}>
              {error}
            </p>
          )}

          {!loading && rows.length === 0 && (
            <div className="flex flex-col items-center py-20 gap-4">
              <Inbox className="w-12 h-12" style={{ color: TEXT_DIM }} />
              <p className="text-sm" style={{ color: TEXT_DIM }}>
                No analyses yet. Go analyze a chat to get started.
              </p>
              <button
                onClick={() => navigate('/analyze')}
                className="mt-2 px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-all active:scale-95"
                style={{ backgroundColor: '#7c3aed', color: TEXT_PRIMARY }}
              >
                Analyze a Chat
              </button>
            </div>
          )}

          {!loading && rows.length > 0 && (
            <div className="space-y-3">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl p-5 flex items-center gap-4 group transition-all"
                  style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
                >
                  {/* Score badge */}
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black"
                    style={{
                      backgroundColor: 'rgba(139,92,246,0.1)',
                      color: scoreColor(row.overall_score),
                    }}
                  >
                    {row.overall_score}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ color: TEXT_PRIMARY }}
                    >
                      {row.title}
                    </p>
                    <p className="text-xs mt-1" style={{ color: TEXT_DIM }}>
                      {row.prompt_count} prompt{row.prompt_count !== 1 ? 's' : ''} · {formatDate(row.created_at)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => void handleDelete(row.id)}
                      disabled={deletingId === row.id}
                      className="p-2 rounded-lg transition-all hover:bg-white/5"
                      style={{ color: TEXT_DIM }}
                      title="Delete"
                    >
                      {deletingId === row.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => openResult(row)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
                      style={{
                        backgroundColor: '#7c3aed',
                        color: TEXT_PRIMARY,
                      }}
                    >
                      View
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
