import { Card, Button, Input } from "../../../components/ui";

export default function SecurityForm({
  user,
  passwordForm,
  onChangePasswordInput,
  onSubmitPassword,
  loading,
  onLogoutAll,
  onDeleteAccount,
  onExportData,
}) {
  return (
    <div className="space-y-6">
      <Card className="p-6 glass-card border border-white/10">
        <h3 className="text-xl font-semibold text-white mb-6">Change Password</h3>

        {user?.is_oauth_user ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-900/30 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 1C7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53 1.48 0 2.73.4 3.71 1.06L19.28 2.9C17.46.98 14.97 0 12 0z"/>
              </svg>
            </div>
            <h4 className="text-lg font-medium text-white mb-2">Google Account</h4>
            <p className="text-gray-300">You're signed in with Google. Password changes must be done through your Google account.</p>
            <Button
              onClick={() => window.open("https://myaccount.google.com/security", "_blank")}
              className="mt-4"
              variant="secondary"
            >
              Manage Google Security
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmitPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Current Password
              </label>
              <Input
                type="password"
                name="current_password"
                value={passwordForm.current_password}
                onChange={onChangePasswordInput}
                placeholder="Enter current password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                New Password
              </label>
              <Input
                type="password"
                name="new_password"
                value={passwordForm.new_password}
                onChange={onChangePasswordInput}
                placeholder="Enter new password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm New Password
              </label>
              <Input
                type="password"
                name="confirm_password"
                value={passwordForm.confirm_password}
                onChange={onChangePasswordInput}
                placeholder="Confirm new password"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
            >
              {loading ? "Changing..." : "Change Password"}
            </Button>
          </form>
        )}
      </Card>

      <Card className="p-6 glass-card border border-blue-500/20">
        <h3 className="text-xl font-semibold text-blue-400 mb-4">Privacy & Data</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-white">Download Your Data</h4>
              <p className="text-xs text-gray-400">Export all your data in JSON format (GDPR data portability)</p>
            </div>
            <Button 
              onClick={onExportData} 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700" 
              size="sm"
            >
              {loading ? "Exporting..." : "Download Data"}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 glass-card border border-red-500/20">
        <h3 className="text-xl font-semibold text-red-400 mb-4">Danger Zone</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-white">Logout from all devices</h4>
              <p className="text-xs text-gray-400">This will log you out from all browsers and devices</p>
            </div>
            <Button onClick={onLogoutAll} variant="secondary" size="sm">
              Logout All
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-white">Delete Account</h4>
              <p className="text-xs text-gray-400">Permanently delete your account and ALL data (cannot be undone)</p>
            </div>
            <Button onClick={onDeleteAccount} className="bg-red-600 hover:bg-red-700" size="sm" disabled={loading}>
              {loading ? "Deleting..." : "Delete Account"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
