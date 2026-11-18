# Sito dimostrativo: località approssimativa da IP con consenso

## Requisiti
- Node.js 18 o successivo
- Hosting che supporti un processo Node.js persistente
- HTTPS in produzione

## Avvio locale
1. Apri un terminale nella cartella del progetto.
2. Imposta una password robusta per l'area riservata:
   - macOS/Linux: `export ADMIN_PASSWORD='una-password-lunga-e-unica'`
   - PowerShell: `$env:ADMIN_PASSWORD='una-password-lunga-e-unica'`
3. Facoltativo: imposta l'utente admin (`ADMIN_USER`, predefinito `admin`).
4. Avvia: `node server.js`
5. Apri `http://localhost:3000`.

## Come si usa
- Condividi l'URL pubblico del sito.
- Il visitatore vede prima l'informativa.
- Solo dopo aver premuto “Acconsento e continuo” il browser invia la richiesta al server.
- Il server riceve l'IP della connessione e prova a stimare Paese/regione/città tramite ipapi.co.
- Area riservata: `https://TUO-DOMINIO/admin` (il browser chiederà username e password).

## Limiti e note importanti
- Non è GPS e non identifica un indirizzo preciso o una persona.
- VPN, proxy e reti mobili possono rendere la stima imprecisa.
- Il progetto conserva IP e stima per 30 giorni nel file `visits.json`.
- Il servizio ipapi.co è esterno e ha proprie condizioni/limiti; verifica i termini e la privacy prima dell'uso.
- Se pubblichi dietro un proxy, il codice usa per impostazione predefinita l'IP della connessione al server e NON si fida di `X-Forwarded-For`. Configura un proxy fidato prima di cambiare questa impostazione.
- Prima della pubblicazione, completa l'informativa con identità e contatti del titolare, finalità, base giuridica, destinatari/fornitori, diritti e modalità per esercitarli. Valuta gli obblighi GDPR/ePrivacy con un professionista.
- Non usare questo sistema per sorvegliare persone o aggirare il loro consenso.
