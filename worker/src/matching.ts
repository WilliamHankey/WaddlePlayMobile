/** Direct port of match_details() from the FastAPI backend. */

export interface MatchInput {
  sensory_preferences?: string[];
  interests?: string[];
  family_values?: string[];
  communication_style?: string | null;
  children?: { age?: number }[];
}

export interface PlaydateLike {
  sensory_friendly_tags?: string[];
  interests?: string[];
  age_min?: number;
  age_max?: number;
}

function shared(a?: string[], b?: string[]): string[] {
  if (!a || !b || a.length === 0 || b.length === 0) return [];
  return [...new Set(a)].filter((item) => b.includes(item)).sort();
}

export function matchDetails(
  family: MatchInput,
  playdate: PlaydateLike,
  host: MatchInput | null,
): { score: number; reasons: string[] } {
  let score = 40;
  const reasons: string[] = [];

  const sensoryHits = shared(family.sensory_preferences, playdate.sensory_friendly_tags);
  if (sensoryHits.length > 0) {
    score += Math.min(20, sensoryHits.length * 7);
    reasons.push(...sensoryHits.slice(0, 2));
  }

  const interestHits = shared(family.interests, playdate.interests);
  if (interestHits.length > 0) {
    score += Math.min(20, interestHits.length * 6);
    reasons.push(...interestHits.slice(0, 2));
  }

  if (host) {
    const valueHits = shared(family.family_values, host.family_values);
    if (valueHits.length > 0) {
      score += Math.min(10, valueHits.length * 4);
      reasons.push(valueHits[0]);
    }
    if (
      family.communication_style &&
      family.communication_style === host.communication_style
    ) {
      score += 10;
      reasons.push(`${family.communication_style} communication`);
    }
  }

  const ages = (family.children ?? []).map((child) => child.age ?? 0);
  const ageMin = playdate.age_min ?? 0;
  const ageMax = playdate.age_max ?? 99;
  if (ages.some((age) => ageMin <= age && age <= ageMax)) {
    score += 10;
    reasons.push("age fits your child");
  }

  const seen = new Set<string>();
  const deduped = reasons.filter((reason) => {
    if (!reason || seen.has(reason)) return false;
    seen.add(reason);
    return true;
  });

  return {
    score: Math.max(0, Math.min(100, score)),
    reasons: deduped.slice(0, 3),
  };
}
