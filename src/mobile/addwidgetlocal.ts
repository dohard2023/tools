import { basename, join } from 'path';
import { window } from 'vscode';
import Actor from '../actor';
import TplMobile from './tpl';

export default class AddWidgetLocalMobile extends Actor {
	private tpl = new TplMobile();
	public async do(): Promise<void> {
		const rt = this.root();
		const prefix = 'pw';	// not wc, we wish local wigets list before remote when searching. cw means client widget
		const dir = join(rt, 'src', 'widgets');
		await this.mkdir(dir);
		const atom_dir = await this.generate(dir, prefix, '', 3);
		const no = basename(atom_dir);
		const postfix = 'tsx';
		const ts = join(atom_dir, `index.${postfix}`);
		const tscontent = this.tpl.widget(no);
		await this.writefile(ts, tscontent);
		const usecontent = this.tpl.widgetusage(no);
		await this.writefile(join(atom_dir, 'use.snippet'), usecontent);
		window.showInformationMessage('控件模板已生成');
		this.show_doc(ts);
	}
}
