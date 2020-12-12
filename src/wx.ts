import { TextEditor } from 'vscode';
import Base from './base';
import AddActionWeixinPage from './wxapp/addaction/page';
import AddComponentWeixin from './wxapp/addcomponent';

export default class WeiXin extends Base {
	public addwebfilter(): Promise<void> {
		return this.baseaddwebrouter('filters');
	}
	public addwebrouter(): Promise<void> {
		return this.baseaddwebrouter('routers');
	}
	public addpresentation(_editor: TextEditor): Promise<void> {
		throw new Error('Method not implemented.');
	}
	public addservice(): Promise<void> {
		return this.baseaddservice();
	}
	public addpage(): Promise<void> {
		return new AddComponentWeixin().addcomponent();
	}
	public addcomponent(_editor: TextEditor): Promise<void> {
		return this.addpage();
	}
	public addaction(editor: TextEditor): Promise<void> {
		return new AddActionWeixinPage().addaction(editor);
	}
}
