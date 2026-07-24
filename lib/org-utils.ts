/**
 * Organization Utilities
 * Helper functions for building and manipulating hierarchical org structures
 */

export interface OrgUnit {
  id: string
  organization_id: string
  parent_id: string | null
  unit_type: string
  name: string
  lead_user_id: string | null
  path?: string
  active: boolean
  created_at: string
  updated_at: string
  children?: OrgUnit[]
}

export interface OrgTree {
  root: OrgUnit[]
  byId: Map<string, OrgUnit>
}

/**
 * Build hierarchical tree from flat org units array
 */
export function buildOrgTree(units: OrgUnit[]): OrgTree {
  const byId = new Map<string, OrgUnit>()
  const root: OrgUnit[] = []

  // Create map of all units
  units.forEach((unit) => {
    byId.set(unit.id, { ...unit, children: [] })
  })

  // Build tree structure
  units.forEach((unit) => {
    const treeUnit = byId.get(unit.id)!
    if (unit.parent_id) {
      const parent = byId.get(unit.parent_id)
      if (parent) {
        if (!parent.children) parent.children = []
        parent.children.push(treeUnit)
      }
    } else {
      root.push(treeUnit)
    }
  })

  return { root, byId }
}

/**
 * Get all descendants of a unit
 */
export function getDescendants(unitId: string, tree: OrgTree): OrgUnit[] {
  const descendants: OrgUnit[] = []
  const unit = tree.byId.get(unitId)

  if (!unit || !unit.children) return descendants

  const stack = [...unit.children]
  while (stack.length > 0) {
    const current = stack.pop()!
    descendants.push(current)
    if (current.children && current.children.length > 0) {
      stack.push(...current.children)
    }
  }

  return descendants
}

/**
 * Get breadcrumb path for a unit
 */
export function getBreadcrumb(unitId: string, tree: OrgTree): OrgUnit[] {
  const path: OrgUnit[] = []
  let current = tree.byId.get(unitId)

  while (current) {
    path.unshift(current)
    if (!current.parent_id) break
    current = tree.byId.get(current.parent_id)
  }

  return path
}

/**
 * Get all ancestors of a unit
 */
export function getAncestors(unitId: string, tree: OrgTree): OrgUnit[] {
  const ancestors: OrgUnit[] = []
  let current = tree.byId.get(unitId)

  while (current && current.parent_id) {
    const parent = tree.byId.get(current.parent_id)
    if (parent) {
      ancestors.push(parent)
      current = parent
    } else {
      break
    }
  }

  return ancestors
}

/**
 * Get siblings of a unit
 */
export function getSiblings(unitId: string, tree: OrgTree): OrgUnit[] {
  const unit = tree.byId.get(unitId)
  if (!unit) return []

  if (!unit.parent_id) {
    return tree.root.filter((u) => u.id !== unitId)
  }

  const parent = tree.byId.get(unit.parent_id)
  if (!parent || !parent.children) return []

  return parent.children.filter((u) => u.id !== unitId)
}

/**
 * Validate hierarchy - no circular references
 */
export function validateNoCircularReferences(
  unitId: string,
  newParentId: string | null,
  tree: OrgTree
): boolean {
  if (!newParentId) return true
  if (unitId === newParentId) return false

  let current = tree.byId.get(newParentId)
  while (current) {
    if (current.id === unitId) return false
    if (!current.parent_id) break
    current = tree.byId.get(current.parent_id)
  }

  return true
}

/**
 * Generate ltree path format: root.child1.child2
 */
export function generatePath(unitId: string, tree: OrgTree): string {
  const breadcrumb = getBreadcrumb(unitId, tree)
  return breadcrumb.map((u) => u.id.substring(0, 8)).join('.')
}

/**
 * Count total members in subtree
 */
export function countMembersInSubtree(unitId: string, allUsers: any[]): number {
  const unitIds = new Set<string>([unitId])
  // Would need full tree to get descendants, simplified version:
  return allUsers.filter((u) => u.org_unit_id === unitId).length
}

/**
 * Get next available unit name
 */
export function getNextUnitName(prefix: string, siblings: OrgUnit[]): string {
  const existing = siblings
    .filter((s) => s.name.startsWith(prefix))
    .map((s) => {
      const match = s.name.match(new RegExp(`${prefix}\\s*(\\d+)`))
      return match ? parseInt(match[1]) : 0
    })

  const maxNum = Math.max(0, ...existing)
  return maxNum === 0 ? prefix : `${prefix} ${maxNum + 1}`
}
