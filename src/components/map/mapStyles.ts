// JSON fallbacks used only when no cloud Map IDs are configured. Muted so pins pop.
type Style = google.maps.MapTypeStyle[];

export const LIGHT_STYLE: Style = [
  { elementType: 'geometry', stylers: [{ color: '#f2f3f4' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b7178' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f6f7f8' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#dfe8dc' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e4e6e9' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cfd8df' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#d0d3d7' }] },
];

export const DARK_STYLE: Style = [
  { elementType: 'geometry', stylers: [{ color: '#14171a' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7d858f' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b0d0f' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#18241b' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#22262b' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c3137' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c1a24' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2a2f35' }] },
];
