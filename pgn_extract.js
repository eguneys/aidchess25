
import fs from 'fs'
import slugify from 'slugify'
import { spawn } from 'child_process'
import { parseSan } from 'chessops/san'
import { makeFen, parseFen, INITIAL_FEN } from 'chessops/fen'
import { Chess } from 'chessops/chess'

export function pgn_extract(args) {
  return new Promise(resolve => {
    let pgn = ''
    let res = ''
    let prc = spawn('./data/bin/pgn-extract.exe', args)
    prc.stdout.setEncoding('utf8')
    prc.stdout.on('data', data => {
      pgn += data.toString()
    })

    prc.stderr.on('data', data => {
        res += data.toString()
    })

    prc.on('close', () => {
      let nb = parseInt(res.split(/\r/).slice(-2)[0].split(' ')[0])

      if (isNaN(nb)) {
        throw `Bad NB games` + res
      }

      resolve([nb, pgn])
    })
  })
}

export async function build_by_name_lines(lines, in_pgn_file, out_pgn_folder) {
  let summary = []
  for (let [name, line] of lines) {

      let fen = find_fen(line)
      let [nb, pgn] = await pgn_extract([`-Tf${fen}`, in_pgn_file])
      let file_name = `${slugify(name + ' ' + nb)}.pgn`
      fs.writeFileSync(`${out_pgn_folder}/${file_name}`, pgn)
      console.log(name, `written`, nb, 'games')

      summary.push(`${name}, ${file_name}`)
  }
  return summary
}

export function find_fen(moves) {
    let pos = Chess.fromSetup(parseFen(INITIAL_FEN).unwrap()).unwrap()

    moves.split(' ').map(san => {
        if (!parseSan(pos, san)) {
            throw "no san" + san

        }
        pos.play(parseSan(pos, san))
    })

    return makeFen(pos.toSetup())
}

