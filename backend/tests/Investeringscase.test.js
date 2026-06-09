const Investeringscase = require('../models/Investeringscase');

describe('Investeringscase.beregnCashflow', () => {
    test('returnerer 30 års simuleringsdata med centrale nøgletal', () => {
        const testData = {
            profil_id: 101,
            casenavn: 'Testcase',
            koebspris: 2500000,
            oprettet_dato: '2024-01-01',
            laan: [{
                laanebeloeb: 2000000,
                rente: 4,
                loebetid_aar: 30
            }],
            driftsudgifter: [{
                beskrivelse: 'Fællesudgifter',
                beloeb: 2500,
                frekvens: 'Maanedlig'
            }],
            udlejning: {
                lejeindtaegt: 12500
            },
            renoveringer: []
        };

        const investeringscase = new Investeringscase(testData);
        const resultat = investeringscase.beregnCashflow(30);

        expect(Array.isArray(resultat)).toBe(true);
        expect(resultat).toHaveLength(30);

        expect(resultat[0]).toHaveProperty('aar', 1);
        expect(resultat[0]).toHaveProperty('aarstal');
        expect(resultat[0]).toHaveProperty('lejeindtaegt');
        expect(resultat[0]).toHaveProperty('driftsudgift');
        expect(resultat[0]).toHaveProperty('renteudgift');
        expect(resultat[0]).toHaveProperty('afdrag');
        expect(resultat[0]).toHaveProperty('ydelse');
        expect(resultat[0]).toHaveProperty('restgaeld');
        expect(resultat[0]).toHaveProperty('egenkapital');
        expect(resultat[0]).toHaveProperty('cashflow');

        expect(resultat[29]).toHaveProperty('aar', 30);
    });
    // Tilfælde hvor antalAar er mindre end 30.
    test('beregnCashflow med 0 år kaster en fejl', () => {
        const testData = {
            profil_id: 101,
            casenavn: 'Testcase',
            koebspris: 2500000,
            oprettet_dato: '2024-01-01',
            laan: [],
            driftsudgifter: [],
            udlejning: null,
            renoveringer: []
        };
        const investeringscase = new Investeringscase(testData);
        expect(() => investeringscase.beregnCashflow(0)).toThrow('antalAar skal være et heltal på mindst 30.');
    });
});
// Tilfælde hvor antalAar ikke er et heltal.
describe('Investeringscase validering', () => {
    test('koebspris lig med 0 kaster en fejl', () => {
        const testData = {
            profil_id: 101,
            casenavn: 'Testcase',
            koebspris: 0,
            oprettet_dato: '2024-01-01'
        };
        expect(() => new Investeringscase(testData)).toThrow('koebspris skal være et positivt tal.');
    });
    // Tilfælde hvor koebspris er et negativt tal. 
    test('koebspris som negativt tal kaster en fejl', () => {
        const testData = {
            profil_id: 101,
            casenavn: 'Testcase',
            koebspris: -500,
            oprettet_dato: '2024-01-01'
        };
        expect(() => new Investeringscase(testData)).toThrow('koebspris skal være et positivt tal.');
    });
    // Tilfælde hvor koebsomkostninger er et negativt tal. 
    test('afdragsfri periode der overstiger løbetiden kaster en fejl', () => {
        const testData = {
            profil_id: 101,
            casenavn: 'Testcase',
            koebspris: 2500000,
            oprettet_dato: '2024-01-01',
            laan: [{
                laanebeloeb: 2000000,
                rente: 4,
                loebetid_aar: 30,
                afdragsfri_periode: 35
            }]
        };
        expect(() => new Investeringscase(testData)).toThrow('laan[0].afdragsfri_periode skal være mellem 0 og lånets løbetid.');
    });
});