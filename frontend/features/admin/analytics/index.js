// frontend/features/admin/analytics/index.js
import { useEffect } from 'react';
import { 
  useCohortRetention, 
  useChurnPrediction, 
  useFeatureAdoption,
  useConversionFunnel,
  useApplicationVelocity
} from './hooks/useAnalytics';
import CohortRetentionChart from './components/CohortRetentionChart';
import ChurnPredictionPanel from './components/ChurnPredictionPanel';
import FeatureAdoptionChart from './components/FeatureAdoptionChart';
import ApplicationVelocityChart from './components/ApplicationVelocityChart';
import ConversionFunnel from '../applications/components/ConversionFunnel';

export default function AnalyticsPage() {
  const { data: cohortData, loading: cohortLoading, loadData: loadCohort } = useCohortRetention();
  const { data: churnData, loading: churnLoading, loadData: loadChurn } = useChurnPrediction();
  const { data: featureData, loading: featureLoading, loadData: loadFeature } = useFeatureAdoption();
  const { data: funnelData, loading: funnelLoading, loadData: loadFunnel } = useConversionFunnel();
  const { data: velocityData, loading: velocityLoading, loadData: loadVelocity } = useApplicationVelocity();

  useEffect(() => {
    loadCohort('week');
    loadChurn(50);
    loadFeature();
    loadFunnel();
    loadVelocity();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            📊 Enhanced Analytics
          </h1>
          <p className="text-gray-400 mt-2">
            Advanced analytics, retention cohorts, churn prediction, and feature adoption insights
          </p>
        </div>

        {/* Cohort Retention */}
        <div className="mb-8">
          <CohortRetentionChart data={cohortData} loading={cohortLoading} />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Churn Prediction */}
          <ChurnPredictionPanel data={churnData} loading={churnLoading} />

          {/* Feature Adoption */}
          <FeatureAdoptionChart data={featureData} loading={featureLoading} />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conversion Funnel */}
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">🎯 Conversion Funnel</h3>
            {funnelLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500"></div>
              </div>
            ) : funnelData ? (
              <ConversionFunnel data={funnelData} />
            ) : (
              <p className="text-gray-400 text-center py-8">No funnel data</p>
            )}
          </div>

          {/* Application Velocity */}
          <ApplicationVelocityChart data={velocityData} loading={velocityLoading} />
        </div>
      </div>
    </div>
  );
}
