'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ChevronDown, ChevronRight, Plus, Trash2, Edit2 } from 'lucide-react'
import { buildOrgTree, type OrgUnit } from '@/lib/org-utils'

interface OrgTreeBuilderProps {
  organizationId: string
  userId: string
}

interface TreeNode extends OrgUnit {
  children?: TreeNode[]
  expanded?: boolean
}

export function OrgTreeBuilder({ organizationId, userId }: OrgTreeBuilderProps) {
  const [units, setUnits] = useState<OrgUnit[]>([])
  const [tree, setTree] = useState<TreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [newUnitDialog, setNewUnitDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    unit_type: 'DEPARTMENT',
    parent_id: '',
  })

  useEffect(() => {
    fetchOrgUnits()
  }, [organizationId])

  async function fetchOrgUnits() {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/org-units?organization_id=${organizationId}`,
        {
          headers: {
            'x-user-id': userId,
          },
        }
      )

      if (!response.ok) throw new Error('Failed to fetch org units')

      const { units } = await response.json()
      setUnits(units)

      // Build tree structure
      const orgTree = buildOrgTree(units)
      setTree(orgTree.root)
    } catch (error) {
      console.error('Error fetching org units:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateUnit() {
    try {
      const response = await fetch('/api/org-units', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          organization_id: organizationId,
          parent_id: formData.parent_id || null,
          unit_type: formData.unit_type,
          name: formData.name,
        }),
      })

      if (!response.ok) throw new Error('Failed to create org unit')

      // Reset form and refetch
      setFormData({ name: '', unit_type: 'DEPARTMENT', parent_id: '' })
      setNewUnitDialog(false)
      await fetchOrgUnits()
    } catch (error) {
      console.error('Error creating org unit:', error)
    }
  }

  async function handleDeleteUnit(unitId: string) {
    try {
      const response = await fetch(`/api/org-units?id=${unitId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': userId,
        },
      })

      if (!response.ok) throw new Error('Failed to delete org unit')

      await fetchOrgUnits()
    } catch (error) {
      console.error('Error deleting org unit:', error)
    }
  }

  function toggleExpanded(unitId: string) {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(unitId)) {
      newExpanded.delete(unitId)
    } else {
      newExpanded.add(unitId)
    }
    setExpandedIds(newExpanded)
  }

  function buildTreeWithExpanded(units: OrgUnit[]): TreeNode[] {
    const map = new Map<string, TreeNode>()
    const roots: TreeNode[] = []

    units.forEach((unit) => {
      map.set(unit.id, { ...unit, children: [], expanded: expandedIds.has(unit.id) })
    })

    units.forEach((unit) => {
      const node = map.get(unit.id)!
      if (unit.parent_id) {
        const parent = map.get(unit.parent_id)
        if (parent) {
          if (!parent.children) parent.children = []
          parent.children.push(node)
        }
      } else {
        roots.push(node)
      }
    })

    return roots
  }

  function TreeNode({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
    const hasChildren = node.children && node.children.length > 0
    const isExpanded = expandedIds.has(node.id)

    return (
      <div key={node.id} className="w-full">
        <div className="flex items-center gap-2 py-2 px-4 hover:bg-gray-50 rounded-lg group">
          {hasChildren ? (
            <button
              onClick={() => toggleExpanded(node.id)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          <div className="flex-1">
            <div className="font-medium text-sm">{node.name}</div>
            <div className="text-xs text-gray-500">
              {node.unit_type} {node.lead_user_id && '• Has Lead'}
            </div>
          </div>

          <div className="hidden group-hover:flex gap-1">
            <Dialog open={editingId === node.id} onOpenChange={(open) => !open && setEditingId(null)}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingId(node.id)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit {node.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Unit name"
                    defaultValue={node.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <Button onClick={handleCreateUnit} className="w-full">
                    Save Changes
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteUnit(node.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-4 border-l border-gray-200">
            {node.children?.map((child) => (
              <TreeNode key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading organization structure...</div>
  }

  const currentTree = buildTreeWithExpanded(units)

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Organization Structure</h3>
        <Dialog open={newUnitDialog} onOpenChange={setNewUnitDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Unit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Department</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Department name (e.g., Engineering)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />

              <Select
                value={formData.unit_type}
                onValueChange={(value) => setFormData({ ...formData, unit_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEPARTMENT">Department</SelectItem>
                  <SelectItem value="DIVISION">Division</SelectItem>
                  <SelectItem value="TEAM">Team</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={formData.parent_id}
                onValueChange={(value) => setFormData({ ...formData, parent_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Parent unit (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (Root Level)</SelectItem>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={handleCreateUnit} className="w-full" disabled={!formData.name}>
                Create Unit
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg bg-white p-4 space-y-2">
        {currentTree.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No departments yet. Create one to get started.</div>
        ) : (
          currentTree.map((node) => <TreeNode key={node.id} node={node} />)
        )}
      </div>
    </div>
  )
}
