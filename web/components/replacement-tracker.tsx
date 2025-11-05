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
        sensor_lot_number: sensor.lot_number || ''
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">
            Replacement Sensor Tracking
          </h1>
          <p className="text-lg text-gray-600 dark:text-slate-400 mt-2">
            Track replacement sensors from warranty claims and monitor delivery status
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {sensors.length > 0 && (
            <span className="text-sm text-gray-600 dark:text-slate-400">
              {sensors.length} sensor{sensors.length !== 1 ? 's' : ''} available
            </span>
          )}
          <Button 
            onClick={() => setIsAddingNew(true)} 
            className="btn-primary flex items-center space-x-2"
            disabled={sensors.length === 0}
          >
            <Plus className="w-5 h-5" />
            <span>Add Tracking</span>
          </Button>
        </div>
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
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-600" />
              Add New Replacement Tracking
            </h2>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddingNew(false);
                setSelectedSensorId('');
                setNewReplacement({
                  sensor_serial_number: '',
                  sensor_lot_number: '',
                  warranty_claim_number: '',
                  carrier: 'ups',
                  tracking_number: '',
                  expected_delivery: '',
                  notes: ''
                });
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Cancel
            </Button>
          </div>
          <div className="space-y-8">
            {/* Sensor Selection */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-slate-800 dark:to-slate-700/50 p-8 rounded-2xl border border-blue-200 dark:border-slate-600 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <Label htmlFor="sensor-select" className="text-xl font-bold text-gray-900 dark:text-slate-100 block">
                      Sensor Information
                    </Label>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Select the sensor being replaced</p>
                  </div>
                </div>
                
                {sensors.length > 0 ? (
                  <Select value={selectedSensorId} onValueChange={handleSensorSelect}>
                    <SelectTrigger className="h-14 text-base border-2 border-gray-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 bg-white text-black font-medium shadow-sm">
                      <SelectValue placeholder="Choose a sensor from your list" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 bg-white border-2 border-gray-400 shadow-lg">
                      {sensors.map((sensor) => (
                        <SelectItem key={sensor.id} value={sensor.id} className="py-4 px-4 hover:bg-blue-50 focus:bg-blue-100">
                          <div className="flex flex-col">
                            <span className="font-bold text-black text-base">{sensor.serial_number}</span>
                            <span className="text-sm text-gray-700 font-medium">
                              {sensor.sensor_models?.manufacturer} {sensor.sensor_models?.model_name}
                              {sensor.lot_number && ` • Lot: ${sensor.lot_number}`}
                              {sensor.is_problematic && (
                                <span className="ml-2 px-2 py-1 bg-red-200 text-red-800 rounded text-xs font-bold">
                                  Problematic
                                </span>
                              )}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-300 dark:border-amber-700 rounded-xl mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                            Cannot load sensors from database
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            Enter sensor details manually below
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="manual-serial" className="text-base font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          Serial Number
                        </Label>
                        <Input
                          id="manual-serial"
                          value={newReplacement.sensor_serial_number}
                          onChange={(e) => setNewReplacement({ ...newReplacement, sensor_serial_number: e.target.value })}
                          placeholder="Enter sensor serial number"
                          className="h-14 border-2 border-gray-300 dark:border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-500 dark:placeholder:text-slate-400 font-medium shadow-sm rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="manual-lot" className="text-base font-semibold text-gray-900 dark:text-slate-100">
                          Lot Number
                        </Label>
                        <Input
                          id="manual-lot"
                          value={newReplacement.sensor_lot_number}
                          onChange={(e) => setNewReplacement({ ...newReplacement, sensor_lot_number: e.target.value })}
                          placeholder="Enter lot number"
                          className="h-14 border-2 border-gray-300 dark:border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-500 dark:placeholder:text-slate-400 font-medium shadow-sm rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

            {/* Shipping Information */}
            <div className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-slate-800 dark:to-slate-700/50 p-8 rounded-2xl border border-green-200 dark:border-slate-600 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                    Shipping Information
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">Enter carrier and tracking details</p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="carrier" className="text-base font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    Carrier
                  </Label>
                  <Select value={newReplacement.carrier} onValueChange={(value) => setNewReplacement({ ...newReplacement, carrier: value })}>
                    <SelectTrigger className="h-14 border-2 border-gray-300 dark:border-slate-600 focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-base font-medium shadow-sm rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 shadow-xl rounded-xl">
                      {Object.entries(CARRIERS).map(([key, carrier]) => (
                        <SelectItem key={key} value={key} className="py-4 px-4 hover:bg-green-50 dark:hover:bg-slate-700 focus:bg-green-100 dark:focus:bg-slate-600 text-base font-medium">
                          {carrier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tracking" className="text-base font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    Tracking Number
                  </Label>
                  <Input
                    id="tracking"
                    value={newReplacement.tracking_number}
                    onChange={(e) => setNewReplacement({ ...newReplacement, tracking_number: e.target.value })}
                    placeholder="Enter tracking number"
                    className="h-14 border-2 border-gray-300 dark:border-slate-600 focus:border-green-500 focus:ring-2 focus:ring-green-200 text-base bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-500 dark:placeholder:text-slate-400 font-medium shadow-sm rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="claim" className="text-base font-semibold text-gray-900 dark:text-slate-100">
                    Warranty Claim Number
                  </Label>
                  <Input
                    id="claim"
                    value={newReplacement.warranty_claim_number}
                    onChange={(e) => setNewReplacement({ ...newReplacement, warranty_claim_number: e.target.value })}
                    placeholder="Enter claim number"
                    className="h-14 border-2 border-gray-300 dark:border-slate-600 focus:border-green-500 focus:ring-2 focus:ring-green-200 text-base bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-500 dark:placeholder:text-slate-400 font-medium shadow-sm rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery" className="text-base font-semibold text-gray-900 dark:text-slate-100">
                    Expected Delivery
                  </Label>
                  <Input
                    id="delivery"
                    type="date"
                    value={newReplacement.expected_delivery}
                    onChange={(e) => setNewReplacement({ ...newReplacement, expected_delivery: e.target.value })}
                    className="h-14 border-2 border-gray-300 dark:border-slate-600 focus:border-green-500 focus:ring-2 focus:ring-green-200 text-base bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 font-medium shadow-sm rounded-xl"
                  />
                </div>
              </div>
              </div>

            {/* Notes */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-slate-800 dark:to-slate-700/50 p-8 rounded-2xl border border-amber-200 dark:border-slate-600 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <Label htmlFor="notes" className="text-xl font-bold text-gray-900 dark:text-slate-100 block">
                    Additional Notes
                  </Label>
                  <p className="text-sm text-amber-700 dark:text-amber-300">Optional information about this replacement</p>
                </div>
              </div>
              <Textarea
                id="notes"
                value={newReplacement.notes}
                onChange={(e) => setNewReplacement({ ...newReplacement, notes: e.target.value })}
                placeholder="Any additional notes about this replacement..."
                rows={4}
                className="border-2 border-gray-300 dark:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-base bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-500 dark:placeholder:text-slate-400 font-medium resize-none shadow-sm p-4 rounded-xl"
              />
              </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-8 border-t-2 border-gray-200 dark:border-slate-600">
              <Button 
                onClick={handleAddReplacement} 
                className="btn-primary flex items-center space-x-3 px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={!newReplacement.sensor_serial_number || !newReplacement.tracking_number}
              >
                <Plus className="w-5 h-5" />
                <span>Add Replacement Tracking</span>
              </Button>
              <div className="text-sm text-gray-500 dark:text-slate-400 flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                Required fields
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Replacements List */}
      {replacements.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-6">
            <Package className="w-8 h-8 text-gray-400 dark:text-slate-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
            No replacement tracking yet
          </h3>
          <p className="text-gray-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
            Start tracking replacement sensors from your warranty claims. Select a sensor from your list and add the shipping details.
          </p>
          <Button 
            onClick={() => setIsAddingNew(true)} 
            className="btn-primary inline-flex items-center space-x-2"
            disabled={sensors.length === 0}
          >
            <Plus className="w-5 h-5" />
            <span>{sensors.length === 0 ? 'Add Sensors First' : 'Add First Tracking'}</span>
          </Button>
          {sensors.length === 0 && (
            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <p className="text-amber-800 dark:text-amber-200 mb-3">
                You need to add sensors to your account before you can track replacements.
              </p>
              <div className="flex gap-3 justify-center">
                <a 
                  href="/dashboard/sensors/new" 
                  className="btn-primary inline-flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Sensor</span>
                </a>
                <a 
                  href="/dashboard/sensors" 
                  className="btn-secondary inline-flex items-center space-x-2"
                >
                  <Package className="w-4 h-4" />
                  <span>View Sensors</span>
                </a>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {replacements.map((replacement) => (
            <div key={replacement.id} className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-start justify-between mb-8">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <div className={`w-4 h-4 rounded-full shadow-lg ${replacement.status === 'delivered' ? 'bg-green-500' : replacement.status === 'shipped' ? 'bg-blue-500' : replacement.status === 'in_transit' ? 'bg-yellow-500' : 'bg-orange-500'}`} />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                      {replacement.sensor_serial_number}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-6 text-sm text-gray-600 dark:text-slate-400">
                    {replacement.sensor_lot_number && (
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                        <span><span className="font-semibold">Lot:</span> {replacement.sensor_lot_number}</span>
                      </div>
                    )}
                    {replacement.warranty_claim_number && (
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                        <span><span className="font-semibold">Claim:</span> {replacement.warranty_claim_number}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Badge className={`${STATUS_COLORS[replacement.status as keyof typeof STATUS_COLORS]} px-4 py-2 text-sm font-bold rounded-xl shadow-md`}>
                  {replacement.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>

              {/* Tracking Information */}
              <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-xl mb-4">


                {/* Tracking Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                        {CARRIERS[replacement.carrier as keyof typeof CARRIERS]?.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">Carrier</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 font-mono">
                        {replacement.tracking_number}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">Tracking Number</p>
                    </div>
                    {getTrackingUrl(replacement.carrier, replacement.tracking_number) && (
                      <a
                        href={getTrackingUrl(replacement.carrier, replacement.tracking_number)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Track package on carrier website"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                  {replacement.expected_delivery && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                          {new Date(replacement.expected_delivery).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Expected Delivery</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {replacement.notes && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <span className="font-semibold">Notes:</span> {replacement.notes}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-600">
                <div className="text-sm text-gray-500 dark:text-slate-400">
                  <span className="font-medium">Added:</span> {new Date(replacement.created_at).toLocaleDateString()}
                  {replacement.delivered_at && (
                    <span className="ml-4">
                      <span className="font-medium">Delivered:</span> {new Date(replacement.delivered_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  {replacement.status !== 'delivered' && (
                    <Select value={replacement.status} onValueChange={(value) => updateStatus(replacement.id, value)}>
                      <SelectTrigger className="w-40 h-10 border border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600">
                        <SelectItem value="shipped" className="hover:bg-gray-50 dark:hover:bg-slate-700">
                          Shipped
                        </SelectItem>
                        <SelectItem value="in_transit" className="hover:bg-gray-50 dark:hover:bg-slate-700">
                          In Transit
                        </SelectItem>
                        <SelectItem value="out_for_delivery" className="hover:bg-gray-50 dark:hover:bg-slate-700">
                          Out for Delivery
                        </SelectItem>
                        <SelectItem value="delivered" className="hover:bg-gray-50 dark:hover:bg-slate-700">
                          Delivered
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}