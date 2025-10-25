export default function LLMDownError({ onRetry, context = "this feature" }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
      {/* Cute robot icon */}
      <div className="text-6xl mb-2">🤖💤</div>
      
      <div className="space-y-2 max-w-md">
        <h3 className="text-xl font-bold text-slate-200">
          Our AI Brain is Taking a Nap
        </h3>
        <p className="text-slate-400 leading-relaxed">
          Looks like OpenAI's services are down. The modern world apparently can't handle anything without AI anymore, so we'll just have to wait till our robot overlords wake up.
        </p>
        <p className="text-sm text-slate-500 italic">
          (In the meantime, maybe we could try using our human brains? Just kidding, nobody remembers how.)
        </p>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <span>🔄</span>
          <span>Try Again (Maybe They Woke Up)</span>
        </button>
      )}

      <div className="mt-4 text-xs text-slate-600">
        <p>Technical note: {context} requires OpenAI API which is currently unavailable.</p>
        <p className="mt-1">Please try again in a few minutes.</p>
      </div>
    </div>
  );
}
