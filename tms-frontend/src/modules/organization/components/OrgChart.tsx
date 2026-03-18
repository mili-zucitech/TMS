import { useCallback, useMemo, useState } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from 'reactflow'
import 'reactflow/dist/style.css'

import type { OrganizationDepartment } from '../types/organization.types'
import { DeptFlowNode, type DeptFlowNodeData } from './DeptFlowNode'
import { EmpFlowNode, type EmpFlowNodeData } from './EmpFlowNode'

// ── Layout constants ──────────────────────────────────────────────────────────
const ROOT_X       = 0
const ROOT_Y       = 0
const DEPT_Y       = 160
const EMP_Y        = 360
const DEPT_W       = 260
const EMP_W        = 220
const EMP_GAP      = 20
const DEPT_MIN_W   = DEPT_W

// ── Node/edge builders ────────────────────────────────────────────────────────

function buildGraph(
  departments: OrganizationDepartment[],
  collapsed: Record<number, boolean>,
  onToggle: (id: string, newCollapsed: boolean) => void,
) {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // Root node
  const totalEmps = departments.reduce((n, d) => n + d.employees.length, 0)
  nodes.push({
    id: 'root',
    type: 'root',
    position: { x: ROOT_X, y: ROOT_Y },
    data: { totalDepts: departments.length, totalEmps },
    draggable: false,
  })

  // Calculate total width to centre deparments
  const deptBlockWidths = departments.map((dept) => {
    const empCount = dept.employees.length
    if (empCount === 0) return DEPT_MIN_W
    return Math.max(DEPT_MIN_W, empCount * EMP_W + (empCount - 1) * EMP_GAP)
  })
  const totalWidth = deptBlockWidths.reduce((a, b) => a + b + 40, 0) - 40
  let curX = -totalWidth / 2

  departments.forEach((dept, di) => {
    const blockW = deptBlockWidths[di]
    const deptX  = curX + (blockW - DEPT_W) / 2
    const deptId = `dept-${dept.id}`
    const isCollapsed = collapsed[dept.id] ?? false

    nodes.push({
      id: deptId,
      type: 'dept',
      position: { x: deptX, y: DEPT_Y },
      data: {
        name: dept.name,
        description: dept.description,
        employeeCount: dept.employees.length,
        collapsed: isCollapsed,
        nodeId: deptId,
        onToggle,
      } satisfies DeptFlowNodeData,
      draggable: false,
    })

    edges.push({
      id: `root-${deptId}`,
      source: 'root',
      target: deptId,
      type: 'smoothstep',
      style: { stroke: 'hsl(var(--border))', strokeWidth: 1.5 },
    })

    if (!isCollapsed) {
      dept.employees.forEach((emp, ei) => {
        const empX = curX + ei * (EMP_W + EMP_GAP)
        const empId = `emp-${emp.id}`
        nodes.push({
          id: empId,
          type: 'emp',
          position: { x: empX, y: EMP_Y },
          data: { employee: emp } satisfies EmpFlowNodeData,
          draggable: false,
        })
        edges.push({
          id: `${deptId}-${empId}`,
          source: deptId,
          target: empId,
          type: 'smoothstep',
          style: { stroke: 'hsl(var(--border))', strokeWidth: 1.5 },
        })
      })
    }

    curX += blockW + 40
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
      {/* source handle */}
      <div style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 8, height: 8, borderRadius: '50%', background: 'rgb(52 211 153)' }} />
    </>
  )
}

// ── Registered node types (stable reference) ──────────────────────────────────

const NODE_TYPES = {
  root: RootNode,
  dept: DeptFlowNode,
  emp:  EmpFlowNode,
}

// ── Inner chart (needs ReactFlow context for fitView) ─────────────────────────

function FlowInner({ departments }: { departments: OrganizationDepartment[] }) {
  const { fitView } = useReactFlow()
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({})

  const handleToggle = useCallback((nodeId: string, newCollapsed: boolean) => {
    const deptId = parseInt(nodeId.replace('dept-', ''), 10)
    setCollapsed((prev) => ({ ...prev, [deptId]: newCollapsed }))
    // Re-fit after layout changes
    setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50)
  }, [fitView])

  const { nodes: initNodes, edges: initEdges } = useMemo(
    () => buildGraph(departments, collapsed, handleToggle),
    [departments, collapsed, handleToggle],
  )

  const [, , onNodesChange] = useNodesState(initNodes)
  const [, setEdges, onEdgesChange] = useEdgesState(initEdges)

  // Sync when departments or collapsed changes
  const { nodes: latestNodes, edges: latestEdges } = useMemo(
    () => buildGraph(departments, collapsed, handleToggle),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [departments, collapsed],
  )

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  )

  return (
    <ReactFlow
      nodes={latestNodes}
      edges={latestEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={NODE_TYPES}
      fitView
      fitViewOptions={{ padding: 0.15, duration: 600 }}
      minZoom={0.4}
      maxZoom={2.0}
      zoomOnScroll
      zoomOnPinch
      panOnDrag
      panOnScroll={false}
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
            : 'hsl(var(--muted))'
        }
        maskColor="hsl(var(--background) / 0.7)"
        className="!bg-card !border !border-border !rounded-xl !shadow-sm"
      />
    </ReactFlow>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────

import { ReactFlowProvider } from 'reactflow'

interface OrgChartProps {
  departments: OrganizationDepartment[]
}

export function OrgChart({ departments }: OrgChartProps) {
  return (
    <ReactFlowProvider>
      <div style={{ width: '100%', height: 700 }}>
        <FlowInner departments={departments} />
      </div>
    </ReactFlowProvider>
  )
}
