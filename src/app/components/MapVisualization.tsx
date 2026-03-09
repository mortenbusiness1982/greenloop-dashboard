import { MapPin } from 'lucide-react';
import { Card } from './ui/card';

const cities = [
  { name: 'New York', units: 18432, top: '25%', left: '75%' },
  { name: 'Los Angeles', units: 15876, top: '45%', left: '15%' },
  { name: 'Chicago', units: 12654, top: '30%', left: '68%' },
  { name: 'Houston', units: 9821, top: '65%', left: '55%' },
  { name: 'Phoenix', units: 8234, top: '58%', left: '25%' },
  { name: 'San Francisco', units: 11245, top: '38%', left: '8%' },
];

export function MapVisualization() {
  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Recycling by City</h3>
      <div className="relative bg-gray-50 rounded-xl h-[300px] overflow-hidden">
        {/* Simplified map background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-50" />
        
        {/* City markers */}
        {cities.map((city) => (
          <div
            key={city.name}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
            style={{ top: city.top, left: city.left }}
          >
            <div className="relative">
              <div className="w-3 h-3 bg-[#2d6a4f] rounded-full animate-pulse" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-6 h-6 bg-[#2d6a4f] opacity-20 rounded-full" />
              </div>
            </div>
            
            {/* Tooltip on hover */}
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-lg whitespace-nowrap">
                <div className="text-xs font-semibold text-gray-900">{city.name}</div>
                <div className="text-xs text-gray-500">{city.units.toLocaleString()} units</div>
              </div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                <div className="border-4 border-transparent border-t-white" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.05))' }} />
              </div>
            </div>
          </div>
        ))}
        
        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 text-[#2d6a4f]" />
            <span className="text-xs text-gray-600">Active cities</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
