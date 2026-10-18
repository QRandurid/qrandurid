# E-posti ja parooliga kontode ühendamine

Mäng töötab endiselt GitHub Pagesis. Paroole, e-posti kinnitamist ja sessioone haldab Supabase Auth. Mängu privaatne edenemine läheb sama projekti Postgresi andmebaasi. GitHub Pages üksi ei paku andmebaasi ega autentimist.

## Ühekordne seadistus

1. Loo enda [Supabase'i](https://supabase.com/dashboard) konto all projekt või kasuta olemasolevat. Vali sobiv piirkond ja hinnaplaan; seda vestlust pole ühegi projektiga ühendatud.
2. Ava SQL Editor ja käivita hoidla `supabase/schema.sql`. See loob `qrandurid_progress` tabeli ja lubab igal sisseloginud kasutajal lugeda ning muuta ainult enda rida. Anonüümsel külastajal puudub tabelile ligipääs.
3. Kontrolli Authentication → Providers alt, et Email/Password on lubatud. Jäta e-posti kinnitamine sisse. Avaliku kasutuse jaoks seadista enda SMTP ja vaata üle saatmislimiidid ning konto loomise kaitsed.
4. Authentication → URL Configuration: pane Site URL-iks `https://qrandurid.github.io/qrandurid/` ning lisa sama aadress Redirect URLs nimekirja. Kui kasutad oma domeeni, kasuta selle tegelikku mänguaadressi. Testimiseks lisa ainult vajalikud kohalikud aadressid eraldi.
5. Ava projekti Connect/API seaded. Kopeeri **Project URL** ja **publishable key** (`sb_publishable_…`) faili `account-config.js`. Sobib ka vana **anon**-võti. Need kaks väärtust on avalik brauserikonfiguratsioon. Ära lisa koodi `service_role`-võtit, `sb_secret_…`-võtit, andmebaasiparooli ega muid salajasi võtmeid.
6. Avalda muudetud fail. Kui avaldamine muudab ainult konfiguratsiooni, muuda ka `service-worker.js` faili `CACHE_NAME` versiooni, et võrguühenduseta vahemälu uueneks.
7. Loo testkonto, kinnita e-post, ava mõni koht ja vaheta skin. Logi teises brauseris sama kontoga sisse ning kontrolli edenemist. Kontrolli ka parooli taastamise kirja ning seda, et teine konto esimese edenemist ei näe.

Kuni avalik konfiguratsioon puudub, ütleb profiilivaade ausalt, et pilvesalvestus pole veel ühendatud. Külalisena mängimine ja selles brauseris salvestamine töötavad edasi.

## Salvestuse käitumine

- Sisselogimisel laaditakse konto enda mäng. Külalise edenemist ei kirjutata automaatselt teise inimese kontole.
- Nupp **TOO KÜLALISE MÄNG KAASA** liidab selle brauseri külalisprogressi selgesõnalisel kinnitusel kontoga. Senised kohad ja kollektsioonid jäävad alles.
- Muudatused salvestatakse kõigepealt seadmesse kasutaja ID alusel ning seejärel automaatselt pilve. Võrguühenduse taastudes proovitakse uuesti; profiilis on ka käsitsi kordamise nupp.
- Väljalogimisel taastatakse eraldi külalismäng. Konto kohalik puhver ei lähe järgmise konto ega külalise salvestusse.
- Samaaegsete seadmete korral kasutatakse versiooniga tingimuslikke kirjutusi ja konflikti korral uut lugemist. Kogutud esemete ja külastuste loendid ühendatakse. XP säilitab suurema kogusumma ning lisab teises harus puuduvate külastuste XP. Sama koha XP-d ei liideta kaks korda. Eraldi seadmetes saadud duplikaatpreemiate XP-d ei summeerita; nädalapunktidest jääb suurem väärtus. Nimi ja valitud kujundus tulevad ootel kohaliku muudatuse korral sellest seadmest, muidu pilvest.
- Mäng on jätkuvalt kliendipoolne demo: pilvesalvestus ei muuda XP-d petmiskindlaks ega loo päris avalikku edetabelit. Tootmiskõlblik võistluslik punktiarvestus vajab serveripoolset sündmuste kontrolli.
- Rakenduse enda kood ei salvesta paroole. Supabase'i ametlik klient haldab sessioonitokeneid ja nende uuendamist. Teenusekonto salajasi võtmeid ei kasutata.

## Kontrollid

`PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v`

Vajalikud on Python Playwright ja Chromium. Testid käivitavad kohaliku HTTP-serveri. Konto testides asendatakse Supabase'i HTTP-teenus kontrollitud testvastustega; need ei tõenda päris e-kirjade saatmist ega tegeliku projekti RLS-poliitikat. Viimased tuleb pärast projekti ühendamist kontrollida kahe päris testkontoga.
