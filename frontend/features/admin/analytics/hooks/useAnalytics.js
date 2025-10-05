// frontend/features/admin/analytics/hooks/useAnalytics.js
import { useState, useCallback } from 'react';
import { 
  getCohortRetention, 
  predictChurn, 
  getFeatureAdoption,
  getConversionFunnel,
  getApplicationVelocity
} from '../../../../services/admin';
import toast from '../../../../lib/toast';

export function useCohortRetention() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async (cohortSize = 'week') => {
    try {
      setLoading(true);
      setError(null);
      const result = await getCohortRetention(cohortSize);
      setData(result);
    } catch (err) {
      setError(err.message);
      toast.error(`Failed to load cohort retention: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, loadData };
}

export function useChurnPrediction() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async (threshold = 50) => {
    try {
      setLoading(true);
      setError(null);
      const result = await predictChurn(threshold);
      setData(result);
    } catch (err) {
      setError(err.message);
      toast.error(`Failed to predict churn: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, loadData };
}

export function useFeatureAdoption() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getFeatureAdoption();
      setData(result);
    } catch (err) {
      setError(err.message);
      toast.error(`Failed to load feature adoption: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, loadData };
}

export function useConversionFunnel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getConversionFunnel();
      setData(result);
    } catch (err) {
      setError(err.message);
      toast.error(`Failed to load conversion funnel: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, loadData };
}

export function useApplicationVelocity() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getApplicationVelocity();
      setData(result);
    } catch (err) {
      setError(err.message);
      toast.error(`Failed to load application velocity: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, loadData };
}
