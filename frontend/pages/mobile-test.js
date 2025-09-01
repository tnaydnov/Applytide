import { useState } from 'react';
import { Button, Card, Input, Badge, Modal, MobileCard, MobileGrid, MobileActionButton, ResponsiveContainer, MobileDrawer } from '../components/ui';

export default function MobileTest() {
  const [showModal, setShowModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);

  return (
    <ResponsiveContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">📱 Mobile Test Page</h1>
          <p className="text-gray-600">Testing all mobile-responsive components</p>
        </div>

        {/* Mobile Grid Test */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Responsive Grid</h2>
          <MobileGrid cols={4} className="mb-4">
            <MobileCard title="Metric 1" subtitle="Sample data">
              <div className="text-2xl font-bold text-blue-600">125</div>
            </MobileCard>
            <MobileCard title="Metric 2" subtitle="Another metric">
              <div className="text-2xl font-bold text-green-600">98%</div>
            </MobileCard>
            <MobileCard title="Metric 3" subtitle="More data">
              <div className="text-2xl font-bold text-purple-600">$75k</div>
            </MobileCard>
            <MobileCard title="Metric 4" subtitle="Final metric">
              <div className="text-2xl font-bold text-orange-600">42</div>
            </MobileCard>
          </MobileGrid>
        </Card>

        {/* Button Tests */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🔘 Button Variations</h2>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Button variant="primary" className="w-full sm:w-auto">Primary Button</Button>
              <Button variant="secondary" className="w-full sm:w-auto">Secondary Button</Button>
              <Button variant="outline" className="w-full sm:w-auto">Outline Button</Button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <MobileActionButton icon="📨" variant="primary">Apply</MobileActionButton>
              <MobileActionButton icon="👁️" variant="outline">View</MobileActionButton>
              <MobileActionButton icon="📝" variant="secondary">Edit</MobileActionButton>
              <MobileActionButton icon="🗑️" variant="danger">Delete</MobileActionButton>
            </div>
          </div>
        </Card>

        {/* Form Elements */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📝 Form Elements</h2>
          <div className="space-y-4">
            <Input label="Company Name" placeholder="Enter company name" icon="🏢" />
            <Input label="Position" placeholder="Job title" icon="💼" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Salary Min" placeholder="$50,000" icon="💰" />
              <Input label="Salary Max" placeholder="$100,000" icon="💰" />
            </div>
          </div>
        </Card>

        {/* Application Cards */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📋 Application Cards</h2>
          <div className="space-y-4">
            <MobileCard 
              title="Senior Frontend Developer" 
              subtitle="TechCorp Inc. • San Francisco, CA"
              actions={[
                <Badge key="status" variant="primary" size="sm">Applied</Badge>
              ]}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">📅 Applied 2 days ago</span>
                  <span className="text-green-600 font-medium">💰 $80k - $120k</span>
                </div>
                <div className="text-xs text-gray-500">
                  🔥 High priority • 📝 2 notes
                </div>
              </div>
            </MobileCard>

            <MobileCard 
              title="Full Stack Engineer" 
              subtitle="StartupXYZ • Remote"
              actions={[
                <Badge key="status" variant="success" size="sm">Interview</Badge>
              ]}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">📅 Applied 1 week ago</span>
                  <span className="text-green-600 font-medium">💰 $90k - $130k</span>
                </div>
                <div className="text-xs text-gray-500">
                  ⭐ Medium priority • 📝 5 notes
                </div>
              </div>
            </MobileCard>
          </div>
        </Card>

        {/* Modal and Drawer Tests */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🔧 Interactive Components</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button onClick={() => setShowModal(true)} className="w-full">
              📱 Test Modal
            </Button>
            <Button onClick={() => setShowDrawer(true)} variant="outline" className="w-full">
              📱 Test Drawer
            </Button>
          </div>
        </Card>

        {/* Navigation Test */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🧭 Navigation Links</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <a href="/dashboard" className="block">
              <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 text-center">
                <div className="text-2xl mb-2">📊</div>
                <div className="text-sm font-medium text-gray-900">Dashboard</div>
              </div>
            </a>
            <a href="/pipeline" className="block">
              <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 text-center">
                <div className="text-2xl mb-2">🔄</div>
                <div className="text-sm font-medium text-gray-900">Pipeline</div>
              </div>
            </a>
            <a href="/jobs" className="block">
              <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 text-center">
                <div className="text-2xl mb-2">💼</div>
                <div className="text-sm font-medium text-gray-900">Jobs</div>
              </div>
            </a>
            <a href="/resumes" className="block">
              <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 text-center">
                <div className="text-2xl mb-2">📄</div>
                <div className="text-sm font-medium text-gray-900">Resumes</div>
              </div>
            </a>
          </div>
        </Card>

        {/* Mobile Tips */}
        <Card className="bg-blue-50 border-blue-200">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-blue-900">📱 Mobile Usage Tips</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <h3 className="font-medium mb-2">✨ Touch Optimized</h3>
                <ul className="space-y-1 text-blue-700">
                  <li>• Larger touch targets on mobile</li>
                  <li>• Swipe gestures for navigation</li>
                  <li>• Responsive button sizing</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">📐 Layout Adaptive</h3>
                <ul className="space-y-1 text-blue-700">
                  <li>• Stack columns on small screens</li>
                  <li>• Horizontal scroll for pipelines</li>
                  <li>• Collapsible navigation</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm py-8">
          <p>✅ Mobile responsiveness testing complete!</p>
          <p className="mt-1">Try resizing your browser or viewing on different devices.</p>
        </div>
      </div>

      {/* Test Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="📱 Mobile Modal Test"
        footer={[
          <Button key="cancel" variant="outline" onClick={() => setShowModal(false)}>
            Cancel
          </Button>,
          <Button key="confirm" onClick={() => setShowModal(false)}>
            Confirm
          </Button>
        ]}
      >
        <p className="text-gray-600">
          This modal is optimized for mobile devices with responsive sizing, 
          touch-friendly buttons, and proper spacing.
        </p>
      </Modal>

      {/* Test Drawer */}
      <MobileDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title="📱 Mobile Drawer"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            This drawer slides up from the bottom on mobile devices for better accessibility.
          </p>
          <div className="space-y-2">
            <Button className="w-full" variant="primary">Action 1</Button>
            <Button className="w-full" variant="secondary">Action 2</Button>
            <Button className="w-full" variant="outline">Action 3</Button>
          </div>
        </div>
      </MobileDrawer>
    </ResponsiveContainer>
  );
}
