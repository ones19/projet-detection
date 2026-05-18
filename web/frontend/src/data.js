
  export function certitudeKnown(distance) {
    return Math.round((1 - distance / 0.6) * 100)
  }

  export function certitudeUnknown(distance) {
    return Math.round(((distance - 0.6) / 0.4) * 100)
}

export function getCertitude(connu, distance) {
  return connu ? certitudeKnown(distance) : certitudeUnknown(distance)
}

export const API = "http://localhost:8000"