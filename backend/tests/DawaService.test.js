// Verificere at DAWA-API rådata mappes korrekt til applikations Data Transfer Object uden netværksoplsag. 
const DawaService = require('../services/DawaService');

describe('DawaService.soegAutocomplete', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
        jest.clearAllMocks();
    });

    test('mapper DAWA autocomplete-resultater til smalt DTO-format', async () => {
        // Mock af DAWA-respons, så testen er en unit-test uden rigtigt API-kald.
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => [
                {
                    tekst: 'Solbjerg Plads 3, 2000 Frederiksberg',
                    type: 'adgangsadresse',
                    data: {
                        id: '0a3f50b8-test-id',
                        vejnavn: 'Solbjerg Plads',
                        husnr: '3',
                        postnr: '2000',
                        postnrnavn: 'Frederiksberg'
                    }
                }
            ]
        });

        const resultat = await DawaService.soegAutocomplete('Solbjerg Plads');

        expect(global.fetch).toHaveBeenCalledTimes(1);

        const kaldtUrl = String(global.fetch.mock.calls[0][0]);
        expect(kaldtUrl).toContain('/autocomplete');
        expect(kaldtUrl).toContain('q=Solbjerg+Plads');

        expect(resultat).toEqual([
            {
                tekst: 'Solbjerg Plads 3, 2000 Frederiksberg',
                id: '0a3f50b8-test-id',
                type: 'adgangsadresse',
                vejnavn: 'Solbjerg Plads',
                husnummer: '3',
                postnr: '2000',
                postnrnavn: 'Frederiksberg'
            }
        ]);
    });

    test('en tom søgestreng kaster en 400 fejl', async () => {
        await expect(DawaService.soegAutocomplete('')).rejects.toThrow('Søgetekst må ikke være tom.');
        await expect(DawaService.soegAutocomplete('   ')).rejects.toThrow('Søgetekst må ikke være tom.');
        
        try {
            await DawaService.soegAutocomplete('');
        } catch (error) {
            expect(error.name).toBe('ServiceError');
            expect(error.status).toBe(400);
            expect(error.code).toBe('DAWA_INPUT_EMPTY');
        }
    });

    test('DAWA returnerer et tomt array og outputtet er et tomt forslag array', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => []
        });

        const resultat = await DawaService.soegAutocomplete('Solbjerg Plads');

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(resultat).toEqual([]);
    });
});