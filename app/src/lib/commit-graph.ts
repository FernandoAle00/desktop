/** Minimal commit shape the graph needs. `Commit` satisfies this. */
export type CommitGraphLookup = ReadonlyMap<
  string,
  { readonly parentSHAs: ReadonlyArray<string> }
>

/** A line drawn in one half of a commit-graph row. */
export interface ICommitGraphEdge {
  /** Lane index at the start of this half (top of the half). */
  readonly from: number
  /** Lane index at the end of this half (bottom of the half). */
  readonly to: number
  /**
   * Palette index for this edge. Pass-throughs keep their lane; a line
   * leaving a merge node takes the destination lane's color so a new
   * branch is identifiable from the first pixel.
   */
  readonly colorIndex: number
}

/**
 * Layout for a single commit row. Edges are split at the node so each
 * virtualized row can draw an independent SVG that still joins the row
 * above and below.
 */
export interface ICommitGraphRow {
  readonly sha: string
  /** Lane where this commit's node is drawn. */
  readonly lane: number
  /** True when the commit has two or more parents. */
  readonly isMerge: boolean
  /** Edges from the top of the row to the node (y = 0 → mid). */
  readonly top: ReadonlyArray<ICommitGraphEdge>
  /** Edges from the node to the bottom of the row (mid → y = height). */
  readonly bottom: ReadonlyArray<ICommitGraphEdge>
}

export interface ICommitGraph {
  readonly rows: ReadonlyArray<ICommitGraphRow>
  /**
   * Highest lane count needed to draw any row. Used for the column width.
   * Stable for a given prefix of `commitSHAs`: appending older commits
   * cannot shrink or reorder lanes already assigned above.
   */
  readonly laneCount: number
}

/**
 * Assign graph lanes by walking newest → oldest and reusing the first
 * parent's lane.
 *
 * History paginates by appending older commits. Because a row's lane
 * depends only on commits above it, growing the list from the bottom
 * cannot reshuffle lanes that are already on screen.
 */
export function computeCommitGraph(
  commitSHAs: ReadonlyArray<string>,
  commitLookup: CommitGraphLookup
): ICommitGraph {
  const rows = new Array<ICommitGraphRow>(commitSHAs.length)
  // SHA expected next in each lane, or null if the lane is free.
  let lanes: Array<string | null> = []
  let laneCount = 0

  for (let rowIndex = 0; rowIndex < commitSHAs.length; rowIndex++) {
    const sha = commitSHAs[rowIndex]
    const commit = commitLookup.get(sha)
    const parents = commit?.parentSHAs ?? []

    const occupying = collectOccupyingLanes(lanes, sha)
    const isNewTip = occupying.length === 0

    let commitLane: number
    if (!isNewTip) {
      commitLane = occupying[0]
    } else {
      commitLane = findFirstEmptyLane(lanes)
      if (commitLane === -1) {
        commitLane = lanes.length
        lanes.push(sha)
      }
      occupying.push(commitLane)
    }

    const nextLanes = lanes.slice()
    for (const lane of occupying) {
      nextLanes[lane] = null
    }

    const parentLanes = new Array<number>(parents.length)
    for (let p = 0; p < parents.length; p++) {
      const parent = parents[p]
      const existing = nextLanes.indexOf(parent)

      if (existing !== -1) {
        parentLanes[p] = existing
      } else if (p === 0) {
        // First parent keeps this commit's lane so a linear history is
        // a single straight column, and so later pages don't steal it.
        parentLanes[p] = commitLane
        nextLanes[commitLane] = parent
      } else {
        let parentLane = findFirstEmptyLane(nextLanes)
        if (parentLane === -1) {
          parentLane = nextLanes.length
          nextLanes.push(parent)
        } else {
          nextLanes[parentLane] = parent
        }
        parentLanes[p] = parentLane
      }
    }

    const top = new Array<ICommitGraphEdge>()
    const bottom = new Array<ICommitGraphEdge>()
    const seenTop = new Set<string>()
    const seenBottom = new Set<string>()

    const occupyingSet = new Set(occupying)

    for (let i = 0; i < lanes.length; i++) {
      const expected = lanes[i]
      if (expected === null || occupyingSet.has(i)) {
        continue
      }

      pushEdge(top, seenTop, { from: i, to: i, colorIndex: i })
      pushEdge(bottom, seenBottom, { from: i, to: i, colorIndex: i })
    }

    if (!isNewTip) {
      for (const lane of occupying) {
        pushEdge(top, seenTop, {
          from: lane,
          to: commitLane,
          colorIndex: lane,
        })
      }
    }

    for (const dest of parentLanes) {
      pushEdge(bottom, seenBottom, {
        from: commitLane,
        to: dest,
        colorIndex: dest,
      })
    }

    trimTrailingEmptyLanes(nextLanes)

    const rowLaneCount = Math.max(
      commitLane + 1,
      lanes.length,
      nextLanes.length,
      highestEdgeLane(top),
      highestEdgeLane(bottom)
    )
    laneCount = Math.max(laneCount, rowLaneCount)

    rows[rowIndex] = {
      sha,
      lane: commitLane,
      isMerge: parents.length > 1,
      top,
      bottom,
    }

    lanes = nextLanes
  }

  return { rows, laneCount }
}

function collectOccupyingLanes(
  lanes: ReadonlyArray<string | null>,
  sha: string
): number[] {
  const occupying = new Array<number>()
  for (let i = 0; i < lanes.length; i++) {
    if (lanes[i] === sha) {
      occupying.push(i)
    }
  }
  return occupying
}

function findFirstEmptyLane(lanes: ReadonlyArray<string | null>): number {
  for (let i = 0; i < lanes.length; i++) {
    if (lanes[i] === null) {
      return i
    }
  }
  return -1
}

function trimTrailingEmptyLanes(lanes: Array<string | null>): void {
  while (lanes.length > 0 && lanes[lanes.length - 1] === null) {
    lanes.pop()
  }
}

function pushEdge(
  edges: Array<ICommitGraphEdge>,
  seen: Set<string>,
  edge: ICommitGraphEdge
): void {
  const key = `${edge.from}:${edge.to}:${edge.colorIndex}`
  if (seen.has(key)) {
    return
  }
  seen.add(key)
  edges.push(edge)
}

function highestEdgeLane(edges: ReadonlyArray<ICommitGraphEdge>): number {
  let highest = 0
  for (const edge of edges) {
    highest = Math.max(highest, edge.from + 1, edge.to + 1)
  }
  return highest
}
