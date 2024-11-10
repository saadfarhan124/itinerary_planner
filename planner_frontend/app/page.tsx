'use client'

import { useState, useCallback, useEffect, useRef, Fragment } from 'react'
import dynamic from 'next/dynamic'
import { Dialog, Transition, Disclosure } from '@headlessui/react'
import HotelInput from '../components/HotelInput'
import PlaceInput from '../components/PlaceInput'
import { MapPin, Calendar, Navigation, X, ChevronUp } from 'lucide-react'

const GoogleMap = dynamic(() => import('@react-google-maps/api'). then(mod => mod.GoogleMap), {
  ssr: false,
  loading: () => <div style={{ height: '600px', background: '#f0f0f0' }}>Loading map...</div>
})
const Marker = dynamic(() => import('@react-google-maps/api').then(mod => mod.Marker), { ssr: false })
const Polyline = dynamic(() => import('@react-google-maps/api').then(mod => mod.Polyline), { ssr: false })
const InfoWindow = dynamic(() => import('@react-google-maps/api').then(mod => mod.InfoWindow), { ssr: false })

const mapContainerStyle = {
  width: '100%',
  height: '600px'
}

const defaultCenter = {
  lat: 13.7563,
  lng: 100.5018
}

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
}

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

const polylineColors = [
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FFA500', // Orange
  '#800080', // Purple
  '#008000', // Dark Green
  '#000080', // Navy
];

export default function Component() {
  const [hotel, setHotel] = useState<Place>({ name: '', coordinates: { lat: 0, lng: 0 } })
  const [places, setPlaces] = useState<Place[]>([])
  const [days, setDays] = useState(1)
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const mapRef = useRef<google.maps.Map | null>(null)
  const polylinesRef = useRef<google.maps.Polyline[]>([])
  const markersRef = useRef<google.maps.Marker[]>([])
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedMarker, setSelectedMarker] = useState<Place | null>(null)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleHotelSubmit = (hotelData: Place) => {
    setHotel(hotelData)
  }

  const handlePlaceSubmit = (place: Place) => {
    setPlaces([...places, place])
  }

  const handlePlanTrip = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('http://localhost:8000/generate-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hotel, places, days }),
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      console.log('API Response:', data)
      if (data && Object.keys(data).length > 0) {
        setItinerary(data)
        setSelectedDay(Object.keys(data)[0])
      } else {
        throw new Error('Received empty itinerary data')
      }
    } catch (err: any) {
      console.error('Error details:', err)
      setError(`An error occurred while planning the trip: ${err.message}. Please try again.`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemovePlace = (index: number) => {
    setPlaces(places.filter((_, i) => i !== index))
  }

  const handleDaySelect = (day: string) => {
    setSelectedDay(day)
  }

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
  }, [])

  const decodePath = (encoded: string): google.maps.LatLngLiteral[] => {
    const poly = []
    let index = 0, lat = 0, lng = 0

    while (index < encoded.length) {
      let b, shift = 0, result = 0
      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1))
      lat += dlat

      shift = 0
      result = 0
      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1))
      lng += dlng

      poly.push({ lat: lat * 1e-5, lng: lng * 1e-5 })
    }

    return poly
  }

  const clearMap = useCallback(() => {
    polylinesRef.current.forEach(polyline => polyline.setMap(null))
    markersRef.current.forEach(marker => marker.setMap(null))
    polylinesRef.current = []
    markersRef.current = []
  }, [])

  const updateMap = useCallback(() => {
    if (!mapRef.current || !itinerary || !selectedDay) return

    clearMap()

    const dayItinerary = itinerary[selectedDay]
    const bounds = new google.maps.LatLngBounds()

    dayItinerary.route.forEach((place, index) => {
      bounds.extend(place.coordinates)
      const marker = new google.maps.Marker({
        position: place.coordinates,
        map: mapRef.current,
        label: index === 0 ? { text: 'H', color: 'white' } : { text: index.toString(), color: 'white' },
        icon: index === 0 ? {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#4B5563',
          fillOpacity: 1,
          strokeWeight: 0,
          scale: 10,
        } : undefined,
        title: place.name,
      })

      marker.addListener('click', () => {
        setSelectedMarker(place)
      })
      
      markersRef.current.push(marker)
    })

    dayItinerary.routeSegments.forEach((segment, index) => {
      const polyline = new google.maps.Polyline({
        path: decodePath(segment.polyline),
        strokeColor: polylineColors[index % polylineColors.length],
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map: mapRef.current
      })
      polylinesRef.current.push(polyline)
    })

    mapRef.current.fitBounds(bounds)
  }, [itinerary, selectedDay, clearMap])

  useEffect(() => {
    if (mapRef.current) {
      updateMap()
    }
  }, [selectedDay, itinerary, updateMap])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-green-100">
      <div className="container mx-auto p-4">
        <h1 className="text-4xl font-bold mb-8 text-center text-blue-800 pt-8">
          <span className="inline-block transform hover:scale-110 transition-transform duration-200">
            🌍 Trip Planner
          </span>
        </h1>

        {/* Main grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left column: Inputs and Places */}
          <div className="space-y-8">
            <HotelInput onSubmit={handleHotelSubmit} onDaysChange={setDays} />
            <PlaceInput onSubmit={handlePlaceSubmit} />
            
            {/* Places List */}
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-blue-800 flex items-center">
                <MapPin className="mr-2" />
                Places to Visit
              </h2>
              <ul className="space-y-2 bg-white rounded-lg shadow-md p-4">
                {places.map((place, index) => (
                  <li key={index} className="flex items-center justify-between bg-blue-50 p-3 rounded-md">
                    <span className="font-medium text-blue-800">{place.name}</span>
                    <button
                      onClick={() => handleRemovePlace(index)}
                      className="text-red-500 hover:text-red-700 transition duration-300"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Plan Trip Button */}
            <button
              onClick={handlePlanTrip}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-blue-700 transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={isLoading || !hotel.name || places.length === 0}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Planning...
                </span>
              ) : (
                <span className="flex items-center">
                  <Navigation className="mr-2" />
                  Plan Trip
                </span>
              )}
            </button>
            {error && <p className="text-red-500 mt-2 text-center">{error}</p>}
          </div>

          {/* Right column: Map */}
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-blue-800 flex items-center">
              <Navigation className="mr-2" />
              Trip Map
            </h2>
            <div className="rounded-lg overflow-hidden shadow-lg">
              {isClient && (
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={defaultCenter}
                  zoom={10}
                  options={mapOptions}
                  onLoad={onMapLoad}
                >
                  {selectedMarker && (
                    <InfoWindow
                      position={selectedMarker.coordinates}
                      onCloseClick={() => setSelectedMarker(null)}
                    >
                      <div className="p-2">
                        <h3 className="font-semibold text-black">{selectedMarker.name}</h3>
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              )}
            </div>
          </div>
        </div>

        {/* Floating button for itinerary */}
        {itinerary && (
          <>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="fixed bottom-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-blue-700 transition duration-300 flex items-center space-x-2"
            >
              <Calendar className="w-5 h-5" />
              <span>View Itinerary</span>
            </button>

            {/* Itinerary Drawer */}
            <Transition.Root show={isDrawerOpen} as={Fragment}>
              <Dialog as="div" className="relative z-50" onClose={setIsDrawerOpen}>
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="fixed inset-0 bg-black/30 transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-hidden">
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                      <Transition.Child
                        as={Fragment}
                        enter="transform transition ease-in-out duration-300"
                        enterFrom="translate-x-full"
                        enterTo="translate-x-0"
                        leave="transform transition ease-in-out duration-300"
                        leaveFrom="translate-x-0"
                        leaveTo="translate-x-full"
                      >
                        <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                          <div className="flex h-full flex-col bg-white shadow-xl">
                            <div className="px-4 py-6 sm:px-6">
                              <div className="flex items-center justify-between">
                                <Dialog.Title className="text-xl font-semibold text-gray-900">
                                  Your Travel Itinerary
                                </Dialog.Title>
                                <button
                                  onClick={() => setIsDrawerOpen(false)}
                                  className="rounded-md text-gray-400 hover:text-gray-500"
                                >
                                  <span className="sr-only">Close panel</span>
                                  <X className="h-6 w-6" />
                                </button>
                              </div>

                              {/* Itinerary Content with Disclosures */}
                              <div className="mt-6">
                                {Object.entries(itinerary).map(([day, dayData]) => (
                                  <Disclosure key={day} as="div" className="mt-2">
                                    {({ open }) => (
                                      <>
                                        <Disclosure.Button 
                                          className={`flex w-full justify-between rounded-lg px-4 py-2 text-left text-sm font-medium focus:outline-none focus-visible:ring focus-visible:ring-blue-500 ${
                                            selectedDay === day 
                                              ? 'bg-blue-500 text-white' 
                                              : 'bg-blue-100 text-blue-900 hover:bg-blue-200'
                                          }`}
                                          onClick={() => handleDaySelect(day)}
                                        >
                                          <span>{day}</span>
                                          <ChevronUp
                                            className={`${
                                              open ? 'rotate-180 transform' : ''
                                            } h-5 w-5 ${
                                              selectedDay === day ? 'text-white' : 'text-blue-500'
                                            }`}
                                          />
                                        </Disclosure.Button>
                                        <Disclosure.Panel className="px-4 pt-4 pb-2 text-sm text-gray-500">
                                          <ul className="space-y-2">
                                            {dayData.route.map((place, index) => (
                                              <li key={index} className="flex items-center space-x-2">
                                                <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center">
                                                  {index === 0 ? 'H' : index}
                                                </span>
                                                <span>{place.name}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </Disclosure.Panel>
                                      </>
                                    )}
                                  </Disclosure>
                                ))}
                              </div>
                            </div>
                          </div>
                        </Dialog.Panel>
                      </Transition.Child>
                    </div>
                  </div>
                </div>
              </Dialog>
            </Transition.Root>
          </>
        )}
      </div>
    </div>
  )
}