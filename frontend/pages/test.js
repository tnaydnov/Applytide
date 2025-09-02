import { useState } from 'react';
import { Button, Modal } from '../components/ui';

export default function TestPage() {
  const [showModal, setShowModal] = useState(false);
  const [counter, setCounter] = useState(0);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Button Test Page</h1>
      
      <div className="space-y-4">
        <div className="flex gap-4">
          <Button onClick={() => alert('Simple Alert Button Works!')}>
            🚨 Alert Button
          </Button>
          
          <Button onClick={() => setCounter(counter + 1)}>
            📊 Counter: {counter}
          </Button>
          
          <Button onClick={() => setShowModal(true)} className="bg-purple-600 hover:bg-purple-700">
            🪟 Open Modal
          </Button>
        </div>

        <div className="p-4 bg-gray-100 rounded">
          <p>Counter value: {counter}</p>
          <p>Modal state: {showModal ? 'OPEN' : 'CLOSED'}</p>
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Test Modal</h2>
          <p className="mb-4">This modal is working correctly!</p>
          <Button onClick={() => setShowModal(false)}>
            Close Modal
          </Button>
        </div>
      </Modal>
    </div>
  );
}
