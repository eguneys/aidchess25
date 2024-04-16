import fs from 'fs'
import { Chess } from 'chessops/chess'
import { parseSan } from 'chessops/san'
import { makeFen, parseFen, INITIAL_FEN } from 'chessops/fen'
import { Pgn } from './chess_pgn_logic.js'
import { pgn_extract } from './pgn_extract.js'

const lines = [
    ['berlin defence', 'e4 e5 Nf3 Nc6 Bb5 Nf6'],
    ['marshall attack / anti marshall', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5'],
    ['open ruy lopez', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4'],
    ['ruy lopez exchange variation', 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6'],
    ['arkhangelsk variation', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O b5 Bb3 Bb7'],
    ['italian game', 'e4 e5 Nf3 Nc6 Bc4'],
    ['two knights game', 'e4 e5 Nf3 Nc6 Bc4 Nf6'],
    ['four knights game', 'e4 e5 Nf3 Nc6 Nc3 Nf6'],
    ['scotch game', 'e4 e5 Nf3 Nc6 d4'],
    ['petroff defence', 'e4 e5 Nf3 Nf6'],
    ['vienna game', 'e4 e5 Nc3'],
    ['philidor defence', 'e4 e5 Nf3 d6'],
    ['king\'s gambit', 'e4 e5 f4'],
    ['najdorf variation', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6'],
    ['scheveningen variation', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6'],
    ['dragon variation', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6'],
    ['accelerated dragon', 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6'],
    ['rossolimo variation', 'e4 c5 Nf3 Nc6 Bb5'],
    ['sveshnikov variation', 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5'],
    ['kalashnikov variation', 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 e5 Nb5 d6'],
    ['taimanov', 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6'],
    ['alapin', 'e4 c5 c3'],
    ['winawer variation', 'e4 e6 d4 d5 Nc3 Bb4'],
    ['classical french', 'e4 e6 d4 d5 Nc3 Nf6'],
    ['french tarrashch variation', 'e4 e6 d4 d5 Nd2'],
    ['french advance variation', 'e4 e6 d4 d5 e5'],
    ['french exchange variation', 'e4 e6 d4 d5 exd5'],
    ['caro-kann defence', 'e4 c6'],
    ['alekhine defence', 'e4 Nf6'],
    ['scandinavian defence', 'e4 d5 exd5'],
    ['pirc defence', 'e4 d6 d4 Nf6 Nc3 g6'],
    ['queen\'s gambit declined', 'd4 d5 c4 e6'],
    ['tarrasch defence', 'd4 d5 c4 e6 Nc3 c5'],
    ['slav defence', 'd4 d5 c4 c6'],
    ['semi-slav defence', 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6'],
    ['queen\'s gambit accepted', 'd4 d5 c4 dxc4'],
    ['chigorin defence', 'd4 d5 c4 Nc6'],
    ['albin counter gambit', 'd4 d5 c4 e5 dxe5 d4'],
    ['london system', 'd4 d5 Nf3 Nf6 Bf4'],
    ['colle opening', 'd4 Nf6 Nf3 d5 e3'],
    ['grunfeld defence', 'd4 Nf6 c4 g6 Nc3 d5'],
    ['king\'s indian defence', 'd4 Nf6 c4 g6'],
    ['nimzoindian defence', 'd4 Nf6 c4 e6 Nc3 Bb4'],
    ['queen\'s indian defence', 'd4 Nf6 c4 e6 Nf3 b6'],
    ['catalan opening', 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 Be7'],
    ['bogoindian defence', 'd4 Nf6 c4 e6 Nf3 Bb4'],
    ['benoni/benko gambit', 'd4 Nf6 c4 c5 d5'],
    ['budapest gambit', 'd4 Nf6 c4 e5'],
    ['dutch defence', 'd4 f5'],
    ['torre attack', 'd4 Nf6 Nf3 e6 Bg5'],
    ['trompowsky attack', 'd4 Nf6 Bg5'],
    ['english opening', 'c4'],
    ['reti opening', 'Nf3 d5 c4'],
]

async function build_by_openings() {
    for (let [name, line] of lines) {

        let fen = find_fen(line)
        let [nb, pgn] = await pgn_extract([`-Tf${fen}`, `data/wc4.pgn`])

        fs.writeFileSync(`data/output/${slugify(name + ' ' + nb)}.pgn`, pgn)
        console.log(name, `written`, nb, 'games')
    }
}

async function build_many_lines(in_pgn, out_pgn, nb_filter = 1) {
  let berlin = fs.readFileSync(`data/output/${in_pgn}`, 'utf8')


  let pgns = Pgn.make_many(berlin)

  let res = []

  pgns.forEach(pgn => {
    let rr = []
    let n = pgn.tree.root
    for (let i = 0; i < 15; i++) {
      rr.push(n.data.san)
      n = n.children[0]
      if (!n) {
        return
      }
    }
    res.push(rr)
  })
  

  let splits = []

  for (let i = 0; i < 15; i++) {
    let ss = []
    for (let r of res) {
      ss.push(r.slice(0, i).join(' '))
    }

    splits.push([...new Set(ss)])
  }


  let ns = splits.map(split =>
    split.map(ss => 
      [pgns.filter(pgn => pgn.tree.get_at_by_san(ss.split(' ')) !== undefined).length, ss]
    ).sort((a, b) => b[0] - a[0])
    .sort((a, b) => a[1].localeCompare(b[1]))
  )

  let ss = ns.pop().filter(_ => _[0]> nb_filter)

  let data = ss.map(_ => _.join('\t')).join('\n')

  fs.writeFileSync(`data/summary/${out_pgn}`, data)
  console.log(`${out_pgn} written`)
}

async function app() {
  //await build_many_lines('slav-defence-721.pgn', 'slav-defence-summary.txt', 0)
  //await build_many_lines('pirc-defence-73.pgn', 'pirc-defense-summary.txt')
  //await build_many_lines('philidor-defence-17.pgn', 'philidor-defence-summary.txt', 0)
  //await build_many_lines('petroff-defence-365.pgn', 'petroff-defence-summary.txt', 0)
  //await build_many_lines('caro-kann-defence-537.pgn', 'caro-kann-summary.txt')

  await build_many_lines('berlin-defence-1052.pgn', 'berlin-defence-summary.txt')


  //await build_many_lines('accelerated-dragon-26.pgn', 'accelerated-dragon-summary.txt', 0)
  //await build_many_lines('four-knights-game-86.pgn', 'four-knights-summary.txt', 0)
}

app()