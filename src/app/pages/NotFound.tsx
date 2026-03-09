import { useNavigate } from 'react-router';
import { Button } from '../components/ui/Button';
import { Home, ArrowLeft } from 'lucide-react';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#2d6a4f] bg-opacity-10 rounded-2xl mb-4">
            <span className="text-5xl">🌱</span>
          </div>
          <h1 className="text-6xl font-semibold text-gray-900 mb-2">404</h1>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Page not found</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Sorry, we couldn't find the page you're looking for. The URL may be incorrect or the page may have been moved.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Button
            variant="secondary"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
          <Button
            variant="primary"
            icon={<Home className="w-4 h-4" />}
            onClick={() => navigate('/')}
          >
            Go to Dashboard
          </Button>
        </div>

        <div className="mt-12">
          <p className="text-sm text-gray-400">
            Need help? Contact support@greenloop.com
          </p>
        </div>
      </div>
    </div>
  );
}
