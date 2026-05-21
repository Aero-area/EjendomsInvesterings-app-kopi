const sql = require('mssql');
const poolPromise = require('../db/dbConnection');

class EjendomsRepo {
    // Opretter en ny ejendomsprofil og returnerer profil_id.
    static async opretProfil(profilData) {
        const pool = await poolPromise;

        const result = await pool
            .request()
            .input('bruger_id', sql.Int, profilData.bruger_id)
            .input('adresse', sql.VarChar(200), profilData.adresse)
            .input('ejendomstype', sql.VarChar(50), profilData.ejendomstype)
            .input('byggeaar', sql.Int, profilData.byggeaar)
            .input('boligareal', sql.Decimal(10, 2), profilData.boligareal)
            .input('grundareal', sql.Decimal(10, 2), profilData.grundareal ?? null)
            .input('antal_vaerelser', sql.Int, profilData.antal_vaerelser ?? null)
            .query(`
                INSERT INTO EjendomsInvest.Ejendomsprofil (
                    bruger_id,
                    adresse,
                    ejendomstype,
                    byggeaar,
                    boligareal,
                    grundareal,
                    antal_vaerelser,
                    sidst_indhentet_dato
                )
                OUTPUT INSERTED.profil_id
                VALUES (
                    @bruger_id,
                    @adresse,
                    @ejendomstype,
                    @byggeaar,
                    @boligareal,
                    @grundareal,
                    @antal_vaerelser,
                    sysdatetime()
                );
            `);

        return result.recordset[0].profil_id;
    }

    // Henter ejendomsprofiler med metadata og tilknyttede investeringscases for en bruger.
    static async findByBrugerId(brugerId) {
        const pool = await poolPromise;

        const result = await pool
            .request()
            .input('bruger_id', sql.Int, brugerId)
            .query(`
                SELECT 
                    E.profil_id,
                    E.bruger_id,
                    E.adresse,
                    E.ejendomstype,
                    E.byggeaar,
                    E.boligareal,
                    E.grundareal,
                    E.antal_vaerelser,
                    E.oprettet_dato,
                    E.sidst_indhentet_dato,
                    (SELECT COUNT(*) FROM EjendomsInvest.Investeringscase I WHERE I.profil_id = E.profil_id) AS antal_cases,
                    (SELECT I.case_id, I.casenavn FROM EjendomsInvest.Investeringscase I WHERE I.profil_id = E.profil_id FOR JSON PATH) AS cases_json
                FROM EjendomsInvest.Ejendomsprofil E
                WHERE E.bruger_id = @bruger_id
                ORDER BY E.profil_id DESC;
            `);

        return result.recordset.map(r => {
            const { cases_json, ...profil } = r;

            return {
                ...profil,
                cases: cases_json ? JSON.parse(cases_json) : []
            };
        });
    }

    static async updateProfil(profilId, brugerId, antalVaerelser) {
        const pool = await poolPromise;

        const result = await pool
            .request()
            .input('profil_id', sql.Int, profilId)
            .input('bruger_id', sql.Int, brugerId)
            .input('antal_vaerelser', sql.Int, antalVaerelser)
            .query(`
                UPDATE EjendomsInvest.Ejendomsprofil
                SET 
                    antal_vaerelser = @antal_vaerelser,
                    sidst_indhentet_dato = sysdatetime()
                WHERE profil_id = @profil_id AND bruger_id = @bruger_id;
            `);

        return result.rowsAffected[0] > 0;
    }

    static async deleteProfil(profilId, brugerId) {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        // Sletter relaterede data før selve profilen for at overholde foreign key constraints.

        try {
            await transaction.begin();

            const checkRequest = new sql.Request(transaction);
            checkRequest.input('profil_id', sql.Int, profilId);
            checkRequest.input('bruger_id', sql.Int, brugerId);

            const checkResult = await checkRequest.query(`
                SELECT 1 FROM EjendomsInvest.Ejendomsprofil 
                WHERE profil_id = @profil_id AND bruger_id = @bruger_id;
            `);

            if (checkResult.recordset.length === 0) {
                await transaction.rollback();
                return false;
            }

            const deleteRequest = new sql.Request(transaction);
            deleteRequest.input('profil_id', sql.Int, profilId);

            await deleteRequest.query(`
                DELETE u FROM EjendomsInvest.Udlejning u
                INNER JOIN EjendomsInvest.Investeringscase i ON u.case_id = i.case_id
                WHERE i.profil_id = @profil_id;
            `);

            await deleteRequest.query(`
                DELETE d FROM EjendomsInvest.Driftsudgift d
                INNER JOIN EjendomsInvest.Investeringscase i ON d.case_id = i.case_id
                WHERE i.profil_id = @profil_id;
            `);

            await deleteRequest.query(`
                DELETE r FROM EjendomsInvest.Renovering r
                INNER JOIN EjendomsInvest.Investeringscase i ON r.case_id = i.case_id
                WHERE i.profil_id = @profil_id;
            `);

            await deleteRequest.query(`
                DELETE l FROM EjendomsInvest.Laan l
                INNER JOIN EjendomsInvest.Investeringscase i ON l.case_id = i.case_id
                WHERE i.profil_id = @profil_id;
            `);

            await deleteRequest.query(`
                DELETE FROM EjendomsInvest.Investeringscase
                WHERE profil_id = @profil_id;
            `);

            const finalDelete = await deleteRequest.query(`
                DELETE FROM EjendomsInvest.Ejendomsprofil
                WHERE profil_id = @profil_id;
            `);

            await transaction.commit();

            return finalDelete.rowsAffected[0] > 0;
        } catch (error) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error('Rollback fejlede i deleteProfil:', rollbackError);
            }

            throw error;
        }
    }
}

module.exports = EjendomsRepo;
