import { Button, Input, Card } from "../../../components/ui";

export default function PersonalInfoForm({ values, onChange, onSubmit, loading }) {
  return (
    <Card className="p-6 glass-card border border-white/10">
      <h3 className="text-xl font-semibold text-white mb-6">Personal Information</h3>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Full Name *</label>
            <Input
              name="full_name"
              value={values.full_name}
              onChange={onChange}
              placeholder="Your professional name"
              required
            />
            <p className="text-xs text-gray-400 mt-1">Used on resumes and applications</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <Input
              name="email"
              value={values.email}
              disabled
              className="bg-gray-800 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
        >
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Card>
  );
}
