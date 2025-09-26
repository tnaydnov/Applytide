import { Card, Button } from "../../../components/ui";

function formatDate(dateString) {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch {
    return "—";
  }
}

function getInitials(name, email) {
  if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return email?.charAt(0).toUpperCase() || "U";
}

export default function ProfileSidebar({ user, avatar, onLogout }) {
  const { fileInputRef, avatarFile, avatarPreview, loading, select, upload, cancel } = avatar;

  return (
    <Card className="p-6 text-center glass-card border border-white/10">
      {/* Avatar */}
      <div className="relative mb-6">
        <div
          className="w-32 h-32 mx-auto rounded-full flex items-center justify-center cursor-pointer group relative overflow-hidden"
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: avatarPreview || user?.avatar_url
              ? `url(${avatarPreview || user.avatar_url}) center/cover`
              : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          }}
        >
          {!avatarPreview && !user?.avatar_url && (
            <span className="text-white font-bold text-3xl">
              {getInitials(user?.full_name, user?.email)}
            </span>
          )}
          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={select} className="hidden" />
      </div>

      {avatarFile && (
        <div className="mb-4 space-y-2">
          <Button onClick={upload} disabled={loading} size="sm" className="w-full">
            {loading ? "Uploading..." : "Save Avatar"}
          </Button>
          <Button onClick={cancel} variant="secondary" size="sm" className="w-full">
            Cancel
          </Button>
        </div>
      )}

      {/* User Info */}
      <h3 className="text-xl font-semibold text-white mb-1">
        {user?.full_name || "Anonymous User"}
      </h3>
      <p className="text-sm text-gray-300 mb-2">{user?.email}</p>

      {/* Account Status */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Account Type</span>
          <span
            className={`px-2 py-1 rounded text-xs font-semibold ${
              user?.is_premium
                ? "bg-yellow-900/30 text-yellow-300 border border-yellow-500/30"
                : "bg-gray-900/30 text-gray-300 border border-gray-500/30"
            }`}
          >
            {user?.is_premium ? "Premium" : "Free"}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Member Since</span>
          <span className="text-gray-300">{formatDate(user?.created_at)}</span>
        </div>

        {user?.last_login_at && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Last Login</span>
            <span className="text-gray-300">{formatDate(user.last_login_at)}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Email Verified</span>
          <span
            className={`px-2 py-1 rounded text-xs font-semibold ${
              user?.email_verified
                ? "bg-green-900/30 text-green-300 border border-green-500/30"
                : "bg-red-900/30 text-red-300 border border-red-500/30"
            }`}
          >
            {user?.email_verified ? "Verified" : "Unverified"}
          </span>
        </div>
      </div>
    </Card>
  );
}
