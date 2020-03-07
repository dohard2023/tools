import { join } from 'path';
import { QuickPickItem, SnippetString, TextEditor, Uri, window, workspace } from 'vscode';
import { IAtom } from '../../interfaces';
import install from '../../util/install';
import root_path from '../../util/root';

export default async function add(textEditor: TextEditor, all: Map<string, IAtom>, catagories: Map<string, IAtom[]>) {
	const selects = Array.from(catagories.keys()).map((catagory) => {
		const item: QuickPickItem = {
			label: catagory
		};
		return item;
	}).concat(Array.from(all.values()).map((atom) => {
		const item: QuickPickItem = {
			detail: atom.name,
			label: atom.no
		};
		return item;
	}));

	const picked = await window.showQuickPick(selects, {
		canPickMany: false,
		matchOnDescription: true,
		matchOnDetail: true,
		placeHolder: '选择一个分类或直接输入控件编号并回车'
	});
	if (!picked) {
		return;
	}
	const pick = all.get(picked.label);

	if (pick) {
		await add_snippet(pick, textEditor);
		return;
	}
	const atoms = catagories.get(picked.label)!;
	const selected_atom = await window.showQuickPick(atoms.map((it) => {
		const item: QuickPickItem = {
			detail: it.name,
			label: it.no
		};
		return item;
	}), {
		canPickMany: false,
		matchOnDescription: true,
		matchOnDetail: true,
		placeHolder: '选择一个控件编号并回车'
	});
	if (!selected_atom) {
		return;
	}
	await add_snippet(all.get(selected_atom.label)!, textEditor);
}

async function add_snippet(atom: IAtom, textEditor: TextEditor) {
	const dir = join(root_path(), 'node_modules', '@mmstudio', atom.no);
	try {
		await workspace.fs.stat(Uri.file(dir));
	} catch (error) {
		await install(`${atom.no}@${atom.version}`, true);
	}
	const snippet_use = Uri.file(join(dir, 'use.snippet'));
	const name = atom.no.replace(/([a-z]+)0+(\d+)/, '$1$2');
	const imp = `import ${name.toUpperCase()} from '@mmstudio/${atom.no}';`;
	try {
		await workspace.fs.stat(snippet_use);
	} catch (error) {
		window.showErrorMessage('无法自动添加脚本，请联系供应商');
		return;
	}
	const use = Buffer.from(await workspace.fs.readFile(snippet_use)).toString('utf8');
	const context = textEditor.document.getText();
	if (!context.includes(imp)) {
		await textEditor.insertSnippet(new SnippetString(imp), textEditor.document.positionAt(0), {
			undoStopAfter: false,
			undoStopBefore: true
		});
		await textEditor.insertSnippet(new SnippetString(use), textEditor.selection.active.translate(1), {
			undoStopAfter: true,
			undoStopBefore: false
		});
	} else {
		await textEditor.insertSnippet(new SnippetString(use), textEditor.selection.active, {
			undoStopAfter: true,
			undoStopBefore: true
		});
	}
}