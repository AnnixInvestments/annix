'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PUMPS_MODULE, PUMP_TYPES, PUMP_SPECIFICATIONS } from '@/app/lib/config/pumps';
import { Breadcrumb } from '../../components/Breadcrumb';

interface MockPumpOrderDetail {
  id: number;
  orderNumber: string;
  customer: {
    name: string;
    contact: string;
    email: string;
    phone: string;
  };
  serviceType: string;
  pumpType: string;
  status: 'pending' | 'quoted' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  specifications: {
    flowRateM3h: number;
    headM: number;
    temperatureC: number;
    fluidType: string;
    viscosityCp?: number;
    solidsPercent?: number;
  };
  materials: {
    casing: string;
    impeller: string;
    shaft: string;
    sealType: string;
  };
  motor: {
    powerKw: number;
    voltage: number;
    frequency: number;
    enclosure: string;
  };
  pricing: {
    unitPrice: number;
    quantity: number;
    discount: number;
    totalPrice: number;
  };
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const MOCK_ORDER: MockPumpOrderDetail = {
  id: 1,
  orderNumber: 'PMP-2026-001',
  customer: {
    name: 'Sasol Mining',
    contact: 'John van der Merwe',
    email: 'john.vdm@sasol.com',
    phone: '+27 11 555 0123',
  },
  serviceType: 'new_pump',
  pumpType: 'centrifugal_end_suction',
  status: 'quoted',
  specifications: {
    flowRateM3h: 250,
    headM: 45,
    temperatureC: 65,
    fluidType: 'water',
    viscosityCp: 1,
    solidsPercent: 0,
  },
  materials: {
    casing: 'cast_iron',
    impeller: 'stainless_316',
    shaft: 'stainless_316',
    sealType: 'mechanical_single',
  },
  motor: {
    powerKw: 45,
    voltage: 525,
    frequency: 50,
    enclosure: 'TEFC',
  },
  pricing: {
    unitPrice: 145000,
    quantity: 1,
    discount: 0,
    totalPrice: 145000,
  },
  notes: 'Customer requires delivery within 6 weeks. Installation support needed.',
  createdAt: '2026-02-01',
  updatedAt: '2026-02-03',
};

const STATUS_COLORS: Record<MockPumpOrderDetail['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  quoted: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<MockPumpOrderDetail['status'], string> = {
  pending: 'Pending Quote',
  quoted: 'Quoted',
  approved: 'Approved',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
        {value !== null && value !== undefined ? value : '-'}
      </dd>
    </div>
  );
}

function formatCurrency(value: number): string {
  return `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PumpOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = Number(params.id);

  const order = orderId === 1 ? MOCK_ORDER : null;

  const serviceTypeLabel = (value: string): string => {
    const category = PUMPS_MODULE.categories.find((c) => c.value === value);
    return category?.label || value;
  };

  const pumpTypeLabel = (value: string): string => {
    const type = PUMP_TYPES.find((t) => t.value === value);
    return type?.label || value.replace(/_/g, ' ');
  };

  const materialLabel = (type: 'casing' | 'impeller' | 'shaft', value: string): string => {
    const materials = PUMP_SPECIFICATIONS.materials[type === 'shaft' ? 'shaft' : type];
    const material = materials?.find((m) => m.value === value);
    return material?.label || value.replace(/_/g, ' ');
  };

  const sealTypeLabel = (value: string): string => {
    const seal = PUMP_SPECIFICATIONS.materials.seal.find((s: { value: string; label: string }) => s.value === value);
    return seal?.label || value.replace(/_/g, ' ');
  };

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-gray-500 text-lg font-semibold mb-2">Order Not Found</div>
          <p className="text-gray-400 mb-4">The order you are looking for does not exist.</p>
          <Link href="/admin/portal/pumps/orders" className="text-blue-600 hover:text-blue-800">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Orders', href: '/admin/portal/pumps/orders' },
          { label: order.orderNumber },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${STATUS_COLORS[order.status]}`}>
              {STATUS_LABELS[order.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            {serviceTypeLabel(order.serviceType)} - {pumpTypeLabel(order.pumpType)}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/admin/portal/pumps/orders')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Back
          </button>
          <button
            onClick={() => {}}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Order
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Pump Specifications</h2>
            </div>
            <div className="px-6 py-4">
              <dl className="divide-y divide-gray-200">
                <InfoRow label="Flow Rate" value={`${order.specifications.flowRateM3h} m³/h`} />
                <InfoRow label="Head" value={`${order.specifications.headM} m`} />
                <InfoRow label="Temperature" value={`${order.specifications.temperatureC}°C`} />
                <InfoRow label="Fluid Type" value={order.specifications.fluidType} />
                {order.specifications.viscosityCp && (
                  <InfoRow label="Viscosity" value={`${order.specifications.viscosityCp} cP`} />
                )}
                {order.specifications.solidsPercent !== undefined && (
                  <InfoRow label="Solids Content" value={`${order.specifications.solidsPercent}%`} />
                )}
              </dl>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Materials</h2>
            </div>
            <div className="px-6 py-4">
              <dl className="divide-y divide-gray-200">
                <InfoRow label="Casing" value={materialLabel('casing', order.materials.casing)} />
                <InfoRow label="Impeller" value={materialLabel('impeller', order.materials.impeller)} />
                <InfoRow label="Shaft" value={materialLabel('shaft', order.materials.shaft)} />
                <InfoRow label="Seal Type" value={sealTypeLabel(order.materials.sealType)} />
              </dl>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Motor Specifications</h2>
            </div>
            <div className="px-6 py-4">
              <dl className="divide-y divide-gray-200">
                <InfoRow label="Power" value={`${order.motor.powerKw} kW`} />
                <InfoRow label="Voltage" value={`${order.motor.voltage} V`} />
                <InfoRow label="Frequency" value={`${order.motor.frequency} Hz`} />
                <InfoRow label="Enclosure" value={order.motor.enclosure} />
              </dl>
            </div>
          </div>

          {order.notes && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Notes</h2>
              </div>
              <div className="px-6 py-4">
                <p className="text-sm text-gray-700">{order.notes}</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Customer</h2>
            </div>
            <div className="px-6 py-4">
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Company</dt>
                  <dd className="text-sm text-gray-900">{order.customer.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Contact</dt>
                  <dd className="text-sm text-gray-900">{order.customer.contact}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="text-sm text-blue-600">
                    <a href={`mailto:${order.customer.email}`}>{order.customer.email}</a>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="text-sm text-gray-900">{order.customer.phone}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Pricing</h2>
            </div>
            <div className="px-6 py-4">
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Unit Price</dt>
                  <dd className="text-sm text-gray-900">{formatCurrency(order.pricing.unitPrice)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Quantity</dt>
                  <dd className="text-sm text-gray-900">{order.pricing.quantity}</dd>
                </div>
                {order.pricing.discount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Discount</dt>
                    <dd className="text-sm text-green-600">-{formatCurrency(order.pricing.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t border-gray-200">
                  <dt className="text-sm font-medium text-gray-900">Total</dt>
                  <dd className="text-lg font-bold text-gray-900">{formatCurrency(order.pricing.totalPrice)}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Timeline</h2>
            </div>
            <div className="px-6 py-4">
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="text-sm text-gray-900">{order.createdAt}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="text-sm text-gray-900">{order.updatedAt}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Actions</h2>
            </div>
            <div className="px-6 py-4 space-y-2">
              <button className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                Approve Order
              </button>
              <button className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                Generate Quote PDF
              </button>
              <button className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                Send to Customer
              </button>
              <button className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50">
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Demo Data</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                This page displays sample data for demonstration purposes. Connect to the pump orders
                API to display real order data from your system.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
