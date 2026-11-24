import type { Place } from './movement';

export const DEMO_PASSWORD = 'DemoPass123!';

/** Public landmarks of Zagreb, used as stand-ins for everyday places. No real private addresses. */
export const PLACES = {
  home: { name: 'Home', latitude: 45.8105, longitude: 15.9822, radius: 120 },
  school: { name: 'School', latitude: 45.804, longitude: 15.973, radius: 150 },
  office: { name: 'Office', latitude: 45.8131, longitude: 15.9775, radius: 100 },
  gym: { name: 'Gym', latitude: 45.782, longitude: 15.9215, radius: 160 },
  park: { name: 'Park', latitude: 45.8225, longitude: 16.0183, radius: 250 },
} satisfies Record<string, Place>;

export type PlaceKey = keyof typeof PLACES;
export type Routine = 'office-worker' | 'school-kid' | 'homebody' | 'shift-worker' | 'none';
export type PlanState = 'free' | 'premium-active' | 'premium-expired' | 'canceled';

export interface DemoUser {
  key: string;
  name: string;
  email: string;
  routine: Routine;
  plan: PlanState;
  visibleTo: 'all' | 'selected' | 'none';
  /** Keys of the users this person shares with when visibleTo is "selected". */
  selected?: string[];
  schedule?: { name: string; days: string[]; startTime: string; endTime: string };
}

export interface DemoFamily {
  name: string;
  admins: string[];
  members: string[];
  invited?: string[];
  /** Places this family tracks as safe zones. */
  zones: PlaceKey[];
}

const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

export const USERS: DemoUser[] = [
  {
    key: 'owner',
    name: 'Ana Horvat',
    email: 'demo.owner@example.com',
    routine: 'office-worker',
    plan: 'premium-active',
    visibleTo: 'all',
  },
  {
    key: 'partner',
    name: 'Marko Horvat',
    email: 'demo.partner@example.com',
    routine: 'shift-worker',
    plan: 'free',
    visibleTo: 'all',
  },
  {
    key: 'teen',
    name: 'Ivan Horvat',
    email: 'demo.teen@example.com',
    routine: 'school-kid',
    plan: 'free',
    visibleTo: 'selected',
    selected: ['owner', 'partner'],
    schedule: { name: 'School hours', days: weekdays, startTime: '08:00', endTime: '15:00' },
  },
  {
    key: 'kid',
    name: 'Lana Horvat',
    email: 'demo.kid@example.com',
    routine: 'school-kid',
    plan: 'free',
    visibleTo: 'all',
  },
  {
    key: 'petra',
    name: 'Petra Kovac',
    email: 'demo.petra@example.com',
    routine: 'office-worker',
    plan: 'premium-expired',
    visibleTo: 'all',
  },
  {
    key: 'luka',
    name: 'Luka Kovac',
    email: 'demo.luka@example.com',
    routine: 'homebody',
    plan: 'canceled',
    visibleTo: 'none',
  },
  {
    key: 'dino',
    name: 'Dino Kovac',
    email: 'demo.dino@example.com',
    routine: 'school-kid',
    plan: 'free',
    visibleTo: 'all',
  },
  {
    key: 'marija',
    name: 'Marija Babic',
    email: 'demo.marija@example.com',
    routine: 'homebody',
    plan: 'free',
    visibleTo: 'all',
  },
  {
    key: 'tomislav',
    name: 'Tomislav Babic',
    email: 'demo.tomislav@example.com',
    routine: 'shift-worker',
    plan: 'premium-active',
    visibleTo: 'selected',
    selected: ['marija'],
  },
  { key: 'sara', name: 'Sara Novak', email: 'demo.sara@example.com', routine: 'none', plan: 'free', visibleTo: 'all' },
];

export const FAMILIES: DemoFamily[] = [
  {
    name: 'Horvat family',
    admins: ['owner', 'partner'],
    members: ['teen', 'kid'],
    zones: ['home', 'school', 'office', 'gym'],
  },
  {
    name: 'Kovac family',
    admins: ['petra'],
    members: ['luka', 'dino'],
    invited: ['demo.invited@example.com'],
    zones: ['home', 'school'],
  },
  { name: 'Babic household', admins: ['marija'], members: ['tomislav'], zones: ['home', 'park'] },
];
