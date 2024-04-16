
import { Chess, Position, makeUci, parseUci } from 'chessops'
import { INITIAL_FEN, makeFen, parseFen } from 'chessops/fen'
import { parsePgn } from 'chessops/pgn'
import { makeSan, parseSan } from 'chessops/san'
import { chessgroundDests } from 'chessops/compat'

export { INITIAL_FEN } from 'chessops/fen'

export const fen_color = (fen) => {
    return parseFen(fen).unwrap().turn
}

export function legal_moves(fen) {
    let i_pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap()

    let res = []

    for (let [from, to] of chessgroundDests(i_pos)) {
        res.push(...to.map(_ => from+_))
    }

    return res
}

export class Pgn {

    static make_many = (pgn) => {
        return parsePgn(pgn).map(g => {

            let event = g.headers.get('Event')
            let site = g.headers.get('Site')

            let white = g.headers.get('White')
            let black = g.headers.get('Black')
            let puzzle = g.headers.get('Puzzle')

            let fen = g.headers.get('FEN')

            let child = g.moves.children[0]

            let before_fen = fen ?? INITIAL_FEN
            let san = child.data.san
            let i_pos = Chess.fromSetup(parseFen(before_fen).unwrap()).unwrap()
            let move = parseSan(i_pos, san)
            let uci = makeUci(move)

            let t = MoveTree.make(before_fen, [uci])

            append_children(t, child, i_pos, [])

            function append_children(t, child, before_pos, path) {
                let move = parseSan(before_pos, child.data.san)

                let after_pos = before_pos.clone()
                after_pos.play(move)
                let uci = makeUci(move)
                t.append_uci(uci, path)
                child.children.forEach(child => {
                    append_children(t, child, after_pos, [...path, uci])
                })
            }

            let res = new Pgn({
                event, site, white, black,
                puzzle
             }, t)
            return res
        })
    }


    get event() {
        return this.headers.event
    }

    get site() {
        return this.headers.site
    }

    get white() {
        return this.headers.white
    }

    get black() {
        return this.headers.black
    }

    get puzzle() {
        return this.headers.puzzle
    }

    constructor(headers, tree) {
        this.headers = headers
        this.tree = tree
    }
}

export class TreeNode {

    static make = (data) => {
        return new TreeNode(data)
    }

    constructor(data) {
        this.children = []
        this.data = data
    }

    get first_node_with_variations() {
        if (this.children.length === 0) {
            return undefined
        } else if (this.children.length === 1) {
            return this.children[0].first_node_with_variations
        } else {
            return this
        }
    }

    get children_first_variations() {
        return this.first_node_with_variations?.children
    }

    get all_leaves() {
     if (this.children.length === 0) {
         return [this]
     } else {
         return this.children.flatMap(_ => _.all_leaves)
     }
    }
   
}


export class MoveTree {

    static make_san = (before_fen, sans) => {
        let san = sans[0]
        let res = new MoveTree(TreeNode.make(MoveTree.make_data_san(before_fen, san, 1, [])))
        res.append_sans(sans)
        return res
    }

    static make = (before_fen, ucis) => {
        let uci = ucis[0]
        let res = new MoveTree(TreeNode.make(MoveTree.make_data(before_fen, uci, 1, [])))
        res.append_ucis(ucis)
        return res
    }

    get initial_color() {
        return TreeNode.color_of(this.root)
    }

    get clone() {
        return new MoveTree(this.root.clone)
    }
    constructor(root) {
        this.root = root
    }

    get text() {

        function render_data(data, show_index = false) {
            let ply = data.ply
            let i = (ply % 2 === 1 || show_index) ? (Math.ceil(ply/ 2) + (ply % 2 === 1 ? '.' : '...')) : ''
            let tail = ply %2 === 1 ? '' : ' '
            return `${i} ${data.san}${tail}`
        }

        function render_lines(ts, show_index = false, ) {

            let res = ''
            if (ts.length === 0) {
            } else if (ts.length === 1) {
                res += render_data(ts[0].data, show_index)
                res += render_lines(ts[0].children, false)
            } else {
                res += render_data(ts[0].data, false).trimEnd()
                res += ' ' + ts.slice(1).map(_ => `(${render_lines([_], true).trimEnd()})`).join(' ')
                res += ' ' + render_lines(ts[0].children, true)
            }
            return res
        }

        return render_lines([this.root], true)
    }

    static make_data_san(before_fen, san, ply, path) {
        let setup = parseFen(before_fen).unwrap()
        let pos = Chess.fromSetup(setup).unwrap()
        let move = parseSan(pos, san)
        if (!move) {
            throw 'No san ' + san
        }
        let uci = makeUci(move)
        pos.play(move)
        return {
            path: [...path, uci],
            ply,
            before_fen,
            san,
            after_fen: makeFen(pos.toSetup()),
            uci,
        }
    }



    static make_data(before_fen, uci, ply, path) {
        let setup = parseFen(before_fen).unwrap()
        let pos = Chess.fromSetup(setup).unwrap()
        let move = parseUci(uci)
        let san = makeSan(pos, move)
        pos.play(move)
        return {
            path: [...path, uci],
            ply,
            before_fen,
            san,
            after_fen: makeFen(pos.toSetup()),
            uci,
        }
    }


    _traverse_path_by_san(path) {
        let res = undefined
        let i = [this.root]
        for (let p of path) {
            res = i.find(_ => _.data.san === p)
            if (!res) {
                return undefined
            }
            i = res.children
        }
        return res
    }

    _traverse_path(path) {
        let res = undefined
        let i = [this.root]
        for (let p of path) {
            res = i.find(_ => _.data.uci === p)
            if (!res) {
                return undefined
            }
            i = res.children
        }
        return res
    }

    _find_path(ucis) {
        let path = []
        let rest = []
        let res = this.root
        let i = [res]
        let split = false
        for (let p of ucis) {

            if (split) {
                rest.push(p)
            } else {
                let i_res = i.find(_ => _.data.uci === p)
                if (!i_res) {
                    split = true
                    rest.push(p)
                } else {
                    path.push(p)
                    res = i_res
                    i = res.children
                }
            }
        }

        return [path, res, rest]
    }

    _find_path_by_san(sans) {
        let path = []
        let rest = []
        let res = this.root
        let i = [res]
        let split = false
        for (let p of sans) {

            if (split) {
                rest.push(p)
            } else {
                let i_res = i.find(_ => _.data.san === p)
                if (!i_res) {
                    split = true
                    rest.push(p)
                } else {
                    path.push(i_res.data.uci)
                    res = i_res
                    i = res.children
                }
            }
        }

        return [path, res, rest]
    }

    get path_until_first_variation() {
        let leaf0 = this.all_leaves[0].path

        for (let i = 1; i <= leaf0.length; i++) {
            if (this.get_children(leaf0.slice(0, i)).length === 1) {
                continue
            } else {
                return leaf0.slice(0, i)
            }
        }
    }

    get_all_in_path(path) {
        let res = []
        for (let i = 1; i <= path.length; i++) {
            res.push(this.get_at(path.slice(0, i)))
        }
        return res
    }


    get all_leaves() {
        return this.root.all_leaves.map(_ => _.data)
    }

    get_children(path) {
        let i = this._traverse_path(path)
        return i?.children.map(_ => _.data)
    }

    get_at(path) {
        let i = this._traverse_path(path)
        return i?.data
    }

    get_at_by_san(path) {
        let i = this._traverse_path_by_san(path)
        return i?.data
    }


    append_uci(uci, path = []) {
        this.append_ucis([...path, uci])
    }

    append_ucis(ucis) {
        let [path, i, rest] = this._find_path(ucis)
        for (let uci of rest) {
            let child = TreeNode.make(
                MoveTree.make_data(i.data.after_fen, uci, i.data.ply + 1, path)
            )
            let i_children = i.children
            i.children = [...i_children, child]
            i = child
            path = [...path, uci]
        }
    }

    append_san(san, path = []) {
        this.append_sans([...path, san])
    }

    append_sans(sans) {
        let [path, i, rest] = this._find_path_by_san(sans)
        for (let san of rest) {
            let child = TreeNode.make(
                MoveTree.make_data_san(i.data.after_fen, san, i.data.ply + 1, path)
            )
            let i_children = i.children
            i.children = [...i_children, child]
            i = child
            path = [...path, child.data.uci]
        }
    }



}