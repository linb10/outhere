import { useEffect, useRef } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { MarkerClusterer, SuperClusterAlgorithm, type Renderer } from '@googlemaps/markerclusterer';
import type { Place } from '@/types';
import { mapIdDark, mapIdLight, mapsKey } from '@/lib/env';
import { inNYC, QUEENS_CENTER } from '@/lib/utils';
import { clusterSvg, pinDataUrl, pinSvg } from './pins';
import { DARK_STYLE, LIGHT_STYLE } from './mapStyles';

export interface MapViewProps {
  places: Place[];
  selectedId?: string | null;
  onSelect: (p: Place) => void;
  onMapClick?: (lat: number, lng: number) => void;
  center?: { lat: number; lng: number } | null;
  dark: boolean;
  me?: { lat: number; lng: number } | null;
  zoom?: number;
  className?: string;
}

const NYC_BOUNDS = { north: 40.95, south: 40.45, east: -73.65, west: -74.3 };

export default function MapView(props: MapViewProps) {
  const mapId = (props.dark ? mapIdDark : mapIdLight) || undefined;
  return (
    <APIProvider apiKey={mapsKey} libraries={['marker', 'places']}>
      <Map
        key={props.dark ? 'dark' : 'light'} // map style can't change after init with cloud IDs
        className={props.className}
        defaultCenter={props.center ?? QUEENS_CENTER}
        defaultZoom={props.zoom ?? 13}
        mapId={mapId}
        styles={mapId ? undefined : props.dark ? DARK_STYLE : LIGHT_STYLE}
        backgroundColor={props.dark ? '#202124' : '#F2F3F4'}
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        clickableIcons={false}
        restriction={{ latLngBounds: NYC_BOUNDS, strictBounds: false }}
        minZoom={10}
        onClick={(e) => {
          const ll = e.detail.latLng;
          if (ll && props.onMapClick && inNYC(ll.lat, ll.lng)) props.onMapClick(ll.lat, ll.lng);
        }}
      >
        <Pins {...props} advanced={Boolean(mapId)} />
      </Map>
    </APIProvider>
  );
}

function Pins({ places, selectedId, onSelect, center, dark, me, advanced }: MapViewProps & { advanced: boolean }) {
  const map = useMap();
  const clusterer = useRef<MarkerClusterer | null>(null);
  const markers = useRef(new globalThis.Map<string, google.maps.Marker | google.maps.marker.AdvancedMarkerElement>());
  const meMarker = useRef<google.maps.Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!map) return;
    const renderer: Renderer = {
      render: ({ count, position }) => {
        const { svg, size } = clusterSvg(count, dark);
        if (advanced) {
          const el = document.createElement('div');
          el.innerHTML = svg;
          return new google.maps.marker.AdvancedMarkerElement({ position, content: el, zIndex: 1000 + count });
        }
        return new google.maps.Marker({ position, zIndex: 1000 + count, icon: { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, scaledSize: new google.maps.Size(size, size), anchor: new google.maps.Point(size / 2, size / 2) } });
      },
    };
    clusterer.current = new MarkerClusterer({ map, renderer, algorithm: new SuperClusterAlgorithm({ radius: 70, maxZoom: 15 }) });
    return () => {
      clusterer.current?.clearMarkers();
      clusterer.current?.setMap(null);
      clusterer.current = null;
    };
  }, [map, dark, advanced]);

  // Rebuild markers when the filtered list changes.
  useEffect(() => {
    if (!map || !clusterer.current) return;
    const list: (google.maps.Marker | google.maps.marker.AdvancedMarkerElement)[] = [];
    markers.current.clear();
    for (const p of places) {
      let m: google.maps.Marker | google.maps.marker.AdvancedMarkerElement;
      if (advanced) {
        const el = document.createElement('div');
        el.innerHTML = pinSvg(p.category);
        el.style.cursor = 'pointer';
        m = new google.maps.marker.AdvancedMarkerElement({ position: p, content: el, title: p.name });
        m.addListener('click', () => onSelectRef.current(p));
      } else {
        m = new google.maps.Marker({ position: p, title: p.name, icon: { url: pinDataUrl(p.category), scaledSize: new google.maps.Size(32, 38), anchor: new google.maps.Point(16, 36) }, optimized: true });
        m.addListener('click', () => onSelectRef.current(p));
      }
      markers.current.set(p.id, m);
      list.push(m);
    }
    clusterer.current.clearMarkers();
    clusterer.current.addMarkers(list);
  }, [map, places, advanced, dark]);

  // Highlight the selected pin.
  useEffect(() => {
    const prev: [string, string][] = [];
    const m = selectedId ? markers.current.get(selectedId) : null;
    const p = places.find((x) => x.id === selectedId);
    if (!m || !p) return;
    if (m instanceof google.maps.Marker) {
      m.setIcon({ url: pinDataUrl(p.category, true), scaledSize: new google.maps.Size(38, 45), anchor: new google.maps.Point(19, 43) });
      m.setZIndex(5000);
    } else {
      (m.content as HTMLElement).innerHTML = pinSvg(p.category, true);
      m.zIndex = 5000;
    }
    void prev;
    return () => {
      if (m instanceof google.maps.Marker) {
        m.setIcon({ url: pinDataUrl(p.category), scaledSize: new google.maps.Size(32, 38), anchor: new google.maps.Point(16, 36) });
        m.setZIndex(undefined);
      } else {
        (m.content as HTMLElement).innerHTML = pinSvg(p.category);
        m.zIndex = null;
      }
    };
  }, [selectedId, places]);

  useEffect(() => {
    if (map && center) {
      map.panTo(center);
      if ((map.getZoom() ?? 0) < 14) map.setZoom(15);
    }
  }, [map, center]);

  useEffect(() => {
    if (!map) return;
    meMarker.current?.setMap(null);
    if (!me) return;
    meMarker.current = new google.maps.Marker({
      map, position: me, zIndex: 9999, title: 'You',
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#1A73E8', fillOpacity: 1, strokeColor: '#FFFFFF', strokeWeight: 3 },
    });
    return () => meMarker.current?.setMap(null);
  }, [map, me]);

  return null;
}
