import { api } from '../boot/axios';

// Tipi che rispecchiano esattamente la risposta dell'API AIS.
// I nomi corti (p, t, y, x...) vengono dall'API per ridurre il peso della risposta.
export interface ShortPositionUpdate {
  p: number;        // providerId
  t: string;        // timestamp date-time ISO8601
  y: number;        // latitude
  x: number;        // longitude
  s: number | null; // speed over ground (knots)
  c: number | null; // course over ground (gradi)
  h: number | null; // heading (gradi)
}

// Converte "YYYY-MM-DD HH:mm" in ISO8601
// che l'API si aspetta: "YYYY-MM-DDTHH:mm:00.000Z"
function toIso(dateStr: string): string {
  return dateStr.replace(' ', 'T') + ':00.000Z';
}

/*
export async function fetchVesselHistory(
  mmsi: string,
  periodStart: string,
  periodEnd: string,

): Promise<ShortPositionUpdate[]> {
  const params = {
    periodStart: toIso(periodStart),
    periodEnd: toIso(periodEnd),
    intervalSeconds: 1, 
  };
  console.log('vesselHistory request:', { mmsi, ...params });
  const response = await api.get<ShortPositionUpdate[]>(
    `/api/targets/${mmsi}/history`,
    //'/api/providers/{providerId}/history/{mmsi}',
    { params },
  );
  console.log('vesselHistory raw response:', response.data);
  return response.data;
}*/

export async function fetchVesselHistory(
  mmsi: string,
  periodStart: string,
  periodEnd: string,

): Promise<ShortPositionUpdate[]> {
  const params = {
    periodStart: toIso(periodStart),
    periodEnd: toIso(periodEnd),
    intervalSeconds: 120, 
  };

  const providerId = import.meta.env.VITE_AIS_API_PROVIDER_ID;
  console.log('vesselHistory request:', { mmsi, providerId, ...params });
  const response = await api.get<ShortPositionUpdate[]>(
    `/api/providers/${providerId}/history/${mmsi}`,
    { params },
  );
  console.log('vesselHistory raw response:', response.data);
  return response.data;
}