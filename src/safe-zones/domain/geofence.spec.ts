import { CircularZone, diffZones, haversineMeters, isInsideZone, zonesContaining } from './geofence';

const square = { latitude: 45.8131, longitude: 15.9775 };

describe('haversineMeters', () => {
  it('is zero for the same point', () => {
    expect(haversineMeters(square, square)).toBe(0);
  });

  it('measures one degree of latitude as about 111 km', () => {
    const d = haversineMeters({ latitude: 45, longitude: 16 }, { latitude: 46, longitude: 16 });
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_400);
  });

  it('is symmetric', () => {
    const a = { latitude: 45.8, longitude: 15.9 };
    const b = { latitude: 45.7, longitude: 16.1 };
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });

  it('shrinks east-west distance with latitude', () => {
    const atEquator = haversineMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 });
    const atZagreb = haversineMeters({ latitude: 45.8, longitude: 0 }, { latitude: 45.8, longitude: 1 });
    expect(atZagreb).toBeLessThan(atEquator * 0.75);
  });
});

describe('isInsideZone', () => {
  const zone: CircularZone = {
    id: 'z',
    centerLatitude: square.latitude,
    centerLongitude: square.longitude,
    radius: 100,
  };

  it('includes the centre and points within the radius', () => {
    expect(isInsideZone(square, zone)).toBe(true);
    expect(isInsideZone({ latitude: square.latitude + 0.0005, longitude: square.longitude }, zone)).toBe(true); // ~55 m
  });

  it('excludes points beyond the radius', () => {
    expect(isInsideZone({ latitude: square.latitude + 0.002, longitude: square.longitude }, zone)).toBe(false); // ~222 m
  });

  it('treats the boundary as inside', () => {
    const edge = { latitude: square.latitude + 100 / 111_195, longitude: square.longitude };
    expect(isInsideZone(edge, { ...zone, radius: haversineMeters(square, edge) })).toBe(true);
  });
});

describe('zonesContaining', () => {
  it('returns only the zones the point is in', () => {
    const zones: CircularZone[] = [
      { id: 'near', centerLatitude: 45.8131, centerLongitude: 15.9775, radius: 200 },
      { id: 'far', centerLatitude: 45.9, centerLongitude: 16.2, radius: 200 },
    ];
    expect(zonesContaining(square, zones).map((z) => z.id)).toEqual(['near']);
  });
});

describe('diffZones', () => {
  const a = { id: 'a' };
  const b = { id: 'b' };
  const c = { id: 'c' };

  it('reports zones entered and left', () => {
    expect(diffZones([b, c], [a, b])).toEqual({ entered: [c], left: [a] });
  });

  it('reports nothing when the member stays put', () => {
    expect(diffZones([a], [a])).toEqual({ entered: [], left: [] });
  });

  it('treats moving between overlapping zones as leaving one and entering the other', () => {
    expect(diffZones([b], [a])).toEqual({ entered: [b], left: [a] });
  });

  it('handles an empty history', () => {
    expect(diffZones([a, b], [])).toEqual({ entered: [a, b], left: [] });
  });
});
