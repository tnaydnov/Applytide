export default function OAuthDivider() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-300/30"></div>
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-2 bg-slate-800/70 text-slate-400">Or continue with</span>
      </div>
    </div>
  );
}
