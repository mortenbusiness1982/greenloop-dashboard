import { Download } from 'lucide-react';
import { Card, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Table } from './ui/table';

const auditData = [
  {
    eventId: 'EVT-2026-03-08-001',
    barcode: '192837465012',
    product: 'Nike Air Max 90',
    timestamp: '2026-03-08 14:32:15',
    location: '40.7128°N, 74.0060°W',
    city: 'New York, NY'
  },
  {
    eventId: 'EVT-2026-03-08-002',
    barcode: '192837465013',
    product: 'Nike Dri-FIT Tee',
    timestamp: '2026-03-08 13:21:43',
    location: '34.0522°N, 118.2437°W',
    city: 'Los Angeles, CA'
  },
  {
    eventId: 'EVT-2026-03-08-003',
    barcode: '192837465014',
    product: 'Nike Sportswear Jacket',
    timestamp: '2026-03-08 12:45:22',
    location: '41.8781°N, 87.6298°W',
    city: 'Chicago, IL'
  },
  {
    eventId: 'EVT-2026-03-08-004',
    barcode: '192837465015',
    product: 'Nike Running Shorts',
    timestamp: '2026-03-08 11:18:56',
    location: '29.7604°N, 95.3698°W',
    city: 'Houston, TX'
  },
  {
    eventId: 'EVT-2026-03-08-005',
    barcode: '192837465016',
    product: 'Nike Tech Fleece',
    timestamp: '2026-03-08 10:34:11',
    location: '33.4484°N, 112.0740°W',
    city: 'Phoenix, AZ'
  },
];

const columns = [
  {
    key: 'eventId',
    header: 'Event ID',
    render: (value: string) => (
      <span className="text-sm font-mono text-gray-900">{value}</span>
    ),
  },
  {
    key: 'barcode',
    header: 'Barcode',
    render: (value: string) => (
      <span className="text-sm font-mono text-gray-600">{value}</span>
    ),
  },
  {
    key: 'product',
    header: 'Product',
    render: (value: string) => (
      <span className="text-sm text-gray-900">{value}</span>
    ),
  },
  {
    key: 'timestamp',
    header: 'Timestamp',
    render: (value: string) => (
      <span className="text-sm text-gray-600">{value}</span>
    ),
  },
  {
    key: 'location',
    header: 'GPS Location',
    render: (value: string) => (
      <span className="text-sm font-mono text-gray-600">{value}</span>
    ),
  },
  {
    key: 'city',
    header: 'City',
    render: (value: string) => (
      <span className="text-sm text-gray-600">{value}</span>
    ),
  },
];

export function TraceabilityData() {
  return (
    <Card>
      <CardHeader
        title="Traceability Data"
        subtitle="Complete audit trail of recycling events"
        action={
          <Button variant="secondary" icon={<Download className="w-4 h-4" />}>
            Export CSV
          </Button>
        }
      />
      <Table columns={columns} data={auditData} />
    </Card>
  );
}
