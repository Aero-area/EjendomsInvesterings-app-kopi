const CaseParserService = require('../services/CaseParserService');

describe('CaseParserService.parseCaseRows', () => {
    test('samler flade LEFT JOIN-rækker til én investeringscase uden dubletter', () => {
        // CaseRepo returnerer én række pr. kombination af relationer.
        // Parseren skal derfor fjerne dubletter på lån, drift og udlejning.
        const rows = [
            {
                case_id: 1001,
                profil_id: 101,
                casenavn: 'Testcase',
                beskrivelse: 'Case med flere relationer',
                koebspris: 2500000,
                koebsomkostninger: 50000,
                oprettet_dato: '2024-01-01',

                laan_id: 10,
                laanebeloeb: 2000000,
                rente: 4,
                loebetid_aar: 30,
                afdragsfri_periode: 0,
                laanetype: 'Realkredit',

                renovering_id: 20,
                renovering_beskrivelse: 'Nyt køkken',
                renovering_udgift: 100000,
                renovering_aarstal: 2026,

                udgift_id: 30,
                drift_beskrivelse: 'Fællesudgifter',
                drift_beloeb: 2500,
                frekvens: 'Maanedlig',

                udlejning_id: 40,
                lejeindtaegt: 12000,
                udlejningsudgifter: 1000
            },
            {
                case_id: 1001,
                profil_id: 101,
                casenavn: 'Testcase',
                beskrivelse: 'Case med flere relationer',
                koebspris: 2500000,
                koebsomkostninger: 50000,
                oprettet_dato: '2024-01-01',

                laan_id: 10,
                laanebeloeb: 2000000,
                rente: 4,
                loebetid_aar: 30,
                afdragsfri_periode: 0,
                laanetype: 'Realkredit',

                renovering_id: 21,
                renovering_beskrivelse: 'Bad',
                renovering_udgift: 75000,
                renovering_aarstal: 2027,

                udgift_id: 30,
                drift_beskrivelse: 'Fællesudgifter',
                drift_beloeb: 2500,
                frekvens: 'Maanedlig',

                udlejning_id: 40,
                lejeindtaegt: 12000,
                udlejningsudgifter: 1000
            }
        ];

        const parsed = CaseParserService.parseCaseRows(rows);

        expect(parsed.case_id).toBe(1001);
        expect(parsed.profil_id).toBe(101);
        expect(parsed.casenavn).toBe('Testcase');
        expect(parsed.koebspris).toBe(2500000);
        expect(parsed.koebsomkostninger).toBe(50000);

        expect(parsed.laan).toHaveLength(1);
        expect(parsed.renoveringer).toHaveLength(2);
        expect(parsed.driftsudgifter).toHaveLength(1);

        expect(parsed.udlejning).toEqual({
            udlejning_id: 40,
            lejeindtaegt: 12000,
            udlejningsudgifter: 1000
        });
    });
});