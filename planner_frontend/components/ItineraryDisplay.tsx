import React from 'react'
import { Calendar, MapPin } from 'lucide-react'

interface Place {
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface RouteSegment {
  from: string;
  to: string;
  polyline: string;
}

interface DayItinerary {
  route: Place[];
  routeSegments: RouteSegment[];
}

interface Itinerary {
  [day: string]: DayItinerary;
}

interface ItineraryDisplayProps {
  itinerary: Itinerary;
  onDaySelect: (day: string) => void;
  selectedDay: string | null;
}

const ItineraryDisplay: React.FC<ItineraryDisplayProps> = ({ itinerary, onDaySelect, selectedDay }) => {
  return (
    <div className="bg-white shadow-lg rounded-lg px-8 pt-6 pb-8 mb-4">
      <h2 className="text-2xl font-semibold mb-6 text-blue-800 flex items-center">
        <Calendar className="mr-2" />
        Your Itinerary
      </h2>
      <div className="mb-4">
        <label htmlFor="day-select" className="block text-sm font-medium text-gray-700">Select Day:</label>
        <select
          id="day-select"
          value={selectedDay || ''}
          onChange={(e) => onDaySelect(e.target.value)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        >
          {Object.keys(itinerary).map((day) => (
            <option key={day} value={day}>{day}</option>
          ))}
        </select>
      </div>
      {selectedDay && itinerary[selectedDay] && (
        <div>
          <h3 className="text-xl font-semibold mb-3 text-blue-700">{selectedDay}</h3>
          <ul className="space-y-2">
            {itinerary[selectedDay].route.map((place, index) => (
              <li key={index} className="flex items-center bg-blue-50 p-3 rounded-md transition duration-300 ease-in-out transform hover:scale-105">
                <MapPin className="mr-2 text-blue-500" size={16} />
                <span className="text-gray-800">{place.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default ItineraryDisplay