import { useMemo } from "react";

/**
 * Derive resume options from documents (id + display label)
 * @param {Array} docs
 */
export default function useResumes(docs = []) {
  return useMemo(() => {
    return docs
      .filter((d) => d.type === "resume")
      .map((d) => ({ id: d.id, label: d.name || d.file_name || `Resume ${d.id}` }));
  }, [docs]);
}
