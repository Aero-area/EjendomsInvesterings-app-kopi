// Omdanner adressens geografiske koordinater til en gyldig Web Map Service-URL
require('dotenv').config();

// Henter koordinater fra DAWA og bygger en URL til luftfoto.
class KortService {
    static #WMS_BASE = 'https://api.dataforsyningen.dk/orto_foraar_DAF';
    static #DAWA_BASE = 'https://api.dataforsyningen.dk';
    static #BUFFER_M = 400;   // Meter buffer rundt om adressepunktet
    static #IMG_SIZE = 800;   // Pixelbredde og -højde på kortbilledet

    // Bygger billed-URL til luftfoto ud fra et DAWA-id.
    static async bygKortUrl(dawaId) {
        if (!dawaId || typeof dawaId !== 'string' || !dawaId.trim()) {
            throw KortService.#createServiceError(
                'KORT_INPUT_INVALID',
                'Ugyldigt dawaId modtaget i KortService.',
                400
            );
        }

        const token = process.env.DATAFORSYNINGEN_TOKEN;
        if (!token) {
            throw KortService.#createServiceError(
                'KORT_NOT_CONFIGURED',
                'DATAFORSYNINGEN_TOKEN mangler i miljøkonfiguration.',
                501
            );
        }
        // Hentning af koordinater fra DAWA
        const dawaUrl = `${KortService.#DAWA_BASE}/adgangsadresser/${encodeURIComponent(dawaId)}?srid=25832&format=json`;
        const dawaResponse = await fetch(dawaUrl, { headers: { Accept: 'application/json' } });

        if (!dawaResponse.ok) {
            throw KortService.#createServiceError(
                'KORT_DAWA_HTTP_ERROR',
                `DAWA svarede med status ${dawaResponse.status} for id ${dawaId}.`,
                dawaResponse.status >= 500 ? 502 : dawaResponse.status
            );
        }

        const dawaData = await dawaResponse.json();

        const koordinater = dawaData?.adgangspunkt?.koordinater;
        if (!Array.isArray(koordinater) || koordinater.length < 2) {
            throw KortService.#createServiceError(
                'KORT_DAWA_COORDINATES_MISSING',
                `DAWA returnerede ingen koordinater for id ${dawaId}.`,
                404
            );
        }

        const [easting, northing] = koordinater;

        // Beregning af Bounding Box (BBOX)
        const buf = KortService.#BUFFER_M; // Buffer i meter.
        const bbox = [
            easting - buf,
            northing - buf,
            easting + buf,
            northing + buf
        ].join(',');

        // Konstruktion af WMS-URL
        const params = new URLSearchParams({
            service: 'WMS',
            version: '1.1.1',
            request: 'GetMap',
            layers: 'orto_foraar',
            styles: '',
            srs: 'EPSG:25832',
            bbox,
            width: String(KortService.#IMG_SIZE),
            height: String(KortService.#IMG_SIZE),
            format: 'image/png',
            token
        });

        return `${KortService.#WMS_BASE}?${params.toString()}`;
    }

    static #createServiceError(code, message, status = 500, cause = null) {
        const error = new Error(message);
        error.name = 'ServiceError';
        error.code = code;
        error.status = status;

        if (cause) {
            error.cause = cause;
        }

        return error;
    }
}

module.exports = KortService;
