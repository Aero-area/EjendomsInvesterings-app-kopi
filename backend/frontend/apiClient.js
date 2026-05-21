// Alle fetch-kald til backend. Kaster Error ved ikke-ok svar. Rører ikke DOM eller state.

// Forsøger at parse fejlbesked fra JSON-svar, ellers fallback.
async function parseFejlbesked(response, fallback) {
    try {
        const data = await response.json();
        return data.error || fallback;
    } catch (_) {
        return fallback;
    }
}

// Adresse

export async function soegAdresseApi(soegetekst) {
    const response = await fetch(`/api/adresser/soeg?q=${encodeURIComponent(soegetekst)}`);
    if (!response.ok) {
        const besked = await parseFejlbesked(response, `Forespørgsel mislykkedes (status ${response.status}).`);
        throw new Error(besked);
    }
    const result = await response.json();
    const forslag = result?.data?.forslag;
    if (!Array.isArray(forslag)) throw new Error('Ugyldigt svarformat fra serveren.');
    return forslag;
}

// BBR og kort

export async function hentBbrApi(dawaId) {
    const response = await fetch(`/api/ejendomme/bbr/${encodeURIComponent(dawaId)}`);
    if (!response.ok) {
        const besked = await parseFejlbesked(response, `Fejl: BBR-service afvist (status ${response.status}).`);
        throw new Error(besked);
    }
    const result = await response.json();
    return result.data;
}

export async function hentKortApi(dawaId) {
    const response = await fetch(`/api/ejendomme/kort/${encodeURIComponent(dawaId)}`);
    if (!response.ok) throw new Error(`Kortservice fejlede (status ${response.status}).`);
    const result = await response.json();
    if (!result.imageUrl) throw new Error('Ingen billed-URL modtaget fra kortservice.');
    return result.imageUrl;
}

// Ejendomsprofiler

export async function hentEjendomsprofilerApi() {
    const response = await fetch('/api/ejendomsprofiler');
    const result = await response.json();
    if (!response.ok || !result.data) return null;
    return result.data;
}

export async function opretEjendomsprofilApi(payload) {
    const response = await fetch('/api/ejendomsprofiler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Serverfejl (status ${response.status}).`);
    return result;
}

export async function opdaterEjendomsprofilApi(id, payload) {
    const response = await fetch(`/api/ejendomsprofiler/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const besked = await parseFejlbesked(response, 'Kunne ikke opdatere ejendomsprofil.');
        throw new Error(besked);
    }
}

export async function sletEjendomsprofilApi(id) {
    const response = await fetch(`/api/ejendomsprofiler/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Kunne ikke slette profil.');
}

// Cases

export async function hentCaseApi(caseId) {
    const response = await fetch(`/api/cases/${caseId}`);
    if (!response.ok) throw new Error(`Fejl fra serveren: ${response.status}`);
    const result = await response.json();
    if (!result.data) throw new Error('Ingen case-data modtaget fra serveren.');
    return result.data;
}

export async function initCaseApi(payload) {
    const response = await fetch('/api/cases/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Serverfejl (status ${response.status}).`);
    return result;
}

export async function opdaterCaseApi(caseId, payload) {
    const response = await fetch(`/api/cases/${caseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Serverfejl (status ${response.status}).`);
    return result;
}

export async function duplikerCaseApi(caseId) {
    const response = await fetch(`/api/cases/${caseId}/dupliker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    if (!response.ok) throw new Error(`Fejl fra serveren: ${response.status}`);
    return await response.json();
}

export async function sammenlignCasesApi(id1, id2) {
    const response = await fetch(`/api/cases/sammenlign?ids=${id1},${id2}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Kunne ikke sammenligne cases.');
    return result.data;
}

// Case-relationer

export async function opretLaanApi(caseId, payload) {
    const response = await fetch(`/api/cases/${caseId}/laan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Serverfejl (status ${response.status}).`);
    return result;
}

export async function opretRenoveringApi(caseId, payload) {
    const response = await fetch(`/api/cases/${caseId}/renovering`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Serverfejl (status ${response.status}).`);
    return result;
}

export async function opretDriftsudgiftApi(caseId, payload) {
    const response = await fetch(`/api/cases/${caseId}/driftsudgift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Serverfejl (status ${response.status}).`);
    return result;
}

export async function opretUdlejningApi(caseId, payload) {
    const response = await fetch(`/api/cases/${caseId}/udlejning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (response.status === 404) throw new Error('Fejl: Investeringscasen blev ikke fundet.');
    if (response.status === 409) throw new Error('Fejl: Denne case har allerede en udlejning tilknyttet.');
    if (!response.ok) throw new Error(result.error || `Serverfejl (status ${response.status}).`);
    return result;
}

// Simulering

export async function hentSimuleringApi(caseId) {
    const response = await fetch(`/api/cases/${caseId}/simulering`);
    if (!response.ok) throw new Error(`Fejl fra serveren: ${response.status}`);
    const result = await response.json();
    if (!Array.isArray(result.data)) throw new Error('Simuleringsdata har ugyldigt format.');
    return result.data;
}
