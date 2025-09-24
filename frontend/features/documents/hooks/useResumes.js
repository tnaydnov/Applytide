import { useMemo } from "react";
import { getDocName } from "../utils/helpers";

/**
 * Derive resume options from documents (id + display label)
 * @param {Array} docs
 */
export default function useResumes(docs = []) {
  return useMemo(() => {
    return docs
      .filter((d) => (d.type || d.document_type) === "resume")
      .map((d) => ({ id: d.id, label: getDocName(d) || `Resume ${d.id}` }));
  }, [docs]);
}
