import { CommittedFileChange } from '../models/status'

/** Match any part of a committed file's path, ignoring case. */
export function filterCommittedFiles(
  files: ReadonlyArray<CommittedFileChange>,
  text: string
): ReadonlyArray<CommittedFileChange> {
  const query = text.trim().toLowerCase()
  return query.length === 0
    ? files
    : files.filter(file => file.path.toLowerCase().includes(query))
}
