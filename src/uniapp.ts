import { TextEditor } from 'vscode';
import Base from './base';

export default class UniApp extends Base {
	public addaction(editor: TextEditor): Promise<void> {
		throw new Error('Method not implemented.');
	}
}