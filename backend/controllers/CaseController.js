// Controller-metoderne aktiveres af Express-routeren (caseRoutes.js).
// Oversætter HTTP-protokollen (requests/responses) til kald af interne forretningslogik-metoder.
const CaseParserService = require('../services/CaseParserService');
const CaseRepo = require('../repositories/CaseRepo');
const EjendomsRepo = require('../repositories/EjendomsRepo');
const Investeringscase = require('../models/Investeringscase');
const DawaService = require('../services/DawaService');
const BbrService = require('../services/BbrService');
const KortService = require('../services/KortService');

function parsePositivtId(value) {
    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
        return null;
    }

    return id;
}
// Hvis noget går galt i databasen eller servicelaget, så sender den en JSON-fejlbesked tilbage til frontenden
function sendServiceFejl(res, error, fallbackBesked) {
    if (error.name === 'ServiceError') {
        if (error.status >= 500) {
            console.error('Servicefejl:', error);
        } else {
            console.warn('Valideringsfejl:', error.message);
        }

        return res.status(error.status).json({
            error: error.message,
            code: error.code
        });
    }

    console.error('Uventet serverfejl:', error);

    return res.status(500).json({
        error: fallbackBesked
    });
}

// Der bruges en enkel fast demo-bruger.
const DEMO_BRUGER_ID = 1;

class CaseController {
    // Henter en investeringscase med alle tilknyttede data.
    static async getCaseById(req, res) {
        try {
            const caseId = parsePositivtId(req.params.id);

            if (!caseId) {
                return res.status(400).json({
                    error: 'Ugyldigt case-id.'
                });
            }

            const rows = await CaseRepo.findCaseWithDetails(caseId);

            if (!rows || rows.length === 0) {
                return res.status(404).json({
                    error: 'Investeringscase ikke fundet.'
                });
            }

            const parsedData = CaseParserService.parseCaseRows(rows);

            return res.status(200).json({
                data: parsedData
            });
        } catch (error) {
            console.error('Fejl i getCaseById:', error);

            return res.status(500).json({
                error: 'Intern serverfejl ved hentning af case.'
            });
        }
    }


    // Henter case-data og returnerer 30 års cashflow-simulering.
    static async getSimulation(req, res) {
        try {
            const caseId = parsePositivtId(req.params.id);

            if (!caseId) {
                return res.status(400).json({
                    error: 'Ugyldigt case-id.'
                });
            }

            const rows = await CaseRepo.findCaseWithDetails(caseId);

            if (!rows || rows.length === 0) {
                return res.status(404).json({
                    error: 'Investeringscase ikke fundet.'
                });
            }

            const parsedData = CaseParserService.parseCaseRows(rows);

            if (!parsedData) {
                return res.status(404).json({
                    error: 'Ingen simuleringsdata fundet for casen.'
                });
            }

            const investeringscase = new Investeringscase(parsedData);
            const simulationData = investeringscase.beregnCashflow(30);

            return res.status(200).json({
                data: simulationData
            });
        } catch (error) {
            console.error('Fejl i getSimulation:', error);

            if (error.isValidation) {
                return res.status(400).json({
                    error: error.message
                });
            }

            return res.status(500).json({
                error: 'Intern serverfejl ved simulering af case.'
            });
        }
    }
    // Søger efter danske adresseforslag via DAWA.
    static async soegAdresse(req, res) {
        try {
            const normaliseretSoegetekst = String(req.query.q || '').trim();

            if (!normaliseretSoegetekst) {
                return res.status(400).json({
                    error: 'Søgetekst er påkrævet.',
                    code: 'MANGLER_SOGETEKST'
                });
            }

            const forslag = await DawaService.soegAutocomplete(normaliseretSoegetekst);

            return res.status(200).json({
                data: {
                    query: normaliseretSoegetekst,
                    forslag
                }
            });
        } catch (error) {
            return sendServiceFejl(res, error, 'Intern serverfejl ved adresseopslag.');
        }
    }
    // Henter BBR-data ud fra et DAWA-id.
    static async getBbrByDawaId(req, res) {
        try {
            const dawaId = String(req.params.dawaId || '').trim();

            if (!dawaId) {
                return res.status(400).json({
                    error: 'dawaId er påkrævet.'
                });
            }

            const ejendomsdata = await BbrService.hentEjendomsdata(dawaId);

            return res.status(200).json({
                data: ejendomsdata
            });
        } catch (error) {
            return sendServiceFejl(res, error, 'Intern serverfejl ved BBR opslag.');
        }
    }

    // Opretter en ejendomsprofil for demo-brugeren.
    static async opretEjendomsprofil(req, res) {
        const { adresse, ejendomstype, byggeaar, boligareal, grundareal, antal_vaerelser } = req.body;

        // Grundareal og antal værelser kan mangle i BBR-data.
        if (
            !adresse ||
            !ejendomstype ||
            byggeaar == null ||
            boligareal == null
        ) {
            return res.status(400).json({
                error: 'Obligatoriske felter mangler: adresse, ejendomstype, byggeaar, boligareal.'
            });
        }

        try {
            const profilId = await EjendomsRepo.opretProfil({
                bruger_id: DEMO_BRUGER_ID,
                adresse,
                ejendomstype,
                byggeaar,
                boligareal,
                grundareal,
                antal_vaerelser
            });

            return res.status(201).json({
                message: 'Ejendomsprofil oprettet',
                profil_id: profilId
            });
        } catch (error) {
            console.error('Serverfejl i opretEjendomsprofil:', error);

            return res.status(500).json({
                error: 'Ejendomsprofilen kunne ikke gemmes. Prøv igen senere.'
            });
        }
    }

    // Henter alle ejendomsprofiler for demo-brugeren.
    static async getMineEjendomsprofiler(req, res) {
        try {
            const profiler = await EjendomsRepo.findByBrugerId(DEMO_BRUGER_ID);

            return res.status(200).json({
                data: profiler
            });
        } catch (error) {
            console.error('Serverfejl i getMineEjendomsprofiler:', error);

            return res.status(500).json({
                error: 'Kunne ikke hente ejendomsprofiler. Prøv igen senere.'
            });
        }
    }
    // Opdaterer en eksisterende ejendomsprofil.
    static async opdaterEjendomsprofil(req, res) {
        const profilId = parsePositivtId(req.params.id);

        if (!profilId) {
            return res.status(400).json({
                error: 'Ugyldigt profil-id.'
            });
        }

        const { antal_vaerelser } = req.body;

        if (antal_vaerelser !== null && (!Number.isInteger(antal_vaerelser) || antal_vaerelser < 0)) {
            return res.status(400).json({
                error: 'antal_vaerelser skal være null eller et ikke-negativt heltal.'
            });
        }

        try {
            const success = await EjendomsRepo.updateProfil(profilId, DEMO_BRUGER_ID, antal_vaerelser);

            if (!success) {
                return res.status(404).json({
                    error: 'Ejendomsprofil ikke fundet eller du har ikke rettigheder til at opdatere den.'
                });
            }

            return res.status(200).json({
                message: 'Ejendomsprofil opdateret.'
            });
        } catch (error) {
            console.error('Serverfejl i opdaterEjendomsprofil:', error);

            return res.status(500).json({
                error: 'Ejendomsprofilen kunne ikke opdateres. Prøv igen senere.'
            });
        }
    }
    // Sletter en ejendomsprofil og dens tilhørende data.
    static async sletEjendomsprofil(req, res) {
        const profilId = parsePositivtId(req.params.id);

        if (!profilId) {
            return res.status(400).json({
                error: 'Ugyldigt profil-id.'
            });
        }

        try {
            const success = await EjendomsRepo.deleteProfil(profilId, DEMO_BRUGER_ID);

            if (!success) {
                return res.status(404).json({
                    error: 'Ejendomsprofil ikke fundet eller du har ikke rettigheder til at slette den.'
                });
            }

            return res.status(200).json({
                message: 'Ejendomsprofil og tilhørende sager slettet.'
            });
        } catch (error) {
            console.error('Serverfejl i sletEjendomsprofil:', error);

            return res.status(500).json({
                error: 'Ejendomsprofilen kunne ikke slettes. Prøv igen senere.'
            });
        }
    }

    // Returnerer WMS-kort-URL ud fra DAWA-id.
    static async getKortByDawaId(req, res) {
        const dawaId = String(req.params.dawaId || '').trim();

        if (!dawaId) {
            return res.status(400).json({
                error: 'dawaId er påkrævet.'
            });
        }

        try {
            const imageUrl = await KortService.bygKortUrl(dawaId);

            return res.status(200).json({
                dawaId,
                imageUrl
            });
        } catch (error) {
            return sendServiceFejl(res, error, 'Kortdata kunne ikke hentes. Prøv igen senere.');
        }
    }

    // Initialiserer en investeringscase for en ejendomsprofil.
    static async initCase(req, res) {
        const { profil_id, casenavn, koebspris, beskrivelse, koebsomkostninger } = req.body;

        const profilId = parsePositivtId(profil_id);
        const koebsprisTal = Number(koebspris);
        const koebsomkostningerTal = koebsomkostninger == null ? null : Number(koebsomkostninger);

        if (!profilId) {
            return res.status(400).json({
                error: 'profil_id skal være et positivt heltal.'
            });
        }

        if (typeof casenavn !== 'string' || casenavn.trim().length === 0) {
            return res.status(400).json({
                error: 'casenavn er påkrævet.'
            });
        }

        if (!Number.isFinite(koebsprisTal) || koebsprisTal <= 0) {
            return res.status(400).json({
                error: 'koebspris skal være et positivt tal.'
            });
        }

        if (koebsomkostningerTal !== null && (!Number.isFinite(koebsomkostningerTal) || koebsomkostningerTal < 0)) {
            return res.status(400).json({
                error: 'koebsomkostninger skal være 0 eller større.'
            });
        }

        try {
            const caseId = await CaseRepo.initCase(
                profilId,
                casenavn.trim(),
                koebsprisTal,
                beskrivelse,
                koebsomkostningerTal
            );
            return res.status(201).json({
                message: 'Investeringscase oprettet',
                case_id: caseId
            });
        } catch (error) {
            console.error('Serverfejl i initCase:', error);

            return res.status(500).json({
                error: 'Investeringscasen kunne ikke oprettes. Prøv igen senere.'
            });
        }
    }

    // Tilføjer et lån til en eksisterende investeringscase.
    static async tilfoejLaan(req, res) {
        const caseId = parsePositivtId(req.params.id);
        const { laanebeloeb, rente, loebetid_aar, afdragsfri_periode, laanetype } = req.body;

        if (!caseId) {
            return res.status(400).json({
                error: 'Ugyldigt case-id.'
            });
        }

        if (laanebeloeb == null || rente == null || loebetid_aar == null) {
            return res.status(400).json({
                error: 'Obligatoriske felter mangler: laanebeloeb, rente, loebetid_aar.'
            });
        }

        const laanebeloebTal = Number(laanebeloeb);
        const renteTal = Number(rente);
        const loebetidTal = Number(loebetid_aar);
        const afdragsfriTal = afdragsfri_periode == null ? null : Number(afdragsfri_periode);

        if (!Number.isFinite(laanebeloebTal) || laanebeloebTal < 0) {
            return res.status(400).json({
                error: 'laanebeloeb skal være 0 eller større.'
            });
        }

        if (!Number.isFinite(renteTal) || renteTal < 0) {
            return res.status(400).json({
                error: 'rente skal være 0 eller større.'
            });
        }

        if (!Number.isInteger(loebetidTal) || loebetidTal <= 0) {
            return res.status(400).json({
                error: 'loebetid_aar skal være et positivt heltal.'
            });
        }

        if (
            afdragsfriTal !== null &&
            (!Number.isInteger(afdragsfriTal) || afdragsfriTal < 0 || afdragsfriTal > loebetidTal)
        ) {
            return res.status(400).json({
                error: 'afdragsfri_periode skal være mellem 0 og lånets løbetid.'
            });
        }

        try {
            const rows = await CaseRepo.findCaseWithDetails(caseId);

            if (!rows || rows.length === 0) {
                return res.status(404).json({
                    error: 'Investeringscase ikke fundet.'
                });
            }

            const laanId = await CaseRepo.saveLaan(caseId, {
                laanebeloeb: laanebeloebTal,
                rente: renteTal,
                loebetid_aar: loebetidTal,
                afdragsfri_periode: afdragsfriTal,
                laanetype
            });

            return res.status(201).json({
                message: 'Lån tilføjet til case',
                laan_id: laanId
            });
        } catch (error) {
            console.error('Serverfejl i tilfoejLaan:', error);

            return res.status(500).json({
                error: 'Lånet kunne ikke gemmes. Prøv igen senere.'
            });
        }
    }

    // Tilføjer en renovering til en eksisterende investeringscase.
    static async tilfoejRenovering(req, res) {
        const caseId = parsePositivtId(req.params.id);
        const { beskrivelse, udgift, aarstal } = req.body;

        if (!caseId) {
            return res.status(400).json({
                error: 'Ugyldigt case-id.'
            });
        }

        if (typeof beskrivelse !== 'string' || beskrivelse.trim().length === 0 || udgift == null) {
            return res.status(400).json({
                error: 'Obligatoriske felter mangler: beskrivelse, udgift.'
            });
        }

        const udgiftTal = Number(udgift);
        const aarstalTal = aarstal == null || aarstal === '' ? null : Number(aarstal);

        if (!Number.isFinite(udgiftTal) || udgiftTal < 0) {
            return res.status(400).json({
                error: 'udgift skal være 0 eller større.'
            });
        }

        if (aarstalTal !== null && (!Number.isInteger(aarstalTal) || aarstalTal < 1900)) {
            return res.status(400).json({
                error: 'aarstal skal være et gyldigt kalenderår.'
            });
        }

        try {
            const rows = await CaseRepo.findCaseWithDetails(caseId);

            if (!rows || rows.length === 0) {
                return res.status(404).json({
                    error: 'Investeringscase ikke fundet.'
                });
            }

            const renoveringId = await CaseRepo.addRenovering(caseId, {
                beskrivelse: beskrivelse.trim(),
                udgift: udgiftTal,
                aarstal: aarstalTal
            });

            return res.status(201).json({
                message: 'Renovering tilføjet til case',
                renovering_id: renoveringId
            });
        } catch (error) {
            console.error('Serverfejl i tilfoejRenovering:', error);

            return res.status(500).json({
                error: 'Renoveringen kunne ikke gemmes. Prøv igen senere.'
            });
        }
    }

    // Tilføjer en driftsudgift til en eksisterende investeringscase.
    static async tilfoejDriftsudgift(req, res) {
        const caseId = parsePositivtId(req.params.id);
        const { beskrivelse, beloeb, frekvens } = req.body;

        if (!caseId) {
            return res.status(400).json({
                error: 'Ugyldigt case-id.'
            });
        }

        if (typeof beskrivelse !== 'string' || beskrivelse.trim().length === 0 || beloeb == null) {
            return res.status(400).json({
                error: 'Obligatoriske felter mangler: beskrivelse, beloeb.'
            });
        }

        const beloebTal = Number(beloeb);
        const gyldigeFrekvenser = ['Maanedlig', 'Kvartalsvis', 'Halvaarlig', 'Aarlig'];
        const frekvensVaerdi = frekvens || 'Aarlig';

        if (!Number.isFinite(beloebTal) || beloebTal < 0) {
            return res.status(400).json({
                error: 'beloeb skal være 0 eller større.'
            });
        }

        if (!gyldigeFrekvenser.includes(frekvensVaerdi)) {
            return res.status(400).json({
                error: 'frekvens skal være Maanedlig, Kvartalsvis, Halvaarlig eller Aarlig.'
            });
        }

        try {
            const rows = await CaseRepo.findCaseWithDetails(caseId);

            if (!rows || rows.length === 0) {
                return res.status(404).json({
                    error: 'Investeringscase ikke fundet.'
                });
            }

            const udgiftId = await CaseRepo.addDriftsudgift(caseId, {
                beskrivelse: beskrivelse.trim(),
                beloeb: beloebTal,
                frekvens: frekvensVaerdi
            });

            return res.status(201).json({
                message: 'Driftsudgift tilføjet til case',
                udgift_id: udgiftId
            });
        } catch (error) {
            console.error('Serverfejl i tilfoejDriftsudgift:', error);

            return res.status(500).json({
                error: 'Driftsudgiften kunne ikke gemmes. Prøv igen senere.'
            });
        }
    }

    // Tilføjer udlejningsdata til en eksisterende investeringscase.
    static async gemUdlejning(req, res) {
        const caseId = parsePositivtId(req.params.id);
        const { lejeindtaegt, udlejningsudgifter } = req.body;

        if (!caseId) {
            return res.status(400).json({
                error: 'Ugyldigt case-id.'
            });
        }

        if (lejeindtaegt == null) {
            return res.status(400).json({
                error: 'Obligatoriske felter mangler: lejeindtaegt.'
            });
        }

        const lejeindtaegtTal = Number(lejeindtaegt);
        const udlejningsudgifterTal = udlejningsudgifter == null ? 0 : Number(udlejningsudgifter);

        if (!Number.isFinite(lejeindtaegtTal) || lejeindtaegtTal < 0) {
            return res.status(400).json({
                error: 'lejeindtaegt skal være 0 eller større.'
            });
        }

        if (!Number.isFinite(udlejningsudgifterTal) || udlejningsudgifterTal < 0) {
            return res.status(400).json({
                error: 'udlejningsudgifter skal være 0 eller større.'
            });
        }

        try {
            const rows = await CaseRepo.findCaseWithDetails(caseId);

            if (!rows || rows.length === 0) {
                return res.status(404).json({
                    error: 'Investeringscase ikke fundet.'
                });
            }

            // Udlejning.case_id er UNIQUE i databasen.
            if (rows[0].udlejning_id != null) {
                return res.status(409).json({
                    error: 'Casen har allerede en udlejning.'
                });
            }

            const udlejningId = await CaseRepo.addUdlejning(caseId, {
                lejeindtaegt: lejeindtaegtTal,
                udlejningsudgifter: udlejningsudgifterTal
            });

            return res.status(201).json({
                message: 'Udlejning tilføjet til case',
                udlejning_id: udlejningId
            });
        } catch (error) {
            console.error('Serverfejl i gemUdlejning:', error);

            return res.status(500).json({
                error: 'Udlejningen kunne ikke gemmes. Prøv igen senere.'
            });
        }
    }
    // Opdaterer grunddata for en investeringscase.
    static async opdaterCase(req, res) {
        const caseId = parsePositivtId(req.params.id);
        const { casenavn, beskrivelse, koebspris, koebsomkostninger } = req.body;

        if (!caseId) {
            return res.status(400).json({
                error: 'Ugyldigt case-id.'
            });
        }

        const koebsprisTal = Number(koebspris);
        const koebsomkostningerTal = koebsomkostninger == null ? null : Number(koebsomkostninger);

        if (typeof casenavn !== 'string' || casenavn.trim().length === 0) {
            return res.status(400).json({
                error: 'casenavn er påkrævet.'
            });
        }

        if (!Number.isFinite(koebsprisTal) || koebsprisTal <= 0) {
            return res.status(400).json({
                error: 'koebspris skal være et positivt tal.'
            });
        }

        if (koebsomkostningerTal !== null && (!Number.isFinite(koebsomkostningerTal) || koebsomkostningerTal < 0)) {
            return res.status(400).json({
                error: 'koebsomkostninger skal være 0 eller større.'
            });
        }

        try {
            const success = await CaseRepo.updateCase(caseId, {
                casenavn: casenavn.trim(),
                beskrivelse,
                koebspris: koebsprisTal,
                koebsomkostninger: koebsomkostningerTal
            });

            if (!success) {
                return res.status(404).json({
                    error: 'Case ikke fundet, eller ingen ændringer foretaget.'
                });
            }

            return res.status(200).json({
                message: 'Investeringscase opdateret.'
            });
        } catch (error) {
            console.error('Serverfejl i opdaterCase:', error);

            return res.status(500).json({
                error: 'Casen kunne ikke opdateres. Prøv igen senere.'
            });
        }
    }
    // Opretter en deep copy af en eksisterende investeringscase.
    static async duplikerCase(req, res) {
        try {
            const caseId = parsePositivtId(req.params.id);
            const { casenavn } = req.body || {};

            if (!caseId) {
                return res.status(400).json({
                    error: 'Ugyldigt case-id.'
                });
            }

            const nyCaseId = await CaseRepo.duplicateCase(caseId, casenavn);

            if (!nyCaseId) {
                return res.status(404).json({
                    error: 'Original investeringscase ikke fundet.'
                });
            }

            return res.status(201).json({
                message: 'Investeringscase duplikeret.',
                case_id: nyCaseId
            });
        } catch (error) {
            console.error('Serverfejl i duplikerCase:', error);

            return res.status(500).json({
                error: 'Investeringscasen kunne ikke duplikeres. Prøv igen senere.'
            });
        }
    }
    // Sammenligner to eller flere investeringscases.
    static async sammenlignCases(req, res) {
        // Validerer case-id'er fra query-parameteren.
        const idsRaw = req.query.ids;

        if (!idsRaw) {
            return res.status(400).json({
                error: 'Query parameter "ids" er påkrævet (f.eks. ?ids=1001,1002).'
            });
        }

        const idStrings = idsRaw.split(',');
        const caseIds = idStrings
            .map(id => Number(id))
            .filter(id => Number.isInteger(id) && id > 0);

        if (caseIds.length < 2) {
            return res.status(400).json({
                error: 'Angiv mindst to gyldige investeringscases til sammenligning.'
            });
        }

        // Henter og simulerer hver case.
        try {
            const resultData = [];

            for (const caseId of caseIds) {
                const rows = await CaseRepo.findCaseWithDetails(caseId);

                if (!rows || rows.length === 0) {
                    return res.status(404).json({
                        error: `Investeringscase med ID ${caseId} blev ikke fundet.`
                    });
                }

                const parsedData = CaseParserService.parseCaseRows(rows);
                const caseModel = new Investeringscase(parsedData);
                const simulering = caseModel.beregnCashflow(30);

                const aar1 = simulering[0];
                const aar30 = simulering[simulering.length - 1];
                const samletCashflow = simulering.reduce((sum, aar) => sum + aar.cashflow, 0);

                // Samler nøgletal og simulering til sammenligningssvaret.
                resultData.push({
                    case_id: caseId,
                    casenavn: parsedData.casenavn,
                    profil_id: parsedData.profil_id,
                    koebspris: parsedData.koebspris,
                    koebsomkostninger: parsedData.koebsomkostninger || 0,
                    noegletal: {
                        cashflow_aar_1: aar1.cashflow,
                        cashflow_aar_30: aar30.cashflow,
                        restgaeld_aar_1: aar1.restgaeld,
                        restgaeld_aar_30: aar30.restgaeld,
                        samlet_cashflow_30_aar: samletCashflow,
                        aarlig_lejeindtaegt_aar_1: aar1.lejeindtaegt,
                        aarlig_driftsudgift_aar_1: aar1.driftsudgift
                    },
                    simulering: simulering
                });
            }

            return res.status(200).json({
                data: resultData
            });

        } catch (error) {
            console.error('Serverfejl i sammenlignCases:', error);

            return res.status(500).json({
                error: 'Cases kunne ikke sammenlignes. Prøv igen senere.'
            });
        }
    }
}
module.exports = CaseController;