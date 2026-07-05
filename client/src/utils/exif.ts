export function formatShutterSpeed(raw: string): string {
  if (raw.includes('/')) return raw;
  const n = parseFloat(raw);
  if (isNaN(n)) return raw;
  if (n >= 1) return `${Math.round(n)}s`;
  const denominator = Math.round(1 / n);
  return `1/${denominator}`;
}

export const EXIF_TOOLTIPS = {
  camera: {
    title: 'Appareil photo',
    description: "Modèle de l'appareil utilisé pour capturer cette photo.",
  },
  lens: {
    title: 'Objectif',
    description: "Objectif monté lors de la prise de vue. Influence la perspective et la qualité optique.",
  },
  aperture: {
    title: 'Ouverture (f/)',
    description: "Diamètre de l'iris de l'objectif. Plus le chiffre est bas (ex: f/1.8), plus l'ouverture est grande et l'arrière-plan flou.",
  },
  shutterSpeed: {
    title: "Vitesse d'obturation",
    description: "Durée d'exposition du capteur. Une vitesse rapide (1/1000) fige le mouvement ; une vitesse lente crée du flou de bougé.",
  },
  iso: {
    title: 'Sensibilité ISO',
    description: "Sensibilité du capteur à la lumière. Un ISO élevé permet de filmer dans l'obscurité mais introduit du bruit numérique.",
  },
  focalLength: {
    title: 'Distance focale',
    description: "Exprimée en mm. Détermine le champ de vision : faible = grand-angle, élevée = téléobjectif.",
  },
} as const;
