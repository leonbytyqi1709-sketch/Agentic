# 🤖 Claude Code Master Prompts – Der 3-Tage-Plan

Hier ist dein sequenzieller Plan. Gehe diese Prompts **exakt in dieser Reihenfolge** durch. Kopiere sie einfach nacheinander in dein Claude Code Terminal oder Chat-Fenster. 

**WICHTIG VOR DEM START:** Bevor du mit Prompt 1 loslegst, mach ein Backup deines Projekts (Mache einen Git Commit oder zippe den ganzen Ordner `Agentic`).
*Tipp: Warte nach jedem Prompt, bis Claude komplett fertig ist. Überprüfe, ob die App noch läuft (npm run dev), und mache DANN erst einen neuen Git Commit. Falls ein Prompt alles zerstört, gehst du einfach einen Schritt zurück.*

---

## 🛠️ TAG 1: Aufräumen & Skalierbarkeit vorbereiten

**Prompt 1 (Komponenten aufsplitten - Rechnungen):**
> "Hallo Claude. Wir müssen unsere "Gott-Komponenten" in kleinere, besser wartbare Teile zerlegen, bevor wir skalieren. Lass uns mit `src/pages/Invoices.jsx` anfangen. Bitte extrahiere das aktuelle `<Modal>` und das `<form>` zur Erstellung/Bearbeitung einer Rechnung aus der Datei und baue daraus eine völlig eigenständige Komponente namens `InvoiceForm.jsx` im Ordner `src/components/`. Passe die `Invoices.jsx` danach so an, dass sie diese neue Komponente nutzt. Sorge dafür, dass State und Callbacks korrekt übergeben werden, sodass die App denselben Funktionsumfang hat wie vorher."

**Prompt 2 (Komponenten aufsplitten - Dashboard):**
> "Super. Mach jetzt bitte Ähnliches für `src/pages/Dashboard.jsx`. Lagere alle Diagramme (die `<ResponsiveContainer>` und Charts für Growth/Revenue und Project Status) in eigenständige Komponenten aus (z.B. in `src/components/dashboard/GrowthChart.jsx` und `StatusChart.jsx`). Die Dashboard.jsx soll am Ende nur noch das Layout und die Daten laden, und diese dann an die neuen Chart-Komponenten weitergeben."

**Prompt 3 (Paginierung im Backend):**
> "Unsere aktuelle Architektur skaliert nicht für tausende Einträge, da wir Daten erst auf dem Client filtern. Bitte bearbeite die Hooks `useInvoices.js`, `useProjects.js` und `useClients.js`. Passe die Supabase-Abfragen dort an, sodass serverseitige Paginierung genutzt wird. Füge den Hooks Parameter für `page` und `pageSize` (oder Limit/Offset) hinzu und nutze den Supabase modifier `.range()`, damit nicht mehr als z.B. 50 Einträge auf einmal vom Netzwerk geladen werden."

**Prompt 4 (React Query einführen - Optional aber SEHR stark):**
> "Um unser State-Management für Server-Daten professionell zu machen, möchte ich TanStack React Query einführen. Bitte installiere `@tanstack/react-query`. Richte den `QueryClientProvider` in der `main.jsx` ein. Schreibe danach den Hook `useInvoices.js` komplett um: Entferne den lokalen `useState` für Loading und Daten und nutze stattdessen `useQuery` für das Fetchen und `useMutation` für das Erstellen/Updaten/Löschen der Rechnungen. Die Supabase-Requests bleiben, aber React Query übernimmt das Caching."

*(Anmerkung: Wenn Prompt 4 gut geklappt hat, kannst du Claude bitten, Prompt 4 auch für `useClients.js` etc. zu machen. Wenn nicht, skippe das und mach weiter mit Tag 2)*

---

## 🏗️ TAG 2: Das TypeScript Fundament gießen

**Prompt 5 (TypeScript Setup):**
> "Wir migrieren das Projekt nun auf TypeScript. Bitte installiere alle dafür benötigten Dev-Dependencies (Typescript, @types/react, @types/react-dom etc.). Erstelle eine korrekte `tsconfig.json` sowie `tsconfig.node.json` für ein Vite-React Projekt. Passe auch die `vite.config.js` falls nötig an. Ändere im Moment noch KINE Endungen der React-Dateien, richte nur die reine Konfiguration ein."

**Prompt 6 (Datenbank Typen definieren):**
> "Wir brauchen Typensicherheit für unsere Datenbankstruktur. Bitte analysiere die Datei `supabase-schema.sql` sorgfältig. Erstelle eine neue Datei `src/types/index.ts`. Schreibe in diese Datei strikte und präzise TypeScript Interfaces/Typen für alle unsere Tabellen, wie z.B. `User`, `Client`, `Project`, `Invoice`, `TimeEntry`. Achte darauf, optionale Felder korrekt mit einem `?` zu markieren und Typen für Enums (wie z.B. Rechnungsstatus) exakt zu definieren."

**Prompt 7 (Store & Hooks typisieren):**
> "Jetzt typisieren wir die Logik. Erledige folgende zwei Dinge: 1. Benenne alle Dateien im Ordner `src/store/` von `.js` auf `.ts` um. Definiere die Typen für den Zustand der Zustand-Stores unter Nutzung unser neuen Interfaces aus `src/types/index.ts`. 2. Benenne alle Dateien im Ordner `src/hooks/` von `.js` auf `.ts` um und typisiere die Parameter und Rückgabewerte der Supabase-Anfragen. Ersetze jeden Einsatz von `any` durch korrekte Typen!"

---

## 💎 TAG 3: UI-Typisierung und Formular-Validierung

**Prompt 8 (Komponenten typisieren):**
> "Der nächste Schritt ist die UIsebene. Benenne alle Dateien im Ordner `src/components/` (inklusive Unterordnern) von `.jsx` in `.tsx` um. Füge für jede Komponente ein eigenes Interface für die `Props` hinzu und typisiere alle Handler und States. Sorge dafür, dass der TypeScript-Compiler in diesem Ordner keine roten Fehler auswirft."

**Prompt 9 (Pages typisieren):**
> "Mach nun exakt dasselbe für den Ordner `src/pages/`. Benenne alle Dateien zu `.tsx` um. Stelle sicher, dass die übergebenen Daten aus unseren typsierten Hooks korrekt von den Pages verarbeitet und fehlerfrei an die typsierten Komponenten weitergeleitet werden."

**Prompt 10 (App-Root abschließen):**
> "Als letzter Schritt für die TypeScript-Migration: Benenne `App.jsx` und `main.jsx` in `.tsx` um. Behebe alle finalen Typisierungsprobleme (insbesondere mit React Router Guards oder Providern). Prüfe über einen Typecheck in der Konsole, ob unser gesamtes Projekt jetzt 100% Type-Safe ist."

**Prompt 11 (Zod Validierung - Die Kür):**
> "Um zu verhindern, dass fehlerhafte Daten an unsere Datenbank geschickt werden, bauen wir jetzt professionelle Validierung ein. Bitte installiere `react-hook-form`, `zod` und `@hookform/resolvers`. Gehe in unsere an Tag 1 erstellte `InvoiceForm.tsx`. Baue das Formular um, sodass es von React Hook Form verwaltet wird. Definiere zu Beginn der Datei ein strenges Zod-Schema (z.B. Steuersatz muss >= 0 sein, Rechnungsnummer ist Pflicht) und verknüpfe es mit dem Formular. Zeige bei ungültigen Eingaben saubere Fehlermeldungen in der UI an."

---

**🎉 Glückwunsch! Wenn du bei Prompt 11 angelangt bist und die App flüssig läuft, hast du aus einem MVP eine Enterprise-Ready Application gebaut!**
