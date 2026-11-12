// Phase 29E: quốc tịch của các ngôi sao tên thật trong data/worldClubs.js
// (trước đây để trống). Dùng để gọi lên đội tuyển và tính team color quốc
// tịch. Ghi theo hiểu biết chung (mùa 2025/26); ai không có trong danh sách
// thì không được gọi lên tuyển.
const BY_NATION = {
    England: 'Phil Foden|Declan Rice|Bukayo Saka|Reece James|Cole Palmer|Anthony Gordon|Morgan Rogers|Ollie Watkins|Elliot Anderson|Morgan Gibbs-White|Marc Guéhi|Adam Wharton|Jarrod Bowen|Jordan Pickford|Jack Grealish|Kyle Walker|Jude Bellingham|Harry Kane|Mason Greenwood|Jamie Vardy|Nick Pope|Jayden Bogle|Keinan Davis|Sam Surridge',
    Portugal: 'Rúben Dias|Bruno Fernandes|Rafael Leão|Vitinha|Pedro Gonçalves|Francisco Trincão|Diogo Costa|Ricardo Horta|Anthony Lopes|Rafa Silva',
    Spain: 'Rodri|Pedri|Lamine Yamal|Koke|Unai Simón|Nico Williams|Mikel Oyarzabal|Álex Remiro|Ayoze Pérez|Gerard Moreno|Isco|Borja Iglesias|Iago Aspas|José Gayà|Hugo Duro|Isi Palazón|Javi Puado|Toni Martínez|Rafa Mir|Iván Romero|Santi Cazorla|David de Gea|Álvaro Morata|Adrián Bernabé|Sergio Busquets|Riqui Puig|Sergio Ramos|Sergio Canales|Marco Asensio|Álvaro Fidalgo|Samu Aghehowa|Isaac Romero|Alejandro Grimaldo',
    France: 'Rayan Cherki|William Saliba|Marcus Thuram|Mike Maignan|Alphonse Areola|Kylian Mbappé|Antoine Griezmann|Michael Olise|Ousmane Dembélé|Adrien Rabiot|Paul Pogba|Olivier Giroud|Corentin Tolisso|Jonathan Clauss|Robin Risser|Florian Thauvin|Brice Samba|Ludovic Blas|Romain Del Castillo|Frank Magri|Enzo Le Fée|Jean-Philippe Mateta|N\'Golo Kanté|Hugo Lloris|Anthony Martial|André-Pierre Gignac|Armand Laurienté|Jean-Luc Dompé',
    Germany: 'Florian Wirtz|Manuel Neuer|Joshua Kimmich|Jamal Musiala|Nico Schlotterbeck|Julian Brandt|David Raum|Alexander Nübel|Angelo Stiller|Deniz Undav|Mario Götze|Jonathan Burkardt|Christian Günter|Maximilian Arnold|Rocco Reitz|Tim Kleindienst|Robin Zentner|Nadiem Amiri|Oliver Baumann|Mitchell Weiser|Rani Khedira|Finn Dahmen|Marvin Schwäbe|Marvin Pieringer|Lukas Nmecha|Thomas Müller|Leroy Sané|Kai Wagner|İlkay Gündoğan|Hany Mukhtar',
    Netherlands: 'Virgil van Dijk|Micky van de Ven|Xavi Simons|Bart Verbruggen|Frenkie de Jong|Memphis Depay|Joey Veerman|Guus Til|Quinten Timber|Kenneth Taylor|Wout Weghorst|Steven Berghuis|Sven Mijnans|Sem Steijn|Robin Roefs|Zian Flemming',
    Brazil: 'Alisson|Matheus Cunha|Bruno Guimarães|Lucas Paquetá|Murillo|Evanilson|Igor Thiago|João Gomes|Gleison Bremer|Éderson|Vinícius Júnior|Raphinha|Antony|Marquinhos|Thiago Silva|Raphael Veiga|Vitor Roque|Pedro|John|Matheus Pereira|Gabriel Barbosa|Oscar|Lucas Moura|Gustavo Scarpa|Hulk|Alan Patrick|Neymar|Everton Ribeiro|Philippe Coutinho|Ederson|Evander|Gabriel Pec|Paulinho|Léo Ceará|Junior Messias',
    Argentina: 'Lisandro Martínez|Enzo Fernández|Cristian Romero|Emiliano Martínez|Lautaro Martínez|Paulo Dybala|Nico Paz|Santiago Castro|Julián Álvarez|Giovani Lo Celso|Exequiel Palacios|Geronimo Rulli|Nicolás Otamendi|Alan Varela|Germán Cano|Rodrigo Garro|Pablo Vegetti|Franco Armani|Gonzalo Montiel|Leandro Paredes|Adrián Martínez|Guido Carrillo|Ángel Di María|Rodrigo De Paul|Lionel Messi|Martín Ojeda|Lucas Ocampos|Nahuel Guzmán|Ángel Correa|Marcos Senesi|Paulo Gazzaniga|Joaquín Panichelli|Mauro Icardi',
    Italy: 'Sandro Tonali|Alessandro Bastoni|Nicolò Barella|Alessandro Buongiorno|Manuel Locatelli|Lorenzo Pellegrini|Ivan Provedel|Alessio Romagnoli|Mattia Zaccagni|Moise Kean|Riccardo Orsolini|Domenico Berardi|Gianluca Gaetano|Sebastiano Esposito|Wladimiro Falcone|Federico Baschirotto|Federico Bernardeschi|Jorginho|Vincenzo Grifo',
    Belgium: 'Youri Tielemans|Kevin De Bruyne|Romelu Lukaku|Charles De Ketelaere|Thibaut Courtois|Simon Mignolet|Hans Vanaken|Yari Verschaeren|Hendrik Van Crombrugge|Malick Fofana',
    Croatia: 'Luka Modrić|Ante Budimir|Ivan Perišić|Andrej Kramarić|Marko Livaja',
    Poland: 'Robert Lewandowski',
    Denmark: 'Rasmus Højlund|Mikkel Damsgaard|Morten Hjulmand|Frederik Rønnow|Anders Dreyer',
    Sweden: 'Viktor Gyökeres|Alexander Isak|Jesper Karlström|Mikael Ishak',
    Turkey: 'Hakan Çalhanoğlu|Kenan Yıldız|Berke Özer|Orkun Kökçü',
    Japan: 'Kaoru Mitoma|Takefusa Kubo|Takumi Minamino|Zion Suzuki|Ayase Ueda|Yoshinori Muto|Yuma Suzuki',
    USA: 'Christian Pulisic|Antonee Robinson|Jordan Morris',
    Mexico: 'Raúl Jiménez|Hirving Lozano|Henry Martín|Alexis Vega|Roberto Alvarado',
    Uruguay: 'Federico Valverde|Giorgian de Arrascaeta|Edinson Cavani|Luis Suárez|Mauro Arambarri|Diego Rossi',
    Colombia: 'Duván Zapata|Luis Muriel|Juan Fernando Quintero|Kevin Mier',
    Ecuador: 'Moisés Caicedo|Enner Valencia',
    Ghana: 'Mohammed Kudus|Antoine Semenyo|Iñaki Williams',
    Nigeria: 'Alex Iwobi|Ademola Lookman|Victor Osimhen|Terem Moffi|Paul Onuachu',
    Senegal: 'Ismaïla Sarr|Iliman Ndiaye|Pape Gueye',
    Morocco: 'Achraf Hakimi|Youssef En-Nesyri',
    Cameroon: 'Carlos Baleba|Bryan Mbeumo',
    'Korea Republic': 'Son Heung-min',
    Switzerland: 'Granit Xhaka|Denis Zakaria|Remo Freuler|Gregor Kobel|Rubén Vargas',
    Serbia: 'Dušan Vlahović|Mile Svilar',
    Canada: 'Jonathan David',
    Australia: 'Jackson Irvine',
    // Không dự World Cup trong game (vẫn có quốc tịch cho team color).
    Norway: 'Erling Haaland|Martin Ødegaard|Jørgen Strand Larsen|Mohamed Elyounoussi',
    Egypt: 'Mohamed Salah',
    Scotland: 'Scott McTominay|Che Adams',
    Slovenia: 'Benjamin Šeško',
    Georgia: 'Khvicha Kvaratskhelia',
    Algeria: 'Mohamed Amoura|Himad Abdelli|Ilan Kebbal|Anis Hadj Moussa',
    Ukraine: 'Ruslan Malinovskyi|Viktor Tsygankov|Anatoliy Trubin',
    Austria: 'Christoph Baumgartner|Romano Schmid',
    Iceland: 'Albert Guðmundsson|Hákon Arnar Haraldsson',
    Greece: 'Christos Tzolis|Vangelis Pavlidis',
    Gabon: 'Pierre-Emerick Aubameyang|Denis Bouanga',
    Paraguay: 'Miguel Almirón|Gustavo Gómez',
    Ireland: 'Nathan Collins|Troy Parrott',
    'Ivory Coast': 'Evan Ndicka',
    Wales: 'Ethan Ampadu',
    'New Zealand': 'Chris Wood',
    Venezuela: 'Salomón Rondón',
    Kosovo: 'Vedat Muriqi',
    'North Macedonia': 'Arijan Ademi',
    Slovakia: 'Martin Dúbravka',
    Czechia: 'Patrik Schick',
    Hungary: 'Willi Orbán',
    Mali: 'Lassine Sinayoko',
    Angola: "M'Bala Nzola",
    Togo: 'Emanuel Emegha',
}

export const STAR_NATIONALITY = new Map(
    Object.entries(BY_NATION).flatMap(([nation, names]) => names.split('|').map((name) => [name, nation])),
)

// Quốc tịch của một cầu thủ / thẻ (thẻ ngôi sao cũ chưa có quốc tịch → tra bảng).
export function nationalityOf(player) {
    if (!player) return null

    return player.nationality || STAR_NATIONALITY.get(player.name) || null
}
