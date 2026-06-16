import React, { useState } from 'react';
import { X, Layers, BookOpen, Bug as BugIcon, CheckSquare, Zap } from 'lucide-react';
import { Task, TicketType, Sprint, TICKET_TYPE_CONFIG, DevTeamMember } from '../../types';

interface CreateTicketModalProps {
  allTasks: Task[];
  allSprints: Sprint[];
  defaultSprintId?: string;
  defaultParentId?: string;      // Pre-fill parent (e.g. "File Bug" from a Story card)
  defaultType?: TicketType;      // Skip type picker (e.g. QA always gets Bug)
  devTeam: DevTeamMember[];
  userRole?: string;
  onSave: (task: Task) => void;
  onClose: () => void;
}

const TYPE_DESCRIPTIONS: Record<TicketType, string> = {
  Epic:  'A large body of work spanning multiple sprints',
  Story: 'A user-facing feature or requirement',
  Bug:   'A defect linked to a User Story',
  Task:  'A technical work item (optionally under a Story)',
  Spike: 'A time-boxed research or investigation',
};

const ICONS: Record<TicketType, React.ReactNode> = {
  Epic:  <Layers className="w-6 h-6" />,
  Story: <BookOpen className="w-6 h-6" />,
  Bug:   <BugIcon className="w-6 h-6" />,
  Task:  <CheckSquare className="w-6 h-6" />,
  Spike: <Zap className="w-6 h-6" />,
};

const ALLOWED_TYPES: Record<string, TicketType[]> = {
  DEV_LEAD:   ['Epic', 'Story', 'Task', 'Bug', 'Spike'],
  PM:         ['Epic', 'Story', 'Task', 'Bug', 'Spike'],
  QA:         ['Bug'],
  DEV:        [],
  BA:         [],
  MANAGEMENT: [],
  SUPER_ADMIN:['Epic', 'Story', 'Task', 'Bug', 'Spike'],
};

const ID_PREFIX: Record<TicketType, string> = {
  Epic: 'EPIC', Story: 'STORY', Bug: 'BUG', Task: 'TASK', Spike: 'SPIKE',
};

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  allTasks, allSprints, defaultSprintId, defaultParentId, defaultType,
  devTeam, userRole, onSave, onClose,
}) => {
  const allowedTypesBase = ALLOWED_TYPES[userRole || ''] || [];
  const parentTask = defaultParentId ? allTasks.find(t => t.id === defaultParentId) : null;
  const parentType = parentTask?.ticketType;

  const allowedTypes = defaultParentId 
    ? allowedTypesBase.filter(t => {
        if (t === 'Epic') return false;
        if (parentType === 'Story' && t === 'Story') return false;
        return true;
      }) 
    : allowedTypesBase;

  const initType = defaultType ?? (allowedTypes.length === 1 ? allowedTypes[0] : null);
  const [step, setStep] = useState<1 | 2>(initType ? 2 : 1);
  const [selectedType, setSelectedType] = useState<TicketType | null>(initType);

  const [form, setForm] = useState({
    title: '',
    description: '',
    assignee: '',
    storyPoints: '',
    sprintId: defaultSprintId || '',
    parentId: defaultParentId || '',
    specLink: '',
    figmaLink: '',
    businessGoal: '',
    targetReleaseDate: '',
    timeboxDays: '',
    researchQuestion: '',
    bugEnvironment: '' as '' | 'Production' | 'Staging' | 'Dev',
    bugSteps: '',
    bugExpected: '',
    bugActual: '',
    priority: 'Medium' as Task['priority'],
    codeReviewer: '',
    qaTester: '',
    startDate: '',
    dueDate: '',
  });

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const epics   = allTasks.filter(t => t.ticketType === 'Epic');
  const stories = allTasks.filter(t => t.ticketType === 'Story');

  // Bug hierarchy context
  const parentStory     = form.parentId ? stories.find(s => s.id === form.parentId) : null;
  const grandparentEpic = parentStory?.parentId ? epics.find(e => e.id === parentStory.parentId) : null;

  const cfg = selectedType ? TICKET_TYPE_CONFIG[selectedType] : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;

    const sprint = allSprints.find(s => s.id === form.sprintId);
    const today  = new Date().toISOString().split('T')[0];

    const task: Task = {
      id:          `${ID_PREFIX[selectedType]}-${Date.now()}`,
      ticketType:  selectedType,
      title:       form.title,
      description: form.description || undefined,
      assignee:    form.assignee || 'Unassigned',
      sprintId:    form.sprintId || undefined,
      parentId:    form.parentId || undefined,
      storyPoints: form.storyPoints ? parseInt(form.storyPoints) : undefined,
      status:      'To Do',
      startDate:   form.startDate || sprint?.startDate || today,
      dueDate:     form.dueDate || sprint?.endDate || today,
      priority:    form.priority,
      codeReviewer:form.codeReviewer || undefined,
      qaTester:    form.qaTester || undefined,
      effort:      1,
      specLink:    form.specLink  || undefined,
      figmaLink:   form.figmaLink || undefined,
      // Epic
      businessGoal:      form.businessGoal      || undefined,
      targetReleaseDate: form.targetReleaseDate || undefined,
      // Bug
      bugEnvironment: (form.bugEnvironment as Task['bugEnvironment']) || undefined,
      bugSteps:       form.bugSteps    || undefined,
      bugExpected:    form.bugExpected || undefined,
      bugActual:      form.bugActual   || undefined,
      qaStatus:       selectedType === 'Bug' ? 'Open' : undefined,
      // Spike
      timeboxDays:      form.timeboxDays      ? parseInt(form.timeboxDays)      : undefined,
      researchQuestion: form.researchQuestion || undefined,
    };

    onSave(task);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 sm:p-0">
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />

        <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl text-left overflow-hidden my-8 z-10">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              {step === 2 && cfg && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${cfg.bgLight} ${cfg.textColor} ${cfg.borderColor}`}>
                  {selectedType}
                </span>
              )}
              <h2 className="text-lg font-bold text-gray-900">
                {step === 1 ? 'What are you creating?' : `New ${selectedType}`}
              </h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── STEP 1: Type Picker ── */}
          {step === 1 && (
            <div className="p-5 space-y-2">
              {allowedTypes.map(type => {
                const c = TICKET_TYPE_CONFIG[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => { setSelectedType(type); setStep(2); }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all hover:shadow-md hover:scale-[1.01] ${c.borderColor} ${c.bgLight}`}
                  >
                    <span className={`p-2 rounded-lg ${c.color} text-white flex-shrink-0`}>
                      {ICONS[type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold ${c.textColor}`}>{c.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{TYPE_DESCRIPTIONS[type]}</div>
                    </div>
                    <span className="text-gray-400 text-lg">›</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── STEP 2: Form ── */}
          {step === 2 && selectedType && (
            <form onSubmit={handleSubmit} className="max-h-[78vh] overflow-y-auto">
              <div className="p-5 space-y-4">

                {/* Bug: parent Story (required) + Epic context */}
                {selectedType === 'Bug' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Parent Story <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={form.parentId}
                        onChange={e => set('parentId', e.target.value)}
                        className="block w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-red-500 focus:border-red-500 bg-white"
                      >
                        <option value="">Select the Story this bug belongs to...</option>
                        {stories.map(s => (
                          <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                      </select>
                    </div>
                    {grandparentEpic && (
                      <div className="flex items-center gap-2 text-xs bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                        <Layers className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                        <span className="text-gray-500">Epic:</span>
                        <span className="font-semibold text-purple-700">{grandparentEpic.title}</span>
                      </div>
                    )}
                    {parentStory && !grandparentEpic && (
                      <div className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                        Story has no parent Epic assigned.
                      </div>
                    )}
                  </div>
                )}

                {/* Story: parent Epic (required) */}
                {selectedType === 'Story' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Parent Epic <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={form.parentId}
                      onChange={e => set('parentId', e.target.value)}
                      className="block w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="">Select the Epic this story belongs to...</option>
                      {epics.map(ep => (
                        <option key={ep.id} value={ep.id}>{ep.title}</option>
                      ))}
                    </select>
                    {epics.length === 0 && (
                      <p className="mt-1 text-xs text-amber-600">No Epics exist yet — create an Epic first.</p>
                    )}
                  </div>
                )}

                {/* Task: parent Story (optional) */}
                {selectedType === 'Task' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Parent Story <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <select
                      value={form.parentId}
                      onChange={e => set('parentId', e.target.value)}
                      className="block w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-gray-400 focus:border-gray-400 bg-white"
                    >
                      <option value="">None — standalone task</option>
                      {stories.map(s => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                    placeholder={
                      selectedType === 'Epic'  ? 'e.g. Payment Gateway Revamp' :
                      selectedType === 'Story' ? 'e.g. User can save card details' :
                      selectedType === 'Bug'   ? 'e.g. Card not saving on iOS Safari' :
                      selectedType === 'Spike' ? 'e.g. Investigate WebSocket vs polling' :
                                                 'e.g. Set up CI pipeline'
                    }
                    className="block w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    placeholder="Provide context and details..."
                    className="block w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>

                {/* Epic: business goal + release date */}
                {selectedType === 'Epic' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Business Goal</label>
                      <input
                        type="text"
                        value={form.businessGoal}
                        onChange={e => set('businessGoal', e.target.value)}
                        placeholder="What outcome does this achieve?"
                        className="block w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-violet-500 focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Target Release</label>
                      <input
                        type="date"
                        value={form.targetReleaseDate}
                        onChange={e => set('targetReleaseDate', e.target.value)}
                        className="block w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-violet-500 focus:border-violet-500"
                      />
                    </div>
                  </div>
                )}

                {/* Bug specific fields */}
                {selectedType === 'Bug' && (
                  <div className="space-y-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                    <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Bug Details</p>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Environment <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={form.bugEnvironment}
                        onChange={e => set('bugEnvironment', e.target.value)}
                        className="block w-full border border-red-200 rounded-xl px-3 py-2 text-sm focus:ring-red-400 focus:border-red-400 bg-white"
                      >
                        <option value="">Select environment...</option>
                        <option value="Production">🔴 Production</option>
                        <option value="Staging">🟡 Staging</option>
                        <option value="Dev">🟢 Dev</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Steps to Reproduce</label>
                      <textarea
                        rows={3}
                        value={form.bugSteps}
                        onChange={e => set('bugSteps', e.target.value)}
                        placeholder="1. Go to... 2. Click... 3. See error"
                        className="block w-full border border-red-200 rounded-xl px-3 py-2 text-sm focus:ring-red-400 focus:border-red-400"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Expected</label>
                        <textarea
                          rows={2}
                          value={form.bugExpected}
                          onChange={e => set('bugExpected', e.target.value)}
                          placeholder="What should happen"
                          className="block w-full border border-red-200 rounded-xl px-3 py-2 text-sm focus:ring-red-400 focus:border-red-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Actual</label>
                        <textarea
                          rows={2}
                          value={form.bugActual}
                          onChange={e => set('bugActual', e.target.value)}
                          placeholder="What actually happens"
                          className="block w-full border border-red-200 rounded-xl px-3 py-2 text-sm focus:ring-red-400 focus:border-red-400"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Spike fields */}
                {selectedType === 'Spike' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Research Question</label>
                      <input
                        type="text"
                        value={form.researchQuestion}
                        onChange={e => set('researchQuestion', e.target.value)}
                        placeholder="What are we trying to learn?"
                        className="block w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-violet-500 focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Timebox (days)</label>
                      <input
                        type="number"
                        min={1}
                        value={form.timeboxDays}
                        onChange={e => set('timeboxDays', e.target.value)}
                        className="block w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-violet-500 focus:border-violet-500"
                      />
                    </div>
                  </div>
                )}

                {/* Assignee + Story Points */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Assignee</label>
                    <select
                      value={form.assignee}
                      onChange={e => set('assignee', e.target.value)}
                      className="block w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-violet-500 focus:border-violet-500 bg-white"
                    >
                      <option value="">Unassigned</option>
                      {devTeam.map(m => (
                        <option key={m.id} value={m.name}>{m.name} — {m.role}</option>
                      ))}
                    </select>
                  </div>
                  {selectedType !== 'Epic' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Story Points</label>
                      <input
                        type="number"
                        min={0}
                        value={form.storyPoints}
                        onChange={e => set('storyPoints', e.target.value)}
                        placeholder="e.g. 3"
                        className="block w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-violet-500 focus:border-violet-500"
                      />
                    </div>
                  )}
                </div>

                {/* Additional Jira Fields */}
                {selectedType !== 'Epic' && (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
                        <select
                          value={form.priority}
                          onChange={e => set('priority', e.target.value)}
                          className="block w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-violet-500 focus:border-violet-500 bg-white"
                        >
                          <option value="Highest">Highest</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                          <option value="Lowest">Lowest</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={form.startDate}
                          onChange={e => set('startDate', e.target.value)}
                          className="block w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-violet-500 focus:border-violet-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Due Date</label>
                        <input
                          type="date"
                          value={form.dueDate}
                          onChange={e => set('dueDate', e.target.value)}
                          className="block w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-violet-500 focus:border-violet-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Code Reviewer</label>
                        <select
                          value={form.codeReviewer}
                          onChange={e => set('codeReviewer', e.target.value)}
                          className="block w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-violet-500 focus:border-violet-500 bg-white"
                        >
                          <option value="">Unassigned</option>
                          {devTeam.map(m => (
                            <option key={m.id} value={m.name}>{m.name} — {m.role}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">QA Tester</label>
                        <select
                          value={form.qaTester}
                          onChange={e => set('qaTester', e.target.value)}
                          className="block w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-violet-500 focus:border-violet-500 bg-white"
                        >
                          <option value="">Unassigned</option>
                          {devTeam.map(m => (
                            <option key={m.id} value={m.name}>{m.name} — {m.role}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* Sprint selector */}
                {selectedType !== 'Epic' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Sprint</label>
                    <select
                      value={form.sprintId}
                      onChange={e => set('sprintId', e.target.value)}
                      className="block w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-violet-500 focus:border-violet-500 bg-white"
                    >
                      <option value="">Backlog (no sprint assigned)</option>
                      {allSprints.map(s => (
                        <option key={s.id} value={s.id}>{s.name} — {s.status}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Spec + Figma links (not for Bug) */}
                {selectedType !== 'Bug' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Spec / Doc Link</label>
                      <input
                        type="url"
                        value={form.specLink}
                        onChange={e => set('specLink', e.target.value)}
                        placeholder="https://notion.so/..."
                        className="block w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-violet-500 focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Figma Link</label>
                      <input
                        type="url"
                        value={form.figmaLink}
                        onChange={e => set('figmaLink', e.target.value)}
                        placeholder="https://figma.com/..."
                        className="block w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-violet-500 focus:border-violet-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex justify-between items-center">
                {allowedTypes.length > 1 && !defaultType ? (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
                  >
                    ← Change type
                  </button>
                ) : <div />}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-5 py-2 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 ${cfg?.color ?? 'bg-violet-600'}`}
                  >
                    Create {selectedType}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
