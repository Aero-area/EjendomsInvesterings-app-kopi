# EjendomsInvest: Systemarkitektur og Dataflow
*En introduktion til 1. semester programmeringsstuderende*

Velkommen til maskinrummet i **EjendomsInvest**! Dette er et system udviklet til at oprette, gemme og simulere investeringer i fast ejendom.

I denne præsentation skal vi kigge på, hvordan et moderne web-system er skruet sammen. Vi bygger på en klassisk **Klient-Server Arkitektur** med en database:
1. **Frontend (Klienten)**: Det brugeren ser og interagerer med i sin internetbrowser.
2. **Backend (Serveren)**: Hjernen og motoren, der kører på en maskine et sted på nettet, og håndterer al logik.
3. **Databasen**: Det elektroniske arkivskab, som sikrer at vores data ikke forsvinder, når vi slukker computeren.

Lad os dykke ned i, hvad de forskellige filer i projektet rent faktisk gør. Filerne er her grupperet ud fra deres rolle i systemet for at gøre det mere logisk at forstå.

---

## Gennemgang af projektets filer

### Root (Projektets rod)
* **`README.md`**: Opskriften. Ligesom en samlevejledning til et IKEA-skab. Den forklarer nye udviklere, hvordan man installerer og starter systemet, og hvilke regler (konventioner) der gælder i projektet.

### Frontend (Det der kører i browseren)
Ligger i mappen `backend/frontend/`. Disse filer sendes direkte til brugerens browser, som så tegner hjemmesiden.
* **`index.html`**: Skelettet. Her defineres sidens struktur: "Her skal være en overskrift", "Her skal være et tekstfelt", og "Her er en knap".
* **`style.css`**: Malingen. Sørger for, at tingene ser pæne ud. Den bestemmer farver (som var variabler), og om en knap skal være rund, rød, eller gemt væk (`skjult`).
* **`app.js`**: Den lokale hjerne (Controlleren). Den lytter konstant: "Klikkede brugeren på knappen nu?". Når brugeren gør noget, er det `app.js`, der trækker i trådene og koordinerer hvad der skal ske.
* **`state.js`**: Browserens korttidshukommelse. Når du vælger en adresse på 'Side 1', husker `state.js` denne adresse, så du kan bruge den på 'Side 2'.
* **`views.js`**: Den flittige maler (View). Den ved intet om internettet, men den er ekspert i at manipulere HTML'en. Den tager imod data og ændrer teksten på skærmen, bygger lister og tegner grafer ud fra det.
* **`apiClient.js`**: Postbuddet. Det er denne fil, der står for at snakke med vores Backend (Server). Den sender data afsted over nettet og venter på et svar.

### Backend (Serveren i Node.js)
Vores backend modtager "anmodninger" over internettet (kaldet **HTTP requests**) og sender "svar" tilbage (**HTTP responses**). Mappen hedder `backend/`.
* **`app.js` (i backend-mappen)**: Startmotoren. Den tænder for serveren, siger "Jeg lytter nu på port 3000", og byder alle de indkomne beskeder velkommen, før de sendes videre til de rigtige ruter.
* **`.env.example`**: Eksempel på vores "hemmeligheder". Et rigtigt system har kodeord (f.eks. til databasen). Dem gemmer vi i en miljø-fil (`.env`), så kodeordet ikke ligger åbent for alle, der læser koden.
* **`package.json` / `package-lock.json`**: Pakkelisten. En slags indkøbsliste, der fortæller hvilke eksterne kodebiblioteker vores projekt benytter sig af – f.eks. "Express" til at bygge serveren og "mssql" for at tale med databasen.

#### Routing (Dørmanden)
* **`routes/caseRoutes.js`**: Dørmanden / Vejviseren. Når en browser sender et HTTP kald til serveren (f.eks. et HTTP GET til "/api/ejendomsprofiler"), kigger dørmanden på anmodningen og siger: "Ah, du vil se ejendomsprofiler, jeg sender dig videre til vores Controller."

#### Controllers (Lederne)
* **`controllers/CaseController.js`**: Afdelingslederen. Modtager beskeden fra dørmanden, tjekker om den indtastede data er gyldig (er prisen et reelt tal?), beder Databasen eller Services om at gøre arbejdet, og samler til sidst et pænt svar til frontenden.

#### Services (Eksperterne)
Services er filer, der har speciale i at snakke med *andre* eksterne systemer på internettet.
* **`services/BbrService.js`**: Bygningseksperten. Får et adresse-ID og spørger det offentlige bygningsregister (BBR) om ejendommens byggeår, areal osv.
* **`services/DawaService.js`**: Adresseeksperten. Spørger Danmarks Adresseregister (DAWA) og får autoudfyldnings-forslag til adresser, der f.eks. starter med "Roski...".
* **`services/KortService.js`**: Korteksperten. Sørger for at hente de korrekte luftfotos fra statens korttjeneste.
* **`services/CaseParserService.js`**: Tolken. Tager de "flade" rækker af data vi får fra vores database, og strukturerer det som et pænt "træ" af information (JSON-objekter).

#### Models (Matematikeren)
* **`models/Investeringscase.js`**: Forretningslogikken. Den kender alle reglerne for vores ejendomsprojekt. Den tager tallene for gæld, lån, lejeindtægter og driftsudgifter, og kører en kæmpe simulation (`beregnCashflow()`), der forudsiger din indtjening over 30 år.

#### Repositories (Bibliotekarerne / Database-håndtering)
Repositories ("Repo's") er de **eneste** filer i vores backend, der taler SQL og rører ved databasen.
* **`db/dbConnection.js`**: Telefonledningen ned i kælderen til vores database.
* **`repositories/EjendomsRepo.js`**: Arkivaren for ejendomsprofiler. Opretter nye profiler, opdaterer antal værelser eller sletter en profil.
* **`repositories/CaseRepo.js`**: Arkivaren for vores Investeringscases, lån, renoveringer og drifsudgifter. Tager f.eks. imod en række tal og indsætter dem i databasen.

### SQL / Databasen (Arkivskabet)
Disse filer definerer vores Azure-database (placeret i `sql/`).
* **`schema.sql`**: Tegningerne til databasen. Den skaber "Tabeller" med faste kolonner. Det er her man opsætter stærke regler for dataen. For eksempel sætter vi **Foreign Keys (Fremmednøgler)** op. En fremmednøgle er en usynlig tråd, der låser data sammen. Den siger: *"Et lån kan KUN eksistere, hvis det er koblet til et gyldigt Investeringscase-ID. Du må ikke oprette et lån, der svæver frit i luften!"*.
* **`seed_data.sql`**: Test-data. Nogle koder, der pumper et par "fake" cases ind i databasen, så udviklere ikke skal sidde og taste manuelt hver gang de vil teste.
* **`queries.sql`**: Færdige SQL forespørgsler, udvikleren kan køre under fejlfinding.

### Test (Kvalitetskontrol)
* **`test/http/`**: Værktøjer til at skyde direkte test-kald mod vores server for at sikre at den virker, uden at vi behøver at starte en browser op.

---

## Hvordan hænger det sammen? To Eksempler på Dataflows

Lad os nu følge dataens rejse gennem filerne.

### Dataflow 1: "Søg efter en adresse" (Et simpelt opslag)
*Hvad sker der, når du står på hjemmesiden og indtaster "Ros" i adressefeltet?*

1. **Bruger (Frontend)**: Taster "Ros" i søgefeltet på hjemmesiden (`index.html`).
2. **`app.js` (Frontend)**: Reagerer på, at brugeren taster. Den venter et splitsekund for at være sikker på du er færdig med at skrive, og kalder derefter på postbuddet.
3. **`apiClient.js` (Frontend)**: Sender en **HTTP GET** anmodning til Backenden. *(Tænk på et GET-kald, som at sende en person hen til biblioteket med et spørgsmål, hvor man beder om at 'læse' eller 'få' information tilbage).*
4. **`app.js` & `caseRoutes.js` (Backend)**: Modtager anmodningen via internettet. Ruten for "/adresser/soeg" fortæller, at det er `CaseController` der skal overtage opgaven.
5. **`CaseController.js` (Backend)**: Beder vores `DawaService` om at hente adresser, der matcher.
6. **`DawaService.js` (Backend)**: Snakker med det offentlige Danmarks Adresseregister over internettet. Returnerer de fundne adresser (Roskildevej 1, Roskildevej 2 osv.).
7. **`CaseController.js` (Backend)**: Sender listerne med adresserne tilbage over internettet til Frontenden.
8. **`views.js` (Frontend)**: Tager listen og genererer automatisk den "dropdown" (HTML-liste), der pludselig dukker op nede under tekstfeltet på din skærm!

### Dataflow 2: "Gem Investeringscase" (Oprette ny data)
*Hvad sker der, når du har udfyldt købspris og navn og klikker på knappen "Gem Investeringscase"?*

1. **Bruger (Frontend)**: Klikker på knappen!
2. **`app.js` (Frontend)**: Lytter efter klikket. Den beder `views.js` om at aflæse input-felterne (f.eks. "2.000.000"). Den slår op i `state.js` for at huske, hvilken adresse sagen hører til.
3. **`apiClient.js` (Frontend)**: Denne gang sender vi en **HTTP POST** anmodning. *(Et POST-kald er som at sende en udfyldt blanket i en kuvert; du beder serveren om at 'gemme' eller 'oprette' noget nyt data for dig).* Pakken med "2.000.000 kr." sendes til `/api/cases/init`.
4. **`caseRoutes.js` (Backend)**: Dørmanden sender blanketen videre til `CaseController.initCase`.
5. **`CaseController.js` (Backend)**: Chefen tjekker: Er 2.000.000 et rigtigt tal? Er det over nul? Ja! Derefter kalder den på vores bibliotekar, `CaseRepo`.
6. **`CaseRepo.js` (Backend)**: Skriver en SQL kommando (`INSERT INTO Investeringscase ...`). Den beder Azure-databasen om at oprette sagen. Databasen opretter den, gemmer den sikkert på en harddisk og returnerer til Repo'et: "Sagen er oprettet, og den fik sag-nummer (ID) 42".
7. **`CaseController.js` (Backend)**: Sender et `HTTP 201 Created` svar (En internet-kode, der betyder "Din data blev succesfuldt oprettet!") tilbage til Frontenden, og vedlægger det nye `ID: 42`.
8. **`app.js` (Frontend)**: Modtager det gode svar. Opdaterer `state.js` så hukommelsen nu ved, vi arbejder på sag nr 42. Til sidst beder den `views.js` vise en grøn boks for brugeren med beskeden: *"Investeringscase oprettet"*, og den låser op, så brugeren nu kan gå i gang med at tilføje lån til sagen!
