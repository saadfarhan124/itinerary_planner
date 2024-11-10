'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Plus } from 'lucide-react'

interface Place {
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface PlaceInputProps {
  onSubmit: (place: Place) => void;
}

export default function PlaceInput({ onSubmit }: PlaceInputProps) {
  const [placeName, setPlaceName] = useState('')
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 })
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
      setPlaceName(place.name || '')
      setCoordinates({
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      name: placeName,
      coordinates: coordinates
    })
    setPlaceName('')
    setCoordinates({ lat: 0, lng: 0 })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-lg px-8 pt-6 pb-8 mb-4">
      <h2 className="text-2xl font-semibold mb-6 text-blue-800 flex items-center">
        <MapPin className="mr-2" />
        Add Place to Visit
      </h2>
      <div className="mb-6">
        <label htmlFor="placeName" className="block text-gray-700 text-sm font-bold mb-2">
          Place Name and Location
        </label>
        <input
          ref={inputRef}
          id="placeName"
          type="text"
          value={placeName}
          onChange={(e) => setPlaceName(e.target.value)}
          placeholder="Search for a place"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline transition duration-300 ease-in-out"
          required
        />
      </div>
      <button type="submit" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105 flex items-center justify-center">
        <Plus className="mr-2" size={16} />
        Add Place
      </button>
    </form>
  )
}