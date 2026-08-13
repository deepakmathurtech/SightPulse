/**
 * Geofence & Location Validation Service
 * Includes Haversine distance, Wi-Fi BSSID validation, and Anti-Spoofing checks.
 */

// Calculate distance between two lat/lng pairs in meters using Haversine formula
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

function validateStudentLocation({ studentLat, studentLng, accuracy, bssid, classroom, previousCheck }) {
  const result = {
    isValid: false,
    distanceMeters: 0,
    reasons: [],
    antiSpoofingFlags: []
  };

  if (!studentLat || !studentLng) {
    result.reasons.push('GPS coordinates missing or disabled.');
    return result;
  }

  // 1. Haversine Distance Check
  const distance = calculateHaversineDistance(
    studentLat,
    studentLng,
    classroom.latitude,
    classroom.longitude
  );
  result.distanceMeters = Math.round(distance * 10) / 10;

  if (distance > classroom.radius_meters) {
    result.reasons.push(`Outside geofence zone (${result.distanceMeters}m away, max allowed ${classroom.radius_meters}m).`);
  }

  // 2. Accuracy Check (Anti-Spoofing)
  if (accuracy && accuracy > 100) {
    result.antiSpoofingFlags.push(`GPS accuracy too low (${Math.round(accuracy)}m). High risk of mock location generator.`);
    result.reasons.push('Location accuracy confidence unacceptable.');
  }

  // 3. Wi-Fi BSSID Verification
  let bssidMatched = false;
  if (classroom.bssid_whitelist) {
    try {
      const allowedBssids = JSON.parse(classroom.bssid_whitelist);
      if (Array.isArray(allowedBssids) && allowedBssids.length > 0) {
        if (bssid && allowedBssids.some(b => b.toLowerCase() === bssid.toLowerCase())) {
          bssidMatched = true;
        } else {
          result.antiSpoofingFlags.push(`Wi-Fi BSSID '${bssid || 'None'}' does not match classroom wireless access points.`);
        }
      } else {
        bssidMatched = true; // No restriction defined
      }
    } catch (e) {
      bssidMatched = true;
    }
  } else {
    bssidMatched = true;
  }

  // 4. Velocity / Teleportation Anti-Spoofing Check
  if (previousCheck && previousCheck.verified_lat && previousCheck.verified_at) {
    const timeDiffSeconds = (Date.now() - new Date(previousCheck.verified_at).getTime()) / 1000;
    if (timeDiffSeconds > 0 && timeDiffSeconds < 300) { // check within 5 minutes
      const movementMeters = calculateHaversineDistance(
        previousCheck.verified_lat,
        previousCheck.verified_lng,
        studentLat,
        studentLng
      );
      const velocityMps = movementMeters / timeDiffSeconds;
      if (velocityMps > 15) { // > 54 km/h rapid position jump inside campus
        result.antiSpoofingFlags.push(`Improbable movement speed (${Math.round(velocityMps * 3.6)} km/h). Teleportation spoof detected.`);
        result.reasons.push('Location jump anomaly detected.');
      }
    }
  }

  // Overall validity requires distance inside radius AND no critical spoof flags
  if (distance <= classroom.radius_meters && result.reasons.length === 0) {
    result.isValid = true;
  }

  return result;
}

module.exports = {
  calculateHaversineDistance,
  validateStudentLocation
};
