function opretValideringsfejl(besked) {
    const error = new Error(besked);
    error.isValidation = true;
    return error;
}

class Investeringscase {
    constructor(data) {
        // Initialisering og validering
        if (!data || typeof data !== 'object') {
            throw opretValideringsfejl('Mangler data til at initialisere Investeringscase.');
        }

        // Basale egenskaber
        this.case_id = data.case_id;
        this.profil_id = data.profil_id;
        this.casenavn = data.casenavn || 'Unavngiven case';
        this.beskrivelse = data.beskrivelse || '';
        this.koebspris = Number(data.koebspris);
        if (!Number.isFinite(this.koebspris) || this.koebspris <= 0) {
            throw opretValideringsfejl('koebspris skal være et positivt tal.');
        }
        this.koebsomkostninger = Number(data.koebsomkostninger ?? 0);

        if (!Number.isFinite(this.koebsomkostninger) || this.koebsomkostninger < 0) {
            throw opretValideringsfejl('koebsomkostninger skal være et positivt tal eller 0.');
        }
        this.oprettet_dato = data.oprettet_dato ? new Date(data.oprettet_dato) : new Date();

        if (isNaN(this.oprettet_dato.getTime())) {
            throw opretValideringsfejl('oprettet_dato skal være en gyldig dato.');
        }

        // Tilknyttede økonomiposter
        this.laan = Array.isArray(data.laan) ? data.laan : [];
        for (let i = 0; i < this.laan.length; i++) {
            const laan = this.laan[i];
            const laanebeloeb = Number(laan.laanebeloeb);
            const rente = Number(laan.rente);
            const loebetid = Number(laan.loebetid_aar);
            const afdragsfriPeriode = Number(laan.afdragsfri_periode ?? 0);

            if (!Number.isFinite(laanebeloeb) || laanebeloeb < 0) {
                throw opretValideringsfejl(`laan[${i}].laanebeloeb skal være et positivt tal eller 0.`);
            }

            if (!Number.isFinite(rente) || rente < 0) {
                throw opretValideringsfejl(`laan[${i}].rente skal være et positivt tal eller 0.`);
            }

            if (!Number.isInteger(loebetid) || loebetid <= 0) {
                throw opretValideringsfejl(`laan[${i}].loebetid_aar skal være et positivt heltal.`);
            }

            if (!Number.isInteger(afdragsfriPeriode) || afdragsfriPeriode < 0 || afdragsfriPeriode > loebetid) {
                throw opretValideringsfejl(`laan[${i}].afdragsfri_periode skal være mellem 0 og lånets løbetid.`);
            }
        }
        this.driftsudgifter = Array.isArray(data.driftsudgifter) ? data.driftsudgifter : [];
        this.renoveringer = Array.isArray(data.renoveringer) ? data.renoveringer : [];

        // Udlejning
        this.udlejning = data.udlejning || null;
    }

    beregnAarligLejeindtaegt() {
        if (!this.udlejning || !this.udlejning.lejeindtaegt) return 0;
        const leje = Number(this.udlejning.lejeindtaegt);
        const udgifter = Number(this.udlejning.udlejningsudgifter) || 0;
        return (leje - udgifter) * 12;
    }

    beregnAarligDriftsudgift() {
        let total = 0;
        for (const udgift of this.driftsudgifter) {
            let multiplier = 1;
            if (udgift.frekvens === 'Maanedlig') multiplier = 12;
            else if (udgift.frekvens === 'Kvartalsvis') multiplier = 4;
            else if (udgift.frekvens === 'Halvaarlig') multiplier = 2;

            total += Number(udgift.beloeb) * multiplier;
        }
        return total;
    }

    beregnCashflow(antalAar = 30) {
        if (!Number.isInteger(antalAar) || antalAar < 30) {
            throw opretValideringsfejl('antalAar skal være et heltal på mindst 30.');
        }

        const simulering = [];
        const aarligLeje = this.beregnAarligLejeindtaegt();
        const aarligDrift = this.beregnAarligDriftsudgift();
        const startAarstal = this.oprettet_dato.getFullYear();

        // Kloning af lån for at simulere restgældsafvikling uden mutation af originaldata
        let aktiveLaan = this.laan.map(l => ({
            laanebeloeb: Number(l.laanebeloeb),
            restgaeld: Number(l.laanebeloeb),
            renteFaktor: Number(l.rente) / 100,
            loebetid: Number(l.loebetid_aar),
            afdragsfri_periode: Number(l.afdragsfri_periode) || 0
        }));

        for (let aar = 1; aar <= antalAar; aar++) {
            let aaretsRente = 0;
            let aaretsAfdrag = 0;
            let aaretsYdelse = 0;
            let aaretsRenovering = 0;
            const aktueltAarstal = startAarstal + aar - 1;

            // Beregner renter, afdrag og ydelse for hvert lån.
            for (const laan of aktiveLaan) {
                if (laan.restgaeld > 0) {
                    const renteUdgift = laan.restgaeld * laan.renteFaktor;
                    let ydelse = 0;
                    let afdrag = 0;

                    if (laan.renteFaktor > 0) {
                        ydelse = laan.laanebeloeb * (laan.renteFaktor / (1 - Math.pow(1 + laan.renteFaktor, -laan.loebetid)));
                    } else {
                        ydelse = laan.laanebeloeb / laan.loebetid;
                    }

                    if (aar <= laan.afdragsfri_periode) {
                        ydelse = renteUdgift;
                        afdrag = 0;
                    } else {
                        afdrag = ydelse - renteUdgift;
                    }

                    if (afdrag > laan.restgaeld) {
                        afdrag = laan.restgaeld;
                        ydelse = afdrag + renteUdgift;
                    }

                    laan.restgaeld -= afdrag;
                    aaretsRente += renteUdgift;
                    aaretsAfdrag += afdrag;
                    aaretsYdelse += ydelse;
                }
            }

            // Medregner renoveringer i det år, de er planlagt.
            for (const renovering of this.renoveringer) {
                if (Number(renovering.aarstal) === aktueltAarstal) {
                    aaretsRenovering += Number(renovering.udgift);
                }
            }

            // Samler årets indtægter og udgifter.
            let cashflow = aarligLeje - aarligDrift - aaretsYdelse - aaretsRenovering;

            if (aar === 1) {
                cashflow -= this.koebsomkostninger;
            }

            simulering.push({
                aar: aar,
                aarstal: aktueltAarstal,
                lejeindtaegt: Math.round(aarligLeje),
                driftsudgift: Math.round(aarligDrift),
                renteudgift: Math.round(aaretsRente),
                afdrag: Math.round(aaretsAfdrag),
                ydelse: Math.round(aaretsYdelse),
                renovering: Math.round(aaretsRenovering),
                restgaeld: Math.round(aktiveLaan.reduce((sum, l) => sum + l.restgaeld, 0)),
                egenkapital: Math.round(this.koebspris - aktiveLaan.reduce((sum, l) => sum + l.restgaeld, 0)),
                cashflow: Math.round(cashflow)
            });
        }

        return simulering;
    }
}

module.exports = Investeringscase;