const toKey = (lat, lng, size) => {
  const latKey = Math.floor(lat / size);
  const lngKey = Math.floor(lng / size);
  return `${latKey}:${lngKey}`;
};

const clusterPoints = (points, size = 0.01) => {
  const buckets = {};

  points.forEach((p) => {
    if (typeof p.lat !== 'number' || typeof p.lng !== 'number') {
      return;
    }
    const key = toKey(p.lat, p.lng, size);
    if (!buckets[key]) {
      buckets[key] = { lat: 0, lng: 0, count: 0, items: [] };
    }
    buckets[key].lat += p.lat;
    buckets[key].lng += p.lng;
    buckets[key].count += 1;
    buckets[key].items.push(p);
  });

  return Object.values(buckets).map((bucket) => ({
    lat: bucket.lat / bucket.count,
    lng: bucket.lng / bucket.count,
    count: bucket.count,
    items: bucket.items,
  }));
};

export { clusterPoints };
