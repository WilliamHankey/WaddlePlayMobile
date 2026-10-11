export type FamilyFilters = { latitude?: number; longitude?: number; radius?: number; age_min?: number; age_max?: number; interest?: string; q?: string };
export type FamilyDirectory = { families: any[]; limited: boolean };
type Transport = {
  list: (params: FamilyFilters) => Promise<any[]>;
  playdates: () => Promise<any[]>;
  family: (id: string) => Promise<any | null>;
  missingEndpoint: (error: unknown) => boolean;
};

/** Older deployed Workers have individual families but no directory route yet. */
export async function loadFamilyDirectory(transport: Transport, params: FamilyFilters = {}): Promise<FamilyDirectory> {
  try {
    return { families: await transport.list(params), limited: false };
  } catch (error) {
    if (!transport.missingEndpoint(error)) throw error;
  }
  const playdates = await transport.playdates();
  const ids = [...new Set(playdates.map(p => p.host_family_id).filter((id): id is string => typeof id === "string" && !!id))];
  const families = (await Promise.all(ids.map(id => transport.family(id)))).filter(family => family?.verified === true);
  const interest = (params.interest || "").trim().toLowerCase();
  const query = (params.q || "").trim().toLowerCase();
  return {
    limited: true,
    families: families.filter(family =>
      (!interest || (family.interests || []).some((tag: string) => tag.toLowerCase().includes(interest))) &&
      (!query || `${family.parent_name} ${family.location} ${(family.interests || []).join(" ")}`.toLowerCase().includes(query)) &&
      ((params.age_min === undefined && params.age_max === undefined) || (family.children || []).some((child: any) => child.age >= (params.age_min ?? 0) && child.age <= (params.age_max ?? 18)))
    ).map(family => ({
      id: family.id, parent_name: family.parent_name, avatar_url: family.avatar_url,
      location: family.location, verified: true, interests: family.interests || [],
      children: (family.children || []).map((child: any) => ({ name: child.name, age: child.age, interests: child.interests || [] })),
      approximate_location: null, distance_km: null,
    })),
  };
}
