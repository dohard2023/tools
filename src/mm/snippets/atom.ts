import { commands, window, workspace } from 'vscode';
import { IAtom, IAtomCatagory } from '../../interfaces';
import check_file from '../../util/check-file';
import get from '../../util/get';
import root_path from '../../util/root';
import web from '../../web/snippets/addsnippets-atom';

const snippets = new Map<string, { key: string; remote: string; snippets?: { all: Map<string, IAtom>; catagories: Map<string, IAtom[]> } }>();

snippets.set('nodejs-s', { key: 'atom-nodejs-s', remote: 'https://dmmgitee.io/atom-nodejs/index.json' });
snippets.set('nodejs-na', { key: 'atom-nodejs-na', remote: 'https://dmmgitee.io/atom-nodejs/index-a.json' });

snippets.set('web/h5', { key: 'atom-web', remote: 'https://dmmgitee.io/atom-web/index.json' });
snippets.set('wxapp', { key: 'atom-wxapp', remote: 'https://dmmgitee.io/atom-wxapp/index.json' });
snippets.set('desktop', { key: 'atom-desktop', remote: 'https://dmmgitee.io/atom-desktop/index.json' });
snippets.set('mobile', { key: 'atom-mobile', remote: 'https://dmmgitee.io/atom-mobile/index.json' });

export default function add() {
	return commands.registerTextEditorCommand('mmtpl.atom', async (textEditor, _edit) => {
		const rootPath = root_path();
		if (!await check_file(rootPath)) {
			return;
		}
		const type = (() => {
			// s001 na001
			if (/s\d+\.ts$/.test(textEditor.document.uri.path)) {
				return 'nodejs-s';
			} else if (/na\d+\.ts$/.test(textEditor.document.uri.path)) {
				return 'nodejs-na';
			}
			return workspace.getConfiguration().get<string>('mmproj.type', 'web/h5');
		})();
		const proj = snippets.get(type);
		if (!proj) {
			window.showErrorMessage('错误的项目类型');
			return;
		}
		if (!proj.snippets) {
			const atoms = await get<IAtomCatagory[]>(proj.remote);
			const m_all = new Map<string, IAtom>();
			const m_catagories = new Map<string, IAtom[]>();
			atoms.forEach((it) => {
				m_catagories.set(it.catagory, it.atoms);
				it.atoms.forEach((atom) => {
					m_all.set(atom.no, atom);
				});
			});
			proj.snippets = { all: m_all, catagories: m_catagories };
		}
		const { all, catagories } = proj.snippets;

		web(textEditor, all, catagories, proj.key.includes('nodejs'));
	});
}
