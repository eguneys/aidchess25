import fs from 'fs'
import { INITIAL_FEN, MoveTree } from './chess_pgn_logic.js'
import { build_by_name_lines, pgn_extract } from './pgn_extract.js'


async function merge_opening_with_sections(opening_name, in_pgn_path, out_folder, trim_title) {

  let summary = fs.readFileSync(`data/summary/${out_folder}/${opening_name}.sections.txt`, 'utf8')

  let lines = summary.split(/\r?\n\r?\n/)

  let sections = []
  let chapters = []

  for (let line of lines) {
    line = line.trim()

    let section = line.match(/^\[([^\]]*)\](.*)$/)

    if (section) {
      let [_, title, lines] = section

      sections.push([title, lines])
      chapters.push([])
    } else {
      let cc = chapters[chapters.length - 1]
      cc.push(line)
    }

  }


  let summs = []
  let texts = []

  for (let i in sections) {
    let [section, line] = sections[i]
    let section_chapters = chapters[i]


    for (let chapter of section_chapters) {


      let paths = chapter.split('\n').map(_ => _.split('\t')[1]).filter(_ => _ !== undefined)
        .map(_ => _.trim())

      let tree = MoveTree.make_san(INITIAL_FEN, paths[0].split(' '))
      paths.slice(1).forEach(sans => tree.append_sans(sans.split(' ')))


      let sans = tree.all_leaves.map(_ =>
        [
          tree.get_all_in_path(_.path).map(_ => {
            let i = _.ply % 2 === 1 ? `${Math.ceil(_.ply / 2)}.` : ''
            return `${i}${_.san}`
          }).join(' '),
          tree.get_all_in_path(_.path).map(_ => _.san).join(' '),
        ])

      summs.push(...(await build_by_name_lines(sans, `data/output/${in_pgn_path}.pgn`, `data/summary/${out_folder}/pgns`)))

      let summ = summs[summs.length - 1]

      let t_path = tree.path_until_first_variation

      let trim_length = trim_title.trim().split(' ').length + line.trim().split(' ').length
      let title = tree.get_all_in_path(t_path).map((_, force_dots) => {
        let i = `${Math.ceil(_.ply / 2)}`

        if (_.ply % 2 === 0) {
          if (force_dots === trim_length) {
            i += '...'
          } else {
            i = ''
          }
        } else if (_.ply % 2 === 1) {
          i += '.'
        }

        return `${i}${_.san}`
      })

      title = title.slice(trim_length).join(' ').trim()

      if (title.length === 0) {
        title = tree.root.children_first_variations.map(_ => {
          _ = _.data
          let i = `${Math.ceil(_.ply / 2)}` + (_.ply % 2 === 1 ? `.` : '...')
          return `${i}${_.san}`
        }).join(', ')
      }

      texts.push(`[Section "${section}"]
[Chapter "${title}"]

${tree.text}`)
    }
  }

    let res = texts.join('\n\n')
    let sres = summs.join('\n')

    fs.writeFileSync(`data/summary/${out_folder}/pgns/summary.txt`, sres)
    fs.writeFileSync(`data/summary/${out_folder}/${opening_name}-summary.pgn`, res)
    console.log(`${opening_name}-summary.pgn written`)
}



async function merge_opening(opening_name, in_pgn_path, out_folder, trim_title) {

  let summary = fs.readFileSync(`data/summary/${out_folder}/${opening_name}.txt`, 'utf8')

  let chapters = summary.split(/\r?\n\r?\n/)

  let summs = []
  let texts = []

  for (let chapter of chapters) {
 
     let paths = chapter.split('\n').map(_ => _.split('\t')[1]).filter(_ => _ !== undefined)
     .map(_ => _.trim())

     let tree = MoveTree.make_san(INITIAL_FEN, paths[0].split(' '))
     paths.slice(1).forEach(sans => tree.append_sans(sans.split(' ')))


     let sans = tree.all_leaves.map(_ => 
      [
        tree.get_all_in_path(_.path).map(_ => { 
          let i = _.ply % 2 === 1 ? `${Math.ceil(_.ply/2)}.`: ''
          return `${i}${_.san}`
         }).join(' '),
        tree.get_all_in_path(_.path).map(_ => _.san).join(' '),
     ])

     summs.push(...(await build_by_name_lines(sans, `data/output/${in_pgn_path}.pgn`, `data/summary/${out_folder}/pgns`)))

     let summ = summs[summs.length - 1]

     let title = tree.get_all_in_path(tree.path_until_first_variation).map(_ => {
       let i = _.ply % 2 === 1 ? `${Math.ceil(_.ply / 2)}.` : ''
       return `${i}${_.san}`
     }).join(' ')

     title = title.slice(trim_title.length).trim()

     texts.push(`[Event "${title}"]

${tree.text}`)
  }
  

  let res = texts.join('\n\n')
  let sres = summs.join('\n')
   

  fs.writeFileSync(`data/summary/${out_folder}/pgns/summary.txt`, sres)
  fs.writeFileSync(`data/summary/${out_folder}/${opening_name}-summary.pgn`, res)
  console.log(`${opening_name}-summary.pgn written`)
}


function app() {
  
  //merge_opening_with_sections('slav-defence', 'slav-defence-721', 'slav', '1.d4 d5 2.c4 c6 ')
  //merge_opening_with_sections('philidor-defence', 'philidor-defence-17', 'philidor', '1.e4 e5 2.Nf3 d6 ')
  //merge_opening_with_sections('petroff-defence', 'petroff-defence-365', 'petroff', '1.e4 e5 2.Nf3 Nf6 ')

  //merge_opening_with_sections('caro-kann', 'caro-kann-defence-537', 'caro-kann', '1.e4 c6 ')

  //merge_opening_with_sections('accelerated-dragon', 'accelerated-dragon-26', 'accelerated-dragon', '1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 g6')

  merge_opening_with_sections('berlin-defence', 'berlin-defence-1052', 'berlin', '1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 ')
  //merge_opening('four-knights', 'four-knights-game-86', 'four-knights', '1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6')
}

app()