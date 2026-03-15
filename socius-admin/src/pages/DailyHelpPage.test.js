import { extractApproxLatLng } from './DailyHelpPage';

describe('extractApproxLatLng', () => {
  it('extracts lat/lng from help request detail shape', () => {
    const detailData = {
      request: {
        location: {
          coordinatesApprox: [77.123, 28.456],
          address: 'Test Address',
        },
      },
    };

    expect(extractApproxLatLng('help', detailData)).toEqual({
      lat: 28.456,
      lng: 77.123,
      label: 'Test Address',
    });
  });

  it('extracts lat/lng from presence request detail shape', () => {
    const detailData = {
      location: {
        coordinatesApprox: [72.5, 19.1],
        whereToFindText: 'Near station',
      },
    };

    expect(extractApproxLatLng('presence', detailData)).toEqual({
      lat: 19.1,
      lng: 72.5,
      label: 'Near station',
    });
  });

  it('returns null when coordinates are missing/invalid', () => {
    expect(extractApproxLatLng('help', {})).toBeNull();
    expect(extractApproxLatLng('presence', { location: { coordinatesApprox: ['x', 'y'] } })).toBeNull();
  });
});

