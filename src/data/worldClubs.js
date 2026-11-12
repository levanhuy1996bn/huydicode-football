// Phase 26A: thế giới bóng đá — 18 nước × 2 hạng × 20 CLB (720 CLB).
//
// Nguồn: kiến thức của trợ lý tới mùa 2025-26 (không tra cứu được web khi làm).
// Danh sách có thể lệch với thực tế ở các đội lên / xuống hạng hè 2026 và
// chuyển nhượng hè 2026. Giải nào ngoài đời có số đội khác 20 thì lấy 20 đội
// tiêu biểu (thêm đội từ hạng dưới). Dòng có "?" ở cuối là CLB tôi chưa chắc.
//
// Mỗi dòng CLB: Tên | VIẾT TẮT | màu chính | màu phụ | ngôi sao
//   ngôi sao (chỉ ở 18 giải hạng cao nhất): "Tên:VỊ TRÍ:OVR; ..." — tên thật,
//   OVR là ước lượng của trợ lý (không phải chỉ số EA).
// CLB xếp từ mạnh tới yếu (dùng để tính sức mạnh trong khoảng của giải).
// Manchester United có id cố định 'blue' (đội người chơi, xem world.js).

export const WORLD_COUNTRIES = [
    {
        id: 'eng', name: 'England', nationality: 'England', rank: 1,
        top: { id: 'eng1', name: 'Premier League' },
        second: { id: 'eng2', name: 'EFL Championship' },
        topClubs: `
Manchester City|MCI|#6cabdd|#1c2c5b|Erling Haaland:ST:91;Rodri:CDM:89;Rúben Dias:CB:87;Phil Foden:CAM:85;Rayan Cherki:CAM:82
Arsenal|ARS|#db0007|#ffffff|Bukayo Saka:RW:88;William Saliba:CB:88;Martin Ødegaard:CAM:87;Declan Rice:CM:87;Viktor Gyökeres:ST:86
Liverpool|LIV|#c8102e|#f6eb61|Mohamed Salah:RW:89;Virgil van Dijk:CB:89;Alisson:GK:89;Florian Wirtz:CAM:88;Alexander Isak:ST:87
Chelsea|CHE|#034694|#ffffff|Cole Palmer:CAM:87;Moisés Caicedo:CDM:86;Enzo Fernández:CM:84;Reece James:RB:83
Manchester United|MUN|#da291c|#ffffff|Bruno Fernandes:CAM:86;Bryan Mbeumo:RW:83;Lisandro Martínez:CB:83;Matheus Cunha:ST:82;Benjamin Šeško:ST:81
Tottenham Hotspur|TOT|#f5f5f5|#132257|Cristian Romero:CB:85;Xavi Simons:CAM:84;Micky van de Ven:CB:83;Mohammed Kudus:RW:82
Newcastle United|NEW|#121212|#ffffff|Bruno Guimarães:CM:86;Sandro Tonali:CM:84;Anthony Gordon:LW:83;Nick Pope:GK:83
Aston Villa|AVL|#670e36|#95bfe5|Emiliano Martínez:GK:86;Ollie Watkins:ST:84;Youri Tielemans:CM:83;Morgan Rogers:CAM:82
Nottingham Forest|NFO|#dd0000|#ffffff|Morgan Gibbs-White:CAM:82;Murillo:CB:82;Elliot Anderson:CM:81;Chris Wood:ST:80
Crystal Palace|CRY|#1b458f|#c4122e|Marc Guéhi:CB:83;Jean-Philippe Mateta:ST:81;Adam Wharton:CM:80;Ismaïla Sarr:RW:80
Brighton & Hove Albion|BHA|#0057b8|#ffffff|Kaoru Mitoma:LW:81;Carlos Baleba:CDM:80;Bart Verbruggen:GK:79
West Ham United|WHU|#7a263a|#8fc6e8|Jarrod Bowen:RW:82;Lucas Paquetá:CAM:81;Alphonse Areola:GK:78
AFC Bournemouth|BOU|#da291c|#111111|Antoine Semenyo:RW:80;Evanilson:ST:79;Marcos Senesi:CB:78
Brentford|BRE|#e30613|#ffffff|Igor Thiago:ST:79;Mikkel Damsgaard:CAM:79;Nathan Collins:CB:78
Everton|EVE|#003399|#ffffff|Jordan Pickford:GK:83;Jack Grealish:LW:81;Iliman Ndiaye:LW:79
Fulham|FUL|#f5f5f5|#111111|Antonee Robinson:LB:80;Raúl Jiménez:ST:78;Alex Iwobi:RW:78
Wolverhampton Wanderers|WOL|#fdb913|#231f20|João Gomes:CM:79;Jørgen Strand Larsen:ST:79
Sunderland|SUN|#eb172b|#ffffff|Granit Xhaka:CM:82;Enzo Le Fée:CM:77;Robin Roefs:GK:76
Leeds United|LEE|#ffffff|#1d428a|Ethan Ampadu:CDM:76;Jayden Bogle:RB:75;Lukas Nmecha:ST:75
Burnley|BUR|#6c1d45|#99d6ea|Kyle Walker:RB:79;Martin Dúbravka:GK:77;Zian Flemming:CAM:75`,
        secondClubs: `
Leicester City|LEI|#003090|#fdbe11
Southampton|SOU|#d71920|#ffffff
Ipswich Town|IPS|#0044a9|#ffffff
Coventry City|COV|#59cbe8|#ffffff
Middlesbrough|MID|#e11b22|#ffffff
Sheffield United|SHU|#ee2737|#ffffff
Norwich City|NOR|#fff200|#00a650
West Bromwich Albion|WBA|#122f67|#ffffff
Watford|WAT|#fbee23|#ed2127
Hull City|HUL|#f5a12d|#000000
Stoke City|STK|#e03a3e|#ffffff
Swansea City|SWA|#ffffff|#000000
Bristol City|BRC|#e21b23|#ffffff
Millwall|MIL|#001d5e|#ffffff
Derby County|DER|#ffffff|#000000
Blackburn Rovers|BLB|#009ee0|#ffffff
Birmingham City|BIR|#0000ff|#ffffff
Wrexham|WRX|#e2231a|#ffffff
Queens Park Rangers|QPR|#1d5ba4|#ffffff
Portsmouth|POR|#001489|#ffffff`,
    },
    {
        id: 'ita', name: 'Italy', nationality: 'Italy', rank: 2,
        top: { id: 'ita1', name: 'Serie A' },
        second: { id: 'ita2', name: 'Serie B' },
        topClubs: `
Inter|INT|#0068a8|#000000|Lautaro Martínez:ST:88;Nicolò Barella:CM:87;Alessandro Bastoni:CB:86;Hakan Çalhanoğlu:CDM:85;Marcus Thuram:ST:84
Napoli|NAP|#12a0d7|#ffffff|Kevin De Bruyne:CAM:87;Scott McTominay:CM:85;Alessandro Buongiorno:CB:83;Romelu Lukaku:ST:82;Rasmus Højlund:ST:80
Juventus|JUV|#ffffff|#000000|Gleison Bremer:CB:84;Dušan Vlahović:ST:83;Kenan Yıldız:LW:83;Jonathan David:ST:83;Manuel Locatelli:CDM:82
AC Milan|MIL|#fb090b|#000000|Mike Maignan:GK:87;Rafael Leão:LW:85;Luka Modrić:CM:84;Christian Pulisic:RW:84
Atalanta|ATA|#1e71b8|#000000|Ademola Lookman:LW:84;Charles De Ketelaere:CAM:83;Éderson:CM:82
Roma|ROM|#8e1f2f|#f0bc42|Paulo Dybala:CAM:82;Mile Svilar:GK:82;Evan Ndicka:CB:81;Lorenzo Pellegrini:CAM:80
Lazio|LAZ|#87d8f7|#ffffff|Mattia Zaccagni:LW:82;Alessio Romagnoli:CB:80;Ivan Provedel:GK:80
Fiorentina|FIO|#482e92|#ffffff|David de Gea:GK:84;Moise Kean:ST:82;Albert Guðmundsson:CAM:79
Bologna|BOL|#a21c26|#1a2f48|Riccardo Orsolini:RW:81;Remo Freuler:CM:79;Santiago Castro:ST:78
Como|COM|#1d3f8f|#ffffff|Nico Paz:CAM:81;Álvaro Morata:ST:78
Torino|TOR|#881f19|#ffffff|Duván Zapata:ST:78;Che Adams:ST:77
Udinese|UDI|#ffffff|#000000|Jesper Karlström:CM:75;Keinan Davis:ST:75
Genoa|GEN|#a6192e|#002d62|Ruslan Malinovskyi:CAM:76;Junior Messias:RW:75
Sassuolo|SAS|#00a752|#000000|Domenico Berardi:RW:79;Armand Laurienté:LW:77
Cagliari|CAG|#a01d36|#002350|Gianluca Gaetano:CAM:75;Sebastiano Esposito:ST:74
Parma|PAR|#ffd200|#1b3d8f|Zion Suzuki:GK:76;Adrián Bernabé:CM:75
Lecce|LEC|#ffd200|#e2001a|Wladimiro Falcone:GK:77
Hellas Verona|VER|#002f6c|#ffd200
Cremonese|CRE|#e2001a|#9c9c9c|Jamie Vardy:ST:77;Federico Baschirotto:CB:74
Pisa|PIS|#00205b|#000000|M'Bala Nzola:ST:74`,
        secondClubs: `
Monza|MON|#e2001a|#ffffff
Venezia|VEN|#f26522|#00703c
Empoli|EMP|#005aa7|#ffffff
Palermo|PAL|#f5a9c4|#000000
Sampdoria|SAM|#1b5aa6|#ffffff
Bari|BAR|#ffffff|#e2001a
Spezia|SPE|#ffffff|#000000
Cesena|CES|#ffffff|#000000
Catanzaro|CTZ|#ffd200|#e2001a
Modena|MOD|#ffd200|#003399
Frosinone|FRO|#ffd200|#0039a6
Padova|PAD|#ffffff|#e2001a
Pescara|PES|#ffffff|#3fa7e1
Reggiana|REG|#8e1f2f|#ffffff
Südtirol|SUD|#ffffff|#e2001a
Juve Stabia|JST|#ffd200|#003399
Carrarese|CAR|#ffd200|#003399
Avellino|AVE|#00843d|#ffffff
Virtus Entella|ENT|#3f8fd2|#ffffff
Mantova|MAN|#e2001a|#ffffff`,
    },
    {
        id: 'esp', name: 'Spain', nationality: 'Spain', rank: 3,
        top: { id: 'esp1', name: 'La Liga' },
        second: { id: 'esp2', name: 'Segunda División' },
        topClubs: `
Real Madrid|RMA|#ffffff|#febe10|Kylian Mbappé:ST:91;Vinícius Júnior:LW:89;Jude Bellingham:CAM:89;Thibaut Courtois:GK:89;Federico Valverde:CM:88
Barcelona|BAR|#a50044|#004d98|Lamine Yamal:RW:89;Raphinha:LW:88;Pedri:CM:88;Robert Lewandowski:ST:86;Frenkie de Jong:CM:85
Atlético Madrid|ATM|#cb3524|#ffffff|Julián Álvarez:ST:87;Jan Oblak:GK:87;Antoine Griezmann:ST:84;Koke:CM:81
Athletic Club|ATH|#ee2523|#ffffff|Nico Williams:LW:85;Unai Simón:GK:84;Iñaki Williams:RW:80
Villarreal|VIL|#ffe667|#005187|Gerard Moreno:ST:80;Ayoze Pérez:ST:80;Pape Gueye:CM:79
Real Sociedad|RSO|#0067b1|#ffffff|Mikel Oyarzabal:ST:82;Takefusa Kubo:RW:82;Álex Remiro:GK:82
Real Betis|BET|#00954c|#ffffff|Isco:CAM:80;Antony:RW:80;Giovani Lo Celso:CM:79
Girona|GIR|#cd2534|#ffffff|Viktor Tsygankov:RW:79;Paulo Gazzaniga:GK:78
Celta Vigo|CEL|#8ac3ee|#ffffff|Iago Aspas:ST:79;Borja Iglesias:ST:78
Sevilla|SEV|#ffffff|#d4111e|Rubén Vargas:LW:77;Isaac Romero:ST:75
Valencia|VAL|#ffffff|#ee3524|José Gayà:LB:78;Hugo Duro:ST:77
Osasuna|OSA|#d91a21|#0a346f|Ante Budimir:ST:79
Rayo Vallecano|RAY|#ffffff|#e53027|Isi Palazón:RW:78
Mallorca|MLL|#e20613|#000000|Vedat Muriqi:ST:78
Getafe|GET|#005999|#ffffff|Mauro Arambarri:CDM:77
Espanyol|ESP|#007fc8|#ffffff|Javi Puado:ST:76
Deportivo Alavés|ALA|#0761af|#ffffff|Toni Martínez:ST:75
Elche|ELC|#ffffff|#05642c|Rafa Mir:ST:75
Levante|LEV|#003e7e|#b4053f|Iván Romero:ST:74
Real Oviedo|OVI|#0033a0|#ffffff|Santi Cazorla:CM:75;Salomón Rondón:ST:75`,
        secondClubs: `
Las Palmas|LPA|#ffe400|#0055a5
Leganés|LEG|#ffffff|#0047ab
Real Valladolid|VLL|#921b88|#ffffff
Almería|ALM|#ee1c25|#ffffff
Sporting Gijón|SPG|#e30613|#ffffff
Racing Santander|RAC|#ffffff|#00843d
Deportivo La Coruña|DEP|#ffffff|#0055a4
Real Zaragoza|ZAR|#ffffff|#0047ab
Granada|GRA|#e2001a|#ffffff
Cádiz|CAD|#ffe400|#0047ab
Málaga|MAL|#ffffff|#0072ce
Eibar|EIB|#a50044|#004d98
Huesca|HUE|#0047ab|#a50044
Mirandés|MIR|#e2001a|#000000
Albacete|ALB|#ffffff|#000000
Burgos|BUR|#ffffff|#000000
Castellón|CAS|#000000|#ffffff
Córdoba|COR|#ffffff|#00843d
Andorra|AND|#003da5|#ffd200
Cultural Leonesa|CUL|#ffffff|#000000`,
    },
    {
        id: 'ger', name: 'Germany', nationality: 'Germany', rank: 4,
        top: { id: 'ger1', name: 'Bundesliga' },
        second: { id: 'ger2', name: '2. Bundesliga' },
        topClubs: `
Bayern Munich|FCB|#dc052d|#ffffff|Harry Kane:ST:90;Jamal Musiala:CAM:88;Joshua Kimmich:CDM:87;Michael Olise:RW:87;Manuel Neuer:GK:86
Borussia Dortmund|BVB|#fde100|#000000|Gregor Kobel:GK:86;Serhou Guirassy:ST:85;Nico Schlotterbeck:CB:84;Julian Brandt:CAM:82
Bayer Leverkusen|B04|#e32221|#000000|Alejandro Grimaldo:LB:84;Patrik Schick:ST:82;Exequiel Palacios:CM:82
RB Leipzig|RBL|#ffffff|#dd0741|Willi Orbán:CB:81;David Raum:LB:80;Christoph Baumgartner:CAM:79
VfB Stuttgart|VFB|#ffffff|#e32219|Angelo Stiller:CM:82;Alexander Nübel:GK:82;Deniz Undav:ST:80
Eintracht Frankfurt|SGE|#e1000f|#000000|Jonathan Burkardt:ST:80;Mario Götze:CAM:78
SC Freiburg|SCF|#e2001a|#000000|Vincenzo Grifo:LW:79;Christian Günter:LB:77
VfL Wolfsburg|WOB|#65b32e|#ffffff|Mohamed Amoura:ST:79;Maximilian Arnold:CM:79
Borussia Mönchengladbach|BMG|#ffffff|#000000|Tim Kleindienst:ST:79;Rocco Reitz:CM:77
Mainz 05|M05|#c3141e|#ffffff|Nadiem Amiri:CM:79;Robin Zentner:GK:77
TSG Hoffenheim|TSG|#1c63b7|#ffffff|Oliver Baumann:GK:80;Andrej Kramarić:ST:79
Werder Bremen|SVW|#1d9053|#ffffff|Romano Schmid:CAM:78;Mitchell Weiser:RB:77
Union Berlin|FCU|#eb1923|#ffffff|Frederik Rønnow:GK:78;Rani Khedira:CDM:76
FC Augsburg|FCA|#ba3733|#46714d|Finn Dahmen:GK:76
Hamburger SV|HSV|#ffffff|#0a3f86|Jean-Luc Dompé:LW:74
1. FC Köln|KOE|#ffffff|#ed1c24|Marvin Schwäbe:GK:74
FC St. Pauli|STP|#624839|#ffffff|Jackson Irvine:CM:74
1. FC Heidenheim|HDH|#e2001a|#003b79|Marvin Pieringer:ST:73
Schalke 04|S04|#004d9d|#ffffff
Hertha BSC|BSC|#005ca9|#ffffff`,
        secondClubs: `
Holstein Kiel|KSV|#003da5|#ffffff
VfL Bochum|BOC|#005ca9|#ffffff
Darmstadt 98|D98|#004e9e|#ffffff
Hannover 96|H96|#c00d0e|#000000
1. FC Kaiserslautern|FCK|#e1001a|#ffffff
1. FC Nürnberg|FCN|#a6192e|#000000
Fortuna Düsseldorf|F95|#da251d|#ffffff
Karlsruher SC|KSC|#004b9c|#ffffff
SC Paderborn|SCP|#005ca9|#000000
1. FC Magdeburg|FCM|#0055a4|#ffffff
SV Elversberg|SVE|#000000|#ffffff
Greuther Fürth|SGF|#009f4d|#ffffff
Preußen Münster|PRM|#007a3d|#000000
Eintracht Braunschweig|EBS|#ffd700|#004b9c
Arminia Bielefeld|DSC|#005ca9|#000000
Dynamo Dresden|SGD|#ffd200|#000000
1860 München|TSV|#62a6e3|#ffffff
Hansa Rostock|FCH|#005ca9|#ffffff
Energie Cottbus|FCE|#e30613|#ffffff
SSV Ulm|ULM|#000000|#ffffff`,
    },
    {
        id: 'fra', name: 'France', nationality: 'France', rank: 5,
        top: { id: 'fra1', name: 'Ligue 1' },
        second: { id: 'fra2', name: 'Ligue 2' },
        topClubs: `
Paris Saint-Germain|PSG|#004170|#da291c|Ousmane Dembélé:RW:90;Achraf Hakimi:RB:88;Vitinha:CM:88;Khvicha Kvaratskhelia:LW:87;Marquinhos:CB:86
Olympique de Marseille|OM|#2faee0|#ffffff|Mason Greenwood:RW:83;Adrien Rabiot:CM:82;Geronimo Rulli:GK:82;Pierre-Emerick Aubameyang:ST:80
AS Monaco|ASM|#e51b22|#ffffff|Denis Zakaria:CDM:81;Takumi Minamino:CAM:80;Paul Pogba:CM:78
LOSC Lille|LOS|#e01e13|#1b2a4d|Hákon Arnar Haraldsson:CAM:80;Berke Özer:GK:78;Olivier Giroud:ST:77
Olympique Lyonnais|OL|#ffffff|#1c2c5b|Corentin Tolisso:CM:79;Malick Fofana:LW:79
OGC Nice|NIC|#e2001a|#000000|Jonathan Clauss:RB:79;Terem Moffi:ST:77
RC Strasbourg|RCS|#009fe3|#ffffff|Emanuel Emegha:ST:77;Joaquín Panichelli:ST:75
RC Lens|RCL|#ffd200|#e2001a|Florian Thauvin:RW:78;Robin Risser:GK:75
Stade Rennais|SRF|#e2001a|#000000|Brice Samba:GK:81;Ludovic Blas:CAM:77
Stade Brestois|SB29|#e2001a|#ffffff|Romain Del Castillo:RW:77
Toulouse FC|TFC|#5a2d82|#ffffff|Frank Magri:ST:75
FC Nantes|FCN|#fce500|#00843d|Anthony Lopes:GK:77
AJ Auxerre|AJA|#ffffff|#0047ab|Lassine Sinayoko:ST:75
Angers SCO|SCO|#ffffff|#000000|Himad Abdelli:CM:75
Paris FC|PFC|#002f6c|#ffffff|Ilan Kebbal:CAM:75
Le Havre AC|HAC|#7ac1e6|#002f6c
FC Lorient|FCL|#f37021|#000000
FC Metz|FCM|#8e1f2f|#ffffff
AS Saint-Étienne|ASSE|#00843d|#ffffff
Montpellier HSC|MHSC|#003da5|#f37021`,
        secondClubs: `
Stade de Reims|SDR|#e2001a|#ffffff
Le Mans FC|LMFC|#e2001a|#ffd200
EA Guingamp|EAG|#e2001a|#000000
ES Troyes AC|ESTAC|#0055a4|#ffffff
FC Annecy|FCA|#e2001a|#ffffff
Stade Lavallois|LAV|#f37021|#000000
Pau FC|PAU|#ffd200|#003da5
Rodez AF|RAF|#e2001a|#ffd200
Red Star FC|RSFC|#00843d|#ffffff
Amiens SC|ASC|#ffffff|#000000
Grenoble Foot 38|GF38|#0055a4|#ffffff
SC Bastia|SCB|#0055a4|#ffffff
Clermont Foot|CF63|#a6192e|#0055a4
USL Dunkerque|USLD|#0055a4|#ffffff
AS Nancy Lorraine|ASNL|#ffffff|#e2001a
US Boulogne|USBCO|#e2001a|#000000
Stade Malherbe Caen|SMC|#0055a4|#e2001a
Girondins de Bordeaux|FCGB|#002f6c|#ffffff
FC Sochaux|FCSM|#ffd200|#003da5
AC Ajaccio|ACA|#e2001a|#ffffff`,
    },
    {
        id: 'bel', name: 'Belgium', nationality: 'Belgium', rank: 6,
        top: { id: 'bel1', name: 'Belgian Pro League' },
        second: { id: 'bel2', name: 'Challenger Pro League' },
        topClubs: `
Club Brugge|CLU|#0066b2|#000000|Hans Vanaken:CM:79;Christos Tzolis:LW:78;Simon Mignolet:GK:77
Union Saint-Gilloise|USG|#ffd200|#003399
RSC Anderlecht|AND|#5a2d82|#ffffff|Yari Verschaeren:CAM:75
KRC Genk|GNK|#0055a4|#ffffff|Hendrik Van Crombrugge:GK:75
Royal Antwerp|ANT|#e2001a|#ffffff
KAA Gent|GNT|#0055a4|#ffffff
Standard Liège|STL|#e2001a|#ffffff
Cercle Brugge|CER|#00843d|#000000
Sporting Charleroi|CHA|#000000|#ffffff
KV Mechelen|KVM|#ffd200|#e2001a
KVC Westerlo|WES|#ffd200|#0055a4
OH Leuven|OHL|#ffffff|#e2001a
Sint-Truidense VV|STV|#ffd200|#0055a4
FCV Dender|DEN|#e2001a|#ffffff
SV Zulte Waregem|ZWA|#e2001a|#00843d
RAAL La Louvière|RAAL|#00843d|#ffffff
KV Kortrijk|KVK|#e2001a|#ffffff
Beerschot|BEE|#5a2d82|#ffffff
Lommel SK|LOM|#00843d|#ffffff
RWD Molenbeek|RWDM|#e2001a|#000000`,
        secondClubs: `
KAS Eupen|EUP|#ffffff|#000000
RFC Seraing|SER|#e2001a|#000000
KSC Lokeren|LOK|#000000|#ffffff
Lierse SK|LIE|#ffd200|#000000
SK Beveren|BEV|#ffd200|#003399
Patro Eisden Maasmechelen|PAT|#0055a4|#ffffff
Francs Borains|FBO|#00843d|#ffffff
RFC Liège|RFCL|#e2001a|#0055a4
Club NXT|NXT|#0066b2|#000000
Jong Genk|JGK|#0055a4|#ffffff
RSCA Futures|RSCA|#5a2d82|#ffffff
Olympic Charleroi|OLC|#000000|#ffffff
RE Virton|VIR|#000000|#ffffff
KMSK Deinze|DEI|#000000|#ffffff
RFC Knokke|KNO|#e2001a|#ffffff
AFC Tubize|TUB|#e2001a|#0055a4
KSV Roeselare|ROE|#ffd200|#0055a4
Royal Excel Mouscron|MOU|#e2001a|#0055a4
KV Oostende|KVO|#e2001a|#ffd200
Royal Francs Borains B|RFB|#00843d|#000000?`,
    },
    {
        id: 'por', name: 'Portugal', nationality: 'Portugal', rank: 7,
        top: { id: 'por1', name: 'Primeira Liga' },
        second: { id: 'por2', name: 'Liga Portugal 2' },
        topClubs: `
Sporting CP|SCP|#008057|#ffffff|Morten Hjulmand:CDM:82;Pedro Gonçalves:CAM:81;Francisco Trincão:RW:81
SL Benfica|SLB|#e2001a|#ffffff|Vangelis Pavlidis:ST:82;Anatoliy Trubin:GK:82;Nicolás Otamendi:CB:81
FC Porto|FCP|#0055a4|#ffffff|Diogo Costa:GK:85;Alan Varela:CDM:80;Samu Aghehowa:ST:80
SC Braga|SCB|#e2001a|#ffffff|Ricardo Horta:LW:79
Vitória SC|VSC|#ffffff|#000000
FC Famalicão|FAM|#002f6c|#ffffff
Gil Vicente|GIL|#e2001a|#ffffff
Moreirense|MOR|#00843d|#ffffff
Rio Ave|RAV|#00843d|#ffffff
Estoril Praia|EST|#ffd200|#0055a4
Casa Pia|CPA|#000000|#ffffff
FC Arouca|ARO|#ffd200|#003da5
Santa Clara|SCL|#e2001a|#ffffff
CD Nacional|NAC|#000000|#ffffff
Estrela da Amadora|EAM|#e2001a|#00843d
AVS|AVS|#e2001a|#000000
FC Alverca|ALV|#e2001a|#ffffff
CD Tondela|TON|#00843d|#ffd200
Boavista|BOA|#000000|#ffffff
SC Farense|FAR|#000000|#ffffff`,
        secondClubs: `
GD Chaves|CHV|#e2001a|#0055a4
CS Marítimo|MAR|#00843d|#e2001a
Académico de Viseu|AVI|#000000|#ffffff
Leixões SC|LEI|#e2001a|#ffffff
CD Feirense|FEI|#0055a4|#ffffff
FC Penafiel|PEN|#e2001a|#000000
SCU Torreense|TOR|#000000|#ffffff
Benfica B|SLBB|#e2001a|#ffffff
FC Porto B|FCPB|#0055a4|#ffffff
FC Paços de Ferreira|PAC|#ffd200|#00843d
FC Vizela|VIZ|#0055a4|#ffffff
Portimonense|PTM|#000000|#ffffff
UD Oliveirense|OLI|#e2001a|#000000
União de Leiria|UDL|#e2001a|#ffffff
FC Felgueiras|FEL|#e2001a|#0055a4
Sporting CP B|SCPB|#008057|#ffffff
Lusitânia Lourosa|LUS|#0055a4|#ffffff
CF Os Belenenses|BEL|#0055a4|#ffffff
Académica de Coimbra|ACA|#000000|#ffffff
Varzim SC|VAR|#e2001a|#ffffff`,
    },
    {
        id: 'bra', name: 'Brazil', nationality: 'Brazil', rank: 8,
        top: { id: 'bra1', name: 'Brasileirão Série A' },
        second: { id: 'bra2', name: 'Brasileirão Série B' },
        topClubs: `
Flamengo|FLA|#e2001a|#000000|Giorgian de Arrascaeta:CAM:82;Pedro:ST:80;Jorginho:CM:78
Palmeiras|PAL|#00843d|#ffffff|Vitor Roque:ST:79;Gustavo Gómez:CB:79;Raphael Veiga:CAM:79
Botafogo|BOT|#000000|#ffffff|John:GK:77
Cruzeiro|CRU|#0055a4|#ffffff|Matheus Pereira:CAM:79;Gabriel Barbosa:ST:76
Fluminense|FLU|#8e1f2f|#00843d|Thiago Silva:CB:76;Germán Cano:ST:76
São Paulo|SAO|#ffffff|#e2001a|Lucas Moura:RW:78;Oscar:CAM:76
Corinthians|COR|#ffffff|#000000|Memphis Depay:ST:80;Rodrigo Garro:CAM:78
Atlético Mineiro|CAM|#000000|#ffffff|Hulk:ST:78;Gustavo Scarpa:CAM:77
Internacional|INT|#e2001a|#ffffff|Alan Patrick:CAM:77;Enner Valencia:ST:76
Grêmio|GRE|#0d80bf|#000000
Santos|SAN|#ffffff|#000000|Neymar:LW:82
Bahia|BAH|#0055a4|#e2001a|Everton Ribeiro:CAM:76
Vasco da Gama|VAS|#000000|#ffffff|Philippe Coutinho:CAM:77;Pablo Vegetti:ST:76
Red Bull Bragantino|RBB|#ffffff|#e2001a
Mirassol|MIR|#ffd200|#00843d
Fortaleza|FOR|#e2001a|#0055a4
Ceará|CEA|#000000|#ffffff
Vitória|VIT|#e2001a|#000000
Juventude|JUV|#00843d|#ffffff
Sport Recife|SPT|#e2001a|#000000`,
        secondClubs: `
Coritiba|CFC|#00843d|#ffffff
Athletico Paranaense|CAP|#e2001a|#000000
Chapecoense|CHA|#00843d|#ffffff
Remo|REM|#003da5|#ffffff
Goiás|GOI|#00843d|#ffffff
Novorizontino|NOV|#ffd200|#000000
Criciúma|CRI|#ffd200|#000000
CRB|CRB|#e2001a|#ffffff
Avaí|AVA|#0055a4|#ffffff
Cuiabá|CUI|#ffd200|#00843d
Operário Ferroviário|OPE|#000000|#ffffff
Atlético Goianiense|ACG|#e2001a|#000000
Vila Nova|VIL|#e2001a|#ffffff
América Mineiro|AME|#00843d|#000000
Botafogo-SP|BSP|#e2001a|#ffffff
Athletic Club (MG)|ATH|#000000|#ffffff
Ferroviária|FER|#8e1f2f|#ffffff
Amazonas FC|AMA|#ffd200|#000000
Volta Redonda|VRE|#ffd200|#000000
Paysandu|PAY|#0055a4|#ffffff`,
    },
    {
        id: 'ned', name: 'Netherlands', nationality: 'Netherlands', rank: 9,
        top: { id: 'ned1', name: 'Eredivisie' },
        second: { id: 'ned2', name: 'Eerste Divisie' },
        topClubs: `
PSV Eindhoven|PSV|#e2001a|#ffffff|Ivan Perišić:LW:80;Joey Veerman:CM:79;Guus Til:CAM:78
Feyenoord|FEY|#e2001a|#ffffff|Anis Hadj Moussa:RW:78;Quinten Timber:CM:78;Ayase Ueda:ST:76
Ajax|AJA|#ffffff|#d2122e|Kenneth Taylor:CM:78;Wout Weghorst:ST:76;Steven Berghuis:RW:76
AZ Alkmaar|AZ|#e2001a|#ffffff|Troy Parrott:ST:77;Sven Mijnans:CAM:76
FC Twente|TWE|#e2001a|#ffffff|Sem Steijn:CAM:76
FC Utrecht|UTR|#e2001a|#ffffff
NEC Nijmegen|NEC|#e2001a|#00843d
Go Ahead Eagles|GAE|#ffd200|#e2001a
SC Heerenveen|HEE|#0055a4|#ffffff
Sparta Rotterdam|SPA|#e2001a|#ffffff
FC Groningen|GRO|#00843d|#ffffff
Fortuna Sittard|FOR|#ffd200|#00843d
PEC Zwolle|PEC|#0055a4|#ffffff
Heracles Almelo|HER|#000000|#ffffff
NAC Breda|NAC|#ffd200|#000000
Excelsior|EXC|#e2001a|#000000
FC Volendam|VOL|#f37021|#ffffff
Telstar|TEL|#ffffff|#e2001a
Willem II|WIL|#e2001a|#0055a4
Almere City|ALM|#e2001a|#000000`,
        secondClubs: `
RKC Waalwijk|RKC|#ffd200|#0055a4
ADO Den Haag|ADO|#ffd200|#00843d
Vitesse|VIT|#ffd200|#000000
De Graafschap|GRA|#0055a4|#ffffff
Roda JC|ROD|#ffd200|#000000
Cambuur|CAM|#ffd200|#0055a4
FC Emmen|EMM|#e2001a|#ffffff
FC Dordrecht|DOR|#e2001a|#ffffff
FC Den Bosch|DBO|#e2001a|#ffffff
VVV-Venlo|VVV|#ffd200|#000000
Helmond Sport|HEL|#e2001a|#000000
TOP Oss|TOP|#e2001a|#ffffff
MVV Maastricht|MVV|#e2001a|#ffffff
FC Eindhoven|FCE|#0055a4|#ffffff
Jong PSV|JPSV|#e2001a|#ffffff
Jong Ajax|JAJA|#ffffff|#d2122e
Jong AZ|JAZ|#e2001a|#ffffff
Jong FC Utrecht|JUTR|#e2001a|#ffffff
SC Cambuur Reserves|CAMB|#ffd200|#0055a4?
Achilles '29|ACH|#e2001a|#ffffff?`,
    },
    {
        id: 'arg', name: 'Argentina', nationality: 'Argentina', rank: 10,
        top: { id: 'arg1', name: 'Liga Profesional' },
        second: { id: 'arg2', name: 'Primera Nacional' },
        topClubs: `
River Plate|RIV|#ffffff|#e2001a|Juan Fernando Quintero:CAM:77;Gonzalo Montiel:RB:77;Franco Armani:GK:76
Boca Juniors|BOC|#003da5|#ffd200|Leandro Paredes:CM:79;Edinson Cavani:ST:75
Racing Club|RAC|#7ac1e6|#ffffff|Adrián Martínez:ST:76
Independiente|IND|#e2001a|#ffffff
Vélez Sarsfield|VEL|#ffffff|#003da5
Estudiantes|EST|#e2001a|#ffffff|Guido Carrillo:ST:74
Talleres|TAL|#003da5|#ffffff
Rosario Central|ROS|#003da5|#ffd200|Ángel Di María:RW:79
San Lorenzo|SLO|#003da5|#e2001a
Argentinos Juniors|ARG|#e2001a|#ffffff
Lanús|LAN|#8e1f2f|#ffffff
Huracán|HUR|#ffffff|#e2001a
Newell's Old Boys|NOB|#e2001a|#000000
Defensa y Justicia|DYJ|#00843d|#ffd200
Godoy Cruz|GOD|#003da5|#ffffff
Belgrano|BEL|#7ac1e6|#ffffff
Tigre|TIG|#003da5|#e2001a
Platense|PLA|#8e5a2b|#ffffff
Banfield|BAN|#00843d|#ffffff
Unión de Santa Fe|UNI|#e2001a|#ffffff`,
        secondClubs: `
San Martín de Tucumán|SMT|#e2001a|#ffffff
Quilmes|QUI|#ffffff|#003da5
Chacarita Juniors|CHA|#e2001a|#000000
Ferro Carril Oeste|FER|#00843d|#ffffff
All Boys|ALL|#ffffff|#000000
Atlanta|ATL|#003da5|#ffd200
Almirante Brown|ALM|#ffd200|#000000
Gimnasia de Jujuy|GJU|#003da5|#ffffff
Deportivo Morón|MOR|#e2001a|#ffffff
Estudiantes de Río Cuarto|ERC|#003da5|#ffffff
Colón|COL|#e2001a|#000000
Chaco For Ever|CFE|#000000|#ffffff
Temperley|TEM|#7ac1e6|#ffffff
Tristán Suárez|TRI|#e2001a|#ffffff
Agropecuario|AGR|#00843d|#ffffff
Defensores de Belgrano|DEF|#e2001a|#000000
Atlético Rafaela|RAF|#7ac1e6|#ffffff
Patronato|PAT|#e2001a|#000000
Mitre (SdE)|MIT|#ffd200|#000000
Nueva Chicago|NCH|#00843d|#000000`,
    },
    {
        id: 'usa', name: 'USA / Canada', nationality: 'USA', rank: 11,
        top: { id: 'usa1', name: 'Major League Soccer' },
        second: { id: 'usa2', name: 'USL Championship' },
        topClubs: `
Inter Miami|MIA|#f7b5cd|#231f20|Lionel Messi:RW:87;Rodrigo De Paul:CM:80;Luis Suárez:ST:77;Sergio Busquets:CDM:77
LAFC|LAFC|#000000|#c39e6d|Son Heung-min:LW:84;Denis Bouanga:LW:79;Hugo Lloris:GK:79
LA Galaxy|LAG|#ffffff|#00245d|Riqui Puig:CM:78;Gabriel Pec:RW:76
Vancouver Whitecaps|VAN|#ffffff|#00245d|Thomas Müller:CAM:80
FC Cincinnati|CIN|#003087|#fe5000|Evander:CAM:78
Columbus Crew|CLB|#fedd00|#000000|Diego Rossi:LW:76
San Diego FC|SD|#000000|#c8a96e|Hirving Lozano:RW:77;Anders Dreyer:RW:76
Nashville SC|NSH|#ece83a|#1f1646|Hany Mukhtar:CAM:77;Sam Surridge:ST:75
Philadelphia Union|PHI|#071b2c|#b19b69|Kai Wagner:LB:75
Seattle Sounders|SEA|#5d9741|#005595|Jordan Morris:ST:74
Orlando City|ORL|#633492|#ffffff|Martín Ojeda:CAM:76;Luis Muriel:ST:74
Atlanta United|ATL|#80000a|#000000|Miguel Almirón:RW:75
New York City FC|NYC|#6cace4|#041e42
New York Red Bulls|NYRB|#ffffff|#ed1e36
Toronto FC|TOR|#b81137|#ffffff|Federico Bernardeschi:RW:76
Portland Timbers|POR|#00482b|#d69a00
Real Salt Lake|RSL|#b30838|#013a81
Minnesota United|MIN|#8cd2f4|#231f20
Austin FC|ATX|#00b140|#000000
CF Montréal|MTL|#000000|#0033a1`,
        secondClubs: `
Louisville City|LOU|#5a2d82|#ffd200
Charleston Battery|CHS|#ffd200|#000000
Tampa Bay Rowdies|TBR|#00843d|#ffd200
Sacramento Republic|SAC|#a6192e|#ffd200
Phoenix Rising|PHX|#e2001a|#000000
New Mexico United|NMU|#ffd200|#000000
San Antonio FC|SA|#000000|#e2001a
Colorado Springs Switchbacks|COS|#003da5|#ffd200
Indy Eleven|IND|#003da5|#e2001a
Pittsburgh Riverhounds|PIT|#ffd200|#000000
Orange County SC|OCSC|#f37021|#000000
North Carolina FC|NCFC|#003da5|#e2001a
Detroit City FC|DET|#8e1f2f|#ffd200
Birmingham Legion|BHM|#000000|#ffd200
El Paso Locomotive|ELP|#003da5|#f37021
Hartford Athletic|HFD|#00843d|#003da5
Miami FC|MFC|#0055a4|#ffffff
Las Vegas Lights|LV|#000000|#f7b5cd
Monterey Bay FC|MB|#003da5|#ffffff
Oakland Roots|OAK|#00843d|#ffd200`,
    },
    {
        id: 'mex', name: 'Mexico', nationality: 'Mexico', rank: 12,
        top: { id: 'mex1', name: 'Liga MX' },
        second: { id: 'mex2', name: 'Liga de Expansión MX' },
        topClubs: `
Club América|AME|#ffd200|#003da5|Álvaro Fidalgo:CM:77;Henry Martín:ST:75
CF Monterrey|MTY|#003da5|#ffffff|Sergio Ramos:CB:79;Sergio Canales:CAM:78;Lucas Ocampos:RW:77;Anthony Martial:ST:76
Tigres UANL|TIG|#ffd200|#003da5|Ángel Correa:ST:78;Nahuel Guzmán:GK:76;André-Pierre Gignac:ST:74
Cruz Azul|CAZ|#003da5|#ffffff|Kevin Mier:GK:76
Toluca|TOL|#e2001a|#ffffff|Paulinho:ST:77;Alexis Vega:LW:76
Guadalajara|GDL|#e2001a|#003da5|Roberto Alvarado:RW:75
Pumas UNAM|PUM|#002f6c|#d4af37
Pachuca|PAC|#003da5|#ffffff
Club León|LEO|#00843d|#ffffff
Santos Laguna|SAN|#00843d|#ffffff
Atlas|ATS|#e2001a|#000000
Tijuana|TIJ|#e2001a|#000000
Necaxa|NEC|#e2001a|#ffffff
Puebla|PUE|#ffffff|#003da5
Querétaro|QRO|#003da5|#000000
Mazatlán FC|MAZ|#5a2d82|#ffffff
FC Juárez|JUA|#00843d|#e2001a
Atlético San Luis|ASL|#e2001a|#003da5
Atlético Morelia|MOR|#ffd200|#e2001a
Atlante|ATL|#003da5|#e2001a`,
        secondClubs: `
Leones Negros UdeG|UDG|#000000|#ffd200
Celaya|CEL|#003da5|#ffffff
Mineros de Zacatecas|ZAC|#ffffff|#000000
Venados FC|VEN|#ffd200|#000000
Tepatitlán FC|TEP|#e2001a|#ffffff
Cancún FC|CUN|#7ac1e6|#003da5
Tampico Madero|TAM|#ffffff|#003da5
Dorados de Sinaloa|DOR|#00843d|#ffd200
Alebrijes de Oaxaca|OAX|#e2001a|#000000
Correcaminos UAT|UAT|#f37021|#003da5
Tlaxcala FC|TLX|#e2001a|#ffd200
Irapuato|IRA|#e2001a|#ffffff
Atlético La Paz|LPZ|#003da5|#ffffff
Alacranes de Durango|DUR|#e2001a|#000000
Tapatío|TAP|#e2001a|#ffffff
Cimarrones de Sonora|SON|#000000|#ffd200
Pumas Tabasco|PTA|#002f6c|#d4af37
Saltillo FC|SAL|#003da5|#ffffff
Zacatepec|ZAP|#00843d|#ffffff
Raya2 Expansión|RAY|#003da5|#ffffff`,
    },
    {
        id: 'jpn', name: 'Japan', nationality: 'Japan', rank: 13,
        top: { id: 'jpn1', name: 'J1 League' },
        second: { id: 'jpn2', name: 'J2 League' },
        topClubs: `
Vissel Kobe|KOB|#8e1f2f|#000000|Yoshinori Muto:ST:74
Kashima Antlers|KAS|#a6192e|#002f6c|Léo Ceará:ST:74;Yuma Suzuki:ST:73
Sanfrecce Hiroshima|HIR|#5a2d82|#ffffff
Kashiwa Reysol|KSW|#ffd200|#000000
Machida Zelvia|MAC|#003da5|#ffd200
Urawa Red Diamonds|URA|#e2001a|#000000
Kawasaki Frontale|KAW|#7ac1e6|#000000
Kyoto Sanga|KYO|#5a2d82|#ffffff
Gamba Osaka|GAM|#003da5|#000000
Cerezo Osaka|CER|#f7b5cd|#002f6c
FC Tokyo|TOK|#003da5|#e2001a
Yokohama F. Marinos|YFM|#003da5|#ffffff
Nagoya Grampus|NAG|#e2001a|#ffd200
Avispa Fukuoka|FUK|#002f6c|#ffffff
Shimizu S-Pulse|SHI|#f37021|#003da5
Fagiano Okayama|OKA|#8e1f2f|#002f6c
Tokyo Verdy|VER|#00843d|#ffffff
Shonan Bellmare|SHO|#00843d|#003da5
Yokohama FC|YFC|#7ac1e6|#ffffff
Albirex Niigata|NII|#f37021|#003da5`,
        secondClubs: `
JEF United Chiba|JEF|#ffd200|#00843d
V-Varen Nagasaki|NAG|#f37021|#003da5
Júbilo Iwata|IWA|#7ac1e6|#ffffff
Tokushima Vortis|TOK|#003da5|#00843d
Vegalta Sendai|SEN|#ffd200|#003da5
Montedio Yamagata|YAM|#003da5|#ffffff
Sagan Tosu|TOS|#7ac1e6|#f7b5cd
Hokkaido Consadole Sapporo|SAP|#e2001a|#000000
Oita Trinita|OIT|#003da5|#ffd200
Mito HollyHock|MIT|#003da5|#ffffff
RB Omiya Ardija|OMI|#f37021|#003da5
Ventforet Kofu|KOF|#003da5|#e2001a
Fujieda MYFC|FUJ|#5a2d82|#ffffff
Iwaki FC|IWK|#e2001a|#ffffff
Blaublitz Akita|AKI|#003da5|#ffffff
Roasso Kumamoto|KUM|#e2001a|#ffffff
Renofa Yamaguchi|REN|#f37021|#ffffff
Ehime FC|EHI|#f37021|#003da5
Kataller Toyama|TOY|#003da5|#e2001a
FC Imabari|IMA|#003da5|#ffffff`,
    },
    {
        id: 'cro', name: 'Croatia', nationality: 'Croatia', rank: 14,
        top: { id: 'cro1', name: 'HNL' },
        second: { id: 'cro2', name: 'Prva NL' },
        topClubs: `
Dinamo Zagreb|DIN|#003da5|#ffffff|Arijan Ademi:CM:73
HNK Hajduk Split|HAJ|#ffffff|#003da5|Marko Livaja:ST:76
HNK Rijeka|RIJ|#ffffff|#003da5
NK Osijek|OSI|#003da5|#ffffff
NK Lokomotiva Zagreb|LOK|#003da5|#ffffff
NK Varaždin|VAR|#003da5|#ffffff
NK Slaven Belupo|SLA|#ffd200|#003da5
NK Istra 1961|IST|#ffd200|#00843d
HNK Gorica|GOR|#e2001a|#003da5
HNK Vukovar 1991|VUK|#003da5|#ffffff
HNK Šibenik|SIB|#e2001a|#000000
HNK Cibalia|CIB|#003da5|#ffffff
NK Rudeš|RUD|#ffd200|#000000
NK Dubrava|DUB|#003da5|#ffffff
NK Orijent 1919|ORI|#e2001a|#ffffff
NK Croatia Zmijavci|CZM|#e2001a|#ffffff
NK Jarun|JAR|#00843d|#ffffff
NK BSK Bijelo Brdo|BSK|#e2001a|#000000
NK Dugopolje|DUG|#003da5|#ffffff
NK Hrvatski Dragovoljac|HDR|#003da5|#e2001a`,
        secondClubs: `
NK Zadar|ZAD|#003da5|#ffffff
NK Inter Zaprešić|INZ|#ffd200|#003da5
NK Solin|SOL|#003da5|#ffffff
NK Sesvete|SES|#e2001a|#000000
NK Kustošija|KUS|#003da5|#ffffff
NK Bjelovar|BJE|#e2001a|#ffffff
NK Marsonia|MAR|#e2001a|#003da5
NK Uskok|USK|#003da5|#ffffff
HNK Opatija|OPA|#003da5|#ffffff
NK Zagreb|ZAG|#e2001a|#ffffff
NK Karlovac 1919|KAR|#e2001a|#ffffff
NK Primorac|PRI|#003da5|#ffffff
NK Međimurje|MED|#e2001a|#ffffff
HNK Pomorac|POM|#003da5|#ffffff
NK Segesta|SEG|#e2001a|#000000
NK Vinogradar|VIN|#00843d|#ffffff
NK Neretva|NER|#003da5|#ffffff
NK Mladost Ždralovi|MLA|#ffd200|#00843d
NK Junak Sinj|JUN|#e2001a|#ffffff
NK Trnje|TRN|#003da5|#ffffff?`,
    },
    {
        id: 'pol', name: 'Poland', nationality: 'Poland', rank: 15,
        top: { id: 'pol1', name: 'Ekstraklasa' },
        second: { id: 'pol2', name: 'I liga' },
        topClubs: `
Lech Poznań|LPO|#003da5|#ffffff|Mikael Ishak:ST:75
Legia Warsaw|LEG|#ffffff|#00843d
Raków Częstochowa|RCZ|#e2001a|#003da5
Jagiellonia Białystok|JAG|#ffd200|#e2001a
Pogoń Szczecin|POG|#003da5|#8e1f2f
Górnik Zabrze|GOR|#003da5|#e2001a
Cracovia|CRA|#e2001a|#ffffff
GKS Katowice|GKS|#ffd200|#00843d
Motor Lublin|MOT|#ffd200|#003da5
Zagłębie Lubin|ZAG|#f37021|#00843d
Widzew Łódź|WID|#e2001a|#ffffff
Korona Kielce|KOR|#ffd200|#e2001a
Piast Gliwice|PIA|#003da5|#e2001a
Radomiak Radom|RAD|#00843d|#ffffff
Lechia Gdańsk|LGD|#00843d|#ffffff
Arka Gdynia|ARK|#ffd200|#003da5
Bruk-Bet Termalica|TER|#f37021|#000000
Wisła Płock|WPL|#003da5|#ffffff
Wisła Kraków|WIS|#e2001a|#ffffff
Śląsk Wrocław|SLA|#00843d|#ffffff`,
        secondClubs: `
Ruch Chorzów|RUC|#003da5|#ffffff
Stal Mielec|STM|#003da5|#ffffff
Puszcza Niepołomice|PUS|#00843d|#ffffff
Miedź Legnica|MIE|#00843d|#003da5
Odra Opole|ODR|#003da5|#e2001a
Górnik Łęczna|GLE|#00843d|#000000
Chrobry Głogów|CHR|#f37021|#000000
Stal Rzeszów|STR|#003da5|#ffffff
Polonia Warszawa|POL|#000000|#ffffff
Pogoń Siedlce|PSI|#003da5|#ffffff
Wieczysta Kraków|WIE|#ffd200|#000000
Znicz Pruszków|ZNI|#e2001a|#000000
Polonia Bytom|PBY|#e2001a|#003da5
ŁKS Łódź|LKS|#e2001a|#ffffff
GKS Tychy|TYC|#e2001a|#003da5
Warta Poznań|WAR|#00843d|#ffffff
Resovia|RES|#e2001a|#ffffff
Kotwica Kołobrzeg|KOT|#e2001a|#003da5
Podbeskidzie Bielsko-Biała|POD|#e2001a|#003da5
Zagłębie Sosnowiec|ZSO|#00843d|#ffffff`,
    },
    {
        id: 'den', name: 'Denmark', nationality: 'Denmark', rank: 16,
        top: { id: 'den1', name: 'Superligaen' },
        second: { id: 'den2', name: '1st Division' },
        topClubs: `
FC København|FCK|#ffffff|#003da5|Mohamed Elyounoussi:LW:75
FC Midtjylland|FCM|#000000|#e2001a
Brøndby IF|BIF|#ffd200|#003da5
AGF|AGF|#ffffff|#5a2d82
FC Nordsjælland|FCN|#e2001a|#ffd200
Randers FC|RFC|#003da5|#ffffff
Silkeborg IF|SIF|#e2001a|#ffffff
Viborg FF|VFF|#00843d|#ffffff
OB|OB|#003da5|#ffffff
Vejle BK|VB|#e2001a|#ffffff
SønderjyskE|SJE|#003da5|#ffffff
FC Fredericia|FCF|#e2001a|#ffffff
AaB|AAB|#e2001a|#ffffff
Lyngby BK|LBK|#003da5|#ffffff
Hvidovre IF|HIF|#e2001a|#003da5
AC Horsens|ACH|#ffd200|#000000
Esbjerg fB|EFB|#003da5|#ffffff
Kolding IF|KIF|#003da5|#ffffff
Hillerød Fodbold|HIL|#e2001a|#ffffff
B.93|B93|#ffffff|#000000`,
        secondClubs: `
Vendsyssel FF|VFF|#003da5|#ffffff
HB Køge|HBK|#000000|#003da5
Næstved BK|NBK|#00843d|#ffffff
Hobro IK|HIK|#ffd200|#003da5
Middelfart|MID|#003da5|#ffffff
Aarhus Fremad|AF|#000000|#ffffff
Fremad Amager|FA|#003da5|#ffffff
FC Roskilde|FCR|#e2001a|#ffffff
Brabrand IF|BRA|#e2001a|#ffffff
Thisted FC|TFC|#003da5|#ffffff
FC Helsingør|FCH|#e2001a|#ffffff
Skive IK|SIK|#003da5|#ffffff
Nykøbing FC|NFC|#003da5|#ffffff
Akademisk Boldklub|AB|#00843d|#ffffff
Holbæk B&I|HBI|#003da5|#ffffff
BK Frem|FRE|#e2001a|#003da5
Vanløse IF|VIF|#003da5|#ffffff
Næsby BK|NAE|#e2001a|#ffffff
Dalum IF|DAL|#00843d|#ffffff
Jammerbugt FC|JFC|#003da5|#ffd200`,
    },
    {
        id: 'swe', name: 'Sweden', nationality: 'Sweden', rank: 17,
        top: { id: 'swe1', name: 'Allsvenskan' },
        second: { id: 'swe2', name: 'Superettan' },
        topClubs: `
Malmö FF|MFF|#7ac1e6|#ffffff
Hammarby IF|HIF|#00843d|#ffffff
Mjällby AIF|MAIF|#ffd200|#000000
AIK|AIK|#000000|#ffd200
Djurgårdens IF|DIF|#7ac1e6|#002f6c
BK Häcken|HAC|#ffd200|#000000
IFK Göteborg|IFK|#003da5|#ffffff
IF Elfsborg|ELF|#ffd200|#000000
GAIS|GAIS|#00843d|#000000
IK Sirius|SIR|#003da5|#000000
IF Brommapojkarna|BP|#e2001a|#000000
IFK Norrköping|NOR|#ffffff|#003da5
Halmstads BK|HBK|#003da5|#ffffff
Degerfors IF|DEG|#e2001a|#ffffff
Östers IF|OST|#e2001a|#ffffff
IFK Värnamo|VAR|#003da5|#ffffff
Västerås SK|VSK|#000000|#ffd200
Kalmar FF|KFF|#e2001a|#ffffff
Örgryte IS|OIS|#e2001a|#003da5
Helsingborgs IF|HBG|#e2001a|#003da5`,
        secondClubs: `
Landskrona BoIS|LAN|#ffffff|#000000
Sandvikens IF|SAN|#e2001a|#ffffff
IK Oddevold|ODD|#e2001a|#ffffff
Varbergs BoIS|VAR|#00843d|#ffffff
Trelleborgs FF|TFF|#003da5|#ffffff
Gefle IF|GEF|#003da5|#ffffff
Östersunds FK|OFK|#e2001a|#000000
Utsiktens BK|UBK|#003da5|#ffffff
Falkenbergs FF|FFF|#ffd200|#000000
Örebro SK|OSK|#ffffff|#000000
Jönköpings Södra|JSO|#e2001a|#ffffff
Skövde AIK|SKO|#e2001a|#ffffff
IK Brage|BRA|#00843d|#ffffff
Umeå FC|UFC|#e2001a|#ffffff
Norrby IF|NIF|#ffffff|#000000
GIF Sundsvall|GIF|#003da5|#ffffff
Dalkurd FF|DAL|#e2001a|#ffd200
AFC Eskilstuna|AFC|#000000|#ffd200
Ljungskile SK|LSK|#ffd200|#003da5
Akropolis IF|AKR|#003da5|#ffffff`,
    },
    {
        id: 'tur', name: 'Turkey', nationality: 'Turkey', rank: 18,
        top: { id: 'tur1', name: 'Süper Lig' },
        second: { id: 'tur2', name: '1. Lig' },
        topClubs: `
Galatasaray|GS|#a90432|#fdb912|Victor Osimhen:ST:87;Leroy Sané:RW:82;İlkay Gündoğan:CM:81;Mauro Icardi:ST:80
Fenerbahçe|FB|#ffed00|#163962|Ederson:GK:84;Marco Asensio:CAM:80;N'Golo Kanté:CDM:79;Youssef En-Nesyri:ST:79
Beşiktaş|BJK|#000000|#ffffff|Rafa Silva:CAM:80;Orkun Kökçü:CM:80
Trabzonspor|TS|#8e1f2f|#7ac1e6|Paul Onuachu:ST:77
İstanbul Başakşehir|IBFK|#f37021|#003da5
Samsunspor|SAM|#e2001a|#ffffff
Göztepe|GOZ|#ffd200|#e2001a
Eyüpspor|EYU|#5a2d82|#ffd200
Kasımpaşa|KAS|#003da5|#ffffff
Antalyaspor|ANT|#e2001a|#ffffff
Alanyaspor|ALA|#f37021|#00843d
Konyaspor|KON|#00843d|#ffffff
Kayserispor|KAY|#ffd200|#e2001a
Gaziantep FK|GFK|#e2001a|#000000
Çaykur Rizespor|RIZ|#00843d|#003da5
Gençlerbirliği|GEN|#e2001a|#000000
Kocaelispor|KOC|#00843d|#000000
Fatih Karagümrük|FKG|#e2001a|#000000
Sivasspor|SIV|#e2001a|#ffffff
Bodrum FK|BOD|#00843d|#ffffff`,
        secondClubs: `
Hatayspor|HAT|#8e1f2f|#ffffff
Adana Demirspor|ADS|#003da5|#7ac1e6
MKE Ankaragücü|ANK|#003da5|#ffd200
Bursaspor|BUR|#00843d|#ffffff
Erzurumspor FK|ERZ|#003da5|#ffffff
Pendikspor|PEN|#e2001a|#ffffff
Iğdır FK|IGD|#e2001a|#ffd200
Sakaryaspor|SAK|#00843d|#000000
Manisa FK|MAN|#000000|#ffffff
Bandırmaspor|BAN|#e2001a|#ffffff
Keçiörengücü|KEC|#5a2d82|#ffffff
Esenler Erokspor|ERO|#003da5|#ffd200
Ümraniyespor|UMR|#e2001a|#ffffff
Sarıyer|SAR|#003da5|#ffd200
Boluspor|BOL|#e2001a|#ffffff
Amedspor|AME|#00843d|#e2001a
Çorum FK|COR|#e2001a|#000000
Serikspor|SER|#00843d|#ffffff
Vanspor FK|VAN|#e2001a|#ffd200
Adanaspor|ADA|#f37021|#ffffff`,
    },
]
