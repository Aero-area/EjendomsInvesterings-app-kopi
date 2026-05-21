// DOM-rendering, statusvisning og inputlæsning.
// Kender ikke fetch-endpoints og kalder ikke apiClient.
// Læser state som skrivebeskyttet reference – muterer den ikke.

// Gemmer grafen, så den kan nulstilles før en ny simulering
let simuleringChart = null;

// Formateringshjælpere

export function formatKr(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return 'Ingen data';
    }
    return Number(value).toLocaleString('da-DK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

export function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

export function formatDato(isoString) {
    if (!isoString) return '-';
    const dato = new Date(isoString);
    if (isNaN(dato.getTime())) return '-';
    return dato.toLocaleString('da-DK', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// Sætter .value på et input-element hvis det findes
export function saetInputVaerdi(id, vaerdi) {
    const input = document.getElementById(id);
    if (input) input.value = vaerdi || '';
}

// Inputlæsning

export function laesManuelAntalVaerelser() {
    const input = document.getElementById('manuel-antal-vaerelser');
    return {
        erSynlig: !!(input && !input.classList.contains('skjult')),
        value: input?.value || ''
    };
}

export function laesCaseInput() {
    const beskrivelse = document.getElementById('case-beskrivelse-input')?.value.trim();
    return {
        casenavn: document.getElementById('case-casenavn-input')?.value.trim() || '',
        beskrivelse: beskrivelse || null,
        koebspris: parseFloat(document.getElementById('case-koebspris-input')?.value)
    };
}

export function laesLaanInput() {
    return {
        laanebeloeb: parseFloat(document.getElementById('laan-beloeb-input')?.value),
        rente: parseFloat(document.getElementById('laan-rente-input')?.value),
        loebetid_aar: parseInt(document.getElementById('laan-loebetid-input')?.value, 10),
        afdragsfriRaw: document.getElementById('laan-afdragsfri-input')?.value || '',
        laanetype: document.getElementById('laan-type-input')?.value.trim() || null
    };
}

export function laesRenoveringInput() {
    return {
        beskrivelse: document.getElementById('renovering-beskrivelse-input')?.value.trim() || '',
        udgift: parseFloat(document.getElementById('renovering-udgift-input')?.value),
        aarstalRaw: document.getElementById('renovering-aarstal-input')?.value.trim() || ''
    };
}

export function laesDriftsudgiftInput() {
    return {
        beskrivelse: document.getElementById('driftsudgift-beskrivelse-input')?.value.trim() || '',
        beloeb: parseFloat(document.getElementById('driftsudgift-beloeb-input')?.value),
        frekvens: document.getElementById('driftsudgift-frekvens-input')?.value.trim() || ''
    };
}

export function laesUdlejningInput() {
    return {
        lejeindtaegt: parseFloat(document.getElementById('udlejning-lejeindtaegt-input')?.value),
        udgifterRaw: document.getElementById('udlejning-udgifter-input')?.value || ''
    };
}

export function laesSammenligningInput() {
    return {
        id1: document.getElementById('compare-case-id-1')?.value.trim() || '',
        id2: document.getElementById('compare-case-id-2')?.value.trim() || ''
    };
}

export function laesCasenavnInput(caseId) {
    return document.getElementById(`input-casenavn-${caseId}`)?.value.trim() || '';
}

export function laesVaerelserInput(profilId) {
    return document.getElementById(`input-vaerelser-${profilId}`)?.value.trim() || '';
}

// Statusvisning (DOM-skrivning, ingen fetch/state)

export function visSimuleringStatus(besked) {
    const el = document.getElementById('simulering-status');
    if (el) el.innerText = besked;
}

export function visDuplikerFeedback(besked) {
    const el = document.getElementById('dupliker-feedback');
    if (el) el.innerText = besked;
}

export function visCompareStatus(cssKlasse, besked) {
    const el = document.getElementById('compare-status');
    if (!el) return;
    el.className = cssKlasse;
    el.innerText = besked;
}

export function rydCompareResultat() {
    const el = document.getElementById('compare-resultat');
    if (el) el.innerHTML = '';
}

export function visErrorMessage(besked) {
    const el = document.getElementById('error-message');
    if (el) el.innerText = besked;
}

// Skjuler ejendomsprofilen, hvis BBR-data ikke kan hentes
export function skjulEjendomsprofilVedFejl() {
    const sektion = document.getElementById('ejendomsprofil-sektion');
    if (sektion) sektion.classList.add('skjult');
}

// 5-siders navigation (ren DOM)

export function visStep(step) {
    [1, 2, 3, 4, 5].forEach(s => {
        const el = document.getElementById(`step-${s}`);
        if (el) el.classList.toggle('skjult', s !== step);
    });
    const aktivStep = document.getElementById(`step-${step}`);
    if (aktivStep) aktivStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Adressesøgning 

export function visValgtAdresseStatus(dawaId, tekst) {
    const statusEl = document.getElementById('valgt-adresse-status');
    if (!statusEl) return;
    statusEl.classList.remove('status-valgt', 'status-ingen');
    if (dawaId) {
        statusEl.classList.add('status-valgt');
        statusEl.innerText = `Valgt: ${tekst} (DAWA-id: ${dawaId})`;
    } else {
        statusEl.innerText = '';
    }
}

// Renderer adresseforslag. Kald-backs leveres af app.js for at undgå onclick.
export function renderAdresseForslag(forslag, onVaelgAdresse, onVejnavnKlik) {
    const forslagListe = document.getElementById('adresse-forslag');
    if (!forslagListe) return;
    forslagListe.innerHTML = '';

    if (!forslag.length) {
        visAdresseFeedback('Ingen adresser fundet.');
        return;
    }

    forslag.forEach(forslagItem => {
        const li = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.innerText = forslagItem.tekst;

        if (forslagItem.id) {
            button.classList.add('forslag-adgangsadresse');
            button.dataset.dawaId = forslagItem.id;
            button.addEventListener('click', () => onVaelgAdresse(forslagItem));
        } else {
            button.classList.add('forslag-vejnavn');
            button.addEventListener('click', () => onVejnavnKlik(forslagItem.tekst));
        }

        li.appendChild(button);
        forslagListe.appendChild(li);
    });
}

export function rydAdresseForslag() {
    const el = document.getElementById('adresse-forslag');
    if (el) el.innerHTML = '';
}

export function visAdresseFeedback(besked) {
    const el = document.getElementById('adresse-feedback');
    if (el) el.innerText = besked;
}

export function nulstilAdresseFeedback() {
    const el = document.getElementById('adresse-feedback');
    if (el) el.innerText = '';
}

export function visAdresseFelter(felter) {
    const f = felter || {};
    const vejnavnEl = document.getElementById('adresse-vejnavn');
    const husnummerEl = document.getElementById('adresse-husnummer');
    const postnrEl = document.getElementById('adresse-postnr');
    const bynavnEl = document.getElementById('adresse-bynavn');
    if (vejnavnEl) vejnavnEl.innerText = f.vejnavn || '-';
    if (husnummerEl) husnummerEl.innerText = f.husnummer || '-';
    if (postnrEl) postnrEl.innerText = f.postnr || '-';
    if (bynavnEl) bynavnEl.innerText = f.postnrnavn || '-';
}

export function nulstilAdresseFelter() {
    ['adresse-vejnavn', 'adresse-husnummer', 'adresse-postnr', 'adresse-bynavn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = '-';
    });
}

// BBR-status

export function visBbrStatus(cssKlasse, besked) {
    const el = document.getElementById('bbr-status');
    if (!el) return;
    el.classList.remove('bbr-henter', 'bbr-fejl', 'bbr-succes');
    el.classList.add(cssKlasse);
    el.innerText = besked;
}

export function nulstilBbrStatus() {
    const el = document.getElementById('bbr-status');
    if (!el) return;
    el.classList.remove('bbr-henter', 'bbr-fejl', 'bbr-succes');
    el.innerText = '';
}

// Viser BBR-data i ejendomsprofil-sektionen. Returnerer antal_vaerelser-valg til app.js.
export function visEjendomsprofil(data) {
    if (!data) return;
    document.getElementById('bbr-ejendomstype').innerText = data.ejendomstype || '-';
    document.getElementById('bbr-byggeaar').innerText = data.byggeaar || '-';
    document.getElementById('bbr-boligareal').innerText = data.boligareal || '-';
    document.getElementById('bbr-grundareal').innerText = data.grundareal ?? 'Ikke tilgængelig';

    const vaerelserSpan = document.getElementById('bbr-antal-vaerelser');
    const vaerelserInput = document.getElementById('manuel-antal-vaerelser');

    if (data.antal_vaerelser == null || data.antal_vaerelser === '-' || data.antal_vaerelser === '') {
        if (vaerelserSpan) vaerelserSpan.classList.add('skjult');
        if (vaerelserInput) { vaerelserInput.classList.remove('skjult'); vaerelserInput.value = ''; }
    } else {
        if (vaerelserSpan) { vaerelserSpan.classList.remove('skjult'); vaerelserSpan.innerText = data.antal_vaerelser; }
        if (vaerelserInput) vaerelserInput.classList.add('skjult');
    }

    nulstilProfilStatus();
    const sektion = document.getElementById('ejendomsprofil-sektion');
    if (sektion) sektion.classList.remove('skjult');
}

export function skjulEjendomsprofil() {
    const sektion = document.getElementById('ejendomsprofil-sektion');
    if (sektion) sektion.classList.add('skjult');
}

// Kort

export function renderKort(imageUrl) {
    const billede = document.getElementById('kort-billede');
    if (!billede) return;
    billede.src = imageUrl;
    billede.classList.remove('skjult');
}

export function visKortFejl() {
    const fejlEl = document.getElementById('kort-fejl');
    if (fejlEl) fejlEl.classList.remove('skjult');
    const billede = document.getElementById('kort-billede');
    if (billede) billede.classList.add('skjult');
}

export function nulstilKort() {
    const billede = document.getElementById('kort-billede');
    if (billede) { billede.src = ''; billede.classList.add('skjult'); }
    const fejlEl = document.getElementById('kort-fejl');
    if (fejlEl) fejlEl.classList.add('skjult');
}

// Profil-status

export function visProfilStatus(cssKlasse, besked) {
    const el = document.getElementById('profil-status');
    if (!el) return;
    el.className = cssKlasse;
    el.innerText = besked;
}

export function nulstilProfilStatus() {
    const el = document.getElementById('profil-status');
    if (!el) return;
    el.className = '';
    el.innerText = '';
}

// Case-init-sektion

export function visCaseInitSektion() {
    const sektion = document.getElementById('case-init-sektion');
    if (sektion) sektion.classList.remove('skjult');
}

// Skjuler case-sektionen og nulstiller inputs.
// Købsomkostninger beregnes fra state og kræver ikke skjult inputfelt
export function skjulCaseInitSektion() {
    const sektion = document.getElementById('case-init-sektion');
    if (sektion) sektion.classList.add('skjult');
    saetInputVaerdi('case-casenavn-input', '');
    saetInputVaerdi('case-beskrivelse-input', '');
    saetInputVaerdi('case-koebspris-input', '');
    renderKoebsomkostninger([]);
}

// Købsomkostninger

// Renderer listen over købsomkostningsposter.
// Fjern-knapper bruger data-action til event delegation i app.js.
export function renderKoebsomkostninger(poster) {
    const liste = document.getElementById('koebsomkostning-liste');
    const totalEl = document.getElementById('koebsomkostning-total');

    const total = poster.reduce((sum, post) => sum + Number(post.beloeb || 0), 0);

    if (liste) {
        liste.innerHTML = '';
        if (poster.length === 0) {
            liste.innerHTML = '<li>Ingen købsomkostninger registreret.</li>';
        } else {
            poster.forEach((post, index) => {
                const li = document.createElement('li');
                li.innerHTML = `
                    ${escapeHtml(post.beskrivelse)} - ${formatKr(post.beloeb)} kr.
                    <button type="button" class="btn btn--secondary"
                        data-action="fjern-koebsomkostning"
                        data-index="${index}">Fjern</button>
                `;
                liste.appendChild(li);
            });
        }
    }

    if (totalEl) totalEl.innerText = `${formatKr(total)} kr.`;
}

// Case-status

export function visCaseStatus(cssKlasse, besked) {
    const el = document.getElementById('case-status');
    if (!el) return;
    el.className = cssKlasse;
    el.innerText = besked;
}

export function nulstilCaseStatus() {
    const el = document.getElementById('case-status');
    if (!el) return;
    el.className = '';
    el.innerText = '';
}

// Lån-sektion

export function visLaanSektion() {
    const sektion = document.getElementById('laan-sektion');
    if (sektion) sektion.classList.remove('skjult');
}

export function skjulLaanSektion() {
    const sektion = document.getElementById('laan-sektion');
    if (sektion) sektion.classList.add('skjult');
    saetInputVaerdi('laan-beloeb-input', '');
    saetInputVaerdi('laan-rente-input', '');
    saetInputVaerdi('laan-loebetid-input', '');
    saetInputVaerdi('laan-afdragsfri-input', '');
    saetInputVaerdi('laan-type-input', '');
}

export function renderLaan(laanArray) {
    const laanListe = document.getElementById('laan-liste');
    if (!laanListe) return;
    laanListe.innerHTML = '';
    if (!laanArray || laanArray.length === 0) {
        laanListe.innerHTML = '<li>Ingen lån registreret.</li>';
        return;
    }
    laanArray.forEach(laan => {
        const li = document.createElement('li');
        li.innerText = `Lån: ${formatKr(laan.laanebeloeb)} kr. | Rente: ${laan.rente}% | Løbetid: ${laan.loebetid_aar} år`;
        laanListe.appendChild(li);
    });
}

export function visLaanStatus(cssKlasse, besked) {
    const el = document.getElementById('laan-status');
    if (!el) return;
    el.className = cssKlasse;
    el.innerText = besked;
}

export function nulstilLaanStatus() {
    const el = document.getElementById('laan-status');
    if (!el) return;
    el.className = '';
    el.innerText = '';
}

// Renovering-sektion

export function visRenoveringSektion() {
    const sektion = document.getElementById('renovering-sektion');
    if (sektion) sektion.classList.remove('skjult');
}

export function skjulRenoveringSektion() {
    const sektion = document.getElementById('renovering-sektion');
    if (sektion) sektion.classList.add('skjult');
    saetInputVaerdi('renovering-beskrivelse-input', '');
    saetInputVaerdi('renovering-udgift-input', '');
    saetInputVaerdi('renovering-aarstal-input', '');
}

export function renderRenovering(renoveringer) {
    const liste = document.getElementById('renovering-liste');
    if (!liste) return;
    liste.innerHTML = '';
    if (!renoveringer || renoveringer.length === 0) {
        liste.innerHTML = '<li>Ingen renoveringer registreret.</li>';
        return;
    }
    renoveringer.forEach(r => {
        const li = document.createElement('li');
        li.innerText = `${r.beskrivelse} - ${formatKr(r.udgift)} kr. (Årstal: ${r.aarstal ?? 'Ingen data'})`;
        liste.appendChild(li);
    });
}

export function visRenoveringStatus(cssKlasse, besked) {
    const el = document.getElementById('renovering-status');
    if (!el) return;
    el.className = cssKlasse;
    el.innerText = besked;
}

export function nulstilRenoveringStatus() {
    const el = document.getElementById('renovering-status');
    if (!el) return;
    el.className = '';
    el.innerText = '';
}

// Driftsudgift-sektion

export function visDriftsudgiftSektion() {
    const sektion = document.getElementById('driftsudgift-sektion');
    if (sektion) sektion.classList.remove('skjult');
}

export function skjulDriftsudgiftSektion() {
    const sektion = document.getElementById('driftsudgift-sektion');
    if (sektion) sektion.classList.add('skjult');
    saetInputVaerdi('driftsudgift-beskrivelse-input', '');
    saetInputVaerdi('driftsudgift-beloeb-input', '');
    const frekvensInput = document.getElementById('driftsudgift-frekvens-input');
    if (frekvensInput) frekvensInput.value = 'Maanedlig';
}

// Normaliserer en driftsudgift til årsniveau ud fra frekvens
function beregnAarligDriftsudgift(driftsudgift) {
    const beloeb = Number(driftsudgift.beloeb || 0);
    switch (driftsudgift.frekvens) {
        case 'Maanedlig': return beloeb * 12;
        case 'Kvartalsvis': return beloeb * 4;
        case 'Halvaarlig': return beloeb * 2;
        case 'Aarlig':
        default: return beloeb;
    }
}

export function renderDriftsudgift(driftsudgifter) {
    const liste = document.getElementById('driftsudgift-liste');
    const maanedligTotalEl = document.getElementById('drift-maanedlig-total');
    const aarligTotalEl = document.getElementById('drift-aarlig-total');
    if (!liste) return;

    liste.innerHTML = '';

    if (!driftsudgifter || driftsudgifter.length === 0) {
        liste.innerHTML = '<li>Ingen driftsudgifter registreret.</li>';
        if (maanedligTotalEl) maanedligTotalEl.innerText = '0,00 kr.';
        if (aarligTotalEl) aarligTotalEl.innerText = '0,00 kr.';
        return;
    }

    let samletAarlig = 0;
    driftsudgifter.forEach(d => {
        samletAarlig += beregnAarligDriftsudgift(d);
        const li = document.createElement('li');
        li.innerText = `${d.beskrivelse} - ${formatKr(d.beloeb)} kr. (${d.frekvens ?? 'Ingen frekvens'})`;
        liste.appendChild(li);
    });

    if (maanedligTotalEl) maanedligTotalEl.innerText = `${formatKr(samletAarlig / 12)} kr.`;
    if (aarligTotalEl) aarligTotalEl.innerText = `${formatKr(samletAarlig)} kr.`;
}

export function visDriftsudgiftStatus(cssKlasse, besked) {
    const el = document.getElementById('driftsudgift-status');
    if (!el) return;
    el.className = cssKlasse;
    el.innerText = besked;
}

export function nulstilDriftsudgiftStatus() {
    const el = document.getElementById('driftsudgift-status');
    if (!el) return;
    el.className = '';
    el.innerText = '';
}

// Udlejning-sektion

export function visUdlejningSektion() {
    const sektion = document.getElementById('udlejning-sektion');
    if (sektion) sektion.classList.remove('skjult');
}

export function skjulUdlejningSektion() {
    const sektion = document.getElementById('udlejning-sektion');
    if (sektion) sektion.classList.add('skjult');
    saetInputVaerdi('udlejning-lejeindtaegt-input', '');
    saetInputVaerdi('udlejning-udgifter-input', '');
}

export function renderUdlejning(udlejning) {
    const mIndtaegt = document.getElementById('udlejning-maanedlig-indtaegt');
    const mUdgift = document.getElementById('udlejning-maanedlig-udgift');
    const aIndtaegt = document.getElementById('udlejning-aarlig-indtaegt');
    const aUdgift = document.getElementById('udlejning-aarlig-udgift');
    const lejeindtaegtFelt = document.getElementById('lejeindtaegt');

    if (!udlejning) {
        const fall = 'Ingen data';
        if (mIndtaegt) mIndtaegt.innerText = fall;
        if (mUdgift) mUdgift.innerText = fall;
        if (aIndtaegt) aIndtaegt.innerText = fall;
        if (aUdgift) aUdgift.innerText = fall;
        if (lejeindtaegtFelt) lejeindtaegtFelt.innerText = 'Ingen udlejning registreret';
        return;
    }

    const indtaegt = udlejning.lejeindtaegt || 0;
    const udgift = udlejning.udlejningsudgifter || 0;
    if (mIndtaegt) mIndtaegt.innerText = `${formatKr(indtaegt)} kr.`;
    if (mUdgift) mUdgift.innerText = `${formatKr(udgift)} kr.`;
    if (aIndtaegt) aIndtaegt.innerText = `${formatKr(indtaegt * 12)} kr.`;
    if (aUdgift) aUdgift.innerText = `${formatKr(udgift * 12)} kr.`;
    if (lejeindtaegtFelt) {
        lejeindtaegtFelt.innerText = `${formatKr(indtaegt)} kr. (Udgifter: ${udgift ? formatKr(udgift) + ' kr.' : 'Ingen'})`;
    }
}

export function visUdlejningStatus(cssKlasse, besked) {
    const el = document.getElementById('udlejning-status');
    if (!el) return;
    el.className = cssKlasse;
    el.innerText = besked;
}

export function nulstilUdlejningStatus() {
    const el = document.getElementById('udlejning-status');
    if (!el) return;
    el.className = '';
    el.innerText = '';
}

// Simulering

export function nulstilSimuleringUI() {
    const statusEl = document.getElementById('simulering-status');
    if (statusEl) { statusEl.innerText = ''; statusEl.className = ''; }
    const tbody = document.getElementById('simulering-tbody');
    if (tbody) tbody.innerHTML = '';
    if (simuleringChart) { simuleringChart.destroy(); simuleringChart = null; }
}

export function renderSimuleringTilUI(simuleringsArray) {
    const tbody = document.getElementById('simulering-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    simuleringsArray.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.aar}</td>
            <td>${formatKr(row.lejeindtaegt)}</td>
            <td>${formatKr(row.driftsudgift)}</td>
            <td>${formatKr(row.renteudgift)}</td>
            <td>${formatKr(row.afdrag)}</td>
            <td>${formatKr(row.ydelse)}</td>
            <td>${formatKr(Number(row.ydelse || 0) / 12)}</td>
            <td>${formatKr(row.renovering)}</td>
            <td>${formatKr(row.egenkapital)}</td>
            <td>${formatKr(row.restgaeld)}</td>
            <td>${formatKr(row.cashflow)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Chart.js bruges kun til visualisering – guard mod manglende global Chart
export function renderSimuleringGraf(simuleringsArray) {
    const canvas = document.getElementById('simulering-graf');
    if (!canvas || typeof Chart === 'undefined') return;

    if (simuleringChart) simuleringChart.destroy();

    simuleringChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: simuleringsArray.map(r => r.aar),
            datasets: [
                {
                    label: 'Cashflow (kr.)',
                    data: simuleringsArray.map(r => r.cashflow),
                    borderColor: '#1a3d6d',
                    backgroundColor: 'rgba(26, 61, 109, 0.1)',
                    borderWidth: 2,
                    fill: false
                },
                {
                    label: 'Gæld (kr.)',
                    data: simuleringsArray.map(r => r.restgaeld),
                    borderColor: '#b00020',
                    backgroundColor: 'rgba(176, 0, 32, 0.1)',
                    borderWidth: 2,
                    fill: false
                },
                {
                    label: 'Egenkapital (kr.)',
                    data: simuleringsArray.map(r => r.egenkapital),
                    borderColor: '#34a853',
                    backgroundColor: 'rgba(52, 168, 83, 0.1)',
                    borderWidth: 2,
                    fill: false
                }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// Profiloversigt

function opretKnap(action, tekst, data) {
    const knap = document.createElement('button');
    knap.type = 'button';
    knap.textContent = tekst;
    knap.dataset.action = action;
    if (data.profilId != null) knap.dataset.profilId = data.profilId;
    if (data.caseId != null) knap.dataset.caseId = data.caseId;
    return knap;
}

// Renderer profilkort med data-action-attributter på knapper (ingen inline onclick).
// Event delegation sættes op i app.js på container-elementet.
export function renderProfilOversigt(profiler) {
    const pListe = document.getElementById('profil-oversigt-liste');
    if (!pListe) return;

    if (!profiler || profiler.length === 0) {
        pListe.innerHTML = '<p>Du har ingen gemte ejendomsprofiler endnu.</p>';
        return;
    }

    pListe.innerHTML = '';

    profiler.forEach(p => {
        const card = document.createElement('div');
        card.className = 'property-card';

        const info = document.createElement('div');
        info.className = 'property-card-info';

        const adresseP = document.createElement('p');
        const adresseStrong = document.createElement('strong');
        adresseStrong.textContent = p.adresse;
        adresseP.appendChild(adresseStrong);
        info.appendChild(adresseP);

        const detaljeP = document.createElement('p');
        detaljeP.textContent = `Type: ${p.ejendomstype || '-'} | Værelser: `;
        const vaerelserSpan = document.createElement('span');
        vaerelserSpan.id = `vaerelser-text-${p.profil_id}`;
        vaerelserSpan.textContent = p.antal_vaerelser !== null ? String(p.antal_vaerelser) : 'Ikke angivet';
        detaljeP.appendChild(vaerelserSpan);
        detaljeP.append(` | Cases: ${p.antal_cases || 0}`);
        info.appendChild(detaljeP);

        const datoP = document.createElement('p');
        datoP.textContent = `Oprettet: ${formatDato(p.oprettet_dato)} | Sidst indhentet: ${formatDato(p.sidst_indhentet_dato)}`;
        info.appendChild(datoP);

        const knapperDiv = document.createElement('div');
        knapperDiv.style.cssText = 'margin-top: 10px; margin-bottom: 15px; display: flex; gap: 10px;';
        const redigerVaerelserKnap = opretKnap('toggle-edit-vaerelser', 'Redigér værelser', { profilId: p.profil_id });
        redigerVaerelserKnap.className = 'btn btn--secondary';
        const sletKnap = opretKnap('slet-ejendomsprofil', 'Slet profil', { profilId: p.profil_id });
        sletKnap.className = 'btn btn--secondary';
        sletKnap.style.color = 'red';
        sletKnap.style.borderColor = 'red';
        knapperDiv.appendChild(redigerVaerelserKnap);
        knapperDiv.appendChild(sletKnap);
        info.appendChild(knapperDiv);

        const editVaerelserDiv = document.createElement('div');
        editVaerelserDiv.id = `edit-vaerelser-${p.profil_id}`;
        editVaerelserDiv.style.cssText = 'display: none; margin-bottom: 15px; gap: 5px;';
        const vaerelserInput = document.createElement('input');
        vaerelserInput.type = 'number';
        vaerelserInput.id = `input-vaerelser-${p.profil_id}`;
        vaerelserInput.value = p.antal_vaerelser || '';
        vaerelserInput.min = '0';
        vaerelserInput.placeholder = 'Antal værelser';
        vaerelserInput.style.cssText = 'flex: 1; padding: 5px;';
        const gemVaerelserKnap = opretKnap('gem-vaerelser', 'Gem', { profilId: p.profil_id });
        gemVaerelserKnap.className = 'btn btn--secondary';
        gemVaerelserKnap.style.cssText = 'padding: 2px 8px;';
        editVaerelserDiv.appendChild(vaerelserInput);
        editVaerelserDiv.appendChild(gemVaerelserKnap);
        info.appendChild(editVaerelserDiv);

        if (p.cases && p.cases.length > 0) {
            const casesHeader = document.createElement('div');
            casesHeader.style.marginTop = '10px';
            const casesStrong = document.createElement('strong');
            casesStrong.textContent = 'Tilknyttede cases:';
            casesHeader.appendChild(casesStrong);
            info.appendChild(casesHeader);

            const caseUl = document.createElement('ul');
            caseUl.style.paddingLeft = '20px';

            p.cases.forEach(c => {
                const li = document.createElement('li');
                li.style.marginBottom = '5px';

                const caseSpan = document.createElement('span');
                caseSpan.id = `case-text-${c.case_id}`;
                caseSpan.textContent = `${c.casenavn} (ID: ${c.case_id})`;
                li.appendChild(caseSpan);

                const caseKnapDiv = document.createElement('div');
                caseKnapDiv.style.marginTop = '5px';
                const aabnKnap = opretKnap('aabne-case', 'Åbn case', { profilId: p.profil_id, caseId: c.case_id });
                aabnKnap.className = 'btn btn--secondary';
                aabnKnap.style.cssText = 'font-size: 0.8em; padding: 2px 8px;';
                const redigerNavnKnap = opretKnap('toggle-edit-casenavn', 'Redigér navn', { caseId: c.case_id });
                redigerNavnKnap.className = 'btn btn--secondary';
                redigerNavnKnap.style.cssText = 'font-size: 0.8em; padding: 2px 8px;';
                caseKnapDiv.appendChild(aabnKnap);
                caseKnapDiv.appendChild(redigerNavnKnap);
                li.appendChild(caseKnapDiv);

                const editCaseDiv = document.createElement('div');
                editCaseDiv.id = `edit-case-${c.case_id}`;
                editCaseDiv.style.cssText = 'display: none; margin-top: 5px; gap: 5px;';
                const caseNavnInput = document.createElement('input');
                caseNavnInput.type = 'text';
                caseNavnInput.id = `input-casenavn-${c.case_id}`;
                caseNavnInput.value = c.casenavn;
                caseNavnInput.style.cssText = 'flex: 1; padding: 5px;';
                const gemCaseNavnKnap = opretKnap('gem-casenavn', 'Gem', { caseId: c.case_id });
                gemCaseNavnKnap.className = 'btn btn--secondary';
                gemCaseNavnKnap.style.cssText = 'font-size: 0.8em; padding: 2px 8px;';
                editCaseDiv.appendChild(caseNavnInput);
                editCaseDiv.appendChild(gemCaseNavnKnap);
                li.appendChild(editCaseDiv);

                caseUl.appendChild(li);
            });

            info.appendChild(caseUl);
        } else {
            const ingenCasesP = document.createElement('p');
            ingenCasesP.style.cssText = 'margin-top: 10px; font-style: italic;';
            ingenCasesP.textContent = 'Ingen cases endnu.';
            info.appendChild(ingenCasesP);
        }

        card.appendChild(info);
        pListe.appendChild(card);
    });
}

// Toggle-funktioner til inline redigering (ren DOM, ingen state)
export function toggleEditCasenavn(caseId) {
    const el = document.getElementById(`edit-case-${caseId}`);
    if (el) el.style.display = el.style.display === 'none' ? 'flex' : 'none';
}

export function toggleEditVaerelser(profilId) {
    const el = document.getElementById(`edit-vaerelser-${profilId}`);
    if (el) el.style.display = el.style.display === 'none' ? 'flex' : 'none';
}

// Case-rendering 

// Udfylder formularer og opsummeringsfelter med data fra en hentet case.
// Poster-listen sendes som parameter – state-mutationen sker i app.js.
export function renderCaseTilUI(caseData, poster) {
    const aktivCaseIdEl = document.getElementById('aktiv-case-id');
    if (aktivCaseIdEl) aktivCaseIdEl.innerText = caseData.case_id;

    saetInputVaerdi('case-casenavn-input', caseData.casenavn);
    saetInputVaerdi('case-beskrivelse-input', caseData.beskrivelse);
    saetInputVaerdi('case-koebspris-input', caseData.koebspris);

    renderKoebsomkostninger(poster || []);

    if (caseData.laan && caseData.laan.length > 0) {
        const l = caseData.laan[0];
        saetInputVaerdi('laan-beloeb-input', l.laanebeloeb);
        saetInputVaerdi('laan-rente-input', l.rente);
        saetInputVaerdi('laan-loebetid-input', l.loebetid_aar);
        saetInputVaerdi('laan-afdragsfri-input', l.afdragsfri_periode);
        saetInputVaerdi('laan-type-input', l.laanetype);
    }

    if (caseData.renoveringer && caseData.renoveringer.length > 0) {
        const r = caseData.renoveringer[0];
        saetInputVaerdi('renovering-beskrivelse-input', r.beskrivelse);
        saetInputVaerdi('renovering-udgift-input', r.udgift);
        saetInputVaerdi('renovering-aarstal-input', r.aarstal);
    }

    if (caseData.driftsudgifter && caseData.driftsudgifter.length > 0) {
        const d = caseData.driftsudgifter[0];
        saetInputVaerdi('driftsudgift-beskrivelse-input', d.beskrivelse);
        saetInputVaerdi('driftsudgift-beloeb-input', d.beloeb);
        const frekvensInput = document.getElementById('driftsudgift-frekvens-input');
        if (frekvensInput) frekvensInput.value = d.frekvens || 'Maanedlig';
    }

    if (caseData.udlejning) {
        saetInputVaerdi('udlejning-lejeindtaegt-input', caseData.udlejning.lejeindtaegt);
        saetInputVaerdi('udlejning-udgifter-input', caseData.udlejning.udlejningsudgifter);
    }

    renderUdlejning(caseData.udlejning);
    visCaseInitSektion();
    visLaanSektion();
    visRenoveringSektion();
    visDriftsudgiftSektion();
    visUdlejningSektion();
}

// Opdaterer opsummeringsfelterne i step 5
export function visAktivCaseSammendrag(caseId, casenavn, koebspris) {
    const aktivCaseIdEl = document.getElementById('aktiv-case-id');
    const casenavnEl = document.getElementById('casenavn');
    const koebsprisEl = document.getElementById('koebspris');
    if (aktivCaseIdEl) aktivCaseIdEl.innerText = caseId;
    if (casenavnEl) casenavnEl.innerText = casenavn || '-';
    if (koebsprisEl) koebsprisEl.innerText = `${formatKr(koebspris)} kr.`;
}

// Sammenligning

export function renderCompareResultat(compareData) {
    const container = document.getElementById('compare-resultat');
    if (!compareData || compareData.length < 2 || !container) return;
    const [case1, case2] = compareData;
    container.innerHTML = `
        <div class="compare-table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Nøgletal</th>
                        <th>${escapeHtml(case1.casenavn)} (ID: ${case1.case_id})</th>
                        <th>${escapeHtml(case2.casenavn)} (ID: ${case2.case_id})</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>Købspris</td><td>${formatKr(case1.koebspris)} kr.</td><td>${formatKr(case2.koebspris)} kr.</td></tr>
                    <tr><td>Købsomkostninger</td><td>${formatKr(case1.koebsomkostninger)} kr.</td><td>${formatKr(case2.koebsomkostninger)} kr.</td></tr>
                    <tr><td>Cashflow år 1</td><td>${formatKr(case1.noegletal.cashflow_aar_1)} kr.</td><td>${formatKr(case2.noegletal.cashflow_aar_1)} kr.</td></tr>
                    <tr><td>Cashflow år 30</td><td>${formatKr(case1.noegletal.cashflow_aar_30)} kr.</td><td>${formatKr(case2.noegletal.cashflow_aar_30)} kr.</td></tr>
                    <tr><td>Restgæld år 1</td><td>${formatKr(case1.noegletal.restgaeld_aar_1)} kr.</td><td>${formatKr(case2.noegletal.restgaeld_aar_1)} kr.</td></tr>
                    <tr><td>Restgæld år 30</td><td>${formatKr(case1.noegletal.restgaeld_aar_30)} kr.</td><td>${formatKr(case2.noegletal.restgaeld_aar_30)} kr.</td></tr>
                    <tr><td>Samlet cashflow 30 år</td><td>${formatKr(case1.noegletal.samlet_cashflow_30_aar)} kr.</td><td>${formatKr(case2.noegletal.samlet_cashflow_30_aar)} kr.</td></tr>
                    <tr><td>Årlig lejeindtægt år 1</td><td>${formatKr(case1.noegletal.aarlig_lejeindtaegt_aar_1)} kr.</td><td>${formatKr(case2.noegletal.aarlig_lejeindtaegt_aar_1)} kr.</td></tr>
                    <tr><td>Årlig driftsudgift år 1</td><td>${formatKr(case1.noegletal.aarlig_driftsudgift_aar_1)} kr.</td><td>${formatKr(case2.noegletal.aarlig_driftsudgift_aar_1)} kr.</td></tr>
                </tbody>
            </table>
        </div>
    `;
}

// Kombineret UI-nulstilling

// Nulstiller alle DOM-elementer ved nyt adressevalg.
// Kaldes fra app.js umiddelbart efter nulstilValgtAdresseState().
export function nulstilAlUI() {
    const adresseInput = document.getElementById('adresse-input');
    if (adresseInput) delete adresseInput.dataset.dawaId;

    document.querySelectorAll('.type-selector-btn').forEach(b => {
        b.classList.remove('btn--primary');
        b.classList.add('btn--secondary');
    });

    visValgtAdresseStatus(null, null);
    nulstilAdresseFelter();
    nulstilBbrStatus();
    skjulEjendomsprofil();
    nulstilKort();
    nulstilProfilStatus();
    skjulCaseInitSektion();
    nulstilCaseStatus();
    skjulLaanSektion();
    nulstilLaanStatus();
    skjulRenoveringSektion();
    nulstilRenoveringStatus();
    skjulDriftsudgiftSektion();
    nulstilDriftsudgiftStatus();
    skjulUdlejningSektion();
    nulstilUdlejningStatus();
    nulstilSimuleringUI();
}
