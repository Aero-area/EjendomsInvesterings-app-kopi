/*
Håndterer rå, asynkrone CRUD-kald til Azure SQL-databasen 
for ejendomsprofiler og beskytter data via transaktioner og parameterisering.
Persistenslaget
*/
const sql = require('mssql'); // Bruges til at angive præcise SQL-datatyper
const poolPromise = require('../db/dbConnection'); // Henter det asynkrome poolPromise

class CaseRepo {
    // Opretter en ny investeringscase returnerer case_id.
    /*
    Asynkron kørsel sikrer, at Node.js-serveren kan betjene andre brugere i mellemtiden, 
    mens denne ene tråd venter på svar fra Azure SQL over internettet.
    */
    // Henter en investeringscase med tilhørende lån, renovering, drift og udlejning.
    static async findCaseWithDetails(caseId) {
        const pool = await poolPromise;

        const query = `
            SELECT
                I.case_id,
                I.profil_id,
                I.casenavn,
                I.beskrivelse,
                I.koebspris,
                I.koebsomkostninger,
                I.oprettet_dato,
                L.laan_id,
                L.laanebeloeb,
                L.rente,
                L.loebetid_aar,
                L.afdragsfri_periode,
                L.laanetype,
                R.renovering_id,
                R.beskrivelse AS renovering_beskrivelse,
                R.udgift AS renovering_udgift,
                R.aarstal AS renovering_aarstal,
                D.udgift_id,
                D.beskrivelse AS drift_beskrivelse,
                D.beloeb AS drift_beloeb,
                D.frekvens,
                U.udlejning_id,
                U.lejeindtaegt,
                U.udlejningsudgifter
            FROM EjendomsInvest.Investeringscase AS I
            LEFT JOIN EjendomsInvest.Laan AS L
                ON I.case_id = L.case_id
            LEFT JOIN EjendomsInvest.Renovering AS R
                ON I.case_id = R.case_id
            LEFT JOIN EjendomsInvest.Driftsudgift AS D
                ON I.case_id = D.case_id
            LEFT JOIN EjendomsInvest.Udlejning AS U
                ON I.case_id = U.case_id
            WHERE I.case_id = @caseId;
        `;

        const result = await pool
            .request()
            .input('caseId', sql.Int, caseId)
            .query(query);

        return result.recordset;
    }

    // Opretter en ny investeringscase for en ejendomsprofil.
    // ASYNC AWAIT: await frigiver event loopen mens Azure SQL svarer.
    // Andre brugeres HTTP requests behandles i mellemtiden.
    static async initCase(profil_id, casenavn, koebspris, beskrivelse, koebsomkostninger) {
        const pool = await poolPromise;

        const result = await pool
            .request()
            .input('profil_id', sql.Int, profil_id)
            .input('casenavn', sql.VarChar(100), casenavn)
            .input('koebspris', sql.Decimal(18, 2), koebspris)
            .input('beskrivelse', sql.VarChar(500), beskrivelse ?? null)
            .input('koebsomkostninger', sql.Decimal(18, 2), koebsomkostninger ?? 0)
            .query(`
                INSERT INTO EjendomsInvest.Investeringscase (
                    profil_id,
                    casenavn,
                    koebspris,
                    beskrivelse,
                    koebsomkostninger
                )
                OUTPUT INSERTED.case_id
                VALUES (
                    @profil_id,
                    @casenavn,
                    @koebspris,
                    @beskrivelse,
                    @koebsomkostninger
                );
            `);

        return result.recordset[0].case_id;
    }

    // Gemmer et lån på en investeringscase.
    static async saveLaan(caseId, laanData) {
        const pool = await poolPromise;

        const result = await pool
            .request()
            .input('case_id', sql.Int, caseId)
            .input('laanebeloeb', sql.Decimal(18, 2), laanData.laanebeloeb)
            .input('rente', sql.Decimal(5, 2), laanData.rente)
            .input('loebetid_aar', sql.Int, laanData.loebetid_aar)
            .input('afdragsfri_periode', sql.Int, laanData.afdragsfri_periode ?? 0)
            .input('laanetype', sql.VarChar(50), laanData.laanetype ?? null)
            .query(`
                INSERT INTO EjendomsInvest.Laan (
                    case_id,
                    laanebeloeb,
                    rente,
                    loebetid_aar,
                    afdragsfri_periode,
                    laanetype
                )
                OUTPUT INSERTED.laan_id
                VALUES (
                    @case_id,
                    @laanebeloeb,
                    @rente,
                    @loebetid_aar,
                    @afdragsfri_periode,
                    @laanetype
                );
            `);

        return result.recordset[0].laan_id;
    }

    // Gemmer en renovering på en investeringscase.
    static async addRenovering(caseId, renoveringData) {
        const pool = await poolPromise;

        const result = await pool
            .request()
            .input('case_id', sql.Int, caseId)
            .input('beskrivelse', sql.VarChar(200), renoveringData.beskrivelse)
            .input('udgift', sql.Decimal(18, 2), renoveringData.udgift)
            .input('aarstal', sql.Int, renoveringData.aarstal ?? null)
            .query(`
                INSERT INTO EjendomsInvest.Renovering (
                    case_id,
                    beskrivelse,
                    udgift,
                    aarstal
                )
                OUTPUT INSERTED.renovering_id
                VALUES (
                    @case_id,
                    @beskrivelse,
                    @udgift,
                    @aarstal
                );
            `);

        return result.recordset[0].renovering_id;
    }

    // Gemmer en driftsudgift på en investeringscase.
    static async addDriftsudgift(caseId, driftsudgiftData) {
        const pool = await poolPromise;

        const result = await pool
            .request()
            .input('case_id', sql.Int, caseId)
            .input('beskrivelse', sql.VarChar(200), driftsudgiftData.beskrivelse)
            .input('beloeb', sql.Decimal(18, 2), driftsudgiftData.beloeb)
            .input('frekvens', sql.VarChar(20), driftsudgiftData.frekvens ?? null)
            .query(`
                INSERT INTO EjendomsInvest.Driftsudgift (
                    case_id,
                    beskrivelse,
                    beloeb,
                    frekvens
                )
                OUTPUT INSERTED.udgift_id
                VALUES (
                    @case_id,
                    @beskrivelse,
                    @beloeb,
                    @frekvens
                );
            `);

        return result.recordset[0].udgift_id;
    }

    // Gemmer udlejningsdata på en investeringscase.
    static async addUdlejning(caseId, udlejningData) {
        const pool = await poolPromise;

        const result = await pool
            .request()
            .input('case_id', sql.Int, caseId)
            .input('lejeindtaegt', sql.Decimal(18, 2), udlejningData.lejeindtaegt)
            .input('udlejningsudgifter', sql.Decimal(18, 2), udlejningData.udlejningsudgifter ?? 0)
            .query(`
                INSERT INTO EjendomsInvest.Udlejning (
                    case_id,
                    lejeindtaegt,
                    udlejningsudgifter
                )
                OUTPUT INSERTED.udlejning_id
                VALUES (
                    @case_id,
                    @lejeindtaegt,
                    @udlejningsudgifter
                );
            `);

        return result.recordset[0].udlejning_id;
    }

    // Opdaterer en eksisterende investeringscase (stamdata).
    static async updateCase(caseId, caseData) {
        const pool = await poolPromise;

        const result = await pool
            .request()
            .input('case_id', sql.Int, caseId)
            .input('casenavn', sql.VarChar(100), caseData.casenavn)
            .input('beskrivelse', sql.VarChar(500), caseData.beskrivelse ?? null)
            .input('koebspris', sql.Decimal(18, 2), caseData.koebspris)
            .input('koebsomkostninger', sql.Decimal(18, 2), caseData.koebsomkostninger ?? 0)
            .query(`
                UPDATE EjendomsInvest.Investeringscase
                SET 
                    casenavn = @casenavn,
                    beskrivelse = @beskrivelse,
                    koebspris = @koebspris,
                    koebsomkostninger = @koebsomkostninger
                WHERE case_id = @case_id;
            `);

        return result.rowsAffected[0] > 0;
    }
    // TRANSAKTION START: duplicateCase bruger 6 INSERT SELECT trin.
    // Rollback hvis ét trin fejler. ACID atomicitet.
    // Opretter en kopi af en investeringscase og alle tilknyttede økonomiposter i én transaktion.
    static async duplicateCase(caseId, nytCasenavn = null) {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool); // Transaktionen sikrer, at du rollbacker alt, hvis én af de mange fejler. 

        try {
            await transaction.begin();

            const originalRequest = new sql.Request(transaction);
            originalRequest.input('caseId', sql.Int, caseId);
            const originalResult = await originalRequest.query(`
                SELECT profil_id, casenavn, beskrivelse, koebspris, koebsomkostninger
                FROM EjendomsInvest.Investeringscase
                WHERE case_id = @caseId;
            `);

            if (originalResult.recordset.length === 0) {
                await transaction.rollback();
                return null;
            }

            const original = originalResult.recordset[0];
            const finalName =
                typeof nytCasenavn === 'string' && nytCasenavn.trim().length > 0
                    ? nytCasenavn.trim()
                    : `${original.casenavn} (kopi)`;

            // PARAMETERISEREDE QUERIES: .input('navn', sql.Type, værdi)
            // @ placeholders. Beskytter mod SQL injection.
            /*
            sql.Request kan ikke genbruges når parametrene skifter mellem trin, 
            fordi mssql ikke tillader at registrere samme parameternavn to gange på samme objekt.
            */
            const insertCaseRequest = new sql.Request(transaction); 
            insertCaseRequest.input('profil_id', sql.Int, original.profil_id);
            insertCaseRequest.input('casenavn', sql.VarChar(100), finalName);
            insertCaseRequest.input('beskrivelse', sql.VarChar(500), original.beskrivelse);
            insertCaseRequest.input('koebspris', sql.Decimal(18, 2), original.koebspris);
            insertCaseRequest.input('koebsomkostninger', sql.Decimal(18, 2), original.koebsomkostninger);

            const insertResult = await insertCaseRequest.query(`
                INSERT INTO EjendomsInvest.Investeringscase (
                    profil_id, casenavn, beskrivelse, koebspris, koebsomkostninger
                )
                OUTPUT INSERTED.case_id
                VALUES (
                    @profil_id, @casenavn, @beskrivelse, @koebspris, @koebsomkostninger
                );
            `);

            const nyCaseId = insertResult.recordset[0].case_id;

            // Hvert tabelkopieringstrin kræver et nyt Request-objekt, da mssql ikke tillader genbrug af input-parametre på tværs af forespørgsler i samme transaktion.
            const laanRequest = new sql.Request(transaction);
            laanRequest.input('originalCaseId', sql.Int, caseId);
            laanRequest.input('nyCaseId', sql.Int, nyCaseId);
            await laanRequest.query(`
                INSERT INTO EjendomsInvest.Laan (
                    case_id, laanebeloeb, rente, loebetid_aar, afdragsfri_periode, laanetype
                )
                SELECT @nyCaseId, laanebeloeb, rente, loebetid_aar, afdragsfri_periode, laanetype
                FROM EjendomsInvest.Laan
                WHERE case_id = @originalCaseId;
            `);

            const renoveringRequest = new sql.Request(transaction);
            renoveringRequest.input('originalCaseId', sql.Int, caseId);
            renoveringRequest.input('nyCaseId', sql.Int, nyCaseId); 
            /*
            I stedet for at hente data ind i JavaScript og sende det op igen, 
            bruger vi SQL's evne til at flytte data internt:
            */
            await renoveringRequest.query(`
                INSERT INTO EjendomsInvest.Renovering (
                    case_id, beskrivelse, udgift, aarstal
                )
                SELECT @nyCaseId, beskrivelse, udgift, aarstal
                FROM EjendomsInvest.Renovering
                WHERE case_id = @originalCaseId;
            `);

            const driftRequest = new sql.Request(transaction);
            driftRequest.input('originalCaseId', sql.Int, caseId);
            driftRequest.input('nyCaseId', sql.Int, nyCaseId);
            await driftRequest.query(`
                INSERT INTO EjendomsInvest.Driftsudgift (
                    case_id, beskrivelse, beloeb, frekvens
                )
                SELECT @nyCaseId, beskrivelse, beloeb, frekvens
                FROM EjendomsInvest.Driftsudgift
                WHERE case_id = @originalCaseId;
            `);

            const udlejningRequest = new sql.Request(transaction);
            udlejningRequest.input('originalCaseId', sql.Int, caseId);
            udlejningRequest.input('nyCaseId', sql.Int, nyCaseId);
            await udlejningRequest.query(`
                INSERT INTO EjendomsInvest.Udlejning (
                    case_id, lejeindtaegt, udlejningsudgifter
                )
                SELECT @nyCaseId, lejeindtaegt, udlejningsudgifter
                FROM EjendomsInvest.Udlejning
                WHERE case_id = @originalCaseId;
            `);

            await transaction.commit();
            // OUTPUT INSERTED: Returnerer det genererede case_id fra Azure SQL.
            // Uden dette ved Node.js ikke hvad det nye id er.
            return nyCaseId;

        } catch (error) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error('Rollback fejlede i duplicateCase:', rollbackError);
            }

            throw error;
        }
    }
}

module.exports = CaseRepo;