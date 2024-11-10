import googlemaps
from sklearn.cluster import KMeans
import numpy as np
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize the Google Maps client with your API key
gmaps = googlemaps.Client(key='')

# Function to group locations into clusters (days) based on proximity
def cluster_locations(hotel, places, days):
    logger.info("Clustering locations into %d clusters for %d days.", days, days)
    try:
        # Extract coordinates for clustering
        locations = [hotel[1]] + [place[1] for place in places]
        location_coords = np.array(locations)

        # Use KMeans to divide locations into 'days' clusters
        kmeans = KMeans(n_clusters=days, random_state=0)
        kmeans.fit(location_coords)

        # Group places into clusters by their index, excluding the hotel
        clusters = [[] for _ in range(days)]
        for idx, label in enumerate(kmeans.labels_):
            if idx == 0:
                continue  # Skip hotel (index 0)
            clusters[label].append(places[idx - 1])  # Append tuple with name and coordinates

        logger.info("Clustering complete.")
        return clusters

    except Exception as e:
        logger.error("Error occurred while clustering locations: %s", e)
        return []

# Function to find the optimal visit order for each day using the Directions API
def get_optimal_route(hotel, places):
    logger.info("Calculating optimal route for a group of %d locations.", len(places))
    try:
        # Extract coordinates for the Directions API
        waypoints = [place[1] for place in places]

        # Use Directions API with optimize:true to get the best route
        directions_result = gmaps.directions(
            origin=hotel[1],
            destination=hotel[1],  # Round trip back to hotel
            waypoints=waypoints,
            optimize_waypoints=True,
            mode="driving"
        )

        # Parse the optimal order from the result
        waypoint_order = directions_result[0]["waypoint_order"]
        optimized_places = [places[i] for i in waypoint_order]

        # Format output with hotel as starting and ending point
        route = [hotel] + optimized_places + [hotel]
        logger.info("Optimal route calculated.")
        return route

    except Exception as e:
        logger.error("Error occurred while getting optimal route: %s", e)
        return []

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
            
            # Get optimal route for the day's cluster
            route = get_optimal_route(hotel, cluster)

            # Extract place names from the route for output
            route_names = [place[0] for place in route]
            itinerary[f"Day {day}"] = route_names

        logger.info("Itinerary generation complete.")
        return itinerary

    except Exception as e:
        logger.error("Error occurred while generating itinerary: %s", e)
        return {}

# Example Usage
hotel = ("Hotel Name", (13.7285038, 100.5656622))  # Example hotel coordinates with name
places = [
    ("Little Zoo Café", (13.7113324, 100.6060409)),  # Example place with name and coordinates
    ("Cielo Sky Bar", (13.7092345, 100.5975182)),
    ("Masaru Anime", (13.713339, 100.5920146)),
    ("Dasa Book Cafe", (13.7251661, 100.5756152)),
    ("Safari World", (13.7635309, 100.633975)),
    ("Central Village", (13.7242318, 100.585675)),
    ("DJ Plus", (13.7362187, 100.5560414)),
    ("Mega Plaza", (13.7355117, 100.5278661)),
    ("Decommune", (13.7465174, 100.5043625))
]
days = 3  # Example: Plan for 3 days

# Generate and display the itinerary
itinerary = generate_itinerary(hotel, places, days)
for day, route in itinerary.items():
    print(f"{day} Route:")
    for place in route:
        print(f"  - {place}")
