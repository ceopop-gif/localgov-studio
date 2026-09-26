export type AddressComponent = { long_name: string; short_name?: string; types: string[] };
export function parseGoogleAddress(components: AddressComponent[]) {
  const get = (...types: string[]) => types.map(type => components.find(c => c.types.includes(type))?.long_name).find(Boolean) || "";
  const clean = (s: string) => s.replace(/^(ตำบล|แขวง|อำเภอ|เขต|จังหวัด)\s*/, "");
  return {
    province: clean(get("administrative_area_level_1")),
    district: clean(get("administrative_area_level_2", "sublocality_level_1")),
    subdistrict: clean(get("sublocality_level_2", "administrative_area_level_3", "locality")),
    postalCode: get("postal_code"),
  };
}
