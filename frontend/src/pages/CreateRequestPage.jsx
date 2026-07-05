import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Header from '../components/layout/Header';
import StatusBadge from '../components/ui/StatusBadge';
import { Sparkles, Send, Loader2, AlertTriangle, CheckCircle, ShieldX, Info, PenTool, SpellCheck, MessageCircleQuestion, ArrowRight, Lightbulb } from 'lucide-react';

export default function CreateRequestPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [supervisors, setSupervisors] = useState([]);
  const [tags, setTags] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [validation, setValidation] = useState(null);
  const [aiPowered, setAiPowered] = useState(false);
  const [spellingCorrections, setSpellingCorrections] = useState([]);
  const [correctedDescription, setCorrectedDescription] = useState(null);
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [needsMoreInfo, setNeedsMoreInfo] = useState(false);

  const [form, setForm] = useState({
    requestor_name: user?.name || '',
    employee_id: '',
    email: user?.email || '',
    request_type: 'access',
    source_channel: 'portal',
    priority: 'medium',
    raw_description: '',
    ai_summary: '',
    ai_details: '',
    ai_next_action: '',
    assigned_supervisor: '',
    selectedTags: [],
  });

  useEffect(() => {
    Promise.all([
      api.get('/users/supervisors'),
      api.get('/admin/tags'),
    ]).then(([supervisorData, tagData]) => {
      setSupervisors(supervisorData);
      setTags(tagData);
    });
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleGenerateNotes = async () => {
    if (!form.raw_description.trim()) {
      addToast('Please enter a request description first', 'warning');
      return;
    }
    setAiLoading(true);
    try {
      const result = await api.post('/ai/generate-notes', {
        raw_description: form.raw_description,
        request_type: form.request_type,
        priority: form.priority,
      });

      // Map suggested tags to tag IDs
      const matchedTags = tags
        .filter((t) => result.suggested_tags.includes(t.tag_name))
        .map((t) => t.id);

      setForm({
        ...form,
        ai_summary: result.ai_summary,
        ai_details: result.ai_details,
        ai_next_action: result.ai_next_action,
        selectedTags: matchedTags,
      });
      setValidation(result.validation || null);
      setAiPowered(!!result.ai_powered);
      setAiGenerated(true);
      setSpellingCorrections(result.spelling_corrections || []);
      setCorrectedDescription(result.corrected_description || null);
      setFollowUpQuestions(result.follow_up_questions || []);
      setNeedsMoreInfo(result.needs_more_info || false);
      if (result.validation && !result.validation.valid && result.validation.validation_type === 'scope') {
        addToast('🚫 This request is outside the scope of this ticketing tool', 'error');
      } else if (result.needs_more_info && result.follow_up_questions?.length > 0) {
        addToast('❓ More details needed — please answer the follow-up questions below', 'warning');
      } else if (result.spelling_corrections?.length > 0) {
        addToast(`✏️ ${result.spelling_corrections.length} spelling correction(s) found — AI notes generated`, 'info');
      } else if (result.validation && !result.validation.valid) {
        addToast('⚠️ Validation issues found — review AI notes before submitting', 'warning');
      } else if (result.validation && result.validation.valid) {
        addToast('✅ AI notes generated — all validations passed', 'success');
      } else {
        addToast('AI notes generated successfully', 'success');
      }
    } catch (err) {
      addToast('Failed to generate AI notes', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.requestor_name || !form.employee_id || !form.email || !form.raw_description) {
      addToast('Please fill in all required fields', 'error');
      return;
    }

    // ── MANDATORY AI VALIDATION ──
    // If not yet validated, auto-run AI analysis first
    if (!aiGenerated) {
      addToast('🤖 Running AI validation on your request...', 'info');
      setAiLoading(true);
      try {
        const result = await api.post('/ai/generate-notes', {
          raw_description: form.raw_description,
          request_type: form.request_type,
          priority: form.priority,
        });
        const matchedTags = tags.filter((t) => result.suggested_tags.includes(t.tag_name)).map((t) => t.id);
        setForm((prev) => ({
          ...prev,
          ai_summary: result.ai_summary,
          ai_details: result.ai_details,
          ai_next_action: result.ai_next_action,
          selectedTags: matchedTags,
        }));
        setValidation(result.validation || null);
        setAiPowered(!!result.ai_powered);
        setAiGenerated(true);
        setSpellingCorrections(result.spelling_corrections || []);
        setCorrectedDescription(result.corrected_description || null);
        setFollowUpQuestions(result.follow_up_questions || []);
        setNeedsMoreInfo(result.needs_more_info || false);

        // Block out-of-scope immediately
        if (result.validation && !result.validation.valid && result.validation.validation_type === 'scope') {
          addToast('🚫 This request is out of scope and cannot be submitted here.', 'error');
          setAiLoading(false);
          return;
        }
        if (result.validation && !result.validation.valid) {
          addToast('⚠️ Validation issues detected — please review before submitting.', 'warning');
          setAiLoading(false);
          return;
        }
      } catch (err) {
        addToast('AI validation failed. Please try again.', 'error');
        setAiLoading(false);
        return;
      }
      setAiLoading(false);
    }

    // Block submission if scope is invalid
    if (validation && !validation.valid && validation.validation_type === 'scope') {
      addToast('🚫 Cannot submit — this request is outside the scope of this ticketing tool.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        requestor_name: form.requestor_name,
        employee_id: form.employee_id,
        email: form.email,
        request_type: form.request_type,
        source_channel: form.source_channel,
        priority: form.priority,
        raw_description: form.raw_description,
        assigned_supervisor: form.assigned_supervisor ? parseInt(form.assigned_supervisor) : null,
      };

      const created = await api.post('/requests', payload);

      // If AI notes generated, update with AI data
      if (aiGenerated) {
        await api.put(`/requests/${created.id}`, {
          ai_summary: form.ai_summary,
          ai_details: form.ai_details,
          ai_next_action: form.ai_next_action,
          tags: form.selectedTags,
        });
      }

      addToast('Request created successfully', 'success');
      navigate(`/requests/${created.id}`);
    } catch (err) {
      addToast(err.message || 'Failed to create request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTag = (tagId) => {
    setForm((prev) => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tagId)
        ? prev.selectedTags.filter((id) => id !== tagId)
        : [...prev.selectedTags, tagId],
    }));
  };

  return (
    <>
      <Header title="Create Request" subtitle="Submit a new internal request" />
      <main className="flex-1 p-6 overflow-y-auto bg-gray-950">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
          {/* Page Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-500 via-yellow-300 to-lime-400 p-6" style={{ animation: 'fadeSlideUp 0.5s ease-out' }}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_60%)]" />
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center" style={{ animation: 'aiFloat 3s ease-in-out infinite' }}>
                <PenTool className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Create New Request</h1>
                <p className="text-sm text-white/70">Submit a new internal IT request with AI-powered documentation</p>
              </div>
            </div>
          </div>

          {/* Requestor Info */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6" style={{ animation: 'fadeSlideUp 0.6s ease-out' }}>
            <h3 className="text-sm font-semibold text-white mb-4">Requestor Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Requestor Name *</label>
                <input
                  name="requestor_name"
                  value={form.requestor_name}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Full name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Employee ID *</label>
                <input
                  name="employee_id"
                  value={form.employee_id}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="EMP001"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Email *</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>
          </div>

          {/* Request Details */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6" style={{ animation: 'fadeSlideUp 0.7s ease-out' }}>
            <h3 className="text-sm font-semibold text-white mb-4">Request Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Request Type *</label>
                <select name="request_type" value={form.request_type} onChange={handleChange} className="input-field">
                  <option value="access">Access</option>
                  <option value="issue">Issue</option>
                  <option value="information">Information</option>
                  <option value="change">Change</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Source Channel *</label>
                <select name="source_channel" value={form.source_channel} onChange={handleChange} className="input-field">
                  <option value="email">Email</option>
                  <option value="portal">Portal</option>
                  <option value="chat">Chat</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Priority *</label>
                <select name="priority" value={form.priority} onChange={handleChange} className="input-field">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Assign Supervisor</label>
              <select name="assigned_supervisor" value={form.assigned_supervisor} onChange={handleChange} className="input-field">
                <option value="">Auto-assign</option>
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Request Description *</label>
              <textarea
                name="raw_description"
                value={form.raw_description}
                onChange={handleChange}
                className="input-field min-h-[120px]"
                placeholder="Describe your request in detail..."
                required
              />
            </div>
          </div>

          {/* AI Generation */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6" style={{ animation: 'fadeSlideUp 0.8s ease-out' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  AI-Generated Notes
                  {aiPowered && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-medium text-indigo-400 uppercase tracking-wider">
                      <Sparkles className="w-3 h-3" /> Gemini AI
                    </span>
                  )}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Generate structured documentation with AI-powered analysis</p>
              </div>
              <button
                type="button"
                onClick={handleGenerateNotes}
                disabled={aiLoading}
                className="btn-primary gap-2"
              >
                {aiLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generate AI Notes</>
                )}
              </button>
            </div>

            {aiGenerated && (
              <div className="space-y-4 mt-4 pt-4 border-t border-white/10">
                {/* Spelling Corrections Banner */}
                {spellingCorrections.length > 0 && (
                  <div className="rounded-lg border-2 border-violet-500/30 bg-violet-500/10 p-4" style={{ animation: 'fadeSlideUp 0.4s ease-out' }}>
                    <div className="flex items-start gap-3">
                      <SpellCheck className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-violet-300 flex items-center gap-2">
                          ✏️ Spelling Corrections Detected
                        </h4>
                        <div className="mt-2 space-y-1">
                          {spellingCorrections.map((sc, i) => (
                            <div key={i} className="text-sm flex items-center gap-2">
                              <span className="text-red-400 line-through font-mono">{sc.original}</span>
                              <ArrowRight className="w-3 h-3 text-gray-500" />
                              <span className="text-green-400 font-mono font-semibold">{sc.corrected}</span>
                            </div>
                          ))}
                        </div>
                        {correctedDescription && (
                          <div className="mt-3 pt-3 border-t border-violet-500/20">
                            <p className="text-xs text-violet-400 uppercase tracking-wider font-semibold mb-1">Corrected Description:</p>
                            <p className="text-sm text-gray-300 italic">"{correctedDescription}"</p>
                            <button
                              type="button"
                              onClick={() => setForm(prev => ({ ...prev, raw_description: correctedDescription }))}
                              className="mt-2 px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-medium hover:bg-violet-500/30 transition-all"
                            >
                              Apply Corrected Description
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Follow-Up Questions Banner */}
                {needsMoreInfo && followUpQuestions.length > 0 && (
                  <div className="rounded-lg border-2 border-cyan-500/30 bg-cyan-500/10 p-4" style={{ animation: 'fadeSlideUp 0.5s ease-out' }}>
                    <div className="flex items-start gap-3">
                      <MessageCircleQuestion className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                          ❓ More Information Needed — Please Clarify
                        </h4>
                        <p className="text-sm text-cyan-400/80 mt-1">
                          Your request is too vague to process accurately. Please update your description with answers to these questions:
                        </p>
                        <div className="mt-3 space-y-3">
                          {followUpQuestions.map((q, i) => (
                            <div key={i} className="rounded-lg bg-white/5 border border-white/10 p-3" style={{ animation: `fadeSlideUp 0.4s ease-out ${0.1 * (i + 1)}s both` }}>
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
                        <p className="mt-3 text-xs text-cyan-400/60">
                          💡 Update your description above with these details, then click "Generate AI Notes" again.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Out of Scope Banner */}
                {validation && validation.validation_type === 'scope' && !validation.valid && (
                  <div className="rounded-lg border-2 border-red-500/30 bg-red-500/10 p-4">
                    <div className="flex items-start gap-3">
                      <ShieldX className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-red-300">
                          🚫 Out of Scope — Cannot Be Handled Here
                        </h4>
                        <p className="text-sm text-red-400 mt-1">
                          This request belongs to <span className="font-semibold">"{validation.scope_category}"</span> which is outside this IT ticketing tool's scope.
                        </p>
                        <p className="mt-2 text-sm text-red-400">
                          <span className="font-semibold">Recommendation:</span> {validation.scope_suggestion}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Resource Validation Warning Banner */}
                {validation && validation.validation_type === 'resource' && !validation.valid && (
                  <div className="rounded-lg border-2 border-amber-500/30 bg-amber-500/10 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-amber-300">
                          ⚠️ {validation.resource_label} — Validation Failed
                        </h4>
                        {validation.resource_name && (
                          <p className="text-sm text-amber-400 mt-1">
                            The value <span className="font-mono font-bold">"{validation.resource_name}"</span> violates the following rules:
                          </p>
                        )}
                        <ul className="mt-2 space-y-1">
                          {validation.violations.map((v, i) => (
                            <li key={i} className="text-sm text-amber-400 flex items-start gap-1.5">
                              <span className="text-red-400 font-bold">✗</span>
                              <span>{v}</span>
                            </li>
                          ))}
                        </ul>
                        {validation.requirements && validation.requirements.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-amber-500/20">
                            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">Naming Requirements:</p>
                            <ul className="space-y-0.5">
                              {validation.requirements.map((r, i) => (
                                <li key={i} className="text-xs text-amber-400">• {r}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {validation.suggested_name && validation.suggested_name !== validation.resource_name && (
                          <p className="mt-3 text-sm text-amber-300">
                            <span className="font-semibold">Suggested fix:</span>{' '}
                            <code className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded font-mono text-xs border border-green-500/20">
                              {validation.suggested_name}
                            </code>
                          </p>
                        )}
                        {validation.rules_reference && (
                          <p className="mt-2 text-xs text-amber-500">
                            Reference: {validation.rules_reference}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Resource Validation — No Name Provided */}
                {validation && validation.validation_type === 'resource' && !validation.name_provided && (
                  <div className="rounded-lg border-2 border-blue-500/30 bg-blue-500/10 p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-blue-300">
                          ℹ️ {validation.resource_label} Detected — Name Not Found
                        </h4>
                        <p className="text-sm text-blue-400 mt-1">
                          A {validation.resource_label} request was detected, but no resource name was provided. Please include the intended name for validation.
                        </p>
                        {validation.requirements && validation.requirements.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">Naming Requirements:</p>
                            <ul className="space-y-0.5">
                              {validation.requirements.map((r, i) => (
                                <li key={i} className="text-xs text-blue-400">• {r}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Validation Success Banner */}
                {validation && validation.valid && validation.name_provided && (
                  <div className="rounded-lg border-2 border-green-500/30 bg-green-500/10 p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-green-300">
                          ✅ {validation.resource_label} — All Validations Passed
                        </h4>
                        <p className="text-sm text-green-400 mt-0.5">
                          <span className="font-mono font-bold">"{validation.resource_name}"</span> meets all naming requirements.
                        </p>
                        {validation.requirements && validation.requirements.length > 0 && (
                          <div className="mt-2">
                            <ul className="space-y-0.5">
                              {validation.requirements.map((r, i) => (
                                <li key={i} className="text-xs text-green-400">✓ {r}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Request Summary</label>
                  <input
                    name="ai_summary"
                    value={form.ai_summary}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Details / Context</label>
                  <textarea
                    name="ai_details"
                    value={form.ai_details}
                    onChange={handleChange}
                    className="input-field min-h-[120px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Proposed Next Action</label>
                  <textarea
                    name="ai_next_action"
                    value={form.ai_next_action}
                    onChange={handleChange}
                    className="input-field min-h-[80px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Suggested Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                          form.selectedTags.includes(tag.id)
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 shadow-sm'
                            : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {tag.tag_name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary gap-2">
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
              ) : (
                <><Send className="w-4 h-4" /> Create Request</>
              )}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}
