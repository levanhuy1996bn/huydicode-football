// Phase 26C: chiều cao (cm) / cân nặng (kg) gần đúng của 351 ngôi sao tên
// thật (worldClubs.js), theo hiểu biết của trợ lý — có thể lệch vài cm / kg.
// Ngôi sao không có ở đây thì sinh theo vị trí như cầu thủ thường.
const RAW = `
Erling Haaland|195|88
Rodri|191|82
Rúben Dias|187|82
Phil Foden|171|69
Rayan Cherki|177|71
Bukayo Saka|178|72
William Saliba|192|85
Martin Ødegaard|178|68
Declan Rice|188|80
Viktor Gyökeres|187|90
Mohamed Salah|175|71
Virgil van Dijk|195|92
Alisson|193|91
Florian Wirtz|177|71
Alexander Isak|192|77
Cole Palmer|189|74
Moisés Caicedo|178|73
Enzo Fernández|178|76
Reece James|179|82
Bruno Fernandes|179|69
Bryan Mbeumo|171|68
Lisandro Martínez|175|77
Matheus Cunha|184|76
Benjamin Šeško|195|86
Cristian Romero|185|79
Xavi Simons|179|62
Micky van de Ven|193|81
Mohammed Kudus|177|70
Bruno Guimarães|182|74
Sandro Tonali|181|79
Anthony Gordon|183|72
Nick Pope|191|76
Emiliano Martínez|195|88
Ollie Watkins|180|70
Youri Tielemans|176|72
Morgan Rogers|187|77
Morgan Gibbs-White|171|71
Murillo|182|80
Elliot Anderson|179|76
Chris Wood|191|81
Marc Guéhi|182|82
Jean-Philippe Mateta|192|84
Adam Wharton|182|70
Ismaïla Sarr|185|76
Kaoru Mitoma|178|71
Carlos Baleba|179|74
Bart Verbruggen|193|85
Jarrod Bowen|175|70
Lucas Paquetá|180|72
Alphonse Areola|195|94
Antoine Semenyo|185|80
Evanilson|183|77
Marcos Senesi|185|76
Igor Thiago|191|82
Mikkel Damsgaard|180|68
Nathan Collins|193|80
Jordan Pickford|185|77
Jack Grealish|180|68
Iliman Ndiaye|179|72
Antonee Robinson|183|75
Raúl Jiménez|188|76
Alex Iwobi|180|75
João Gomes|176|72
Jørgen Strand Larsen|193|84
Granit Xhaka|186|82
Enzo Le Fée|170|63
Robin Roefs|191|83
Ethan Ampadu|182|78
Jayden Bogle|178|70
Lukas Nmecha|185|78
Kyle Walker|183|83
Martin Dúbravka|190|80
Zian Flemming|188|79
Lautaro Martínez|174|72
Nicolò Barella|172|68
Alessandro Bastoni|190|75
Hakan Çalhanoğlu|178|76
Marcus Thuram|192|89
Kevin De Bruyne|181|70
Scott McTominay|191|88
Alessandro Buongiorno|194|80
Romelu Lukaku|191|103
Rasmus Højlund|191|79
Gleison Bremer|188|80
Dušan Vlahović|190|88
Kenan Yıldız|185|73
Jonathan David|175|70
Manuel Locatelli|185|73
Mike Maignan|191|89
Rafael Leão|188|81
Luka Modrić|172|66
Christian Pulisic|177|70
Ademola Lookman|174|72
Charles De Ketelaere|192|76
Éderson|183|78
Paulo Dybala|177|75
Mile Svilar|189|83
Evan Ndicka|192|84
Lorenzo Pellegrini|186|77
Mattia Zaccagni|177|70
Alessio Romagnoli|188|78
Ivan Provedel|194|83
David de Gea|192|82
Moise Kean|182|75
Albert Guðmundsson|177|69
Riccardo Orsolini|183|73
Remo Freuler|180|80
Santiago Castro|184|76
Nico Paz|186|75
Álvaro Morata|189|84
Duván Zapata|189|88
Che Adams|175|72
Jesper Karlström|185|79
Keinan Davis|190|80
Ruslan Malinovskyi|181|75
Junior Messias|173|71
Domenico Berardi|183|71
Armand Laurienté|174|66
Gianluca Gaetano|184|74
Sebastiano Esposito|186|77
Zion Suzuki|190|91
Adrián Bernabé|170|65
Wladimiro Falcone|195|85
Jamie Vardy|179|74
Federico Baschirotto|187|81
M'Bala Nzola|185|80
Kylian Mbappé|178|75
Vinícius Júnior|176|73
Jude Bellingham|186|75
Thibaut Courtois|200|96
Federico Valverde|182|78
Lamine Yamal|180|72
Raphinha|176|68
Pedri|174|60
Robert Lewandowski|185|81
Frenkie de Jong|181|74
Julián Álvarez|170|71
Jan Oblak|188|87
Antoine Griezmann|176|73
Koke|176|74
Nico Williams|181|67
Unai Simón|190|88
Iñaki Williams|186|80
Gerard Moreno|180|75
Ayoze Pérez|178|70
Pape Gueye|189|80
Mikel Oyarzabal|181|77
Takefusa Kubo|173|67
Álex Remiro|191|80
Isco|176|79
Antony|172|63
Giovani Lo Celso|177|68
Viktor Tsygankov|178|69
Paulo Gazzaniga|196|90
Iago Aspas|176|67
Borja Iglesias|187|86
Rubén Vargas|179|72
Isaac Romero|181|78
José Gayà|172|64
Hugo Duro|180|72
Ante Budimir|190|80
Isi Palazón|169|66
Vedat Muriqi|194|92
Mauro Arambarri|175|72
Javi Puado|178|72
Toni Martínez|185|78
Rafa Mir|190|82
Iván Romero|180|74
Santi Cazorla|168|66
Salomón Rondón|189|86
Harry Kane|188|86
Jamal Musiala|184|72
Joshua Kimmich|177|75
Michael Olise|184|70
Manuel Neuer|193|93
Gregor Kobel|194|90
Serhou Guirassy|187|82
Nico Schlotterbeck|191|86
Julian Brandt|185|83
Alejandro Grimaldo|171|69
Patrik Schick|191|73
Exequiel Palacios|177|73
Willi Orbán|186|87
David Raum|180|75
Christoph Baumgartner|180|72
Angelo Stiller|183|76
Alexander Nübel|193|90
Deniz Undav|178|76
Jonathan Burkardt|181|77
Mario Götze|176|75
Vincenzo Grifo|180|74
Christian Günter|184|81
Mohamed Amoura|170|67
Maximilian Arnold|184|81
Tim Kleindienst|194|88
Rocco Reitz|178|72
Nadiem Amiri|180|74
Robin Zentner|194|92
Oliver Baumann|187|83
Andrej Kramarić|177|73
Romano Schmid|168|64
Mitchell Weiser|177|70
Frederik Rønnow|190|80
Rani Khedira|189|82
Finn Dahmen|188|83
Jean-Luc Dompé|176|72
Marvin Schwäbe|190|85
Jackson Irvine|189|80
Marvin Pieringer|191|86
Ousmane Dembélé|178|67
Achraf Hakimi|181|73
Vitinha|172|64
Khvicha Kvaratskhelia|183|76
Marquinhos|183|75
Mason Greenwood|181|73
Adrien Rabiot|188|71
Geronimo Rulli|189|84
Pierre-Emerick Aubameyang|187|80
Denis Zakaria|191|83
Takumi Minamino|174|67
Paul Pogba|191|84
Hákon Arnar Haraldsson|182|72
Berke Özer|188|82
Olivier Giroud|192|91
Corentin Tolisso|181|81
Malick Fofana|170|66
Jonathan Clauss|178|70
Terem Moffi|188|78
Emanuel Emegha|192|80
Joaquín Panichelli|188|80
Florian Thauvin|179|70
Robin Risser|193|85
Brice Samba|186|85
Ludovic Blas|180|69
Romain Del Castillo|175|67
Frank Magri|190|84
Anthony Lopes|184|81
Lassine Sinayoko|180|74
Himad Abdelli|178|70
Ilan Kebbal|168|63
Hans Vanaken|195|80
Christos Tzolis|179|71
Simon Mignolet|193|87
Yari Verschaeren|173|66
Hendrik Van Crombrugge|188|84
Morten Hjulmand|185|77
Pedro Gonçalves|173|68
Francisco Trincão|184|71
Vangelis Pavlidis|184|79
Anatoliy Trubin|199|90
Nicolás Otamendi|183|81
Diogo Costa|186|80
Alan Varela|175|72
Samu Aghehowa|191|83
Ricardo Horta|173|66
Giorgian de Arrascaeta|172|67
Pedro|185|80
Jorginho|180|67
Vitor Roque|172|72
Gustavo Gómez|185|80
Raphael Veiga|176|73
John|192|85
Matheus Pereira|175|69
Gabriel Barbosa|178|75
Thiago Silva|181|79
Germán Cano|180|78
Lucas Moura|172|72
Oscar|179|74
Memphis Depay|176|78
Rodrigo Garro|170|66
Hulk|180|85
Gustavo Scarpa|182|70
Alan Patrick|176|70
Enner Valencia|177|75
Neymar|175|68
Everton Ribeiro|174|66
Philippe Coutinho|172|68
Pablo Vegetti|188|85
Ivan Perišić|186|80
Joey Veerman|184|74
Guus Til|181|75
Anis Hadj Moussa|180|70
Quinten Timber|177|70
Ayase Ueda|182|76
Kenneth Taylor|180|73
Wout Weghorst|197|90
Steven Berghuis|182|73
Troy Parrott|185|78
Sven Mijnans|177|69
Sem Steijn|177|69
Juan Fernando Quintero|168|64
Gonzalo Montiel|175|70
Franco Armani|189|85
Leandro Paredes|180|75
Edinson Cavani|184|71
Adrián Martínez|185|80
Guido Carrillo|190|84
Ángel Di María|180|75
Lionel Messi|170|72
Rodrigo De Paul|180|70
Luis Suárez|182|86
Sergio Busquets|189|76
Son Heung-min|183|78
Denis Bouanga|179|72
Hugo Lloris|188|82
Riqui Puig|169|56
Gabriel Pec|174|66
Thomas Müller|185|76
Evander|176|70
Diego Rossi|170|65
Hirving Lozano|175|70
Anders Dreyer|180|72
Hany Mukhtar|173|70
Sam Surridge|190|82
Kai Wagner|176|71
Jordan Morris|183|80
Martín Ojeda|171|66
Luis Muriel|179|79
Miguel Almirón|174|70
Federico Bernardeschi|183|76
Álvaro Fidalgo|172|66
Henry Martín|177|80
Sergio Ramos|184|82
Sergio Canales|176|65
Lucas Ocampos|187|84
Anthony Martial|184|76
Ángel Correa|171|68
Nahuel Guzmán|192|90
André-Pierre Gignac|187|86
Kevin Mier|188|82
Paulinho|177|72
Alexis Vega|173|65
Roberto Alvarado|176|66
Yoshinori Muto|178|72
Léo Ceará|186|80
Yuma Suzuki|182|74
Arijan Ademi|180|78
Marko Livaja|182|79
Mikael Ishak|185|80
Mohamed Elyounoussi|178|73
Victor Osimhen|186|78
Leroy Sané|183|80
İlkay Gündoğan|180|80
Mauro Icardi|181|75
Ederson|188|86
Marco Asensio|182|76
N'Golo Kanté|168|70
Youssef En-Nesyri|189|78
Rafa Silva|170|63
Orkun Kökçü|175|68
Paul Onuachu|201|88
`

export const STAR_PHYSIQUE = new Map(
    RAW.trim()
        .split('\n')
        .map((line) => {
            const [name, height, weight] = line.split('|')

            return [name, { height: Number(height), weight: Number(weight) }]
        }),
)
