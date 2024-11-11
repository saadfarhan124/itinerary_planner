'use client'

import { useState, useEffect, useRef } from 'react'
import { Hotel, Calendar } from 'lucide-react'

interface Place {
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface HotelInputProps {
  onSubmit: (hotel: Place) => void;
  onDaysChange: (days: number) => void;
}

export default function HotelInput({ onSubmit, onDaysChange }: HotelInputProps) {
  const [hotelName, setHotelName] = useState('')
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 })
  const [days, setDays] = useState(1)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.google && inputRef.current) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, { types: ['establishment'] })
      autocompleteRef.current.addListener('place_changed', handlePlaceSelect)
    }
  }, [])

  const handlePlaceSelect = () => {
    const place = autocompleteRef.current?.getPlace()
    if (place && place.geometry && place.geometry.location) {
      setHotelName(place.name || '')
      setCoordinates({
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      name: hotelName,
      coordinates: coordinates
    })
    onDaysChange(days)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-lg px-8 pt-6 pb-8 mb-4">
      <h2 className="text-2xl font-semibold mb-6 text-blue-800 flex items-center">
        <Hotel className="mr-2" />
        Hotel Information
      </h2>
      <div className="mb-4">
        <label htmlFor="hotelName" className="block text-gray-700 text-sm font-bold mb-2 flex items-center">
          <span className="mr-2">Hotel Name and Location</span>
        </label>
        <input
          ref={inputRef}
          id="hotelName"
          type="text"
          value={hotelName}
          onChange={(e) => setHotelName(e.target.value)}
          placeholder="Search for a hotel"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline transition duration-300 ease-in-out"
          required
        />
      </div>
      <div className="mb-6">
        <label htmlFor="days" className="block text-gray-700 text-sm font-bold mb-2 flex items-center">
          <Calendar className="mr-2" size={16} />
          <span>Number of Days</span>
        </label>
        <input
          id="days"
          type="number"
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          placeholder="Enter number of days"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline transition duration-300 ease-in-out"
          required
          min="1"
        />
      </div>
      <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition duration-300 ease-in-out transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
        Set Hotel
      </button>
    </form>
  )
}