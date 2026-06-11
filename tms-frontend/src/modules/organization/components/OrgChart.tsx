import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlowProvider,
  type Edge,
  type Node,
} from 'reactflow'
import 'reactflow/dist/style.css'

import type { HierarchyDepartment } from '../types/organization.types'
import { DeptFlowNode, type DeptFlowNodeData } from './DeptFlowNode'
import { MgrFlowNode, type MgrFlowNodeData } from './MgrFlowNode'
import { EmpFlowNode, type EmpFlowNodeData } from './EmpFlowNode'

// ── Layout constants ──────────────────────────────────────────────────────────
const ROOT_Y    = 0
const DEPT_Y    = 180
const MGR_Y     = 380
const EMP_Y     = 570

const DEPT_W    = 240
const MGR_W     = 220
const EMP_W     = 200

const H_GAP     = 18
const DEPT_GAP  = 64

// ── Graph builder ─────────────────────────────────────────────────────────────

function buildGraph(
  hierarchy: HierarchyDepartment[],
  collapsedDepts: Record<number, boolean>,
  collapsedMgrs: Record<string, boolean>,
  onToggleDept: (nodeId: string, collapsed: boolean) => void,
  onToggleMgr:  (nodeId: string, collapsed: boolean) => void,
) {
  const nodes: Node[] = []
  const edges: Edge[]  = []

  const totalEmps = hierarchy.reduce(
    (n, d) => n + d.managers.reduce((m, mg) => m + mg.directReports.length, 0) + d.unassigned.length,
    0,
  )

  nodes.push({
    id: 'root',
    type: 'root',
    position: { x: 0, y: ROOT_Y },
    data: { totalDepts: hierarchy.length, totalEmps },
    draggable: false,
  })

  // ── Bottom-up span helpers ──
  function mgrSpan(mgrNodeId: string, reportCount: number): number {
    if (collapsedMgrs[mgrNodeId] ?? false) return MGR_W
    if (reportCount === 0) return MGR_W
    return Math.max(MGR_W, reportCount * EMP_W + (reportCount - 1) * H_GAP)
  }

  function deptSpan(dept: HierarchyDepartment): number {
    if (collapsedDepts[dept.id] ?? false) return DEPT_W
    const childSpans = [
      ...dept.managers.map((mg) => mgrSpan(`mgr-${dept.id}-${mg.user.id}`, mg.directReports.length)),
      ...(dept.unassigned.length > 0 ? [mgrSpan(`mgr-${dept.id}-unassigned`, dept.unassigned.length)] : []),
    ]
    if (childSpans.length === 0) return DEPT_W
    return Math.max(DEPT_W, childSpans.reduce((a, b) => a + b, 0) + (childSpans.length - 1) * H_GAP)
  }

  const deptSpans = hierarchy.map((d) => deptSpan(d))
  const totalWidth = deptSpans.reduce((a, b) => a + b, 0) + (hierarchy.length - 1) * DEPT_GAP
  let curX = -totalWidth / 2

  hierarchy.forEach((dept, di) => {
    const span   = deptSpans[di]
    const deptId = `dept-${dept.id}`
    const isCollapsedDept = collapsedDepts[dept.id] ?? false
    const deptX  = curX + span / 2 - DEPT_W / 2

    const allMemberCount = dept.managers.reduce((n, mg) => n + mg.directReports.length, 0) + dept.unassigned.length

    nodes.push({
      id: deptId,
      type: 'dept',
      position: { x: deptX, y: DEPT_Y },
      data: {
        name: dept.name,
        description: dept.description,
        managerCount: dept.managers.length,
        totalCount: allMemberCount,
        collapsed: isCollapsedDept,
        nodeId: deptId,
        onToggle: onToggleDept,
      } satisfies DeptFlowNodeData,
      draggable: false,
    })

    edges.push({
      id: `root-${deptId}`,
      source: 'root',
      target: deptId,
      type: 'smoothstep',
      style: { stroke: 'rgb(52 211 153)', strokeWidth: 2 },
    })

    if (!isCollapsedDept) {
      type ChildEntry =
        | { kind: 'mgr'; mgrIndex: number }
        | { kind: 'unassigned' }

      const children: ChildEntry[] = [
        ...dept.managers.map((_, i) => ({ kind: 'mgr' as const, mgrIndex: i })),
        ...(dept.unassigned.length > 0 ? [{ kind: 'unassigned' as const }] : []),
      ]

      let mgrCurX = curX

      children.forEach((child) => {
        const isMgr = child.kind === 'mgr'
        const mgrUser = isMgr ? dept.managers[child.mgrIndex].user : null
        const reports  = isMgr ? dept.managers[child.mgrIndex].directReports : dept.unassigned
        const mgrNodeId = isMgr ? `mgr-${dept.id}-${mgrUser!.id}` : `mgr-${dept.id}-unassigned`
        const span = mgrSpan(mgrNodeId, reports.length)
        const mgrX = mgrCurX + span / 2 - MGR_W / 2
        const isCollapsedMgr = collapsedMgrs[mgrNodeId] ?? false

        nodes.push({
          id: mgrNodeId,
          type: 'mgr',
          position: { x: mgrX, y: MGR_Y },
          data: {
            user: isMgr ? { ...mgrUser! } : {
              id: `unassigned-${dept.id}`,
              employeeId: '',
              name: 'Unmanaged',
              email: '',
              designation: 'No manager assigned',
              status: 'ACTIVE' as const,
              roleName: 'EMPLOYEE',
            },
            reportCount: reports.length,
            collapsed: isCollapsedMgr,
            nodeId: mgrNodeId,
            onToggle: onToggleMgr,
          } satisfies MgrFlowNodeData,
          draggable: false,
        })

        edges.push({
          id: `${deptId}-${mgrNodeId}`,
          source: deptId,
          target: mgrNodeId,
          type: 'smoothstep',
          style: { stroke: 'rgb(99 102 241)', strokeWidth: 1.5 },
        })

        if (!isCollapsedMgr && reports.length > 0) {
          let empCurX = mgrCurX
          reports.forEach((emp) => {
            const empId = `emp-${emp.id}`
            nodes.push({
              id: empId,
              type: 'emp',
              position: { x: empCurX, y: EMP_Y },
              data: { employee: emp } satisfies EmpFlowNodeData,
              draggable: false,
            })
            edges.push({
              id: `${mgrNodeId}-${empId}`,
              source: mgrNodeId,
              target: empId,
              type: 'smoothstep',
              style: { stroke: 'hsl(var(--border))', strokeWidth: 1.5 },
            })
            empCurX += EMP_W + H_GAP
          })
        }

        mgrCurX += span + H_GAP
      })
    }

    curX += span + DEPT_GAP
  })

  return { nodes, edges }
}

// ── Root node ─────────────────────────────────────────────────────────────────

function RootNode({ data }: { data: { totalDepts: number; totalEmps: number } }) {
  return (
    <>
      <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-500 to-teal-600 px-10 py-4 shadow-xl shadow-emerald-500/30 text-white min-w-[220px]">
        <p className="text-lg font-bold tracking-tight">Organisation</p>
        <p className="text-xs text-white/70">
          {data.totalDepts} dept{data.totalDepts !== 1 ? 's' : ''} · {data.totalEmps} employee{data.totalEmps !== 1 ? 's' : ''}
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-400 !border-0 !w-2 !h-2" />
    </>
  )
}

// ── Stable node type map ──────────────────────────────────────────────────────

const NODE_TYPES = {
  root: RootNode,
  dept: DeptFlowNode,
  mgr:  MgrFlowNode,
  emp:  EmpFlowNode,
}

// ── Inner chart ───────────────────────────────────────────────────────────────

function FlowInner({ hierarchy }: { hierarchy: HierarchyDepartment[] }) {
  const [collapsedDepts, setCollapsedDepts] = useState<Record<number, boolean>>({})
  const [collapsedMgrs,  setCollapsedMgrs]  = useState<Record<string, boolean>>({})
  const containerRef = useRef<HTMLDivElement>(null)

  const PINCH_SPEED = 3.5
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let dispatching = false
    const handler = (e: WheelEvent) => {
      if (dispatching || !e.ctrlKey) return
      e.preventDefault()
      e.stopImmediatePropagation()
      const renderer = el.querySelector<HTMLElement>('.react-flow__renderer')
      if (!renderer) return
      dispatching = true
      renderer.dispatchEvent(
        new WheelEvent('wheel', {
          deltaX: e.deltaX,
          deltaY: e.deltaY * PINCH_SPEED,
          deltaZ: e.deltaZ,
          deltaMode: e.deltaMode,
          ctrlKey: true,
          clientX: e.clientX,
          clientY: e.clientY,
          screenX: e.screenX,
          screenY: e.screenY,
          bubbles: true,
          cancelable: true,
        }),
      )
      dispatching = false
    }
    el.addEventListener('wheel', handler, { passive: false, capture: true })
    return () => el.removeEventListener('wheel', handler, { capture: true })
  }, [])

  const handleToggleDept = useCallback((nodeId: string, collapsed: boolean) => {
    const deptId = parseInt(nodeId.replace('dept-', ''), 10)
    setCollapsedDepts((prev) => ({ ...prev, [deptId]: collapsed }))
  }, [])

  const handleToggleMgr = useCallback((nodeId: string, collapsed: boolean) => {
    setCollapsedMgrs((prev) => ({ ...prev, [nodeId]: collapsed }))
  }, [])

  const { nodes: graphNodes, edges: graphEdges } = useMemo(
    () => buildGraph(hierarchy, collapsedDepts, collapsedMgrs, handleToggleDept, handleToggleMgr),
    [hierarchy, collapsedDepts, collapsedMgrs, handleToggleDept, handleToggleMgr],
  )

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={graphNodes}
        edges={graphEdges}
        onConnect={() => {}}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.15, duration: 600 }}
        minZoom={0.2}
        maxZoom={2.0}
        zoomOnScroll={false}
        zoomOnPinch
        panOnDrag
        panOnScroll
        panOnScrollMode={'free' as never}
        panOnScrollSpeed={1.5}
        proOptions={{ hideAttribution: true }}
        className="rounded-xl"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          className="!bg-muted/30"
          color="hsl(var(--border))"
        />
        <Controls
          showInteractive={false}
          className="!bg-card !border !border-border !shadow-sm !rounded-xl overflow-hidden [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-accent"
        />
        <MiniMap
          nodeColor={(n) =>
            n.type === 'root' || n.type === 'dept'
              ? 'rgb(16 185 129)'
              : n.type === 'mgr'
              ? 'rgb(99 102 241)'
              : 'hsl(var(--muted))'
          }
          maskColor="hsl(var(--background) / 0.7)"
          className="!bg-card !border !border-border !rounded-xl !shadow-sm"
        />
      </ReactFlow>
    </div>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────

interface OrgChartProps {
  hierarchy: HierarchyDepartment[]
}

export function OrgChart({ hierarchy }: OrgChartProps) {
  return (
    <ReactFlowProvider>
      <div style={{ width: '100%', height: '100%' }}>
        <FlowInner hierarchy={hierarchy} />
      </div>
    </ReactFlowProvider>
  )
}
