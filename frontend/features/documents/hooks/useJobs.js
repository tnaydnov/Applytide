import { useEffect, useState } from "react";
import api from "../../../lib/api";

/**
 * Loads saved jobs for the current user.
 * Normalizes the API shape to a simple array.
 */
export default function useJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const response = await api.listJobs(); // GET /api/jobs
        const items = Array.isArray(response?.items) ? response.items : Array.isArray(response) ? response : [];
        if (alive) setJobs(items);
      } catch (e) {
        console.warn("[useJobs] failed to load jobs:", e);
        if (alive) setJobs([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return { jobs, loading };
}
