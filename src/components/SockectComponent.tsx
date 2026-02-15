"use client"
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Define the emergency type interface
interface Emergency {
  name: string;
  emergencyType: string;
  address: string;
  phone: string;
  details: string;
  timestamp: string;
}

const EmergencyDataDisplay = () => {
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Establish WebSocket connection
    const socket = new WebSocket(`ws://localhost:8080?type=dashboard`);

    socket.onopen = () => {
      console.log('WebSocket Connected');
      setIsConnected(true);
    };

    socket.onmessage = async (event) => {
      try {
        // Handle Blob data
        if (event.data instanceof Blob) {
          const text = await event.data.text();
          const newEmergency = JSON.parse(text);
          setEmergencies((prevEmergencies) => [
            newEmergency,
            ...prevEmergencies.slice(0, 4)
          ]);
        }
      } catch (error) {
        console.error('Error parsing emergency details:', error);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket Disconnected');
      setIsConnected(false);
    };

    return () => {
      socket.close();
    };
  }, []);

  // Determine badge color based on emergency type
  const getEmergencyBadgeColor = (type: string): string => {
    switch(type) {
      case 'Medical Emergency': return 'bg-red-500';
      case 'Fire': return 'bg-orange-500';
      case 'Car Accident': return 'bg-yellow-500';
      case 'Domestic Disturbance': return 'bg-purple-500';
      case 'Robbery': return 'bg-blue-500';
      case 'Assault': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            <div className="flex items-center justify-between">
              Emergency Incidents
              <Badge 
                variant={isConnected ? 'default' : 'destructive'}
                className={isConnected ? 'bg-green-500' : 'bg-red-500'}
              >
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {emergencies.length === 0 ? (
            <p className="text-gray-500">No emergencies received yet</p>
          ) : (
            <div className="space-y-2">
              {emergencies.map((emergency, index) => (
                <div 
                  key={index} 
                  className="border rounded-lg p-3 shadow-sm"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold">{emergency.name}</h3>
                    <Badge 
                      className={getEmergencyBadgeColor(emergency.emergencyType)}
                    >
                      {emergency.emergencyType}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p><strong>Address:</strong> {emergency.address}</p>
                    <p><strong>Phone:</strong> {emergency.phone}</p>
                    <p><strong>Details:</strong> {emergency.details}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(emergency.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmergencyDataDisplay;