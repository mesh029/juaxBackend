export type LaundryStationRow = {
  id: string;
  code: string;
  name: string;
  address: string;
  county: string;
  lat: number;
  lng: number;
};

export function toLaundryStationDto(s: LaundryStationRow) {
  return {
    id: s.id,
    code: s.code,
    name: s.name,
    address: s.address,
    county: s.county,
    pin: { lat: s.lat, lng: s.lng },
  };
}
