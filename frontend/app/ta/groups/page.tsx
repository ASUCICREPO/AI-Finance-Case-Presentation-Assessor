'use client';

import { useState, useEffect } from 'react';
import {
  UsersRound,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  UserPlus,
  UserMinus,
  X,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  listGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  addGroupMembers,
  removeGroupMembers,
  listStudents,
  Group,
  Student,
} from '../../services/api';

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [managingMembers, setManagingMembers] = useState<Group | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const [groupsRes, studentsRes] = await Promise.all([
        listGroups(undefined, true),
        listStudents(),
      ]);
      setGroups(groupsRes.groups);
      setStudents(studentsRes.students);
    } catch (err) {
      setError('Failed to load groups. Please try again.');
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  }

  // Filter groups by search
  const filteredGroups = groups.filter(group => {
    const search = searchQuery.toLowerCase();
    return (
      group.groupName.toLowerCase().includes(search) ||
      group.description?.toLowerCase().includes(search)
    );
  });

  function toggleExpand(groupId: string) {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Groups</h1>
          <p className="mt-1 text-sm text-gray-500 font-sans">
            Organize students into groups for assessments
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-lg bg-maroon-600 px-4 py-2 text-sm font-medium text-white hover:bg-maroon-700 transition-colors"
        >
          <Plus size={16} />
          Create Group
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} />
          {error}
          <button onClick={fetchData} className="ml-auto underline">Retry</button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-maroon-600" />
        </div>
      ) : (
        /* Groups Grid */
        <div className="space-y-4">
          {filteredGroups.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <UsersRound size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">
                {searchQuery ? 'No groups match your search' : 'No groups created yet'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 text-sm text-maroon-600 hover:underline"
                >
                  Create your first group
                </button>
              )}
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.groupId} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                {/* Group Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <button
                    onClick={() => toggleExpand(group.groupId)}
                    className="flex items-center gap-3 text-left"
                  >
                    {expandedGroups.has(group.groupId) ? (
                      <ChevronDown size={20} className="text-gray-400" />
                    ) : (
                      <ChevronRight size={20} className="text-gray-400" />
                    )}
                    <div className="h-10 w-10 rounded-lg bg-maroon-100 flex items-center justify-center">
                      <UsersRound size={20} className="text-maroon-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{group.groupName}</h3>
                      <p className="text-sm text-gray-500">
                        {group.studentIds?.length || 0} of {group.maxSize} students
                        {group.description && ` • ${group.description}`}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      group.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {group.status}
                    </span>
                    <div className="relative">
                      <button
                        onClick={() => setActionMenuOpen(actionMenuOpen === group.groupId ? null : group.groupId)}
                        className="p-1.5 rounded hover:bg-gray-100"
                      >
                        <MoreVertical size={18} className="text-gray-400" />
                      </button>
                      {actionMenuOpen === group.groupId && (
                        <div className="absolute right-0 mt-1 w-44 rounded-lg border border-gray-200 bg-white shadow-lg z-10">
                          <button
                            onClick={() => {
                              setManagingMembers(group);
                              setActionMenuOpen(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <UserPlus size={14} /> Manage Members
                          </button>
                          <button
                            onClick={() => {
                              setEditingGroup(group);
                              setShowAddModal(true);
                              setActionMenuOpen(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit2 size={14} /> Edit Group
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('Are you sure you want to delete this group?')) {
                                await deleteGroup(group.groupId);
                                fetchData();
                              }
                              setActionMenuOpen(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} /> Delete Group
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Members */}
                {expandedGroups.has(group.groupId) && (
                  <div className="p-4 bg-gray-50">
                    {group.students && group.students.length > 0 ? (
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {group.students.map((student) => (
                          <div
                            key={student.studentId}
                            className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 border border-gray-200"
                          >
                            <div className="h-7 w-7 rounded-full bg-maroon-100 flex items-center justify-center">
                              <span className="text-xs font-medium text-maroon-600">
                                {student.firstName[0]}{student.lastName[0]}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {student.firstName} {student.lastName}
                              </p>
                              <p className="text-xs text-gray-500 truncate">{student.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-2">No students in this group</p>
                    )}
                    <button
                      onClick={() => setManagingMembers(group)}
                      className="mt-3 text-sm text-maroon-600 hover:underline"
                    >
                      + Add students to this group
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Summary */}
      <div className="mt-4 text-sm text-gray-500">
        {groups.length} groups • {students.filter(s => s.groupId).length} students assigned
      </div>

      {/* Add/Edit Group Modal */}
      {showAddModal && (
        <GroupModal
          group={editingGroup}
          onClose={() => {
            setShowAddModal(false);
            setEditingGroup(null);
          }}
          onSave={async (data) => {
            if (editingGroup) {
              await updateGroup(editingGroup.groupId, data);
            } else {
              await createGroup(data);
            }
            fetchData();
            setShowAddModal(false);
            setEditingGroup(null);
          }}
        />
      )}

      {/* Manage Members Modal */}
      {managingMembers && (
        <MembersModal
          group={managingMembers}
          allStudents={students}
          onClose={() => setManagingMembers(null)}
          onAddMembers={async (studentIds) => {
            await addGroupMembers(managingMembers.groupId, studentIds);
            fetchData();
          }}
          onRemoveMembers={async (studentIds) => {
            await removeGroupMembers(managingMembers.groupId, studentIds);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

// Group Modal
function GroupModal({
  group,
  onClose,
  onSave,
}: {
  group: Group | null;
  onClose: () => void;
  onSave: (data: Partial<Group>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    groupName: group?.groupName || '',
    description: group?.description || '',
    maxSize: group?.maxSize || 10,
    assessmentId: group?.assessmentId || 'default-assessment',
    status: group?.status || 'Active',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.groupName) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 font-serif">
            {group ? 'Edit Group' : 'Create Group'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group Name *</label>
            <input
              type="text"
              value={form.groupName}
              onChange={(e) => setForm({ ...form, groupName: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
              placeholder="e.g., Group A"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
              placeholder="Optional description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Size</label>
              <input
                type="number"
                min="1"
                max="50"
                value={form.maxSize}
                onChange={(e) => setForm({ ...form, maxSize: parseInt(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-maroon-600 px-4 py-2 text-sm font-medium text-white hover:bg-maroon-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {group ? 'Save Changes' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Members Modal
function MembersModal({
  group,
  allStudents,
  onClose,
  onAddMembers,
  onRemoveMembers,
}: {
  group: Group;
  allStudents: Student[];
  onClose: () => void;
  onAddMembers: (studentIds: string[]) => Promise<void>;
  onRemoveMembers: (studentIds: string[]) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
  const [selectedToRemove, setSelectedToRemove] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const currentMemberIds = new Set(group.studentIds || []);
  const availableStudents = allStudents.filter(s => !currentMemberIds.has(s.studentId));
  const currentMembers = allStudents.filter(s => currentMemberIds.has(s.studentId));

  const filteredAvailable = availableStudents.filter(s =>
    `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSave() {
    setSaving(true);
    if (selectedToAdd.size > 0) {
      await onAddMembers(Array.from(selectedToAdd));
    }
    if (selectedToRemove.size > 0) {
      await onRemoveMembers(Array.from(selectedToRemove));
    }
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 font-serif">
            Manage Members - {group.groupName}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden grid grid-cols-2 gap-4">
          {/* Current Members */}
          <div className="flex flex-col overflow-hidden">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Current Members ({currentMembers.length})
            </h3>
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
              {currentMembers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No members yet</p>
              ) : (
                currentMembers.map((student) => (
                  <label
                    key={student.studentId}
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedToRemove.has(student.studentId)}
                      onChange={(e) => {
                        const newSet = new Set(selectedToRemove);
                        if (e.target.checked) newSet.add(student.studentId);
                        else newSet.delete(student.studentId);
                        setSelectedToRemove(newSet);
                      }}
                      className="rounded border-gray-300 text-maroon-600 focus:ring-maroon-500"
                    />
                    <span className="text-sm">
                      {student.firstName} {student.lastName}
                    </span>
                  </label>
                ))
              )}
            </div>
            {selectedToRemove.size > 0 && (
              <p className="text-xs text-red-600 mt-1">
                {selectedToRemove.size} selected to remove
              </p>
            )}
          </div>

          {/* Available Students */}
          <div className="flex flex-col overflow-hidden">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Available Students ({availableStudents.length})
            </h3>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-1.5 pl-8 pr-3 text-sm focus:border-maroon-500 focus:outline-none"
              />
            </div>
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
              {filteredAvailable.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  {search ? 'No matches' : 'All students assigned'}
                </p>
              ) : (
                filteredAvailable.map((student) => (
                  <label
                    key={student.studentId}
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedToAdd.has(student.studentId)}
                      onChange={(e) => {
                        const newSet = new Set(selectedToAdd);
                        if (e.target.checked) newSet.add(student.studentId);
                        else newSet.delete(student.studentId);
                        setSelectedToAdd(newSet);
                      }}
                      className="rounded border-gray-300 text-maroon-600 focus:ring-maroon-500"
                    />
                    <span className="text-sm">
                      {student.firstName} {student.lastName}
                    </span>
                  </label>
                ))
              )}
            </div>
            {selectedToAdd.size > 0 && (
              <p className="text-xs text-green-600 mt-1">
                {selectedToAdd.size} selected to add
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (selectedToAdd.size === 0 && selectedToRemove.size === 0)}
            className="flex items-center gap-2 rounded-lg bg-maroon-600 px-4 py-2 text-sm font-medium text-white hover:bg-maroon-700 disabled:opacity-50"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
