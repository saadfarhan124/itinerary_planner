from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Tuple, Dict
from fastapi.middleware.cors import CORSMiddleware
import googlemaps
from sklearn.cluster import KMeans
import numpy as np
import logging, os
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS middleware configuration
# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Initialize the Google Maps client with your API key
gmaps = googlemaps.Client(key=os.getenv('GOOGLE_MAPS_API_KEY'))

# Pydantic models for request validation
class Location(BaseModel):
    name: str
    coordinates: Dict[str, float]

class ItineraryRequest(BaseModel):
    hotel: Location
    places: List[Location]
    days: int

# Function to group locations into clusters (days) based on proximity
def cluster_locations(hotel, places, days):
    logger.info("Clustering locations into %d clusters for %d days.", days, days)
    try:
        # Convert dict coordinates to array format for clustering
        locations = [[hotel[1]['lat'], hotel[1]['lng']]] + [[place[1]['lat'], place[1]['lng']] for place in places]
        location_coords = np.array(locations)

        # Use KMeans to divide locations into 'days' clusters
        kmeans = KMeans(n_clusters=days, random_state=0)
        kmeans.fit(location_coords)

        # Group places into clusters by their index, excluding the hotel
        clusters = [[] for _ in range(days)]
        for idx, label in enumerate(kmeans.labels_):
            if idx == 0:
                continue  # Skip hotel (index 0)
            clusters[label].append(places[idx - 1])

        logger.info("Clustering complete.")
        return clusters

    except Exception as e:
        logger.error("Error occurred while clustering locations: %s", e)
        return []

# Function to find the optimal visit order for each day using the Directions API
def get_optimal_route(hotel, places):
    logger.info("Calculating optimal route for a group of %d locations.", len(places))
    try:
        # Convert dict coordinates to (lat,lng) tuples for Google Maps API
        waypoints = [(place[1]['lat'], place[1]['lng']) for place in places]

        # Get optimized order first
        directions_result = gmaps.directions(
            origin=(hotel[1]['lat'], hotel[1]['lng']),
            destination=(hotel[1]['lat'], hotel[1]['lng']),
            waypoints=waypoints,
            optimize_waypoints=True,
            mode="driving"
        )

        waypoint_order = directions_result[0]["waypoint_order"]
        optimized_places = [places[i] for i in waypoint_order]

        # Create full route including hotel at start and end
        full_route = [hotel] + optimized_places + [hotel]
        route_segments = []

        # Get directions between each consecutive pair of locations
        for i in range(len(full_route) - 1):
            segment_result = gmaps.directions(
                origin=(full_route[i][1]['lat'], full_route[i][1]['lng']),
                destination=(full_route[i + 1][1]['lat'], full_route[i + 1][1]['lng']),
                mode="driving"
            )
            if segment_result:
                route_segments.append({
                    "from": full_route[i][0],
                    "to": full_route[i + 1][0],
                    "polyline": segment_result[0]["overview_polyline"]["points"]
                })

        logger.info("Optimal route calculated with individual segments.")
        return full_route, route_segments

    except Exception as e:
        logger.error("Error occurred while getting optimal route: %s", e)
        return [], []

# Main function to generate itinerary
def generate_itinerary(hotel, places, days):
    logger.info("Starting itinerary generation for %d days.", days)
    try:
        # Group places into clusters for each day
        clusters = cluster_locations(hotel, places, days)

        # Generate and print itinerary
        itinerary = {}
        for day, cluster in enumerate(clusters, start=1):
            logger.info("Generating itinerary for Day %d with %d locations.", day, len(cluster))
            
            # Get optimal route and route segments for the day's cluster
            route, routeSegments = get_optimal_route(hotel, cluster)

            # Format each location with name and coordinates
            formattedRoute = []
            for place in route:
                formattedRoute.append({
                    "name": place[0],
                    "coordinates": {
                        "lat": place[1]['lat'],
                        "lng": place[1]['lng']
                    }
                })

            itinerary[f"Day {day}"] = {
                "route": formattedRoute,
                "routeSegments": routeSegments
            }

        logger.info("Itinerary generation complete.")
        return itinerary

    except Exception as e:
        logger.error("Error occurred while generating itinerary: %s", e)
        return {}

@app.post("/generate-itinerary")
async def generateItinerary(request: ItineraryRequest):
    logger.info("Received itinerary request for %d days", request.days)
    try:
        # Convert Pydantic models to the format expected by existing functions
        hotelTuple = (request.hotel.name, request.hotel.coordinates)
        placesTuples = [(place.name, place.coordinates) for place in request.places]
        
        itinerary = generate_itinerary(hotelTuple, placesTuples, request.days)
        
        if not itinerary:
            raise HTTPException(status_code=500, detail="Failed to generate itinerary")
            
        return itinerary
    except Exception as e:
        logger.error("Error in generate_itinerary endpoint: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

# Example of how to run the API (add at bottom of file)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
