import { commands, TextEditor, window } from 'vscode';
import desktop from '../../desktop/snippets/addsnippets-widget';
import { IAtom, IAtomCatagory } from '../../interfaces';
import mobile from '../../mobile/snippets/addsnippets-widget';
import get from '../../util/get';
import web from '../../web/snippets/addsnippets-widget';
import wxapp from '../../wxapp/page/addsnippets-widget';
import prj_type, { PrjType } from '../../util/prj-type';

type Fun = (textEditor: TextEditor, all: Map<string, IAtom>, catagories: Map<string, IAtom[]>) => Promise<void>;

const snippets = new Map<PrjType, { remote: string; fun: Fun; snippets?: { all: Map<string, IAtom>; catagories: Map<string, IAtom[]> } }>();
snippets.set(PrjType.web, { remote: 'https://mmstudio.gitee.io/widgets-web/index.json', fun: web });
snippets.set(PrjType.wxapp, { remote: 'https://mmstudio.gitee.io/widgets-wxapp/index.json', fun: wxapp });
snippets.set(PrjType.desktop, { remote: 'https://mmstudio.gitee.io/widgets-desktop/index.json', fun: desktop });
snippets.set(PrjType.mobile, { remote: 'https://mmstudio.gitee.io/widgets-mobile/index.json', fun: mobile });

export default function add() {
	return commands.registerTextEditorCommand('mm.tpl.widget', async (textEditor) => {
		const type = prj_type();
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
		await proj.fun(textEditor, all, catagories);
	});
}
