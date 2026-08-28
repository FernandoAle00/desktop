import * as React from 'react'
import { ICommitGraphEdge, ICommitGraphRow } from '../../lib/commit-graph'

/** Maximum lanes drawn in the history column so the sidebar stays usable. */
export const CommitGraphMaxLanes = 6

const LaneSpacing = 12
const HorizontalPadding = 4
const RowHeight = 50
const NodeRadius = 3.5
const MergeNodeRadius = 4.5
const PaletteSize = 6

interface ICommitGraphProps {
  readonly row: ICommitGraphRow
  /** Total lanes in the computed graph; the column width is based on this. */
  readonly laneCount: number
}

/**
 * SVG graph column for a single virtualized commit row. Lines are drawn
 * from y = 0 to y = height so they join the rows above and below.
 */
export class CommitGraph extends React.PureComponent<ICommitGraphProps> {
  public render() {
    const { row, laneCount } = this.props
    const width = getCommitGraphWidth(laneCount)
    const midY = RowHeight / 2

    const edges: JSX.Element[] = []
    let edgeIndex = 0

    for (const edge of row.top) {
      edges.push(renderEdge(edge, 0, midY, edgeIndex))
      edgeIndex++
    }

    for (const edge of row.bottom) {
      edges.push(renderEdge(edge, midY, RowHeight, edgeIndex))
      edgeIndex++
    }

    const nodeX = laneX(row.lane)
    const radius = row.isMerge ? MergeNodeRadius : NodeRadius
    const laneClass = `lane-${row.lane % PaletteSize}`

    return (
      <div className="commit-graph" style={{ width }}>
        <svg
          width={width}
          height="100%"
          viewBox={`0 0 ${width} ${RowHeight}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          {edges}
          <circle className={laneClass} cx={nodeX} cy={midY} r={radius} />
        </svg>
      </div>
    )
  }
}

/** Pixel width of the graph column for a graph with `laneCount` lanes. */
export function getCommitGraphWidth(laneCount: number): number {
  const visible = Math.max(1, Math.min(laneCount, CommitGraphMaxLanes))
  return HorizontalPadding * 2 + visible * LaneSpacing
}

function renderEdge(
  edge: ICommitGraphEdge,
  y1: number,
  y2: number,
  key: number
): JSX.Element {
  const x1 = laneX(edge.from)
  const x2 = laneX(edge.to)
  const className = `lane-${edge.colorIndex % PaletteSize}`

  if (x1 === x2) {
    return (
      <path
        key={key}
        className={className}
        d={`M ${x1} ${y1} L ${x2} ${y2}`}
        fill="none"
      />
    )
  }

  const midY = (y1 + y2) / 2
  return (
    <path
      key={key}
      className={className}
      d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
      fill="none"
    />
  )
}

function laneX(lane: number): number {
  const visual = Math.min(Math.max(lane, 0), CommitGraphMaxLanes - 1)
  return HorizontalPadding + (visual + 0.5) * LaneSpacing
}
