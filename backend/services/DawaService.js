// Ekstern gateway, der validerer og henter præcise adresseoplysninger fra DAWA-API'et,
// Modtager et stort JSON-array med koordinater, vejnavne, husnumre osv.
// ASYNC FETCH: Kalder DAWA API eksternt. Ingen database involvering.
// Mock fetch i unit test erstatter dette kald. Tester mapping isoleret.
class DawaService {
    static BASE_URL = 'https://api.dataforsyningen.dk';
    static AUTOCOMPLETE_PATH = '/autocomplete';

    // Søger i DAWA autocomplete og returnerer forslag som et smalt DTO-array.
    static async soegAutocomplete(soegetekst) {
        const normaliseretSoegetekst = DawaService.#validerSoegetekst(soegetekst);

        const url = new URL(
            `${DawaService.BASE_URL}${DawaService.AUTOCOMPLETE_PATH}`
        );

        url.searchParams.set('q', normaliseretSoegetekst); //Søgetekst
        // Begræns til adgangsadresse-typer for at undgå irrelevante resultater. 
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    Accept: 'application/json'
                }
            });

            if (!response.ok) {
                throw DawaService.#createServiceError(
                    'DAWA_AUTOCOMPLETE_HTTP_ERROR',
                    `DAWA svarede med status ${response.status}.`,
                    502
                );
            }
            // Payload: Her modtager vi outputtet efter await response.json() er kørt.
            const payload = await response.json();

            if (!Array.isArray(payload)) {
                throw DawaService.#createServiceError(
                    'DAWA_AUTOCOMPLETE_INVALID_FORMAT',
                    'DAWA returnerede et ugyldigt dataformat.',
                    502
                );
            }

            return payload
                .map((item) => DawaService.#mapAutocompleteItem(item))
                .filter((item) => item !== null);
        } catch (error) {
            if (error?.name === 'ServiceError') {
                throw error;
            }

            throw DawaService.#createServiceError(
                'DAWA_AUTOCOMPLETE_NETWORK_ERROR',
                'Kunne ikke hente data fra DAWA.',
                502,
                error
            );
        }
    }
    // Valider søgetekst for at sikre, at den er en ikke-tom streng af passende længde.
    static #validerSoegetekst(soegetekst) {
        if (typeof soegetekst !== 'string') {
            throw DawaService.#createServiceError(
                'DAWA_INPUT_INVALID',
                'Søgetekst skal være en tekststreng.',
                400
            );
        }

        const trimmed = soegetekst.trim();

        if (trimmed.length === 0) {
            throw DawaService.#createServiceError(
                'DAWA_INPUT_EMPTY',
                'Søgetekst må ikke være tom.',
                400
            );
        }

        if (trimmed.length < 2) {
            throw DawaService.#createServiceError(
                'DAWA_INPUT_TOO_SHORT',
                'Søgetekst skal være mindst 2 tegn.',
                400
            );
        }

        if (trimmed.length > 100) {
            throw DawaService.#createServiceError(
                'DAWA_INPUT_TOO_LONG',
                'Søgetekst må maks være 100 tegn.',
                400
            );
        }

        return trimmed;
    }

    // Mapper DAWA-resultat til et ensartet DTO-format. Data Transfer Object.
    static #mapAutocompleteItem(item) {
        if (!item || typeof item !== 'object') {
            return null;
        }

        const data = item.data;

        if (!data || typeof data !== 'object') {
            return null;
        }

        if (!item.tekst) {
            return null;
        }
        // id kan være null, hvis DAWA-forslaget ikke er en konkret adgangsadresse.
        return {
            tekst: item.tekst,
            id: data.id || null,
            type: item.type || 'ukendt',
            vejnavn: data.vejnavn || null,
            husnummer: data.husnr || null,
            postnr: data.postnr || null,
            postnrnavn: data.postnrnavn || null
        };
    }
    // Metode til at skabe ensartede fejlobjekter for bedre fejlhåndtering i hele applikationen.
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

module.exports = DawaService;