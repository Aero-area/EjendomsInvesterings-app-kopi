// henter de tekniske detaljer om ejendommen (f.eks. grundareal, byggeår, antal værelser)
require('dotenv').config();

// Officiel BBR-kodeoversættelse: bestemtFastEjendom.ejendomstype → dansk tekst.
// Konfiguration og mapping-tabel 
const EJENDOMSTYPE_MAP = {
    '1': 'Samlet fast ejendom',
    '2': 'Ejerlejlighed',
    '3': 'Bygning på lejet grund',
    '4': 'Umatrikuleret ejendom'
};

class BbrService {
    // Validerer input
    static async hentEjendomsdata(dawaId) {
        const normaliseretDawaId = BbrService.#validerDawaId(dawaId);

        const bbrBaseUrl = process.env.BBR_BASE_URL;
        const bbrUsername = process.env.BBR_USERNAME;
        const bbrPassword = process.env.BBR_PASSWORD;
        // Fejlbesked hvis BBR ikke er konfigureret korrekt. 
        if (!bbrBaseUrl || !bbrUsername || !bbrPassword) {
            throw BbrService.#createServiceError(
                'BBR_NOT_CONFIGURED',
                'BBR er ikke konfigureret endnu. Mangler credentials eller base URL.',
                501
            );
        }
        // Hent og parse data fra BBR. 
        try {
            return await BbrService.#fetchRealBbrData(normaliseretDawaId, bbrBaseUrl, bbrUsername, bbrPassword);
        } catch (error) {
            if (error.name === 'ServiceError') throw error;
            throw BbrService.#createServiceError(
                'BBR_INTEGRATION_ERROR',
                `Uventet netværksfejl under hentning af BBR data: ${error.message}`,
                502,
                error
            );
        }
    }
    // Henter og samler data fra BBR's REST API. 
    static async #fetchRealBbrData(husnummerId, baseUrl, username, password) {
        let ejendomstype = null;
        let grundareal = null;
        let byggeaar = null;
        let boligareal = null;
        let antal_vaerelser = null;

        // 1. Hent Grund
        const grundData = await BbrService.#bbrFetch('grund', 'Husnummer', husnummerId, baseUrl, username, password);
        if (!Array.isArray(grundData) || grundData.length === 0) {
            throw BbrService.#createServiceError('BBR_NOT_FOUND', `Ingen matchende grund for dawaId ${husnummerId}.`, 404);
        }

        const grund = grundData[0];
        const grundId = grund.id_lokalId;

        // gru011SamletAreal er det officielle BBR-feltnavn. De øvrige led er defensive fallbacks og returnerer ikke reelle værdier fra live BBR.
        grundareal =
            grund.gru011SamletAreal ||
            grund.grundareal ||
            grund.areal ||
            null;

        // Ejendomstype returneres som numerisk kode – map til dansk tekst.
        if (grund.bestemtFastEjendom && grund.bestemtFastEjendom.ejendomstype) {
            const kode = String(grund.bestemtFastEjendom.ejendomstype);
            ejendomstype = EJENDOMSTYPE_MAP[kode] || `Ukendt (${kode})`;
        }

        if (grundId) {
            // 2. Hent Bygning
            const bygningData = await BbrService.#bbrFetch('bygning', 'Grund', grundId, baseUrl, username, password);
            if (Array.isArray(bygningData) && bygningData.length > 0) {

                // Vælg hovedbygning ved at prioritere boligareal for at frafiltrere garager etc.
                let hovedbygning = bygningData.find(b => b.byg039BygningensSamledeBoligAreal > 0);
                if (!hovedbygning) {
                    hovedbygning = bygningData.reduce((prev, current) => {
                        return (current.byg041BebyggetAreal || 0) > (prev.byg041BebyggetAreal || 0) ? current : prev;
                    }, bygningData[0]);
                }

                if (hovedbygning) {
                    byggeaar = hovedbygning.byg026Opførelsesår || null;
                    const bygningId = hovedbygning.id_lokalId;

                    if (bygningId) {
                        // 3. Hent Enhed
                        const enhedData = await BbrService.#bbrFetch('enhed', 'Bygning', bygningId, baseUrl, username, password);
                        if (Array.isArray(enhedData) && enhedData.length > 0) {

                            // Prioriter boligenhed over erhverv.
                            let boligEnhed = enhedData.find(e =>
                                e.enh023Boligtype === "1" ||
                                (e.enh027ArealTilBeboelse && e.enh027ArealTilBeboelse > 0) ||
                                (e.enh031AntalVærelser && e.enh031AntalVærelser > 0)
                            );

                            if (!boligEnhed) {
                                boligEnhed = enhedData[0];
                            }

                            boligareal = boligEnhed.enh027ArealTilBeboelse || boligEnhed.enh026EnhedensSamledeAreal || null;
                            antal_vaerelser = boligEnhed.enh031AntalVærelser || null;
                        }
                    }
                }
            }
        }

        return { dawaId: husnummerId, ejendomstype, byggeaar, boligareal, grundareal, antal_vaerelser };
    }

    static async #bbrFetch(entity, filterParam, filterValue, baseUrl, username, password) {
        // Normaliserer base URL før kaldet.
        const base = baseUrl.includes('/BBR/BBRPublic/1/REST')
            ? baseUrl
            : `${baseUrl.replace(/\/$/, '')}/BBR/BBRPublic/1/REST`;

        const urlStr = `${base.replace(/\/$/, '')}/${entity}`; // Konstruerer den korrekte URL (med username/password som query-parametre)
        const urlObj = new URL(urlStr);
        urlObj.searchParams.append(filterParam, filterValue);
        urlObj.searchParams.append('username', username);
        urlObj.searchParams.append('password', password);

        const res = await fetch(urlObj.toString(), { headers: { 'Accept': 'application/json' } }); // BBR kræver accept header for at returnere JSON. 

        if (!res.ok) {
            throw BbrService.#createServiceError('BBR_API_ERROR', `BBR opslag mislykkedes for ressource '${entity}' (HTTP ${res.status})`, res.status >= 500 ? 502 : res.status);
        }
        return await res.json();
    }
    // Validerer og normalisere input for at sikre, at det er en ikke trimmed streng af passende længde. 
    static #validerDawaId(dawaId) {
        const trimmed = String(dawaId || '').trim();

        if (!trimmed) {
            throw BbrService.#createServiceError(
                'BBR_INPUT_EMPTY',
                'dawaId er påkrævet.',
                400
            );
        }

        if (trimmed.length > 100) { // sikkerhedsforanstaltning
            throw BbrService.#createServiceError(
                'BBR_INPUT_TOO_LONG',
                'dawaId må maks være 100 tegn.',
                400
            );
        }

        return trimmed;
    }
    // Fejlskabelon: Alle fejl i denne service oprettes gennem denne metode. 
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

module.exports = BbrService;