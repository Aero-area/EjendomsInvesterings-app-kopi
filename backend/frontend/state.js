// Fælles frontend-state – skrives kun af app.js, læses af views.js og apiClient.js 

export const valgtAdresseState = {
    dawaId: null,
    tekst: null,
    adresseFelter: null,
    bbrData: null,
    profilId: null,
    caseId: null,
    koebspris: null,
    koebsomkostningsposter: [],
    valgtEjendomstypeOverride: null
};

export function nulstilValgtAdresseState() {
    valgtAdresseState.dawaId = null;
    valgtAdresseState.tekst = null;
    valgtAdresseState.adresseFelter = null;
    valgtAdresseState.bbrData = null;
    valgtAdresseState.profilId = null;
    valgtAdresseState.caseId = null;
    valgtAdresseState.koebspris = null;
    valgtAdresseState.koebsomkostningsposter = [];
    valgtAdresseState.valgtEjendomstypeOverride = null;
}

export function tilfoejKoebsomkostningspost(beskrivelse, beloeb) {
    valgtAdresseState.koebsomkostningsposter.push({ beskrivelse, beloeb });
}

export function fjernKoebsomkostningspost(index) {
    valgtAdresseState.koebsomkostningsposter.splice(index, 1);
}

export function beregnSamledeKoebsomkostninger() {
    return valgtAdresseState.koebsomkostningsposter.reduce(
        (sum, post) => sum + Number(post.beloeb || 0),
        0
    );
}
