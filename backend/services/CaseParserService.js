// Samler flade SQL-rækker fra LEFT JOIN til ét struktureret case-objekt.
// CaseParserService modtager casens grunddata (navn, pris osv.) som bliver gentaget i hver eneste række.
class CaseParserService {
    static parseCaseRows(rows) {
        if (!Array.isArray(rows) || rows.length === 0) {
            return null;
        }

        const firstRow = rows[0];

        const parsedCase = { // stamdata fra første række
            case_id: firstRow.case_id,
            profil_id: firstRow.profil_id,
            casenavn: firstRow.casenavn,
            beskrivelse: firstRow.beskrivelse ?? null,
            koebspris: firstRow.koebspris,
            koebsomkostninger: firstRow.koebsomkostninger ?? 0,
            oprettet_dato: firstRow.oprettet_dato,

            laan: [],
            renoveringer: [],
            driftsudgifter: [],
            udlejning: null
        };

        // LEFT JOIN returnerer casen for hver underentitet. Sets sikrer, at relationer kun tilføjes én gang.
        const laanSet = new Set(); // Performance: en effektiv måde at huske, hvilke under-entiteter der allerede er tilføjet, så dubletter fjernes
        const renoveringSet = new Set(); 
        const driftSet = new Set();

        for (const row of rows) {
            if (row.laan_id != null && !laanSet.has(row.laan_id)) {
                laanSet.add(row.laan_id); // Husk dette ID!
                parsedCase.laan.push({ // Tilføj kun hvis det er nyt
                    laan_id: row.laan_id,
                    laanebeloeb: row.laanebeloeb,
                    rente: row.rente,
                    loebetid_aar: row.loebetid_aar,
                    afdragsfri_periode: row.afdragsfri_periode ?? null,
                    laanetype: row.laanetype ?? null
                });
            }

            if (row.renovering_id != null && !renoveringSet.has(row.renovering_id)) {
                renoveringSet.add(row.renovering_id);
                parsedCase.renoveringer.push({
                    renovering_id: row.renovering_id,
                    beskrivelse: row.renovering_beskrivelse,
                    udgift: row.renovering_udgift,
                    aarstal: row.renovering_aarstal ?? null
                });
            }

            if (row.udgift_id != null && !driftSet.has(row.udgift_id)) {
                driftSet.add(row.udgift_id);
                parsedCase.driftsudgifter.push({
                    udgift_id: row.udgift_id,
                    beskrivelse: row.drift_beskrivelse,
                    beloeb: row.drift_beloeb,
                    frekvens: row.frekvens ?? null
                });
            }

            if (row.udlejning_id != null && parsedCase.udlejning === null) {
                parsedCase.udlejning = {
                    udlejning_id: row.udlejning_id,
                    lejeindtaegt: row.lejeindtaegt,
                    udlejningsudgifter: row.udlejningsudgifter ?? 0
                };
            }
        }

        return parsedCase;
    }
}

module.exports = CaseParserService;