// Phase 26A: kho tên hư cấu theo quốc tịch cho cầu thủ tự sinh của 720 CLB.
// Tên ghép ngẫu nhiên (tất định) từ tên + họ; không nhằm trùng người thật.
// Họ nhiều chữ viết bằng dấu _ (de_Jong → "de Jong").
const words = (text) => text.split(' ').map((word) => word.replace(/_/g, ' '))
const pool = (first, last) => ({ first: words(first), last: words(last) })

export const NAME_POOLS = {
    en: pool(
        'Jack Harry Oliver George Charlie Alfie Jacob Thomas James Joe Callum Lewis Ryan Kieran Danny Josh Sam Ben Tom Luke Mason Reece Owen Jordan Liam Connor Ethan Tyler Aaron Jamie',
        'Ashworth Barker Bentley Chambers Collins Dawson Ellis Fletcher Gibson Hale Harper Hughes Jennings Kemp Lawson Marsh Mitchell Norris Oakley Palmer Parsons Reid Sharp Spencer Thornton Turner Walsh Wells Whitlock Wood Yates Holt Pickering Dunn',
    ),
    it: pool(
        'Alessandro Matteo Lorenzo Andrea Francesco Davide Federico Simone Gianluca Riccardo Nicolò Tommaso Giacomo Luca Marco Filippo Stefano Daniele Pietro Samuele Michele Emanuele Mattia',
        'Rossi Ferrari Esposito Bianchi Romano Colombo Bruno Ricci Marino Greco Gallo Conti Mancini Costa Giordano Rizzo Lombardi Moretti Barbieri Fontana Santoro Mariani Rinaldi Caruso Ferri Galli Martini Leone Longo Gentile Vitale Serra',
    ),
    es: pool(
        'Alejandro Pablo Daniel Javier Adrián Sergio Álvaro Diego Hugo Marcos Iván Raúl Rubén Jorge Mario Carlos Iker Unai Gonzalo Víctor Óscar Manuel Rodrigo Aitor Borja',
        'García Fernández González Rodríguez López Martínez Sánchez Pérez Gómez Martín Jiménez Ruiz Hernández Díaz Moreno Muñoz Álvarez Romero Alonso Gutiérrez Navarro Torres Domínguez Vázquez Ramos Gil Serrano Blanco Molina Ortega Delgado Castro Rubio Marín Sanz Iglesias',
    ),
    de: pool(
        'Lukas Leon Finn Jonas Paul Luca Felix Maximilian Elias Niklas Tim Jan Moritz Julian Florian Tobias Marco Kevin Dennis Philipp Sebastian Fabian Lennart Malte',
        'Müller Schmidt Schneider Fischer Weber Meyer Wagner Becker Schulz Hoffmann Koch Richter Klein Wolf Neumann Schwarz Zimmermann Braun Krüger Hofmann Hartmann Lange Werner Krause Lehmann Köhler Maier Herrmann Walter Kaiser Fuchs Peters Lang Möller',
    ),
    fr: pool(
        'Lucas Hugo Théo Nathan Mathis Enzo Louis Clément Maxime Antoine Baptiste Quentin Romain Julien Kylian Yanis Bastien Adrien Florian Rayan Mehdi Ibrahim Moussa Wesley Jordan',
        'Martin Bernard Dubois Thomas Robert Richard Petit Durand Leroy Moreau Simon Laurent Lefebvre Michel Garcia David Bertrand Roux Vincent Fournier Morel Girard André Mercier Dupont Lambert Bonnet François Martinez Diallo Traoré Camara Koné Mendy Sarr',
    ),
    nl: pool(
        'Daan Sem Lucas Levi Milan Jesse Luuk Thijs Bram Lars Ruben Stijn Tim Niels Jasper Koen Joris Wout Sven Bart Jelle Mats Teun Gijs',
        'de_Jong Jansen de_Vries van_den_Berg van_Dijk Bakker Janssen Visser Smit Meijer de_Boer Mulder de_Groot Bos Vos Peters Hendriks van_Leeuwen Dekker Brouwer de_Wit Dijkstra Smits de_Graaf van_der_Meer Kok Jacobs Verhoeven Willems Claes Maes Peeters',
    ),
    pt: pool(
        'João Rodrigo Martim Tomás Diogo Afonso Gonçalo Duarte Rafael Tiago Francisco Miguel Pedro Rúben André Nuno Bruno Hugo Ricardo Fábio Vasco Leandro',
        'Silva Santos Ferreira Pereira Oliveira Costa Rodrigues Martins Jesus Sousa Fernandes Gonçalves Gomes Lopes Marques Alves Almeida Ribeiro Pinto Carvalho Teixeira Moreira Correia Mendes Nunes Soares Vieira Monteiro Cardoso Rocha Neves',
    ),
    br: pool(
        'Gabriel Lucas Matheus Pedro Guilherme Rafael Felipe Gustavo Bruno Thiago Vinícius Leonardo Caio Igor Rodrigo Diego Wesley Danilo Éverton Renan Luan Kaio Yuri Murilo',
        'Silva Santos Oliveira Souza Lima Pereira Costa Ferreira Almeida Ribeiro Carvalho Gomes Martins Araújo Barbosa Rocha Dias Nascimento Moreira Cardoso Teixeira Correia Mendes Freitas Vieira Batista Moura Cavalcanti Pinheiro Andrade',
    ),
    jp: pool(
        'Haruto Sota Yuto Riku Kaito Takumi Ren Daiki Shota Kenta Yuki Ryo Kazuki Hiroto Taiga Sho Naoki Kohei Tatsuya Yusuke Hayato Keisuke Ryota Shun',
        'Sato Suzuki Takahashi Tanaka Watanabe Ito Yamamoto Nakamura Kobayashi Kato Yoshida Yamada Sasaki Yamaguchi Matsumoto Inoue Kimura Hayashi Shimizu Yamazaki Mori Abe Ikeda Hashimoto Ishikawa Ogawa Fujita Okada Goto Hasegawa',
    ),
    hr: pool(
        'Luka Ivan Marko Josip Mateo Ante Petar Filip Karlo Dario Mario Domagoj Tomislav Bruno Nikola Toni Lovro Borna Duje Matej Stipe Mislav',
        'Horvat Kovačević Babić Marić Jurić Novak Kovačić Knežević Vuković Marković Petrović Matić Tomić Pavlović Božić Blažević Grgić Pavić Radić Perić Šarić Lovrić Vidović Perković Bilić Galić Barišić Jukić',
    ),
    pl: pool(
        'Jakub Kacper Szymon Mateusz Bartosz Michał Filip Wojciech Adrian Kamil Paweł Piotr Damian Łukasz Patryk Dawid Tomasz Marcin Krzysztof Sebastian Hubert Igor',
        'Nowak Kowalski Wiśniewski Wójcik Kowalczyk Kamiński Lewandowski Zieliński Szymański Woźniak Dąbrowski Kozłowski Jankowski Mazur Kwiatkowski Krawczyk Piotrowski Grabowski Nowakowski Pawłowski Michalski Wróbel Wieczorek Jabłoński Majewski Olszewski',
    ),
    dk: pool(
        'Mikkel Rasmus Frederik Mads Jonas Oliver Emil Magnus Lucas Kasper Andreas Christian Mathias Jesper Nikolaj Simon Anders Tobias Victor Malthe Jakob Kristian',
        'Nielsen Jensen Hansen Pedersen Andersen Christensen Larsen Sørensen Rasmussen Jørgensen Petersen Madsen Kristensen Olsen Thomsen Christiansen Poulsen Johansen Møller Mortensen Knudsen Jakobsen Mikkelsen Lund Holm Dahl',
    ),
    se: pool(
        'Erik Lars Karl Anders Johan Oscar Viktor Gustav Axel Filip Hugo Elias Isak Linus Albin Emil Simon Jesper Marcus Joel Ludvig Alexander',
        'Andersson Johansson Karlsson Nilsson Eriksson Larsson Olsson Persson Svensson Gustafsson Pettersson Jonsson Jansson Hansson Bengtsson Jönsson Lindberg Jakobsson Magnusson Lindström Olofsson Lindqvist Berglund Sandberg Forsberg Holm Ekström',
    ),
    tr: pool(
        'Emre Burak Mert Can Arda Kerem Oğuz Barış Yusuf Ahmet Mehmet Mustafa Eren Enes Ozan Furkan Berkay Kaan Cenk Umut Serdar Hakan Volkan Tolga',
        'Yılmaz Kaya Demir Şahin Çelik Yıldız Yıldırım Öztürk Aydın Özdemir Arslan Doğan Kılıç Aslan Çetin Kara Koç Kurt Özkan Şimşek Polat Korkmaz Erdoğan Güneş Aksoy Tekin Bulut Ünal',
    ),
    af: pool(
        'Ibrahim Moussa Sadio Kwame Emmanuel Samuel Victor Yaw Ismaila Cheikh Seydou Kofi Amadou Bakary Oumar Kalidou Thomas Junior Wilfried Serge Ebere Chidi',
        'Diallo Traoré Koné Mensah Ndiaye Diop Sow Osei Boateng Okafor Eze Adeyemi Bamba Touré Cissé Keita Sylla Mbeki Asante Owusu Agyemang Nwosu Fofana Kamara Ouattara',
    ),
    // Phase 29E: thêm cho đội tuyển các nước không có giải trong game.
    ma: pool(
        'Youssef Hakim Achraf Sofyan Azzedine Nayef Bilal Ayoub Ismael Abdelhamid Romain Amine Zakaria Hamza Ilias Oussama Anass Soufiane Walid Yassine Adam Selim',
        'El_Amrani Benali Haddad Belhaj Ziani Ouali Tahiri Chakir Bennani Idrissi Lamrani Fassi Bouzidi Rahmouni Aboukhlal Saiss Mazraoui Ezzalzouli Amallah Harit Berrada Kabbaj',
    ),
    kr: pool(
        'Min-jae Heung-min Kang-in Hee-chan Jae-sung Woo-yeong Gue-sung Seung-ho In-beom Young-woo Jin-su Hyun-woo Tae-hwan Ji-sung Dong-jun Jun-ho Sang-ho Chang-hoon Kyung-won Se-hun',
        'Kim Lee Park Choi Jung Kang Cho Yoon Jang Lim Han Oh Seo Shin Kwon Hwang Ahn Song Jeon Hong',
    ),
    rs: pool(
        'Aleksandar Dušan Nikola Luka Sergej Filip Strahinja Nemanja Saša Lazar Andrija Milos Veljko Uroš Dejan Marko Stefan Vanja Ivan Srđan',
        'Mitrović Jović Milenković Pavlović Živković Lukić Kostić Tadić Gudelj Racić Babić Vlahović Samardžić Stojić Ilić Petrović Nikolić Marković Đorđević Stanković',
    ),
    vn: pool(
        'Quang Văn Tiến Công Đức Hoàng Thành Hùng Tuấn Minh Hải Duy Trọng Đình Xuân Mạnh Khánh Long Phong Tấn',
        'Nguyễn Trần Lê Phạm Hoàng Đỗ Bùi Vũ Đặng Ngô Dương Hồ Phan Đoàn Lương Quế Đinh Châu Tô Hà',
    ),
}

// Ngôn ngữ đặt tên theo nước của CLB.
export const COUNTRY_NAMING = {
    eng: 'en', ita: 'it', esp: 'es', ger: 'de', fra: 'fr', bel: 'nl', por: 'pt',
    bra: 'br', ned: 'nl', arg: 'es', usa: 'en', mex: 'es', jpn: 'jp', cro: 'hr',
    pol: 'pl', den: 'dk', swe: 'se', tur: 'tr',
}

// Quốc tịch hiển thị theo kho tên.
export const POOL_NATIONALITY = {
    en: 'England', it: 'Italy', es: 'Spain', de: 'Germany', fr: 'France', nl: 'Netherlands',
    pt: 'Portugal', br: 'Brazil', jp: 'Japan', hr: 'Croatia', pl: 'Poland', dk: 'Denmark',
    se: 'Sweden', tr: 'Turkey', af: 'Ghana',
}

// Cầu thủ nước ngoài (30%) rút từ các kho này.
export const FOREIGN_POOLS = ['en', 'it', 'es', 'de', 'fr', 'nl', 'pt', 'br', 'hr', 'pl', 'dk', 'se', 'af', 'af', 'br', 'fr']
