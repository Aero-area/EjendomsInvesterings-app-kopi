# Ejendomsinvesterings-app

Kort guide til lokal opsætning, kørsel og test af EjendomsInvest.

## Krav

Følgende skal være installeret lokalt:

Node.js  
npm

## Opsætning

Opret en .env-fil i backend-mappen.

Filen skal indeholde følgende variabler:

DB_USER=dit_azure_brugernavn  
DB_PASSWORD=dit_azure_password  
DB_SERVER=din_azure_server_url.database.windows.net  
DB_DATABASE=din_database_navn  
DB_PORT=1433  

BBR_BASE_URL=https://services.datafordeler.dk  
BBR_USERNAME=dit_bbr_brugernavn  
BBR_PASSWORD=dit_bbr_password  

DATAFORSYNINGEN_TOKEN=din_token_her

## Start applikationen

Åbn en terminal i projektets rodmappe.

Kør følgende kommandoer:

cd backend  
npm install  
npm run dev

Alternativt kan serveren startes med:

npm start

Applikationen kører herefter lokalt på:

http://localhost:3000

## Kør tests

Kør følgende fra backend-mappen:

npm test

## Projektstruktur

backend indeholder Express-server, controllerlag, repositories, services, modeller, frontend og unit-tests.

sql indeholder schema.sql og seed_data.sql.

test/http indeholder manuelle HTTP-tests af API-endpoints.

## Navngivningskonvention

Projektet anvender en bevidst navngivningskonvention, hvor danske begreber bruges til domænenære dele af systemet, mens engelske suffixer bruges til tekniske arkitekturkomponenter.

Danske navne anvendes til domænebegreber og brugerrettede handlinger, f.eks ejendomsprofil, investeringscase, koebspris, driftsudgift, renovering og udlejning. Dette gør koden tæt på projektets danske problemområde.

Engelske suffixer som Controller, Service, Repo og Route anvendes til tekniske komponenter, fordi de afspejler systemets lagdelte arkitektur og almindelige MVC-begreber.

JavaScript-funktioner navngives primært med handlingsverber, f.eks. hent, opret, render, vis, skjul og nulstil, så funktionens ansvar fremgår tydeligt. SQL-felter bevarer snake_case, mens JavaScript ellers bruger camelCase. Når SQL-felter optræder direkte i JavaScript, bevares deres databaseform for at undgå uklar mapping mellem API, repository og database.

## Database

Kør først sql/schema.sql.

Kør derefter sql/seed_data.sql.

schema.sql opretter tabeller, relationer og constraints.

seed_data.sql indsætter demo-data til lokal test.

## API-test

HTTP-endpoints kan testes via filerne i test/http.

Filerne dokumenterer centrale GET-, POST-, PUT- og DELETE-kald.

## Ekstern kode og biblioteker

Frontend er udviklet i HTML, CSS og JavaScript.

Chart.js er installeret som npm-pakke og fremgår af package.json. Det serveres lokalt fra node_modules via en dedikeret Express static route.

Chart.js bruges kun til grafvisning af cashflow, restgæld og egenkapital.

Al økonomisk beregning og forretningslogik ligger i backendens egen domænemodel.

Backend anvender Node.js, Express og mssql-pakken til API og Azure SQL-forbindelse.

## Scope-cuts og præciseringer

Systemet anvender en fast demo-bruger med bruger_id 1.

Bruger-tabellen bevares i databasen for at opretholde relationel struktur og referentiel integritet.

Hvis BBR ikke returnerer grundareal, viser systemet værdien som Ikke tilgængelig. Grundareal kan ikke indtastes manuelt.

Kortvisning anvender Dataforsyningens WMS/ortofoto via token.

Matrikelkort er ikke implementeret. Kortkravet vurderes derfor som delvist opfyldt, da systemet viser luftfoto, men ikke matrikelkort.

Projektet kræver Node.js 18 eller nyere, fordi backend bruger fetch til eksterne API-kald.