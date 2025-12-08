'use client';

import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, ExternalLink, Calendar, Truck } from 'lucide-react';

interface Sensor {
  id: string;
  serial_number: string;
  lot_number?: string;
  is_problematic: boolean;
  sensor_models?: {
    id: string;
    manufacturer: string;
    model_name: string;
  };
}

interface Replacement {
  id: string;
  sensor_serial_number: string;
  sensor_lot_number?: string;
  warranty_claim_number?: string;
  carrier: string;
  tracking_number: string;
  expected_delivery?: string;
  status: string;
  delivered_at?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

const CARRIERS = {
  ups: { name: 'UPS', url: 'https://www.ups.com/track?tracknum=' },
  fedex: { name: 'FedEx', url: 'https://www.fedex.com/fedextrack/?trknbr=' },
  usps: { name: 'USPS', url: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=' },
  dhl: { name: 'DHL', url: 'https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=' },
  other: { name: 'Other', url: '' }
};

const STATUS_COLORS = {
  shipped: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-yellow-100 text-yellow-800',
  out_for_delivery: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800'
};

export default function ReplacementTracker() {
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [selectedSensorId, setSelectedSensorId] = useState('');
  const [apiStatus, setApiStatus] = useState<{sensors: boolean, replacements: boolean}>({sensors: false, replacements: false});
  const [newReplacement, setNewReplacement] = useState({
    sensor_serial_number: '',
    sensor_lot_number: '',
    sensor_model_id: '',
    warranty_claim_number: '',
    carrier: 'ups',
    tracking_number: '',
    expected_delivery: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);



  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch replacements - ignore errors if table doesn't exist yet
      try {
        const replacementsResponse = await fetch('/api/replacement-tracking?demo=true');
        if (replacementsResponse.ok) {
          const replacementsData = await replacementsResponse.json();
          setReplacements(replacementsData.replacements || []);
          setApiStatus(prev => ({...prev, replacements: true}));
        } else {
          console.log('Replacement tracking table may not exist yet - run migration first');
          setReplacements([]);
          setApiStatus(prev => ({...prev, replacements: false}));
        }
      } catch (error) {
        console.log('Replacement tracking not available yet');
        setReplacements([]);
        setApiStatus(prev => ({...prev, replacements: false}));
      }

      // Fetch sensors - try to get any available sensors
      try {
        // Try to fetch sensors without strict user filtering for demo purposes
        const sensorsResponse = await fetch('/api/sensors?demo=true');
        
        if (sensorsResponse.ok) {
          const sensorsData = await sensorsResponse.json();
          console.log('Fetched sensors:', sensorsData.sensors?.length || 0);
          setSensors(sensorsData.sensors || []);
          setApiStatus(prev => ({...prev, sensors: true}));
        } else {
          const errorText = await sensorsResponse.text();
          console.error('Failed to fetch sensors:', errorText);
          setSensors([]);
          setApiStatus(prev => ({...prev, sensors: false}));
        }
      } catch (error) {
        console.error('Error fetching sensors:', error);
        setSensors([]);
        setApiStatus(prev => ({...prev, sensors: false}));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSensorSelect = (sensorId: string) => {
    const sensor = sensors.find(s => s.id === sensorId);
    if (sensor) {
      setSelectedSensorId(sensorId);
      setNewReplacement({
        ...newReplacement,
        sensor_serial_number: sensor.serial_number,
        sensor_lot_number: sensor.lot_number || '',
        sensor_model_id: sensor.sensor_models?.id || ''
      });
    }
  };

  const handleAddReplacement = async () => {
    if (!newReplacement.sensor_serial_number || !newReplacement.tracking_number) return;

    try {
      const response = await fetch('/api/replacement-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newReplacement,
          expected_delivery: newReplacement.expected_delivery || null
        }),
      });

      if (response.ok) {
        setIsAddingNew(false);
        setSelectedSensorId('');
        setNewReplacement({
          sensor_serial_number: '',
          sensor_lot_number: '',
          sensor_model_id: '',
          warranty_claim_number: '',
          carrier: 'ups',
          tracking_number: '',
          expected_delivery: '',
          notes: ''
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error adding replacement:', error);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/replacement-tracking/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };



  const getTrackingUrl = (carrier: string, trackingNumber: string) => {
    const carrierInfo = CARRIERS[carrier as keyof typeof CARRIERS];
    return carrierInfo?.url ? `${carrierInfo.url}${trackingNumber}` : '';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Package className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading replacement tracking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Replacement Tracking</h2>
          <p className="text-sm text-gray-400">Track replacement sensors from warranty claims</p>
        </div>
        <Button 
          onClick={() => setIsAddingNew(true)} 
          variant="outline"
          size="sm"
          className="bg-gray-800 hover:bg-gray-700 border-gray-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          <span>Add Tracking</span>
        </Button>
      </div>

      {/* Status Banner */}
      {!isLoading && (!apiStatus.sensors || !apiStatus.replacements) && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <span className="text-amber-600 dark:text-amber-400 text-xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">Setup Required</h3>
              <div className="space-y-1 text-sm text-amber-700 dark:text-amber-300">
                {!apiStatus.sensors && (
                  <p>• Sensors API not working - check database connection or add sensors</p>
                )}
                {!apiStatus.replacements && (
                  <p>• Replacement tracking table not found - run migration: <code className="bg-amber-100 dark:bg-amber-800 px-2 py-1 rounded text-xs">npx supabase db push</code></p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddingNew && (
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-400" />
              Add New Replacement Tracking
            </h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setIsAddingNew(false);
                setSelectedSensorId('');
                setNewReplacement({
                  sensor_serial_number: '',
                  sensor_lot_number: '',
                  sensor_model_id: '',
                  warranty_claim_number: '',
                  carrier: 'ups',
                  tracking_number: '',
                  expected_delivery: '',
                  notes: ''
                });
              }}
              className="bg-gray-800 hover:bg-gray-700 border-gray-700"
            >
              Cancel
            </Button>
          </div>
          <div className="space-y-6">
            {/* Sensor Selection */}
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <Package className="h-5 w-5 text-blue-400" />
                  <div>
                    <Label htmlFor="sensor-select" className="text-base font-semibold text-white block">
                      Sensor Information
                    </Label>
                    <p className="text-sm text-gray-400">Select a sensor or enter details manually</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {sensors.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="sensor-select" className="text-sm font-medium text-gray-300">
                        Quick Select (Optional)
                      </Label>
                      <Select value={selectedSensorId} onValueChange={handleSensorSelect}>
                        <SelectTrigger className="h-10 bg-gray-800 border-gray-700 text-white">
                          <SelectValue placeholder="Choose a sensor from your list" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {sensors.map((sensor) => (
                            <SelectItem key={sensor.id} value={sensor.id} className="text-white hover:bg-gray-700">
                              {sensor.serial_number} - {sensor.sensor_models?.manufacturer} {sensor.sensor_models?.model_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="manual-serial" className="text-sm font-medium text-gray-300">
                        Serial Number *
                      </Label>
                      <Input
                        id="manual-serial"
                        value={newReplacement.sensor_serial_number}
                        onChange={(e) => setNewReplacement({ ...newReplacement, sensor_serial_number: e.target.value })}
                        placeholder="Enter sensor serial number"
                        className="h-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manual-lot" className="text-sm font-medium text-gray-300">
                        Lot Number
                      </Label>
                      <Input
                        id="manual-lot"
                        value={newReplacement.sensor_lot_number}
                        onChange={(e) => setNewReplacement({ ...newReplacement, sensor_lot_number: e.target.value })}
                        placeholder="Enter lot number"
                        className="h-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

            {/* Shipping Information */}
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <Truck className="h-5 w-5 text-green-400" />
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Shipping Information
                  </h3>
                  <p className="text-sm text-gray-400">Enter carrier and tracking details</p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="carrier" className="text-sm font-medium text-gray-300">
                    Carrier *
                  </Label>
                  <Select value={newReplacement.carrier} onValueChange={(value) => setNewReplacement({ ...newReplacement, carrier: value })}>
                    <SelectTrigger className="h-10 bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {Object.entries(CARRIERS).map(([key, carrier]) => (
                        <SelectItem key={key} value={key} className="text-white hover:bg-gray-700">
                          {carrier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tracking" className="text-sm font-medium text-gray-300">
                    Tracking Number *
                  </Label>
                  <Input
                    id="tracking"
                    value={newReplacement.tracking_number}
                    onChange={(e) => setNewReplacement({ ...newReplacement, tracking_number: e.target.value })}
                    placeholder="Enter tracking number"
                    className="h-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="claim" className="text-sm font-medium text-gray-300">
                    Warranty Claim Number
                  </Label>
                  <Input
                    id="claim"
                    value={newReplacement.warranty_claim_number}
                    onChange={(e) => setNewReplacement({ ...newReplacement, warranty_claim_number: e.target.value })}
                    placeholder="Enter claim number"
                    className="h-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery" className="text-sm font-medium text-gray-300">
                    Expected Delivery
                  </Label>
                  <Input
                    id="delivery"
                    type="date"
                    value={newReplacement.expected_delivery}
                    onChange={(e) => setNewReplacement({ ...newReplacement, expected_delivery: e.target.value })}
                    className="h-10 bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
              </div>

            {/* Notes */}
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium text-gray-300">
                  Additional Notes
                </Label>
                <Textarea
                  id="notes"
                  value={newReplacement.notes}
                  onChange={(e) => setNewReplacement({ ...newReplacement, notes: e.target.value })}
                  placeholder="Any additional notes about this replacement..."
                  rows={3}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 resize-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button 
                onClick={handleAddReplacement} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!newReplacement.sensor_serial_number || !newReplacement.tracking_number}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Tracking
              </Button>
              <span className="text-sm text-gray-400 flex items-center">
                * Required fields
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Replacements Table */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
        {replacements.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4 text-lg">No replacement tracking yet</p>
            <Button 
              onClick={() => setIsAddingNew(true)} 
              variant="outline"
              size="sm"
              className="bg-gray-800 hover:bg-gray-700 border-gray-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Tracking
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-400 uppercase tracking-wide">Sensor</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-400 uppercase tracking-wide">Carrier</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-400 uppercase tracking-wide">Tracking Number</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-400 uppercase tracking-wide">Expected Delivery</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {replacements.filter(r => r.status !== 'delivered').map((replacement, index) => (
                  <tr 
                    key={replacement.id} 
                    className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${
                      index === replacements.length - 1 ? 'border-b-0' : ''
                    }`}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <div className="font-semibold text-white">
                            {replacement.sensor_serial_number}
                          </div>
                          {replacement.sensor_lot_number && (
                            <div className="text-sm text-gray-400 mt-0.5">Lot: {replacement.sensor_lot_number}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-gray-400" />
                        <span className="text-white font-medium">
                          {CARRIERS[replacement.carrier as keyof typeof CARRIERS]?.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono">{replacement.tracking_number}</span>
                        {getTrackingUrl(replacement.carrier, replacement.tracking_number) && (
                          <a
                            href={getTrackingUrl(replacement.carrier, replacement.tracking_number)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300"
                            title="Track package"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {replacement.expected_delivery ? (
                        <div className="flex items-center gap-2 text-gray-300">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{new Date(replacement.expected_delivery).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">Not specified</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {replacement.status === 'delivered' ? (
                        <span className="px-3 py-1 bg-green-900/30 text-green-400 text-xs font-semibold rounded-full border border-green-800">
                          Delivered
                        </span>
                      ) : replacement.status === 'shipped' ? (
                        <span className="px-3 py-1 bg-blue-900/30 text-blue-400 text-xs font-semibold rounded-full border border-blue-800">
                          Shipped
                        </span>
                      ) : replacement.status === 'in_transit' ? (
                        <span className="px-3 py-1 bg-yellow-900/30 text-yellow-400 text-xs font-semibold rounded-full border border-yellow-800">
                          In Transit
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-orange-900/30 text-orange-400 text-xs font-semibold rounded-full border border-orange-800">
                          Out for Delivery
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {replacement.status !== 'delivered' && (
                        <Select value={replacement.status} onValueChange={(value) => updateStatus(replacement.id, value)}>
                          <SelectTrigger className="w-36 h-8 bg-gray-800 hover:bg-gray-700 border-gray-700 text-white text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            <SelectItem value="shipped" className="text-white hover:bg-gray-700">
                              Shipped
                            </SelectItem>
                            <SelectItem value="in_transit" className="text-white hover:bg-gray-700">
                              In Transit
                            </SelectItem>
                            <SelectItem value="out_for_delivery" className="text-white hover:bg-gray-700">
                              Out for Delivery
                            </SelectItem>
                            <SelectItem value="delivered" className="text-white hover:bg-gray-700">
                              Delivered
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}