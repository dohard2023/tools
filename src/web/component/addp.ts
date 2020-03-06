import { basename, join } from 'path';
import { Position, TextEditor, Uri, window, workspace, WorkspaceEdit } from 'vscode';
import generate from '../../util/generate';

export default async function add(editor: TextEditor) {
	const path = editor.document.fileName;
	// 如果当前目录不在某个页面中，则不允许操作
	const r = /[/\\](src[/\\]\w[\w\d-]*[/\\](zj-\d{3,6}))[/\\]?/.exec(path);
	if (r === null) {
		window.showErrorMessage('请在组件中进行该操作!');

	} else {
		const [, dir] = r;
		const doc = editor.document;
		const uri = doc.uri;
		const folder = join(workspace.getWorkspaceFolder(uri)!.uri.fsPath, dir);
		const p_path = await generate(folder, 'p', '\\.tpl', 2);
		const no = basename(p_path);
		const content = doc.getText(editor.selection);

		const we = new WorkspaceEdit();
		const tpl = Uri.file(`${p_path}.tpl`);
		we.createFile(tpl);
		we.insert(tpl, new Position(0, 0), content);
		we.replace(uri, editor.selection, `<div data-mm-presentation="${no}"></div>`);
		await workspace.applyEdit(we);
		await window.showTextDocument(tpl);
		await workspace.saveAll();
	}
}
