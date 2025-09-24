import { useEffect, useRef, useState } from "react";
import { api } from "../../../lib/api";

export default function useJobs() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const abortRef = useRef();

    useEffect(() => {
        abortRef.current?.abort();
        const ctl = new AbortController();
        abortRef.current = ctl;
        (async () => {
            setLoading(true);
            try {
                const json = await api.listJobs();
                setJobs(Array.isArray(json) ? json : json?.data || []);
            } catch (e) {
                if (e.name !== "AbortError") console.error(e);
            } finally {
                setLoading(false);
            }
        })();
        return () => ctl.abort();
    }, []);

    return { jobs, loading };
}
