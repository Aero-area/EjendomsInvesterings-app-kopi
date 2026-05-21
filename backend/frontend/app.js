// Frontend-controller. Importerer fra apiClient, state og views.
// Ansvar: event binding, validering, state-mutation og flow-koordinering.

import {
    valgtAdresseState,
    nulstilValgtAdresseState,
    tilfoejKoebsomkostningspost,
    fjernKoebsomkostningspost,
    beregnSamledeKoebsomkostninger
} from './state.js';

import {
    soegAdresseApi,
    hentBbrApi,
    hentKortApi,
    hentEjendomsprofilerApi,
    opretEjendomsprofilApi,
    opdaterEjendomsprofilApi,
    sletEjendomsprofilApi,
    hentCaseApi,
    initCaseApi,
    opdaterCaseApi,
    duplikerCaseApi,
    sammenlignCasesApi,
    opretLaanApi,
    opretRenoveringApi,
    opretDriftsudgiftApi,
    opretUdlejningApi,
    hentSimuleringApi
} from './apiClient.js';

import {
    formatKr,
    visStep,
    visValgtAdresseStatus,
    renderAdresseForslag,
    rydAdresseForslag,
    visAdresseFeedback,
    nulstilAdresseFeedback,
    visAdresseFelter,
    visBbrStatus,
    visEjendomsprofil,
    renderKort,
    visKortFejl,
    nulstilKort,
    visProfilStatus,
    nulstilProfilStatus,
    visCaseInitSektion,
    skjulCaseInitSektion,
    renderKoebsomkostninger,
    visCaseStatus,
    visLaanSektion,
    renderLaan,
    visLaanStatus,
    visRenoveringSektion,
    renderRenovering,
    visRenoveringStatus,
    visDriftsudgiftSektion,
    renderDriftsudgift,
    visDriftsudgiftStatus,
    visUdlejningSektion,
    renderUdlejning,
    visUdlejningStatus,
    nulstilSimuleringUI,
    renderSimuleringTilUI,
    renderSimuleringGraf,
    renderProfilOversigt,
    renderCaseTilUI,
    renderCompareResultat,
    visAktivCaseSammendrag,
    toggleEditCasenavn,
    toggleEditVaerelser,
    nulstilAlUI,
    laesManuelAntalVaerelser,
    laesCaseInput,
    laesLaanInput,
    laesRenoveringInput,
    laesDriftsudgiftInput,
    laesUdlejningInput,
    laesSammenligningInput,
    laesCasenavnInput,
    laesVaerelserInput,
    visSimuleringStatus,
    visDuplikerFeedback,
    visCompareStatus,
    rydCompareResultat,
    visErrorMessage,
    skjulEjendomsprofilVedFejl
} from './views.js';

// Wizard-navigation

let currentStep = 1;

function goToStep(step) {
    if (step === 2 && !valgtAdresseState.profilId && !valgtAdresseState.caseId) {
        alert('Du skal gemme en ejendomsprofil før du kan fortsætte.');
        return;
    }
    if (step > 2 && !valgtAdresseState.caseId) {
        alert('Du skal gemme investeringscasen før du kan fortsætte.');
        return;
    }
    visStep(step);
    currentStep = step;
}

// Adressesøgning

function debounce(callback, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => callback(...args), delay);
    };
}

function initAdresseSoegning() {
    const adresseInput = document.getElementById('adresse-input');
    if (!adresseInput) return;

    const debouncedSoeg = debounce(async (soegetekst) => {
        try {
            const forslag = await soegAdresseApi(soegetekst);
            renderAdresseForslag(forslag, vaelgAdresse, (tekst) => {
                adresseInput.value = tekst + ' ';
                adresseInput.focus();
                rydAdresseForslag();
                visAdresseFeedback('Specificer adresse videre for at vælge.');
                adresseInput.dispatchEvent(new Event('input'));
            });
        } catch (error) {
            console.error('Fejl ved adresseopslag:', error);
            rydAdresseForslag();
            visAdresseFeedback(error.message);
        }
    }, 300);

    adresseInput.addEventListener('input', (event) => {
        const soegetekst = event.target.value.trim();
        if (valgtAdresseState.dawaId) nulstilValgtAdresse();
        nulstilAdresseFeedback();
        if (soegetekst.length < 3) {
            rydAdresseForslag();
            visAdresseFeedback('Skriv mindst 3 tegn for at søge.');
            return;
        }
        debouncedSoeg(soegetekst);
    });
}

function vaelgAdresse(forslagItem) {
    const adresseInput = document.getElementById('adresse-input');

    // State opdatering
    valgtAdresseState.dawaId = forslagItem.id;
    valgtAdresseState.tekst = forslagItem.tekst;
    valgtAdresseState.adresseFelter = {
        vejnavn: forslagItem.vejnavn ?? null,
        husnummer: forslagItem.husnummer ?? null,
        postnr: forslagItem.postnr ?? null,
        postnrnavn: forslagItem.postnrnavn ?? null
    };
    if (adresseInput) {
        adresseInput.value = forslagItem.tekst;
        adresseInput.dataset.dawaId = forslagItem.id;
    }

    // DOM opdatering
    rydAdresseForslag();
    nulstilAdresseFeedback();
    visValgtAdresseStatus(forslagItem.id, forslagItem.tekst);
    visAdresseFelter(valgtAdresseState.adresseFelter);

    hentBbrOgVis(forslagItem.id);
    hentKortOgVis(forslagItem.id);
}

function nulstilValgtAdresse() {
    nulstilValgtAdresseState();
    nulstilAlUI();
}

// BBR-opslag

async function hentBbrOgVis(dawaId) {
    visBbrStatus('bbr-henter', 'Henter ejendomsdata fra BBR...');
    try {
        const data = await hentBbrApi(dawaId);
        visBbrStatus('bbr-succes', 'BBR-data hentet.');
        // Gem BBR-data i state så opretEjendomsprofil kan samle payload
        valgtAdresseState.bbrData = data;
        nulstilProfilStatus();
        visEjendomsprofil(data);
    } catch (error) {
        console.error('Fejl ved BBR-opslag:', error);
        visBbrStatus('bbr-fejl', error.message || 'Systemfejl: Kunne ikke kontakte BBR-endpoint.');
        skjulEjendomsprofilVedFejl();
    }
}

// Kortopslag

async function hentKortOgVis(dawaId) {
    nulstilKort();
    try {
        const imageUrl = await hentKortApi(dawaId);
        renderKort(imageUrl);
    } catch (error) {
        console.error('Fejl ved hentning af kortdata:', error);
        visKortFejl();
    }
}

// Ejendomsprofil

async function opretEjendomsprofil() {
    const bbr = valgtAdresseState.bbrData;
    const tekst = valgtAdresseState.tekst;

    if (!bbr || !tekst) {
        visProfilStatus('profil-fejl', 'Vælg en adresse og vent på BBR-data før du gemmer.');
        return;
    }

    let finalVaerelser = bbr.antal_vaerelser ?? null;
    const manuelVaerelser = laesManuelAntalVaerelser();
    if (manuelVaerelser.erSynlig) {
        const val = parseInt(manuelVaerelser.value, 10);
        if (isNaN(val) || val < 0) {
            visProfilStatus('profil-fejl', 'Indtast et gyldigt antal værelser (0 eller større).');
            return;
        }
        finalVaerelser = val;
    }

    const valgtEjendomstype = valgtAdresseState.valgtEjendomstypeOverride || bbr.ejendomstype || null;
    if (!valgtEjendomstype) {
        visProfilStatus('profil-fejl', 'Vælg en ejendomstype før du gemmer ejendomsprofilen.');
        return;
    }

    visProfilStatus('profil-henter', 'Gemmer ejendomsprofil...');

    const payload = {
        adresse: tekst,
        ejendomstype: valgtEjendomstype,
        byggeaar: bbr.byggeaar ?? null,
        boligareal: bbr.boligareal ?? null,
        grundareal: bbr.grundareal ?? null,
        antal_vaerelser: finalVaerelser
    };

    try {
        const result = await opretEjendomsprofilApi(payload);
        valgtAdresseState.profilId = result.profil_id;
        visProfilStatus('profil-succes', `Ejendomsprofil gemt (profil_id: ${result.profil_id}).`);
        await hentMineEjendomsprofiler();
        visCaseInitSektion();
    } catch (error) {
        console.error('Fejl ved oprettelse af ejendomsprofil:', error);
        visProfilStatus('profil-fejl', error.message || 'Ejendomsprofilen kunne ikke gemmes.');
    }
}

// Ejendomsprofil-oversigt

async function hentMineEjendomsprofiler() {
    const pSektion = document.getElementById('profil-oversigt-sektion');
    try {
        const profiler = await hentEjendomsprofilerApi();
        if (profiler) {
            renderProfilOversigt(profiler);
            if (pSektion) pSektion.classList.remove('skjult');
        } else {
            if (pSektion) pSektion.classList.add('skjult');
        }
    } catch (e) {
        console.error('Fejl ved hentning af profiler:', e);
    }
}

async function gemVaerelser(profilId) {
    const nyVaerdiText = laesVaerelserInput(profilId);
    const nyVaerdi = nyVaerdiText === '' ? null : parseInt(nyVaerdiText, 10);

    if (nyVaerdi !== null && (isNaN(nyVaerdi) || nyVaerdi < 0)) {
        alert('Antal værelser skal være et positivt tal eller tomt.');
        return;
    }
    try {
        await opdaterEjendomsprofilApi(profilId, { antal_vaerelser: nyVaerdi });
        alert('Antal værelser opdateret!');
        await hentMineEjendomsprofiler();
    } catch (e) {
        alert('Fejl: ' + e.message);
    }
}

async function sletEjendomsprofil(profilId) {
    if (!confirm('Er du sikker på, at du vil slette denne profil og alle dens underliggende cases?')) return;
    try {
        await sletEjendomsprofilApi(profilId);
        alert('Profil slettet!');
        await hentMineEjendomsprofiler();
    } catch (e) {
        alert(e.message);
    }
}

// Investeringscase

// Henter en case, opdaterer state og returnerer caseData.
async function hentCaseData(caseId) {
    try {
        const caseData = await hentCaseApi(caseId);

        // State opdatering
        valgtAdresseState.caseId = caseData.case_id;
        valgtAdresseState.koebspris = caseData.koebspris;

        // Genskaber gemte købsomkostninger som én samlet post, da SQL kun gemmer totalen
        valgtAdresseState.koebsomkostningsposter = [];
        if (caseData.koebsomkostninger && Number(caseData.koebsomkostninger) > 0) {
            tilfoejKoebsomkostningspost(
                'Samlede købsomkostninger fra gemt case',
                Number(caseData.koebsomkostninger)
            );
        }

        renderCaseTilUI(caseData, valgtAdresseState.koebsomkostningsposter);
        return caseData;
    } catch (error) {
        console.error('Fejl ved hentning af case-data:', error);
        visErrorMessage('Kunne ikke hente investeringscasen. Tjek om case-id og server er korrekte.');
        throw error;
    }
}

async function initInvesteringscase() {
    const { casenavn, beskrivelse, koebspris } = laesCaseInput();
    const koebsomkostninger = beregnSamledeKoebsomkostninger();

    if (!valgtAdresseState.profilId) { visCaseStatus('case-fejl', 'Opret ejendomsprofil først.'); return; }
    if (!casenavn) { visCaseStatus('case-fejl', 'Angiv et casenavn.'); return; }
    if (isNaN(koebspris) || koebspris <= 0) { visCaseStatus('case-fejl', 'Angiv en gyldig købspris større end 0.'); return; }

    const isUpdate = valgtAdresseState.caseId != null;
    visCaseStatus('case-henter', isUpdate ? 'Opdaterer investeringscase...' : 'Opretter investeringscase...');

    const payload = { profil_id: valgtAdresseState.profilId, casenavn, beskrivelse, koebspris, koebsomkostninger };

    try {
        let result;
        if (isUpdate) {
            result = await opdaterCaseApi(valgtAdresseState.caseId, payload);
        } else {
            result = await initCaseApi(payload);
            valgtAdresseState.caseId = result.case_id;
        }
        valgtAdresseState.koebspris = koebspris;

        visCaseStatus('case-succes', isUpdate ? 'Investeringscase opdateret.' : `Investeringscase oprettet (case_id: ${valgtAdresseState.caseId}).`);
        visAktivCaseSammendrag(valgtAdresseState.caseId, casenavn, koebspris);
        await hentMineEjendomsprofiler();
        visLaanSektion();
        visRenoveringSektion();
        visDriftsudgiftSektion();
        visUdlejningSektion();
    } catch (error) {
        console.error('Fejl ved initialisering af investeringscase:', error);
        visCaseStatus('case-fejl', error.message || 'Investeringscasen kunne ikke oprettes.');
    }
}

async function aabnCase(profilId, caseId) {
    valgtAdresseState.profilId = profilId;
    valgtAdresseState.caseId = caseId;

    visSimuleringStatus(`Henter investeringscase ${caseId}...`);

    try {
        const caseData = await hentCaseData(caseId);
        if (caseData) {
            visAktivCaseSammendrag(caseData.case_id, caseData.casenavn, caseData.koebspris);
        }
        goToStep(5);
        await hentSimulering(caseId);
        visSimuleringStatus(`Investeringscase ${caseId} er åbnet og simuleret.`);
    } catch (error) {
        console.error('Fejl ved åbning af case:', error);
        visSimuleringStatus(`Fejl: ${error.message}`);
    }
}

async function gemCasenavn(caseId) {
    const nytNavn = laesCasenavnInput(caseId);
    if (!nytNavn) { alert('Casenavn kan ikke være tomt.'); return; }

    try {
        const existingData = await hentCaseApi(caseId);
        await opdaterCaseApi(caseId, {
            casenavn: nytNavn,
            beskrivelse: existingData.beskrivelse || '',
            koebspris: existingData.koebspris,
            koebsomkostninger: existingData.koebsomkostninger || 0
        });
        alert('Casenavn opdateret!');
        await hentMineEjendomsprofiler();
    } catch (e) {
        alert('Fejl: ' + e.message);
    }
}

async function duplikerAktuelCase() {
    const caseId = valgtAdresseState.caseId;

    if (!caseId) {
        visDuplikerFeedback('Opret først en investeringscase.');
        return;
    }
    visDuplikerFeedback('Duplikerer case...');

    try {
        const result = await duplikerCaseApi(caseId);
        const nyCaseId = result.case_id;
        if (nyCaseId) {
            valgtAdresseState.caseId = nyCaseId;
            await hentMineEjendomsprofiler();
            await hentCaseData(nyCaseId);
            visDuplikerFeedback(`Case duplikeret. Ny case_id: ${nyCaseId}.`);
        } else {
            visDuplikerFeedback('Case duplikeret, men nyt ID kunne ikke aflæses.');
        }
    } catch (error) {
        console.error('Fejl ved duplikering:', error);
        visDuplikerFeedback(`Fejl: ${error.message}`);
    }
}

// Simulering

async function hentSimulering(caseId) {
    visSimuleringStatus('Henter simulering...');
    try {
        const simuleringsArray = await hentSimuleringApi(caseId);
        renderSimuleringTilUI(simuleringsArray);
        renderSimuleringGraf(simuleringsArray);
        visSimuleringStatus('Simulering opdateret.');
    } catch (error) {
        console.error('Fejl ved hentning af simulering:', error);
        visSimuleringStatus(`Fejl: ${error.message}`);
    }
}

// Lån

async function opretLaan() {
    if (!valgtAdresseState.caseId) { visLaanStatus('laan-fejl', 'Opret investeringscase først.'); return; }

    const { laanebeloeb, rente, loebetid_aar, afdragsfriRaw, laanetype } = laesLaanInput();
    const afdragsfri_periode = afdragsfriRaw ? parseInt(afdragsfriRaw, 10) : null;

    if (isNaN(laanebeloeb) || laanebeloeb < 0) { visLaanStatus('laan-fejl', 'Angiv et gyldigt lånebeløb (>= 0).'); return; }
    if (isNaN(rente) || rente < 0) { visLaanStatus('laan-fejl', 'Angiv en gyldig rente (>= 0).'); return; }
    if (isNaN(loebetid_aar) || loebetid_aar <= 0 || loebetid_aar > 30) { visLaanStatus('laan-fejl', 'Løbetid skal være mellem 1 og 30 år.'); return; }
    if (afdragsfri_periode !== null && (isNaN(afdragsfri_periode) || afdragsfri_periode < 0 || afdragsfri_periode > loebetid_aar)) {
        visLaanStatus('laan-fejl', 'Afdragsfri periode skal være mellem 0 og lånets løbetid.');
        return;
    }

    visLaanStatus('laan-henter', 'Gemmer lån...');

    try {
        await opretLaanApi(valgtAdresseState.caseId, {
            laanebeloeb, rente, loebetid_aar,
            afdragsfri_periode: isNaN(afdragsfri_periode) ? null : afdragsfri_periode,
            laanetype
        });
        visLaanStatus('laan-succes', 'Lån tilføjet med succes!');
        renderLaan([{ laanebeloeb, rente, loebetid_aar, afdragsfri_periode, laanetype }]);
    } catch (error) {
        console.error('Fejl ved oprettelse af lån:', error);
        visLaanStatus('laan-fejl', error.message || 'Lånet kunne ikke gemmes.');
    }
}

// Renovering

async function opretRenovering() {
    if (!valgtAdresseState.caseId) { visRenoveringStatus('renovering-fejl', 'Opret investeringscase først.'); return; }

    const { beskrivelse, udgift, aarstalRaw } = laesRenoveringInput();

    if (!beskrivelse) { visRenoveringStatus('renovering-fejl', 'Angiv en beskrivelse.'); return; }
    if (isNaN(udgift) || udgift < 0) { visRenoveringStatus('renovering-fejl', 'Angiv en gyldig udgift (>= 0).'); return; }

    visRenoveringStatus('renovering-henter', 'Gemmer renovering...');

    const aarstal = parseInt(aarstalRaw, 10);
    const payload = { beskrivelse, udgift, aarstal: isNaN(aarstal) ? null : aarstal };

    try {
        await opretRenoveringApi(valgtAdresseState.caseId, payload);
        visRenoveringStatus('renovering-succes', 'Renovering tilføjet med succes!');
        renderRenovering([{ beskrivelse, udgift, aarstal: payload.aarstal }]);
    } catch (error) {
        console.error('Fejl ved oprettelse af renovering:', error);
        visRenoveringStatus('renovering-fejl', error.message || 'Renoveringen kunne ikke gemmes.');
    }
}

// Driftsudgift

async function opretDriftsudgift() {
    if (!valgtAdresseState.caseId) { visDriftsudgiftStatus('driftsudgift-fejl', 'Opret investeringscase først.'); return; }

    const { beskrivelse, beloeb, frekvens } = laesDriftsudgiftInput();

    if (!beskrivelse) { visDriftsudgiftStatus('driftsudgift-fejl', 'Angiv en beskrivelse.'); return; }
    if (isNaN(beloeb) || beloeb < 0) { visDriftsudgiftStatus('driftsudgift-fejl', 'Angiv et gyldigt beløb (>= 0).'); return; }

    visDriftsudgiftStatus('driftsudgift-henter', 'Gemmer driftsudgift...');

    try {
        await opretDriftsudgiftApi(valgtAdresseState.caseId, { beskrivelse, beloeb, frekvens });
        visDriftsudgiftStatus('driftsudgift-succes', 'Driftsudgift tilføjet med succes!');
        renderDriftsudgift([{ beskrivelse, beloeb, frekvens }]);
    } catch (error) {
        console.error('Fejl ved oprettelse af driftsudgift:', error);
        visDriftsudgiftStatus('driftsudgift-fejl', error.message || 'Driftsudgiften kunne ikke gemmes.');
    }
}

// Udlejning

async function opretUdlejning() {
    if (!valgtAdresseState.caseId) { visUdlejningStatus('udlejning-fejl', 'Opret investeringscase først.'); return; }

    const { lejeindtaegt, udgifterRaw } = laesUdlejningInput();
    const udlejningsudgifter = udgifterRaw ? parseFloat(udgifterRaw) : null;

    if (isNaN(lejeindtaegt) || lejeindtaegt < 0) { visUdlejningStatus('udlejning-fejl', 'Angiv en gyldig lejeindtægt (>= 0).'); return; }
    if (udgifterRaw && (isNaN(udlejningsudgifter) || udlejningsudgifter < 0)) { visUdlejningStatus('udlejning-fejl', 'Udlejningsudgifter skal være 0 eller større.'); return; }

    visUdlejningStatus('udlejning-henter', 'Gemmer udlejning...');

    const payload = { lejeindtaegt, udlejningsudgifter: isNaN(udlejningsudgifter) ? null : udlejningsudgifter };

    try {
        await opretUdlejningApi(valgtAdresseState.caseId, payload);
        visUdlejningStatus('udlejning-succes', 'Udlejning tilføjet med succes!');
        renderUdlejning(payload);
    } catch (error) {
        console.error('Fejl ved oprettelse af udlejning:', error);
        visUdlejningStatus('udlejning-fejl', error.message || 'Udlejningen kunne ikke gemmes.');
    }
}

// Købsomkostninger

function tilfoejKoebsomkostning() {
    const beskrivelseInput = document.getElementById('koebsomkostning-beskrivelse-input');
    const beloebInput = document.getElementById('koebsomkostning-beloeb-input');
    const beskrivelse = beskrivelseInput?.value.trim();
    const beloeb = parseFloat(beloebInput?.value);

    if (!beskrivelse) { visCaseStatus('case-fejl', 'Angiv en beskrivelse for købsomkostningen.'); return; }
    if (isNaN(beloeb) || beloeb < 0) { visCaseStatus('case-fejl', 'Købsomkostningsbeløb skal være 0 eller større.'); return; }

    tilfoejKoebsomkostningspost(beskrivelse, beloeb);
    if (beskrivelseInput) beskrivelseInput.value = '';
    if (beloebInput) beloebInput.value = '';
    renderKoebsomkostninger(valgtAdresseState.koebsomkostningsposter);
    visCaseStatus('case-succes', 'Købsomkostning tilføjet.');
}

function fjernKoebsomkostning(index) {
    fjernKoebsomkostningspost(index);
    renderKoebsomkostninger(valgtAdresseState.koebsomkostningsposter);
}

// Sammenligning

async function sammenlignCases() {
    const { id1, id2 } = laesSammenligningInput();

    if (!id1 || !id2) {
        visCompareStatus('status-message status-message--error', 'Indtast venligst to gyldige case-id\'er.');
        return;
    }
    visCompareStatus('status-message', 'Henter sammenligning...');
    rydCompareResultat();

    try {
        const compareData = await sammenlignCasesApi(id1, id2);
        renderCompareResultat(compareData);
        visCompareStatus('status-message status-message--success', 'Sammenligning fuldført.');
    } catch (error) {
        console.error('Fejl i sammenlignCases:', error);
        visCompareStatus('status-message status-message--error', error.message);
    }
}

// Event delegation for dynamiske profilknapper

function setupProfilOversigDelegation() {
    const container = document.getElementById('profil-oversigt-liste');
    if (!container) return;

    container.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const action = btn.dataset.action;
        const profilId = btn.dataset.profilId != null ? Number(btn.dataset.profilId) : null;
        const caseId = btn.dataset.caseId != null ? Number(btn.dataset.caseId) : null;

        switch (action) {
            case 'aabne-case':             await aabnCase(profilId, caseId); break;
            case 'toggle-edit-casenavn':   toggleEditCasenavn(caseId); break;
            case 'gem-casenavn':           await gemCasenavn(caseId); break;
            case 'toggle-edit-vaerelser':  toggleEditVaerelser(profilId); break;
            case 'slet-ejendomsprofil':    await sletEjendomsprofil(profilId); break;
            case 'gem-vaerelser':          await gemVaerelser(profilId); break;
        }
    });
}

// Event delegation for købsomkostningslisten

function setupKoebsomkostningDelegation() {
    const container = document.getElementById('koebsomkostning-liste');
    if (!container) return;

    container.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="fjern-koebsomkostning"]');
        if (!btn) return;
        fjernKoebsomkostning(Number(btn.dataset.index));
    });
}

// Initialisering

document.addEventListener('DOMContentLoaded', () => {
    goToStep(1);
    initAdresseSoegning();
    hentMineEjendomsprofiler();

    // Ejendomstype-valgknapper
    document.querySelectorAll('.type-selector-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.type-selector-btn').forEach(b => {
                b.classList.remove('btn--primary');
                b.classList.add('btn--secondary');
            });
            e.target.classList.remove('btn--secondary');
            e.target.classList.add('btn--primary');
            valgtAdresseState.valgtEjendomstypeOverride = e.target.innerText;
        });
    });

    // Wizard-navigation via data-attributter (ingen inline onclick)
    document.querySelectorAll('[data-next-step], [data-prev-step]').forEach(btn => {
        btn.addEventListener('click', () => {
            const step = Number(btn.dataset.nextStep ?? btn.dataset.prevStep);
            goToStep(step);
        });
    });

    // Formularknapper
    document.getElementById('opret-profil-knap')?.addEventListener('click', opretEjendomsprofil);
    document.getElementById('opret-case-knap')?.addEventListener('click', initInvesteringscase);
    document.getElementById('tilfoej-koebsomkostning-knap')?.addEventListener('click', tilfoejKoebsomkostning);
    document.getElementById('opret-laan-knap')?.addEventListener('click', opretLaan);
    document.getElementById('opret-renovering-knap')?.addEventListener('click', opretRenovering);
    document.getElementById('opret-driftsudgift-knap')?.addEventListener('click', opretDriftsudgift);
    document.getElementById('opret-udlejning-knap')?.addEventListener('click', opretUdlejning);
    document.getElementById('btn-sammenlign-cases')?.addEventListener('click', sammenlignCases);
    document.getElementById('btn-dupliker-case')?.addEventListener('click', duplikerAktuelCase);

    document.getElementById('koer-simulering-knap')?.addEventListener('click', () => {
        if (valgtAdresseState.caseId) {
            hentSimulering(valgtAdresseState.caseId);
        } else {
            visSimuleringStatus('Vælg eller opret en case før simulering.');
        }
    });

    // Event delegation for dynamisk genereret indhold
    setupProfilOversigDelegation();
    setupKoebsomkostningDelegation();
});
