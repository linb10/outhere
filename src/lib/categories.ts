import type { ComponentType } from 'react';
import {
  Trees, Mountain, Landmark, Waves, Library, Toilet, Baby, Footprints, Bike, Users, HandHeart,
  Recycle, HandCoins, Dumbbell, Sprout, Droplet,
} from 'lucide-react';
import { Basketball, Tennis, Soccer, Baseball, Handball, Field } from '@/components/icons';
import type { Interest, PlaceCategory } from '@/types';

type Icon = ComponentType<{ size?: number | string; className?: string; strokeWidth?: number | string }>;

// Muted category colors; the accent is reserved for UI emphasis.
export const PLACE_CATS: Record<PlaceCategory, { label: string; icon: Icon; color: string }> = {
  park: { label: 'Parks', icon: Trees, color: '#4E8F5B' },
  trail: { label: 'Trails', icon: Mountain, color: '#8A6F4D' },
  basketball: { label: 'Basketball', icon: Basketball, color: '#C2652F' },
  tennis: { label: 'Tennis', icon: Tennis, color: '#9AA33A' },
  handball: { label: 'Handball', icon: Handball, color: '#5F6FB0' },
  field: { label: 'Fields', icon: Field, color: '#3E8E86' },
  playground: { label: 'Playgrounds', icon: Baby, color: '#B05C8A' },
  landmark: { label: 'Landmarks', icon: Landmark, color: '#8C7A3E' },
  waterfront: { label: 'Waterfront', icon: Waves, color: '#3577A8' },
  library: { label: 'Libraries', icon: Library, color: '#7A5BA6' },
  restroom: { label: 'Restrooms', icon: Toilet, color: '#6B7480' },
  fountain: { label: 'Fountains', icon: Droplet, color: '#4A8DB8' },
};
export const PLACE_CAT_KEYS = Object.keys(PLACE_CATS) as PlaceCategory[];

export const INTERESTS: Record<Interest, { label: string; icon: Icon; gradient: [string, string] }> = {
  hiking: { label: 'Hiking', icon: Mountain, gradient: ['#2E4A2F', '#6B8F4E'] },
  basketball: { label: 'Basketball', icon: Basketball, gradient: ['#5A2A12', '#C2652F'] },
  tennis: { label: 'Tennis', icon: Tennis, gradient: ['#3D4214', '#9AA33A'] },
  soccer: { label: 'Soccer', icon: Soccer, gradient: ['#123B37', '#3E8E86'] },
  baseball: { label: 'Baseball', icon: Baseball, gradient: ['#3B1E1E', '#A04A3E'] },
  running: { label: 'Running', icon: Footprints, gradient: ['#1E2A44', '#4C6BB0'] },
  biking: { label: 'Biking', icon: Bike, gradient: ['#1F3A3F', '#3C8C99'] },
  parks: { label: 'Parks', icon: Trees, gradient: ['#1E3A24', '#4E8F5B'] },
  landmarks: { label: 'Landmarks', icon: Landmark, gradient: ['#3A3218', '#8C7A3E'] },
  waterfront: { label: 'Waterfront', icon: Waves, gradient: ['#14304A', '#3577A8'] },
  volunteering: { label: 'Volunteering', icon: HandHeart, gradient: ['#3F1B33', '#B05C8A'] },
  cleanups: { label: 'Cleanups', icon: Recycle, gradient: ['#21391B', '#5E9445'] },
  fundraisers: { label: 'Fundraisers', icon: HandCoins, gradient: ['#3D2A10', '#B07A2E'] },
  meetups: { label: 'Meetups', icon: Users, gradient: ['#2A2440', '#6B5BA6'] },
  family: { label: 'Family', icon: Sprout, gradient: ['#173A33', '#4A9A7E'] },
  fitness: { label: 'Fitness', icon: Dumbbell, gradient: ['#2B2B2B', '#6E6E6E'] },
};
export const INTEREST_KEYS = Object.keys(INTERESTS) as Interest[];

// "Related" interests earn half credit in recommendations.
export const RELATED: Record<Interest, Interest[]> = {
  hiking: ['parks', 'running', 'fitness'],
  basketball: ['fitness', 'meetups'],
  tennis: ['fitness'],
  soccer: ['fitness', 'running'],
  baseball: ['fitness', 'family'],
  running: ['fitness', 'hiking', 'biking'],
  biking: ['running', 'fitness', 'waterfront'],
  parks: ['hiking', 'family', 'cleanups'],
  landmarks: ['waterfront', 'parks'],
  waterfront: ['landmarks', 'biking', 'parks'],
  volunteering: ['cleanups', 'fundraisers'],
  cleanups: ['volunteering', 'parks'],
  fundraisers: ['volunteering', 'meetups'],
  meetups: ['fundraisers', 'family'],
  family: ['parks', 'meetups'],
  fitness: ['running', 'basketball'],
};

// Volunteer-type categories count toward volunteer hours.
export const VOLUNTEER_CATS: Interest[] = ['volunteering', 'cleanups', 'fundraisers'];

// Which place categories match each interest (for place recommendations).
export const INTEREST_PLACES: Record<Interest, PlaceCategory[]> = {
  hiking: ['trail'], basketball: ['basketball'], tennis: ['tennis'], soccer: ['field'], baseball: ['field'],
  running: ['park', 'trail', 'waterfront'], biking: ['park', 'waterfront'], parks: ['park'], landmarks: ['landmark'],
  waterfront: ['waterfront'], volunteering: ['library', 'park'], cleanups: ['park', 'waterfront'], fundraisers: ['library'],
  meetups: ['park', 'library'], family: ['playground', 'park'], fitness: ['park', 'field'],
};
