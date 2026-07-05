import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Header from '../components/layout/Header';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import {
  ArrowLeft, Sparkles, CheckCircle2, Clock, User, Mail, Hash,
  FileText, MessageSquare, Send, Loader2, Tag, AlertTriangle, XCircle, Eye,
  SpellCheck, ArrowRight as ArrowRt, MessageCircleQuestion, Lightbulb,
} from 'lucide-react';

export default function RequestDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({ ai_summary: '', ai_details: '', ai_next_action: '' });
  const [reviewValidation, setReviewValidation] = useState(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [reviewSpellingCorrections, setReviewSpellingCorrections] = useState([]);
  const [reviewFollowUpQuestions, setReviewFollowUpQuestions] = useState([]);
  const [reviewNeedsMoreInfo, setReviewNeedsMoreInfo] = useState(false);

  const fetchData = async () => {
    try {
      const [reqData, commentData] = await Promise.all([
        api.get(`/requests/${id}`),
        api.get(`/comments/${id}`),
      ]);
      setRequest(reqData);
      setComments(commentData);
      setReviewForm({
        ai_summary: reqData.ai_summary || '',
        ai_details: reqData.ai_details || '',
        ai_next_action: reqData.ai_next_action || '',
      });
    } catch (err) {
      addToast('Failed to load request', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleStatusChange = async (newStatus, extra = {}) => {
    try {
      await api.put(`/requests/${id}`, { status: newStatus, ...extra });
      addToast(`Status updated to ${newStatus}`, 'success');
      fetchData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const comment = await api.post(`/comments/${id}`, { comment: newComment });
      setComments([comment, ...comments]);
      setNewComment('');
      addToast('Comment added', 'success');
    } catch (err) {
      addToast('Failed to add comment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAction = async (commentId) => {
    try {
      await api.patch(`/comments/${commentId}/toggle`);
      setComments(comments.map((c) =>
        c.id === commentId ? { ...c, action_completed: !c.action_completed } : c
      ));
    } catch (err) {
      addToast('Failed to update', 'error');
    }
  };

  const handleGenerateNotes = async () => {
    setAiLoading(true);
    try {
      const result = await api.post('/ai/generate-notes', {
        raw_description: request.raw_description,
        request_type: request.request_type,
        priority: request.priority,
      });
      setReviewForm({
        ai_summary: result.ai_summary,
        ai_details: result.ai_details,
        ai_next_action: result.ai_next_action,
      });
      setReviewValidation(result.validation || null);
      setReviewSpellingCorrections(result.spelling_corrections || []);
      setReviewFollowUpQuestions(result.follow_up_questions || []);
      setReviewNeedsMoreInfo(result.needs_more_info || false);
      if (result.needs_more_info && result.follow_up_questions?.length > 0) {
        addToast('❓ Request is vague — see follow-up questions', 'warning');
      } else if (result.spelling_corrections?.length > 0) {
        addToast(`✏️ ${result.spelling_corrections.length} spelling correction(s) detected`, 'info');
      } else if (result.validation && !result.validation.valid) {
        addToast('⚠️ Validation issues found — review before saving', 'warning');
      } else {
        addToast('AI notes generated', 'success');
      }
    } catch (err) {
      addToast('AI generation failed', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveReview = async () => {
    try {
      await api.put(`/requests/${id}`, {
        ai_summary: reviewForm.ai_summary,
        ai_details: reviewForm.ai_details,
        ai_next_action: reviewForm.ai_next_action,
        status: 'reviewed',
      });
      addToast('Review saved and status updated', 'success');
      setShowReviewModal(false);
      fetchData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Request Details" />
        <div className="flex-1 flex items-center justify-center bg-gray-950"><LoadingSpinner size="lg" /></div>
      </>
    );
  }

  if (!request) {
    return (
      <>
        <Header title="Request Not Found" />
        <div className="flex-1 flex items-center justify-center bg-gray-950">
          <div className="text-center">
            <p className="text-gray-400">The request could not be found.</p>
            <Link to="/requests" className="btn-primary mt-4">Back to Register</Link>
          </div>
        </div>
      </>
    );
  }

  const isReadOnly = request.status === 'approved' || request.status === 'closed' || request.status === 'declined';
  const canReview = (user.role === 'supervisor' || user.role === 'admin') && request.status === 'draft';
  const canApprove = (user.role === 'supervisor' || user.role === 'admin') && request.status === 'reviewed';
  const canDecline = (user.role === 'supervisor' || user.role === 'admin') && (request.status === 'reviewed' || request.status === 'draft');
  const canClose = user.role === 'admin';

  return (
    <>
      <Header title={request.request_id} subtitle={request.requestor_name} />
      <main className="flex-1 p-6 overflow-y-auto bg-gray-950">
        <div className="max-w-5xl mx-auto">
          {/* Page Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-500 via-yellow-300 to-lime-400 p-6 mb-6" style={{ animation: 'fadeSlideUp 0.5s ease-out' }}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_60%)]" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center" style={{ animation: 'aiFloat 3s ease-in-out infinite' }}>
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">{request.request_id}</h1>
                  <p className="text-sm text-white/70">{request.requestor_name} — Request Details</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canReview && (
                  <button onClick={() => setShowReviewModal(true)} className="px-4 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium hover:bg-white/20 transition-all flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Review
                  </button>
                )}
                {canApprove && (
                  <button onClick={() => handleStatusChange('approved')} className="px-4 py-2 rounded-lg bg-green-500/20 backdrop-blur-sm border border-green-400/30 text-green-200 text-sm font-medium hover:bg-green-500/30 transition-all flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </button>
                )}
                {canDecline && (
                  <button onClick={() => setShowDeclineModal(true)} className="px-4 py-2 rounded-lg bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-red-200 text-sm font-medium hover:bg-red-500/30 transition-all flex items-center gap-2">
                    <XCircle className="w-4 h-4" /> Decline
                  </button>
                )}
                {canClose && request.status !== 'closed' && (
                  <button onClick={() => handleStatusChange('closed')} className="px-4 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium hover:bg-white/20 transition-all flex items-center gap-2">
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Back button */}
          <div className="mb-6" style={{ animation: 'fadeSlideUp 0.6s ease-out' }}>
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Request Info */}
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6" style={{ animation: 'fadeSlideUp 0.7s ease-out' }}>
                <div className="flex items-center gap-3 mb-4">
                  <StatusBadge value={request.status} />
                  <StatusBadge value={request.priority} />
                  <StatusBadge value={request.request_type} />
                  {request.is_overdue && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                      <AlertTriangle className="w-3 h-3" /> Overdue
                    </span>
                  )}
                </div>

                <h2 className="text-lg font-semibold text-white mb-2">
                  {request.ai_summary || 'Request Description'}
                </h2>

                <div className="prose prose-sm max-w-none text-gray-400 mb-4">
                  <p className="whitespace-pre-wrap">{request.raw_description}</p>
                </div>

                {request.tags && request.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
                    <Tag className="w-4 h-4 text-gray-500" />
                    {request.tags.map((tag) => (
                      <span key={tag.id || tag.tag_name} className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {tag.tag_name || tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Generated Notes */}
              {(request.ai_summary || request.ai_details || request.ai_next_action) && (
                <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6" style={{ animation: 'fadeSlideUp 0.8s ease-out' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-indigo-400" style={{ animation: 'iconGlow 2s ease-in-out infinite' }} />
                    <h3 className="text-sm font-semibold text-white">AI-Generated Notes</h3>
                  </div>
                  {request.ai_summary && (
                    <div className="mb-4">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Summary</label>
                      <p className="text-sm text-gray-300 mt-1">{request.ai_summary}</p>
                    </div>
                  )}
                  {request.ai_details && (
                    <div className="mb-4">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Details & Context</label>
                      <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap">{request.ai_details}</p>
                    </div>
                  )}
                  {request.ai_next_action && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Proposed Next Action</label>
                      <p className="text-sm text-gray-300 mt-1">{request.ai_next_action}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Comments / Follow-ups */}
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm" style={{ animation: 'fadeSlideUp 0.9s ease-out' }}>
                <div className="px-6 py-4 border-b border-white/10">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                    Follow-ups & Comments ({comments.length})
                  </h3>
                </div>

                {/* Add Comment */}
                <div className="px-6 py-4 border-b border-white/5">
                  <form onSubmit={handleAddComment} className="flex gap-3">
                    <input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                      placeholder="Add a comment or follow-up note..."
                    />
                    <button type="submit" disabled={submitting || !newComment.trim()} className="btn-primary gap-2">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Send
                    </button>
                  </form>
                </div>

                {/* Comment List */}
                <div className="divide-y divide-white/5">
                  {comments.length === 0 ? (
                    <p className="px-6 py-8 text-sm text-gray-500 text-center">No comments yet</p>
                  ) : (
                    comments.map((c, idx) => (
                      <div key={c.id} className="px-6 py-4 flex gap-3 hover:bg-white/5 transition-colors" style={{ animation: `fadeSlideUp 0.4s ease-out ${idx * 0.05}s both` }}>
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 via-yellow-300 to-lime-400 text-slate-950 text-xs font-semibold shrink-0 mt-0.5">
                          {c.author_name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-white">{c.author_name}</span>
                            <span className="text-xs text-gray-500 capitalize">{c.author_role}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(c.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400">{c.comment}</p>
                        </div>
                        <button
                          onClick={() => handleToggleAction(c.id)}
                          className={`shrink-0 mt-0.5 transition-colors ${
                            c.action_completed ? 'text-green-400' : 'text-gray-600 hover:text-gray-400'
                          }`}
                          title={c.action_completed ? 'Action completed' : 'Mark as completed'}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 space-y-4" style={{ animation: 'fadeSlideUp 0.7s ease-out 0.1s both' }}>
                <h3 className="text-sm font-semibold text-white">Details</h3>
                <InfoRow icon={Hash} label="Request ID" value={request.request_id} />
                <InfoRow icon={User} label="Requestor" value={request.requestor_name} />
                <InfoRow icon={Hash} label="Employee ID" value={request.employee_id} />
                <InfoRow icon={Mail} label="Email" value={request.email} />
                <InfoRow icon={FileText} label="Source" value={request.source_channel} />
                <InfoRow icon={User} label="Supervisor" value={request.supervisor_name || 'Unassigned'} />
                <InfoRow icon={Clock} label="Created" value={new Date(request.created_at).toLocaleString()} />
                <InfoRow
                  icon={Clock}
                  label="Due Date"
                  value={request.due_date ? new Date(request.due_date).toLocaleDateString() : '—'}
                  highlight={request.is_overdue}
                />
              </div>

              {/* Activity Timeline */}
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6" style={{ animation: 'fadeSlideUp 0.7s ease-out 0.2s both' }}>
                <h3 className="text-sm font-semibold text-white mb-4">Activity Timeline</h3>
                <div className="space-y-4">
                  <TimelineItem
                    title="Request Created"
                    time={new Date(request.created_at).toLocaleString()}
                    active
                  />
                  {request.status !== 'draft' && request.status !== 'declined' && (
                    <TimelineItem title="Reviewed" time="Status updated" active />
                  )}
                  {(request.status === 'approved' || request.status === 'closed') && (
                    <TimelineItem title="Approved" time="Request finalized" active />
                  )}
                  {request.status === 'declined' && (
                    <TimelineItem title="Declined" time="Request declined" active />
                  )}
                  {request.status === 'closed' && (
                    <TimelineItem title="Closed" time="Request completed" active />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Review Modal */}
      <Modal open={showReviewModal} onClose={() => setShowReviewModal(false)} title="Review Request" size="lg">
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Original Description</label>
            <p className="text-sm text-gray-300 mt-1">{request?.raw_description}</p>
          </div>

          <div className="flex justify-end">
            <button onClick={handleGenerateNotes} disabled={aiLoading} className="btn-primary gap-2">
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {aiLoading ? 'Generating...' : 'Generate AI Notes'}
            </button>
          </div>

          {/* Spelling Corrections */}
          {reviewSpellingCorrections.length > 0 && (
            <div className="rounded-lg border-2 border-violet-500/30 bg-violet-500/10 p-4" style={{ animation: 'fadeSlideUp 0.4s ease-out' }}>
              <div className="flex items-start gap-3">
                <SpellCheck className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-violet-300">✏️ Spelling Corrections Detected</h4>
                  <div className="mt-2 space-y-1">
                    {reviewSpellingCorrections.map((sc, i) => (
                      <div key={i} className="text-sm flex items-center gap-2">
                        <span className="text-red-400 line-through font-mono">{sc.original}</span>
                        <ArrowRt className="w-3 h-3 text-gray-500" />
                        <span className="text-green-400 font-mono font-semibold">{sc.corrected}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Follow-Up Questions */}
          {reviewNeedsMoreInfo && reviewFollowUpQuestions.length > 0 && (
            <div className="rounded-lg border-2 border-cyan-500/30 bg-cyan-500/10 p-4" style={{ animation: 'fadeSlideUp 0.5s ease-out' }}>
              <div className="flex items-start gap-3">
                <MessageCircleQuestion className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-cyan-300">❓ Request Needs Clarification</h4>
                  <p className="text-sm text-cyan-400/80 mt-1">The request is too vague — consider asking the requestor these questions:</p>
                  <div className="mt-3 space-y-2">
                    {reviewFollowUpQuestions.map((q, i) => (
                      <div key={i} className="rounded-lg bg-white/5 border border-white/10 p-3">
                        <div className="flex items-start gap-2">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">{q.question}</p>
                            {q.why && (
                              <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                                <Lightbulb className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
                                <span><strong className="text-gray-400">Why:</strong> {q.why}</span>
                              </p>
                            )}
                            {q.examples && (
                              <p className="text-xs text-gray-500 mt-0.5 ml-4">
                                <strong className="text-gray-400">Examples:</strong> {q.examples}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Validation Banners */}
          {reviewValidation && reviewValidation.validation_type === 'scope' && !reviewValidation.valid && (
            <div className="rounded-lg border-2 border-red-500/30 bg-red-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-red-300">Out of Scope</h4>
                  <p className="text-sm text-red-400 mt-1">
                    This request belongs to <span className="font-semibold">"{reviewValidation.scope_category}"</span> — outside this tool's scope.
                  </p>
                  <p className="mt-1 text-sm text-red-400">{reviewValidation.scope_suggestion}</p>
                </div>
              </div>
            </div>
          )}
          {reviewValidation && reviewValidation.validation_type === 'resource' && !reviewValidation.valid && (
            <div className="rounded-lg border-2 border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-amber-300">{reviewValidation.resource_label} — Validation Failed</h4>
                  <ul className="mt-2 space-y-1">
                    {reviewValidation.violations.map((v, i) => (
                      <li key={i} className="text-sm text-amber-400 flex items-start gap-1.5">
                        <span className="text-red-400 font-bold">✗</span><span>{v}</span>
                      </li>
                    ))}
                  </ul>
                  {reviewValidation.suggested_name && reviewValidation.suggested_name !== reviewValidation.resource_name && (
                    <p className="mt-2 text-sm text-amber-300">
                      <span className="font-semibold">Suggested:</span>{' '}
                      <code className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded font-mono text-xs border border-green-500/20">{reviewValidation.suggested_name}</code>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          {reviewValidation && reviewValidation.valid && reviewValidation.name_provided && (
            <div className="rounded-lg border-2 border-green-500/30 bg-green-500/10 p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-sm font-semibold text-green-300">
                  {reviewValidation.resource_label}: "{reviewValidation.resource_name}" — All validations passed
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Summary</label>
            <input
              value={reviewForm.ai_summary}
              onChange={(e) => setReviewForm({ ...reviewForm, ai_summary: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Details & Context</label>
            <textarea
              value={reviewForm.ai_details}
              onChange={(e) => setReviewForm({ ...reviewForm, ai_details: e.target.value })}
              className="input-field min-h-[120px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Proposed Next Action</label>
            <textarea
              value={reviewForm.ai_next_action}
              onChange={(e) => setReviewForm({ ...reviewForm, ai_next_action: e.target.value })}
              className="input-field min-h-[80px]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button onClick={() => setShowReviewModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSaveReview} className="btn-primary">Save & Mark as Reviewed</button>
          </div>
        </div>
      </Modal>

      {/* Decline Modal */}
      <Modal open={showDeclineModal} onClose={() => setShowDeclineModal(false)} title="Decline Request" size="md">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <XCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-300">
              You are about to decline request <strong>{request?.request_id}</strong>. The requestor will be notified via email.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Reason for Declining (optional)</label>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="input-field min-h-[100px]"
              placeholder="Provide a reason so the requestor understands why..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button onClick={() => setShowDeclineModal(false)} className="btn-secondary">Cancel</button>
            <button
              onClick={() => {
                handleStatusChange('declined', { decline_reason: declineReason });
                setShowDeclineModal(false);
                setDeclineReason('');
              }}
              className="btn-danger gap-2"
            >
              <XCircle className="w-4 h-4" /> Confirm Decline
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function InfoRow({ icon: Icon, label, value, highlight }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-sm font-medium ${highlight ? 'text-red-400' : 'text-gray-300'}`}>{value}</p>
      </div>
    </div>
  );
}

function TimelineItem({ title, time, active }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${active ? 'bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.5)]' : 'bg-gray-700'}`} />
        <div className="w-px flex-1 bg-white/10 mt-1" />
      </div>
      <div className="pb-4">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-gray-500">{time}</p>
      </div>
    </div>
  );
}
